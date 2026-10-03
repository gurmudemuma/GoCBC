#!/usr/bin/env node
/**
 * CouchDB to PostgreSQL Synchronization Service
 * Syncs all CouchDB state databases with PostgreSQL for querying
 */

const { Pool } = require('pg');
const axios = require('axios');

// PostgreSQL connection
const pgPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

// CouchDB instances
const couchDBInstances = [
  { name: 'ECTA', host: 'localhost', port: 5984, org: 'ecta' },
  { name: 'ECX', host: 'localhost', port: 6984, org: 'ecx' },
  { name: 'Banks', host: 'localhost', port: 7984, org: 'banks' },
  { name: 'NBE', host: 'localhost', port: 8984, org: 'nbe' },
  { name: 'Customs', host: 'localhost', port: 9984, org: 'customs' },
  { name: 'Shipping', host: 'localhost', port: 10984, org: 'shipping' }
];

const COUCHDB_USER = 'admin';
const COUCHDB_PASSWORD = 'adminpw';

// Create PostgreSQL tables for blockchain data
async function createSyncTables() {
  console.log('📊 Checking PostgreSQL sync tables...');
  
  try {
    // Check if tables already exist (from migrations)
    const tableCheck = await pgPool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'blockchain_shipments'
      ) as exists;
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Sync tables already exist (from migrations)');
      
      // Just ensure the UNIQUE constraint exists
      try {
        await pgPool.query(`
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'sync_status_couch_instance_database_name_key'
            ) THEN
              ALTER TABLE sync_status 
              ADD CONSTRAINT sync_status_couch_instance_database_name_key 
              UNIQUE (couch_instance, database_name);
            END IF;
          END $$;
        `);
      } catch (constraintError) {
        // Constraint might already exist, that's fine
      }
      
      return;
    }
    
    console.log('📊 Creating sync tables (migration not run yet)...');
    
    const createTablesSQL = `
    -- Blockchain Shipments (synced from CouchDB)
    CREATE TABLE IF NOT EXISTS blockchain_shipments (
      shipment_id VARCHAR(100) PRIMARY KEY,
      contract_id VARCHAR(100),
      exporter_id VARCHAR(100),
      buyer_id VARCHAR(100),
      origin VARCHAR(100),
      quantity DECIMAL(10,2),
      grade VARCHAR(50),
      ico_number VARCHAR(100),
      ecx_lot_number VARCHAR(100),
      ecx_lots TEXT[],
      documents TEXT[],
      status VARCHAR(50),
      channel VARCHAR(50),
      forex_rate DECIMAL(10,4),
      value_usd DECIMAL(15,2),
      eudr_compliant BOOLEAN,
      packaging_type VARCHAR(50),
      bag_weight DECIMAL(10,2),
      total_bags INTEGER,
      net_weight DECIMAL(10,2),
      gross_weight DECIMAL(10,2),
      insurance_policy VARCHAR(100),
      insurance_company VARCHAR(100),
      insurance_amount DECIMAL(15,2),
      transport_mode VARCHAR(20),
      shipping_line VARCHAR(255),
      bill_of_lading_no VARCHAR(100),
      vessel_name VARCHAR(255),
      container_number VARCHAR(100),
      departure_port VARCHAR(100),
      destination_port VARCHAR(100),
      estimated_arrival TIMESTAMP,
      actual_arrival TIMESTAMP,
      created_at TIMESTAMP,
      updated_at TIMESTAMP,
      synced_from VARCHAR(20),
      synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      raw_data JSONB
    );

    -- Blockchain Documents
    CREATE TABLE IF NOT EXISTS blockchain_documents (
      document_id VARCHAR(100) PRIMARY KEY,
      shipment_id VARCHAR(100),
      document_type VARCHAR(50),
      issuer VARCHAR(100),
      status VARCHAR(50),
      ipfs_hash VARCHAR(255),
      file_path TEXT,
      verified BOOLEAN,
      verification_date TIMESTAMP,
      created_at TIMESTAMP,
      synced_from VARCHAR(20),
      synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      raw_data JSONB
    );

    -- Blockchain Contracts
    CREATE TABLE IF NOT EXISTS blockchain_contracts (
      contract_id VARCHAR(100) PRIMARY KEY,
      exporter_id VARCHAR(100),
      buyer_id VARCHAR(100),
      contract_type VARCHAR(50),
      quantity DECIMAL(10,2),
      price_per_kg DECIMAL(10,2),
      total_value DECIMAL(15,2),
      payment_terms VARCHAR(100),
      status VARCHAR(50),
      created_at TIMESTAMP,
      synced_from VARCHAR(20),
      synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      raw_data JSONB
    );

    -- Blockchain Payments
    CREATE TABLE IF NOT EXISTS blockchain_payments (
      payment_id VARCHAR(100) PRIMARY KEY,
      shipment_id VARCHAR(100),
      lc_number VARCHAR(100),
      amount DECIMAL(15,2),
      currency VARCHAR(10),
      status VARCHAR(50),
      payment_date TIMESTAMP,
      bank_reference VARCHAR(100),
      created_at TIMESTAMP,
      synced_from VARCHAR(20),
      synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      raw_data JSONB
    );

    -- Blockchain Customs Clearances
    CREATE TABLE IF NOT EXISTS blockchain_customs (
      clearance_id VARCHAR(100) PRIMARY KEY,
      shipment_id VARCHAR(100),
      declaration_number VARCHAR(100),
      clearance_status VARCHAR(50),
      duty_paid DECIMAL(15,2),
      clearance_date TIMESTAMP,
      exit_point VARCHAR(100),
      created_at TIMESTAMP,
      synced_from VARCHAR(20),
      synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      raw_data JSONB
    );

    -- Sync Status Tracking
    CREATE TABLE IF NOT EXISTS sync_status (
      id SERIAL PRIMARY KEY,
      couch_instance VARCHAR(50) NOT NULL,
      database_name VARCHAR(100) NOT NULL,
      last_sync TIMESTAMP,
      last_seq VARCHAR(100),
      documents_synced INTEGER,
      status VARCHAR(50),
      error_message TEXT,
      UNIQUE(couch_instance, database_name)
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_blockchain_shipments_status ON blockchain_shipments(status);
    CREATE INDEX IF NOT EXISTS idx_blockchain_shipments_exporter ON blockchain_shipments(exporter_id);
    CREATE INDEX IF NOT EXISTS idx_blockchain_documents_shipment ON blockchain_documents(shipment_id);
    CREATE INDEX IF NOT EXISTS idx_blockchain_contracts_exporter ON blockchain_contracts(exporter_id);
    CREATE INDEX IF NOT EXISTS idx_blockchain_payments_shipment ON blockchain_payments(shipment_id);
    CREATE INDEX IF NOT EXISTS idx_blockchain_customs_shipment ON blockchain_customs(shipment_id);
  `;

  try {
    await pgPool.query(createTablesSQL);
    
    // Add unique constraint to sync_status if it doesn't exist
    try {
      await pgPool.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'sync_status_couch_instance_database_name_key'
          ) THEN
            ALTER TABLE sync_status 
            ADD CONSTRAINT sync_status_couch_instance_database_name_key 
            UNIQUE (couch_instance, database_name);
          END IF;
        END $$;
      `);
    } catch (constraintError) {
      console.log('⚠️  Constraint may already exist:', constraintError.message);
    }
    
    console.log('✅ Sync tables created successfully');
  } catch (error) {
    console.error('❌ Error creating sync tables:', error.message);
    throw error;
  }
  } catch (error) {
    console.error('❌ Error in createSyncTables:', error.message);
    throw error;
  }
}

// Get all databases from a CouchDB instance
async function getCouchDBDatabases(instance) {
  try {
    const response = await axios.get(
      `http://${instance.host}:${instance.port}/_all_dbs`,
      {
        auth: { username: COUCHDB_USER, password: COUCHDB_PASSWORD }
      }
    );
    
    // Filter out system databases
    return response.data.filter(db => 
      !db.startsWith('_') && db.includes('coffeechannel')
    );
  } catch (error) {
    console.error(`❌ Error getting databases from ${instance.name}:`, error.message);
    return [];
  }
}

