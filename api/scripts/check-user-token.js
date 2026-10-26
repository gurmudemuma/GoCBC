// Check what's in the JWT token for bank_admin
const sqlite3 = require('better-sqlite3');
const jwt = require('jsonwebtoken');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'cecbs.db');
const db = new sqlite3(dbPath);

const JWT_SECRET = process.env.JWT_SECRET || 'cecbs-secret-key';

// Get bank_admin user
const user = db.prepare('SELECT id, username, role, organization FROM users WHERE username = ?').get('bank_admin');

console.log('\n📋 Bank Admin User from Database:');
console.log(JSON.stringify(user, null, 2));

if (user) {
  // Create a token like the login route does
  const token = jwt.sign(
    {
      sub: user.id,
      userId: user.id,
      username: user.username,
      role: user.role,
      org: user.organization,
      organization: user.organization,
      permissions: [],
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Decode it to see what's inside
  const decoded = jwt.verify(token, JWT_SECRET);
  
  console.log('\n🔑 JWT Token Payload:');
  console.log(JSON.stringify(decoded, null, 2));
  
  console.log('\n✅ Token verification successful!');
  console.log('Organization in token:', decoded.organization);
  console.log('Org in token:', decoded.org);
} else {
  console.log('❌ bank_admin user not found');
}

db.close();
