import PouchDB from 'pouchdb'
import PouchDBFind from 'pouchdb-find'

PouchDB.plugin(PouchDBFind)

// Use the admin credentials to connect directly to CouchDB to seed data
const COUCHDB_URL = process.env.COUCHDB_URL || 'http://admin:password123@127.0.0.1:5984'
const db = new PouchDB(`${COUCHDB_URL}/lms`)

const books = [
  {
    _id: 'book:9780743273565',
    type: 'book',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    isbn: '9780743273565',
    publisher: 'Scribner',
    publication_year: 1925,
    available_copies: 5,
    total_copies: 5,
    cover_image_url: 'https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg',
    ddc_call_number: '813.52 F553g'
  },
  {
    _id: 'book:9780060935467',
    type: 'book',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    isbn: '9780060935467',
    publisher: 'Harper Perennial Modern Classics',
    publication_year: 1960,
    available_copies: 2,
    total_copies: 3,
    cover_image_url: 'https://covers.openlibrary.org/b/isbn/9780060935467-L.jpg',
    ddc_call_number: '813.54 L477t'
  },
  {
    _id: 'book:9780451524935',
    type: 'book',
    title: '1984',
    author: 'George Orwell',
    isbn: '9780451524935',
    publisher: 'Signet Classic',
    publication_year: 1949,
    available_copies: 0, // checked out
    total_copies: 4,
    cover_image_url: 'https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg',
    ddc_call_number: '823.912 O79n'
  },
  {
    _id: 'book:9780316769174',
    type: 'book',
    title: 'The Catcher in the Rye',
    author: 'J.D. Salinger',
    isbn: '9780316769174',
    publisher: 'Little, Brown and Company',
    publication_year: 1951,
    available_copies: 1,
    total_copies: 2,
    cover_image_url: 'https://covers.openlibrary.org/b/isbn/9780316769174-L.jpg',
    ddc_call_number: '813.54 S165c'
  },
  {
    _id: 'book:9780140283334',
    type: 'book',
    title: 'Lord of the Flies',
    author: 'William Golding',
    isbn: '9780140283334',
    publisher: 'Penguin Books',
    publication_year: 1954,
    available_copies: 4,
    total_copies: 4,
    cover_image_url: 'https://covers.openlibrary.org/b/isbn/9780140283334-L.jpg',
    ddc_call_number: '823.914 G619L'
  }
]

async function seed() {
  console.log(`Connecting to CouchDB at ${COUCHDB_URL}/lms...`)
  
  try {
    // Check if db exists by getting info
    const info = await db.info()
    console.log('Database connected:', info.db_name)
  } catch (err: unknown) {
    const error = err as Record<string, unknown> & Error
    if (error.name === 'not_found' || error.error === 'not_found' || error.message?.includes('database does not exist')) {
      console.log('Database does not exist, PouchDB will create it.')
    } else {
      console.error('Failed to connect to CouchDB:', error.message)
      process.exit(1)
    }
  }

  console.log('Seeding books...')
  
  for (const book of books) {
    try {
      // Check if it exists
      const existing = await db.get(book._id).catch(() => null)
      if (existing) {
        console.log(`Book ${book.title} already exists. Updating...`)
        await db.put({ ...book, _rev: existing._rev })
      } else {
        console.log(`Inserting book ${book.title}...`)
        await db.put(book)
      }
    } catch (err: unknown) {
      const error = err as Error
      console.error(`Error inserting ${book.title}:`, error.message)
    }
  }

  // Create some indexes for fast querying
  console.log('Creating indexes...')
  await db.createIndex({
    index: {
      fields: ['type']
    }
  }).catch(e => console.error('Failed creating type index:', e.message))
  
  await db.createIndex({
    index: {
      fields: ['type', 'available_copies']
    }
  }).catch(e => console.error('Failed creating available_copies index:', e.message))

  console.log('Seed completed successfully!')
}

seed().catch(console.error)
