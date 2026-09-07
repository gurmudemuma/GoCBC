#!/usr/bin/env node
/**
 * Database Migration Runner - PostgreSQL Version
 * Run: node scripts/migrate-db-pg.js
 */

const fs = require('fs');
const path = require('path');
const db = require('./db-helper');

/**
 * Smart SQL splitter that handles PL/pgSQL functions, triggers, and procedures
 * Respects $$ delimiters and doesn't split on semicolons inside function bodies
 */
function smartSplitSQL(sql) {
  const statements = [];
  let current = '';
  let inFunction = false;
  let inDollarQuote = false;
  let dollarTag = '';
  let i = 0;

  while (i < sql.length) {
    const char = sql[i];
    const next = sql[i + 1];
    const remaining = sql.substring(i);

    // Check for $$ or $tag$ delimiters
    if (char === '$') {
      const dollarMatch = remaining.match(/^(\$[a-zA-Z0-9_]*\$)/);
      if (dollarMatch) {
        const tag = dollarMatch[1];
        
        if (!inDollarQuote) {
          // Starting a dollar-quoted string
          inDollarQuote = true;
          dollarTag = tag;
          current += tag;
          i += tag.length;
          continue;
        } else if (tag === dollarTag) {
          // Ending the dollar-quoted string
          inDollarQuote = false;
          dollarTag = '';
          current += tag;
          i += tag.length;
          continue;
        }
      }
    }

    // Check for function/procedure keywords
    if (!inDollarQuote && !inFunction) {
      const upperRemaining = remaining.toUpperCase();
      if (upperRemaining.match(/^(CREATE\s+(OR\s+REPLACE\s+)?FUNCTION|CREATE\s+(OR\s+REPLACE\s+)?PROCEDURE)/i)) {
        inFunction = true;
      }
    }

    // Add character to current statement
    current += char;

    // Check for statement terminator (semicolon outside of function/dollar-quote)
    if (char === ';' && !inDollarQuote) {
      // If we were in a function, check if we're ending it
      if (inFunction) {
        // Check if this semicolon ends the function
        const trimmed = current.trim().toUpperCase();
        if (trimmed.match(/LANGUAGE\s+PLPGSQL\s*;$/i) || 
            trimmed.match(/END\s*;$/i)) {
          inFunction = false;
        }
      }

      // If not in function anymore, this is a statement boundary
      if (!inFunction) {
        const stmt = current.trim();
        if (stmt && !stmt.match(/^--/) && !stmt.match(/^\/\*/)) {
          statements.push(stmt);
        }
        current = '';
      }
    }

    i++;
  }

  // Add any remaining content
  if (current.trim()) {
    const stmt = current.trim();
    if (stmt && !stmt.match(/^--/) && !stmt.match(/^\/\*/)) {
      statements.push(stmt);
    }
  }

  return statements;
}

async function runMigrations() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   CECBS Database Migration Runner (PostgreSQL)');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    const connTest = await db.testConnection();
    if (!connTest.success) {
      console.error('❌ Connection failed:', connTest.error);
      console.error('\n💡 Make sure PostgreSQL is running:');
      console.error('   docker-compose up -d postgres');
      process.exit(1);
    }
    console.log('✅ Connected to PostgreSQL\n');

    // Find migrations directory
    const migrationsDir = path.join(__dirname, '..', 'api', 'src', 'migrations');
  
    if (!fs.existsSync(migrationsDir)) {
      console.log('⚠️  Migrations directory not found:', migrationsDir);
      console.log('   Creating directory...\n');
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    // Read migration files
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('⚠️  No migration files found in:', migrationsDir);
      console.log('   Migrations should be named: 001_migration_name.sql\n');
      await db.close();
      return;
    }

    console.log(`📁 Found ${files.length} migration file(s)\n`);
    console.log('═══════════════════════════════════════════════════');

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`\n⚙️  Running: ${file}`);
      console.log('───────────────────────────────────────────────────');

      try {
        // Smart split: handle PL/pgSQL functions and triggers
        const statements = smartSplitSQL(sql);

        console.log(`   📝 Found ${statements.length} statement(s)`);

        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i];
          if (!statement) continue;

          try {
            await db.run(statement);
            console.log(`   ✅ Statement ${i + 1}/${statements.length} executed`);
          } catch (err) {
            // Check if it's a "already exists" error (safe to skip)
            if (err.message.includes('already exists') || 
                err.message.includes('duplicate')) {
              console.log(`   ⏭️  Statement ${i + 1} - Already applied`);
            } else {
              throw err;
            }
          }
        }

        console.log(`   ✅ Migration completed: ${file}`);
        successCount++;

      } catch (error) {
        if (error.message.includes('already exists') ||
            error.message.includes('duplicate')) {
          console.log(`   ⏭️  Already applied, skipping`);
          skipCount++;
        } else {
          console.error(`   ❌ Error: ${error.message}`);
          errorCount++;
          // Continue with other migrations
        }
      }
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════════════════');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total: ${files.length}`);
    console.log('═══════════════════════════════════════════════════\n');

    if (errorCount > 0) {
      console.log('⚠️  Some migrations failed. Please review errors above.\n');
    } else {
      console.log('✅ All migrations processed successfully!\n');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    await db.close();
    console.log('🔌 Database connection closed\n');
  }
}

runMigrations().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
