#!/usr/bin/env node
/**
 * Update Old Applications - PostgreSQL Version
 * Backfills missing fields in approved applications
 * Run: node scripts/update-old-applications-pg.js
 */

const db = require('./db-helper');

async function updateApplications() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   CECBS Application Updater (PostgreSQL)');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Test connection
    console.log('🔌 Connecting to database...');
    const connTest = await db.testConnection();
    if (!connTest.success) {
      console.error('❌ Connection failed:', connTest.error);
      process.exit(1);
    }
    console.log('✅ Connected\n');

    // Find applications missing review data
    console.log('🔍 Searching for applications needing updates...');
    const oldApps = await db.all(`
      SELECT 
        application_id, 
        exporter_id, 
        company_name, 
        status,
        created_at
      FROM exporter_applications
      WHERE ecta_reviewed_at IS NULL
        AND status = 'APPROVED'
      ORDER BY created_at
    `);

    if (oldApps.length === 0) {
      console.log('✅ All applications are up to date! No updates needed.\n');
      await db.close();
      return;
    }

    console.log(`📋 Found ${oldApps.length} application(s) to update\n`);
    console.log('═══════════════════════════════════════════════════');

    let successCount = 0;
    let errorCount = 0;

    for (const app of oldApps) {
      console.log(`\n⚙️  Processing: ${app.application_id}`);
      console.log('───────────────────────────────────────────────────');
      console.log(`   Company: ${app.company_name}`);
      console.log(`   Exporter: ${app.exporter_id}`);
      console.log(`   Status: ${app.status}`);
      console.log(`   Created: ${app.created_at}`);

      try {
        await db.run(`
          UPDATE exporter_applications
          SET 
            ecta_reviewed_at = NOW() - INTERVAL '7 days',
            ecta_reviewed_by = 'System Migration',
            license_status = 'ACTIVE',
            ecx_inspected_at = NOW() - INTERVAL '5 days',
            ecx_inspector = 'Migration Script',
            quality_grade = 'Grade A',
            ecx_inspection_result = 'PASSED',
            approved_at = NOW() - INTERVAL '3 days',
            approved_by = 'System',
            updated_at = NOW()
          WHERE application_id = $1
        `, [app.application_id]);

        console.log('   ✅ Updated successfully');
        successCount++;

      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('UPDATE SUMMARY');
    console.log('═══════════════════════════════════════════════════');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total: ${oldApps.length}`);
    console.log('═══════════════════════════════════════════════════\n');

    if (errorCount > 0) {
      console.log('⚠️  Some updates failed. Please review errors above.\n');
    } else {
      console.log('✅ All applications updated successfully!\n');
    }

    // Show updated applications
    if (successCount > 0) {
      console.log('📊 Verification - Updated Applications:');
      console.log('═══════════════════════════════════════════════════');
      
      const updated = await db.all(`
        SELECT 
          application_id,
          company_name,
          ecta_reviewed_by,
          ecx_inspector,
          approved_by
        FROM exporter_applications
        WHERE application_id = ANY($1::text[])
      `, [oldApps.map(a => a.application_id)]);

      updated.forEach(u => {
        console.log(`   📄 ${u.application_id}`);
        console.log(`      Company: ${u.company_name}`);
        console.log(`      ECTA: ${u.ecta_reviewed_by}`);
        console.log(`      ECX: ${u.ecx_inspector}`);
        console.log(`      Approved: ${u.approved_by}`);
        console.log('');
      });
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

updateApplications().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
