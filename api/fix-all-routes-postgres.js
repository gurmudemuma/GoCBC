#!/usr/bin/env node
/**
 * Convert all route files from SQLite to PostgreSQL syntax
 */

const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src', 'routes');

console.log('Finding all route files...');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

console.log(`Found ${files.length} route files\n`);

let totalChanges = 0;

for (const file of files) {
  const filePath = path.join(routesDir, file);
  console.log(`Processing ${file}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let fileChanges = 0;
  
  // Replace datetime('now') with CURRENT_TIMESTAMP
  const datetimeRegex = /datetime\(['"]now['"]\)/g;
  const datetimeMatches = content.match(datetimeRegex);
  if (datetimeMatches) {
    content = content.replace(datetimeRegex, 'CURRENT_TIMESTAMP');
    fileChanges += datetimeMatches.length;
    console.log(`  - Fixed ${datetimeMatches.length} datetime('now') occurrences`);
  }
  
  // Replace datetime("now") with CURRENT_TIMESTAMP (double quotes)
  const datetimeRegex2 = /datetime\("now"\)/g;
  const datetimeMatches2 = content.match(datetimeRegex2);
  if (datetimeMatches2) {
    content = content.replace(datetimeRegex2, 'CURRENT_TIMESTAMP');
    fileChanges += datetimeMatches2.length;
    console.log(`  - Fixed ${datetimeMatches2.length} datetime("now") occurrences`);
  }
  
  if (fileChanges > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ Saved ${fileChanges} changes to ${file}`);
    totalChanges += fileChanges;
  } else {
    console.log(`  ✓ No changes needed for ${file}`);
  }
  console.log('');
}

console.log(`\n========================================`);
console.log(`Conversion complete!`);
console.log(`Total changes: ${totalChanges} across ${files.length} files`);
console.log(`========================================`);
console.log('Next step: npm run build');
