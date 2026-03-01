/**
 * Utility functions for handling and normalizing ISBN numbers.
 */

/**
 * Normalizes any valid ISBN (10 or 13) into a standard ISBN-13 format.
 * Strips hyphens and spaces. Returns null if invalid.
 */
export function normalizeIsbn(isbn: string): string | null {
  if (!isbn) return null;
  
  // Remove all non-alphanumeric characters (keep X for ISBN-10 checksum)
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, '').toUpperCase();

  if (cleanIsbn.length === 13) {
    return isValidIsbn13(cleanIsbn) ? cleanIsbn : null;
  }

  if (cleanIsbn.length === 10) {
    if (isValidIsbn10(cleanIsbn)) {
      return convertIsbn10To13(cleanIsbn);
    }
  }

  return null;
}

function isValidIsbn10(isbn: string): boolean {
  if (isbn.length !== 10) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(isbn[i]) * (10 - i);
  }
  let checksum: string | number = 11 - (sum % 11);
  if (checksum === 10) checksum = 'X';
  else if (checksum === 11) checksum = '0';
  
  return checksum.toString() === isbn[9];
}

function isValidIsbn13(isbn: string): boolean {
  if (isbn.length !== 13) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checksum = (10 - (sum % 10)) % 10;
  return checksum.toString() === isbn[12];
}

function convertIsbn10To13(isbn10: string): string {
  // Use the standard Bookland EAN prefix '978'
  const prefix = '978' + isbn10.substring(0, 9);
  
  // Calculate new ISBN-13 checksum
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(prefix[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checksum = (10 - (sum % 10)) % 10;
  
  return prefix + checksum.toString();
}
