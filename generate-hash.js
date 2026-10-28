#!/usr/bin/env node
const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
  console.log('');
  console.log('Copy this hash to use in SQL:');
  console.log(hash);
}

generateHash();
