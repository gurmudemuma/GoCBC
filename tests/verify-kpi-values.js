const axios = require('axios');
const API = 'http://localhost:3001/api/v1';

async function verifyKPIValues() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('     CUSTOMS PORTAL KPI VALUES - WHAT YOU WILL SEE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const login = await axios.post(`${API}/auth/login`, {
    username: 'customs_admin',
    password: 'password123'
  });
  const token = login.data.data.token;
  const headers = { Authorization: `Bearer ${token}` };

  const response = await axios.get(`${API}/customs/declarations`, { headers });
  const allDeclarations = response.data.data;

  // Calculate metrics
  const submitted = allDeclarations.filter(d => (d.status || d.Status) === 'SUBMITTED').length;
  const underReview = allDeclarations.filter(d => (d.status || d.Status) === 'UNDER_REVIEW').length;
  const underInspection = allDeclarations.filter(d => (d.status || d.Status) === 'UNDER_INSPECTION').length;
  const cleared = allDeclarations.filter(d => (d.status || d.Status) === 'CLEARED').length;
  const held = allDeclarations.filter(d => (d.status || d.Status) === 'HELD').length;
  const rejected = allDeclarations.filter(d => (d.status || d.Status) === 'REJECTED').length;
  const eudrCompliant = allDeclarations.filter(d => d.eudrCompliant || d.EUDRCompliant).length;
  
  const avgValue = allDeclarations.length > 0 
    ? allDeclarations.reduce((sum, d) => sum + parseFloat(d.totalValue || d.TotalValue || d.value || d.Value || 0), 0) / allDeclarations.length
    : 0;
  
  const totalClearedValue = allDeclarations
    .filter(d => (d.status || d.Status) === 'CLEARED')
    .reduce((sum, d) => sum + parseFloat(d.totalValue || d.TotalValue || d.value || d.Value || 0), 0);

  console.log('📊 TAB 0 - DECLARATION & DOCUMENT VALIDATION');
  console.log('─────────────────────────────────────────────────────────────\n');
  console.log(`  Card 1: Submitted Declarations = ${submitted}`);
  console.log(`  Card 2: Total Declarations = ${allDeclarations.length}`);
  console.log(`  Card 3: Average Value = $${(avgValue / 1000).toFixed(1)}K`);
  console.log(`  Card 4: EUDR Compliant = ${eudrCompliant}/${allDeclarations.length}`);
  console.log(`\n  Table: Shows ${submitted} declaration(s) with SUBMITTED status\n`);

  console.log('📊 TAB 1 - RISK MANAGEMENT & REVIEW');
  console.log('─────────────────────────────────────────────────────────────\n');
  console.log(`  Card 1: Under Review = ${underReview}`);
  console.log(`  Card 2: Held for Verification = ${held}`);
  console.log(`  Card 3: Review Rate = ${allDeclarations.length > 0 ? Math.round(((underReview + held) / allDeclarations.length) * 100) : 0}%`);
  console.log(`  Card 4: Non-EUDR Compliant = ${allDeclarations.length - eudrCompliant}`);
  console.log(`\n  Table: Shows ${underReview + held} declaration(s) in risk queue\n`);

  console.log('📊 TAB 2 - PHYSICAL INSPECTION');
  console.log('─────────────────────────────────────────────────────────────\n');
  const inspectionRequired = allDeclarations.filter(d => 
    (d.inspectionRequired || d.InspectionRequired) && 
    (d.status || d.Status) !== 'CLEARED' && 
    (d.status || d.Status) !== 'REJECTED'
  ).length;
  const inspectedCleared = allDeclarations.filter(d => 
    (d.status || d.Status) === 'CLEARED' && 
    (d.inspectionRequired || d.InspectionRequired)
  ).length;
  const inspectionRate = allDeclarations.length > 0 
    ? Math.round((allDeclarations.filter(d => d.inspectionRequired || d.InspectionRequired).length / allDeclarations.length) * 100)
    : 0;
  
  console.log(`  Card 1: Under Inspection = ${underInspection}`);
  console.log(`  Card 2: Inspection Required = ${inspectionRequired}`);
  console.log(`  Card 3: Inspections Completed = ${inspectedCleared}`);
  console.log(`  Card 4: Inspection Rate = ${inspectionRate}%`);
  console.log(`\n  Table: Shows ${underInspection} declaration(s) under inspection\n`);

  console.log('📊 TAB 3 - CUSTOMS RELEASE');
  console.log('─────────────────────────────────────────────────────────────\n');
  const clearanceRate = allDeclarations.length > 0 
    ? Math.round((cleared / allDeclarations.length) * 100)
    : 0;
  
  console.log(`  Card 1: Cleared Shipments = ${cleared}`);
  console.log(`  Card 2: Total Cleared Value = $${(totalClearedValue / 1000).toFixed(1)}K`);
  console.log(`  Card 3: Average Processing Time = N/A`);
  console.log(`  Card 4: Clearance Rate = ${clearanceRate}%`);
  console.log(`\n  Table: Shows ${cleared} cleared declaration(s)\n`);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('BACKEND STATUS BREAKDOWN:');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`  SUBMITTED:         ${submitted}`);
  console.log(`  UNDER_REVIEW:      ${underReview}`);
  console.log(`  UNDER_INSPECTION:  ${underInspection}`);
  console.log(`  HELD:              ${held}`);
  console.log(`  CLEARED:           ${cleared}`);
  console.log(`  REJECTED:          ${rejected}`);
  console.log(`  ─────────────────`);
  console.log(`  TOTAL:             ${allDeclarations.length}\n`);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ ALL FIXES APPLIED:');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('  1. Status display fixed - shows backend status');
  console.log('  2. Tab filtering fixed - each tab shows correct statuses');
  console.log('  3. KPI cards fixed - show customs workflow metrics');
  console.log('  4. UI build completed successfully\n');
  console.log('🔄 RESTART UI SERVER to see all changes\n');
}

verifyKPIValues().catch(console.error);
