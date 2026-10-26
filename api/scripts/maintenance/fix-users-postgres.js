#!/usr/bin/env node
/**
 * Convert users.ts from SQLite to PostgreSQL syntax
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'routes', 'users.ts');

console.log('Reading users.ts...');
let content = fs.readFileSync(filePath, 'utf8');

// Track changes
let changeCount = 0;

// Helper function to convert ? placeholders to $1, $2, etc.
function convertPlaceholders(line) {
  let index = 1;
  return line.replace(/\?/g, () => `$${index++}`);
}

// Replace datetime('now') with CURRENT_TIMESTAMP or NOW()
const datetimeRegex = /datetime\(['"]now['"]\)/g;
const matches = content.match(datetimeRegex);
if (matches) {
  console.log(`Found ${matches.length} datetime('now') occurrences`);
  content = content.replace(datetimeRegex, 'CURRENT_TIMESTAMP');
  changeCount += matches.length;
}

// Split into lines for complex replacements
const lines = content.split('\n');
const newLines = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // Check if this line contains SQL with ? placeholders
  // Only convert if it's in a SQL query string (contains FROM, WHERE, UPDATE, INSERT, etc.)
  if ((line.includes('WHERE') || line.includes('UPDATE') || line.includes('INSERT') || line.includes('VALUES')) 
      && line.includes('?') 
      && (line.includes("'") || line.includes('`'))) {
    
    const originalLine = line;
    
    // Extract the SQL query part
    const sqlMatch = line.match(/(['`])(.*?)\1/);
    if (sqlMatch) {
      const fullMatch = sqlMatch[0];
      const quote = sqlMatch[1];
      const sqlContent = sqlMatch[2];
      
      // Convert ? to $1, $2, etc.
      const converted = convertPlaceholders(sqlContent);
      const newFullMatch = quote + converted + quote;
      
      line = line.replace(fullMatch, newFullMatch);
      
      if (line !== originalLine) {
        changeCount++;
        console.log(`Line ${i + 1}: Converted placeholders`);
      }
    }
  }
  
  newLines.push(line);
}

content = newLines.join('\n');

// Write back
console.log(`\nWriting changes back to file...`);
fs.writeFileSync(filePath, content, 'utf8');

console.log(`✅ Conversion complete! Made ${changeCount} changes.`);
console.log('Please rebuild TypeScript: npm run build');
