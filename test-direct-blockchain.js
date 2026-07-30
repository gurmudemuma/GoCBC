// Test direct blockchain query via peer CLI
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function queryBlockchain() {
  try {
    console.log('\n=== Querying Blockchain Directly via Peer CLI ===\n');
    
    // Query shipment directly from peer
    const cmd = `docker exec cli peer chaincode query -C coffeechannel -n coffee -c '{"Args":["ReadShipment","SHIPMENT1784708105226"]}'`;
    
    const { stdout, stderr } = await execPromise(cmd);
    
    if (stderr) {
      console.log('STDERR:', stderr);
    }
    
    console.log('Blockchain Response:');
    console.log(stdout);
    
    try {
      const data = JSON.parse(stdout);
      console.log('\nParsed Data:');
      console.log(JSON.stringify(data, null, 2));
      console.log('\nKey Fields:');
      console.log('- Quantity:', data.quantity);
      console.log('- Grade:', data.grade);
      console.log('- BuyerID:', data.buyerId);
      console.log('- Origin:', data.origin);
    } catch (e) {
      console.log('Could not parse as JSON');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

queryBlockchain();
