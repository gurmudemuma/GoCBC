/**
 * Analyze customs declarations to identify fields with null/empty values
 */

const FabricService = require('./dist/services/fabricService').default;
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function main() {
    try {
        console.log('🔍 Analyzing customs declarations fields...');
        
        const fabricService = FabricService.getInstance();
        await fabricService.connectAsOrg('CustomsMSP');
        
        const result = await fabricService.queryChaincode('QueryAllCustomsDeclarations', []);
        
        if (result.success) {
            const declarations = result.data || [];
            console.log(`\n📊 Analyzing ${declarations.length} declarations...\n`);
            
            if (declarations.length === 0) {
                console.log('No declarations found.');
                process.exit(0);
            }
            
            // Get all fields from the first declaration
            const sampleDeclaration = declarations[0];
            const allFields = Object.keys(sampleDeclaration);
            
            console.log('All fields:', allFields.join(', '), '\n');
            
            // Analyze each field
            const fieldStats = {};
            
            allFields.forEach(field => {
                let nullCount = 0;
                let emptyStringCount = 0;
                let emptyArrayCount = 0;
                let zeroCount = 0;
                let populatedCount = 0;
                
                declarations.forEach(d => {
                    const value = d[field];
                    
                    if (value === null || value === undefined) {
                        nullCount++;
                    } else if (value === '') {
                        emptyStringCount++;
                    } else if (Array.isArray(value) && value.length === 0) {
                        emptyArrayCount++;
                    } else if (value === 0 || value === '0') {
                        zeroCount++;
                    } else {
                        populatedCount++;
                    }
                });
                
                fieldStats[field] = {
                    nullCount,
                    emptyStringCount,
                    emptyArrayCount,
                    zeroCount,
                    populatedCount,
                    total: declarations.length
                };
            });
            
            // Print statistics
            console.log('Field Analysis:');
            console.log('=' .repeat(80));
            
            Object.entries(fieldStats).forEach(([field, stats]) => {
                const emptyTotal = stats.nullCount + stats.emptyStringCount + stats.emptyArrayCount;
                const percentEmpty = ((emptyTotal / stats.total) * 100).toFixed(1);
                
                if (emptyTotal > 0) {
                    console.log(`\n${field}:`);
                    if (stats.nullCount > 0) console.log(`  - null/undefined: ${stats.nullCount}`);
                    if (stats.emptyStringCount > 0) console.log(`  - empty string: ${stats.emptyStringCount}`);
                    if (stats.emptyArrayCount > 0) console.log(`  - empty array: ${stats.emptyArrayCount}`);
                    if (stats.zeroCount > 0) console.log(`  - zero: ${stats.zeroCount}`);
                    console.log(`  - populated: ${stats.populatedCount}`);
                    console.log(`  - ${percentEmpty}% empty`);
                }
            });
            
            // Show sample declaration
            console.log('\n\n📄 Sample Declaration:');
            console.log('=' .repeat(80));
            console.log(JSON.stringify(sampleDeclaration, null, 2));
            
        } else {
            console.error('❌ Query failed:', result.error);
            process.exit(1);
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Error:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
