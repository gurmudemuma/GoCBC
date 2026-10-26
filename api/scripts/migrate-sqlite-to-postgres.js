// Migrate all data from SQLite to PostgreSQL
const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');

const SQLITE_DB = './cecbs.db.backup.20260805-100851';
const POSTGRES_URL = 'postgresql://cecbs:cecbs123@localhost:5432/cecbs';

async function migrate() {
  const sqliteDb = new sqlite3.Database(SQLITE_DB);
  const pgClient = new Client({ connectionString: POSTGRES_URL });
  
  try {
    await pgClient.connect();
    console.log('✅ Connected to PostgreSQL');
    
    // Migrate users
    console.log('\n📊 Migrating users...');
    const users = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM users', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    console.log(`Found ${users.length} users in SQLite`);
    
    for (const user of users) {
      try {
        await pgClient.query(`
          INSERT INTO users (
            id, username, email, password_hash, full_name, role, organization,
            phone, permissions, status, exporter_id, ecta_license,
            bank_name, bank_account_number, bank_branch, bank_branch_code,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          ON CONFLICT (id) DO UPDATE SET
            username = EXCLUDED.username,
            email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            organization = EXCLUDED.organization,
            phone = EXCLUDED.phone,
            permissions = EXCLUDED.permissions,
            status = EXCLUDED.status,
            exporter_id = EXCLUDED.exporter_id,
            ecta_license = EXCLUDED.ecta_license,
            bank_name = EXCLUDED.bank_name,
            bank_account_number = EXCLUDED.bank_account_number,
            bank_branch = EXCLUDED.bank_branch,
            bank_branch_code = EXCLUDED.bank_branch_code,
            updated_at = EXCLUDED.updated_at
        `, [
          user.id, user.username, user.email, user.password_hash, user.full_name,
          user.role, user.organization, user.phone, user.permissions, user.status,
          user.exporter_id, user.ecta_license, user.bank_name, user.bank_account_number,
          user.bank_branch, user.bank_branch_code, user.created_at, user.updated_at
        ]);
        console.log(`  ✓ Migrated user: ${user.username} (${user.role})`);
      } catch (err) {
        console.error(`  ✗ Failed to migrate user ${user.username}:`, err.message);
      }
    }
    
    // Migrate exporter_applications
    console.log('\n📊 Migrating exporter applications...');
    const applications = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM exporter_applications', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    console.log(`Found ${applications.length} applications in SQLite`);
    
    for (const app of applications) {
      try {
        await pgClient.query(`
          INSERT INTO exporter_applications (
            id, application_id, company_name, tin_number, business_license_number,
            registration_date, exporter_type, capital_requirement, professional_taster,
            taster_certificate, laboratory_facility, laboratory_certificate_number,
            contact_person, email, phone, address, city, region,
            bank_name, bank_account_number, bank_branch_name, bank_branch_code,
            comments, documents, status, submitted_at, approved_at, rejected_at,
            rejection_reason, exporter_id, ecta_license_number, license_expiry_date,
            reviewed_by
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
            $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33
          )
          ON CONFLICT (id) DO UPDATE SET
            application_id = EXCLUDED.application_id,
            company_name = EXCLUDED.company_name,
            tin_number = EXCLUDED.tin_number,
            business_license_number = EXCLUDED.business_license_number,
            registration_date = EXCLUDED.registration_date,
            exporter_type = EXCLUDED.exporter_type,
            capital_requirement = EXCLUDED.capital_requirement,
            professional_taster = EXCLUDED.professional_taster,
            taster_certificate = EXCLUDED.taster_certificate,
            laboratory_facility = EXCLUDED.laboratory_facility,
            laboratory_certificate_number = EXCLUDED.laboratory_certificate_number,
            contact_person = EXCLUDED.contact_person,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            city = EXCLUDED.city,
            region = EXCLUDED.region,
            bank_name = EXCLUDED.bank_name,
            bank_account_number = EXCLUDED.bank_account_number,
            bank_branch_name = EXCLUDED.bank_branch_name,
            bank_branch_code = EXCLUDED.bank_branch_code,
            comments = EXCLUDED.comments,
            documents = EXCLUDED.documents,
            status = EXCLUDED.status,
            submitted_at = EXCLUDED.submitted_at,
            approved_at = EXCLUDED.approved_at,
            rejected_at = EXCLUDED.rejected_at,
            rejection_reason = EXCLUDED.rejection_reason,
            exporter_id = EXCLUDED.exporter_id,
            ecta_license_number = EXCLUDED.ecta_license_number,
            license_expiry_date = EXCLUDED.license_expiry_date,
            reviewed_by = EXCLUDED.reviewed_by
        `, [
          app.id, app.application_id, app.company_name, app.tin_number, app.business_license_number,
          app.registration_date, app.exporter_type, app.capital_requirement, app.professional_taster,
          app.taster_certificate, app.laboratory_facility, app.laboratory_certificate_number,
          app.contact_person, app.email, app.phone, app.address, app.city, app.region,
          app.bank_name, app.bank_account_number, app.bank_branch_name, app.bank_branch_code,
          app.comments, app.documents, app.status, app.submitted_at, app.approved_at, app.rejected_at,
          app.rejection_reason, app.exporter_id, app.ecta_license_number, app.license_expiry_date,
          app.reviewed_by
        ]);
        console.log(`  ✓ Migrated application: ${app.application_id} - ${app.company_name} (${app.status})`);
      } catch (err) {
        console.error(`  ✗ Failed to migrate application ${app.application_id}:`, err.message);
      }
    }
    
    // Final counts
    const finalUsers = await pgClient.query('SELECT COUNT(*) FROM users');
    const finalApps = await pgClient.query('SELECT COUNT(*) FROM exporter_applications');
    
    console.log('\n✅ Migration Complete!');
    console.log(`   Users: ${finalUsers.rows[0].count}`);
    console.log(`   Applications: ${finalApps.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    sqliteDb.close();
    await pgClient.end();
  }
}

migrate();
