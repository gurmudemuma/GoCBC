// Database Migration Runner
// Automatically runs SQL migrations on server startup

import { DatabaseService } from '../services/databaseService';
import { logger } from './logger';
import fs from 'fs';
import path from 'path';

export async function runMigrations(): Promise<void> {
  const db = DatabaseService.getInstance();
  
  try {
    logger.info('🔄 Checking for database migrations...');
    
    // Create migrations table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Get list of applied migrations
    const appliedMigrations = await db.all(
      'SELECT migration_name FROM _schema_migrations ORDER BY id'
    );
    const appliedSet = new Set(appliedMigrations.map((m: any) => m.migration_name));
    
    // Read migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      logger.info('📁 No migrations directory found, skipping migrations');
      return;
    }
    
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Ensures migrations run in order
    
    if (files.length === 0) {
      logger.info('✅ No migration files found');
      return;
    }
    
    logger.info(`📋 Found ${files.length} migration file(s)`);
    
    let appliedCount = 0;
    
    for (const file of files) {
      const migrationName = file.replace('.sql', '');
      
      if (appliedSet.has(migrationName)) {
        logger.info(`   ⏭️  Skipping already applied: ${migrationName}`);
        continue;
      }
      
      logger.info(`   ▶️  Applying migration: ${migrationName}`);
      
      // Read and execute migration file
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      
      // Execute migration in a transaction
      const client = await db.getClient();
      try {
        await client.query('BEGIN');
        
        // Execute the SQL (may contain multiple statements)
        await client.query(sql);
        
        // Record migration as applied
        await client.query(
          'INSERT INTO _schema_migrations (migration_name) VALUES ($1)',
          [migrationName]
        );
        
        await client.query('COMMIT');
        appliedCount++;
        
        logger.info(`   ✅ Applied: ${migrationName}`);
      } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`   ❌ Failed to apply ${migrationName}:`, error);
        throw error;
      } finally {
        client.release();
      }
    }
    
    if (appliedCount > 0) {
      logger.info(`✅ Successfully applied ${appliedCount} migration(s)`);
    } else {
      logger.info('✅ All migrations up to date');
    }
    
  } catch (error) {
    logger.error('❌ Migration error:', error);
    throw error;
  }
}
