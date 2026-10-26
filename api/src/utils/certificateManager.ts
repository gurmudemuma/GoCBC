// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Certificate Manager - X.509 Certificate Handling for Hyperledger Fabric

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';
import { getFabricCertificateTrustStatus } from './fabricCertificateTrust';
import { X509Certificate } from '../services/digitalSignatureService';

// Try to load node-forge, use fallback if not available
let forge: any = null;
try {
  forge = require('node-forge');
  logger.info('✅ CertificateManager: node-forge loaded');
} catch (e) {
  logger.warn('⚠️  CertificateManager: node-forge not available, using simplified mode');
}

/**
 * Certificate Manager for Hyperledger Fabric X.509 Certificates
 * Extracts and manages certificates from blockchain identities
 */
export class CertificateManager {
  
  private static readonly CRYPTO_CONFIG_PATH = process.env.CRYPTO_CONFIG_PATH || '/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto';
  
  /**
   * Get user's X.509 certificate and private key from Fabric identity
   */
  public static async getUserCertificate(
    userId: string,
    organization: string
  ): Promise<X509Certificate> {
    try {
      logger.info(`📜 Retrieving certificate for user: ${userId} (${organization})`);
      
      // Map organization to MSP ID
      const mspId = this.getOrgMSPID(organization);
      
      // Try to load from Fabric wallet/crypto-config
      const certPath = this.resolveCertificatePath(userId, mspId);
      const keyPath = this.resolvePrivateKeyPath(userId, mspId);
      
      if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        return await this.loadCertificateFromFiles(certPath, keyPath, mspId);
      }
      
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`No X.509 signing identity was found for ${userId} in ${mspId}`);
      }

      // Development-only fallback; its proof is explicitly marked untrusted.
      logger.warn(`Certificate files not found, generating self-signed cert for ${userId}`);
      return await this.generateSelfSignedCertificate(userId, organization);
      
    } catch (error) {
      logger.error(`Failed to get user certificate for ${userId}`, error);
      throw error;
    }
  }
  
  /**
   * Load certificate from PEM files (with fallback)
   */
  private static async loadCertificateFromFiles(
    certPath: string,
    keyPath: string,
    mspId: string
  ): Promise<X509Certificate> {
    try {
      const pemCertificate = fs.readFileSync(certPath, 'utf8');
      const pemPrivateKey = fs.readFileSync(keyPath, 'utf8');
      const cert = new crypto.X509Certificate(pemCertificate);
      const challenge = crypto.randomBytes(32);
      const keyMatchesCertificate = crypto.verify(
        'sha256',
        challenge,
        cert.publicKey,
        crypto.sign('sha256', challenge, pemPrivateKey),
      );
      if (!keyMatchesCertificate) {
        throw new Error('Private key does not match the configured Fabric signing certificate');
      }

      const readAttribute = (name: string, value: string, fallback: string) =>
        value.match(new RegExp(`(?:^|\\n|,)\\s*${name}=([^,\\n]+)`))?.[1]?.trim() || fallback;
      return {
        pemCertificate,
        pemPrivateKey,
        mspId,
        subject: {
          commonName: readAttribute('CN', cert.subject, 'Unknown'),
          organization: readAttribute('O', cert.subject, mspId),
          country: readAttribute('C', cert.subject, 'ET'),
        },
        issuer: {
          commonName: readAttribute('CN', cert.issuer, 'Unknown'),
          organization: readAttribute('O', cert.issuer, 'Unknown'),
        },
        validFrom: new Date(cert.validFrom),
        validTo: new Date(cert.validTo),
        serialNumber: cert.serialNumber,
        trustStatus: getFabricCertificateTrustStatus(pemCertificate, mspId) as X509Certificate['trustStatus'],
      };
    } catch (error) {
      logger.error('Failed to load certificate from files', error);
      throw error;
    }
  }
  
  /**
   * Generate self-signed certificate for development/testing (with fallback)
   */
  private static async generateSelfSignedCertificate(
    userId: string,
    organization: string
  ): Promise<X509Certificate> {
    try {
      logger.info(`🔧 Generating self-signed certificate for ${userId}`);
      
      if (forge) {
        // Generate key pair using node-forge
        const keys = forge.pki.rsa.generateKeyPair(2048);
        const cert = forge.pki.createCertificate();
        cert.publicKey = keys.publicKey;
        cert.serialNumber = Date.now().toString();
        
        const now = new Date();
        cert.validity.notBefore = now;
        cert.validity.notAfter = new Date();
        cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 5);
        
        const attrs = [
          { name: 'commonName', value: userId },
          { name: 'organizationName', value: organization },
          { name: 'countryName', value: 'ET' },
          { shortName: 'ST', value: 'Addis Ababa' },
          { shortName: 'OU', value: 'CECBS' },
        ];
        cert.setSubject(attrs);
        cert.setIssuer(attrs);
        cert.sign(keys.privateKey, forge.md.sha256.create());
        
        const pemCertificate = forge.pki.certificateToPem(cert);
        const pemPrivateKey = forge.pki.privateKeyToPem(keys.privateKey);
        
        return {
          pemCertificate,
          pemPrivateKey,
          subject: {
            commonName: userId,
            organization: organization,
            country: 'ET',
          },
          issuer: {
            commonName: userId,
            organization: organization,
          },
          validFrom: cert.validity.notBefore,
          validTo: cert.validity.notAfter,
          serialNumber: cert.serialNumber,
          trustStatus: 'SELF_SIGNED_UNTRUSTED',
        };
      } else {
        // Fallback: create simplified certificate structure
        logger.warn('Using fallback self-signed certificate (no node-forge)');
        
        const now = new Date();
        const validTo = new Date(now.getTime() + 5 * 365 * 24 * 60 * 60 * 1000);
        const serialNumber = Date.now().toString();
        
        // Generate a simple RSA key pair using built-in crypto
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
          modulusLength: 2048,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });
        
        // Create simplified PEM certificate (not a real X.509, but sufficient for our use)
        const pemCertificate = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAP${serialNumber}
