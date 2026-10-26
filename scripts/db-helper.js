/**
 * PostgreSQL Database Helper for Scripts
 * Provides simple async/await interface for database operations
 */

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 
  'postgresql://cecbs:cecbs123@localhost:5432/cecbs';

const pool = new Pool({ 
  connectionString,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

/**
 * Execute a query and return full result
 */
async function query(text, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

/**
 * Execute a query and return first row
 */
async function get(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

/**
 * Execute a query and return all rows
 */
async function all(text, params = []) {
  const result = await query(text, params);
  return result.rows;
}

/**
 * Execute an INSERT/UPDATE/DELETE query
 */
async function run(text, params = []) {
  return await query(text, params);
}

/**
 * Close all connections
 */
async function close() {
  await pool.end();
}

/**
 * Test connection
 */
async function testConnection() {
  try {
    const result = await query('SELECT NOW() as time, version() as version');
    return {
      success: true,
      time: result.rows[0].time,
      version: result.rows[0].version
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { 
  query, 
  get, 
  all, 
  run, 
  close, 
  pool,
  testConnection 
};
