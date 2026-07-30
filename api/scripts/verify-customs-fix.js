/**
 * Verify that the customs declarations migration was successful
 */

const FabricService = require('./dist/services/fabricService').default;
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function main() {
    try {
        console.log('🔍 Verifying customs declarations fix...');
        console.log('⏰ Timestamp:', new Date().toISOString());
        
        // Get Fabric service instance
        const fabricService = FabricService.getInstance();
        
        // Connect as Customs organization
        console.log('📡 Connecting to Fabric network as CustomsMSP...');
        await fabricService.connectAsOrg('CustomsMSP');
        console.log('✅ Connected successfully\n');
        
        // Query all declarations
        console.log('📋 Querying all customs declarations...');
        const result = await fabricService.queryChaincode('QueryAllCustomsDeclarations', []);
        
        if (result.success) {
            const declarations = result.data || [];
            console.log(`✅ Successfully queried ${declarations.length} declarations\n`);
            
            // Check if any still have null riskFactors
            let nullCount = 0;
            let emptyArrayCount = 0;
            let withDataCount = 0;
            
            declarations.forEach(d => {
                if (d.riskFactors === null || d.riskFactors === undefined) {
                    nullCount++;
                } else if (Array.isArray(d.riskFactors) && d.riskFactors.length === 0) {
                    emptyArrayCount++;
                } else if (Array.isArray(d.riskFactors) && d.riskFactors.length > 0) {
                    withDataCount++;
                }
            });
            
            console.log('📊 Risk Factors Summary:');
            console.log(`   Total declarations: ${declarations.length}`);
            console.log(`   With null/undefined riskFactors: ${nullCount}`);
            console.log(`   With empty array riskFactors: ${emptyArrayCount}`);
            console.log(`   With populated riskFactors: ${withDataCount}`);
            
            if (nullCount > 0) {
                console.log('\n⚠️  WARNING: Some declarations still have null riskFactors!');
                console.log('    Sample declarations with null:');
                declarations
                    .filter(d => !d.riskFactors)
                    .slice(0, 3)
                    .forEach(d => {
                        console.log(`    - ${d.declarationId}: riskFactors = ${d.riskFactors}`);
                    });
            } else {
                console.log('\n✅ SUCCESS: All declarations have valid riskFactors arrays!');
                console.log('   The migration fixed all null values.');
            }
            
        } else {
            console.error('❌ Query failed:', result.error);
            process.exit(1);
        }
        
        console.log('\n✨ Verification complete!');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Verification error:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
