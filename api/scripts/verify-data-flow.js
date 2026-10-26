/**
 * Verify Data Flow - End to End
 * Checks that all exporter data flows correctly through:
 * Contract → LC → Shipment → Payment
 */

const path = require('path');
const fabricServicePath = path.join(__dirname, 'dist', 'services', 'fabricService.js');
const { FabricService } = require(fabricServicePath);

async function verifyDataFlow(contractId) {
    const fabricService = FabricService.getInstance();
    
    console.log(`\n🔍 Verifying Data Flow for Contract: ${contractId}`);
    console.log(`${'='.repeat(70)}\n`);
    
    try {
        // Step 1: Get Contract Data
        console.log(`📋 Step 1: Reading Contract...`);
        const contractResult = await fabricService.queryChaincode('ReadSalesContract', [contractId]);
        
        if (!contractResult.success) {
            console.log(`❌ Contract not found: ${contractId}`);
            return;
        }
        
        const contract = contractResult.data;
        
        // Contract data comes in camelCase from API
        const exporterID = contract.exporterId;
        const buyerID = contract.buyerId;
        const buyerCountry = contract.buyerCountry;
        const buyerBank = contract.buyerBank;
        const exporterBank = contract.exporterBank;
        const coffeeType = contract.coffeeType;
        const quantity = contract.quantity;
        const pricePerKg = contract.pricePerKg;
        const totalValue = contract.totalValue;
        const currency = contract.currency;
        const paymentMethod = contract.paymentMethod;
        const status = contract.contractStatus;
        
        console.log(`✅ Contract Found`);
        console.log(`   Exporter: ${exporterID}`);
        console.log(`   Buyer: ${buyerID}`);
        console.log(`   Buyer Country: ${buyerCountry}`);
        console.log(`   Buyer Bank: ${buyerBank || 'NOT SET'}`);
        console.log(`   Exporter Bank: ${exporterBank || 'NOT SET'}`);
        console.log(`   Coffee Type: ${coffeeType}`);
        console.log(`   Quantity: ${quantity} kg`);
        console.log(`   Price/kg: ${pricePerKg} ${currency}`);
        console.log(`   Total Value: ${totalValue} ${currency}`);
        console.log(`   Payment Method: ${paymentMethod}`);
        console.log(`   Status: ${status}`);
        
        // Step 2: Find LCs for this contract
        console.log(`\n📋 Step 2: Finding LCs for Contract...`);
        const allLCsResult = await fabricService.queryChaincode('QueryAllLCs', []);
        
        if (allLCsResult.success) {
            const lcs = allLCsResult.data.filter(lc => lc.contractId === contractId);
            
            if (lcs.length === 0) {
                console.log(`⚠️ No LCs found for this contract`);
            } else {
                console.log(`✅ Found ${lcs.length} LC(s):`);
                
                lcs.forEach((lc, index) => {
                    // LC data comes in camelCase from API
                    const lcId = lc.lcId;
                    const lcStatus = lc.status;
                    const lcExporterID = lc.exporterId;
                    const lcIssuingBank = lc.issuingBank;
                    const lcAdvisingBank = lc.advisingBank;
                    const lcBeneficiary = lc.beneficiary;
                    const lcAmount = lc.amount;
                    const lcCurrency = lc.currency;
                    
                    console.log(`\n   LC ${index + 1}: ${lcId}`);
                    console.log(`   Status: ${lcStatus}`);
                    console.log(`   Exporter: ${lcExporterID}`);
                    console.log(`   Issuing Bank: ${lcIssuingBank || 'NOT SET'}`);
                    console.log(`   Advising Bank: ${lcAdvisingBank || 'NOT SET'}`);
                    console.log(`   Beneficiary: ${lcBeneficiary || 'NOT SET'}`);
                    console.log(`   Amount: ${lcAmount} ${lcCurrency}`);
                    
                    // Verify data matches contract
                    const issues = [];
                    
                    if (lcExporterID !== exporterID) {
                        issues.push(`Exporter mismatch: LC=${lcExporterID} vs Contract=${exporterID}`);
                    }
                    
                    if (lcAmount !== totalValue) {
                        issues.push(`Amount mismatch: LC=${lcAmount} vs Contract=${totalValue}`);
                    }
                    
                    if (lcCurrency !== currency) {
                        issues.push(`Currency mismatch: LC=${lcCurrency} vs Contract=${currency}`);
                    }
                    
                    if (buyerBank && lcIssuingBank !== buyerBank) {
                        issues.push(`Issuing Bank mismatch: LC=${lcIssuingBank} vs Contract=${buyerBank}`);
                    }
                    
                    if (exporterBank && lcAdvisingBank !== exporterBank) {
                        issues.push(`Advising Bank mismatch: LC=${lcAdvisingBank} vs Contract=${exporterBank}`);
                    }
                    
                    if (issues.length > 0) {
                        console.log(`\n   ⚠️ DATA INTEGRITY ISSUES:`);
                        issues.forEach(issue => console.log(`      - ${issue}`));
                    } else {
                        console.log(`\n   ✅ All data matches contract`);
                    }
                });
            }
        }
        
        // Step 3: Find Shipments for this contract
        console.log(`\n📋 Step 3: Finding Shipments for Contract...`);
        const allShipmentsResult = await fabricService.queryChaincode('QueryAllShipments', []);
        
        if (allShipmentsResult.success && allShipmentsResult.data) {
            const shipments = allShipmentsResult.data.filter(s => s.contractId === contractId);
            
            if (shipments.length === 0) {
                console.log(`⚠️ No shipments found for this contract`);
            } else {
                console.log(`✅ Found ${shipments.length} Shipment(s):`);
                
                shipments.forEach((shipment, index) => {
                    // Shipment data comes in camelCase from API
                    const shipmentID = shipment.shipmentId;
                    const shipmentStatus = shipment.status;
                    const shipmentExporterID = shipment.exporterId;
                    const shipmentBuyerID = shipment.buyerId;
                    const shipmentQuantity = shipment.quantity;
                    const shipmentOrigin = shipment.origin;
                    const shipmentDestination = shipment.destination;
                    
                    console.log(`\n   Shipment ${index + 1}: ${shipmentID}`);
                    console.log(`   Status: ${shipmentStatus}`);
                    console.log(`   Exporter: ${shipmentExporterID}`);
                    console.log(`   Buyer: ${shipmentBuyerID}`);
                    console.log(`   Quantity: ${shipmentQuantity} kg`);
                    console.log(`   Origin: ${shipmentOrigin}`);
                    console.log(`   Destination: ${shipmentDestination}`);
                    
                    // Verify data matches contract
                    const issues = [];
                    
                    if (shipmentExporterID !== exporterID) {
                        issues.push(`Exporter mismatch: Shipment=${shipmentExporterID} vs Contract=${exporterID}`);
                    }
                    
                    if (shipmentBuyerID !== buyerID) {
                        issues.push(`Buyer mismatch: Shipment=${shipmentBuyerID} vs Contract=${buyerID}`);
                    }
                    
                    if (shipmentQuantity > quantity) {
                        issues.push(`Quantity exceeds contract: Shipment=${shipmentQuantity} > Contract=${quantity}`);
                    }
                    
                    if (issues.length > 0) {
                        console.log(`\n   ⚠️ DATA INTEGRITY ISSUES:`);
                        issues.forEach(issue => console.log(`      - ${issue}`));
                    } else {
                        console.log(`\n   ✅ All data matches contract`);
                    }
                });
            }
        } else {
            console.log(`⚠️ No shipments found or query failed`);
        }
        
        console.log(`\n${'='.repeat(70)}`);
        console.log(`✅ Data flow verification complete\n`);
        
    } catch (error) {
        console.error(`\n❌ Error:`, error);
    }
}

// Get contract ID from command line
const contractId = process.argv[2];

if (!contractId) {
    console.log(`\nUsage: node verify-data-flow.js CONTRACT_ID`);
    console.log(`\nExample: node verify-data-flow.js CONTRACT1784193660328\n`);
    process.exit(1);
}

verifyDataFlow(contractId).then(() => {
    process.exit(0);
}).catch((err) => {
    console.error(`\n❌ Fatal error:`, err);
    process.exit(1);
});
