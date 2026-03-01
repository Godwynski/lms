/**
 * Pure utility functions for parsing school email addresses.
 * Can be safely imported by both client and server code.
 */

/**
 * Extracts the student number from the STI school email format.
 * Format: lastname.STUDENTID@alabang.sti.edu.ph
 * Returns null if the email doesn't match the pattern.
 *
 * Example: reyes.2024001MNL@alabang.sti.edu.ph → "2024001MNL"
 */
export function extractStudentNumberFromEmail(email: string): string | null {
  const match = email.trim().toLowerCase().match(/^[^.@]+\.([^@]+)@alabang\.sti\.edu\.ph$/)
  return match ? match[1].toUpperCase() : null
}
