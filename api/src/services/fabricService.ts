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
  private static instance: FabricService | null = null;

  private gateway: Gateway | null = null;
  private network: Network | null = null;
  private contract: Contract | null = null;
  private wallet: Wallet | null = null;
  private connected: boolean = false;
  private db: sqlite3.Database | null = null;

  private constructor() {
    // Gateway is created lazily in connect() to ensure env vars are loaded first
    this.initializeDatabase();
  }

  public static getInstance(): FabricService {
    if (!FabricService.instance) {
      FabricService.instance = new FabricService();
    }
    return FabricService.instance;
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
        bank_branch_name TEXT,
        bank_branch_code TEXT,
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

  private connectCalled: boolean = false;

  // Normalize organization name to MSP ID
  private normalizeMspId(org: string): string {
    // First normalize: remove all non-alphanumeric chars and uppercase
    const normalized = org.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Then check against known patterns
    switch (normalized) {
      case 'NBE':
      case 'NBEMSP':
      case 'NATIONALBANKOFETHIOPIA':
        return 'NBEMSP';
      case 'ECTA':
      case 'ECTAMSP':
      case 'ETHIOPIANCOFFEEANDTEAAUTHORITY':  // with "AND"
      case 'ETHIOPIANCOFFEETEAAUTHORITY':     // without "AND" (& symbol removed)
        return 'ECTAMSP';
      case 'ECX':
      case 'ECXMSP':
      case 'ETHIOPIANCOMMODITYEXCHANGE':
        return 'ECXMSP';
      case 'BANKS':
      case 'BANKSMSP':
      case 'COMMERCIALBANKOFETHIOPIA':
        return 'BanksMSP';
      case 'CUSTOMS':
      case 'CUSTOMSMSP':
      case 'ETHIOPIANCUSTOMS':
        return 'CustomsMSP';
      case 'SHIPPING':
      case 'SHIPPINGMSP':
      case 'SHIPPINGLINES':
        return 'ShippingMSP';
      default:
        // If the normalized version ends with MSP, it's already in MSP format
        if (normalized.endsWith('MSP')) {
          return normalized;
        }
        // Otherwise add MSP suffix to normalized version
        return `${normalized}MSP`;
    }
  }

  public async connect(orgId?: string): Promise<void> {
    const requireFabric = process.env.FABRIC_REQUIRED === 'true';
    let targetOrg = orgId || process.env.FABRIC_MSP_ID || 'ECTAMSP';
    
    // Normalize the organization ID to proper MSP format
    targetOrg = this.normalizeMspId(targetOrg);

    // If explicitly requesting a different org, force reconnect
    const forcedReconnect = orgId && process.env.FABRIC_MSP_ID !== targetOrg;
    
    // Already connected to the same org and not forcing reconnect — no-op
    if (this.connected && process.env.FABRIC_MSP_ID === targetOrg && !forcedReconnect) {
      return;
    }

    if (process.env.FABRIC_ENABLED === 'false') {
      if (!this.connectCalled) {
        logger.warn('Fabric integration disabled by configuration; continuing without blockchain connectivity');
        this.connectCalled = true;
      }
      this.connected = false;
      return;
    }

    try {
      logger.info(`Connecting to Hyperledger Fabric network as ${targetOrg}...`);

      process.env.FABRIC_MSP_ID = targetOrg;

      const adminLabel = `admin-${targetOrg}`;

      // Load wallet
      this.wallet = await Wallets.newFileSystemWallet(
        process.env.FABRIC_WALLET_PATH || './wallet'
      );

      // Check if admin identity exists for the target org
      const adminIdentity = await this.wallet.get(adminLabel);
      if (!adminIdentity) {
        await this.importAdminIdentity(targetOrg, adminLabel);
      }

      // Build connection profile dynamically
      const ccp = this.buildConnectionProfile();

      const connectionOptions = {
        wallet: this.wallet,
        identity: adminLabel,
        discovery: {
          enabled: true,
          asLocalhost: process.env.FABRIC_AS_LOCALHOST !== 'false',
        },
      };

      if (!this.gateway) {
        this.gateway = new Gateway();
      } else {
        this.gateway.disconnect();
        this.gateway = new Gateway();
      }

      await this.gateway.connect(ccp, connectionOptions);

      this.network = await this.gateway.getNetwork(process.env.FABRIC_CHANNEL_NAME || 'coffeechannel');
      this.contract = this.network.getContract(process.env.FABRIC_CHAINCODE_NAME || 'coffee');

      this.connected = true;
      logger.info(`✅ Successfully connected to Hyperledger Fabric network as ${targetOrg}`);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Fabric network unavailable; continuing without blockchain connectivity. ${message}`);

      // Disconnect gateway to stop any background discovery/event threads
      try {
        if (this.gateway) {
          this.gateway.disconnect();
          this.gateway = null;
        }
      } catch (_) { /* ignore disconnect errors */ }

      this.connected = false;
      this.network = null;
      this.contract = null;

      if (requireFabric) {
        throw error;
      }
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

  public async connectAsOrg(orgId: string): Promise<void> {
    await this.connect(orgId);
  }

  private async importAdminIdentity(orgId?: string, label: string = 'admin'): Promise<void> {
    try {
      logger.info('Importing admin identity from cryptogen certificates...');

      let mspId = orgId || process.env.FABRIC_MSP_ID || 'ECTAMSP';
      
      // Normalize using the class method
      mspId = this.normalizeMspId(mspId);
      logger.info(`[FABRIC] Normalized MSP ID from "${orgId}" to "${mspId}"`);
      
      const orgName = mspId.replace('MSP', '').toLowerCase();
      logger.info(`[FABRIC] Using organization name: "${orgName}" for credential path`);

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

      await this.wallet!.put(label, x509Identity);
      logger.info(`✅ Admin identity imported successfully for ${mspId}`);

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
    // Retry logic for handling peer synchronization issues
    const maxRetries = 4; // Increased to 4 attempts
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check if contract exists, if not try to reconnect
        if (!this.contract || !this.network) {
          logger.warn('Contract or network is null, attempting to reconnect...');
          await this.connect();
        }
        
        if (!this.contract) {
          throw new Error('Not connected to Fabric network');
        }

        logger.info(`Invoking chaincode function: ${functionName} (attempt ${attempt}/${maxRetries})`, { args });

        // Submit transaction - Fabric SDK handles endorsement and commit
        const transaction = this.contract.createTransaction(functionName);
        const result = await transaction.submit(...args);
        const txId = transaction.getTransactionId();

        logger.info(`✅ Chaincode invoke successful: ${functionName} (attempt ${attempt})`, { txId });

        return {
          success: true,
          data: result.toString() ? JSON.parse(result.toString()) : null,
          txId,
        };

      } catch (error) {
        lastError = error;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to invoke chaincode function ${functionName} (attempt ${attempt}/${maxRetries}):`, error);
        
        // Check if this is a peer synchronization issue that warrants retry
        const isPeerSyncIssue = errorMessage.includes('Peer endorsements do not match') ||
                               errorMessage.includes('does not exist') ||
                               errorMessage.includes('not found') ||
                               errorMessage.includes('MVCC_READ_CONFLICT');
        
        if (isPeerSyncIssue && attempt < maxRetries) {
          // Wait with exponential backoff before retry
          const waitTime = 4000 * attempt; // 4s, 8s, 12s, 16s
          logger.warn(`🔄 Peer synchronization issue detected, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // If not a sync issue or last attempt, return failure
        if (attempt === maxRetries) {
          logger.error(`❌ All ${maxRetries} attempts failed for ${functionName}`);
        }
      }
    }
    
    // All retries failed
    return {
      success: false,
      error: lastError instanceof Error ? lastError.message : 'Unknown error',
    };
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
    eudrRequired: string,
    buyerBank?: string,
    exporterBank?: string,
    documentsJSON?: string
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
      buyerBank || '',
      exporterBank || '',
      documentsJSON || '[]',
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

  // Letter of Credit operations
  public async requestLC(
    lcId: string,
    contractId: string,
    exporterId: string,
    bankName: string,
    amount: string,
    currency: string,
    expiryDate: string
  ): Promise<ChaincodeResponse> {
    // First verify the exporter exists on blockchain
    logger.info(`Verifying exporter ${exporterId} exists before LC request...`);
    const exporterCheck = await this.getExporter(exporterId);
    
    if (!exporterCheck.success) {
      logger.error(`❌ Exporter ${exporterId} does not exist on blockchain`);
      return {
        success: false,
        error: `Exporter ${exporterId} is not registered on the blockchain. Please contact ECTA admin to register this exporter first.`,
      };
    }
    
    logger.info(`✅ Exporter ${exporterId} verified on blockchain, proceeding with LC request...`);
    
    return this.invokeChaincode('RequestLC', [
      lcId,
      contractId,
      exporterId,
      bankName,
      amount,
      currency,
      expiryDate,
    ]);
  }

  public async approveLC(
    lcId: string,
    issuingBank: string,
    advisingBank: string,
    beneficiary: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('ApproveLC', [
      lcId,
      issuingBank,
      advisingBank,
      beneficiary,
    ]);
  }

  public async issueLC(lcId: string, terms: string): Promise<ChaincodeResponse> {
    return this.invokeChaincode('IssueLC', [lcId, terms]);
  }

  public async queryAllLCs(): Promise<ChaincodeResponse> {
    // Try QueryAllLCs if available, otherwise use status-based query as workaround
    const allStatuses = ['REQUESTED', 'APPROVED', 'ISSUED', 'UTILIZED', 'EXPIRED'];
    
    try {
      // First try the proper function
      return await this.queryChaincode('QueryAllLCs', []);
    } catch (error: any) {
      // If function doesn't exist, query by all statuses and combine results
      logger.warn('QueryAllLCs not available, using workaround with status queries');
      
      const allLCs: any[] = [];
      
      for (const status of allStatuses) {
        try {
          const result = await this.queryChaincode('QueryLCsByStatus', [status]);
          if (result.success && result.data && Array.isArray(result.data)) {
            allLCs.push(...result.data);
          }
        } catch (statusError) {
          // Continue with other statuses
          logger.warn(`Failed to query LCs with status ${status}`);
        }
      }
      
      return {
        success: true,
        data: allLCs,
      };
    }
  }

  public async getLC(lcId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('ReadLC', [lcId]);
  }

  // Forex operations
  public async queryAllForex(): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryAllForex', []);
  }

  public async getForex(forexId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('ReadForex', [forexId]);
  }

  // Shipment operations
  public async createShipment(
    shipmentId: string,
    contractId: string,
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
    eudrCompliant: string,
    documentsJSON?: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('CreateShipment', [
      shipmentId,
      contractId,
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
      documentsJSON || '[]',
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

  public async submitPaymentDocuments(
    paymentId: string,
    documents: string[]
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('SubmitPaymentDocuments', [
      paymentId,
      JSON.stringify(documents),
    ]);
  }

  public async verifyPaymentDocuments(
    paymentId: string,
    verifiedBy: string,
    comments: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('VerifyPaymentDocuments', [
      paymentId,
      verifiedBy,
      comments,
    ]);
  }

  // ==================== PAYMENT METHOD-SPECIFIC FUNCTIONS ====================
  // Added June 26, 2026 for payment method differentiation

  public async initiatePayment(
    paymentId: string,
    contractId: string,
    exporterId: string,
    lcId: string,
    amount: string,
    currency: string,
    receivingBank: string,
    receivingBankBIC: string,
    beneficiaryName: string,
    beneficiaryAccount: string,
    paymentMethod: string // LC, CAD, TT_ADVANCE, TT_POST, ADVANCE
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('InitiatePayment', [
      paymentId,
      contractId,
      exporterId,
      lcId,
      amount,
      currency,
      receivingBank,
      receivingBankBIC,
      beneficiaryName,
      beneficiaryAccount,
      paymentMethod,
    ]);
  }

  public async releaseDocumentsToBuyer(
    paymentId: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('ReleaseDocumentsToBuyer', [paymentId]);
  }

  public async receiveAdvancePayment(
    paymentId: string,
    advancePercentage: string,
    amountReceived: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('ReceiveAdvancePayment', [
      paymentId,
      advancePercentage,
      amountReceived,
    ]);
  }

  public async receiveBalancePayment(
    paymentId: string,
    amountReceived: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('ReceiveBalancePayment', [
      paymentId,
      amountReceived,
    ]);
  }

  public async updatePaymentStatus(
    paymentId: string,
    newStatus: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('UpdatePaymentStatus', [paymentId, newStatus]);
  }

  public async getPaymentsByMethod(
    paymentMethod: string
  ): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryPaymentsByMethod', [paymentMethod]);
  }

  public async settlePayment(
    paymentId: string,
    exchangeRate: string,
    retentionRate: string,
    payingBank: string,
    payingBankBIC: string,
    swiftReference: string,
    nbeApprovalRef: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('SettlePayment', [
      paymentId,
      exchangeRate,
      retentionRate,
      payingBank,
      payingBankBIC,
      swiftReference,
      nbeApprovalRef,
    ]);
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

      await this.network.addBlockListener(
        async (event: any) => {
          logger.info('New block received:', {
            blockNumber: event.blockNumber,
          });
        },
        { type: 'filtered' }
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

      // fabric-network v2 exposes channel name via getChannel().getName() but
      // peer/orderer enumeration was removed. Return what we have from config.
      const channelName = process.env.FABRIC_CHANNEL_NAME || 'coffeechannel';
      const mspId = process.env.FABRIC_MSP_ID || 'ECTAMSP';
      const orgName = mspId.replace('MSP', '').toLowerCase();

      return {
        channelName,
        connectedOrg: mspId,
        peers: [`peer0.${orgName}.cecbs.et:${this.getPeerPort(orgName)}`],
        orderers: ['orderer.cecbs.et:7050'],
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

  // ==================== QUALITY INSPECTION OPERATIONS ====================

  public async requestInspection(
    inspectionId: string,
    shipmentId: string,
    contractId: string,
    exporterId: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('RequestInspection', [
      inspectionId,
      shipmentId,
      contractId,
      exporterId,
    ]);
  }

  public async performInspection(
    inspectionId: string,
    inspectorId: string,
    inspectorName: string,
    sampleSize: string,
    moistureContent: string,
    defectCount: string,
    beanSize: string,
    color: string,
    odor: string,
    fragrance: string,
    flavor: string,
    aftertaste: string,
    acidity: string,
    body: string,
    balance: string,
    uniformity: string,
    cleanCup: string,
    sweetness: string,
    overall: string,
    classification: string,
    pesticideTest: string,
    heavyMetalTest: string,
    mycotoxinTest: string,
    remarks: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('PerformInspection', [
      inspectionId,
      inspectorId,
      inspectorName,
      sampleSize,
      moistureContent,
      defectCount,
      beanSize,
      color,
      odor,
      fragrance,
      flavor,
      aftertaste,
      acidity,
      body,
      balance,
      uniformity,
      cleanCup,
      sweetness,
      overall,
      classification,
      pesticideTest,
      heavyMetalTest,
      mycotoxinTest,
      remarks,
    ]);
  }

  public async approveInspection(
    inspectionId: string,
    approvedBy: string,
    certificateNo: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('ApproveInspection', [
      inspectionId,
      approvedBy,
      certificateNo,
    ]);
  }

  public async issueExportPermit(
    inspectionId: string,
    exportPermitNo: string,
    issuedBy: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('IssueExportPermit', [
      inspectionId,
      exportPermitNo,
      issuedBy,
    ]);
  }

  public async rejectInspection(
    inspectionId: string,
    rejectedBy: string,
    rejectionReason: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('RejectInspection', [
      inspectionId,
      rejectedBy,
      rejectionReason,
    ]);
  }

  public async getInspection(inspectionId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('ReadInspection', [inspectionId]);
  }

  public async getAllInspections(): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryAllInspections', []);
  }

  public async getInspectionsByExporter(exporterId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryInspectionsByExporter', [exporterId]);
  }

  public async getInspectionsByStatus(status: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryInspectionsByStatus', [status]);
  }

  // ==================== PHYTOSANITARY CERTIFICATE OPERATIONS ====================

  public async issuePhytosanitaryCertificate(
    certificateID: string,
    shipmentID: string,
    exporterID: string,
    inspectorName: string,
    botanicalName: string,
    treatmentApplied: string,
    placeOfOrigin: string,
    pointOfEntry: string,
    quantity: string,
    packagingType: string,
    numberOfPackages: string,
    distinguishMarks: string,
    meansOfConveyance: string,
    issuedBy: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('IssuePhytosanitaryCertificate', [
      certificateID,
      shipmentID,
      exporterID,
      inspectorName,
      botanicalName,
      treatmentApplied,
      placeOfOrigin,
      pointOfEntry,
      quantity,
      packagingType,
      numberOfPackages,
      distinguishMarks,
      meansOfConveyance,
      issuedBy,
    ]);
  }

  public async getPhytosanitaryCertificate(certificateID: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('ReadPhytosanitaryCertificate', [certificateID]);
  }

  public async getPhytosanitaryCertificatesByShipment(shipmentID: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryPhytosanitaryCertificatesByShipment', [shipmentID]);
  }

  public async getPhytosanitaryCertificatesByExporter(exporterID: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryPhytosanitaryCertificatesByExporter', [exporterID]);
  }

  public async getAllPhytosanitaryCertificates(): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryAllPhytosanitaryCertificates', []);
  }

  public async revokePhytosanitaryCertificate(
    certificateID: string,
    revokedBy: string,
    reason: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('RevokePhytosanitaryCertificate', [
      certificateID,
      revokedBy,
      reason,
    ]);
  }

  // ==================== INSURANCE CERTIFICATE OPERATIONS ====================

  public async issueInsuranceCertificate(
    insuranceID: string,
    shipmentID: string,
    contractID: string,
    policyNumber: string,
    insuranceCompany: string,
    insuredValue: string,
    currency: string,
    coverageType: string,
    vesselName: string,
    voyageNumber: string,
    containerNumber: string,
    portOfLoading: string,
    portOfDischarge: string,
    goodsDescription: string,
    quantity: string,
    incoterm: string,
    claimsPayable: string,
    issuedBy: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('IssueInsuranceCertificate', [
      insuranceID,
      shipmentID,
      contractID,
      policyNumber,
      insuranceCompany,
      insuredValue,
      currency,
      coverageType,
      vesselName,
      voyageNumber,
      containerNumber,
      portOfLoading,
      portOfDischarge,
      goodsDescription,
      quantity,
      incoterm,
      claimsPayable,
      issuedBy,
    ]);
  }

  public async getInsuranceCertificate(insuranceID: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('ReadInsuranceCertificate', [insuranceID]);
  }

  public async getInsuranceCertificatesByShipment(shipmentID: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryInsuranceCertificatesByShipment', [shipmentID]);
  }

  public async getInsuranceCertificatesByContract(contractID: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryInsuranceCertificatesByContract', [contractID]);
  }

  public async getAllInsuranceCertificates(): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryAllInsuranceCertificates', []);
  }

  public async recordInsuranceClaim(
    insuranceID: string,
    claimReason: string,
    claimAmount: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('RecordInsuranceClaim', [
      insuranceID,
      claimReason,
      claimAmount,
    ]);
  }

  // ==================== ECX LOT RELEASE AUTOMATION ====================

  public async releaseECXLotForShipment(
    shipmentID: string,
    ecxLotNumber: string,
    releasedBy: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('ReleaseECXLotForShipment', [
      shipmentID,
      ecxLotNumber,
      releasedBy,
    ]);
  }

  public async getECXLotsByStatus(status: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryECXLotsByStatus', [status]);
  }

  // ==================== CUSTOMS DECLARATION OPERATIONS ====================

  public async submitCustomsDeclaration(
    declarationId: string,
    shipmentId: string,
    exporterId: string,
    declarationType: string,
    hsCode: string,
    quantity: string,
    value: string,
    currency: string,
    destination: string,
    portOfExit: string,
    eudrCompliant: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('SubmitCustomsDeclaration', [
      declarationId,
      shipmentId,
      exporterId,
      declarationType,
      hsCode,
      quantity,
      value,
      currency,
      destination,
      portOfExit,
      eudrCompliant,
    ]);
  }

  public async reviewCustomsDeclaration(
    declarationId: string,
    reviewedBy: string,
    inspectionType: string,
    inspectorNotes: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('ReviewCustomsDeclaration', [
      declarationId,
      reviewedBy,
      inspectionType,
      inspectorNotes,
    ]);
  }

  public async completeCustomsInspection(
    declarationId: string,
    inspectionResult: string,
    inspectorComments: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('CompleteCustomsInspection', [
      declarationId,
      inspectionResult,
      inspectorComments,
    ]);
  }

  public async clearCustomsDeclaration(
    declarationId: string,
    clearedBy: string,
    clearanceNumber: string,
    dutiesAmount: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('ClearCustomsDeclaration', [
      declarationId,
      clearedBy,
      clearanceNumber,
      dutiesAmount,
    ]);
  }

  public async rejectCustomsDeclaration(
    declarationId: string,
    rejectedBy: string,
    rejectionReason: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('RejectCustomsDeclaration', [
      declarationId,
      rejectedBy,
      rejectionReason,
    ]);
  }

  public async getCustomsDeclaration(declarationId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('ReadCustomsDeclaration', [declarationId]);
  }

  public async getAllCustomsDeclarations(): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryAllCustomsDeclarations', []);
  }

  public async getCustomsDeclarationsByExporter(exporterId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryCustomsDeclarationsByExporter', [exporterId]);
  }

  public async getCustomsDeclarationsByStatus(status: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryCustomsDeclarationsByStatus', [status]);
  }

  // ==================== PASS-THROUGH METHODS ====================
  // These provide a lower-level interface for routes that call chaincode directly

  public async submitTransaction(functionName: string, ...args: string[]): Promise<Buffer> {
    if (!this.contract) {
      throw new Error('Not connected to Fabric network');
    }
    return this.contract.submitTransaction(functionName, ...args);
  }

  public async evaluateTransaction(functionName: string, ...args: string[]): Promise<Buffer> {
    if (!this.contract) {
      throw new Error('Not connected to Fabric network');
    }
    return this.contract.evaluateTransaction(functionName, ...args);
  }
}

export default FabricService;

