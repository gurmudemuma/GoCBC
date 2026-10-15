#!/usr/bin/env node
/**
 * Fix Exporter Login Issues
 * 
 * This script fixes common exporter login problems:
 * 1. Users still with temporary "applicant_" usernames
 * 2. Users with status 'inactive' instead of 'active'
 * 3. Missing exporter_id in users table
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function fixExporterLogins() {
  try {
    console.log('=== Fixing Exporter Login Issues ===\n');
    
    // Fix 1: Update users with temporary usernames to use exporterId
    console.log('Step 1: Fixing temporary usernames...');
    const tempUsersResult = await pool.query(`
      UPDATE users u
      SET 
        username = ea.exporter_id,
        exporter_id = ea.exporter_id,
        status = 'active',
        role = 'EXPORTER',
        organization = 'EXPORTER'
      FROM exporter_applications ea
      WHERE u.username = ea.temp_username
        AND ea.status = 'approved'
        AND ea.exporter_id IS NOT NULL
        AND u.username LIKE 'applicant_%'
      RETURNING u.username, ea.exporter_id
    `);
    console.log(`✓ Updated ${tempUsersResult.rowCount} users from temporary usernames`);
    
    // Fix 2: Activate all approved exporter accounts
    console.log('\nStep 2: Activating approved exporter accounts...');
    const activateResult = await pool.query(`
      UPDATE users u
      SET status = 'active'
      FROM exporter_applications ea
      WHERE u.exporter_id = ea.exporter_id
        AND ea.status = 'approved'
        AND u.status = 'inactive'
        AND u.role = 'EXPORTER'
      RETURNING u.username
    `);
    console.log(`✓ Activated ${activateResult.rowCount} exporter accounts`);
    
    // Fix 3: Create missing user accounts for approved exporters
    console.log('\nStep 3: Creating missing user accounts...');
    const missingAccounts = await pool.query(`
      SELECT ea.exporter_id, ea.company_name, ea.email, ea.temp_password, ea.id
      FROM exporter_applications ea
      LEFT JOIN users u ON u.exporter_id = ea.exporter_id
      WHERE ea.status = 'approved'
        AND ea.exporter_id IS NOT NULL
        AND u.id IS NULL
    `);
    
    console.log(`Found ${missingAccounts.rows.length} approved exporters without user accounts`);
    
    for (const app of missingAccounts.rows) {
      try {
        await pool.query(`
          INSERT INTO users (username, email, password_hash, full_name, role, organization, exporter_id, status)
          VALUES ($1, $2, $3, $4, 'EXPORTER', 'EXPORTER', $1, 'active')
          ON CONFLICT (username) DO UPDATE SET
            exporter_id = EXCLUDED.exporter_id,
            status = 'active',
            role = 'EXPORTER'
        `, [app.exporter_id, app.email, app.temp_password, app.company_name]);
        console.log(`  ✓ Created account for ${app.exporter_id}`);
      } catch (err) {
        console.log(`  ✗ Failed to create account for ${app.exporter_id}: ${err.message}`);
      }
    }
    
    // Fix 4: Ensure exporter_id is set for all exporter users
    console.log('\nStep 4: Setting missing exporter_id values...');
    const setExporterIdResult = await pool.query(`
      UPDATE users u
      SET exporter_id = ea.exporter_id
      FROM exporter_applications ea
      WHERE u.email = ea.email
        AND ea.status = 'approved'
        AND u.role = 'EXPORTER'
        AND (u.exporter_id IS NULL OR u.exporter_id = '')
      RETURNING u.username, ea.exporter_id
    `);
    console.log(`✓ Set exporter_id for ${setExporterIdResult.rowCount} users`);
    
    // Verification: Show final status
    console.log('\n=== Final Status ===');
    const finalCheck = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE u.status = 'active') as active_count,
        COUNT(*) FILTER (WHERE u.status = 'inactive') as inactive_count,
        COUNT(*) FILTER (WHERE u.username LIKE 'applicant_%') as temp_username_count
      FROM users u
      WHERE u.role = 'EXPORTER'
    `);
    
    const stats = finalCheck.rows[0];
    console.log(`Active exporter accounts: ${stats.active_count}`);
    console.log(`Inactive exporter accounts: ${stats.inactive_count}`);
    console.log(`Accounts with temp usernames: ${stats.temp_username_count}`);
    
    if (stats.temp_username_count > 0 || stats.inactive_count > 0) {
      console.log('\n⚠️  WARNING: Some accounts still need attention!');
    } else {
      console.log('\n✅ All exporter accounts are properly configured!');
    }
    
    // Show exporters who can now login
    console.log('\n=== Exporters who can login ===');
    const loginableExporters = await pool.query(`
      SELECT username, email, exporter_id, status
      FROM users
      WHERE role = 'EXPORTER' AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    loginableExporters.rows.forEach(e => {
      console.log(`  Username: ${e.username} | Email: ${e.email} | Status: ${e.status}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

fixExporterLogins();
