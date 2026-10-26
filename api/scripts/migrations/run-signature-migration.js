#!/usr/bin/env node

/**
 * Document Signature Migration Runner
 * Executes the document signature tracking migration SQL script
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const logger = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  warn: (msg) => console.warn(`⚠️  ${msg}`)
};

async function runMigration() {
  // Parse DATABASE_URL if available
  let poolConfig;
  if (process.env.DATABASE_URL) {
    // Parse postgresql://user:password@host:port/database
    const dbUrl = new URL(process.env.DATABASE_URL);
    poolConfig = {
      host: dbUrl.hostname,
      port: parseInt(dbUrl.port || '5432'),
      database: dbUrl.pathname.slice(1), // Remove leading slash
      user: dbUrl.username,
      password: dbUrl.password,
    };
  } else {
    poolConfig = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'cecbs',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
    };
  }

  const pool = new Pool(poolConfig);

  try {
    logger.info('Starting document signature migration...');
    logger.info(`Database: ${poolConfig.database} @ ${poolConfig.host}:${poolConfig.port}`);
    logger.info(`User: ${poolConfig.user}`);

    // Read migration SQL file
    const sqlPath = path.join(__dirname, 'migrate-document-signatures.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Migration file not found: ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    logger.info('Migration SQL file loaded successfully');

    // Connect to database
    const client = await pool.connect();
    logger.success('Connected to PostgreSQL database');

    try {
      // Begin transaction
      await client.query('BEGIN');
      logger.info('Transaction started');

      // Execute migration
      await client.query(sql);
      logger.success('Migration SQL executed successfully');

      // Commit transaction
      await client.query('COMMIT');
      logger.success('Transaction committed');

      // Verify migration
      const tableCheck = await client.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname='public' 
        AND tablename='document_signatures'
      `);

      if (tableCheck.rows.length > 0) {
        logger.success('✅ Table document_signatures verified');
      } else {
        throw new Error('Migration completed but table not found!');
      }

      // Count columns
      const columnCheck = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_name = 'document_signatures'
      `);
      logger.success(`✅ Document_signatures table has ${columnCheck.rows[0].count} columns`);

      // Check indexes
      const indexCheck = await client.query(`
        SELECT COUNT(*) as count
        FROM pg_indexes 
        WHERE tablename = 'document_signatures'
      `);
      logger.success(`✅ ${indexCheck.rows[0].count} indexes created`);

      // Check triggers
      const triggerCheck = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.triggers
        WHERE event_object_table IN ('document_signatures', 'documents')
        AND trigger_name LIKE '%sig%'
      `);
      logger.success(`✅ ${triggerCheck.rows[0].count} triggers configured`);

      // Check views
      const viewCheck = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.views
        WHERE table_name IN ('v_documents_with_signatures', 'v_signature_timeline')
      `);
      logger.success(`✅ ${viewCheck.rows[0].count} views created`);

      // Check documents table columns
      const docsColCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns
        WHERE table_name = 'documents' 
        AND column_name IN ('signature_count', 'last_signed_at', 'last_signed_by', 'is_signed', 'blockchain_synced', 'blockchain_tx_id')
        ORDER BY column_name
      `);
      logger.success(`✅ Documents table extended with ${docsColCheck.rows.length} signature tracking columns`);
      docsColCheck.rows.forEach(row => {
        logger.info(`   - ${row.column_name}`);
      });

      logger.success('\n🎉 Document signature migration completed successfully!');
      logger.info('\nNext steps:');
      logger.info('1. Run: cd api && npm install (to install pdf-lib dependency)');
      logger.info('2. Restart API server to load new routes');
      logger.info('3. Test signature endpoints: POST /api/documents/:documentId/sign');
      logger.info('4. View signatures: GET /api/documents/:documentId/signatures');
      logger.info('5. Check audit trail for signature events');

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction rolled back due to error');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error(`Migration failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration();
