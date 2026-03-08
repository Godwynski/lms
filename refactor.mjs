const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

function refactorFile(file) {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;
  const originalContent = fs.readFileSync(file, 'utf8');
  if (!originalContent.includes("import PouchDB from 'pouchdb'")) return;

  let content = originalContent;
  
  // Remove PouchDB imports and plugins
  content = content.replace(/import PouchDB from 'pouchdb'\r?\n/g, '');
  content = content.replace(/import PouchDBFind from 'pouchdb-find'\r?\n/g, '');
  content = content.replace(/PouchDB\.plugin\(PouchDBFind\)\r?\n/g, '');

  let requiresGetAdminDb = false;

  // Remove `const COUCHDB_URL = ...` 
  content = content.replace(/const COUCHDB_URL = process\.env\.NEXT_PUBLIC_COUCHDB_URL \|\| 'http:\/\/localhost:5984'\r?\n/g, '');

  if (content.includes('async function getDb() {')) {
    // Replace getDb() declarations
    content = content.replace(/async function getDb\(\) \{\r?\n\s*return new PouchDB\(`\$\{COUCHDB_URL\}\/lms`, \{ skip_setup: true \}\)\r?\n\}\r?\n/g, '');
    requiresGetAdminDb = true;
  }

  // Check new PouchDB instantiations in functions
  if (content.includes('new PouchDB')) {
    content = content.replace(/const db = new PouchDB\([^\)]+\)/g, 'const db = await getAdminDb()');
    requiresGetAdminDb = true;
  }

  // Replace getDb() calls
  if (content.includes('getDb()')) {
    content = content.replace(/getDb\(\)/g, 'getAdminDb()');
    requiresGetAdminDb = true;
  }

  // Ensure getAdminDb is imported if needed
  if (requiresGetAdminDb && !content.includes('getAdminDb')) {
    if (content.includes("import { getSession } from '@/lib/auth/couchdb'")) {
      content = content.replace("import { getSession } from '@/lib/auth/couchdb'", "import { getSession, getAdminDb } from '@/lib/auth/couchdb'");
    } else {
      content = `import { getAdminDb } from '@/lib/auth/couchdb'\n` + content;
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
}

walkDir(path.join(__dirname, 'src', 'app', 'admin'), refactorFile);