// Get all documents from a CouchDB database
async function getCouchDBDocuments(instance, dbName) {
  try {
    const response = await axios.get(
      `http://${instance.host}:${instance.port}/${dbName}/_all_docs?include_docs=true`,
      {
        auth: { username: COUCHDB_USER, password: COUCHDB_PASSWORD }
      }
    );
    
    return response.data.rows
      .filter(row => !row.id.startsWith('_'))
      .map(row => row.doc);
  } catch (error) {
    console.error(`❌ Error getting documents from ${instance.name}/${dbName}:`, error.message);
    return [];
  }
}

// Sync a shipment document to PostgreSQL
async function syncShipment(doc, source) {
  const query = `
    INSERT INTO blockchain_shipments (
      shipment_id, contract_id, exporter_id, buyer_id, origin, quantity, grade,
      ico_number, ecx_lot_number, ecx_lots, documents, status, channel,
      forex_rate, value_usd, eudr_compliant, packaging_type, bag_weight,
      total_bags, net_weight, gross_weight, insurance_policy, insurance_company,
      insurance_amount, transport_mode, shipping_line, bill_of_lading_no,
      vessel_name, container_number, departure_port, destination_port,
      estimated_arrival, actual_arrival, created_at, updated_at, synced_from, raw_data
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
      $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
      $33, $34, $35, $36, $37
    )
    ON CONFLICT (shipment_id) DO UPDATE SET
      status = EXCLUDED.status,
      updated_at = EXCLUDED.updated_at,
      synced_at = CURRENT_TIMESTAMP,
      raw_data = EXCLUDED.raw_data
  `;

  const values = [
    doc.shipmentId || doc.ShipmentID,
    doc.contractId || doc.ContractID,
    doc.exporterId || doc.ExporterID,
    doc.buyerId || doc.BuyerID,
    doc.origin || doc.Origin,
    doc.quantity || doc.Quantity,
    doc.grade || doc.Grade,
    doc.icoNumber || doc.ICONumber,
    doc.ecxLotNumber || doc.ECXLotNumber,
    doc.ecxLots || doc.ECXLots,
    doc.documents || doc.Documents,
    doc.status || doc.Status,
    doc.channel || doc.Channel,
    doc.forexRate || doc.ForexRate,
    doc.valueUsd || doc.ValueUSD,
    doc.eudrCompliant || doc.EUDRCompliant,
    doc.packagingType || doc.PackagingType,
    doc.bagWeight || doc.BagWeight,
    doc.totalBags || doc.TotalBags,
    doc.netWeight || doc.NetWeight,
    doc.grossWeight || doc.GrossWeight,
    doc.insurancePolicy || doc.InsurancePolicy,
    doc.insuranceCompany || doc.InsuranceCompany,
    doc.insuranceAmount || doc.InsuranceAmount,
    doc.transportMode || doc.TransportMode,
    doc.shippingLine || doc.ShippingLine,
    doc.billOfLadingNo || doc.BillOfLadingNo,
    doc.vesselName || doc.VesselName,
    doc.containerNumber || doc.ContainerNumber,
    doc.departurePort || doc.DeparturePort,
    doc.destinationPort || doc.DestinationPort,
    doc.estimatedArrival || doc.EstimatedArrival,
    doc.actualArrival || doc.ActualArrival,
    doc.createdAt || doc.CreatedAt,
    doc.updatedAt || doc.UpdatedAt,
    source,
    JSON.stringify(doc)
  ];

  await pgPool.query(query, values);
}

