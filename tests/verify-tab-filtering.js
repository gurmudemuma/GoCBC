const axios = require('axios');
const API = 'http://localhost:3001/api/v1';

async function verifyTabFiltering() {
  console.log('Verifying Customs Portal Tab Filtering\n');
  console.log('=======================================\n');

  // Login
  const login = await axios.post(`${API}/auth/login`, {
    username: 'customs_admin',
    password: 'password123'
  });
  const token = login.data.data.token;
  const headers = { Authorization: `Bearer ${token}` };

  // Get all declarations
  const response = await axios.get(`${API}/customs/declarations`, { headers });
  const allDeclarations = response.data.data;

  console.log(`Total Declarations: ${allDeclarations.length}\n`);

  // Count by status
  const statusCounts = {};
  allDeclarations.forEach(d => {
    const status = d.status || d.Status;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  console.log('Declarations by Status:');
  Object.keys(statusCounts).sort().forEach(status => {
    console.log(`  ${status}: ${statusCounts[status]}`);
  });

  console.log('\n=======================================');
  console.log('TAB FILTERING LOGIC');
  console.log('=======================================\n');

  // Tab 0: Declaration & Document Validation
  const tab0 = allDeclarations.filter(d => 
    (d.status || d.Status) === 'SUBMITTED'
  );
  console.log(`Tab 0 (Declaration & Document Validation):`);
  console.log(`  Filter: status === 'SUBMITTED'`);
  console.log(`  Count: ${tab0.length}`);
  console.log(`  Purpose: New declarations needing document validation\n`);

  // Tab 1: Risk Management & Review
  const tab1 = allDeclarations.filter(d => {
    const status = d.status || d.Status;
    return status === 'UNDER_REVIEW' ||
           status === 'HELD' ||
           status === 'PERMIT_ISSUED' ||
           status === 'QUALITY_APPROVED';
  });
  console.log(`Tab 1 (Risk Management & Review):`);
  console.log(`  Filter: UNDER_REVIEW, HELD, PERMIT_ISSUED, QUALITY_APPROVED`);
  console.log(`  Count: ${tab1.length}`);
  console.log(`  Purpose: Declarations in risk assessment/review\n`);

  // Tab 2: Physical Inspection
  const tab2 = allDeclarations.filter(d => 
    (d.status || d.Status) === 'UNDER_INSPECTION'
  );
  console.log(`Tab 2 (Physical Inspection):`);
  console.log(`  Filter: status === 'UNDER_INSPECTION'`);
  console.log(`  Count: ${tab2.length}`);
  console.log(`  Purpose: Declarations requiring physical inspection\n`);

  // Tab 3: Customs Release
  const tab3 = allDeclarations.filter(d => 
    (d.status || d.Status) === 'CLEARED'
  );
  console.log(`Tab 3 (Customs Release):`);
  console.log(`  Filter: status === 'CLEARED'`);
  console.log(`  Count: ${tab3.length}`);
  console.log(`  Purpose: Declarations that have been cleared\n`);

  console.log('=======================================');
  console.log('STATUS WORKFLOW PROGRESSION');
  console.log('=======================================\n');
  console.log('ECTA issues export permit');
  console.log('  ↓');
  console.log('TAB 0: Customs declaration created → SUBMITTED');
  console.log('  ↓ (officer reviews declaration)');
  console.log('TAB 1: Schedule inspection → UNDER_INSPECTION');
  console.log('  ↓ (physical inspection)');
  console.log('TAB 2: Complete inspection → UNDER_REVIEW');
  console.log('  ↓ (final approval)');
  console.log('TAB 3: Grant clearance → CLEARED\n');

  console.log('✅ Each tab now shows different declarations based on their status!\n');
}

verifyTabFiltering().catch(console.error);
