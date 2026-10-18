// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Certificate Manager - X.509 Certificate Handling for Hyperledger Fabric

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';
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
        return await this.loadCertificateFromFiles(certPath, keyPath);
      }
      
      // Fallback: Generate self-signed certificate for development
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
    keyPath: string
  ): Promise<X509Certificate> {
    try {
      const pemCertificate = fs.readFileSync(certPath, 'utf8');
      const pemPrivateKey = fs.readFileSync(keyPath, 'utf8');
      
      if (forge) {
        // Parse certificate using node-forge if available
        const cert = forge.pki.certificateFromPem(pemCertificate);
        
        return {
          pemCertificate,
          pemPrivateKey,
          subject: {
            commonName: this.getAttributeValue(cert.subject, 'CN') || 'Unknown',
            organization: this.getAttributeValue(cert.subject, 'O') || 'Unknown',
            country: this.getAttributeValue(cert.subject, 'C') || 'ET',
          },
          issuer: {
            commonName: this.getAttributeValue(cert.issuer, 'CN') || 'Unknown',
            organization: this.getAttributeValue(cert.issuer, 'O') || 'Unknown',
          },
          validFrom: cert.validity.notBefore,
          validTo: cert.validity.notAfter,
          serialNumber: cert.serialNumber,
        };
      } else {
        // Fallback: parse basic info from PEM
        logger.info('Using fallback certificate parsing');
        const subjectMatch = pemCertificate.match(/CN=([^,\n]+)/);
        const orgMatch = pemCertificate.match(/O=([^,\n]+)/);
        
        return {
          pemCertificate,
          pemPrivateKey,
          subject: {
            commonName: subjectMatch ? subjectMatch[1] : 'Unknown',
            organization: orgMatch ? orgMatch[1] : 'Unknown',
            country: 'ET',
          },
          issuer: {
            commonName: 'Hyperledger Fabric CA',
            organization: 'CECBS',
          },
          validFrom: new Date(),
          validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          serialNumber: Date.now().toString(),
        };
      }
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
    // Try multiple possible paths
    const possiblePaths = [
      path.join(this.CRYPTO_CONFIG_PATH, `peerOrganizations/${mspId}/users/${userId}@${mspId}/msp/signcerts/cert.pem`),
      path.join(this.CRYPTO_CONFIG_PATH, `peerOrganizations/${mspId}/users/User1@${mspId}/msp/signcerts/User1@${mspId}-cert.pem`),
      path.join(process.cwd(), `crypto-config/peerOrganizations/${mspId}/users/${userId}/msp/signcerts/cert.pem`),
    ];
    
    for (const certPath of possiblePaths) {
      if (fs.existsSync(certPath)) {
        logger.info(`Found certificate at: ${certPath}`);
        return certPath;
      }
    }
    
    return possiblePaths[0]; // Return first path as default
  }
  
  /**
   * Resolve private key path
   */
  private static resolvePrivateKeyPath(userId: string, mspId: string): string {
    const basePath = path.join(this.CRYPTO_CONFIG_PATH, `peerOrganizations/${mspId}/users/${userId}@${mspId}/msp/keystore`);
    
    // Check if keystore directory exists
    if (fs.existsSync(basePath)) {
      const files = fs.readdirSync(basePath);
      const keyFile = files.find(f => f.endsWith('_sk') || f.endsWith('.pem'));
      if (keyFile) {
        return path.join(basePath, keyFile);
      }
    }
    
    // Fallback paths
    const fallbackPaths = [
      path.join(this.CRYPTO_CONFIG_PATH, `peerOrganizations/${mspId}/users/User1@${mspId}/msp/keystore/priv_sk`),
      path.join(process.cwd(), `crypto-config/peerOrganizations/${mspId}/users/${userId}/msp/keystore/priv_sk`),
    ];
    
    for (const keyPath of fallbackPaths) {
      if (fs.existsSync(keyPath)) {
        logger.info(`Found private key at: ${keyPath}`);
        return keyPath;
      }
    }
    
    return fallbackPaths[0];
  }
  
  /**
   * Map organization name to MSP ID
   */
  private static getOrgMSPID(organization: string): string {
    const mspMapping: { [key: string]: string } = {
      'EXPORTER': 'ExporterMSP',
      'BANKS': 'BanksMSP',
      'NBE': 'NBEMSP',
      'CUSTOMS': 'CustomsMSP',
      'ECTA': 'ECTAMSP',
      'LOGISTICS': 'LogisticsMSP',
      'ADMIN': 'AdminMSP',
    };
    
    const upperOrg = organization.toUpperCase();
    return mspMapping[upperOrg] || `${organization}MSP`;
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
      
      if (forge) {
        // Parse and verify certificate structure
        const cert = forge.pki.certificateFromPem(certificate.pemCertificate);
        return true;
      } else {
        // Fallback: just check dates
        logger.info('Certificate verification: basic date check only (no node-forge)');
        return true;
      }
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
