// Update exporters.ts to use PostgreSQL instead of SQLite
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'routes', 'exporters.ts');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Converting exporters.ts from SQLite to PostgreSQL...\n');

let changes = 0;

// 1. Replace fabricService['db'] with postgresDb
const beforeDb = content.match(/fabricService\['db'\]/g)?.length || 0;
content = content.replace(/const db = fabricService\['db'\];/g, 'const db = postgresDb;');
changes += beforeDb;
console.log(`✓ Replaced ${beforeDb} fabricService['db'] references`);

// 2. Remove db null checks (PostgreSQL is always available)
const nullCheckPattern = /if \(!db\) \{\s*(?:res\.status\(\d+\)\.json|res\.json|logger\.warn|return)\([^)]*\)[^}]*\s*(?:return;)?\s*\}/g;
const beforeNullChecks = content.match(nullCheckPattern)?.length || 0;
content = content.replace(nullCheckPattern, '// PostgreSQL always available');
changes += beforeNullChecks;
console.log(`✓ Removed ${beforeNullChecks} null check blocks`);

// 3. Convert SQLite ? to PostgreSQL $1, $2, etc in queries
// This is complex, so we'll handle common patterns

// Pattern: db.all with Promise wrapper
let pattern = /await new Promise<any\[\]>\(\(resolve, reject\) => \{\s*db\.all\(([^,]+),\s*(\[[^\]]*\]),\s*\(err: any, rows: any\[\]\) => \{\s*if \(err\) reject\(err\);\s*else resolve\(rows \|\| \[\]\);\s*\}\);\s*\}\)/g;
let matches = content.match(pattern)?.length || 0;
content = content.replace(pattern, 'await db.all($1, $2)');
changes += matches;
console.log(`✓ Simplified ${matches} db.all() calls`);

// Pattern: db.get with Promise wrapper
pattern = /await new Promise<any>\(\(resolve, reject\) => \{\s*db\.get\(([^,]+),\s*(\[[^\]]*\]),\s*\(err: any, row: any\) => \{\s*if \(err\) reject\(err\);\s*else resolve\(row\);\s*\}\);\s*\}\)/g;
matches = content.match(pattern)?.length || 0;
content = content.replace(pattern, 'await db.get($1, $2)');
changes += matches;
console.log(`✓ Simplified ${matches} db.get() calls`);

// Pattern: db.run with Promise wrapper
pattern = /await new Promise\(\(resolve, reject\) => \{\s*db\.run\(([^,]+),\s*(\[[^\]]*\]),\s*\(err: any\) => \{\s*if \(err\) (?:reject\(err\)|.*?\n.*?reject\(err\));\s*else resolve\(true\);\s*\}\);\s*\}\)/g;
matches = content.match(pattern)?.length || 0;
content = content.replace(pattern, 'await db.run($1, $2)');
changes += matches;
console.log(`✓ Simplified ${matches} db.run() calls`);

// 4. Replace datetime('now') with CURRENT_TIMESTAMP
const beforeDatetime = content.match(/datetime\('now'\)/g)?.length || 0;
content = content.replace(/datetime\('now'\)/g, 'CURRENT_TIMESTAMP');
changes += beforeDatetime;
console.log(`✓ Replaced ${beforeDatetime} datetime('now') calls`);

// 5. Convert ? placeholders to $1, $2, etc in SQL strings
// This requires more careful parsing - we'll handle it in specific query strings
const queries = content.match(/'(?:SELECT|INSERT|UPDATE|DELETE)[^']*\?[^']*'/g) || [];
let paramCount = 0;
queries.forEach(query => {
  const questionMarks = (query.match(/\?/g) || []).length;
  if (questionMarks > 0) {
    let newQuery = query;
    let idx = 1;
    newQuery = newQuery.replace(/\?/g, () => `$${idx++}`);
    content = content.replace(query, newQuery);
    paramCount += questionMarks;
  }
});
console.log(`✓ Converted ${paramCount} ? placeholders to $N format`);
changes += paramCount;

console.log(`\n✅ Total changes: ${changes}`);
console.log('📝 Writing updated file...');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ File updated successfully!\n');
console.log('⚠️  Please rebuild and test: npm run build');
