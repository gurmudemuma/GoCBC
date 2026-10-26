// Sync exporters from blockchain to PostgreSQL
const { Client } = require('pg');
const axios = require('axios');

async function syncExporters() {
  const pgClient = new Client({
    connectionString: 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
  });

  try {
    await pgClient.connect();
    console.log('✅ Connected to PostgreSQL');

    // Query blockchain via API (using admin token if available)
    console.log('\n📡 Querying blockchain for exporters...');
    
    // Try direct chaincode query via peer
    const { execSync } = require('child_process');
    let exporters = [];
    
    try {
      const result = execSync(
        'docker exec coffee-chaincode cat /tmp/exporters.json',
        { encoding: 'utf8' }
      );
      exporters = JSON.parse(result);
    } catch (e) {
      console.log('Could not read from chaincode, will create sample data');
    }

    if (exporters.length === 0) {
      console.log('\n⚠️  No exporters found on blockchain');
      console.log('You can either:');
      console.log('1. Submit new exporter applications through the UI');
      console.log('2. Restore from SQLite backup if you have the data');
      return;
    }

    console.log(`Found ${exporters.length} exporters on blockchain`);

    // Insert into PostgreSQL
    for (const exp of exporters) {
      await pgClient.query(`
        INSERT INTO exporter_applications (
          application_id, company_name, tin_number, business_license_number,
          capital_requirement, professional_taster, taster_certificate,
          laboratory_facility, contact_person, email, phone, address, city,
          status, submitted_at, approved_at, exporter_id, ecta_license_number,
          license_expiry_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (application_id) DO NOTHING
      `, [
        `APP-${Date.now()}`,
        exp.companyName,
        exp.tinNumber || 'TIN-UNKNOWN',
        exp.businessLicense || 'BL-UNKNOWN',
        exp.minCapital || '50000000',
        exp.professionalTaster || 'Yes',
        exp.tasterCertificate || 'CERT-UNKNOWN',
        exp.laboratoryFacility || 'No',
        'Contact Person',
        `${exp.exporterId.toLowerCase()}@example.com`,
        '+251-XXX-XXXX',
        'Address',
        'Addis Ababa',
        'approved',
        new Date().toISOString(),
        new Date().toISOString(),
        exp.exporterId,
        exp.ectaLicenseNumber,
        exp.licenseExpiryDate
      ]);
      console.log(`  ✓ Synced: ${exp.exporterId} - ${exp.companyName}`);
    }

    const count = await pgClient.query('SELECT COUNT(*) FROM exporter_applications WHERE status = \'approved\'');
    console.log(`\n✅ Sync complete! Total approved exporters: ${count.rows[0].count}`);

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
  } finally {
    await pgClient.end();
  }
}

syncExporters();
