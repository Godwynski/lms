'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { normalizeIsbn } from '@/utils/isbn'
import sharp from 'sharp'

export async function fetchBookByISBN(rawIsbn: string) {
  try {
    const isbn = normalizeIsbn(rawIsbn);
    if (!isbn) {
      return { error: 'Invalid ISBN format. Please check the number.' }
    }

    // Attempt 1: Google Books API
    let title, author, publisher, publication_year, description, cover_image_url;
    let genre, page_count, language;
    let found = false;

    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    const gbUrl = apiKey 
      ? `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`
      : `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;

    const gbResponse = await fetch(gbUrl);
    if (gbResponse.ok) {
      const gbData = await gbResponse.json();
      if (gbData.items && gbData.items.length > 0) {
        const bookInfo = gbData.items[0].volumeInfo;
        title = bookInfo.title || 'Unknown Title';
        author = bookInfo.authors && bookInfo.authors.length > 0 ? bookInfo.authors.join(', ') : 'Unknown Author';
        publisher = bookInfo.publisher || '';
        publication_year = bookInfo.publishedDate ? parseInt(bookInfo.publishedDate.substring(0, 4)) : null;
        description = bookInfo.description || '';
        cover_image_url = bookInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || null;
        genre = bookInfo.categories && bookInfo.categories.length > 0 ? bookInfo.categories.join(', ') : null;
        page_count = bookInfo.pageCount || null;
        language = bookInfo.language || null;
        found = true;
      }
    }

    // Attempt 2: Open Library API Fallback
    if (!found) {
      const olResponse = await fetch(`https://openlibrary.org/search.json?isbn=${isbn}`);
      if (!olResponse.ok) {
        return { error: 'Failed to find book data from primary and fallback sources.' };
      }
      
      const olData = await olResponse.json();
      if (!olData.docs || olData.docs.length === 0) {
        return { error: 'No book found for this ISBN.' };
      }

      const doc = olData.docs[0];
      title = doc.title || 'Unknown Title';
      author = doc.author_name ? doc.author_name.join(', ') : 'Unknown Author';
      publisher = doc.publisher ? doc.publisher[0] : '';
      publication_year = doc.first_publish_year || null;
      description = ''; // OpenLibrary search API rarely returns full description
      cover_image_url = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null;
      genre = doc.subject && doc.subject.length > 0 ? doc.subject.slice(0, 5).join(', ') : null; // Limit to 5 subjects to avoid massive strings
      page_count = doc.number_of_pages_median || null;
      language = doc.language && doc.language.length > 0 ? doc.language.join(', ').substring(0, 3).toUpperCase() : null; // e.g. "ENG"
    }

    return {
      success: true,
      book: {
        title,
        author,
        isbn,
        publisher,
        publication_year,
        description,
        cover_image_url,
        genre,
        page_count,
        language,
      }
    }

  } catch (error) {
    console.error('ISBN Fetch Error:', error)
    return { error: 'An unexpected error occurred while fetching book data.' }
  }
}

