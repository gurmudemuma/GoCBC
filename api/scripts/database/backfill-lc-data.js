// Backfill LC data from Blockchain to PostgreSQL
// Fixes missing exporter_id and other fields

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
});

async function backfillLCData() {
  console.log('🔄 Starting LC data backfill from blockchain to PostgreSQL...\n');
  
  try {
    // Get all LCs from PostgreSQL
    const result = await pool.query('SELECT lc_id FROM letters_of_credit');
    const pgLCs = result.rows;
    
    console.log(`📊 Found ${pgLCs.length} LCs in PostgreSQL`);
    
    // For now, just update with sample data since we need blockchain connection
    // In production, this would query blockchain for each LC
    
    for (const lc of pgLCs) {
      const lcId = lc.lc_id;
      
      // Extract exporter_id from LC ID pattern: LC-CONTRACT{contractId}-{timestamp}
      // or use a default pattern
      let exporterId = '';
      
      if (lcId.includes('CONTRACT')) {
        // Pattern: LC-CONTRACT1788435011592-1788509695626
        // We need to query contracts table or blockchain
        const contractMatch = lcId.match(/CONTRACT(\d+)/);
        if (contractMatch) {
          const contractId = `CONTRACT${contractMatch[1]}`;
          
          // Try to find exporter from contract
          const contractResult = await pool.query(
            'SELECT exporter_id FROM sales_contracts WHERE contract_id = $1',
            [contractId]
          );
          
          if (contractResult.rows.length > 0) {
            exporterId = contractResult.rows[0].exporter_id;
          }
        }
      }
      
      // Update LC with exporter_id if found
      if (exporterId) {
        await pool.query(
          'UPDATE letters_of_credit SET exporter_id = $1 WHERE lc_id = $2',
          [exporterId, lcId]
        );
        console.log(`✅ Updated LC ${lcId} with exporter_id: ${exporterId}`);
      } else {
        console.log(`⚠️  Could not determine exporter_id for LC ${lcId}`);
      }
    }
    
    console.log('\n✅ Backfill complete!');
    
  } catch (error) {
    console.error('❌ Backfill failed:', error);
  } finally {
    await pool.end();
  }
}

backfillLCData();
