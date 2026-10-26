// Final fix for all remaining SQLite callbacks
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'routes', 'exporters.ts');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Final callback pattern cleanup...\n');

// Remove ALL remaining callback patterns regardless of formatting
// Match: ], (err: any) => { ... })
// and replace entire Promise wrapper

let changes = 0;

// Pattern: Match entire "await new Promise" blocks that contain db.run/get/all
const lines = content.split('\n');
const newLines = [];
let i = 0;

while (i < lines.length) {
  const line = lines[i];
  
  // Check if this line starts a Promise wrapper for db operations
  if (line.trim().match(/^await new Promise\(\(resolve, reject\) => \{$/)) {
    // Find the matching closing });
    let depth = 1;
    let block = [line];
    i++;
    
    while (i < lines.length && depth > 0) {
      block.push(lines[i]);
      const l = lines[i].trim();
      if (l.includes('(') && !l.includes('//')) depth += (l.match(/\(/g) || []).length;
      if (l.includes(')') && !l.includes('//')) depth -= (l.match(/\)/g) || []).length;
      i++;
    }
    
    const blockText = block.join('\n');
    
    // Check if this block contains db.run, db.get, or db.all with a callback
    if (blockText.includes('db.run(') || blockText.includes('db.get(') || blockText.includes('db.all(')) {
      if (blockText.includes('(err: any')) {
        // Extract the method, query, and params
        const methodMatch = blockText.match(/db\.(run|get|all)\(/);
        if (methodMatch) {
          const method = methodMatch[1];
          
          // Find where the callback starts
          const callbackStart = blockText.indexOf('], (err: any)');
          if (callbackStart > -1) {
            // Extract everything before the callback
            const beforeCallback = blockText.substring(0, callbackStart + 1); // Include the ]
            
            // Extract the db.method call
            const dbCallStart = beforeCallback.indexOf(`db.${method}(`);
            const argsText = beforeCallback.substring(dbCallStart + `db.${method}(`.length);
            
            // Create the new async/await version
            const newLine = `      await db.${method}(${argsText});`;
            newLines.push(newLine);
            changes++;
            continue;
          }
        }
      }
    }
    
    // If we didn't convert it, keep the original block
    newLines.push(...block);
  } else {
    newLines.push(line);
    i++;
  }
}

console.log(`✓ Converted ${changes} remaining Promise wrapper patterns`);

content = newLines.join('\n');

console.log('📝 Writing file...');
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Complete!');
