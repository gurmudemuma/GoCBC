// Carefully convert exporters.ts to PostgreSQL
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'routes', 'exporters.ts');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Starting careful PostgreSQL conversion...\n');

let changes = 0;

// Step 1: Replace fabricService['db'] with postgresDb
console.log('Step 1: Replacing database references...');
content = content.replace(/const db = fabricService\['db'\];/g, () => {
  changes++;
  return 'const db = postgresDb;';
});
console.log(`  ✓ Changed ${changes} db references\n`);

// Step 2: Replace ? with $N in SQL queries only (not in if statements!)
// We need to be very careful here - only in SQL strings
console.log('Step 2: Converting SQL parameter placeholders...');
let sqlChanges = 0;

// Match SQL strings with quotes and ?
const sqlStringPattern = /('(?:SELECT|INSERT|UPDATE|DELETE|CREATE)[^']*')/g;
content = content.replace(sqlStringPattern, (sqlString) => {
  if (sqlString.includes('?')) {
    let paramIndex = 1;
    const converted = sqlString.replace(/\?/g, () => `$${paramIndex++}`);
    sqlChanges++;
    return converted;
  }
  return sqlString;
});
console.log(`  ✓ Converted ${sqlChanges} SQL queries\n`);
changes += sqlChanges;

// Step 3: Replace datetime('now') with CURRENT_TIMESTAMP
console.log('Step 3: Replacing datetime functions...');
const datetimeCount = (content.match(/datetime\('now'\)/g) || []).length;
content = content.replace(/datetime\('now'\)/g, 'CURRENT_TIMESTAMP');
console.log(`  ✓ Replaced ${datetimeCount} datetime() calls\n`);
changes += datetimeCount;

console.log(`✅ Total changes: ${changes}`);
console.log('📝 Writing file...');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Done! Please rebuild: npm run build');
