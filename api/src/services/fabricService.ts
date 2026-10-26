// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Hyperledger Fabric Service

import { Gateway, Network, Contract, Wallet } from 'fabric-network';
import { AsyncLocalStorage } from 'async_hooks';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';
import { getFabricCertificateTrustStatus } from '../utils/fabricCertificateTrust';
import { openSecureFabricWallet } from '../utils/fabricWalletStorage';
import { DatabaseService } from './databaseService';

// fabric-network depends on fabric-protos; use the same protocol definitions to
// decode QSCC responses instead of guessing transaction or block metadata.
const fabricProtos: any = require('fabric-protos');

export interface ChaincodeResponse {
  success: boolean;
  data?: any;
  error?: string;
  txId?: string;
  transactionId?: string;  // ✅ Added for compatibility with routes
  signatureId?: string;  // ✅ Added for blockchain signature tracking
  ledgerDetails?: LedgerTransactionDetails | null;
  endorsers?: Array<{
    mspId: string;
    endpoint: string;
  }>;
  consensus?: {
    protocol: string;
    committed: boolean | null;
    validationStatus?: string;
    outcome?: 'VALID' | 'INVALID' | 'UNKNOWN' | 'REJECTED_BEFORE_ORDERING';
  };
  endorsement?: {
    policyStatus?: 'NOT_RESOLVED' | 'RESOLVED';
    policySource?: string;
    requestedOrganizations: string[];
    actualOrganizations?: string[];
    verifiedFromLedger: boolean;
    allRequestedOrganizationsEndorsed?: boolean;
  };
}

export interface LedgerTransactionDetails {
  txId: string;
  creator: {
    mspId: string;
    identity: string;
    certificateSubject: string | null;
    signatureValid: boolean | null;
    certificateTrustStatus: string;
  };
  endorsers: Array<{
    mspId: string;
    identity: string;
    signatureValid: boolean | null;
    certificateTrustStatus: string;
    endpoint?: string;
    certificateDetails?: {
      commonName: string;
      organization: string;
      organizationalUnit: string;
      issuer: string;
    };
  }>;
  timestamp: string | null;
  validationCode: number;
  validationStatus: string;
  blockNumber: number | null;
  blockHash: string | null;
  channelId: string;
  chaincodeName: string | null;
  chaincodeFunction: string | null;
  args: string[];
}

interface FabricLedgerInfo {
  height: number;
  transactionCount: number;
  validTransactionCount: number;
  invalidTransactionCount: number;
  unknownTransactionCount: number;
  currentBlockHash: string;
  previousBlockHash: string;
}

const CONSORTIUM_PEER_MSPS = ['ECTAMSP', 'ECXMSP', 'BanksMSP', 'NBEMSP', 'CustomsMSP', 'ShippingMSP'];

export class FabricService {
  private static instance: FabricService | null = null;

  private gateway: Gateway | null = null;
  private network: Network | null = null;
  private contract: Contract | null = null;
  private wallet: Wallet | null = null;
  private connected: boolean = false;
  private currentMspId: string | null = null; // Track the actual connected MSP ID
  private currentIdentityLabel: string | null = null; // Track the actual signing identity
  private readonly requestContext = new AsyncLocalStorage<{ mspId?: string; identityLabel?: string }>();
  private readonly gatewayLockContext = new AsyncLocalStorage<boolean>();
  private gatewayQueue: Promise<void> = Promise.resolve();
  private ledgerInfoCache: { expiresAt: number; value: FabricLedgerInfo } | null = null;
  private ledgerInfoPromise: Promise<FabricLedgerInfo> | null = null;

  // MSP mapping for different roles
  private MSP_ROLE_MAPPING: Record<string, string> = {
    'ECTA': 'ECTAMSP',
    'ECTA_ADMIN': 'ECTAMSP',
    'ECX': 'ECXMSP',
    'ECX_ADMIN': 'ECXMSP',
    'NBE': 'NBEMSP',
    'NBE_ADMIN': 'NBEMSP',
    'BANKS': 'BanksMSP',
    'BANK_ADMIN': 'BanksMSP',
    'CUSTOMS': 'CustomsMSP',
    'CUSTOMS_ADMIN': 'CustomsMSP',
    'SHIPPING': 'ShippingMSP',
    'SHIPPING_ADMIN': 'ShippingMSP',
    'EXPORTER': 'ECTAMSP', // Exporters use ECTA MSP
    'ADMIN': 'ECTAMSP',
  };

  /**
   * Get MSP ID from role
   */
  public getMspFromRole(role: string): string {
    const normalized = role.toUpperCase().replace(/[^A-Z_]/g, '');
    return this.MSP_ROLE_MAPPING[normalized] || 'ECTAMSP';
  }

  private constructor() {
    // Gateway is created lazily in connect() to ensure env vars are loaded first
  }

  public static getInstance(): FabricService {
    if (!FabricService.instance) {
      FabricService.instance = new FabricService();
    }
    return FabricService.instance;
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
      case 'EXPORTER':
      case 'EXPORTERMSP':
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

  private async withGatewayLock<T>(operation: () => Promise<T>): Promise<T> {
    // Gateway operations may call other Gateway-backed helpers (for example,
    // commit verification reads QSCC while an invoke still holds the lock).
    // Reuse the current operation's lock rather than deadlocking on the queue.
    if (this.gatewayLockContext.getStore()) return operation();

    const previous = this.gatewayQueue;
    let release!: () => void;
    this.gatewayQueue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      return await this.gatewayLockContext.run(true, operation);
    } finally {
      release();
    }
  }

  /** Establish an isolated MSP context for the lifetime of one Express request. */
  public runWithRequestContext(next: () => void): void {
    this.requestContext.run({}, next);
  }

  /** Set the transaction identity for the current request without mutating global state. */
  public setRequestMspId(orgId: string): void {
    const context = this.requestContext.getStore();
    if (context) context.mspId = this.normalizeMspId(orgId);
  }

  /** Return the authenticated request's signing MSP, if this is an HTTP request. */
  public getRequestMspId(): string | null {
    return this.requestContext.getStore()?.mspId || null;
  }

  /** Select the CA-issued wallet identity assigned to this authenticated user. */
  public setRequestIdentity(userId: string | number): void {
    const context = this.requestContext.getStore();
    if (!context) return;
    if (userId === undefined || userId === null) {
      throw new Error('Authenticated token is missing a stable user ID for Fabric identity selection');
    }
    const stableUserId = String(userId);
    if (!/^\d{1,18}$/.test(stableUserId)) {
      throw new Error('Authenticated user ID cannot be mapped to a Fabric wallet identity');
    }
    const mspId = context.mspId || this.normalizeMspId(process.env.FABRIC_MSP_ID || 'ECTAMSP');
    context.identityLabel = `user-${mspId}-${stableUserId}`;
  }

  public async connect(orgId?: string): Promise<void> {
    const identityLabel = this.requestContext.getStore()?.identityLabel;
    await this.withGatewayLock(() => this.connectUnlocked(orgId, identityLabel));
  }

