// Check if contracts have buyerBank and exporterBank fields
const FabricService = require('./dist/services/fabricService').default;

async function checkContractBanks() {
  const fabricService = FabricService.getInstance();
  
  try {
    console.log('🔍 Checking contract bank fields...\n');
    
    // Get all contracts
    const result = await fabricService.getAllContracts();
    
    if (!result.success) {
      console.error('❌ Failed to fetch contracts:', result.error);
      return;
    }
    
    const contracts = result.data;
    console.log(`Found ${contracts.length} contracts\n`);
    
    // Check each contract for bank fields
    for (const contract of contracts) {
      const hasBuyerBank = contract.buyerBank || contract.BuyerBank;
      const hasExporterBank = contract.exporterBank || contract.ExporterBank;
      
      console.log(`Contract: ${contract.contractId || contract.ContractID}`);
      console.log(`  Buyer Bank: ${hasBuyerBank || '❌ MISSING'}`);
      console.log(`  Exporter Bank: ${hasExporterBank || '❌ MISSING'}`);
      console.log(`  Status: ${contract.contractStatus || contract.ContractStatus}`);
      console.log(`  Total Value: ${contract.totalValue || contract.TotalValue} ${contract.currency || contract.Currency}`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkContractBanks()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