export async function addBookToCatalog(prevState: unknown, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const title = formData.get('title') as string
  const author = formData.get('author') as string
  const rawIsbn = formData.get('isbn') as string
  const publisher = formData.get('publisher') as string
  const publication_year_str = formData.get('publication_year') as string
  const description = formData.get('description') as string
  let cover_image_url = formData.get('cover_image_url') as string
  const total_copies_str = formData.get('total_copies') as string
  const ddc_call_number = formData.get('ddc_call_number') as string
  const genre = formData.get('genre') as string
  const page_count_str = formData.get('page_count') as string
  const language = formData.get('language') as string

  if (!title) {
    return { error: 'Title is required.' }
  }

  const isbn = rawIsbn ? normalizeIsbn(rawIsbn) : null
  if (rawIsbn && !isbn) {
    return { error: 'The scanned/entered ISBN is invalid.' }
  }

  const total_copies = parseInt(total_copies_str) || 1
  const publication_year = publication_year_str ? parseInt(publication_year_str) : null
  const page_count = page_count_str ? parseInt(page_count_str) : null

  // First check if the book already exists using ISBN
  if (isbn) {
    const { data: existingBook } = await supabase
      .from('books')
      .select('id, total_copies, available_copies')
      .eq('isbn', isbn)
      .single()

    if (existingBook) {
      // If it exists, update the total and available copies instead of inserting
      const newTotal = existingBook.total_copies + total_copies
      const newAvailable = existingBook.available_copies + total_copies

      const { error: updateError } = await supabase
        .from('books')
        .update({
          total_copies: newTotal,
          available_copies: newAvailable
        })
        .eq('id', existingBook.id)

      if (updateError) {
        console.error('Error updating existing book copies:', updateError)
        return { error: 'Failed to update existing book copies: ' + updateError.message }
      }

      revalidatePath('/admin/books')
      revalidatePath('/catalog')
      
      return { success: true, message: `Updated listing! Added ${total_copies} new copies (Total: ${newTotal}).` }
    }
  }

  // Handle Image Download, Compression, and Upload
  if (cover_image_url && cover_image_url.startsWith('http')) {
    try {
      // 1. Download the image
      const imageResponse = await fetch(cover_image_url);
      if (!imageResponse.ok) throw new Error('Failed to download image from source URL');
      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 2. Compress and resize using sharp
      const optimizedImageBuffer = await sharp(buffer)
        .resize({ width: 600, height: 900, fit: 'inside', withoutEnlargement: true }) // Typical book aspect ratio
        .webp({ quality: 80 }) // Convert to highly compressed webp
        .toBuffer();

      // 3. Upload to Supabase Storage
      const fileName = `cover_${isbn || Date.now()}_${Date.now()}.webp`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('book-covers')
        .upload(fileName, optimizedImageBuffer, {
          contentType: 'image/webp',
          upsert: true
        });

      if (uploadError) {
        console.error('Failed to upload image to Supabase:', uploadError);
        // We won't block the book insertion, just fall back to no image
        cover_image_url = '';
      } else {
        // 4. Get the public URL
        const { data: publicUrlData } = supabase.storage
          .from('book-covers')
          .getPublicUrl(uploadData.path);
        
        cover_image_url = publicUrlData.publicUrl;
      }
    } catch (error) {
      console.error('Error processing cover image:', error);
      cover_image_url = ''; // Fallback to no image if compression fails
    }
  }

  // If we reach here, it's a new book or it has no ISBN
  const { error } = await supabase.from('books').insert({
    title,
    author,
    isbn,
    publisher,
    publication_year,
    description,
    cover_image_url,
    total_copies,
    available_copies: total_copies,
    ddc_call_number: ddc_call_number || null,
    genre: genre || null,
    page_count: page_count,
    language: language || null
  })

  if (error) {
    console.error('Error inserting book:', error)
    return { error: 'Failed to save book to catalog. ' + error.message }
  }

  revalidatePath('/admin/books')
  revalidatePath('/catalog')
  
  return { success: true, message: 'Book successfully added to catalog!' }
}

export async function updateBook(prevState: unknown, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const id = formData.get('id') as string
  if (!id) return { error: 'Book ID is required' }

  const title = formData.get('title') as string
  const author = formData.get('author') as string
  const publisher = formData.get('publisher') as string
  const publication_year_str = formData.get('publication_year') as string
  const description = formData.get('description') as string
  const total_copies_str = formData.get('total_copies') as string
  const ddc_call_number = formData.get('ddc_call_number') as string
  const genre = formData.get('genre') as string
  const page_count_str = formData.get('page_count') as string
  const language = formData.get('language') as string

  if (!title) {
    return { error: 'Title is required.' }
  }

  const total_copies = parseInt(total_copies_str)
  const publication_year = publication_year_str ? parseInt(publication_year_str) : null
  const page_count = page_count_str ? parseInt(page_count_str) : null

  // Fetch existing book to calculate available copies delta
  const { data: existingBook } = await supabase
    .from('books')
    .select('total_copies, available_copies')
    .eq('id', id)
    .single()

  if (!existingBook) {
    return { error: 'Book not found' }
  }

  if (isNaN(total_copies) || total_copies < existingBook.total_copies - existingBook.available_copies) {
    return { error: 'Total copies cannot be less than currently checked out copies.' }
  }

  const available_copies = existingBook.available_copies + (total_copies - existingBook.total_copies)

  const { error } = await supabase
    .from('books')
    .update({
      title,
      author,
      publisher,
      publication_year,
      description,
      total_copies,
      available_copies,
      ddc_call_number: ddc_call_number || null,
      genre: genre || null,
      page_count,
      language: language || null
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating book:', error)
    return { error: 'Failed to update book. ' + error.message }
  }

  revalidatePath('/admin/books')
  revalidatePath('/catalog')
  
  return { success: true, message: 'Book updated successfully!' }
}

export async function deleteBook(id: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Check if book can be deleted
  const { data: book } = await supabase
    .from('books')
    .select('available_copies, total_copies')
    .eq('id', id)
    .single()

  if (!book) {
    return { error: 'Book not found' }
  }

  if (book.available_copies < book.total_copies) {
    return { error: 'Cannot delete book: there are copies currently checked out.' }
  }

  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: 'Failed to delete book: ' + error.message }
  }

  revalidatePath('/admin/books')
  revalidatePath('/catalog')

  return { success: true }
}
