// Fix remaining SQLite callback patterns with multi-line arrays
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'routes', 'exporters.ts');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Fixing remaining callback patterns...\n');

// Match: await new Promise((resolve, reject) => {
//          db.run(query, [
//            ... multi-line array ...
//          ], (err: any) => {
//            if (err) reject(err);
//            else resolve(true);
//          });
//        });

// Strategy: Find all "await new Promise" blocks and replace them

const pattern = /await new Promise\(\(resolve, reject\) => \{\s*db\.(run|get|all)\(([^)]+\[[^\]]*\][^)]*),\s*\(err: any[^)]*\) => \{[^}]*if \(err\) reject\(err\);[^}]*resolve\([^)]*\);[^}]*\}\);\s*\}\)/gs;

let matches = 0;
content = content.replace(pattern, (match, method, args) => {
  matches++;
  // Extract query and params from args
  // args looks like: "query, [param1, param2, ...]"
  return `await db.${method}(${args})`;
});

console.log(`✓ Converted ${matches} multi-line callback patterns`);

// Also handle cases where the array is on multiple lines but callback is inline
const pattern2 = /await new Promise\(\(resolve, reject\) => \{\s*db\.(run|get)\(([^,]+),\s*(\[[^\]]*\]),\s*\(err: any\) => \{[^}]+\}\);\s*\}\)/gs;
matches = 0;
content = content.replace(pattern2, (match, method, query, params) => {
  matches++;
  return `await db.${method}(${query}, ${params})`;
});

console.log(`✓ Converted ${matches} additional patterns`);

console.log('\n📝 Writing file...');
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Done!');
