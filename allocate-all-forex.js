#!/usr/bin/env node
/**
 * Allocate all REQUESTED forex with complete details
 */

const axios = require('axios');
const API_BASE = 'http://localhost:3001/api/v1';

async function allocateAllForex() {
  console.log('🏦 Allocating All Pending Forex Requests\n');

  // Login
  console.log('1. Logging in as bank admin...');
  const loginRes = await axios.post(`${API_BASE}/auth/login`, {
    username: 'admin',
    password: 'admin123'
  });
  const token = loginRes.data.data.token;
  console.log('✅ Logged in\n');

  // Get all forex
  console.log('2. Fetching forex allocations...');
  const forexRes = await axios.get(`${API_BASE}/forex`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const allForex = forexRes.data.data || [];
  const requestedForex = allForex.filter(f => f.status === 'REQUESTED');
  console.log(`✅ Found ${requestedForex.length} REQUESTED forex allocations\n`);

  // Get or create LCs for contracts
  console.log('3. Checking for existing LCs...');
  const lcsRes = await axios.get(`${API_BASE}/banking/lcs`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const allLCs = lcsRes.data.data || [];
  console.log(`✅ Found ${allLCs.length} existing LCs\n`);

  // Allocate each forex
  console.log('4. Allocating forex with complete details...\n');
  
  for (const forex of requestedForex) {
    console.log(`\n📋 Processing Forex: ${forex.forexId}`);
    console.log(`   Contract: ${forex.contractId}`);
    console.log(`   Exporter: ${forex.exporterId}`);
    console.log(`   Requested: $${forex.requestedAmount.toLocaleString()}\n`);

    // Find or create LC for this contract
    let lcId = forex.lcId;
    
    if (!lcId) {
      // Check if there's an LC for this contract
      const existingLC = allLCs.find(lc => 
        lc.contractId === forex.contractId || 
        lc.exporterId === forex.exporterId
      );

      if (existingLC) {
        lcId = existingLC.lcId;
        console.log(`   ✅ Using existing LC: ${lcId}`);
      } else {
        // Create a new LC
        lcId = `LC-${forex.contractId}-${Date.now()}`;
        console.log(`   📝 Creating new LC: ${lcId}`);
        
        try {
          const lcData = {
            lcId: lcId,
            contractId: forex.contractId,
            exporterId: forex.exporterId,
            amount: forex.requestedAmount,
            currency: forex.currency || 'USD',
            issuingBank: 'Commercial Bank of Ethiopia',
            advisingBank: 'Dashen Bank',
            beneficiary: forex.exporterId,
            expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            terms: 'At sight',
            latestShipmentDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          };

          await axios.post(`${API_BASE}/banking/lcs`, lcData, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log(`   ✅ LC created successfully`);
        } catch (err) {
          console.log(`   ⚠️  Could not create LC: ${err.response?.data?.error?.message || err.message}`);
          console.log(`   Using generated LC ID anyway: ${lcId}`);
        }
      }
    }

    // Allocate forex with complete details
    const allocationData = {
      forexId: forex.forexId,
      lcId: lcId,
      amount: forex.requestedAmount,
      exchangeRate: 115.50, // Current NBE rate
      retentionRate: 40, // NBE policy: 40% retention
      officer: 'Bank Forex Officer',
      approvalRef: `NBE-FOREX-${Date.now()}`,
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    console.log(`\n   📤 Allocating with details:`);
    console.log(`      LC ID: ${allocationData.lcId}`);
    console.log(`      Amount: $${allocationData.amount.toLocaleString()}`);
    console.log(`      Exchange Rate: ${allocationData.exchangeRate} ETB/USD`);
    console.log(`      Retention: ${allocationData.retentionRate}%`);
    console.log(`      Officer: ${allocationData.officer}`);
    console.log(`      Approval Ref: ${allocationData.approvalRef}`);
    console.log(`      Expiry: ${allocationData.expiryDate}`);

    try {
      const allocRes = await axios.post(`${API_BASE}/forex/allocate`, allocationData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (allocRes.data.success) {
        console.log(`\n   ✅ Forex allocated successfully!`);
        console.log(`      TX ID: ${allocRes.data.txId || 'N/A'}`);
        
        // Calculate retention and conversion
        const retentionUSD = allocationData.amount * allocationData.retentionRate / 100;
        const conversionUSD = allocationData.amount * (100 - allocationData.retentionRate) / 100;
        const conversionETB = conversionUSD * allocationData.exchangeRate;
        
        console.log(`\n   💰 Allocation Breakdown:`);
        console.log(`      ${allocationData.retentionRate}% Retention: $${retentionUSD.toLocaleString(undefined, {minimumFractionDigits: 2})} USD`);
        console.log(`      ${100 - allocationData.retentionRate}% Conversion: ${conversionETB.toLocaleString(undefined, {minimumFractionDigits: 2})} ETB`);
      } else {
        console.log(`\n   ❌ Allocation failed: ${allocRes.data.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.log(`\n   ❌ Error: ${err.response?.data?.error?.message || err.message}`);
    }

    // Wait between allocations to avoid overwhelming the blockchain
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n\n✅ All forex allocation processing complete!');
  console.log('\n💡 Refresh your browser to see updated data');
}

allocateAllForex().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
