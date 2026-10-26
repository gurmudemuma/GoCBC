#!/usr/bin/env node
/**
 * Comprehensive Action Verification Script
 * Checks all portal actions, handlers, and detail views
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
console.log('COMPREHENSIVE ACTION & HANDLER VERIFICATION');
console.log('='.repeat(80) + '\n');

const issues = [];

portals.forEach(portal => {
  const portalPath = path.join(portalsDir, portal.file);
  
  if (!fs.existsSync(portalPath)) {
    issues.push(`❌ ${portal.name} - FILE NOT FOUND`);
    return;
  }
  
  const content = fs.readFileSync(portalPath, 'utf8');
  
  console.log(`\n📋 ${portal.name}`);
  console.log('─'.repeat(80));
  
  // Extract all onClick handlers
  const onClickMatches = content.match(/onClick=\{[^}]+\}/g) || [];
  console.log(`  onClick handlers: ${onClickMatches.length}`);
  
  // Extract all handleXXX functions
  const handleFunctions = content.match(/const handle[A-Z]\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>\s*\{/g) || [];
  console.log(`  Handler functions: ${handleFunctions.length}`);
  
  // Check for action buttons
  const actionButtons = content.match(/<Button[^>]*onClick/g) || [];
  console.log(`  Action buttons: ${actionButtons.length}`);
  
  // Check for icon buttons
  const iconButtons = content.match(/<IconButton[^>]*onClick/g) || [];
  console.log(`  Icon buttons: ${iconButtons.length}`);
  
  // Check for dialogs
  const dialogs = content.match(/<Dialog[^>]*open/g) || [];
  console.log(`  Dialogs: ${dialogs.length}`);
  
  // Check for detail views (setState or similar)
  const detailViews = content.match(/setSelected[A-Z]\w+\(/g) || [];
  const uniqueDetailViews = [...new Set(detailViews)];
  console.log(`  Detail view setters: ${uniqueDetailViews.length}`);
  
  // Check for missing handlers
  const missingHandlers = [];
  onClickMatches.forEach(onClick => {
    const match = onClick.match(/onClick=\{([^}]+)\}/);
    if (match) {
      const handler = match[1].trim();
      if (handler.startsWith('handle') && !content.includes(`const ${handler}`)) {
        missingHandlers.push(handler);
      }
    }
  });
  
  if (missingHandlers.length > 0) {
    console.log(`  ⚠️  Potentially missing handlers: ${[...new Set(missingHandlers)].join(', ')}`);
    issues.push(`${portal.name}: Missing handlers - ${[...new Set(missingHandlers)].join(', ')}`);
  }
  
  // Check for Action columns
  const hasActionsColumn = content.includes('Actions</TableCell>') || 
                          content.includes("field: 'actions'") ||
                          content.includes('headerName: "Actions"') ||
                          content.includes("headerName: 'Actions'");
  
  console.log(`  Has Actions column: ${hasActionsColumn ? '✅' : '❌'}`);
  
  if (!hasActionsColumn && (content.includes('<Table>') || content.includes('<DataGrid'))) {
    issues.push(`${portal.name}: Missing Actions column in tables/grids`);
  }
  
  // Check for API calls
  const apiCalls = content.match(/apiFetch\(/g) || [];
  console.log(`  API calls: ${apiCalls.length}`);
  
  // Summary
  const totalInteractions = actionButtons.length + iconButtons.length;
  console.log(`\n  Total interactions: ${totalInteractions}`);
  
  if (totalInteractions === 0) {
    issues.push(`${portal.name}: No interactive buttons found`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(80) + '\n');

if (issues.length === 0) {
  console.log('✅ All portals have proper actions and handlers\n');
} else {
  console.log(`⚠️  Found ${issues.length} issues:\n`);
  issues.forEach((issue, idx) => {
    console.log(`  ${idx + 1}. ${issue}`);
  });
  console.log();
}

console.log('='.repeat(80) + '\n');

// Check for common action patterns
console.log('COMMON ACTION PATTERNS CHECK');
console.log('='.repeat(80) + '\n');

const commonActions = [
  { name: 'View/Details', pattern: /handleView|handleDetail|<Visibility/g },
  { name: 'Approve', pattern: /handleApprove|<CheckCircle/g },
  { name: 'Reject', pattern: /handleReject|<Cancel.*onClick/g },
  { name: 'Edit', pattern: /handleEdit|<Edit.*onClick/g },
  { name: 'Delete', pattern: /handleDelete|<Delete.*onClick/g },
  { name: 'Download', pattern: /handleDownload|<Download.*onClick/g },
  { name: 'Upload', pattern: /handleUpload|<Upload.*onClick/g },
  { name: 'Track', pattern: /handleTrack|<LocationOn.*onClick|<Timeline.*onClick/g },
];

portals.forEach(portal => {
  const portalPath = path.join(portalsDir, portal.file);
  if (!fs.existsSync(portalPath)) return;
  
  const content = fs.readFileSync(portalPath, 'utf8');
  
  console.log(`${portal.name}:`);
  commonActions.forEach(action => {
    const matches = content.match(action.pattern);
    if (matches) {
      console.log(`  ✅ ${action.name}: ${matches.length} occurrences`);
    }
  });
  console.log();
});

console.log('='.repeat(80) + '\n');
