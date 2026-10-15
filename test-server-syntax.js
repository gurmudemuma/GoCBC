#!/usr/bin/env node

console.log('Testing server.js for syntax errors...\n');

try {
  // Try to require the server file
  const serverPath = '/home/guda/GoCBC/api/dist/server.js';
  
  console.log(`Loading: ${serverPath}`);
  
  // This will crash if there are syntax errors or missing dependencies
  require(serverPath);
  
  console.log('\n✓ Server loaded successfully (no syntax errors)');
  
} catch (error) {
  console.log('\n✗ Server failed to load:');
  console.log('Error:', error.message);
  console.log('\nStack trace:');
  console.log(error.stack);
  
  // Check for common issues
  if (error.message.includes('Cannot find module')) {
    console.log('\n→ Missing dependency issue');
    console.log('Run: cd /home/guda/GoCBC/api && npm install');
  } else if (error.message.includes('Unexpected token')) {
    console.log('\n→ Syntax error in compiled code');
    console.log('Run: cd /home/guda/GoCBC/api && npm run build');
  }
  
  process.exit(1);
}

console.log('\nIf you see this, the server file is valid but may have runtime issues.');
console.log('Check environment variables and database connections.');

// Don't actually start the server, just exit
setTimeout(() => {
  console.log('\nTest complete.');
  process.exit(0);
}, 1000);
