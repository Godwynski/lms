const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

function fixImport(file) {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;
  const originalContent = fs.readFileSync(file, 'utf8');

  let content = originalContent;
  
  if (content.includes('getAdminDb') && !content.includes('import { getAdminDb }') && !content.includes('import { getSession, getAdminDb }')) {
    if (content.includes("import { getSession } from '@/lib/auth/couchdb'")) {
      content = content.replace("import { getSession } from '@/lib/auth/couchdb'", "import { getSession, getAdminDb } from '@/lib/auth/couchdb'");
    } else {
      content = `import { getAdminDb } from '@/lib/auth/couchdb'\n` + content;
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
}

walkDir(path.join(process.cwd(), 'src', 'app', 'admin'), fixImport);
