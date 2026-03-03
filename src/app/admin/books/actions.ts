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
        genre = bookInfo.categories && bookInfo.categories.length > 0 ? bookInfo.categories.join(', ') : null;
        page_count = bookInfo.pageCount || null;
        language = bookInfo.language || null;

        // Use the best available preview URL — the browser can load these directly.
        // Storage upload (addBookToCatalog) uses Open Library by ISBN for high-res.
        const imageLinks = bookInfo.imageLinks;
        cover_image_url =
          imageLinks?.extraLarge?.replace('http:', 'https:') ||
          imageLinks?.large?.replace('http:', 'https:') ||
          imageLinks?.medium?.replace('http:', 'https:') ||
          imageLinks?.thumbnail?.replace('http:', 'https:').replace('zoom=1', 'zoom=5') ||
          null;

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
      // Open Library: use -L.jpg (largest consistently available size)
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

export async function searchBookFallback(title: string, author?: string) {
  try {
    let query = `intitle:${encodeURIComponent(title)}`
    if (author) {
      query += `+inauthor:${encodeURIComponent(author)}`
    }
    
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    const gbUrl = apiKey 
      ? `https://www.googleapis.com/books/v1/volumes?q=${query}&key=${apiKey}&maxResults=1`
      : `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;

    const gbResponse = await fetch(gbUrl);
    if (!gbResponse.ok) return { error: 'Failed to search Google Books.' }
    
    const gbData = await gbResponse.json();
    if (!gbData.items || gbData.items.length === 0) {
      return { error: 'No books found matching this title and author.' }
    }

    const doc = gbData.items[0]
    const bookInfo = doc.volumeInfo;
    
    const imageLinks = bookInfo.imageLinks;
    const cover_image_url =
      imageLinks?.extraLarge?.replace('http:', 'https:') ||
      imageLinks?.large?.replace('http:', 'https:') ||
      imageLinks?.medium?.replace('http:', 'https:') ||
      imageLinks?.thumbnail?.replace('http:', 'https:').replace('zoom=1', 'zoom=5') ||
      null;

    return {
      success: true,
      book: {
        title: bookInfo.title || title,
        author: bookInfo.authors && bookInfo.authors.length > 0 ? bookInfo.authors.join(', ') : author || '',
        isbn: bookInfo.industryIdentifiers?.find((i: { type: string; identifier: string }) => i.type === 'ISBN_13')?.identifier || bookInfo.industryIdentifiers?.find((i: { type: string; identifier: string }) => i.type === 'ISBN_10')?.identifier || '',
        publisher: bookInfo.publisher || '',
        publication_year: bookInfo.publishedDate ? parseInt(bookInfo.publishedDate.substring(0, 4)) : null,
        description: bookInfo.description || '',
        cover_image_url,
        genre: bookInfo.categories && bookInfo.categories.length > 0 ? bookInfo.categories.join(', ') : null,
        page_count: bookInfo.pageCount || null,
        language: bookInfo.language || null,
      }
    }
  } catch (error) {
    console.error('Title Search Error:', error)
    return { error: 'An unexpected error occurred while searching.' }
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

  const isbn = rawIsbn ? (normalizeIsbn(rawIsbn) || rawIsbn.trim()) : null

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

  // ── Cover Image: Download, Compress, Upload ──────────────────────────────
  // Google Books image URLs block server-side fetching and return a tiny placeholder.
  // Strategy: try Open Library by ISBN first (reliable), then fall back to the
  // provided cover_image_url, then give up gracefully.
  if (cover_image_url || isbn) {
    try {
      let imageBuffer: Buffer | null = null

      // Helper: download and check the image isn't a placeholder (< 8 KB)
      const tryDownload = async (url: string): Promise<Buffer | null> => {
        try {
          const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LMS/1.0)' }
          })
          if (!res.ok) return null
          const ab = await res.arrayBuffer()
          const buf = Buffer.from(ab)
          // Anything < 8 KB is almost certainly a "no image" placeholder
          if (buf.length < 8192) return null
          return buf
        } catch {
          return null
        }
      }

      // 1st choice: Open Library cover by ISBN (no auth, server-side friendly)
      if (isbn) {
        imageBuffer = await tryDownload(
          `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
        )
      }

      // 2nd choice: the preview URL the form sent (works for some sources)
      if (!imageBuffer && cover_image_url?.startsWith('http')) {
        imageBuffer = await tryDownload(cover_image_url)
      }

      // 3rd choice: Open Library medium size (sometimes -L isn't indexed yet)
      if (!imageBuffer && isbn) {
        imageBuffer = await tryDownload(
          `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`
        )
      }

      if (imageBuffer) {
        // Compress and resize — 800×1200 preserves readability while keeping files small
        const optimizedImageBuffer = await sharp(imageBuffer)
          .resize({ width: 800, height: 1200, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 88 })
          .toBuffer()

        const fileName = `cover_${isbn || Date.now()}_${Date.now()}.webp`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('book-covers')
          .upload(fileName, optimizedImageBuffer, {
            contentType: 'image/webp',
            upsert: true
          })

        if (uploadError) {
          console.error('Failed to upload image to Supabase:', uploadError)
          cover_image_url = ''
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('book-covers')
            .getPublicUrl(uploadData.path)
          cover_image_url = publicUrlData.publicUrl
        }
      } else {
        // No usable image found from any source — save without a cover
        console.warn('No valid cover image found for ISBN:', isbn)
        cover_image_url = ''
      }
    } catch (error) {
      console.error('Error processing cover image:', error)
      cover_image_url = ''
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
