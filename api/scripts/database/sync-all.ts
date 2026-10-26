import { DatabaseService } from './src/services/databaseService';
import { FabricService } from './src/services/fabricService';
import path from 'path';
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function syncAll() {
  const db = DatabaseService.getInstance();
  const fabricService = FabricService.getInstance();
  await fabricService.connect();

  console.log('--- SYNCING EXPORTERS ---');
  const applications = await db.all("SELECT * FROM exporter_applications WHERE status = 'approved'");
  console.log(`Found ${applications.length} approved applications in DB`);
  for (const app of applications) {
    console.log(`Checking exporter: ${app.exporter_id}`);
    const check = await fabricService.getExporter(app.exporter_id);
    if (!check.success) {
      console.log(`Registering exporter ${app.exporter_id} on blockchain...`);
      const result = await fabricService.registerExporter(
        app.exporter_id,
        app.company_name,
        app.ecta_license_number || app.license_number || 'ECTA-LIC-2026-001',
        app.exporter_type || 'company',
        (app.capital_requirement || 20000000).toString(),
        app.professional_taster || 'Unknown',
        app.taster_certificate || 'Unknown',
        app.laboratory_certificate_number || 'N/A',
        app.license_expiry_date || '2030-01-01'
      );
      if (result.success) {
        console.log(`✅ Synced exporter ${app.exporter_id}`);
      } else {
        console.error(`❌ Failed to sync exporter ${app.exporter_id}:`, result.error);
      }
    } else {
      console.log(`Already exists: ${app.exporter_id}`);
    }
  }

  // Force sync exp001 if not found in applications but needed by contracts
  console.log('\n--- VERIFYING exp001 ---');
  const exp001Check = await fabricService.getExporter('exp001');
  if (!exp001Check.success) {
    console.log('exp001 missing from blockchain, registering manually...');
    const result = await fabricService.registerExporter(
      'exp001',
      'Ethiopian Coffee Exporter Ltd',
      'ECTA-LIC-2026-001',
      'company',
      '50000000',
      'Certified Taster',
      'CERT-12345',
      'LAB-67890',
      '2030-12-31'
    );
    if (result.success) {
      console.log('✅ Registered exp001 manually');
    } else {
      console.error('❌ Failed to register exp001:', result.error);
    }
  } else {
    console.log('exp001 already exists on blockchain');
  }

  console.log('\n--- SYNCING CONTRACTS ---');
  const contracts = await db.all('SELECT * FROM contracts');
  for (const c of contracts) {
    console.log(`Syncing contract: ${c.contract_id}`);
    const check = await fabricService.getSalesContract(c.contract_id);
    if (!check.success) {
      const result = await fabricService.invokeChaincode('RegisterSalesContractWithPaymentMethod', [
        c.contract_id,
        c.exporter_id,
        c.buyer_id,
        c.buyer_id, // buyerName
        c.buyer_country,
        c.coffee_type,
        c.quantity.toString(),
        c.price_per_kg.toString(),
        c.currency,
        c.eudr_required.toString(),
        c.buyer_bank || '',
        c.exporter_bank || '',
        c.payment_method || 'LC',
        '[]' // documents
      ]);
      if (result.success) {
        console.log(`✅ Synced contract ${c.contract_id}`);
        await db.run('UPDATE contracts SET blockchain_tx_id = $1, blockchain_synced = true WHERE contract_id = $2', [result.txId, c.contract_id]);
      } else {
        console.error(`❌ Failed to sync contract ${c.contract_id}:`, result.error);
      }
    } else {
      console.log(`Already exists: ${c.contract_id}`);
      await db.run('UPDATE contracts SET blockchain_synced = true WHERE contract_id = $2', [c.contract_id]);
    }
  }

  process.exit(0);
}

syncAll().catch(err => {
  console.error('Fatal error during sync:', err);
  process.exit(1);
});