// Sync a document to PostgreSQL
async function syncDocument(doc, source) {
  const query = `
    INSERT INTO blockchain_documents (
      document_id, shipment_id, document_type, issuer, status, ipfs_hash,
      file_path, verified, verification_date, created_at, synced_from, raw_data
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (document_id) DO UPDATE SET
      status = EXCLUDED.status,
      verified = EXCLUDED.verified,
      verification_date = EXCLUDED.verification_date,
      synced_at = CURRENT_TIMESTAMP,
      raw_data = EXCLUDED.raw_data
  `;

  const values = [
    doc.documentId || doc.DocumentID,
    doc.shipmentId || doc.ShipmentID,
    doc.documentType || doc.DocumentType,
    doc.issuer || doc.Issuer,
    doc.status || doc.Status,
    doc.ipfsHash || doc.IPFSHash,
    doc.filePath || doc.FilePath,
    doc.verified || doc.Verified || false,
    doc.verificationDate || doc.VerificationDate,
    doc.createdAt || doc.CreatedAt,
    source,
    JSON.stringify(doc)
  ];

  await pgPool.query(query, values);
}

// Determine document type and sync appropriately
async function syncDocumentByType(doc, source) {
  try {
    // Check document type based on fields
    if (doc.shipmentId || doc.ShipmentID) {
      await syncShipment(doc, source);
      return 'shipment';
    } else if (doc.documentId || doc.DocumentID) {
      await syncDocument(doc, source);
      return 'document';
    } else if (doc.contractId || doc.ContractID) {
      // Sync contract
      return 'contract';
    } else if (doc.paymentId || doc.PaymentID) {
      // Sync payment
      return 'payment';
    } else if (doc.clearanceId || doc.ClearanceID) {
      // Sync customs clearance
      return 'customs';
    }
    return 'unknown';
  } catch (error) {
    console.error(`⚠️  Error syncing document:`, error.message);
    return 'error';
  }
}

