// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Cryptographic User Management Service
// Manages user identities with blockchain-bound cryptographic credentials

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { DatabaseService } from './databaseService';
import FabricService from './fabricService';

interface CryptoKeyPair {
  publicKey: string;
  privateKey: string;
  certificate?: string;
}

interface BlockchainIdentity {
  userId: number;
  username: string;
  mspId: string;
  publicKey: string;
  certificate: string;
  certificateHash: string;
  enrollmentId: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  status: 'active' | 'suspended' | 'revoked' | 'expired';
}

export class CryptoUserService {
  private static instance: CryptoUserService;
  private db: DatabaseService;
  private fabricService: FabricService;
  private readonly KEYS_DIR = path.join(__dirname, '../../crypto-keys');
  private readonly CERTS_DIR = path.join(__dirname, '../../certificates');

  // MSP mapping for different organizations
  private readonly MSP_MAPPING: Record<string, string> = {
    'ECTA': 'ECTAMSP',
    'ECX': 'ECXMSP',
    'NBE': 'NBEMSP',
    'BANKS': 'BanksMSP',
    'CUSTOMS': 'CustomsMSP',
    'SHIPPING': 'ShippingMSP',
    'EXPORTER': 'ECTAMSP', // Exporters enroll through ECTA
    'ADMIN': 'ECTAMSP',
  };

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.fabricService = FabricService.getInstance();
    this.ensureDirectories();
  }

  public static getInstance(): CryptoUserService {
    if (!CryptoUserService.instance) {
      CryptoUserService.instance = new CryptoUserService();
    }
    return CryptoUserService.instance;
  }

  /**
   * Ensure crypto directories exist
   */
  private ensureDirectories(): void {
    [this.KEYS_DIR, this.CERTS_DIR].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
        logger.info(`Created directory: ${dir}`);
      }
    });
  }

  /**
   * Generate RSA key pair for user
   */
  public generateKeyPair(): CryptoKeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
        cipher: 'aes-256-cbc',
        passphrase: process.env.KEY_PASSPHRASE || 'cecbs-secure-passphrase',
      },
    });

    return { publicKey, privateKey };
  }

  /**
   * Generate self-signed certificate for user
   */
  public generateCertificate(
    username: string,
    organization: string,
    publicKey: string,
    validityDays: number = 365
  ): string {
    // In production, this should use a proper CA
    // For now, we'll generate a self-signed cert structure
    
    const notBefore = new Date();
    const notAfter = new Date();
    notAfter.setDate(notAfter.getDate() + validityDays);

    const certData = {
      subject: {
        CN: username,
        O: organization,
        OU: 'CECBS',
        C: 'ET',
      },
      issuer: {
        CN: 'CECBS Certificate Authority',
        O: 'Ethiopian Coffee Export Consortium',
        C: 'ET',
      },
      serialNumber: crypto.randomBytes(16).toString('hex'),
      notBefore: notBefore.toISOString(),
      notAfter: notAfter.toISOString(),
      publicKey: publicKey,
    };

    // Create certificate in PEM-like format
    const certContent = JSON.stringify(certData, null, 2);
    const cert = `-----BEGIN CERTIFICATE-----\n${Buffer.from(certContent).toString('base64')}\n-----END CERTIFICATE-----`;

    return cert;
  }

  /**
   * Enroll user on blockchain with cryptographic identity
   */
  public async enrollUser(
    userId: number,
    username: string,
    role: string,
    organization: string
  ): Promise<BlockchainIdentity> {
    try {
      logger.info(`Enrolling user ${username} with cryptographic identity...`);

      // Generate key pair
      const keyPair = this.generateKeyPair();

      // Generate certificate
      const certificate = this.generateCertificate(
        username,
        organization,
        keyPair.publicKey,
        365 // Valid for 1 year
      );

      // Calculate certificate hash for blockchain verification
      const certificateHash = crypto
        .createHash('sha256')
        .update(certificate)
        .digest('hex');

      // Get MSP ID for the role
      const mspId = this.MSP_MAPPING[role] || 'ECTAMSP';

      // Store keys securely
      const keyPath = path.join(this.KEYS_DIR, `${username}.key`);
      const certPath = path.join(this.CERTS_DIR, `${username}.cert`);

      fs.writeFileSync(keyPath, keyPair.privateKey, { mode: 0o600 });
      fs.writeFileSync(certPath, certificate, { mode: 0o644 });

      logger.info(`Stored cryptographic credentials for ${username}`);

      // Create blockchain identity record
      const identity: BlockchainIdentity = {
        userId,
        username,
        mspId,
        publicKey: keyPair.publicKey,
        certificate,
        certificateHash,
        enrollmentId: `${mspId}.${username}`,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        status: 'active',
      };

      // Store in database
      await this.storeBlockchainIdentity(identity);

      // Register identity with Fabric CA (if available)
      await this.registerFabricIdentity(identity);

      logger.info(`✅ User ${username} enrolled successfully with blockchain identity`);

      return identity;

    } catch (error) {
      logger.error(`Failed to enroll user ${username}:`, error);
      throw error;
    }
  }

  /**
   * Store blockchain identity in database
   */
  private async storeBlockchainIdentity(identity: BlockchainIdentity): Promise<void> {
    const query = `
      INSERT INTO blockchain_identities (
        user_id, username, msp_id, public_key, certificate, 
        certificate_hash, enrollment_id, created_at, expires_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id) DO UPDATE SET
        msp_id = EXCLUDED.msp_id,
        public_key = EXCLUDED.public_key,
        certificate = EXCLUDED.certificate,
        certificate_hash = EXCLUDED.certificate_hash,
        enrollment_id = EXCLUDED.enrollment_id,
        expires_at = EXCLUDED.expires_at,
        status = EXCLUDED.status
    `;

    await this.db.run(query, [
      identity.userId,
      identity.username,
      identity.mspId,
      identity.publicKey,
      identity.certificate,
      identity.certificateHash,
      identity.enrollmentId,
      identity.createdAt,
      identity.expiresAt,
      identity.status,
    ]);
  }

  /**
   * Register identity with Fabric CA
   */
  private async registerFabricIdentity(identity: BlockchainIdentity): Promise<void> {
    try {
      // This would interact with Fabric CA in production
      // For now, we'll just log the registration
      logger.info(`Registering ${identity.username} with Fabric CA (${identity.mspId})`);
      
      // In production:
      // await fabricCA.register({
      //   enrollmentID: identity.enrollmentId,
      //   role: 'client',
      //   affiliation: identity.mspId,
      //   maxEnrollments: -1,
      // });

    } catch (error) {
      logger.warn(`Could not register with Fabric CA:`, error);
      // Don't fail enrollment if CA registration fails
    }
  }

  /**
   * Verify user's cryptographic signature
   */
  public async verifySignature(
    userId: number,
    data: string,
    signature: string
  ): Promise<boolean> {
    try {
      // Get user's public key
      const identity = await this.getBlockchainIdentity(userId);
      if (!identity) {
        return false;
      }

      // Verify signature
      const verify = crypto.createVerify('SHA256');
      verify.update(data);
      verify.end();

      return verify.verify(identity.publicKey, signature, 'base64');

    } catch (error) {
      logger.error(`Signature verification failed:`, error);
      return false;
    }
  }

  /**
   * Sign data with user's private key
   */
  public async signData(username: string, data: string): Promise<string> {
    try {
      const keyPath = path.join(this.KEYS_DIR, `${username}.key`);
      
      if (!fs.existsSync(keyPath)) {
        throw new Error(`Private key not found for user ${username}`);
      }

      const privateKey = fs.readFileSync(keyPath, 'utf8');

      const sign = crypto.createSign('SHA256');
      sign.update(data);
      sign.end();

      return sign.sign({
        key: privateKey,
        passphrase: process.env.KEY_PASSPHRASE || 'cecbs-secure-passphrase',
      }, 'base64');

    } catch (error) {
      logger.error(`Data signing failed:`, error);
      throw error;
    }
  }

  /**
   * Get blockchain identity for user
   */
  public async getBlockchainIdentity(userId: number): Promise<BlockchainIdentity | null> {
    const query = `
      SELECT * FROM blockchain_identities WHERE user_id = $1
    `;

    const row = await this.db.get(query, [userId]);
    return row as BlockchainIdentity | null;
  }

  /**
   * Revoke user's blockchain identity
   */
  public async revokeIdentity(
    userId: number,
    reason: string
  ): Promise<void> {
    const query = `
      UPDATE blockchain_identities
      SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `;

    await this.db.run(query, [userId]);

    logger.warn(`🔒 Blockchain identity revoked for user ${userId}: ${reason}`);
  }

  /**
   * Renew user's certificate
   */
  public async renewCertificate(
    userId: number,
    validityDays: number = 365
  ): Promise<BlockchainIdentity> {
    const identity = await this.getBlockchainIdentity(userId);
    
    if (!identity) {
      throw new Error('User identity not found');
    }

    // Generate new certificate with existing public key
    const newCertificate = this.generateCertificate(
      identity.username,
      identity.mspId,
      identity.publicKey,
      validityDays
    );

    const newCertificateHash = crypto
      .createHash('sha256')
      .update(newCertificate)
      .digest('hex');

    // Update certificate
    const query = `
      UPDATE blockchain_identities
      SET certificate = $1, certificate_hash = $2, 
          expires_at = $3, status = 'active'
      WHERE user_id = $4
    `;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    await this.db.run(query, [
      newCertificate,
      newCertificateHash,
      expiresAt,
      userId,
    ]);

    // Update certificate file
    const certPath = path.join(this.CERTS_DIR, `${identity.username}.cert`);
    fs.writeFileSync(certPath, newCertificate, { mode: 0o644 });

    logger.info(`✅ Certificate renewed for user ${identity.username}`);

    return {
      ...identity,
      certificate: newCertificate,
      certificateHash: newCertificateHash,
      expiresAt,
    };
  }

  /**
   * Get all blockchain identities with status
   */
  public async getAllIdentities(): Promise<BlockchainIdentity[]> {
    const query = `
      SELECT bi.*, u.role, u.organization, u.status as user_status
      FROM blockchain_identities bi
      JOIN users u ON bi.user_id = u.id
      ORDER BY bi.created_at DESC
    `;

    const rows = await this.db.all(query, []);
    return rows as BlockchainIdentity[];
  }

  /**
   * Check if certificate is expiring soon (within 30 days)
   */
  public async checkExpiringCertificates(): Promise<BlockchainIdentity[]> {
    const query = `
      SELECT * FROM blockchain_identities
      WHERE status = 'active'
      AND expires_at < $1
      ORDER BY expires_at ASC
    `;

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const rows = await this.db.all(query, [thirtyDaysFromNow]);
    return rows as BlockchainIdentity[];
  }

  /**
   * Export user's cryptographic credentials (for backup)
   */
  public async exportCredentials(username: string): Promise<{
    publicKey: string;
    certificate: string;
    mspId: string;
  }> {
    const certPath = path.join(this.CERTS_DIR, `${username}.cert`);
    
    if (!fs.existsSync(certPath)) {
      throw new Error(`Credentials not found for user ${username}`);
    }

    const certificate = fs.readFileSync(certPath, 'utf8');
    
    const identity = await this.db.get(
      'SELECT public_key, msp_id FROM blockchain_identities WHERE username = $1',
      [username]
    );

    if (!identity) {
      throw new Error(`Identity not found for user ${username}`);
    }

    return {
      publicKey: identity.public_key,
      certificate,
      mspId: identity.msp_id,
    };
  }
}

export default CryptoUserService;
