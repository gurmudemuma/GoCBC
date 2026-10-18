#!/usr/bin/env node
/**
 * Diagnose Contract Document Issues
 * 
 * This script checks:
 * 1. Which contracts exist in the database
 * 2. Which contracts have documents
 * 3. Document entity_type and entity_id mapping
 * 4. Missing documents for active contracts
 */

const { DatabaseService } = require('./api/dist/services/databaseService');
const path = require('path');
const fs = require('fs');

async function diagnose() {
  console.log('\n=== CONTRACT DOCUMENT DIAGNOSTIC ===\n');
  
  const db = DatabaseService.getInstance();
  
  try {
    // 1. Get all contracts
    console.log('📋 Step 1: Checking contracts...\n');
    const contracts = await db.all(
      `SELECT contract_id, exporter_id, contract_status, created_at 
       FROM contracts 
       ORDER BY created_at DESC 
       LIMIT 10`
    );
    
    console.log(`Found ${contracts.length} recent contracts:\n`);
    contracts.forEach((c, i) => {
      console.log(`${i + 1}. ${c.contract_id} - Status: ${c.contract_status} (${c.created_at})`);
    });
    
    // 2. Check documents table structure
    console.log('\n\n📄 Step 2: Checking documents table structure...\n');
    const sampleDoc = await db.get(`SELECT * FROM documents LIMIT 1`);
    if (sampleDoc) {
      console.log('Document columns:', Object.keys(sampleDoc).join(', '));
    }
    
    // 3. Check documents for each contract
    console.log('\n\n🔍 Step 3: Checking documents for each contract...\n');
    
    for (const contract of contracts) {
      // Try multiple query methods
      
      // Method 1: entity_type='CONTRACT' and entity_id=contractId
      const docs1 = await db.all(
        `SELECT document_id, document_type, file_name, entity_type, entity_id, contract_id
         FROM documents 
         WHERE entity_type = 'CONTRACT' AND entity_id = $1`,
        [contract.contract_id]
      );
      
      // Method 2: contract_id column
      const docs2 = await db.all(
        `SELECT document_id, document_type, file_name, entity_type, entity_id, contract_id
         FROM documents 
         WHERE contract_id = $1`,
        [contract.contract_id]
      );
      
      const totalDocs = new Set([...docs1.map(d => d.document_id), ...docs2.map(d => d.document_id)]).size;
      
      console.log(`\n${contract.contract_id}:`);
      console.log(`  ├─ Method 1 (entity_type='CONTRACT', entity_id): ${docs1.length} docs`);
      console.log(`  ├─ Method 2 (contract_id column): ${docs2.length} docs`);
      console.log(`  └─ Total unique: ${totalDocs} docs`);
      
      if (totalDocs > 0) {
        const allDocs = [...docs1, ...docs2];
        const uniqueDocs = Array.from(new Map(allDocs.map(d => [d.document_id, d])).values());
        uniqueDocs.forEach(doc => {
          console.log(`      • ${doc.document_type}: ${doc.file_name}`);
          console.log(`        (entity_type: ${doc.entity_type}, entity_id: ${doc.entity_id}, contract_id: ${doc.contract_id})`);
        });
      }
    }
    
    // 4. Check for orphaned documents
    console.log('\n\n🔍 Step 4: Checking for orphaned CONTRACT documents...\n');
    const orphanedDocs = await db.all(
      `SELECT d.document_id, d.entity_id, d.contract_id, d.document_type, d.file_name
       FROM documents d
       LEFT JOIN contracts c ON d.entity_id = c.contract_id OR d.contract_id = c.contract_id
       WHERE d.entity_type = 'CONTRACT' AND c.contract_id IS NULL
       LIMIT 10`
    );
    
    if (orphanedDocs.length > 0) {
      console.log(`Found ${orphanedDocs.length} documents linked to non-existent contracts:`);
      orphanedDocs.forEach(doc => {
        console.log(`  • ${doc.document_id}: entity_id=${doc.entity_id}, contract_id=${doc.contract_id}`);
      });
    } else {
      console.log('✅ No orphaned documents found');
    }
    
    // 5. Check physical files
    console.log('\n\n📁 Step 5: Checking physical document files...\n');
    const uploadDir = path.join(__dirname, 'api/uploads/documents');
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      console.log(`Found ${files.length} files in ${uploadDir}`);
      
      // Check for sample documents
      const sampleFiles = files.filter(f => 
        f.toLowerCase().includes('contract') || 
        f.toLowerCase().includes('sales') ||
        f.toLowerCase().includes('signed')
      );
      
      if (sampleFiles.length > 0) {
        console.log('\nContract-related sample files:');
        sampleFiles.forEach(f => console.log(`  • ${f}`));
      }
    } else {
      console.log('❌ Upload directory not found:', uploadDir);
    }
    
    // 6. Summary and recommendations
    console.log('\n\n📊 SUMMARY & RECOMMENDATIONS:\n');
    
    const contractsWithDocs = contracts.filter(c => {
      const docs1Count = contracts.filter(ct => ct.contract_id === c.contract_id).length;
      return docs1Count > 0;
    });
    
    console.log(`Total Contracts: ${contracts.length}`);
    console.log(`Contracts with Documents: ${contractsWithDocs.length}`);
    console.log(`Contracts without Documents: ${contracts.length - contractsWithDocs.length}`);
    
    if (contracts.length > contractsWithDocs.length) {
      console.log('\n⚠️  ISSUE: Some contracts have no documents uploaded');
      console.log('\nPossible causes:');
      console.log('  1. Documents were not uploaded during contract creation');
      console.log('  2. entity_type or entity_id mismatch in documents table');
      console.log('  3. Frontend not sending documents properly');
      console.log('\nSolutions:');
      console.log('  1. Add sample documents to existing contracts (run: node add-sample-contract-docs.js)');
      console.log('  2. Fix entity_type/entity_id mapping in database');
      console.log('  3. Test document upload in ExporterPortal');
    } else {
      console.log('\n✅ All contracts have documents!');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error(error.stack);
  }
}

diagnose().then(() => {
  console.log('\n=== DIAGNOSTIC COMPLETE ===\n');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
