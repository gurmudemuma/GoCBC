#!/usr/bin/env node
/**
 * Portal Actions Verification Script
 * Analyzes all portals for quick actions, buttons, and action columns
 */

const fs = require('fs');
const path = require('path');

const portalsDir = path.join(__dirname, 'ui', 'src', 'components', 'portals');

const portals = [
  'ExporterPortal.tsx',
  'BanksPortal.tsx',
  'CustomsPortal.tsx',
  'ECTAPortal.tsx',
  'ECXPortal.tsx',
  'ShippingPortal.tsx',
  'NBEPortal.tsx',
];

console.log('\n' + '█'.repeat(70));
console.log('  PORTAL ACTIONS & BUTTONS VERIFICATION');
console.log('█'.repeat(70) + '\n');

const buttonPatterns = [
  { pattern: /<Button[^>]*onClick/g, name: 'Button with onClick' },
  { pattern: /<IconButton[^>]*onClick/g, name: 'IconButton' },
  { pattern: /<TableCell[^>]*<[^>]*Actions?[^>]*>/g, name: 'Actions Column' },
  { pattern: /handleApprove|handleReject|handleSubmit|handleCreate/g, name: 'Action Handlers' },
  { pattern: /startIcon=|endIcon=/g, name: 'Icon Buttons' },
  { pattern: /<Tooltip[^>]*title=/g, name: 'Tooltips' },
];

const results = {};

portals.forEach(portalFile => {
  const portalPath = path.join(portalsDir, portalFile);
  
  if (!fs.existsSync(portalPath)) {
    console.log(`❌ ${portalFile} - FILE NOT FOUND\n`);
    return;
  }
  
  const content = fs.readFileSync(portalPath, 'utf8');
  const portalName = portalFile.replace('.tsx', '');
  
  results[portalName] = {
    buttons: 0,
    iconButtons: 0,
    actionColumns: 0,
    handlers: 0,
    iconUsage: 0,
    tooltips: 0,
    quickActions: [],
    tables: 0,
  };
  
  // Count buttons
  const buttons = content.match(/<Button[^>]*>/g) || [];
  results[portalName].buttons = buttons.length;
  
  // Count icon buttons
  const iconButtons = content.match(/<IconButton[^>]*>/g) || [];
  results[portalName].iconButtons = iconButtons.length;
  
  // Check for action columns
  const actionColumns = content.match(/Actions?<\/TableCell>|<TableCell[^>]*align="right"[^>]*>/g) || [];
  results[portalName].actionColumns = actionColumns.length;
  
  // Count handlers
  const handlers = content.match(/const handle[A-Z]\w+\s*=|function handle[A-Z]\w+/g) || [];
  results[portalName].handlers = handlers.length;
  
  // Count icon usage
  const icons = content.match(/startIcon=|endIcon=/g) || [];
  results[portalName].iconUsage = icons.length;
  
  // Count tooltips
  const tooltips = content.match(/<Tooltip[^>]*title=/g) || [];
  results[portalName].tooltips = tooltips.length;
  
  // Count tables
  const tables = content.match(/<Table[^>]*>/g) || [];
  results[portalName].tables = tables.length;
  
  // Extract specific quick actions
  const quickActionPatterns = [
    'Approve', 'Reject', 'Submit', 'Create', 'Edit', 'Delete', 'View',
    'Download', 'Upload', 'Issue', 'Request', 'Verify', 'Cancel',
    'Process', 'Complete', 'Initiate', 'Record', 'Update', 'Settle',
  ];
  
  quickActionPatterns.forEach(action => {
    const regex = new RegExp(`handle${action}|on${action}|${action.toLowerCase()}[A-Z]`, 'g');
    if (regex.test(content)) {
      results[portalName].quickActions.push(action);
    }
  });
});

// Display results
console.log('='.repeat(70));
console.log('SUMMARY BY PORTAL');
console.log('='.repeat(70) + '\n');

