// Remove SQLite callback patterns and convert to async/await PostgreSQL
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'routes', 'exporters.ts');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Removing SQLite callback patterns...\n');

let changes = 0;

// Pattern 1: db.all with Promise wrapper
// await new Promise<any[]>((resolve, reject) => {
//   db.all(query, params, (err: any, rows: any[]) => {
//     if (err) reject(err);
//     else resolve(rows || []);
//   });
// });
const allPattern = /await new Promise<any\[\]>\(\(resolve, reject\) => \{\s*db\.all\(([^,]+),\s*([^,]+),\s*\(err: any, rows: any\[\]\) => \{\s*if \(err\) reject\(err\);\s*else resolve\(rows \|\| \[\]\);\s*\}\);\s*\}\)/g;
let matches = content.match(allPattern)?.length || 0;
content = content.replace(allPattern, 'await db.all($1, $2)');
changes += matches;
console.log(`✓ Converted ${matches} db.all() patterns`);

// Pattern 2: db.get with Promise wrapper (single line)
const getPattern1 = /await new Promise<any>\(\(resolve, reject\) => \{\s*db\.get\(([^,]+),\s*([^,]+),\s*\(err: any, row: any\) => \{\s*if \(err\) reject\(err\);\s*else resolve\(row\);\s*\}\);\s*\}\)/g;
matches = content.match(getPattern1)?.length || 0;
content = content.replace(getPattern1, 'await db.get($1, $2)');
changes += matches;
console.log(`✓ Converted ${matches} db.get() single-line patterns`);

// Pattern 3: db.get with Promise wrapper (multi-line in Promise.resolve)
const getPattern2 = /await new Promise<any>\(\(resolve, reject\) => \{\s*db\.get\(\s*([^,]+),\s*(\[[^\]]*\]),\s*\(err: any, row: any\) => \{\s*if \(err\) reject\(err\);\s*else resolve\(row\);\s*\}\s*\);\s*\}\)/gs;
matches = content.match(getPattern2)?.length || 0;
content = content.replace(getPattern2, 'await db.get($1, $2)');
changes += matches;
console.log(`✓ Converted ${matches} db.get() multi-line patterns`);

// Pattern 4: db.run with Promise wrapper (single line)
const runPattern1 = /await new Promise\(\(resolve, reject\) => \{\s*db\.run\(([^,]+),\s*([^,]+),\s*\(err: any\) => \{\s*if \(err\) reject\(err\);\s*else resolve\(true\);\s*\}\);\s*\}\)/g;
matches = content.match(runPattern1)?.length || 0;
content = content.replace(runPattern1, 'await db.run($1, $2)');
changes += matches;
console.log(`✓ Converted ${matches} db.run() single-line patterns`);

// Pattern 5: db.run with Promise wrapper (multi-line with error logging)
const runPattern2 = /await new Promise\(\(resolve, reject\) => \{\s*db\.run\(\s*([^,]+),\s*(\[[^\]]*\]),\s*\(err: any\) => \{\s*if \(err\) \{\s*logger\.error\([^)]+\);\s*reject\(err\);\s*\} else \{\s*(?:logger\.info\([^)]+\);\s*)?resolve\(true\);\s*\}\s*\}\s*\);\s*\}\)/gs;
matches = content.match(runPattern2)?.length || 0;
content = content.replace(runPattern2, 'await db.run($1, $2)');
changes += matches;
console.log(`✓ Converted ${matches} db.run() multi-line patterns with logging`);

// Pattern 6: db.run with Promise wrapper (inline one-liner)
const runPattern3 = /await new Promise\(\(resolve, reject\) => \{\s*db\.run\(([^,]+),\s*([^,]+),\s*\(err: any\) => \{ if \(err\) reject\(err\); else resolve\(true\); \}\);\s*\}\)/g;
matches = content.match(runPattern3)?.length || 0;
content = content.replace(runPattern3, 'await db.run($1, $2)');
changes += matches;
console.log(`✓ Converted ${matches} db.run() inline patterns`);

console.log(`\n✅ Total conversions: ${changes}`);
console.log('📝 Writing file...');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Done!');
