#!/usr/bin/env node

const bcrypt = require('bcrypt');

// Test bcrypt hash verification
const password = 'admin123';
const hash = '$2b$10$yUnmkwT5oRt1MB2g3/3US.3nmlymIpNMUCIyz4uDNuQvJW2nhGpSi';

console.log('Testing bcrypt password verification...');
console.log('Password:', password);
console.log('Hash:', hash);
console.log('');

bcrypt.compare(password, hash, (err, result) => {
  if (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
  
  if (result) {
    console.log('✅ Password verification SUCCESSFUL');
    console.log('   The hash is valid and matches "admin123"');
  } else {
    console.log('❌ Password verification FAILED');
    console.log('   The hash does not match the password');
    
    // Generate a new hash
    console.log('');
    console.log('Generating new hash for "admin123"...');
    bcrypt.hash(password, 10, (err2, newHash) => {
      if (err2) {
        console.error('Error generating hash:', err2);
        process.exit(1);
      }
      console.log('New hash:', newHash);
      console.log('');
      console.log('Update SQL:');
      console.log(`UPDATE users SET password_hash = '${newHash}' WHERE username = 'admin';`);
    });
  }
});