Object.keys(results).forEach(portal => {
  const data = results[portal];
  const totalInteractions = data.buttons + data.iconButtons + data.actionColumns;
  
  console.log(`📊 ${portal}`);
  console.log('─'.repeat(70));
  console.log(`  Buttons:           ${data.buttons}`);
  console.log(`  Icon Buttons:      ${data.iconButtons}`);
  console.log(`  Action Columns:    ${data.actionColumns}`);
  console.log(`  Action Handlers:   ${data.handlers}`);
  console.log(`  Icon Usage:        ${data.iconUsage}`);
  console.log(`  Tooltips:          ${data.tooltips}`);
  console.log(`  Tables:            ${data.tables}`);
  console.log(`  Quick Actions:     ${data.quickActions.join(', ') || 'None detected'}`);
  console.log(`  Total Interactions: ${totalInteractions}`);
  
  if (totalInteractions > 0) {
    console.log(`  Status:            ✅ HAS ACTIONS`);
  } else {
    console.log(`  Status:            ⚠️  NO ACTIONS DETECTED`);
  }
  console.log();
});

console.log('='.repeat(70));
console.log('OVERALL STATISTICS');
console.log('='.repeat(70) + '\n');

let totalButtons = 0;
let totalIconButtons = 0;
let totalActions = 0;
let totalHandlers = 0;

Object.values(results).forEach(data => {
  totalButtons += data.buttons;
  totalIconButtons += data.iconButtons;
  totalActions += data.actionColumns;
  totalHandlers += data.handlers;
});

console.log(`  Total Buttons:        ${totalButtons}`);
console.log(`  Total Icon Buttons:   ${totalIconButtons}`);
console.log(`  Total Action Columns: ${totalActions}`);
console.log(`  Total Handlers:       ${totalHandlers}`);
console.log(`  Grand Total:          ${totalButtons + totalIconButtons + totalActions}`);

console.log('\n' + '='.repeat(70));

const allPortalsHaveActions = Object.values(results).every(data => 
  (data.buttons + data.iconButtons + data.actionColumns) > 0
);

if (allPortalsHaveActions) {
  console.log('✅ ALL PORTALS HAVE INTERACTIVE ACTIONS');
} else {
  console.log('⚠️  SOME PORTALS MAY NEED ADDITIONAL ACTIONS');
}

console.log('='.repeat(70) + '\n');

// Check for common missing patterns
console.log('DETAILED ANALYSIS');
console.log('='.repeat(70) + '\n');

portals.forEach(portalFile => {
  const portalPath = path.join(portalsDir, portalFile);
  if (!fs.existsSync(portalPath)) return;
  
  const content = fs.readFileSync(portalPath, 'utf8');
  const portalName = portalFile.replace('.tsx', '');
  
  console.log(`🔍 ${portalName}`);
  
  // Check for common patterns
  const checks = [
    { pattern: /TableCell.*Actions?/i, label: 'Has Actions Column', emoji: '✅' },
    { pattern: /<IconButton/, label: 'Has Icon Buttons', emoji: '✅' },
    { pattern: /Tooltip/, label: 'Has Tooltips', emoji: '✅' },
    { pattern: /Dialog.*open/i, label: 'Has Dialogs', emoji: '✅' },
    { pattern: /Menu.*anchorEl/i, label: 'Has Menus', emoji: '✅' },
    { pattern: /Chip.*onClick/i, label: 'Has Clickable Chips', emoji: '✅' },
    { pattern: /handleView|handleEdit|handleDelete/, label: 'Has CRUD Actions', emoji: '✅' },
    { pattern: /handleApprove|handleReject/, label: 'Has Approval Actions', emoji: '✅' },
  ];
  
  checks.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`  ${check.emoji} ${check.label}`);
    }
  });
  
  console.log();
});

console.log('='.repeat(70) + '\n');
