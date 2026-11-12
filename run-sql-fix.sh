#!/bin/bash
#
# Run a SQL fix script against the CECBS database via the API's pg module.
#
# Usage: ./run-sql-fix.sh [path-to-sql-file]
#   Defaults to fix-customs-tables.sql in the repo root.
#
# The repo root is derived from this script's own location (same pattern as
# deploy-chaincode.sh), so it works from any working directory and on any
# checkout path — no hardcoded /home/guda.
#
# Credential hygiene: DATABASE_URL is never echoed, not even a prefix (the
# first 20 chars leak the scheme, username and the start of the password).
# The only diagnostic printed is the database NAME.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$REPO_ROOT/api"
SQL_FILE="${1:-$REPO_ROOT/fix-customs-tables.sql}"

if [ ! -f "$API_DIR/.env" ]; then
    echo "✗ No .env file found at $API_DIR/.env" >&2
    exit 1
fi

# Load DATABASE_URL (and friends) from api/.env and export them so the node
# child process can see them. Plain `source` alone leaves them as unexported
# shell variables, invisible to node.
set -a
# shellcheck source=/dev/null
source "$API_DIR/.env"
set +a

if [ -z "${DATABASE_URL:-}" ]; then
    echo "✗ DATABASE_URL is not set in $API_DIR/.env" >&2
    exit 1
fi

if [ ! -f "$SQL_FILE" ]; then
    echo "✗ SQL file not found: $SQL_FILE" >&2
    exit 1
fi

# Diagnostic only: print the database NAME, never any credential material.
DB_NAME="${DATABASE_URL##*/}"
DB_NAME="${DB_NAME%%\?*}"
echo "Executing SQL fix script..."
echo "Database: $DB_NAME"
echo "SQL file: $SQL_FILE"

# Use node to run SQL via pg module
cd "$API_DIR" && SQL_FILE="$SQL_FILE" node -e "
const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runSQL() {
  try {
    const sql = fs.readFileSync(process.env.SQL_FILE, 'utf8');
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
