const fs = require('fs');
const glob = require('glob');

const files = glob.sync('c:/Systems/lms/src/app/admin/**/*.{tsx,ts}');

let updatedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Check if it imports PouchDB
  if (!content.includes("import PouchDB from 'pouchdb'")) {
    continue;
  }

  // Remove PouchDB imports and plugins
  content = content.replace(/import PouchDB from 'pouchdb'\r?\n/g, '');
  content = content.replace(/import PouchDBFind from 'pouchdb-find'\r?\n/g, '');
  content = content.replace(/PouchDB\.plugin\(PouchDBFind\)\r?\n/g, '');

  // Ensure getAdminDb is imported
  if (!content.includes('getAdminDb')) {
    // Replace `import { getSession } from '@/lib/auth/couchdb'` with `import { getSession, getAdminDb } from '@/lib/auth/couchdb'`
    if (content.includes("import { getSession } from '@/lib/auth/couchdb'")) {
      content = content.replace("import { getSession } from '@/lib/auth/couchdb'", "import { getSession, getAdminDb } from '@/lib/auth/couchdb'");
    } else {
      content = `import { getAdminDb } from '@/lib/auth/couchdb'\n` + content;
    }
  }

  // Remove `const COUCHDB_URL = ...` since getAdminDb handles it, but only if it's the specific pattern
  content = content.replace(/const COUCHDB_URL = process\.env\.NEXT_PUBLIC_COUCHDB_URL \|\| 'http:\/\/localhost:5984'\r?\n/g, '');

  // Replace getDb() declarations
  content = content.replace(/async function getDb\(\) \{\r?\n\s*return new PouchDB\(`\$\{COUCHDB_URL\}\/lms`, \{ skip_setup: true \}\)\r?\n\}\r?\n/g, '');

  // Replace direct new PouchDB instantiations in functions
  // E.g. `const db = new PouchDB(...)` -> `const db = await getAdminDb()`
  content = content.replace(/const db = new PouchDB\([^\)]+\)/g, 'const db = await getAdminDb()');

  // Replace getDb() calls
  // Wait, if we removed getDb function, the existing calls `await getDb()` will just call `await getAdminDb()`?
  // Let's replace `getDb()` with `getAdminDb()`
  content = content.replace(/getDb\(\)/g, 'getAdminDb()');

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
    updatedCount++;
  }
}

console.log(`Replaced in ${updatedCount} files.`);
