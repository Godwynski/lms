'use server'

import { getSession, getAdminDb } from '@/lib/auth/couchdb'
import { revalidatePath } from 'next/cache'
import { normalizeIsbn } from '@/utils/isbn'



const STAFF_ROLES = ['super_admin', 'librarian', 'circulation_assistant']

async function verifyStaff() {
  const session = await getSession()
  const userId = session?.userCtx?.name
  if (!userId) return { error: 'Unauthorized' }

  const db = await getAdminDb()
  const roles = session?.userCtx?.roles || []
  let hasAccess = STAFF_ROLES.some(r => roles.includes(r))

  if (!hasAccess) {
    try {
      const profileDocs = await db.find({ selector: { type: 'profile', user_id: userId } })
      const firstDoc = profileDocs.docs[0] as unknown as Record<string, unknown>
      if (profileDocs.docs.length > 0 && STAFF_ROLES.includes(String(firstDoc?.role ?? ''))) {
        hasAccess = true
      }
    } catch {
      // Non-critical: fall through
    }
  }

  if (!hasAccess) return { error: 'Unauthorized' }
  return { db }
}

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
      description = ''; 
      cover_image_url = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null;
      genre = doc.subject && doc.subject.length > 0 ? doc.subject.slice(0, 5).join(', ') : null; 
      page_count = doc.number_of_pages_median || null;
      language = doc.language && doc.language.length > 0 ? doc.language.join(', ').substring(0, 3).toUpperCase() : null; 
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
  const { error: authError, db } = await verifyStaff()
  if (authError || !db) return { error: authError }

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
    const res = await db.find({ selector: { type: 'book', isbn } })

    if (res.docs.length > 0) {
      const existingBook = res.docs[0] as unknown as Record<string, unknown> & { _id: string; _rev: string; total_copies: number; available_copies: number }
      // If it exists, update the total and available copies instead of inserting
      existingBook.total_copies += total_copies
      existingBook.available_copies += total_copies

      try {
        await db.put(existingBook)
      } catch (updateError: unknown) {
        console.error('Error updating existing book copies:', updateError)
        const msg = updateError instanceof Error ? updateError.message : String(updateError)
        return { error: 'Failed to update existing book copies: ' + msg }
      }

      revalidatePath('/admin/books')
      revalidatePath('/catalog')
      
      return { success: true, message: `Updated listing! Added ${total_copies} new copies (Total: ${existingBook.total_copies}).` }
    }
  }

  // Cover image URL logic
  if (!cover_image_url && isbn) {
    cover_image_url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
  }

  const newBook = {
    _id: `book_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: 'book',
    title,
    author,
    isbn,
    publisher,
    publication_year,
    description,
    cover_image_url,
    cover_url: cover_image_url, // fallback logic
    total_copies,
    available_copies: total_copies,
    ddc_call_number: ddc_call_number || null,
    genre: genre || null,
    page_count: page_count,
    language: language || null,
    created_at: new Date().toISOString()
  }

  try {
    await db.put(newBook)
  } catch (error: unknown) {
    console.error('Error inserting book:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return { error: 'Failed to save book to catalog. ' + msg }
  }

  revalidatePath('/admin/books')
  revalidatePath('/catalog')
  
  return { success: true, message: 'Book successfully added to catalog!' }
}

export async function updateBook(prevState: unknown, formData: FormData) {
  const { error: authError, db } = await verifyStaff()
  if (authError || !db) return { error: authError }

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

  try {
    const existingBook = await db.get(id) as unknown as Record<string, unknown> & { _id: string; _rev: string; total_copies: number; available_copies: number }

    if (isNaN(total_copies) || total_copies < existingBook.total_copies - existingBook.available_copies) {
      return { error: 'Total copies cannot be less than currently checked out copies.' }
    }
  
    const available_copies = existingBook.available_copies + (total_copies - existingBook.total_copies)
  
    existingBook.title = title
    existingBook.author = author
    existingBook.publisher = publisher
    existingBook.publication_year = publication_year
    existingBook.description = description
    existingBook.total_copies = total_copies
    existingBook.available_copies = available_copies
    if (ddc_call_number) existingBook.ddc_call_number = ddc_call_number
    if (genre) existingBook.genre = genre
    if (page_count) existingBook.page_count = page_count
    if (language) existingBook.language = language
    
    await db.put(existingBook)

  } catch (error: unknown) {
    console.error('Error updating book:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return { error: 'Failed to update book. ' + msg }
  }

  revalidatePath('/admin/books')
  revalidatePath('/catalog')
  
  return { success: true, message: 'Book updated successfully!' }
}

export async function deleteBook(id: string) {
  const { error: authError, db } = await verifyStaff()
  if (authError || !db) return { error: authError }

  try {
    // Check if book can be deleted
    const book = await db.get(id) as unknown as Record<string, unknown> & { _id: string; _rev: string; available_copies: number; total_copies: number }

    if (book.available_copies < book.total_copies) {
      return { error: 'Cannot delete book: there are copies currently checked out.' }
    }

    book._deleted = true
    await db.put(book)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return { error: 'Failed to delete book: ' + msg }
  }

  revalidatePath('/admin/books')
  revalidatePath('/catalog')

  return { success: true }
}