Subject: CN=${userId}, O=${organization}, C=ET
Issuer: CN=${userId}, O=${organization}
Valid From: ${now.toISOString()}
Valid To: ${validTo.toISOString()}
Public Key: ${publicKey.replace(/\n/g, '')}
-----END CERTIFICATE-----`;
        
        return {
          pemCertificate,
          pemPrivateKey: privateKey,
          subject: {
            commonName: userId,
            organization: organization,
            country: 'ET',
          },
          issuer: {
            commonName: userId,
            organization: organization,
          },
          validFrom: now,
          validTo: validTo,
          serialNumber: serialNumber,
          trustStatus: 'SELF_SIGNED_UNTRUSTED',
        };
      }
    } catch (error) {
      logger.error('Failed to generate self-signed certificate', error);
      throw error;
    }
  }
  
  /**
   * Resolve certificate path based on organization and user
   */
  private static resolveCertificatePath(userId: string, mspId: string): string {
    const domain = this.getOrgDomain(mspId);
    const userNames = userId.includes('@') ? [userId] : [`${userId}@${domain}`, userId];
    const roots = [
      this.CRYPTO_CONFIG_PATH,
      path.join(process.cwd(), 'blockchain', 'organizations'),
    ];
    const possiblePaths = [
      ...roots.flatMap((root) => userNames.flatMap((name) => [
        path.join(root, `peerOrganizations/${domain}/users/${name}/msp/signcerts/cert.pem`),
        path.join(root, `peerOrganizations/${domain}/users/${name}/msp/signcerts/${name}-cert.pem`),
      ])),
    ];
    
    for (const certPath of possiblePaths) {
      if (fs.existsSync(certPath)) {
        logger.info(`Found certificate at: ${certPath}`);
        return certPath;
      }
    }
    
    return possiblePaths[0];
  }
  
  /**
   * Resolve private key path
   */
  private static resolvePrivateKeyPath(userId: string, mspId: string): string {
    const domain = this.getOrgDomain(mspId);
    const userNames = userId.includes('@') ? [userId] : [`${userId}@${domain}`, userId];
    const roots = [this.CRYPTO_CONFIG_PATH, path.join(process.cwd(), 'blockchain', 'organizations')];
    for (const root of roots) {
      for (const name of userNames) {
        const keyDirectory = path.join(root, `peerOrganizations/${domain}/users/${name}/msp/keystore`);
        if (fs.existsSync(keyDirectory)) {
          const keyFile = fs.readdirSync(keyDirectory).find((file) => file.endsWith('_sk') || file.endsWith('.pem'));
          if (keyFile) return path.join(keyDirectory, keyFile);
        }
      }
    }
    return path.join(roots[0], `peerOrganizations/${domain}/users/${userNames[0]}/msp/keystore`);
  }
  
  /**
   * Map organization name to MSP ID
   */
  private static getOrgMSPID(organization: string): string {
    const mspMapping: { [key: string]: string } = {
      'EXPORTER': 'ECTAMSP',
      'ECTA': 'ECTAMSP',
      'ECTAMSP': 'ECTAMSP',
      'ECX': 'ECXMSP',
      'ECXMSP': 'ECXMSP',
      'BANKS': 'BanksMSP',
      'BANKSMSP': 'BanksMSP',
      'NBE': 'NBEMSP',
      'NBEMSP': 'NBEMSP',
      'CUSTOMS': 'CustomsMSP',
      'CUSTOMSMSP': 'CustomsMSP',
      'SHIPPING': 'ShippingMSP',
      'SHIPPINGMSP': 'ShippingMSP',
      'LOGISTICS': 'ShippingMSP',
      'ADMIN': 'ECTAMSP',
    };
    
    const upperOrg = organization.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return mspMapping[upperOrg] || `${organization}MSP`;
  }

  private static getOrgDomain(mspId: string): string {
    const domains: Record<string, string> = {
      ECTAMSP: 'ecta.cecbs.et',
      ECXMSP: 'ecx.cecbs.et',
      BanksMSP: 'banks.cecbs.et',
      NBEMSP: 'nbe.cecbs.et',
      CustomsMSP: 'customs.cecbs.et',
      ShippingMSP: 'shipping.cecbs.et',
    };
    return domains[mspId] || `${mspId.replace(/MSP$/i, '').toLowerCase()}.cecbs.et`;
  }
  
  /**
   * Get attribute value from certificate subject/issuer
   */
  private static getAttributeValue(
    attributes: any[],
    shortName: string
  ): string | undefined {
    const attr = attributes.find(
      a => a.shortName === shortName || a.name === shortName
    );
    return attr?.value as string | undefined;
  }
  
  /**
   * Verify certificate validity (with fallback)
   */
  public static verifyCertificate(certificate: X509Certificate): boolean {
    try {
      const now = new Date();
      
      // Check validity period
      if (now < certificate.validFrom || now > certificate.validTo) {
        logger.warn(`Certificate is not within validity period`);
        return false;
      }
      
      const cert = new crypto.X509Certificate(certificate.pemCertificate);
      const challenge = crypto.randomBytes(32);
      const keyMatchesCertificate = crypto.verify(
        'sha256',
        challenge,
        cert.publicKey,
        crypto.sign('sha256', challenge, certificate.pemPrivateKey),
      );
      const trustStatus = getFabricCertificateTrustStatus(
        certificate.pemCertificate,
        certificate.mspId || certificate.subject.organization,
      );
      return keyMatchesCertificate && trustStatus === 'TRUSTED_BY_CONFIGURED_MSP_ROOT';
    } catch (error) {
      logger.error('Certificate verification failed', error);
      return false;
    }
  }
  
  /**
   * Extract certificate info from PEM string (with fallback)
   */
  public static extractCertificateInfo(pemCertificate: string): {
    subject: string;
    issuer: string;
    serialNumber: string;
    validFrom: string;
    validTo: string;
  } {
    try {
      if (forge) {
        const cert = forge.pki.certificateFromPem(pemCertificate);
        
        return {
          subject: cert.subject.attributes.map(a => `${a.shortName}=${a.value}`).join(', '),
          issuer: cert.issuer.attributes.map(a => `${a.shortName}=${a.value}`).join(', '),
          serialNumber: cert.serialNumber,
          validFrom: cert.validity.notBefore.toISOString(),
          validTo: cert.validity.notAfter.toISOString(),
        };
      } else {
        // Fallback: parse from PEM text
        logger.info('Extracting cert info with fallback method');
        const subjectMatch = pemCertificate.match(/Subject: (.+)/);
        const issuerMatch = pemCertificate.match(/Issuer: (.+)/);
        const serialMatch = pemCertificate.match(/\d{13,}/); // Timestamp-based serial
        const validFromMatch = pemCertificate.match(/Valid From: (.+)/);
        const validToMatch = pemCertificate.match(/Valid To: (.+)/);
        
        return {
          subject: subjectMatch ? subjectMatch[1] : 'Unknown',
          issuer: issuerMatch ? issuerMatch[1] : 'Unknown',
          serialNumber: serialMatch ? serialMatch[0] : Date.now().toString(),
          validFrom: validFromMatch ? validFromMatch[1] : new Date().toISOString(),
          validTo: validToMatch ? validToMatch[1] : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        };
      }
    } catch (error) {
      logger.error('Failed to extract certificate info', error);
      throw error;
    }
  }
  
  /**
   * Get certificate fingerprint (SHA-256) (with fallback)
   */
  public static getCertificateFingerprint(pemCertificate: string): string {
    try {
      if (forge) {
        const cert = forge.pki.certificateFromPem(pemCertificate);
        const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
        const md = forge.md.sha256.create();
        md.update(der);
        return md.digest().toHex().toUpperCase().match(/.{2}/g)?.join(':') || '';
      } else {
        // Fallback: hash the PEM content
        logger.info('Generating fingerprint with fallback method');
        return crypto.createHash('sha256')
          .update(pemCertificate)
          .digest('hex')
          .toUpperCase()
          .match(/.{2}/g)?.join(':') || '';
      }
    } catch (error) {
      logger.error('Failed to get certificate fingerprint', error);
      throw error;
    }
  }
}

export default CertificateManager;
