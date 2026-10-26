const { Pool } = require('pg');

async function checkApplication() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
  });

  try {
    console.log('=== Checking Application for EXP4886039 ===\n');
    
    const result = await pool.query(`
      SELECT 
        ea.*,
        u.username as submitted_by_username,
        u.role as submitted_by_role,
        approver.username as reviewed_by_username,
        approver.role as reviewed_by_role
      FROM exporter_applications ea
      LEFT JOIN users u ON ea.submitted_by = u.user_id
      LEFT JOIN users approver ON ea.reviewed_by = approver.user_id
      WHERE ea.exporter_id = $1
      ORDER BY ea.created_at ASC
    `, ['EXP4886039']);
    
    if (result.rows.length === 0) {
      console.log('❌ No application found for EXP4886039');
    } else {
      console.log(`✅ Found ${result.rows.length} application(s):\n`);
      result.rows.forEach(app => {
        console.log('Application Details:');
        console.log('  Application ID:', app.application_id);
        console.log('  Company Name:', app.company_name);
        console.log('  Status:', app.status);
        console.log('  Submitted By:', app.submitted_by_username, `(${app.submitted_by})`);
        console.log('  Submitted At:', app.created_at);
        console.log('  Reviewed By:', app.reviewed_by_username || 'Not reviewed', `(${app.reviewed_by || 'N/A'})`);
        console.log('  Reviewed At:', app.reviewed_at || 'Not reviewed');
        console.log('  Approval Notes:', app.approval_notes || 'N/A');
        console.log('  ECTA License:', app.ecta_license_number || 'N/A');
        console.log('  Blockchain Registered:', app.blockchain_registered);
        console.log('  Blockchain Registered At:', app.blockchain_registered_at || 'N/A');
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkApplication();
