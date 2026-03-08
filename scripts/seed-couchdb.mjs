import fs from 'fs';

const COUCHDB_URL = 'http://localhost:5984';
const DB_NAME = 'lms';
const AUTH_HEADER = 'Basic ' + Buffer.from('admin:password123').toString('base64');

const books = [
  {
    _id: "book_1",
    type: "book",
    id: "book_1",
    title: "Clean Code",
    author: "Robert C. Martin",
    isbn: "9780132350884",
    description: "A Handbook of Agile Software Craftsmanship",
    total_copies: 5,
    available_copies: 5,
    cover_image_url: "https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg",
    created_at: new Date().toISOString()
  },
  {
    _id: "book_2",
    type: "book",
    id: "book_2",
    title: "The Pragmatic Programmer",
    author: "Andrew Hunt",
    isbn: "9780135957059",
    description: "Your journey to mastery",
    total_copies: 3,
    available_copies: 3,
    cover_image_url: "https://covers.openlibrary.org/b/isbn/9780135957059-L.jpg",
    created_at: new Date().toISOString()
  },
  {
    _id: "book_3",
    type: "book",
    id: "book_3",
    title: "Design Patterns",
    author: "Erich Gamma",
    isbn: "9780201633610",
    description: "Elements of Reusable Object-Oriented Software",
    total_copies: 2,
    available_copies: 2,
    cover_image_url: "https://images-na.ssl-images-amazon.com/images/I/81gtKoapHFL.jpg",
    created_at: new Date().toISOString()
  }
];

const adminUser = {
  _id: "org.couchdb.user:admin@example.com",
  name: "admin@example.com",
  password: "password123",
  roles: ["admin", "staff"],
  type: "user"
};

const adminProfile = {
  _id: "profile_admin@example.com",
  type: "profile",
  id: "admin@example.com",
  email: "admin@example.com",
  full_name: "System Admin",
  role: "admin",
  created_at: new Date().toISOString()
};

async function fetchCouch(path, options = {}) {
  const url = `${COUCHDB_URL}${path}`;
  const hdrs = {
    ...options.headers,
    'Authorization': AUTH_HEADER
  };
  return fetch(url, { ...options, headers: hdrs });
}

async function seed() {
  console.log("Creating database:", DB_NAME);
  await fetchCouch(`/${DB_NAME}`, { method: 'PUT' });

  // Create Users DB if it doesn't exist
  await fetchCouch(`/_users`, { method: 'PUT' });

  console.log("Creating admin user account...");
  const adminIdEncoded = encodeURIComponent(adminUser._id);
  const userRes = await fetchCouch(`/_users/${adminIdEncoded}`);
  if (userRes.status === 404) {
    const res = await fetchCouch(`/_users/${adminIdEncoded}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminUser)
    });
    console.log("Admin user created:", res.ok);
  } else {
    console.log("Admin user already exists");
  }

  console.log("Creating admin profile...");
  const pRes = await fetchCouch(`/${DB_NAME}/${encodeURIComponent(adminProfile._id)}`);
  if (pRes.status === 404) {
    await fetchCouch(`/${DB_NAME}/${encodeURIComponent(adminProfile._id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminProfile)
    });
  }

  console.log("Seeding books...");
  for (const book of books) {
    const bRes = await fetchCouch(`/${DB_NAME}/${encodeURIComponent(book._id)}`);
    if (bRes.status === 404) {
      await fetchCouch(`/${DB_NAME}/${encodeURIComponent(book._id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(book)
      });
      console.log(`Seeded: ${book.title}`);
    } else {
      console.log(`Already exists: ${book.title}`);
    }
  }

  console.log("Seeding complete!");
}

seed().catch(console.error);