  private async connectUnlocked(orgId?: string, requestedIdentityLabel?: string): Promise<void> {
    const requireFabric = process.env.FABRIC_REQUIRED === 'true';
    let targetOrg = orgId || process.env.FABRIC_MSP_ID || 'ECTAMSP';
    
    // Normalize the organization ID to proper MSP format
    targetOrg = this.normalizeMspId(targetOrg);

    const adminLabel = `admin-${targetOrg}`;
    const requestContext = this.requestContext.getStore();
    let targetIdentityLabel = requestedIdentityLabel || requestContext?.identityLabel || adminLabel;
    const identityRequired = process.env.FABRIC_REQUIRE_USER_IDENTITIES === 'true';

    // The Gateway holds one signing identity at a time. Reconnect whenever
    // either the organization or the wallet identity changes.
    if (this.connected && this.currentMspId === targetOrg && this.currentIdentityLabel === targetIdentityLabel) {
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

      // Load wallet
      this.wallet = await openSecureFabricWallet(process.env.FABRIC_WALLET_PATH || './wallet');

      // Authenticated requests select a user-specific identity. A production
      // request must never silently fall back to an organization's admin.
      let selectedIdentity = await this.wallet.get(targetIdentityLabel);
      if (!selectedIdentity && targetIdentityLabel !== adminLabel) {
        if (process.env.NODE_ENV === 'production' || identityRequired) {
          throw new Error(`Provisioned Fabric identity "${targetIdentityLabel}" is missing from the configured wallet`);
        }
        logger.warn(`Fabric user identity "${targetIdentityLabel}" is not provisioned; using ${adminLabel} in development only`);
        targetIdentityLabel = adminLabel;
        if (requestContext) requestContext.identityLabel = adminLabel;
        selectedIdentity = await this.wallet.get(adminLabel);
      }

      if (!selectedIdentity) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Provisioned production Fabric identity "${targetIdentityLabel}" is missing from the configured wallet`);
        }
        await this.importAdminIdentity(targetOrg, adminLabel);
        selectedIdentity = await this.wallet.get(adminLabel);
        targetIdentityLabel = adminLabel;
      }

      if (!selectedIdentity) {
        throw new Error(`Fabric wallet identity "${targetIdentityLabel}" could not be loaded`);
      }
      if (this.normalizeMspId(selectedIdentity.mspId) !== targetOrg) {
        throw new Error(`Fabric wallet identity "${targetIdentityLabel}" belongs to ${selectedIdentity.mspId}, not ${targetOrg}`);
      }
      if (selectedIdentity.type !== 'X.509' || !(selectedIdentity as any).credentials?.certificate || !(selectedIdentity as any).credentials?.privateKey) {
        throw new Error(`Fabric wallet identity "${targetIdentityLabel}" is not a complete X.509 signing identity`);
      }
      const signingCertificate = new crypto.X509Certificate((selectedIdentity as any).credentials.certificate);
      const now = Date.now();
      if (now < Date.parse(signingCertificate.validFrom) || now > Date.parse(signingCertificate.validTo)) {
        throw new Error(`Fabric signing certificate for "${targetIdentityLabel}" is expired or not yet valid`);
      }
      const signingTrustStatus = getFabricCertificateTrustStatus(signingCertificate.toString(), targetOrg);
      if (signingTrustStatus !== 'TRUSTED_BY_CONFIGURED_MSP_ROOT') {
        if (process.env.NODE_ENV === 'production' || identityRequired) {
          throw new Error(`Fabric signing certificate for "${targetIdentityLabel}" is not trusted by ${targetOrg} (${signingTrustStatus})`);
        }
        logger.warn(`Development Fabric identity "${targetIdentityLabel}" is not anchored to the configured MSP root (${signingTrustStatus})`);
      }
      if (targetIdentityLabel.startsWith('user-') &&
          (process.env.NODE_ENV === 'production' || identityRequired)) {
        const userMatch = targetIdentityLabel.match(/^user-(.+)-(\d{1,18})$/);
        if (!userMatch) throw new Error(`Invalid Fabric user wallet label: ${targetIdentityLabel}`);
        const registryRecord = await DatabaseService.getInstance().get(
          `SELECT bi.msp_id, bi.certificate_hash, bi.status, bi.expires_at,
              bi.certified_role, bi.certified_organization, u.role AS current_role,
              u.organization AS current_organization
           FROM blockchain_identities bi
           JOIN users u ON u.id = bi.user_id
           WHERE bi.user_id = $1`,
          [Number(userMatch[2])]
        );
        const certificateHash = crypto.createHash('sha256')
          .update((selectedIdentity as any).credentials.certificate)
          .digest('hex');
        if (!registryRecord || registryRecord.status !== 'active' ||
            this.normalizeMspId(registryRecord.msp_id) !== targetOrg ||
            registryRecord.certificate_hash !== certificateHash ||
            registryRecord.certified_role !== registryRecord.current_role ||
            registryRecord.certified_organization !== registryRecord.current_organization ||
            new Date(registryRecord.expires_at).getTime() <= now) {
          throw new Error(`Fabric identity "${targetIdentityLabel}" is missing, expired, revoked, or does not match its active database registry record`);
        }
      }

      // Build connection profile dynamically
      const ccp = this.buildConnectionProfile(targetOrg);

      const connectionOptions = {
        wallet: this.wallet,
        identity: targetIdentityLabel,
        discovery: {
          enabled: true,  // Enable discovery to get endorsements from all required peers
          asLocalhost: process.env.FABRIC_AS_LOCALHOST !== 'false',
        },
        eventHandlerOptions: {
          commitTimeout: 120,  // ✅ FIX: Reduced from 300s to 120s
        },
      } as any;

      if (!this.gateway) {
        this.gateway = new Gateway();
      } else {
        this.gateway.disconnect();
        this.gateway = new Gateway();
      }

      await this.gateway.connect(ccp, connectionOptions);

      this.network = await this.gateway.getNetwork(process.env.FABRIC_CHANNEL_NAME || 'coffeechannel');
      // Get contract without metadata to bypass schema validation
      this.contract = this.network.getContract(process.env.FABRIC_CHAINCODE_NAME || 'coffee', '');

      this.connected = true;
      this.currentMspId = targetOrg; // Track the actual connected MSP
      this.currentIdentityLabel = targetIdentityLabel;
      logger.info(`✅ Successfully connected to Hyperledger Fabric network as ${targetOrg} using ${targetIdentityLabel}`);

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
      this.currentMspId = null; // Clear the tracked MSP ID
      this.currentIdentityLabel = null;
      this.network = null;
      this.contract = null;

      if (requireFabric) {
        throw error;
      }
    }
  }

  public async disconnect(): Promise<void> {
    await this.withGatewayLock(async () => {
      if (this.gateway) {
        this.gateway.disconnect();
        this.connected = false;
        this.currentMspId = null; // Clear the tracked MSP ID
        this.currentIdentityLabel = null;
        logger.info('Disconnected from Hyperledger Fabric network');
      }
    });
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public async connectAsOrg(orgId: string): Promise<void> {
    const context = this.requestContext.getStore();
    if (context) {
      const requestedMsp = this.normalizeMspId(orgId);
      const authenticatedMsp = context.mspId && this.normalizeMspId(context.mspId);
      if (authenticatedMsp && requestedMsp !== authenticatedMsp) {
        throw new Error(
          `Authenticated Fabric identity for ${authenticatedMsp} cannot sign as ${requestedMsp}; ` +
          'the target organization must submit its own transaction.'
        );
      }
      this.setRequestMspId(requestedMsp);
      return;
    }
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

  private getOrdererEndpoints(): Array<{ name: string; url: string; tlsCaPath: string; serverName?: string }> {
    const configured: Array<{ name: string; url: string; tlsCaPath: string; serverName?: string }> = [];
    for (let index = 1; index <= 9; index++) {
      const url = process.env[`FABRIC_ORDERER_${index}_URL`];
      const tlsCaPath = process.env[`FABRIC_ORDERER_${index}_TLS_CA_PATH`];
      const serverName = process.env[`FABRIC_ORDERER_${index}_SERVER_NAME`];
      if (!url && !tlsCaPath && !serverName) continue;
      if (!url || !tlsCaPath) {
        throw new Error(`FABRIC_ORDERER_${index}_URL and FABRIC_ORDERER_${index}_TLS_CA_PATH must be configured together`);
      }
      configured.push({ name: `orderer${index}`, url, tlsCaPath, serverName });
    }
    if (configured.length > 0) return configured;

    // Backward-compatible single-orderer profile for local development only.
    const defaultTlsCaPath = path.join(
      __dirname, '..', '..', '..', 'blockchain', 'organizations',
      'ordererOrganizations', 'cecbs.et', 'orderers', 'orderer.cecbs.et', 'tls', 'ca.crt'
    );
    return [{
      name: 'orderer.cecbs.et',
      url: process.env.FABRIC_ORDERER_URL || 'grpcs://localhost:7050',
      tlsCaPath: process.env.FABRIC_ORDERER_TLS_CA_PATH || defaultTlsCaPath,
      serverName: 'orderer.cecbs.et',
    }];
  }

  private buildConnectionProfile(mspId: string = process.env.FABRIC_MSP_ID || 'ECTAMSP'): any {
    const orgName = mspId.replace('MSP', '').toLowerCase();
    const channelName = process.env.FABRIC_CHANNEL_NAME || 'coffeechannel';
    
    // All organizations in the network
    const allOrgs = ['ecta', 'ecx', 'banks', 'nbe', 'customs', 'shipping'];
    
    // Build peers configuration for ALL organizations (needed for discovery service)
    const peersConfig: any = {};
    const channelPeers: any = {};
    const organizationsConfig: any = {};
    const ordererEndpoints = this.getOrdererEndpoints();
    const orderersConfig: any = {};
    
    allOrgs.forEach(org => {
      const peerName = `peer0.${org}.cecbs.et`;
      const orgEnvKey = org.toUpperCase();
      const orgMspId = org === 'banks' ? 'BanksMSP' : 
                       org === 'customs' ? 'CustomsMSP' : 
                       org === 'shipping' ? 'ShippingMSP' : 
                       `${org.toUpperCase()}MSP`;
      const defaultTlsCaPath = path.join(
        __dirname, '..', '..', '..',
        'blockchain', 'organizations', 'peerOrganizations',
        `${org}.cecbs.et`, 'peers', peerName, 'tls', 'ca.crt'
      );
      
      // Add peer configuration
      peersConfig[peerName] = {
        url: process.env[`FABRIC_PEER_URL_${orgEnvKey}`] || `grpcs://localhost:${this.getPeerPort(org)}`,
        tlsCACerts: {
          path: process.env[`FABRIC_PEER_TLS_CA_${orgEnvKey}`] || defaultTlsCaPath,
        },
        grpcOptions: {
          'ssl-target-name-override': peerName,
          hostnameOverride: peerName,
          'grpc.keepalive_time_ms': 120000,
          'grpc.keepalive_timeout_ms': 20000,
          'grpc.keepalive_permit_without_calls': 1,
          'grpc.http2.min_time_between_pings_ms': 120000,
          'grpc.http2.max_pings_without_data': 0,
        },
      };
      
      // Add to channel peers (all can endorse)
      channelPeers[peerName] = {
        endorsingPeer: true,
        chaincodeQuery: true,
        ledgerQuery: true,
        eventSource: org === orgName, // Only current org for events
      };
      
      // Add organization configuration
      organizationsConfig[org] = {
        mspid: orgMspId,
        peers: [peerName],
        certificateAuthorities: [],
      };
    });

    ordererEndpoints.forEach((orderer) => {
      const grpcOptions: Record<string, string | number> = {
        'grpc.keepalive_time_ms': 120000,
        'grpc.keepalive_timeout_ms': 20000,
      };
      if (orderer.serverName) {
        grpcOptions['ssl-target-name-override'] = orderer.serverName;
        grpcOptions.hostnameOverride = orderer.serverName;
      }
      orderersConfig[orderer.name] = {
        url: orderer.url,
        tlsCACerts: { path: orderer.tlsCaPath },
        grpcOptions,
      };
    });
    
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
          orderers: ordererEndpoints.map((orderer) => orderer.name),
          peers: channelPeers,
        },
      },
      organizations: organizationsConfig,
      peers: peersConfig,
      orderers: orderersConfig,
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
  public async invokeChaincode(functionName: string, args: string[], userMspId?: string): Promise<ChaincodeResponse> {
    const context = this.requestContext.getStore();
    const requestMspId = userMspId || context?.mspId || (context ? process.env.FABRIC_MSP_ID || 'ECTAMSP' : undefined);
    const requestIdentityLabel = context?.identityLabel;
    return this.withGatewayLock(() => this.invokeChaincodeLocked(functionName, args, requestMspId, requestIdentityLabel));
  }

  private async invokeChaincodeLocked(functionName: string, args: string[], userMspId?: string, requestIdentityLabel?: string): Promise<ChaincodeResponse> {
    // Retry only failures known to happen during endorsement, before ordering.
    // Retrying a submit with an uncertain commit status can apply a write twice.
    const maxRetries = 4;
    let lastError: any;
    
    // Determine which MSP to use - prioritize user's MSP if provided
    const targetMspId = this.normalizeMspId(userMspId || this.currentMspId || process.env.FABRIC_MSP_ID || 'ECTAMSP');
    let targetIdentityLabel = requestIdentityLabel || `admin-${targetMspId}`;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let attemptTxId: string | undefined;
      try {
        // Check if we need to reconnect with the correct MSP
        if (!this.contract || !this.network || this.currentMspId !== targetMspId || this.currentIdentityLabel !== targetIdentityLabel) {
          logger.warn(`Contract/network, MSP, or signing identity mismatch (current: ${this.currentMspId}/${this.currentIdentityLabel}, needed: ${targetMspId}/${targetIdentityLabel}), reconnecting...`);
          await this.connectUnlocked(targetMspId, targetIdentityLabel);
          targetIdentityLabel = this.currentIdentityLabel || targetIdentityLabel;
        }
        
        if (!this.contract) {
          throw new Error('Not connected to Fabric network');
        }

        logger.info(`Invoking chaincode function: ${functionName} (attempt ${attempt}/${maxRetries})`, {
          argumentCount: args.length,
        });

        // Ask Gateway to route the proposal to peers from every consortium MSP.
        // This selects candidate endorsing organizations; the committed chaincode
        // definition's endorsement policy is what determines which endorsements
        // are required for a transaction to be VALID. Report actual endorsers from
        // the committed envelope below instead of assuming every requested MSP signed.
        const transaction = this.contract.createTransaction(functionName);
        transaction.setEndorsingOrganizations(...CONSORTIUM_PEER_MSPS);
        const txId = transaction.getTransactionId();
        attemptTxId = txId;
        
        // The timeout does not cancel submit(), so a timeout leaves commit status unknown.
        let timeoutId: NodeJS.Timeout | undefined;
        const submitPromise = transaction.submit(...args);
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            const timeoutError: any = new Error('Transaction timed out while awaiting endorsement or commit status');
            timeoutError.code = 'FABRIC_COMMIT_TIMEOUT';
            reject(timeoutError);
          }, 90000);
        });
        
        let result: Buffer;
        try {
          result = await Promise.race([submitPromise, timeoutPromise]);
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
        }
        const committedDetails = await this.getTransactionDetails(txId).catch((ledgerError) => {
          logger.warn(`Transaction ${txId} committed, but QSCC details could not be read yet:`, ledgerError);
          return null;
        });
        if (committedDetails && committedDetails.validationStatus !== 'VALID') {
          return {
            success: false,
            error: `Fabric committed transaction ${txId} with validation status ${committedDetails.validationStatus}; its writes were not applied.`,
            txId,
            transactionId: txId,
            ledgerDetails: committedDetails,
            consensus: {
              protocol: 'Fabric ordering service',
              committed: true,
              validationStatus: committedDetails.validationStatus,
              outcome: 'INVALID',
            },
            endorsement: {
              policyStatus: 'NOT_RESOLVED',
              policySource: 'Committed channel chaincode definition; not included in the transaction envelope',
              requestedOrganizations: CONSORTIUM_PEER_MSPS,
              actualOrganizations: committedDetails.endorsers.map((endorser) => endorser.mspId),
              verifiedFromLedger: true,
              allRequestedOrganizationsEndorsed: CONSORTIUM_PEER_MSPS.every((mspId) =>
                committedDetails.endorsers.some((endorser) => endorser.mspId === mspId)),
            },
          };
        }
        const payloadText = result.toString();
        let responseData: any = null;
        if (payloadText) {
          try {
            responseData = JSON.parse(payloadText);
          } catch (_) {
            responseData = payloadText;
          }
        }

        logger.info(`✅ Chaincode transaction submitted: ${functionName} (attempt ${attempt})`, {
          txId,
          submittingMspId: targetMspId,
          endorsementPolicy: 'not resolved by this API response',
        });

        return {
          success: true,
          data: responseData,
          txId,
          transactionId: txId,
          ledgerDetails: committedDetails,
          consensus: {
            protocol: 'Fabric ordering service',
            committed: true,
            validationStatus: committedDetails?.validationStatus || 'VALIDATED_BY_FABRIC_COMMIT_EVENT',
            outcome: 'VALID',
          },
          endorsement: {
            policyStatus: 'NOT_RESOLVED',
            policySource: 'Committed channel chaincode definition; not included in the transaction envelope',
            requestedOrganizations: CONSORTIUM_PEER_MSPS,
            actualOrganizations: committedDetails?.endorsers.map((endorser) => endorser.mspId),
            verifiedFromLedger: !!committedDetails,
            allRequestedOrganizationsEndorsed: !!committedDetails && CONSORTIUM_PEER_MSPS.every((mspId) =>
              committedDetails.endorsers.some((endorser) => endorser.mspId === mspId)),
          },
        };

      } catch (error) {
        lastError = error;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to invoke chaincode function ${functionName} (attempt ${attempt}/${maxRetries}): ${errorMessage}`);
        
        const committedDetails = attemptTxId
          ? await this.getTransactionDetails(attemptTxId).catch(() => null)
          : null;
        if (committedDetails) {
          const isValid = committedDetails.validationStatus === 'VALID';
          return {
            success: isValid,
            data: null,
            error: isValid
              ? `Transaction ${attemptTxId} is valid on the ledger, but the API did not receive its chaincode response; do not resubmit.`
              : `Transaction ${attemptTxId} is on the ledger with validation status ${committedDetails.validationStatus}; its writes were not applied.`,
            txId: attemptTxId,
            transactionId: attemptTxId,
            ledgerDetails: committedDetails,
            consensus: {
              protocol: 'Fabric ordering service',
              committed: true,
              validationStatus: committedDetails.validationStatus,
              outcome: isValid ? 'VALID' : 'INVALID',
            },
            endorsement: {
              policyStatus: 'NOT_RESOLVED',
              policySource: 'Committed channel chaincode definition; not included in the transaction envelope',
              requestedOrganizations: CONSORTIUM_PEER_MSPS,
              actualOrganizations: committedDetails.endorsers.map((endorser) => endorser.mspId),
              verifiedFromLedger: true,
              allRequestedOrganizationsEndorsed: CONSORTIUM_PEER_MSPS.every((mspId) =>
                committedDetails.endorsers.some((endorser) => endorser.mspId === mspId)),
            },
          };
        }

        // This exact error is returned before an envelope reaches the ordering
        // service. Other errors (including MVCC errors and timeouts) may already
        // have a ledger transaction and must not be blindly resubmitted.
        const isPreOrderingEndorsementFailure = !attemptTxId ||
          /Peer endorsements do not match|failed to endorse transaction/i.test(errorMessage);
        
        if (isPreOrderingEndorsementFailure && attempt < maxRetries) {
          // Wait with exponential backoff before retry
          const waitTime = 4000 * attempt; // 4s, 8s, 12s, 16s
          logger.warn(`Pre-ordering endorsement failure; retrying in ${waitTime}ms (${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        const outcomeUnknown = !isPreOrderingEndorsementFailure;
        const outcomeMessage = outcomeUnknown
          ? `Transaction outcome is unknown${attemptTxId ? `; check transaction ${attemptTxId} before resubmitting` : ''}.`
          : 'Fabric rejected the proposal before ordering; no ledger transaction was created.';
        return {
          success: false,
          error: `${errorMessage}. ${outcomeMessage}`,
          txId: attemptTxId,
          transactionId: attemptTxId,
          consensus: {
            protocol: 'Fabric ordering service',
            committed: outcomeUnknown ? null : false,
            validationStatus: outcomeUnknown ? 'UNKNOWN' : 'NOT_ORDERED',
            outcome: outcomeUnknown ? 'UNKNOWN' : 'REJECTED_BEFORE_ORDERING',
          },
        };
      }
    }
    
    // All retries failed
    return {
      success: false,
      error: lastError instanceof Error ? lastError.message : 'Unknown error',
    };
  }

  // Chaincode query operations
  public async queryChaincode(functionName: string, args: string[], userMspId?: string): Promise<ChaincodeResponse> {
    const context = this.requestContext.getStore();
    const requestMspId = userMspId || context?.mspId || (context ? process.env.FABRIC_MSP_ID || 'ECTAMSP' : undefined);
    const requestIdentityLabel = context?.identityLabel;
    return this.withGatewayLock(() => this.queryChaincodeLocked(functionName, args, requestMspId, requestIdentityLabel));
  }

  private async queryChaincodeLocked(functionName: string, args: string[], userMspId?: string, requestIdentityLabel?: string): Promise<ChaincodeResponse> {
    try {
      // Determine which MSP to use
      const targetMspId = this.normalizeMspId(userMspId || this.currentMspId || process.env.FABRIC_MSP_ID || 'ECTAMSP');
      const targetIdentityLabel = requestIdentityLabel || `admin-${targetMspId}`;
      
      // Check if contract exists or MSP mismatch, if so reconnect
      if (!this.contract || !this.network || this.currentMspId !== targetMspId || this.currentIdentityLabel !== targetIdentityLabel) {
        logger.warn(`Contract/network, MSP, or signing identity mismatch, reconnecting as ${targetMspId}/${targetIdentityLabel}...`);
        await this.connectUnlocked(targetMspId, targetIdentityLabel);
      }
      
      if (!this.contract || !this.network) {
        throw new Error('Not connected to Fabric network');
      }

      logger.info(`Querying chaincode function: ${functionName}`, { argumentCount: args.length });

      const transaction = this.contract.createTransaction(functionName);
      let resultBytes: Buffer = Buffer.alloc(0); // Initialize with empty buffer
      
      try {
        // Try normal evaluation first with 60 second timeout (increased for large datasets)
        const evaluatePromise = transaction.evaluate(...args);
        const timeoutPromise = new Promise<Buffer>((_, reject) => 
          setTimeout(() => reject(new Error('REQUEST TIMEOUT: Query took longer than 60 seconds - check if all peer nodes are responding')), 60000)
        );
        
        resultBytes = await Promise.race([evaluatePromise, timeoutPromise]);
      } catch (error: any) {
        // Log full error details for debugging
        logger.error(`Transaction evaluation error for ${functionName}:`, {
          message: error.message,
          hasPayload: !!error.payload,
          hasResponses: !!error.responses,
          responsesLength: error.responses?.length,
          errorKeys: Object.keys(error),
          errorType: typeof error,
        });
        
        // If schema validation fails, try to extract raw payload
        if (error.message && error.message.includes('Value did not match schema')) {
          logger.warn(`Schema validation error for ${functionName}, attempting to extract raw payload...`);
          
          // The error object from Fabric SDK has the response in error.responses array
          if (error.responses && Array.isArray(error.responses) && error.responses.length > 0) {
            const firstResponse = error.responses[0];
            if (firstResponse.response && firstResponse.response.payload) {
              const payload = firstResponse.response.payload;
              if (Buffer.isBuffer(payload)) {
                resultBytes = payload;
                logger.info(`✅ Extracted raw payload from error.responses[0].response.payload (${resultBytes.length} bytes)`);
              } else if (payload.data && Array.isArray(payload.data)) {
                resultBytes = Buffer.from(payload.data);
                logger.info(`✅ Extracted raw payload from error.responses[0].response.payload.data (${resultBytes.length} bytes)`);
              }
            }
          }
          // Fallback: try error.payload directly
          else if (error.payload && Buffer.isBuffer(error.payload)) {
            resultBytes = error.payload;
            logger.info(`✅ Successfully extracted raw payload as Buffer (${resultBytes.length} bytes)`);
          } else if (error.payload && error.payload.data && Array.isArray(error.payload.data)) {
            // If payload is {data: [array of bytes], type: 'Buffer'}
            resultBytes = Buffer.from(error.payload.data);
            logger.info(`✅ Successfully extracted raw payload from error.payload.data array`);
          }
          
          if (resultBytes.length === 0) {
            logger.error(`❌ Extracted payload is empty for ${functionName}. Error structure:`, {
              hasResponses: !!error.responses,
              responsesLength: error.responses?.length,
              hasPayload: !!error.payload,
              payloadType: error.payload ? typeof error.payload : 'undefined',
              firstResponseKeys: error.responses?.[0] ? Object.keys(error.responses[0]) : []
            });
            throw error; // Re-throw if payload is empty
          }
        } else {
          throw error; // Re-throw non-schema errors
        }
      }
      
      logger.info(`✅ Chaincode query successful: ${functionName}`);

      const resultString = resultBytes.toString('utf8');
      let parsedData: any = null;
      
      if (resultString) {
        parsedData = JSON.parse(resultString);
        
        // DEBUG: Log for QueryAllShipments
        if (functionName === 'QueryAllShipments' && Array.isArray(parsedData) && parsedData.length > 0) {
          logger.info(`[FABRIC DEBUG] QueryAllShipments returned ${parsedData.length} shipments`);
          logger.info('[FABRIC DEBUG] First shipment RAW:', JSON.stringify(parsedData[0]));
          logger.info('[FABRIC DEBUG] First shipment quantity:', parsedData[0].quantity);
          logger.info('[FABRIC DEBUG] First shipment grade:', parsedData[0].grade);
        }
        
        // Fix null arrays as a safety measure (chaincode should already handle this)
        parsedData = this.fixNullArrays(parsedData);
      }

      return {
        success: true,
        data: parsedData,
      };

    } catch (error: any) {
      // CRITICAL FIX: Check if this is a schema validation error that was NOT caught by inner try-catch
      // This happens when the SDK throws the error from SingleQueryHandler.evaluate() before our try-catch
      if (error.message && error.message.includes('Value did not match schema')) {
        logger.warn(`[OUTER CATCH] Schema validation error for ${functionName}, attempting payload extraction...`);
        
        let resultBytes: Buffer = Buffer.alloc(0);
        
        // Try to extract payload from error responses array
        if (error.responses && Array.isArray(error.responses) && error.responses.length > 0) {
          const firstResponse = error.responses[0];
          if (firstResponse.response && firstResponse.response.payload) {
            const payload = firstResponse.response.payload;
            if (Buffer.isBuffer(payload)) {
              resultBytes = payload;
              logger.info(`✅ [OUTER CATCH] Extracted payload from error.responses[0].response.payload (${resultBytes.length} bytes)`);
            } else if (payload.data && Array.isArray(payload.data)) {
              resultBytes = Buffer.from(payload.data);
              logger.info(`✅ [OUTER CATCH] Extracted payload from error.responses[0].response.payload.data (${resultBytes.length} bytes)`);
            }
          }
        }
        // Fallback: try error.payload directly
        else if (error.payload && Buffer.isBuffer(error.payload)) {
          resultBytes = error.payload;
          logger.info(`✅ [OUTER CATCH] Extracted payload as Buffer (${resultBytes.length} bytes)`);
        } else if (error.payload && error.payload.data && Array.isArray(error.payload.data)) {
          resultBytes = Buffer.from(error.payload.data);
          logger.info(`✅ [OUTER CATCH] Extracted payload from error.payload.data array`);
        }
        
        // If we extracted payload successfully, parse and return it
        if (resultBytes.length > 0) {
          try {
            const resultString = resultBytes.toString('utf8');
            let parsedData: any = null;
            
            if (resultString) {
              parsedData = JSON.parse(resultString);
              parsedData = this.fixNullArrays(parsedData);
            }
            
            logger.info(`✅ [OUTER CATCH] Successfully recovered data despite schema validation error for ${functionName}`);
            return {
              success: true,
              data: parsedData,
            };
          } catch (parseError) {
            logger.error(`[OUTER CATCH] Failed to parse extracted payload for ${functionName}:`, parseError);
          }
        }
      }
      
      // If not a schema error or payload extraction failed, return error as before
      logger.error(`Failed to query chaincode function ${functionName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  // Helper method to fix null arrays in response data
  private fixNullArrays(data: any): any {
    if (Array.isArray(data)) {
      return data.map((item: any) => {
        if (item && typeof item === 'object') {
          // Fix common null array fields
          if (item.screenedAgainst === null || item.screenedAgainst === undefined) {
            item.screenedAgainst = [];
          }
          if (item.ecxLots === null || item.ecxLots === undefined) {
            item.ecxLots = [];
          }
          if (item.documents === null || item.documents === undefined) {
            item.documents = [];
          }
          if (item.riskFactors === null || item.riskFactors === undefined) {
            item.riskFactors = [];
          }
        }
        return item;
      });
    } else if (data && typeof data === 'object') {
      // Fix common null array fields for single objects
      if (data.screenedAgainst === null || data.screenedAgainst === undefined) {
        data.screenedAgainst = [];
      }
      if (data.ecxLots === null || data.ecxLots === undefined) {
        data.ecxLots = [];
      }
      if (data.documents === null || data.documents === undefined) {
        data.documents = [];
      }
      if (data.riskFactors === null || data.riskFactors === undefined) {
        data.riskFactors = [];
      }
    }
    return data;
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
    licenseExpiryDate: string,
    userRole?: string
  ): Promise<ChaincodeResponse> {
    const mspId = userRole ? this.getMspFromRole(userRole) : undefined;
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
    ], mspId);
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

  public async revokeExporterLicense(exporterId: string, reason: string): Promise<ChaincodeResponse> {
    return this.invokeChaincode('RevokeExporterLicense', [exporterId, reason]);
  }

  public async renewExporterLicense(exporterId: string, newExpiryDate: string, reason: string): Promise<ChaincodeResponse> {
    return this.invokeChaincode('RenewExporterLicense', [exporterId, newExpiryDate, reason]);
  }

  public async recordShipmentActionRejection(shipmentId: string, proposedAction: string, reason: string): Promise<ChaincodeResponse> {
    return this.invokeChaincode('RecordShipmentActionRejection', [shipmentId, proposedAction, reason]);
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
    documentsJSON?: string,
    userRole?: string
  ): Promise<ChaincodeResponse> {
    const mspId = userRole ? this.getMspFromRole(userRole) : undefined;
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
    ], mspId);
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
    // RequestLC validates the exporter from ledger state inside the same
    // transaction, avoiding a separate preflight query and TOCTOU gap.
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
    // Query all forex allocations from blockchain
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
    return this.queryChaincode('QueryAllShipments', []);
  }

  public async updateShipmentStatus(shipmentId: string, status: string): Promise<ChaincodeResponse> {
    return this.invokeChaincode('UpdateShipmentStatus', [shipmentId, status]);
  }

  public async pickupShipment(
    shipmentId: string,
    pickupLocation: string,
    pickupBy: string,
    vehicleNumber: string,
    driverName: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('PickupShipment', [
      shipmentId,
      pickupLocation,
      pickupBy,
      vehicleNumber,
      driverName
    ]);
  }

  public async confirmDelivery(
    shipmentId: string,
    deliveryLocation: string,
    deliveredTo: string,
    receivedBy: string,
    receiverSignature: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('ConfirmDelivery', [
      shipmentId,
      deliveryLocation,
      deliveredTo,
      receivedBy,
      receiverSignature
    ]);
  }

  public async submitLCDocuments(
    lcId: string,
    documentIds: string[]
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('SubmitLCDocuments', [
      lcId,
      JSON.stringify(documentIds)
    ]);
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
    return this.queryChaincode('QueryForexByContract', [contractId]);
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
    await this.withGatewayLock(() => this.startEventListenerInGatewayLock());
  }

  private async startEventListenerInGatewayLock(): Promise<void> {
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
    return this.withGatewayLock(() => this.getNetworkInfoInGatewayLock());
  }

  private async getNetworkInfoInGatewayLock(): Promise<any> {
    try {
      if (!this.network) {
        throw new Error('Not connected to Fabric network');
      }

      const channel = this.network.getChannel();
      const peers = await Promise.all(channel.getEndorsers().map(async (peer: any) => ({
          name: peer.name,
          mspId: peer.mspid,
          reachable: await peer.checkConnection().catch(() => false),
        })));

      // Report the committed Raft consenters, not a hard-coded local orderer.
      // The production network may contain several independently operated nodes.
      const consensus = await this.getConsensusInfo();
      const configuredOrderers = this.getOrdererEndpoints();
      const orderers = await Promise.all(consensus.consenters.map(async (consenter) => {
        const endpoint = configuredOrderers.find((candidate) => {
          try {
            const url = new URL(candidate.url);
            const port = Number(url.port || (url.protocol === 'grpcs:' ? 443 : 80));
            const committedAddress = `${consenter.host.toLowerCase().replace(/\.$/, '')}:${consenter.port}`;
            const endpointAddress = `${url.hostname.toLowerCase().replace(/\.$/, '')}:${port}`;
            const serverNameAddress = candidate.serverName
              ? `${candidate.serverName.toLowerCase().replace(/\.$/, '')}:${port}`
              : null;
            return endpointAddress === committedAddress || serverNameAddress === committedAddress;
          } catch (_) {
            return false;
          }
        });

        if (!endpoint) {
          return {
            name: `${consenter.host}:${consenter.port}`,
            mspId: null,
            host: consenter.host,
            port: consenter.port,
            reachable: false,
          };
        }

        try {
          const committer: any = channel.client.getCommitter(endpoint.name);
          return {
            name: committer.name,
            mspId: committer.mspid || null,
            host: consenter.host,
            port: consenter.port,
            reachable: await committer.checkConnection().catch(() => false),
          };
        } catch (_) {
          return {
            name: endpoint.name,
            mspId: null,
            host: consenter.host,
            port: consenter.port,
            reachable: false,
          };
        }
      }));

      return {
        channelName: channel.name,
        connectedOrg: this.currentMspId,
        peers,
        orderers,
      };

    } catch (error) {
      logger.error('Failed to get network info:', error);
      throw error;
    }
  }

  private async evaluateQscc(functionName: string, args: string[]): Promise<Buffer> {
    return this.withGatewayLock(() => this.evaluateQsccInGatewayLock(functionName, args));
  }

  private async evaluateQsccInGatewayLock(functionName: string, args: string[]): Promise<Buffer> {
    if (!this.network) {
      await this.connectUnlocked();
    }
    if (!this.network) {
      throw new Error('Not connected to Fabric network');
    }
    const qscc = this.network.getContract('qscc');
    return qscc.evaluateTransaction(functionName, ...args);
  }

  /** Confirm that QSCC can read the configured channel ledger, not just a Gateway socket. */
  public async checkLedgerConnectivity(): Promise<boolean> {
    return this.withGatewayLock(async () => {
      if (!this.connected || !this.network) return false;
      try {
        const channelName = process.env.FABRIC_CHANNEL_NAME || 'coffeechannel';
        const rawInfo = await this.evaluateQscc('GetChainInfo', [channelName]);
        const info = fabricProtos.common.BlockchainInfo.decode(rawInfo);
        return Number(info.height?.toString?.() ?? info.height ?? 0) > 0;
      } catch (error) {
        logger.warn('Fabric channel ledger readiness check failed:', error instanceof Error ? error.message : 'unknown error');
        return false;
      }
    });
  }

  /**
   * Read committed Raft membership and check the configured endpoints against
   * it. A Raft quorum, rather than every node, must be reachable to make progress.
   */
  public async getOrdererConfigurationReadiness(minimumConsenters: number): Promise<{
    ready: boolean;
    requiredConsenters: number;
    configuredConsenters: number | null;
    matchedConfiguredOrderers: number;
    reachableOrderers: number;
    requiredOnlineOrderers: number | null;
    ordererType: string | null;
  }> {
    try {
      const info = await this.getConsensusInfo();
      const uniqueConsenters = new Set(info.consenters.map((consenter) => `${consenter.host.toLowerCase()}:${consenter.port}`));
      const configuredConsenters = info.consenterCount === null ? null : uniqueConsenters.size;
      const endpoints = this.getOrdererEndpoints();
      const channel = this.network?.getChannel() as any;
      const consenters = await Promise.all(info.consenters.map(async (consenter) => {
        const consenterAddress = `${consenter.host.toLowerCase().replace(/\.$/, '')}:${consenter.port}`;
        const endpoint = endpoints.find((candidate) => {
          try {
            const url = new URL(candidate.url);
            const port = Number(url.port || (url.protocol === 'grpcs:' ? 443 : 80));
            const urlAddress = `${url.hostname.toLowerCase().replace(/\.$/, '')}:${port}`;
            const serverNameAddress = candidate.serverName
              ? `${candidate.serverName.toLowerCase().replace(/\.$/, '')}:${port}`
              : null;
            return urlAddress === consenterAddress || serverNameAddress === consenterAddress;
          } catch (_) {
            return false;
          }
        });
        let reachable = false;
        if (endpoint && channel) {
          try {
            const committer = channel.client.getCommitter(endpoint.name);
            reachable = await committer.checkConnection();
          } catch (_) {
            reachable = false;
          }
        }
        return {
          ...consenter,
          endpointConfigured: Boolean(endpoint),
          reachable,
        };
      }));
      const matchedConfiguredOrderers = consenters.filter((consenter) => consenter.endpointConfigured).length;
      const reachableOrderers = consenters.filter((consenter) => consenter.reachable).length;
      const requiredOnlineOrderers = configuredConsenters === null
        ? null
        : Math.floor(configuredConsenters / 2) + 1;
      return {
        ready: info.ordererType === 'etcdraft' && configuredConsenters !== null &&
          configuredConsenters >= minimumConsenters && matchedConfiguredOrderers >= minimumConsenters &&
          requiredOnlineOrderers !== null && reachableOrderers >= requiredOnlineOrderers,
        requiredConsenters: minimumConsenters,
        configuredConsenters,
        matchedConfiguredOrderers,
        reachableOrderers,
        requiredOnlineOrderers,
        ordererType: info.ordererType,
      };
    } catch (error) {
      logger.warn('Fabric orderer configuration readiness check failed:', error instanceof Error ? error.message : 'unknown error');
      return {
        ready: false,
        requiredConsenters: minimumConsenters,
        configuredConsenters: null,
        matchedConfiguredOrderers: 0,
        reachableOrderers: 0,
        requiredOnlineOrderers: null,
        ordererType: null,
      };
    }
  }

  private decodeBlock(rawBlock: Buffer): any {
    return fabricProtos.common.Block.decode(rawBlock);
  }

  private async getRawBlockByNumber(blockNumber: number): Promise<any> {
    const rawBlock = await this.evaluateQscc('GetBlockByNumber', [
      process.env.FABRIC_CHANNEL_NAME || 'coffeechannel',
      String(blockNumber),
    ]);
    return this.decodeBlock(rawBlock);
  }

  /** Match an envelope certificate to a configured organization MSP CA root. */
  private getCertificateTrustStatus(certificate: any, mspId: string): string {
    return getFabricCertificateTrustStatus(certificate.toString(), mspId);
  }

  /**
   * Parse X.509 certificate subject and issuer into structured fields
   * @param subject - Certificate subject DN (e.g., "CN=peer0.ecta.example.com, OU=peer, O=ECTA, L=...")
   * @param issuer - Certificate issuer DN
   * @returns Parsed certificate details
   */
  private parseCertificateSubject(subject: string, issuer: string): { 
    commonName: string; 
    organization: string;
    organizationalUnit: string; 
    issuer: string; 
  } {
    // Parse subject DN to extract fields
    // Handle both "field=value" and "field = value" with optional spaces
    const parseField = (dn: string, field: string): string => {
      // Match field=value with optional spaces around = and after commas
      // Use word boundary to match exact field (e.g., 'O' not 'OU')
      const regex = new RegExp(`\\b${field}\\s*=\\s*([^,]+)`, 'i');
      const match = dn.match(regex);
      return match ? match[1].trim() : '';
    };

    // Try to get organization from subject first, then from issuer
    let organization = parseField(subject, 'O');
    if (!organization) {
      // If peer cert doesn't have O field, get it from issuer
      organization = parseField(issuer, 'O');
    }
    // If still empty, try to extract from domain name (e.g., "ecta.cecbs.et" from CN)
    if (!organization) {
      const cn = parseField(subject, 'CN');
      const parts = cn.split('.');
      if (parts.length > 1) {
        organization = parts[1].toUpperCase(); // e.g., "ecta" from "peer0.ecta.cecbs.et"
      }
    }

    return {
      commonName: parseField(subject, 'CN') || 'N/A',
      organization: organization || 'N/A',
      organizationalUnit: parseField(subject, 'OU') || 'N/A',
      issuer: parseField(issuer, 'CN') || parseField(issuer, 'O') || issuer
    };
  }

  private parseEnvelope(envelopeBytes: Buffer | Uint8Array): any {
    const common = fabricProtos.common;
    const protos = fabricProtos.protos;
    const envelope = common.Envelope.decode(envelopeBytes);
    const payload = common.Payload.decode(envelope.payload);
    const channelHeader = common.ChannelHeader.decode(payload.header.channel_header);
    const signatureHeader = common.SignatureHeader.decode(payload.header.signature_header);
    const creator = fabricProtos.msp.SerializedIdentity.decode(signatureHeader.creator);
    let creatorName = creator.mspid;
    let certificateSubject: string | null = null;
    let creatorSignatureValid: boolean | null = null;
    let creatorCertificate: any = null;
    let creatorCertificateTrustStatus = 'UNAVAILABLE';
    try {
      creatorCertificate = new crypto.X509Certificate(Buffer.from(creator.id_bytes));
      certificateSubject = creatorCertificate.subject;
      const commonName = creatorCertificate.subject.match(/(?:^|\n|,)\s*CN=([^,\n]+)/)?.[1];
      if (commonName) creatorName = commonName.trim();
      creatorSignatureValid = crypto.verify('sha256', Buffer.from(envelope.payload), creatorCertificate.publicKey, Buffer.from(envelope.signature));
      creatorCertificateTrustStatus = this.getCertificateTrustStatus(creatorCertificate, creator.mspid);
    } catch (_) {
      // Preserve the MSP identity and report no parsed certificate subject.
    }

    let chaincodeFunction: string | null = null;
    let chaincodeName: string | null = null;
    let args: string[] = [];
    const endorsers: Array<{ 
      mspId: string; 
      identity: string; 
      signatureValid: boolean | null; 
      certificateTrustStatus: string;
      certificateDetails?: {
        commonName: string;
        organization: string;
        organizationalUnit: string;
        issuer: string;
      };
    }> = [];
    // Config and system envelopes also appear in blocks but do not contain a
    // chaincode invocation. Keep their header and creator without decoding them
    // as an endorser transaction.
    if (Number(channelHeader.type) === Number(common.HeaderType.ENDORSER_TRANSACTION)) {
      const transaction = protos.Transaction.decode(payload.data);
      const firstAction = transaction.actions?.[0];
      if (firstAction?.payload) {
      const actionPayload = protos.ChaincodeActionPayload.decode(firstAction.payload);
      if (actionPayload.action?.proposal_response_payload) {
        const responsePayload = protos.ProposalResponsePayload.decode(actionPayload.action.proposal_response_payload);
        if (responsePayload.extension) {
          const chaincodeAction = protos.ChaincodeAction.decode(responsePayload.extension);
          chaincodeName = chaincodeAction.chaincode_id?.name || null;
          const proposalPayload = protos.ChaincodeProposalPayload.decode(actionPayload.chaincode_proposal_payload);
          const invocation = protos.ChaincodeInvocationSpec.decode(proposalPayload.input);
          const input = invocation.chaincode_spec?.input?.args || [];
          if (input.length > 0) {
            chaincodeFunction = Buffer.from(input[0]).toString('utf8');
            args = input.slice(1).map((argument: Uint8Array) => Buffer.from(argument).toString('utf8'));
          }
        }
      }
      for (const endorsement of actionPayload.action?.endorsements || []) {
        try {
          const identity = fabricProtos.msp.SerializedIdentity.decode(endorsement.endorser);
          let subject = identity.mspid;
          let signatureValid: boolean | null = null;
          let certificateTrustStatus = 'UNAVAILABLE';
          let certificateDetails: any = undefined;
          try {
            const certificate = new crypto.X509Certificate(Buffer.from(identity.id_bytes));
            subject = certificate.subject;
            const signedBytes = Buffer.concat([
              Buffer.from(actionPayload.action.proposal_response_payload),
              Buffer.from(endorsement.endorser),
            ]);
            signatureValid = crypto.verify('sha256', signedBytes, certificate.publicKey, Buffer.from(endorsement.signature));
            certificateTrustStatus = this.getCertificateTrustStatus(certificate, identity.mspid);
            
            // Parse certificate subject for details
            certificateDetails = this.parseCertificateSubject(certificate.subject, certificate.issuer);
          } catch (_) { /* keep MSP identity if the certificate cannot be parsed */ }
          endorsers.push({ 
            mspId: identity.mspid, 
            identity: subject, 
            signatureValid, 
            certificateTrustStatus,
            certificateDetails
          });
        } catch (_) {
          // Never drop an undecodable endorsement: dropping it could make the
          // remaining, valid signatures look like a complete endorsement set.
          endorsers.push({
            mspId: 'UNKNOWN',
            identity: 'UNPARSEABLE_ENDORSER_IDENTITY',
            signatureValid: false,
            certificateTrustStatus: 'UNAVAILABLE',
          });
        }
      }
      }
    }

    const timestamp = channelHeader.timestamp
      ? new Date(Number(channelHeader.timestamp.seconds) * 1000 + Math.floor(Number(channelHeader.timestamp.nanos || 0) / 1e6)).toISOString()
      : null;

    return {
      txId: channelHeader.tx_id,
      channelId: channelHeader.channel_id,
      timestamp,
      type: channelHeader.type,
      creator: {
        mspId: creator.mspid,
        identity: creatorName,
        certificateSubject,
        signatureValid: creatorSignatureValid,
        certificateTrustStatus: creatorCertificateTrustStatus,
      },
      chaincodeName,
      chaincodeFunction,
      args,
      endorsers,
    };
  }

  private calculateBlockHeaderHash(header: any): string {
    // Fabric hashes the protobuf-marshaled BlockHeader, not an ASN.1/DER
    // representation. Hash the canonical protobuf bytes used by Fabric.
    const encoded = fabricProtos.common.BlockHeader.encode(header).finish();
    return crypto.createHash('sha256').update(encoded).digest('hex');
  }

  /** Read Fabric's ledger height and count transactions in committed blocks. */
  public async getBlockchainInfo(): Promise<FabricLedgerInfo> {
    if (this.ledgerInfoCache && this.ledgerInfoCache.expiresAt > Date.now()) {
      return this.ledgerInfoCache.value;
    }
    if (!this.ledgerInfoPromise) this.ledgerInfoPromise = this.readBlockchainInfo();
    try {
      return await this.ledgerInfoPromise;
    } finally {
      this.ledgerInfoPromise = null;
    }
  }

  private async readBlockchainInfo(): Promise<FabricLedgerInfo> {
    try {
      const channelName = process.env.FABRIC_CHANNEL_NAME || 'coffeechannel';
      const rawInfo = await this.evaluateQscc('GetChainInfo', [channelName]);
      const info = fabricProtos.common.BlockchainInfo.decode(rawInfo);
      const height = Number(info.height?.toString?.() ?? info.height ?? 0);
      let transactionCount = 0;
      let validTransactionCount = 0;
      let invalidTransactionCount = 0;
      let unknownTransactionCount = 0;

      // QSCC exposes height and hashes, not a lifetime transaction count.
      // Count application transaction envelopes from committed blocks and
      // classify each by Fabric's TRANSACTIONS_FILTER metadata.
      const batchSize = 8;
      for (let start = 0; start < height; start += batchSize) {
        const blockNumbers = Array.from({ length: Math.min(batchSize, height - start) }, (_, index) => start + index);
        const blocks = await Promise.all(blockNumbers.map((number) => this.getRawBlockByNumber(number)));
        for (const block of blocks) {
          const envelopes: Uint8Array[] = block.data?.data || [];
          const transactionFilter = block.metadata?.metadata?.[fabricProtos.common.BlockMetadataIndex.TRANSACTIONS_FILTER] || Buffer.alloc(0);
          for (let index = 0; index < envelopes.length; index += 1) {
            try {
              const envelope = fabricProtos.common.Envelope.decode(envelopes[index]);
              const payload = fabricProtos.common.Payload.decode(envelope.payload);
              const header = fabricProtos.common.ChannelHeader.decode(payload.header.channel_header);
              if (Number(header.type) !== Number(fabricProtos.common.HeaderType.ENDORSER_TRANSACTION)) continue;
              transactionCount += 1;
              const validationCode = transactionFilter[index];
              if (validationCode === fabricProtos.protos.TxValidationCode.VALID) validTransactionCount += 1;
              else if (validationCode === undefined) unknownTransactionCount += 1;
              else invalidTransactionCount += 1;
            } catch (_) {
              unknownTransactionCount += 1;
            }
          }
        }
      }

      const value = {
        height,
        transactionCount,
        validTransactionCount,
        invalidTransactionCount,
        unknownTransactionCount,
        currentBlockHash: Buffer.from(info.currentBlockHash || []).toString('hex'),
        previousBlockHash: Buffer.from(info.previousBlockHash || []).toString('hex'),
      };
      this.ledgerInfoCache = { value, expiresAt: Date.now() + 30_000 };
      return value;
    } catch (error) {
      logger.error('Failed to get blockchain info:', error);
      throw error;
    }
  }

  /** Read the active orderer consensus settings from the latest committed config block. */
  public async getConsensusInfo(): Promise<{
    ordererType: string | null;
    configBlockNumber: number;
    consenterCount: number | null;
    consenters: Array<{ host: string; port: number; certificateSubject: string | null }>;
  }> {
    const chainInfo = await this.getBlockchainInfo();
    if (chainInfo.height < 1) throw new Error('Channel has no committed blocks');
    const latestBlock = await this.getRawBlockByNumber(chainInfo.height - 1);
    const lastConfigMetadataBytes = latestBlock.metadata?.metadata?.[fabricProtos.common.BlockMetadataIndex.LAST_CONFIG];
    if (!lastConfigMetadataBytes) throw new Error('Latest block is missing LAST_CONFIG metadata');
    const lastConfigMetadata = fabricProtos.common.Metadata.decode(lastConfigMetadataBytes);
    const lastConfig = fabricProtos.common.LastConfig.decode(lastConfigMetadata.value);
    const configBlockNumber = Number(lastConfig.index?.toString?.() ?? lastConfig.index ?? 0);
    const block = await this.getRawBlockByNumber(configBlockNumber);
    const configEnvelopeBytes = block.data?.data?.[0];
    if (!configEnvelopeBytes) {
      throw new Error('Channel configuration block does not contain an envelope');
    }
    const envelope = fabricProtos.common.Envelope.decode(configEnvelopeBytes);
    const payload = fabricProtos.common.Payload.decode(envelope.payload);
    const configEnvelope = fabricProtos.common.ConfigEnvelope.decode(payload.data);
    const consensusValue = configEnvelope.config?.channel_group?.groups?.Orderer?.values?.ConsensusType?.value;
    if (!consensusValue) {
      return { ordererType: null, configBlockNumber, consenterCount: null, consenters: [] };
    }
    const consensus = fabricProtos.orderer.ConsensusType.decode(consensusValue);
    let consenterCount: number | null = null;
    let consenters: Array<{ host: string; port: number; certificateSubject: string | null }> = [];
    try {
      const metadata = fabricProtos.etcdraft.ConfigMetadata.decode(consensus.metadata);
      consenters = (metadata.consenters || []).map((consenter: any) => ({
        host: consenter.host,
        port: Number(consenter.port),
        certificateSubject: (() => {
          try {
            return new crypto.X509Certificate(Buffer.from(consenter.server_tls_cert || [])).subject;
          } catch (_) {
            return null;
          }
        })(),
      }));
      consenterCount = consenters.length;
    } catch (_) {
      // The consensus type may not use etcdraft metadata.
    }
    return {
      ordererType: consensus.type || null,
      configBlockNumber,
      consenterCount,
      consenters,
    };
  }

  /** Return a block and its ledger validation metadata from QSCC. */
  public async getBlockDetails(blockNumber: number): Promise<any> {
    if (!Number.isSafeInteger(blockNumber) || blockNumber < 0) {
      throw new Error('Block number must be a non-negative safe integer');
    }
    const block = await this.getRawBlockByNumber(blockNumber);
    const dataEntries: Uint8Array[] = block.data?.data || [];
    const filterIndex = fabricProtos.common.BlockMetadataIndex.TRANSACTIONS_FILTER;
    const transactionFilter = block.metadata?.metadata?.[filterIndex] || Buffer.alloc(0);
    const transactions = dataEntries.map((entry, index) => {
      const parsed = this.parseEnvelope(entry);
      const validationCode = transactionFilter[index] ?? null;
      return {
        ...parsed,
        validationCode,
        validationStatus: validationCode === null
          ? 'UNKNOWN'
          : fabricProtos.protos.TxValidationCode[validationCode] || `UNKNOWN_${validationCode}`,
      };
    });
    const applicationTransactionCount = transactions.filter((transaction: any) =>
      Number(transaction.type) === Number(fabricProtos.common.HeaderType.ENDORSER_TRANSACTION)
    ).length;
    const calculatedDataHash = crypto.createHash('sha256').update(Buffer.concat(dataEntries.map((entry) => Buffer.from(entry)))).digest('hex');
    const headerDataHash = Buffer.from(block.header?.data_hash || []).toString('hex');
    const previousHash = Buffer.from(block.header?.previous_hash || []).toString('hex');
    const previousHashVerified = blockNumber === 0
      ? previousHash.length === 0
      : this.calculateBlockHeaderHash((await this.getRawBlockByNumber(blockNumber - 1)).header) === previousHash;

    return {
      number: Number(block.header?.number?.toString?.() ?? block.header?.number ?? blockNumber),
      previousHash,
      previousHashVerified,
      dataHash: headerDataHash,
      calculatedDataHash,
      dataHashVerified: calculatedDataHash === headerDataHash,
      blockHash: this.calculateBlockHeaderHash(block.header),
      transactionCount: transactions.length,
      applicationTransactionCount,
      transactions,
    };
  }

  /**
   * Calculate activity metrics from committed Fabric blocks.
   */
  public async getBlockchainStats(): Promise<{
    height: number;
    transactionsPerSecond: number;
    averageBlockTime: number;
    totalTransactions: number;
    validTransactions: number;
    invalidTransactions: number;
    unknownValidationTransactions: number;
  }> {
    try {
      const info = await this.getBlockchainInfo();
      const recentBlocks: any[] = [];
      const firstBlock = Math.max(0, info.height - 20);
      for (let number = firstBlock; number < info.height; number += 1) {
        recentBlocks.push(await this.getBlockDetails(number));
      }
      const timestamps = recentBlocks
        .flatMap((block) => block.transactions)
        .filter((transaction) =>
          Number(transaction.type) === Number(fabricProtos.common.HeaderType.ENDORSER_TRANSACTION) &&
          transaction.validationStatus === 'VALID' && transaction.timestamp
        )
        .map((transaction) => Date.parse(transaction.timestamp))
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
      const spanSeconds = timestamps.length > 1 ? Math.max(1, (timestamps[timestamps.length - 1] - timestamps[0]) / 1000) : 0;
      const transactionsPerSecond = spanSeconds > 0 ? (timestamps.length - 1) / spanSeconds : 0;
      const nonEmptyBlocks = recentBlocks.filter((block) => block.transactions.some((transaction: any) =>
        Number(transaction.type) === Number(fabricProtos.common.HeaderType.ENDORSER_TRANSACTION) &&
        transaction.validationStatus === 'VALID' && transaction.timestamp
      ));
      const averageBlockTime = nonEmptyBlocks.length > 1
        ? (Date.parse(nonEmptyBlocks[nonEmptyBlocks.length - 1].transactions.find((transaction: any) => Number(transaction.type) === Number(fabricProtos.common.HeaderType.ENDORSER_TRANSACTION) && transaction.validationStatus === 'VALID' && transaction.timestamp).timestamp) - Date.parse(nonEmptyBlocks[0].transactions.find((transaction: any) => Number(transaction.type) === Number(fabricProtos.common.HeaderType.ENDORSER_TRANSACTION) && transaction.validationStatus === 'VALID' && transaction.timestamp).timestamp)) / 1000 / (nonEmptyBlocks.length - 1)
        : 0;

      return {
        height: info.height,
        transactionsPerSecond: Math.round(transactionsPerSecond * 100) / 100,
        averageBlockTime: Number.isFinite(averageBlockTime) && averageBlockTime > 0 ? averageBlockTime : 0,
        totalTransactions: info.transactionCount,
        validTransactions: info.validTransactionCount,
        invalidTransactions: info.invalidTransactionCount,
        unknownValidationTransactions: info.unknownTransactionCount,
      };
    } catch (error) {
      logger.error('Failed to get blockchain stats:', error);
      return {
        height: 0,
        transactionsPerSecond: 0,
        averageBlockTime: 0,
        totalTransactions: 0,
        validTransactions: 0,
        invalidTransactions: 0,
        unknownValidationTransactions: 0,
      };
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

  public async queryShipments(params: { exporterId?: string }): Promise<ChaincodeResponse> {
    if (params.exporterId) {
      return this.getShipmentsByExporter(params.exporterId);
    } else {
      return this.getAllShipments();
    }
  }

  // ==================== QUALITY INSPECTION OPERATIONS ====================

  public async requestInspection(
    inspectionId: string,
    shipmentId: string,
    contractId: string,
    exporterId: string,
    scheduledDate: string = ''
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('RequestInspection', [
      inspectionId,
      shipmentId,
      contractId,
      exporterId,
      scheduledDate,
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
    // FIX: Call ClearDeclaration (not ClearCustomsDeclaration) 
    // ClearDeclaration properly updates shipment status to CUSTOMS_CLEARED
    return this.invokeChaincode('ClearDeclaration', [
      declarationId,
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

  // ==================== DOCUMENT HASH OPERATIONS ====================

  public async registerDocumentHash(
    documentId: string,
    entityId: string,
    entityType: string,
    hash: string,
    ipfsCID: string,
    filename: string,
    category: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('RegisterDocumentHash', [
      documentId,
      entityId,
      entityType,
      hash,
      ipfsCID || '',
      filename,
      category,
    ]);
  }

  public async readDocumentHash(documentId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('ReadDocumentHash', [documentId]);
  }

  public async verifyDocumentHash(
    documentId: string,
    observedHash: string,
    decision: 'VERIFIED' | 'REJECTED',
    verifierComments: string
  ): Promise<ChaincodeResponse> {
    return this.invokeChaincode('VerifyDocumentHash', [documentId, observedHash, decision, verifierComments || '']);
  }

  public async queryDocumentsByEntity(entityId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryDocumentsByEntity', [entityId]);
  }

  public async queryDocumentsByCategory(category: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('QueryDocumentsByCategory', [category]);
  }

  // ==================== DOCUMENT SIGNATURE OPERATIONS ====================
  // Added: Document signature tracking with blockchain-backed cryptographic signatures

  /**
   * Sign a document on the blockchain
   * Records cryptographic signature with signer's X.509 certificate
   */
  public async signDocument(
    documentId: string,
    documentHash: string,
    signatureType: string,
    remarks: string = ''
  ): Promise<ChaincodeResponse> {
    const result = await this.invokeChaincode('SignDocument', [
      documentId,
      documentHash,
      signatureType,
      remarks,
    ]);

    // ✅ Generate signatureId using chaincode's format: SIG_{documentID}_{mspID}_{timestamp}
    // Since SignDocument returns nil/error (not JSON), we construct the ID ourselves
    if (result.success) {
      const timestamp = Math.floor(Date.now() / 1000);
      const mspId = this.currentMspId || 'BanksMSP';
      const signatureId = `SIG_${documentId}_${mspId}_${timestamp}`;
      
      return {
        ...result,
        signatureId,
        data: {
          signatureId,
          documentId,
          signatureType,
          timestamp: new Date().toISOString()
        }
      };
    }

    return result;
  }

  /**
   * Get all signatures for a document
   * Returns complete signature history with signer details
   */
  public async getDocumentSignatures(documentId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('GetDocumentSignatures', [documentId]);
  }

  /**
   * Verify a document signature
   * Checks signature validity and certificate authenticity
   */
  public async verifyDocumentSignature(
    documentId: string,
    signatureId: string
  ): Promise<ChaincodeResponse> {
    const digestResult = await this.queryChaincode('VerifyDocumentSignature', [signatureId]);
    if (!digestResult.success) return digestResult;

    const signaturesResult = await this.getDocumentSignatures(documentId);
    const signatures = signaturesResult.data?.signatures || [];
    const signature = signatures.find((item: any) => item.signatureId === signatureId);
    if (!signature) {
      return { success: false, error: 'Signature record is not associated with the requested document' };
    }

    const transaction = signature.transactionId
      ? await this.getTransactionDetails(signature.transactionId)
      : null;
    const transactionVerified = !!transaction && transaction.validationStatus === 'VALID' &&
      transaction.creator.signatureValid === true && transaction.endorsers.length > 0 &&
      transaction.endorsers.every((endorser) => endorser.signatureValid === true);
    const certificateTrustVerified = !!transaction &&
      transaction.creator.certificateTrustStatus === 'TRUSTED_BY_CONFIGURED_MSP_ROOT' &&
      transaction.endorsers.every((endorser) => endorser.certificateTrustStatus === 'TRUSTED_BY_CONFIGURED_MSP_ROOT');
    const recordDigestValid = digestResult.data === true;
    const verified = recordDigestValid && transactionVerified && certificateTrustVerified;

    return {
      success: true,
      data: {
        documentId,
        signatureId,
        recordDigestValid,
        signatureAlgorithm: signature.signatureAlgorithm || 'LEGACY_RECORD_DIGEST',
        transaction,
        transactionVerified,
        certificateTrustStatus: transaction?.creator.certificateTrustStatus || 'UNAVAILABLE',
        verified,
        verificationStatus: verified ? 'VERIFIED'
          : recordDigestValid && transactionVerified
          ? 'CRYPTOGRAPHICALLY_VALID_UNANCHORED'
          : 'UNVERIFIED',
      },
    };
  }

  /**
   * Query all signatures for a specific document
   * Returns array of signatures with full details
   */
  public async querySignaturesByDocument(documentId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('QuerySignaturesByDocument', [documentId]);
  }

  /**
   * Query all signatures by a specific signer
   * Useful for audit trails and user activity tracking
   */
  public async querySignaturesBySigner(signerId: string): Promise<ChaincodeResponse> {
    return this.queryChaincode('QuerySignaturesBySigner', [signerId]);
  }

  /**
   * Get complete document signature history with audit trail
   * Returns chronological timeline of all signature events
   */
  public async getDocumentSignatureHistory(documentId: string): Promise<ChaincodeResponse> {
    const signaturesResult = await this.queryChaincode('GetDocumentSignatures', [documentId]);
    
    if (!signaturesResult.success) {
      return signaturesResult;
    }

    // Query audit logs for this document
    const auditResult = await this.queryChaincode('QueryAuditLogsByEntity', [
      'DOCUMENT',
      documentId,
    ]);

    const signatures = signaturesResult.data?.signatures || [];
    const signaturesWithLedger = await Promise.all(signatures.map(async (signature: any) => {
      const transaction = signature.transactionId
        ? await this.getTransactionDetails(signature.transactionId)
        : null;
      return { ...signature, ledgerTransaction: transaction };
    }));

    return {
      success: true,
      data: {
        signatures: signaturesWithLedger,
        auditTrail: auditResult.success ? auditResult.data : [],
        timeline: this.buildSignatureTimeline(
          signaturesWithLedger,
          auditResult.success ? auditResult.data : []
        ),
      },
    };
  }

  /**
   * Build chronological timeline from signatures and audit logs
   */
  private buildSignatureTimeline(signatures: any[], auditLogs: any[]): any[] {
    const timeline: any[] = [];

    // Add signatures to timeline
    signatures.forEach((sig: any) => {
      timeline.push({
        timestamp: sig.signedAt || sig.createdAt,
        type: 'SIGNATURE',
        action: sig.signatureType,
        performer: sig.signerCommonName,
        organization: sig.signerMspId,
        transactionId: sig.transactionId,
        blockNumber: sig.ledgerTransaction?.blockNumber ?? null,
        validationStatus: sig.ledgerTransaction?.validationStatus || 'UNAVAILABLE',
        endorsers: sig.ledgerTransaction?.endorsers || [],
        details: sig,
      });
    });

    // Add related audit logs
    auditLogs
      .filter((log: any) => log.action && log.action.includes('SIGNATURE'))
      .forEach((log: any) => {
        timeline.push({
          timestamp: log.timestamp || log.createdAt,
          type: 'AUDIT',
          action: log.action,
          performer: log.performedBy,
          organization: log.performedByOrg,
          details: log,
        });
      });

    // Sort by timestamp descending (newest first)
    return timeline.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });
  }

  /**
   * Verify document integrity and all signatures
   * Comprehensive verification for audit purposes
   */
  public async verifyDocumentIntegrity(
    documentId: string,
    currentHash: string
  ): Promise<ChaincodeResponse> {
    try {
      // Get document from blockchain
      const docResult = await this.readDocumentHash(documentId);
      if (!docResult.success) {
        return {
          success: false,
          error: 'Document not found on blockchain',
        };
      }

      const blockchainDoc = docResult.data;

      // Get all signatures
      const signaturesResult = await this.getDocumentSignatures(documentId);
      if (!signaturesResult.success) {
        return {
          success: false,
          error: 'Failed to retrieve document signatures',
        };
      }

      const signatures = signaturesResult.data?.signatures || [];
      const latestSignature = [...signatures].sort((left: any, right: any) =>
        new Date(right.signedAt || right.createdAt || 0).getTime() - new Date(left.signedAt || left.createdAt || 0).getTime()
      )[0];
      const expectedHash = latestSignature?.documentHash || blockchainDoc.hash;
      const hashMatch = expectedHash === currentHash;
      const transactionProofs = await Promise.all(signatures.map(async (signature: any) => {
        const txId = signature.transactionId || signature.TransactionID;
        const transaction = txId ? await this.getTransactionDetails(txId) : null;
        const hashBound = transaction?.chaincodeFunction === 'SignDocument' &&
          transaction.args[0] === documentId && transaction.args[1] === signature.documentHash;
        const cryptoValid = !!transaction && transaction.validationStatus === 'VALID' &&
          transaction.creator.signatureValid === true && transaction.endorsers.length > 0 &&
          transaction.endorsers.every((endorser) => endorser.signatureValid === true);
        const certificatesTrusted = !!transaction &&
          transaction.creator.certificateTrustStatus === 'TRUSTED_BY_CONFIGURED_MSP_ROOT' &&
          transaction.endorsers.every((endorser) => endorser.certificateTrustStatus === 'TRUSTED_BY_CONFIGURED_MSP_ROOT');
        return { txId: txId || null, hashBound, cryptoValid, certificatesTrusted, transaction };
      }));
      const ledgerProofValid = signatures.length > 0 && transactionProofs.every((proof) => proof.hashBound && proof.cryptoValid);
      const certificateTrustVerified = transactionProofs.length > 0 && transactionProofs.every((proof) => proof.certificatesTrusted);

      return {
        success: true,
        data: {
          documentId,
          blockchainHash: blockchainDoc.hash,
          expectedHash,
          currentHash,
          hashMatch,
          signatureCount: signatures.length,
          signatures,
          transactionProofs,
          ledgerProofValid,
          certificateTrustStatus: certificateTrustVerified ? 'TRUSTED_BY_CONFIGURED_MSP_ROOT' : 'UNANCHORED',
          verificationStatus: hashMatch && ledgerProofValid && certificateTrustVerified ? 'VERIFIED'
            : hashMatch && ledgerProofValid ? 'CRYPTOGRAPHICALLY_VALID_UNANCHORED'
            : hashMatch ? 'UNVERIFIED' : 'HASH_MISMATCH',
          verified: hashMatch && ledgerProofValid && certificateTrustVerified,
          verifiedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      logger.error('Document integrity verification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  // ==================== PASS-THROUGH METHODS ====================
  // These provide a lower-level interface for routes that call chaincode directly

  public async submitTransaction(functionName: string, ...args: string[]): Promise<ChaincodeResponse> {
    const result = await this.invokeChaincode(functionName, args);
    if (!result.success) {
      // Let the API route's error handler run. Several older routes used this
      // method without checking the response and would otherwise claim success.
      throw new Error(result.error || `Fabric rejected transaction ${functionName}`);
    }
    return { ...result, transactionId: result.txId };
  }

  public async evaluateTransaction(functionName: string, ...args: string[]): Promise<ChaincodeResponse> {
    // Preserve the legacy interface while honoring the authenticated
    // request's MSP identity and the shared Gateway's serialization lock.
    return this.queryChaincode(functionName, args);
  }

  /** Query an actual committed transaction envelope and its block validation code. */
  public async getTransactionDetails(txId: string): Promise<LedgerTransactionDetails | null> {
    try {
      const channelName = process.env.FABRIC_CHANNEL_NAME || 'coffeechannel';
      const rawTransaction = await this.evaluateQscc('GetTransactionByID', [channelName, txId]);
      const processed = fabricProtos.protos.ProcessedTransaction.decode(rawTransaction);
      if (!processed.transactionEnvelope) return null;
      const parsed = this.parseEnvelope(fabricProtos.common.Envelope.encode(processed.transactionEnvelope).finish());
      if (parsed.txId !== txId) return null;

      let blockNumber: number | null = null;
      let blockHash: string | null = null;
      try {
        const rawBlock = await this.evaluateQscc('GetBlockByTxID', [channelName, txId]);
        const block = this.decodeBlock(rawBlock);
        blockNumber = Number(block.header?.number?.toString?.() ?? block.header?.number ?? 0);
        blockHash = this.calculateBlockHeaderHash(block.header);
      } catch (blockError) {
        logger.warn(`QSCC returned transaction ${txId}, but its block number could not be read:`, blockError);
      }

      const validationCode = Number(processed.validationCode);
      const validationStatus = fabricProtos.protos.TxValidationCode[validationCode] || `UNKNOWN_${validationCode}`;
      return {
        ...parsed,
        validationCode,
        validationStatus,
        blockNumber,
        blockHash,
      };

    } catch (error: any) {
      if (/not found|does not exist/i.test(error?.message || '')) return null;
      logger.error(`Failed to get transaction details for ${txId}:`, {
        error: error.message
      });
      return null;
    }
  }
}

export default FabricService;

