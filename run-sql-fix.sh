#!/bin/bash

# Source the .env file to get DATABASE_URL
source /home/guda/GoCBC/api/.env

# Extract connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database

echo "Executing SQL fix script..."
echo "DATABASE_URL: ${DATABASE_URL:0:20}..." # Show only first 20 chars for security

# Use node to run SQL via pg module
cd /home/guda/GoCBC/api && node -e "
const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runSQL() {
  try {
    const sql = fs.readFileSync('/home/guda/GoCBC/fix-customs-tables.sql', 'utf8');
    console.log('Executing SQL script...');
    const result = await pool.query(sql);
    console.log('✅ SQL executed successfully!');
    console.log('Result:', result[result.length - 1]?.rows || 'Done');
  } catch (err) {
    console.error('❌ Error executing SQL:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSQL();
"
