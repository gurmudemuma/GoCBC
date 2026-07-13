#!/usr/bin/env node
/**
 * Analyze Portal Tables for Action Columns
 * Identifies tables and their current action column implementation
 */

const fs = require('fs');
const path = require('path');

const portalsDir = path.join(__dirname, 'ui', 'src', 'components', 'portals');

const portals = [
  { file: 'ExporterPortal.tsx', name: 'Exporter Portal' },
  { file: 'BanksPortal.tsx', name: 'Banks Portal' },
  { file: 'CustomsPortal.tsx', name: 'Customs Portal' },
  { file: 'ECTAPortal.tsx', name: 'ECTA Portal' },
  { file: 'ECXPortal.tsx', name: 'ECX Portal' },
  { file: 'ShippingPortal.tsx', name: 'Shipping Portal' },
  { file: 'NBEPortal.tsx', name: 'NBE Portal' },
];

console.log('\n' + '='.repeat(80));
console.log('PORTAL TABLES ACTION COLUMN ANALYSIS');
console.log('='.repeat(80) + '\n');

portals.forEach(portal => {
  const portalPath = path.join(portalsDir, portal.file);
  
  if (!fs.existsSync(portalPath)) {
    console.log(`❌ ${portal.name} - NOT FOUND\n`);
    return;
  }
  
  const content = fs.readFileSync(portalPath, 'utf8');
  
  console.log(`\n📋 ${portal.name.toUpperCase()}`);
  console.log('─'.repeat(80));
  
  // Find all tables
  const tableMatches = content.match(/<Table[\s\S]*?<\/Table>/g) || [];
  console.log(`Tables found: ${tableMatches.length}`);
  
  // Find tables with Actions column
  const tablesWithActions = tableMatches.filter(table => 
    /Actions?<\/TableCell>/i.test(table)
  );
  console.log(`Tables with Actions column: ${tablesWithActions.length}`);
  
  // Find DataGrid usage
  const dataGrids = (content.match(/<DataGrid/g) || []).length;
  if (dataGrids > 0) {
    console.log(`DataGrids found: ${dataGrids}`);
  }
  
  // Identify table contexts
  const tableContexts = [];
  
  // Common patterns to identify table purpose
  const patterns = [
    { regex: /contracts.*Table/i, name: 'Contracts Table', expectedActions: ['View', 'Edit', 'Approve', 'Download'] },
    { regex: /shipments.*Table/i, name: 'Shipments Table', expectedActions: ['View', 'Track', 'Update', 'Documents'] },
    { regex: /payments.*Table/i, name: 'Payments Table', expectedActions: ['View', 'Verify', 'Process', 'Download'] },
    { regex: /Letter.*Credit.*Table/i, name: 'LC Table', expectedActions: ['View', 'Issue', 'Amend', 'Approve'] },
    { regex: /forex.*Table/i, name: 'Forex Table', expectedActions: ['View', 'Allocate', 'Details'] },
    { regex: /customs.*Table/i, name: 'Customs Table', expectedActions: ['View', 'Approve', 'Clear', 'Documents'] },
    { regex: /inspection.*Table/i, name: 'Inspection Table', expectedActions: ['View', 'Approve', 'Reject', 'Certificate'] },
    { regex: /permits.*Table/i, name: 'Permits Table', expectedActions: ['View', 'Issue', 'Download', 'Verify'] },
  ];
  
  patterns.forEach(pattern => {
    if (pattern.regex.test(content)) {
      tableContexts.push({
        name: pattern.name,
        expectedActions: pattern.expectedActions,
        hasActionsColumn: tablesWithActions.length > 0
      });
    }
  });
  
  if (tableContexts.length > 0) {
    console.log('\nExpected Tables & Actions:');
    tableContexts.forEach((ctx, idx) => {
      console.log(`  ${idx + 1}. ${ctx.name}`);
      console.log(`     Expected actions: ${ctx.expectedActions.join(', ')}`);
      console.log(`     Has Actions column: ${ctx.hasActionsColumn ? '✅' : '❌'}`);
    });
  }
  
  // Check for inline action buttons (not in action column)
  const inlineButtons = content.match(/<TableCell>[\s\S]*?<Button[\s\S]*?<\/TableCell>/g) || [];
  const inlineButtonsNotInActions = inlineButtons.filter(cell => 
    !/Actions?/i.test(cell)
  ).length;
  
  if (inlineButtonsNotInActions > 0) {
    console.log(`\n⚠️  Found ${inlineButtonsNotInActions} buttons in table cells (not in Actions column)`);
  }
  
  // Summary
  console.log('\nStatus:');
  if (tablesWithActions.length === 0 && tableMatches.length > 0) {
    console.log('  ❌ NEEDS ACTION COLUMNS ADDED');
  } else if (tablesWithActions.length < tableMatches.length) {
    console.log('  ⚠️  SOME TABLES MISSING ACTION COLUMNS');
  } else if (tablesWithActions.length > 0) {
    console.log('  ✅ HAS ACTION COLUMNS');
  } else {
    console.log('  ℹ️  No tables detected (may use DataGrid or other components)');
  }
});

console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80) + '\n');

console.log('Next Steps:');
console.log('  1. Add Actions column to tables that are missing it');
console.log('  2. Move inline buttons to Actions column for consistency');
console.log('  3. Add tooltips to icon buttons for accessibility');
console.log('  4. Ensure each table has appropriate CRUD/workflow actions\n');

console.log('='.repeat(80) + '\n');
