// Script to convert exporters.ts from SQLite to PostgreSQL syntax
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'routes', 'exporters.ts');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Converting exporters.ts to PostgreSQL...');

// Track changes
let changes = 0;

// 1. Replace all fabricService['db'] with postgresDb
const dbAccessPattern = /const db = fabricService\['db'\];/g;
content = content.replace(dbAccessPattern, () => {
  changes++;
  return 'const db = postgresDb;';
});

// 2. Replace db null checks
content = content.replace(/if \(!db\) \{[\s\S]*?return;\s*\}/g, () => {
  changes++;
  return '// PostgreSQL is always available via postgresDb';
});

// 3. Replace SQLite callback-style queries with async/await PostgreSQL
// Pattern: db.all('SELECT...', [...], (err, rows) => {...})
const allPattern = /await new Promise<any\[\]>\(\(resolve, reject\) => \{\s*db\.all\('([^']+)',\s*(\[[^\]]*\]),\s*\(err: any, rows: any\[\]\) => \{\s*if \(err\) reject\(err\);\s*else resolve\(rows \|\| \[\]\);\s*\}\);\s*\}\)/g;
content = content.replace(allPattern, (match, query, params) => {
  changes++;
  // Convert ? to $1, $2, etc
  let pgQuery = query;
  let paramIndex = 1;
  pgQuery = pgQuery.replace(/\?/g, () => `$${paramIndex++}`);
  return `await db.all('${pgQuery}', ${params})`;
});

// 4. Replace db.get pattern
const getPattern = /await new Promise<any>\(\(resolve, reject\) => \{\s*db\.get\('([^']+)',\s*(\[[^\]]*\]),\s*\(err: any, row: any\) => \{\s*if \(err\) reject\(err\);\s*else resolve\(row\);\s*\}\);\s*\}\)/g;
content = content.replace(getPattern, (match, query, params) => {
  changes++;
  let pgQuery = query;
  let paramIndex = 1;
  pgQuery = pgQuery.replace(/\?/g, () => `$${paramIndex++}`);
  return `await db.get('${pgQuery}', ${params})`;
});

// 5. Replace db.run pattern
const runPattern = /await new Promise\(\(resolve, reject\) => \{\s*db\.run\('([^']+)',\s*(\[[^\]]*\]),\s*\(err: any\) => \{\s*if \(err\) reject\(err\);\s*else resolve\(true\);\s*\}\);\s*\}\)/g;
content = content.replace(runPattern, (match, query, params) => {
  changes++;
  let pgQuery = query;
  let paramIndex = 1;
  pgQuery = pgQuery.replace(/\?/g, () => `$${paramIndex++}`);
  // Replace datetime('now') with CURRENT_TIMESTAMP
  pgQuery = pgQuery.replace(/datetime\('now'\)/g, 'CURRENT_TIMESTAMP');
  return `await db.run('${pgQuery}', ${params})`;
});

console.log(`✅ Made ${changes} changes`);
console.log('⚠️  Manual review required for complex patterns');

// Write back
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ File updated');
