// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Cryptographic User Management Service
// Manages legacy application signatures; Fabric MSP enrollment is organization-owned.

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import FabricCAServices = require('fabric-ca-client');
import { Wallet } from 'fabric-network';
import { logger } from '../utils/logger';
import { DatabaseService } from './databaseService';
import FabricService from './fabricService';
import { openSecureFabricWallet } from '../utils/fabricWalletStorage';
import { getFabricCertificateTrustStatus } from '../utils/fabricCertificateTrust';

interface BlockchainIdentity {
  userId: number;
  username: string;
  mspId: string;
  publicKey: string;
  certificate: string;
  certificateHash: string;
  enrollmentId: string;
  certifiedRole?: string;
  certifiedOrganization?: string;
  revocationStatus?: string;
  crlGeneratedAt?: Date;
  crlHash?: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  status: 'active' | 'suspended' | 'revoked' | 'expired';
}

export class FabricCaUnavailableError extends Error {
  public readonly code = 'FABRIC_CA_NOT_CONFIGURED';

  constructor(operation: 'enroll' | 'revoke' | 'renew') {
    super(`Fabric CA ${operation} is not configured. No Fabric MSP identity was changed.`);
    this.name = 'FabricCaUnavailableError';
  }
}

export class CryptoUserService {
  private static instance: CryptoUserService;
  private db: DatabaseService;
  private readonly KEYS_DIR = path.join(__dirname, '../../crypto-keys');
  private readonly CERTS_DIR = path.join(__dirname, '../../certificates');

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.ensureDirectories();
  }

  private normalizeOrganization(organization: string, role: string): { mspId: string; configKey: string } {
    const org = organization.toUpperCase().replace(/[^A-Z0-9]/g, ' ');
    const orgMsp = organization.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const normalizedRole = role.toUpperCase().replace(/[^A-Z0-9]/g, ' ');
    const directMsp = {
      ECTAMSP: { mspId: 'ECTAMSP', configKey: 'ECTA' },
      ECXMSP: { mspId: 'ECXMSP', configKey: 'ECX' },
      BANKSMSP: { mspId: 'BanksMSP', configKey: 'BANKS' },
      NBEMSP: { mspId: 'NBEMSP', configKey: 'NBE' },
      CUSTOMSMSP: { mspId: 'CustomsMSP', configKey: 'CUSTOMS' },
      SHIPPINGMSP: { mspId: 'ShippingMSP', configKey: 'SHIPPING' },
    } as const;
    if (orgMsp in directMsp) return directMsp[orgMsp as keyof typeof directMsp];
    if (normalizedRole.trim() === 'ADMIN') return { mspId: 'ECTAMSP', configKey: 'ECTA' };
    if (/\b(ECTA|EXPORTER)\b/.test(org) || /\b(ECTA|EXPORTER)\b/.test(normalizedRole)) return { mspId: 'ECTAMSP', configKey: 'ECTA' };
    if (/\bECX\b/.test(org) || /\bECX\b/.test(normalizedRole)) return { mspId: 'ECXMSP', configKey: 'ECX' };
    if (/\b(BANK|BANKS)\b/.test(org) || /\b(BANK|BANKS)\b/.test(normalizedRole)) return { mspId: 'BanksMSP', configKey: 'BANKS' };
    if (/\bNBE\b/.test(org) || /\bNBE\b/.test(normalizedRole)) return { mspId: 'NBEMSP', configKey: 'NBE' };
    if (/\bCUSTOMS\b/.test(org) || /\bCUSTOMS\b/.test(normalizedRole)) return { mspId: 'CustomsMSP', configKey: 'CUSTOMS' };
    if (/\b(SHIPPING|LOGISTICS)\b/.test(org) || /\b(SHIPPING|LOGISTICS)\b/.test(normalizedRole)) return { mspId: 'ShippingMSP', configKey: 'SHIPPING' };
    throw new Error(`No Fabric MSP is configured for user organization "${organization}" and role "${role}"`);
  }

  private async getCaContext(organization: string, role: string, operation: 'enroll' | 'revoke' | 'renew'): Promise<{
    mspId: string;
    configKey: string;
    ca: FabricCAServices;
    wallet: Wallet;
    registrar: any;
  }> {
    const { mspId, configKey } = this.normalizeOrganization(organization, role);
    const caUrl = process.env[`FABRIC_CA_URL_${configKey}`];
    const caName = process.env[`FABRIC_CA_NAME_${configKey}`];
    const tlsCaPath = process.env[`FABRIC_CA_TLS_CA_${configKey}`];
    if (!caUrl || !caName || !tlsCaPath || !fs.existsSync(tlsCaPath)) {
      throw new FabricCaUnavailableError(operation);
    }

    const wallet = await openSecureFabricWallet(process.env.FABRIC_WALLET_PATH || './wallet');
    const registrarLabel = `admin-${mspId}`;
    const registrarIdentity = await wallet.get(registrarLabel);
    if (!registrarIdentity || registrarIdentity.type !== 'X.509' || registrarIdentity.mspId !== mspId) {
      throw new FabricCaUnavailableError(operation);
    }
    const provider = wallet.getProviderRegistry().getProvider(registrarIdentity.type);
    const registrar = await provider.getUserContext(registrarIdentity, registrarLabel);
    const ca = new FabricCAServices(
      caUrl,
      { trustedRoots: fs.readFileSync(tlsCaPath), verify: true },
      caName
    );
    return { mspId, configKey, ca, wallet, registrar };
  }

  private createIdentityRecord(
    userId: number,
    username: string,
    mspId: string,
    enrollmentId: string,
    certificatePem: string,
    certifiedRole?: string,
    certifiedOrganization?: string,
    status: BlockchainIdentity['status'] = 'active'
  ): BlockchainIdentity {
    const trustStatus = getFabricCertificateTrustStatus(certificatePem, mspId);
    if (trustStatus !== 'TRUSTED_BY_CONFIGURED_MSP_ROOT') {
      throw new Error(`Issued certificate is not trusted by ${mspId}'s configured MSP root (${trustStatus})`);
    }
    const certificate = new crypto.X509Certificate(certificatePem);
    return {
      userId,
      username,
      mspId,
      publicKey: certificate.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      certificate: certificatePem,
      certificateHash: crypto.createHash('sha256').update(certificatePem).digest('hex'),
      enrollmentId,
      certifiedRole,
      certifiedOrganization,
      createdAt: new Date(),
      expiresAt: new Date(certificate.validTo),
      status,
    };
  }

  private async saveIdentityRecord(identity: BlockchainIdentity): Promise<void> {
    await this.db.run(
      `INSERT INTO blockchain_identities
        (user_id, username, msp_id, public_key, certificate, certificate_hash, enrollment_id, certified_role, certified_organization, created_at, expires_at, revoked_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10, NULL, 'active')
       ON CONFLICT (user_id) DO UPDATE SET
        username = EXCLUDED.username,
        msp_id = EXCLUDED.msp_id,
        public_key = EXCLUDED.public_key,
        certificate = EXCLUDED.certificate,
        certificate_hash = EXCLUDED.certificate_hash,
        enrollment_id = EXCLUDED.enrollment_id,
        certified_role = EXCLUDED.certified_role,
        certified_organization = EXCLUDED.certified_organization,
        created_at = CURRENT_TIMESTAMP,
        expires_at = EXCLUDED.expires_at,
        revoked_at = NULL,
        status = 'active'`,
      [identity.userId, identity.username, identity.mspId, identity.publicKey, identity.certificate,
        identity.certificateHash, identity.enrollmentId, identity.certifiedRole || null,
        identity.certifiedOrganization || null, identity.expiresAt]
    );
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
   * Enroll user on blockchain with cryptographic identity
   */
  public async enrollUser(
    userId: number,
    username: string,
    role: string,
    organization: string
  ): Promise<BlockchainIdentity> {
    const target = await this.db.get(
      'SELECT id, username, role, organization, email, is_active FROM users WHERE id = $1',
      [userId]
    );
    if (!target || target.username !== username || target.role !== role || target.organization !== organization) {
      throw new Error('Enrollment details do not match the selected database user');
    }
    if (target.is_active === false) throw new Error('An inactive user cannot receive a Fabric identity');

    const { mspId, ca, wallet, registrar } = await this.getCaContext(organization, role, 'enroll');
    const walletLabel = `user-${mspId}-${userId}`;
    const currentRecord = await this.getBlockchainIdentity(userId);
    if (currentRecord?.enrollmentId.startsWith('cecbs-user-') && currentRecord.status === 'active' &&
        (currentRecord.mspId !== mspId || currentRecord.certifiedRole !== target.role ||
          currentRecord.certifiedOrganization !== target.organization)) {
      throw new Error('This user has an active certificate issued for a different MSP, role, or organization. The prior organization must revoke it before re-enrollment.');
    }
    let existingWalletIdentity = await wallet.get(walletLabel);
    if (existingWalletIdentity) {
      if (existingWalletIdentity.mspId !== mspId || existingWalletIdentity.type !== 'X.509') {
        throw new Error(`Wallet identity "${walletLabel}" is not a valid ${mspId} X.509 identity`);
      }
      const certificate = (existingWalletIdentity as any).credentials?.certificate;
      if (!certificate) throw new Error(`Wallet identity "${walletLabel}" has no X.509 certificate`);
      const parsedCertificate = new crypto.X509Certificate(certificate);
      if ((currentRecord && currentRecord.status !== 'active') || Date.now() > Date.parse(parsedCertificate.validTo)) {
        await wallet.remove(walletLabel);
        existingWalletIdentity = undefined;
      }
      if (existingWalletIdentity && (!currentRecord?.enrollmentId.startsWith('cecbs-user-') || currentRecord.status !== 'active')) {
        throw new Error(`Wallet identity "${walletLabel}" exists without a matching active Fabric CA enrollment record; refusing to label it as CA-issued`);
      }
      if (existingWalletIdentity) {
        const existing = this.createIdentityRecord(
          userId,
          username,
          mspId,
          currentRecord!.enrollmentId,
          certificate,
          target.role,
          target.organization
        );
        await this.saveIdentityRecord(existing);
        return existing;
      }
    }

    const enrollmentId = currentRecord?.enrollmentId?.startsWith('cecbs-user-') && currentRecord.status === 'active'
      ? currentRecord.enrollmentId
      : `cecbs-user-${userId}-${Date.now()}`;
    const enrollmentSecret = crypto.randomBytes(32).toString('base64url');
    const affiliation = process.env[`FABRIC_CA_AFFILIATION_${this.normalizeOrganization(organization, role).configKey}`];
    if (!affiliation) throw new FabricCaUnavailableError('enroll');

    const identityService = ca.newIdentityService();
    const attributes: FabricCAServices.IKeyValueAttribute[] = [
      { name: 'userID', value: String(target.id), ecert: true },
      { name: 'role', value: target.role, ecert: true },
      { name: 'organization', value: target.organization, ecert: true },
    ];
    if (target.email) attributes.push({ name: 'email', value: target.email, ecert: true });
    try {
      await ca.register({
        enrollmentID: enrollmentId,
        enrollmentSecret,
        affiliation,
        role: 'client',
        maxEnrollments: 1,
        attrs: attributes,
      }, registrar);
    } catch (registrationError) {
      // If a previous request registered the CA identity but failed before
      // storing its key, rotate its one-time secret and finish enrollment.
      const existing = await identityService.getOne(enrollmentId, registrar).catch(() => null);
      if (!existing?.success) throw registrationError;
      await identityService.update(enrollmentId, {
        enrollmentID: enrollmentId,
        enrollmentSecret,
        affiliation,
        type: 'client',
        maxEnrollments: 1,
        attrs: attributes,
      }, registrar);
    }

    const enrollment = await ca.enroll({ enrollmentID: enrollmentId, enrollmentSecret });
    const identity = {
      type: 'X.509',
      mspId,
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes().toString(),
      },
    };
    await wallet.put(walletLabel, identity);
    try {
      const record = this.createIdentityRecord(
        userId, username, mspId, enrollmentId, enrollment.certificate, target.role, target.organization
      );
      await this.saveIdentityRecord(record);
      return record;
    } catch (error) {
      await wallet.remove(walletLabel).catch(() => undefined);
      throw error;
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
      SELECT user_id AS "userId", username, msp_id AS "mspId", public_key AS "publicKey",
        certificate, certificate_hash AS "certificateHash", enrollment_id AS "enrollmentId",
        certified_role AS "certifiedRole", certified_organization AS "certifiedOrganization",
        created_at AS "createdAt", expires_at AS "expiresAt", revoked_at AS "revokedAt", status,
        revocation_status AS "revocationStatus", crl_generated_at AS "crlGeneratedAt", crl_hash AS "crlHash"
      FROM blockchain_identities WHERE user_id = $1
    `;

    const row = await this.db.get(query, [userId]);
    if (row?.status === 'active' && new Date(row.expiresAt).getTime() <= Date.now()) {
      row.status = 'expired';
    }
    return row as BlockchainIdentity | null;
  }

  /**
   * Revoke user's blockchain identity
   */
  public async revokeIdentity(
    userId: number,
    reason: string
  ): Promise<{ mspId: string; crlGenerated: boolean; crlHash: string | null }> {
    const record = await this.getBlockchainIdentity(userId);
    if (!record) throw new Error('User has no enrolled Fabric identity');
    if (record.status !== 'active') throw new Error(`Cannot revoke a ${record.status} Fabric identity`);
    const user = await this.db.get('SELECT role, organization FROM users WHERE id = $1', [userId]);
    if (!user) throw new Error('User no longer exists');
    const { mspId, ca, wallet, registrar } = await this.getCaContext(record.mspId, user.role, 'revoke');
    await ca.revoke({ enrollmentID: record.enrollmentId, reason }, registrar);
    await wallet.remove(`user-${record.mspId}-${userId}`).catch((error) => {
      logger.warn(`Could not remove revoked Fabric identity for user ${userId} from the local wallet:`, error instanceof Error ? error.message : 'unknown error');
    });
    await this.db.run(
      `UPDATE blockchain_identities SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP,
        revocation_reason = $2, revocation_status = 'PENDING_MSP_CRL_GENERATION'
       WHERE user_id = $1`,
      [userId, reason]
    );
    // A Fabric CA revocation takes effect for transaction validation only after
    // the owning MSP's updated CRL is approved and committed in channel config.
    await FabricService.getInstance().disconnect();
    try {
      const crl = await ca.generateCRL({}, registrar);
      const crlText = Buffer.isBuffer(crl) ? crl.toString() : String(crl);
      const walletPath = path.resolve(process.env.FABRIC_WALLET_PATH || './wallet');
      const crlDirectory = path.join(walletPath, 'revocation-lists');
      fs.mkdirSync(crlDirectory, { recursive: true, mode: 0o700 });
      fs.chmodSync(crlDirectory, 0o700);
      const crlPath = path.join(crlDirectory, `${mspId}-${Date.now()}.pem`);
      fs.writeFileSync(crlPath, crlText, { mode: 0o600 });
      fs.chmodSync(crlPath, 0o600);
      const crlHash = crypto.createHash('sha256').update(crlText).digest('hex');
      await this.db.run(
        `UPDATE blockchain_identities SET crl_generated_at = CURRENT_TIMESTAMP,
          crl_hash = $2, revocation_status = 'PENDING_MSP_CRL_UPDATE' WHERE user_id = $1`,
        [userId, crlHash]
      );
      return {
        mspId,
        crlGenerated: true,
        crlHash,
      };
    } catch (error) {
      logger.warn(`Fabric CA revoked user ${userId}, but its updated CRL could not be generated:`, error instanceof Error ? error.message : 'unknown error');
      await this.db.run(
        `UPDATE blockchain_identities SET revocation_status = 'PENDING_MSP_CRL_GENERATION' WHERE user_id = $1`,
        [userId]
      );
      return { mspId, crlGenerated: false, crlHash: null };
    }
  }

  /**
   * Renew user's certificate
   */
  public async renewCertificate(userId: number): Promise<BlockchainIdentity> {
    const record = await this.getBlockchainIdentity(userId);
    if (!record || record.status !== 'active') throw new Error('An active Fabric identity is required for renewal');
    const user = await this.db.get('SELECT username, role, organization FROM users WHERE id = $1', [userId]);
    if (!user) throw new Error('User no longer exists');
    const { mspId, ca, wallet } = await this.getCaContext(user.organization, user.role, 'renew');
    if (mspId !== record.mspId || record.certifiedRole !== user.role || record.certifiedOrganization !== user.organization) {
      throw new Error('The active certificate no longer matches this user’s organization or role. Revoke it with the issuing MSP before enrollment.');
    }
    const walletLabel = `user-${mspId}-${userId}`;
    const identity = await wallet.get(walletLabel);
    if (!identity || identity.type !== 'X.509') throw new FabricCaUnavailableError('renew');
    const provider = wallet.getProviderRegistry().getProvider(identity.type);
    const currentUser = await provider.getUserContext(identity, walletLabel);
    const enrollment = await ca.reenroll(currentUser, [
      { name: 'userID', optional: false },
      { name: 'role', optional: false },
      { name: 'organization', optional: false },
      { name: 'email', optional: true },
    ]);
    const renewedWalletIdentity = {
      type: 'X.509',
      mspId,
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes().toString(),
      },
    };
    await wallet.put(walletLabel, renewedWalletIdentity);
    const renewed = this.createIdentityRecord(
      userId, user.username, mspId, record.enrollmentId, enrollment.certificate, user.role, user.organization
    );
    await this.saveIdentityRecord(renewed);
    await FabricService.getInstance().disconnect();
    return renewed;
  }

  /**
   * Get all blockchain identities with status
   */
  public async getAllIdentities(): Promise<BlockchainIdentity[]> {
    const query = `
      SELECT bi.user_id AS "userId", bi.username, bi.msp_id AS "mspId", bi.public_key AS "publicKey",
        bi.certificate, bi.certificate_hash AS "certificateHash", bi.enrollment_id AS "enrollmentId",
        bi.certified_role AS "certifiedRole", bi.certified_organization AS "certifiedOrganization",
        bi.created_at AS "createdAt", bi.expires_at AS "expiresAt", bi.revoked_at AS "revokedAt",
        bi.revocation_status AS "revocationStatus", bi.crl_generated_at AS "crlGeneratedAt", bi.crl_hash AS "crlHash",
        bi.status, u.role, u.organization, u.status as user_status
      FROM blockchain_identities bi
      JOIN users u ON bi.user_id = u.id
      ORDER BY bi.created_at DESC
    `;

    const rows = await this.db.all(query, []);
    rows.forEach((identity) => {
      if (identity.status === 'active' && new Date(identity.expiresAt).getTime() <= Date.now()) {
        identity.status = 'expired';
      }
    });
    return rows as BlockchainIdentity[];
  }

  /**
   * Check if certificate is expiring soon (within 30 days)
   */
  public async checkExpiringCertificates(): Promise<BlockchainIdentity[]> {
    const query = `
      SELECT user_id AS "userId", username, msp_id AS "mspId", public_key AS "publicKey",
        certificate, certificate_hash AS "certificateHash", enrollment_id AS "enrollmentId",
        certified_role AS "certifiedRole", certified_organization AS "certifiedOrganization",
        created_at AS "createdAt", expires_at AS "expiresAt", revoked_at AS "revokedAt", status,
        revocation_status AS "revocationStatus", crl_generated_at AS "crlGeneratedAt", crl_hash AS "crlHash"
      FROM blockchain_identities
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
