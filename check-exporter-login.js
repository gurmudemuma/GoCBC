#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function checkExporters() {
  try {
    console.log('=== Checking Exporter Login Issues ===\n');
    
    // 1. Check exporter users
    console.log('1. Exporter users in users table:');
    const users = await pool.query(`
      SELECT username, email, role, status, exporter_id, organization, created_at 
      FROM users 
      WHERE role = 'EXPORTER' 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    console.log(`Found ${users.rows.length} exporter users:`);
    users.rows.forEach(u => {
      console.log(`  - ${u.username} | ${u.email} | Status: ${u.status} | ExporterID: ${u.exporter_id || 'NULL'}`);
    });
    
    // 2. Check exporter applications
    console.log('\n2. Approved exporter applications:');
    const apps = await pool.query(`
      SELECT application_id, company_name, email, status, exporter_id, 
             temp_username, account_created, approved_at
      FROM exporter_applications 
      WHERE status = 'approved' 
      ORDER BY approved_at DESC 
      LIMIT 10
    `);
    console.log(`Found ${apps.rows.length} approved applications:`);
    apps.rows.forEach(a => {
      console.log(`  - ${a.application_id} | ${a.company_name} | ExporterID: ${a.exporter_id} | TempUser: ${a.temp_username} | AccountCreated: ${a.account_created}`);
    });
    
    // 3. Check mismatches
    console.log('\n3. Checking for issues:');
    const issues = await pool.query(`
      SELECT ea.application_id, ea.exporter_id, ea.company_name, ea.email,
             ea.temp_username, ea.account_created,
             u.username as user_username, u.status as user_status
      FROM exporter_applications ea
      LEFT JOIN users u ON u.exporter_id = ea.exporter_id
      WHERE ea.status = 'approved' AND ea.account_created = true
      ORDER BY ea.approved_at DESC
      LIMIT 10
    `);
    
    console.log('Approved applications and their user accounts:');
    issues.rows.forEach(i => {
      const hasUser = i.user_username ? '✓' : '✗';
      const userStatus = i.user_status || 'NO USER';
      console.log(`  ${hasUser} ${i.exporter_id} | ${i.company_name}`);
      console.log(`     TempUser: ${i.temp_username} | CurrentUser: ${i.user_username || 'NONE'} | Status: ${userStatus}`);
    });
    
    // 4. Check for orphaned temp users (still has temporary username)
    console.log('\n4. Users with temporary usernames (should be updated):');
    const tempUsers = await pool.query(`
      SELECT username, email, status, exporter_id
      FROM users
      WHERE username LIKE 'applicant_%'
      LIMIT 10
    `);
    if (tempUsers.rows.length > 0) {
      console.log('⚠️  WARNING: Found users with temporary usernames:');
      tempUsers.rows.forEach(u => {
        console.log(`  - ${u.username} | Status: ${u.status} | ExporterID: ${u.exporter_id || 'NULL'}`);
      });
    } else {
      console.log('✓ No temporary usernames found');
    }
    
    console.log('\n=== Analysis Complete ===');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkExporters();
