const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

async function fillAllBuyers() {
  try {
    await client.connect();
    
    // Get all unique buyer_ids
    const result = await client.query(
      "SELECT DISTINCT buyer_id, buyer_country FROM sales_contracts WHERE buyer_id IS NOT NULL AND buyer_id != '' ORDER BY buyer_id"
    );
    
    console.log('Found', result.rows.length, 'unique buyers\n');
    
    const buyerMappings = {
      'JOB_BEL': { name: 'Belgian Coffee Traders N.V.', country: 'Belgium', type: 'Trader' },
      'BUYER-JP-001': { name: 'UCC Ueshima Coffee Co.', country: 'Japan', type: 'Roaster' },
      'BUYER-SE-001': { name: 'Löfbergs AB', country: 'Sweden', type: 'Roaster' },
      'BUYER-US-001': { name: 'Starbucks Corporation', country: 'United States', type: 'Roaster' },
      'BUYER001': { name: 'Starbucks Corporation', country: 'USA', type: 'Roaster' },
      'B1': { name: 'International Coffee Importers Inc.', country: 'USA', type: 'Distributor' },
    };
    
    let inserted = 0;
    let updated = 0;
    
    for (const row of result.rows) {
      const buyerId = row.buyer_id;
      const dbCountry = row.buyer_country;
      
      let buyerInfo = buyerMappings[buyerId];
      
      if (!buyerInfo) {
        const countryName = dbCountry || 'International';
        buyerInfo = {
          name: `${countryName} Coffee Company (${buyerId})`,
          country: dbCountry || 'Unknown',
          type: 'Importer'
        };
      }
      
      const checkResult = await client.query('SELECT buyer_id FROM buyers WHERE buyer_id = $1', [buyerId]);
      
      if (checkResult.rows.length === 0) {
        await client.query(
          'INSERT INTO buyers (buyer_id, company_name, country, buyer_type) VALUES ($1, $2, $3, $4)',
          [buyerId, buyerInfo.name, buyerInfo.country, buyerInfo.type]
        );
        console.log('  ✅', buyerId, '→', buyerInfo.name);
        inserted++;
      } else {
        await client.query(
          'UPDATE buyers SET company_name = $2, country = $3, buyer_type = $4 WHERE buyer_id = $1',
          [buyerId, buyerInfo.name, buyerInfo.country, buyerInfo.type]
        );
        console.log('  🔄', buyerId, '→', buyerInfo.name);
        updated++;
      }
    }
    
    console.log('\n✅ Complete!');
    console.log('   Inserted:', inserted);
    console.log('   Updated:', updated);
    console.log('   Total:', inserted + updated);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fillAllBuyers();
