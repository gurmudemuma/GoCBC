const { DatabaseService } = require('./api/dist/services/databaseService');

async function check() {
  const db = DatabaseService.getInstance();
  
  // Get recent contracts
  const contracts = await db.all(`
    SELECT c.contract_id, c.status, c.created_at, COUNT(d.document_id) as doc_count
    FROM contracts c
    LEFT JOIN documents d ON d.contract_id = c.contract_id
    GROUP BY c.contract_id, c.status, c.created_at
    ORDER BY c.created_at DESC
    LIMIT 5
  `);
  
  console.log('\n=== Recent Contracts with Document Counts ===\n');
  contracts.forEach(c => {
    console.log(`${c.contract_id} (${c.status}): ${c.doc_count} documents`);
  });
  
  // Get documents for first contract
  if (contracts.length > 0) {
    const contractId = contracts[0].contract_id;
    const docs = await db.all(`
      SELECT document_id, document_type, file_name, verification_status
      FROM documents
      WHERE contract_id = $1
    `, [contractId]);
    
    console.log(`\n=== Documents for ${contractId} ===\n`);
    if (docs.length > 0) {
      docs.forEach(d => {
        console.log(`- ${d.document_type}: ${d.file_name} [${d.verification_status || 'pending'}]`);
      });
    } else {
      console.log('No documents found');
    }
  }
  
  process.exit(0);
}

check().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
