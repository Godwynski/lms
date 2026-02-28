/**
 * Stub Service for fetching Title Metadata from free APIs (Open Library / Google Books)
 */

export interface ISBNMetadata {
  isbn: string;
  title: string;
  author: string;
  publisher?: string;
  publishedDate?: string;
  coverUrl?: string;
  description?: string;
}

export async function fetchMetadataByISBN(isbn: string): Promise<ISBNMetadata | null> {
  // TODO: Phase 1.2 implementation
  // 1. First attempt to hit Open Library API: https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data
  // 2. If null/missing, fallback to Google Books API: https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}
  
  console.log(`[ISBN Service] Stub called for ISBN: ${isbn}`);
  
  // Return dummy data for now
  return {
    isbn,
    title: "Placeholder Title from API",
    author: "Placeholder Author",
    coverUrl: "https://via.placeholder.com/150",
  };
}
