// Check actual contract data from blockchain
const { FabricService } = require('./dist/services/fabricService');

async function checkBlockchainContract() {
  const fabricService = FabricService.getInstance();
  
  const contractID = 'CONTRACT1787051634593';
  
  console.log('\n=== CHECKING CONTRACT ON BLOCKCHAIN ===\n');
  console.log(`Contract ID: ${contractID}\n`);
  
  try {
    // Get contract from blockchain
    const result = await fabricService.getSalesContract(contractID);
    
    if (!result.success) {
      console.log('❌ Failed to get contract:', result.error);
      return;
    }
    
    const contract = result.data;
    
    console.log('=== FULL CONTRACT DATA ===\n');
    console.log(JSON.stringify(contract, null, 2));
    
    console.log('\n\n=== KEY FIELDS FOR LC ===\n');
    console.log(`Contract ID: ${contract.ContractID || contract.contractID}`);
    console.log(`Exporter ID: ${contract.ExporterID || contract.exporterID}`);
    console.log(`Buyer Name: ${contract.BuyerName || contract.buyerName}`);
    console.log(`Buyer Country: ${contract.BuyerCountry || contract.buyerCountry}`);
    console.log(`Buyer Bank: ${contract.BuyerBank || contract.buyerBank || 'NOT SET'}`);
    console.log(`Exporter Bank: ${contract.ExporterBank || contract.exporterBank || 'NOT SET'}`);
    console.log(`Status: ${contract.Status || contract.status}`);
    console.log(`Amount: ${contract.Currency || 'USD'} ${contract.TotalValue || contract.totalValue}`);
    
    console.log('\n=== BANK FIELDS ANALYSIS ===\n');
    
    const buyerBank = contract.BuyerBank || contract.buyerBank;
    const exporterBank = contract.ExporterBank || contract.exporterBank;
    
    if (!buyerBank || buyerBank === '') {
      console.log('❌ ISSUE: BuyerBank is NOT SET');
      console.log('   This should be the issuing bank (buyer\'s bank)');
      console.log('   Example: "Deutsche Bank AG" or "Bank of America"');
    } else {
      console.log(`✅ BuyerBank (Issuing Bank): ${buyerBank}`);
    }
    
    if (!exporterBank || exporterBank === '') {
      console.log('❌ ISSUE: ExporterBank is NOT SET');
      console.log('   This should be the advising bank (exporter\'s bank)');
      console.log('   Example: "Commercial Bank of Ethiopia"');
    } else {
      console.log(`✅ ExporterBank (Advising Bank): ${exporterBank}`);
    }
    
    console.log('\n=== WHAT NEEDS TO BE FIXED ===\n');
    if (!buyerBank || !exporterBank) {
      console.log('The contract was created without bank information.');
      console.log('When ECTA approved this contract, the bank fields were not populated.');
      console.log('\nOptions:');
      console.log('1. Update the contract on blockchain to add bank fields');
      console.log('2. Require banks to be specified during contract creation');
      console.log('3. Allow banks to be specified when issuing LC');
    } else {
      console.log('✅ Contract has all required bank information');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkBlockchainContract().then(() => process.exit(0));
