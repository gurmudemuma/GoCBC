// Test hash chain recalculation logic
const crypto = require('crypto');

// Simulate transactions from multiple entities
const mockTransactions = [
  // Contract transactions
  { entity: 'CONTRACT', txId: 'tx1', prevHash: 'genesis', newHash: 'aaa111' },
  { entity: 'CONTRACT', txId: 'tx2', prevHash: 'aaa111', newHash: 'bbb222' },
  
  // LC transactions (starts with its own genesis)
  { entity: 'LC', txId: 'tx3', prevHash: 'genesis', newHash: 'ccc333' },
  { entity: 'LC', txId: 'tx4', prevHash: 'ccc333', newHash: 'ddd444' },
  
  // Forex transactions (starts with its own genesis)
  { entity: 'FOREX', txId: 'tx5', prevHash: 'genesis', newHash: 'eee555' },
];

const genesisHash = crypto.createHash('sha256').update(JSON.stringify({})).digest('hex');

console.log('Genesis hash:', genesisHash);
console.log('\n=== BEFORE RECALCULATION ===');
mockTransactions.forEach((tx, i) => {
  const prev = tx.prevHash === 'genesis' ? genesisHash.substring(0, 16) + '...' : tx.prevHash;
  console.log(`TX ${i} (${tx.entity}): Prev=${prev}, New=${tx.newHash}`);
});

// Recalculate
console.log('\n=== RECALCULATING ===');
for (let i = 0; i < mockTransactions.length; i++) {
  const tx = mockTransactions[i];
  
  if (i === 0) {
    tx.prevHash = 'genesis';
    console.log(`TX ${i}: Genesis (first in merged timeline)`);
  } else {
    const expectedPrev = mockTransactions[i - 1].newHash;
    const actualPrev = tx.prevHash === 'genesis' ? genesisHash : tx.prevHash;
    const isEntityGenesis = tx.prevHash === 'genesis';
    
    if (isEntityGenesis) {
      console.log(`TX ${i}: Entity genesis detected - relinking`);
      console.log(`  Before: ${genesisHash.substring(0, 16)}...`);
      tx.prevHash = expectedPrev;
      console.log(`  After:  ${expectedPrev}`);
    } else {
      console.log(`TX ${i}: Chain verified (${actualPrev} === ${expectedPrev} ? ${actualPrev === expectedPrev})`);
    }
  }
}

console.log('\n=== AFTER RECALCULATION ===');
mockTransactions.forEach((tx, i) => {
  const prev = tx.prevHash === 'genesis' ? genesisHash.substring(0, 16) + '...' : tx.prevHash;
  console.log(`TX ${i} (${tx.entity}): Prev=${prev}, New=${tx.newHash}`);
  
  if (i > 0) {
    const expectedPrev = mockTransactions[i - 1].newHash;
    const actualPrev = tx.prevHash;
    const verified = actualPrev === expectedPrev;
    console.log(`  -> Chain ${verified ? '✓ VERIFIED' : '❌ BROKEN'}`);
  }
});
