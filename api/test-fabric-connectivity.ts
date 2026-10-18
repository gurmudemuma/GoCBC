import { FabricService } from './src/services/fabricService';
import { DatabaseService } from './src/services/databaseService';
import path from 'path';
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function test() {
  const fabricService = FabricService.getInstance();
  await fabricService.connect();
  
  console.log('Testing ReadAllExporters...');
  const exporters = await fabricService.getAllExporters();
  console.log('Exporters success:', exporters.success);
  if (!exporters.success) console.log('Error:', exporters.error);
  
  console.log('Testing ReadAllContracts...');
  const contracts = await fabricService.getAllContracts();
  console.log('Contracts success:', contracts.success);
  if (!contracts.success) console.log('Error:', contracts.error);

  console.log('Testing ReadAllShipments...');
  const shipments = await fabricService.getAllShipments();
  console.log('Shipments success:', shipments.success);
  if (!shipments.success) console.log('Error:', shipments.error);
  
  process.exit(0);
}

test();
