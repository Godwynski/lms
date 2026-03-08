'use server'

import { getSession } from '@/lib/auth/couchdb'
import { revalidatePath } from 'next/cache'
import PouchDB from 'pouchdb'
import PouchDBFind from 'pouchdb-find'

PouchDB.plugin(PouchDBFind)

const COUCHDB_URL = process.env.NEXT_PUBLIC_COUCHDB_URL || 'http://localhost:5984'

async function getDb() {
  return new PouchDB(`${COUCHDB_URL}/lms`, { skip_setup: true })
}

export async function submitReview(bookId: string, rating: number, reviewText: string) {
  const session = await getSession()
  const userId = session?.userCtx?.name
  if (!userId) {
    return { success: false, error: 'You must be logged in to review.' }
  }

  try {
    const db = await getDb()

    // Check if user has already reviewed
    const existingRes = await db.find({
      selector: { type: 'book_review', user_id: userId, book_id: bookId }
    })

    if (existingRes.docs.length > 0) {
      const existing = existingRes.docs[0]
      await db.put({
        ...existing,
        rating,
        review_text: reviewText,
        updated_at: new Date().toISOString()
      })
    } else {
      await db.post({
        type: 'book_review',
        book_id: bookId,
        user_id: userId,
        rating,
        review_text: reviewText,
        created_at: new Date().toISOString()
      })
    }

    revalidatePath('/catalog')
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function getReviews(bookId: string) {
  const session = await getSession()
  const userId = session?.userCtx?.name
  
  try {
    const db = await getDb()
    
    const reviewsRes = await db.find({
      selector: { type: 'book_review', book_id: bookId }
    })

    // To mock profiles(full_name), we can either join with a users database or return the generic userId.
    // For local first PouchDB, usually profiles are duplicated into the document or fetched from another db. Let's just use the userId as full_name for now.
    const mappedReviews = reviewsRes.docs.map((d) => {
      const doc = d as unknown as Record<string, unknown> & { _id: string }
      return {
        id: doc._id,
        rating: Number(doc.rating),
        review_text: String(doc.review_text),
        created_at: String(doc.created_at),
        user_id: String(doc.user_id),
        profiles: { full_name: String(doc.user_id) } // Mock profile
      }
    })

    // Sort by created_at descending
    mappedReviews.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    let hasBorrowed = false
    if (userId) {
      const borrowedRes = await db.find({
        selector: { type: 'borrowing_record', book_id: bookId, borrower_id: userId },
        limit: 1
      })
      hasBorrowed = borrowedRes.docs.length > 0
    }

    return { success: true, reviews: mappedReviews, hasBorrowed }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
