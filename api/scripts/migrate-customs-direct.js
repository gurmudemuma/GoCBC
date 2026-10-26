/**
 * Direct migration script for customs declarations
 * Runs the migration function directly through Fabric SDK
 */

const FabricService = require('./dist/services/fabricService').default;
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function main() {
    try {
        console.log('🔧 Starting customs declarations migration...');
        console.log('⏰ Timestamp:', new Date().toISOString());
        
        // Get Fabric service instance
        const fabricService = FabricService.getInstance();
        
        // Connect as Customs organization
        console.log('📡 Connecting to Fabric network as CustomsMSP...');
        await fabricService.connectAsOrg('CustomsMSP');
        console.log('✅ Connected successfully');
        
        // Run migration function
        console.log('🚀 Running MigrateCustomsDeclarations chaincode function...');
        const result = await fabricService.invokeChaincode('MigrateCustomsDeclarations', []);
        
        if (result.success) {
            // The migration returns a plain string, not JSON
            // Get the raw response
            const migrationMessage = result.data || 'Migration completed';
            console.log('\n✅ Migration completed successfully!');
            console.log(`   Result: ${migrationMessage}`);
            console.log(`   Transaction ID: ${result.txId}`);
        } else {
            console.error('\n❌ Migration failed:');
            console.error(result.error);
            process.exit(1);
        }
        
        // Verify by querying declarations
        console.log('\n🔍 Verifying migration by querying declarations...');
        const queryResult = await fabricService.queryChaincode('QueryAllCustomsDeclarations', []);
        
        if (queryResult.success) {
            const declarations = queryResult.data || [];
            console.log(`✅ Successfully queried ${declarations.length} declarations`);
            
            // Check if any still have null riskFactors
            const nullRiskFactors = declarations.filter(d => !d.riskFactors || !Array.isArray(d.riskFactors));
            if (nullRiskFactors.length > 0) {
                console.log(`⚠️  WARNING: ${nullRiskFactors.length} declarations still have null riskFactors`);
                nullRiskFactors.slice(0, 3).forEach(d => {
                    console.log(`   - ${d.declarationId}: riskFactors = ${d.riskFactors}`);
                });
            } else {
                console.log('✅ All declarations have valid riskFactors arrays');
            }
        } else {
            console.error('⚠️  Could not verify migration:', queryResult.error);
        }
        
        console.log('\n✨ Migration complete!');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Migration error:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
