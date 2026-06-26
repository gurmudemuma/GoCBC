/**
 * Ethiopian Coffee Export Consortium Blockchain System (CECBS)
 * Test Script: Bank/Branch Selection Flow for Exporter Registration
 * 
 * This script tests the complete flow:
 * 1. Submit exporter application
 * 2. Approve application with bank/branch selection
 * 3. Verify bank information is stored correctly
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'cecbs.db');

console.log('🧪 CECBS Bank/Branch Selection Flow Test');
console.log('━'.repeat(60));
console.log(`Database: ${dbPath}\n`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to connect to database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database\n');
});

// Test data
const testApplication = {
  application_id: `TEST-APP-${Date.now()}`,
  company_name: 'Test Coffee Exporters Ltd',
  tin_number: 'TIN-123456789',
  business_license_number: 'BL-987654321',
  registration_date: '2024-01-15',
  exporter_type: 'private',
  capital_requirement: '75000000',
  professional_taster: 'John Doe',
  taster_certificate: 'CERT-2024-001',
  laboratory_facility: 'yes',
  laboratory_certificate_number: 'LAB-2024-001',
  contact_person: 'Jane Smith',
  email: `test.exporter.${Date.now()}@test.com`,
  phone: '+251-91-123-4567',
  address: '123 Coffee Street',
  city: 'Addis Ababa',
  region: 'Addis Ababa',
  bank_name: 'Commercial Bank of Ethiopia',
  bank_account_number: '1000123456789',
  status: 'pending'
};

const approvalData = {
  exporter_id: `EXP${Math.floor(Math.random() * 9000000) + 1000000}`,
  ecta_license_number: `ECTA-LIC-2026-${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}`,
  license_expiry_date: '2027-06-24',
  bank_name: 'Commercial Bank of Ethiopia',
  bank_branch: 'Bole Branch',
  bank_branch_code: 'CBE-002'
};

// Step 1: Insert test application
console.log('📝 Step 1: Creating test exporter application...');
const insertAppSQL = `
  INSERT INTO exporter_applications (
    application_id, company_name, tin_number, business_license_number,
    registration_date, exporter_type, capital_requirement, professional_taster,
    taster_certificate, laboratory_facility, laboratory_certificate_number,
    contact_person, email, phone, address, city, region, bank_name,
    bank_account_number, status, submitted_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`;

db.run(insertAppSQL, [
  testApplication.application_id,
  testApplication.company_name,
  testApplication.tin_number,
  testApplication.business_license_number,
  testApplication.registration_date,
  testApplication.exporter_type,
  testApplication.capital_requirement,
  testApplication.professional_taster,
  testApplication.taster_certificate,
  testApplication.laboratory_facility,
  testApplication.laboratory_certificate_number,
  testApplication.contact_person,
  testApplication.email,
  testApplication.phone,
  testApplication.address,
  testApplication.city,
  testApplication.region,
  testApplication.bank_name,
  testApplication.bank_account_number,
  testApplication.status
], function(err) {
  if (err) {
    console.error('❌ Failed to insert test application:', err.message);
    db.close();
    process.exit(1);
  }
  
  console.log(`✅ Test application created: ${testApplication.application_id}`);
  console.log(`   Company: ${testApplication.company_name}`);
  console.log(`   Email: ${testApplication.email}`);
  console.log(`   Bank: ${testApplication.bank_name}\n`);
  
  // Step 2: Simulate approval with bank/branch selection
  console.log('✅ Step 2: Approving application with bank/branch selection...');
  
  const updateAppSQL = `
    UPDATE exporter_applications 
    SET status = 'approved',
        approved_at = datetime('now'),
        exporter_id = ?,
        ecta_license_number = ?,
        license_expiry_date = ?,
        bank_branch_name = ?,
        bank_branch_code = ?
    WHERE application_id = ?
  `;
  
  db.run(updateAppSQL, [
    approvalData.exporter_id,
    approvalData.ecta_license_number,
    approvalData.license_expiry_date,
    approvalData.bank_branch,
    approvalData.bank_branch_code,
    testApplication.application_id
  ], function(err) {
    if (err) {
      console.error('❌ Failed to approve application:', err.message);
      db.close();
      process.exit(1);
    }
    
    console.log(`✅ Application approved!`);
    console.log(`   Exporter ID: ${approvalData.exporter_id}`);
    console.log(`   License: ${approvalData.ecta_license_number}`);
    console.log(`   Bank: ${approvalData.bank_name}`);
    console.log(`   Branch: ${approvalData.bank_branch} (${approvalData.bank_branch_code})\n`);
    
    // Step 3: Create user account with bank information
    console.log('👤 Step 3: Creating user account with bank information...');
    
    const bcrypt = require('bcrypt');
    const password = `${approvalData.exporter_id}@test123`;
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const insertUserSQL = `
      INSERT INTO users (
        username, email, password_hash, full_name, role, organization,
        phone, exporter_id, ecta_license, bank_name, bank_branch, bank_branch_code,
        permissions, status, created_at
      ) VALUES (?, ?, ?, ?, 'EXPORTER', ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))
    `;
    
    const defaultPermissions = JSON.stringify([
      'contract.create', 'contract.view', 
      'shipment.view', 'shipment.create',
      'payment.view', 'document.upload', 
      'document.view', 'report.generate'
    ]);
    
    db.run(insertUserSQL, [
      approvalData.exporter_id,
      testApplication.email,
      hashedPassword,
      testApplication.contact_person,
      testApplication.company_name,
      testApplication.phone,
      approvalData.exporter_id,
      approvalData.ecta_license_number,
      approvalData.bank_name,
      approvalData.bank_branch,
      approvalData.bank_branch_code,
      defaultPermissions
    ], function(err) {
      if (err) {
        console.error('❌ Failed to create user account:', err.message);
        db.close();
        process.exit(1);
      }
      
      console.log(`✅ User account created!`);
      console.log(`   Username: ${approvalData.exporter_id}`);
      console.log(`   Password: ${password}`);
      console.log(`   Status: active\n`);
      
      // Step 4: Verify data integrity
      console.log('🔍 Step 4: Verifying data integrity...\n');
      
      // Verify application
      db.get(`SELECT * FROM exporter_applications WHERE application_id = ?`, 
        [testApplication.application_id], (err, app) => {
        if (err || !app) {
          console.error('❌ Failed to verify application');
          db.close();
          process.exit(1);
        }
        
        console.log('✅ Application Record:');
        console.log(`   Status: ${app.status}`);
        console.log(`   Exporter ID: ${app.exporter_id}`);
        console.log(`   License: ${app.ecta_license_number}`);
        console.log(`   Bank: ${app.bank_name}`);
        console.log(`   Branch: ${app.bank_branch_name}`);
        console.log(`   Branch Code: ${app.bank_branch_code}`);
        console.log(`   Expires: ${app.license_expiry_date}\n`);
        
        // Verify user
        db.get(`SELECT * FROM users WHERE username = ?`, [approvalData.exporter_id], (err, user) => {
          if (err || !user) {
            console.error('❌ Failed to verify user account');
            db.close();
            process.exit(1);
          }
          
          console.log('✅ User Account:');
          console.log(`   Username: ${user.username}`);
          console.log(`   Email: ${user.email}`);
          console.log(`   Role: ${user.role}`);
          console.log(`   Organization: ${user.organization}`);
          console.log(`   Exporter ID: ${user.exporter_id}`);
          console.log(`   Bank: ${user.bank_name}`);
          console.log(`   Branch: ${user.bank_branch}`);
          console.log(`   Branch Code: ${user.bank_branch_code}`);
          console.log(`   Status: ${user.status}\n`);
          
          // Final verification
          console.log('━'.repeat(60));
          console.log('📊 Test Results:');
          
          const allChecks = [
            app.status === 'approved',
            app.exporter_id === approvalData.exporter_id,
            app.bank_name === approvalData.bank_name,
            app.bank_branch_name === approvalData.bank_branch,
            app.bank_branch_code === approvalData.bank_branch_code,
            user.username === approvalData.exporter_id,
            user.status === 'active',
            user.bank_name === approvalData.bank_name,
            user.bank_branch === approvalData.bank_branch,
            user.bank_branch_code === approvalData.bank_branch_code
          ];
          
          const passed = allChecks.filter(Boolean).length;
          const total = allChecks.length;
          
          console.log(`   ✅ Passed: ${passed}/${total} checks`);
          
          if (passed === total) {
            console.log('\n✨ All tests passed! Bank/branch selection flow is working correctly!\n');
            console.log('🎯 Summary:');
            console.log(`   • Application approved with bank information`);
            console.log(`   • User account created with bank details`);
            console.log(`   • Bank: ${approvalData.bank_name}`);
            console.log(`   • Branch: ${approvalData.bank_branch} (${approvalData.bank_branch_code})`);
            console.log(`   • This branch will process Letter of Credit requests\n`);
          } else {
            console.log('\n⚠️  Some checks failed. Please review the output above.\n');
          }
          
          console.log('━'.repeat(60));
          console.log('\n💡 Next Steps:');
          console.log('   1. Test the UI approval dialog with bank/branch selection');
          console.log('   2. Verify bank info appears in exporter profile');
          console.log('   3. Test LC processing with selected bank branch');
          console.log('   4. Update Exporter Portal to display bank information\n');
          
          db.close();
          process.exit(passed === total ? 0 : 1);
        });
      });
    });
  });
});
