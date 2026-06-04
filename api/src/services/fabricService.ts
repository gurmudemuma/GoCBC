// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Hyperledger Fabric Service

import { Gateway, Network, Contract, Wallet, Wallets } from 'fabric-network';
import * as fs from 'fs';
import * as path from 'path';
import * as sqlite3 from 'sqlite3';
import { logger } from '../utils/logger';

export interface ChaincodeResponse {
  success: boolean;
  data?: any;
  error?: string;
  txId?: string;
}

export class FabricService {
  private gateway: Gateway | null = null;
  private network: Network | null = null;
  private contract: Contract | null = null;
  private wallet: Wallet | null = null;
  private connected: boolean = false;
  private db: sqlite3.Database | null = null;

  constructor() {
    this.gateway = new Gateway();
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    try {
      const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'cecbs.db');
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          logger.error('Failed to connect to SQLite database:', err);
        } else {
          logger.info('✅ Connected to SQLite database');
          this.createTables();
        }
      });
    } catch (error) {
      logger.error('Failed to initialize database:', error);
    }
  }

  private createTables(): void {
    if (!this.db) return;

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS exporter_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id TEXT UNIQUE NOT NULL,
        company_name TEXT NOT NULL,
        tin_number TEXT NOT NULL,
        business_license_number TEXT NOT NULL,
        registration_date TEXT,
        exporter_type TEXT DEFAULT 'private',
        capital_requirement TEXT NOT NULL,
        professional_taster TEXT NOT NULL,
        taster_certificate TEXT NOT NULL,
        laboratory_facility TEXT DEFAULT '',
        laboratory_certificate_number TEXT,
        contact_person TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        region TEXT,
        bank_name TEXT,
        bank_account_number TEXT,
        comments TEXT,
        status TEXT DEFAULT 'pending',
        submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
        approved_at TEXT,
        rejected_at TEXT,
        rejection_reason TEXT,
        exporter_id TEXT,
        ecta_license_number TEXT,
        license_expiry_date TEXT,
        reviewed_by TEXT
      );
    `;

    this.db.run(createTableSQL, (err) => {
      if (err) {
        logger.error('Failed to create exporter_applications table:', err);
      } else {
        logger.info('✅ Exporter applications table ready');
        
        // Create indexes
        this.db?.run('CREATE INDEX IF NOT EXISTS idx_exporter_applications_status ON exporter_applications(status)');
        this.db?.run('CREATE INDEX IF NOT EXISTS idx_exporter_applications_email ON exporter_applications(email)');
        this.db?.run('CREATE INDEX IF NOT EXISTS idx_exporter_applications_submitted ON exporter_applications(submitted_at)');
      }
    });
  }

  public async connect(): Promise<void> {
    try {
      logger.info('Connecting to Hyperledger Fabric network...');

      // Load wallet
      this.wallet = await Wallets.newFileSystemWallet(
        process.env.FABRIC_WALLET_PATH || './wallet'
      );

      // Check if admin identity exists
      const adminIdentity = await this.wallet.get('admin');
      if (!adminIdentity) {
        await this.importAdminIdentity();
      }

      // Build connection profile dynamically
      const ccp = this.buildConnectionProfile();

      // Gateway connection options with discovery enabled for multi-org endorsement
      const connectionOptions = {
        wallet: this.wallet,
        identity: 'admin',
        discovery: { enabled: true, asLocalhost: true },
        eventHandlerOptions: {
          commitTimeout: 300,
        },
      };

      // Connect to gateway
      await this.gateway.connect(ccp, connectionOptions);

      // Get network and contract
      this.network = await this.gateway.getNetwork(process.env.FABRIC_CHANNEL_NAME || 'coffeechannel');
      this.contract = this.network.getContract(process.env.FABRIC_CHAINCODE_NAME || 'coffee');

      this.connected = true;
      logger.info('✅ Successfully connected to Hyperledger Fabric network');

    } catch (error) {
      logger.error('Failed to connect to Fabric network:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.gateway) {
      this.gateway.disconnect();
      this.connected = false;
      logger.info('Disconnected from Hyperledger Fabric network');
    }
    
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          logger.error('Error closing database:', err);
        } else {
          logger.info('Database connection closed');
        }
      });
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }

  private async importAdminIdentity(): Promise<void> {
    try {
      logger.info('Importing admin identity from cryptogen certificates...');

      const mspId = process.env.FABRIC_MSP_ID || 'ECTAMSP';
      const orgName = mspId.replace('MSP', '').toLowerCase(); // ECTAMSP -> ecta
      
      // Path to admin credentials
      const credPath = path.join(
        __dirname,
        '..',
        '..',
        '..',
        'blockchain',
        'organizations',
        'peerOrganizations',
        `${orgName}.cecbs.et`,
        'users',
        `Admin@${orgName}.cecbs.et`,
        'msp'
      );

      // Read certificate
      const certPath = path.join(credPath, 'signcerts');
      const certFiles = fs.readdirSync(certPath);
      if (certFiles.length === 0) {
        throw new Error(`No certificate found in ${certPath}`);
      }
      const certificate = fs.readFileSync(path.join(certPath, certFiles[0]), 'utf8');

      // Read private key
      const keyPath = path.join(credPath, 'keystore');
      const keyFiles = fs.readdirSync(keyPath);
      if (keyFiles.length === 0) {
        throw new Error(`No private key found in ${keyPath}`);
      }
      const privateKey = fs.readFileSync(path.join(keyPath, keyFiles[0]), 'utf8');

      // Create identity
      const x509Identity = {
        credentials: {
          certificate,
          privateKey,
        },
        mspId,
        type: 'X.509',
      };

      await this.wallet!.put('admin', x509Identity);
      logger.info('✅ Admin identity imported successfully');

    } catch (error) {
      logger.error('Failed to import admin identity:', error);
      throw error;
    }
  }

  private buildConnectionProfile(): any {
    const mspId = process.env.FABRIC_MSP_ID || 'ECTAMSP';
    const orgName = mspId.replace('MSP', '').toLowerCase();
    const channelName = process.env.FABRIC_CHANNEL_NAME || 'coffeechannel';
    
    // Build connection profile dynamically
    return {
      name: 'cecbs-network',
      version: '1.0.0',
      client: {
        organization: orgName,
        connection: {
          timeout: {
            peer: {
              endorser: '300',
            },
            orderer: '300',
          },
        },
      },
      channels: {
        [channelName]: {
          orderers: ['orderer.cecbs.et'],
          peers: {
            [`peer0.${orgName}.cecbs.et`]: {
              endorsingPeer: true,
              chaincodeQuery: true,
              ledgerQuery: true,
              eventSource: true,
            },
          },
        },
      },
      organizations: {
        [orgName]: {
          mspid: mspId,
          peers: [`peer0.${orgName}.cecbs.et`],
          certificateAuthorities: [],
        },
      },
      peers: {
        [`peer0.${orgName}.cecbs.et`]: {
          url: `grpcs://localhost:${this.getPeerPort(orgName)}`,
          tlsCACerts: {
            path: path.join(
              __dirname,
              '..',
              '..',
              '..',
              'blockchain',
              'organizations',
              'peerOrganizations',
              `${orgName}.cecbs.et`,
              'peers',
              `peer0.${orgName}.cecbs.et`,
              'tls',
              'ca.crt'
            ),
          },
          grpcOptions: {
            'ssl-target-name-override': `peer0.${orgName}.cecbs.et`,
            hostnameOverride: `peer0.${orgName}.cecbs.et`,
            'grpc.keepalive_time_ms': 120000,
            'grpc.keepalive_timeout_ms': 20000,
            'grpc.keepalive_permit_without_calls': 1,
            'grpc.http2.min_time_between_pings_ms': 120000,
            'grpc.http2.max_pings_without_data': 0,
          },
        },
      },
      orderers: {
        'orderer.cecbs.et': {
          url: 'grpcs://localhost:7050',
          tlsCACerts: {
            path: path.join(
              __dirname,
              '..',
              '..',
              '..',
              'blockchain',
              'organizations',
              'ordererOrganizations',
              'cecbs.et',
              'orderers',
              'orderer.cecbs.et',
              'tls',
              'ca.crt'
            ),
          },
          grpcOptions: {
            'ssl-target-name-override': 'orderer.cecbs.et',
            hostnameOverride: 'orderer.cecbs.et',
            'grpc.keepalive_time_ms': 120000,
            'grpc.keepalive_timeout_ms': 20000,
          },
        },
      },
    };
  }

  private getPeerPort(orgName: string): number {
    const portMap: { [key: string]: number } = {
      ecta: 7051,
      ecx: 8051,
      banks: 9051,
      nbe: 10051,
      customs: 11051,
      shipping: 12051,
    };
    return portMap[orgName] || 7051;
  }

  // Chaincode invoke operations
  public async invokeChaincode(functionName: string, args: string[]): Promise<ChaincodeResponse> {
    try {
      // Check if contract exists, if not try to reconnect
      if (!this.contract || !this.network) {
        logger.warn('Contract or network is null, attempting to reconnect...');
        await this.connect();
      }
      
      if (!this.contract) {
        throw new Error('Not connected to Fabric network');
      }

      logger.info(`Invoking chaincode function: ${functionName}`, { args });

      // Create transaction and submit
      const transaction = this.contract.createTransaction(functionName);
      const result = await transaction.submit(...args);
      const txId = transaction.getTransactionId();

      logger.info(`✅ Chaincode invoke successful: ${functionName}`, { txId });

      return {
        success: true,
        data: result.toString() ? JSON.parse(result.toString()) : null,
        txId,
      };

    } catch (error) {
      logger.error(`Failed to invoke chaincode function ${functionName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Chaincode query operations
  public async queryChaincode(functionName: string, args: string[]): Promise<ChaincodeResponse> {
    try {
      // Check if contract exists, if not try to reconnect
      if (!this.contract || !this.network) {
        logger.warn('Contract or network is null, attempting to reconnect...');
        await this.connect();
      }
      
      if (!this.contract) {
        throw new Error('Not connected to Fabric network');
      }

      logger.info(`Querying chaincode function: ${functionName}`, { args });

      const result = await this.contract.evaluateTransaction(functionName, ...args);
      
      logger.info(`✅ Chaincode query successful: ${functionName}`);

      return {
        success: true,
        data: result.toString() ? JSON.parse(result.toString()) : null,
      };

    } catch (error) {
      logger.error(`Failed to query chaincode function ${functionName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Exporter operations
  public async registerExporter(
    exporterId: string,
    companyName: string,
    ectaLicenseNumber: string,
    exporterType: string,
    capitalRequirement: string,
    professionalTaster: string,
    tasterCertificate: string,
    laboratoryCertificateNumber: string,
    licenseExpiryDate: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('RegisterExporter', [
      exporterId,
      companyName,
      ectaLicenseNumber,
      exporterType,
      capitalRequirement,
      professionalTaster,
      tasterCertificate,
      laboratoryCertificateNumber,
      licenseExpiryDate,
    ]);
  }

  public async getExporter(exporterId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('ReadExporter', [exporterId]);
  }

  public async getAllExporters(): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryAllExporters', []);
  }

  public async updateExporterLaboratory(exporterId: string, certified: boolean): Promise<ChaincodeResponse> {
    return this.invokeChaincode('UpdateExporterLaboratory', [exporterId, certified.toString()]);
  }

  public async updateExporterStatus(exporterId: string, status: string): Promise<ChaincodeResponse> {
    return this.invokeChaincode('UpdateExporterStatus', [exporterId, status]);
  }

  // Sales contract operations
  public async registerSalesContract(
    contractId: string,
    exporterId: string,
    buyerId: string,
    buyerCountry: string,
    coffeeType: string,
    quantity: string,
    pricePerKg: string,
    currency: string,
    eudrRequired: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('RegisterSalesContract', [
      contractId,
      exporterId,
      buyerId,
      buyerCountry,
      coffeeType,
      quantity,
      pricePerKg,
      currency,
      eudrRequired,
    ]);
  }

  public async getSalesContract(contractId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('ReadSalesContract', [contractId]);
  }

  public async getAllContracts(): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryAllContracts', []);
  }

  public async approveSalesContract(contractId: string): Promise<ChaincodeResponse> {
    return this.invokeChaincode('ApproveSalesContract', [contractId]);
  }

  // Shipment operations
  public async createShipment(
    shipmentId: string,
    exporterId: string,
    buyerId: string,
    origin: string,
    quantity: string,
    grade: string,
    icoNumber: string,
    ecxLotNumber: string,
    channel: string,
    forexRate: string,
    valueUsd: string,
    eudrCompliant: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('CreateShipment', [
      shipmentId,
      exporterId,
      buyerId,
      origin,
      quantity,
      grade,
      icoNumber,
      ecxLotNumber,
      channel,
      forexRate,
      valueUsd,
      eudrCompliant,
    ]);
  }

  public async getShipment(shipmentId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('ReadShipment', [shipmentId]);
  }

  public async getAllShipments(): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryAllAssets', []);
  }

  public async updateShipmentStatus(shipmentId: string, status: string): Promise<ChaincodeResponse> {
    return this.invokeChaincode('UpdateShipmentStatus', [shipmentId, status]);
  }

  public async getShipmentHistory(shipmentId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('GetShipmentHistory', [shipmentId]);
  }

  // Advanced query operations
  public async getShipmentsByExporter(exporterId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryShipmentsByExporter', [exporterId]);
  }

  public async getEUDRCompliantShipments(): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryEUDRCompliantShipments', []);
  }

  public async getCompleteTraceability(shipmentId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('GetCompleteTraceability', [shipmentId]);
  }

  // Exporter-specific query operations for Exporter Portal
  public async getContractsByExporter(exporterId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryContractsByExporter', [exporterId]);
  }

  public async getForexByExporter(exporterId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryForexByExporter', [exporterId]);
  }

  public async getLCsByExporter(exporterId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryLCsByExporter', [exporterId]);
  }

  public async getPaymentsByExporter(exporterId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryPaymentsByExporter', [exporterId]);
  }

  public async getForexByContract(contractId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('ReadForexAllocation', [contractId]);
  }

  public async getLCByContract(contractId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('ReadLC', [contractId]);
  }

  public async getPaymentsByContract(contractId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryPaymentsByContract', [contractId]);
  }

  public async getShipmentsByContract(contractId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryShipmentsByContract', [contractId]);
  }

  // Event listening
  public async startEventListener(): Promise<void> {
    try {
      if (!this.network) {
        throw new Error('Not connected to Fabric network');
      }

      const listener = await this.network.addBlockListener(
        'block-listener',
        (event) => {
          logger.info('New block received:', {
            blockNumber: event.blockNumber,
            transactionCount: event.blockData.data.data.length,
          });
          
          // Process transactions in the block
          event.blockData.data.data.forEach((transaction: any, index: number) => {
            logger.info(`Transaction ${index}:`, {
              txId: transaction.payload.header.channel_header.tx_id,
              timestamp: new Date(transaction.payload.header.channel_header.timestamp).toISOString(),
            });
          });
        },
        {
          type: 'full',
        }
      );

      logger.info('✅ Block event listener started');

    } catch (error) {
      logger.error('Failed to start event listener:', error);
    }
  }

  // Network information
  public async getNetworkInfo(): Promise<any> {
    try {
      if (!this.network) {
        throw new Error('Not connected to Fabric network');
      }

      const channel = this.network.getChannel();
      const peers = channel.getPeers();
      const orderers = channel.getOrderers();

      return {
        channelName: channel.getName(),
        peers: peers.map(peer => ({
          name: peer.getName(),
          url: peer.getUrl(),
        })),
        orderers: orderers.map(orderer => ({
          name: orderer.getName(),
          url: orderer.getUrl(),
        })),
      };

    } catch (error) {
      logger.error('Failed to get network info:', error);
      throw error;
    }
  }

  // Generic query methods for exporters route compatibility
  public async queryContracts(params: { exporterId: string }): Promise<ChaincodeResponse> {
    return this.getContractsByExporter(params.exporterId);
  }

  public async queryForexAllocations(params: { exporterId: string }): Promise<ChaincodeResponse> {
    return this.getForexByExporter(params.exporterId);
  }

  public async queryLettersOfCredit(params: { exporterId: string }): Promise<ChaincodeResponse> {
    return this.getLCsByExporter(params.exporterId);
  }

  public async queryPayments(params: { exporterId: string }): Promise<ChaincodeResponse> {
    return this.getPaymentsByExporter(params.exporterId);
  }

  public async queryShipments(params: { exporterId: string }): Promise<ChaincodeResponse> {
    return this.getShipmentsByExporter(params.exporterId);
  }
}

export default FabricService;