// Sync all data from all CouchDB instances
async function syncAll() {
  console.log('🔄 Starting CouchDB to PostgreSQL synchronization...\n');

  let totalSynced = 0;
  const stats = {
    shipments: 0,
    documents: 0,
    contracts: 0,
    payments: 0,
    customs: 0,
    unknown: 0,
    errors: 0
  };

  for (const instance of couchDBInstances) {
    console.log(`📡 Syncing from ${instance.name} (${instance.host}:${instance.port})...`);
    
    const databases = await getCouchDBDatabases(instance);
    console.log(`   Found ${databases.length} databases`);

    for (const dbName of databases) {
      console.log(`   📂 Processing ${dbName}...`);
      
      const documents = await getCouchDBDocuments(instance, dbName);
      console.log(`      Found ${documents.length} documents`);

      for (const doc of documents) {
        const type = await syncDocumentByType(doc, instance.org);
        if (stats[type] !== undefined) {
          stats[type]++;
        }
        totalSynced++;
      }

      // Update sync status
      try {
        await pgPool.query(`
          INSERT INTO sync_status (couch_instance, database_name, last_sync, documents_synced, status)
          VALUES ($1, $2, CURRENT_TIMESTAMP, $3, 'success')
          ON CONFLICT (couch_instance, database_name) 
          DO UPDATE SET 
            last_sync = CURRENT_TIMESTAMP,
            documents_synced = EXCLUDED.documents_synced,
            status = 'success'
        `, [instance.name, dbName, documents.length]);
      } catch (error) {
        console.error(`   ⚠️  Could not update sync status: ${error.message}`);
      }
    }
    
    console.log(`   ✅ ${instance.name} sync completed\n`);
  }

  console.log('═══════════════════════════════════════');
  console.log('📊 Synchronization Summary');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Total documents synced: ${totalSynced}`);
  console.log(`   📦 Shipments: ${stats.shipments}`);
  console.log(`   📄 Documents: ${stats.documents}`);
  console.log(`   📋 Contracts: ${stats.contracts}`);
  console.log(`   💰 Payments: ${stats.payments}`);
  console.log(`   🚢 Customs: ${stats.customs}`);
  console.log(`   ❓ Unknown: ${stats.unknown}`);
  console.log(`   ❌ Errors: ${stats.errors}`);
  console.log('═══════════════════════════════════════\n');
}

// Watch for changes (continuous sync)
async function watchChanges() {
  console.log('👀 Starting continuous sync mode...');
  console.log('   Syncing every 30 seconds...\n');

  setInterval(async () => {
    try {
      await syncAll();
    } catch (error) {
      console.error('❌ Sync error:', error.message);
    }
  }, 30000); // Sync every 30 seconds
}

// Main execution
async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  CouchDB → PostgreSQL Sync Service');
  console.log('  CECBS Blockchain Data Synchronization');
  console.log('═══════════════════════════════════════\n');

  try {
    // Create tables
    await createSyncTables();

    // Initial sync
    await syncAll();

    // If --watch flag is provided, start continuous sync
    if (process.argv.includes('--watch')) {
      await watchChanges();
    } else {
      console.log('✅ One-time sync completed. Use --watch flag for continuous sync.');
      await pgPool.end();
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
    await pgPool.end();
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down sync service...');
  await pgPool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Shutting down sync service...');
  await pgPool.end();
  process.exit(0);
});

// Run
main().catch(console.error);
