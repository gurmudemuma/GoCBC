// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Digital Signature Service - Detached cryptographic proofs for document revisions

import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import crypto from 'crypto';
import fs from 'fs';
import { logger } from '../utils/logger';
import { DocumentSignatureService } from './documentSignatureService';
import { getFabricCertificateTrustStatus, normalizeFabricMspId } from '../utils/fabricCertificateTrust';

// Try to import optional dependencies, fallback if not available
let forge: any = null;
let QRCode: any = null;

try {
  forge = require('node-forge');
  logger.info('✅ node-forge loaded successfully');
} catch (e) {
  logger.warn('⚠️  node-forge not available, using fallback crypto methods');
}

try {
  QRCode = require('qrcode');
  logger.info('✅ qrcode loaded successfully');
} catch (e) {
  logger.warn('⚠️  qrcode not available, skipping QR code generation');
}

export interface CryptographicSignatureInfo {
  signerName: string;
  signerEmail: string;
  organization: string;
  reason: string;
  location: string;
  contactInfo: string;
  timestamp: Date;
  documentId: string;
  documentType: string;
  blockchainTxId?: string;
}

export interface SignatureVerificationResult {
  isValid: boolean;
  isTampered: boolean;
  cryptographicSignaturesValid: boolean;
  certificateTrustStatus: string;
  signatures: Array<{
    signerName: string;
    organization: string;
    signedAt: Date;
    certificateValid: boolean;
    signatureValid: boolean;
    certificateTrusted: boolean;
    certificateTrustStatus: string;
    certificateIssuer: string;
    certificateSubject: string;
    blockchainTxId?: string | null;
    reason?: string;
  }>;
  documentHash: string;
  verificationTimestamp: Date;
}

export interface X509Certificate {
  pemCertificate: string;
  pemPrivateKey: string;
  mspId?: string;
  subject: {
    commonName: string;
    organization: string;
    country: string;
  };
  issuer: {
    commonName: string;
    organization: string;
  };
  validFrom: Date;
  validTo: Date;
  serialNumber: string;
  trustStatus?: 'TRUSTED_BY_CONFIGURED_MSP_ROOT' | 'UNANCHORED' | 'SELF_SIGNED_UNTRUSTED' | 'EXPIRED_OR_NOT_YET_VALID' | 'UNAVAILABLE';
}

/**
 * Adds a visual PDF mark and a detached X.509-backed proof chain. This is not a
 * PDF PAdES signature, and certificate trust still requires a configured CA.
 */
export class DigitalSignatureService {

  /** Create a detached signature proof for any file type. */
  public static async signFileDetached(
    filePath: string,
    certificate: X509Certificate,
    signatureInfo: CryptographicSignatureInfo
  ): Promise<void> {
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
    await this.createSignatureHashChain(filePath, certificate, signatureInfo);
  }
  
  /**
   * Add a visual mark and detached X.509-backed signature proof sidecar.
   * This is not a PDF PAdES signature and does not establish legal authority.
   */
  public static async signDocumentPermanently(
    filePath: string,
    certificate: X509Certificate,
    signatureInfo: CryptographicSignatureInfo,
    positionIndex: number = 0
  ): Promise<void> {
    let originalFileBytes: Buffer | null = null;
    let originalSidecarBytes: Buffer | null = null;
    const sidecarPath = filePath + '.signature-chain.json';
    try {
      logger.info(`🔐 Creating a detached cryptographic proof for: ${filePath}`);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      originalFileBytes = fs.readFileSync(filePath);
      originalSidecarBytes = fs.existsSync(sidecarPath) ? fs.readFileSync(sidecarPath) : null;

      // Step 1: Add visual signature appearance (what users see)
      await this.addProfessionalVisualSignature(filePath, signatureInfo, positionIndex);
      
      // Step 2: Embed descriptive signer metadata in the PDF
      await this.embedSignatureMetadata(filePath, signatureInfo);
      
      // Step 3: Create signature hash chain for tamper detection
      await this.createSignatureHashChain(filePath, certificate, signatureInfo);
      
      logger.info(`✅ Detached signature proof created for ${filePath}`);
    } catch (error) {
      if (originalFileBytes) fs.writeFileSync(filePath, originalFileBytes);
      if (originalSidecarBytes) fs.writeFileSync(sidecarPath, originalSidecarBytes);
      else if (fs.existsSync(sidecarPath)) fs.unlinkSync(sidecarPath);
      logger.error(`❌ Failed to sign document permanently: ${filePath}`, error);
      throw error;
    }
  }

  /** Add a visual signature mark that references the detached proof record. */
  private static async addProfessionalVisualSignature(
    filePath: string,
    signatureInfo: CryptographicSignatureInfo,
    positionIndex: number
  ): Promise<void> {
    logger.info(`📝 Adding professional visual signature at position ${positionIndex}`);
    
    const existingPdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();
    
    // Enhanced signature box dimensions
    const stampWidth = 220;
    const stampHeight = 120;
    const marginX = 30;
    const marginY = 40;
    const horizontalSpacing = 20;
    const verticalSpacing = 15;
    
    const stampsPerRow = Math.floor((width - 2 * marginX + horizontalSpacing) / (stampWidth + horizontalSpacing));
    const row = Math.floor(positionIndex / stampsPerRow);
    const col = positionIndex % stampsPerRow;
    
    const stampX = width - marginX - (col + 1) * stampWidth - col * horizontalSpacing;
    const stampY = marginY + row * stampHeight + row * verticalSpacing;
    
    // Professional color scheme for approved/verified documents
    const signatureColor = {
      border: rgb(0, 0.5, 0.2),
      accent: rgb(0, 0.6, 0.3),
      icon: rgb(0, 0.7, 0.2),
      text: rgb(0, 0.4, 0.1),
    };
    
    // Draw signature box with premium design
    lastPage.drawRectangle({
      x: stampX,
      y: stampY,
      width: stampWidth,
      height: stampHeight,
      borderColor: signatureColor.border,
      borderWidth: 2,
      color: rgb(0.97, 1, 0.97),
      opacity: 1.0,
    });
    
    // Accent bar with gradient effect (simulated with multiple bars)
    for (let i = 0; i < 8; i++) {
      lastPage.drawRectangle({
        x: stampX,
        y: stampY + (i * stampHeight / 8),
        width: 6,
        height: stampHeight / 8,
        color: rgb(0, 0.6 - (i * 0.05), 0.3 - (i * 0.03)),
      });
    }
    
    // Security checkmark icon (using V instead of Unicode checkmark for font compatibility)
    lastPage.drawText('V', {
      x: stampX + 20,
      y: stampY + stampHeight - 35,
      size: 24,
      font: boldFont,
      color: signatureColor.icon,
    });
    
    // Official header
    lastPage.drawText('DIGITALLY SIGNED', {
      x: stampX + 55,
      y: stampY + stampHeight - 20,
      size: 9,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    // Blockchain badge (using [BC] instead of emoji for font compatibility)
    lastPage.drawText('SIGNATURE PROOF ATTACHED', {
      x: stampX + 55,
      y: stampY + stampHeight - 32,
      size: 7,
      font: boldFont,
      color: rgb(0.3, 0.3, 0.7),
    });
    
    // Document information
    const docInfo = `${signatureInfo.documentType}: ${signatureInfo.documentId}`;
    lastPage.drawText(this.truncate(docInfo, 32), {
      x: stampX + 15,
      y: stampY + stampHeight - 50,
      size: 7,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });
    
    // Signer information
    lastPage.drawText(`Signed by: ${this.truncate(signatureInfo.signerName, 25)}`, {
      x: stampX + 15,
      y: stampY + stampHeight - 63,
      size: 8,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    // Organization
    lastPage.drawText(`Organization: ${this.truncate(signatureInfo.organization, 22)}`, {
      x: stampX + 15,
      y: stampY + stampHeight - 75,
      size: 7.5,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    // Reason for signing
    if (signatureInfo.reason) {
      lastPage.drawText(`Reason: ${this.truncate(signatureInfo.reason, 25)}`, {
        x: stampX + 15,
        y: stampY + stampHeight - 87,
        size: 7,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }
    
    // Timestamp
    const dateText = signatureInfo.timestamp.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    lastPage.drawText(`Date: ${dateText}`, {
      x: stampX + 15,
      y: stampY + 25,
      size: 7,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });
    
    // Blockchain transaction ID
    if (signatureInfo.blockchainTxId) {
      const txText = `Blockchain TX: ${signatureInfo.blockchainTxId.substring(0, 16)}...`;
      lastPage.drawText(txText, {
        x: stampX + 15,
        y: stampY + 12,
        size: 6,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
    
    // Add permanent watermark to all pages
    for (const page of pages) {
      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      // Footer verification text on every page
      page.drawText(`Digitally signed - verify the detached proof - ${signatureInfo.organization}`, {
        x: 20,
        y: 10,
        size: 6,
        font: font,
        color: rgb(0.6, 0.6, 0.6),
        opacity: 0.7,
      });
      
      // Large diagonal watermark
      page.drawText('SIGNED', {
        x: pageWidth / 2 - 100,
        y: pageHeight / 2 - 40,
        size: 80,
        font: boldFont,
        color: rgb(0, 0.7, 0.2),
        opacity: 0.04,
        rotate: degrees(45),
      });
    }
    
    // Save with full synchronization
    const pdfBytes = await pdfDoc.save();
    const fd = fs.openSync(filePath, 'w');
    fs.writeSync(fd, pdfBytes, 0, pdfBytes.length);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    
    logger.info(`✅ Visual signature permanently written to disk`);
  }

  /**
   * Embed descriptive signer metadata in PDF. The detached proof is stored in
   * the sidecar chain and verified separately.
   */
  private static async embedSignatureMetadata(
    filePath: string,
    signatureInfo: CryptographicSignatureInfo
  ): Promise<void> {
    logger.info(`🔒 Embedding cryptographic signature metadata`);
    
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Embed as PDF metadata (visible in Document Properties)
    pdfDoc.setTitle(`${signatureInfo.documentType} - ${signatureInfo.documentId}`);
    pdfDoc.setSubject(`Digitally signed by ${signatureInfo.organization}`);
    pdfDoc.setKeywords(['signature metadata', signatureInfo.documentType, signatureInfo.organization]);
    pdfDoc.setProducer('CECBS - Ethiopian Coffee Export Consortium Blockchain System');
    pdfDoc.setCreator(`${signatureInfo.signerName} (${signatureInfo.organization})`);
    pdfDoc.setAuthor(signatureInfo.signerName);
    
    // Keep descriptive signer metadata in the PDF. The cryptographic proof is
    // stored separately as a detached, verifiable signature chain.
    pdfDoc.setSubject(`Signature metadata for ${signatureInfo.documentId}; detached proof stored with the document record.`);
    
    // Save
    const signedPdfBytes = await pdfDoc.save({ useObjectStreams: false });
    fs.writeFileSync(filePath, signedPdfBytes);
    
    logger.info(`✅ Cryptographic metadata embedded successfully`);
  }

  /**
   * Create signature hash chain for tamper detection
   * Each signature includes hash of previous state
   */
  private static async createSignatureHashChain(
    filePath: string,
    certificate: X509Certificate,
    signatureInfo: CryptographicSignatureInfo
  ): Promise<void> {
    logger.info(`🔗 Creating signature hash chain for tamper detection`);
    
    // Compute current file hash
    const fileBytes = fs.readFileSync(filePath);
    const currentHash = crypto.createHash('sha256').update(fileBytes).digest('hex');
    
    // Create hash chain entry
    if (!forge) throw new Error('node-forge is required to create verifiable detached signatures');
    const hashChainPath = filePath + '.signature-chain.json';
    let hashChain: any[] = [];
    if (fs.existsSync(hashChainPath)) {
      const existingChain = fs.readFileSync(hashChainPath, 'utf8');
      hashChain = JSON.parse(existingChain);
      if (!Array.isArray(hashChain)) throw new Error('Signature proof chain is malformed');
    }

    const previousEntryHash = hashChain[hashChain.length - 1]?.entryHash || '';
    const signedPayload = {
      version: '2.0',
      documentId: signatureInfo.documentId,
      signatureTimestamp: signatureInfo.timestamp.toISOString(),
      signerName: signatureInfo.signerName,
      signerEmail: signatureInfo.signerEmail,
      organization: signatureInfo.organization,
      reason: signatureInfo.reason,
      documentHash: currentHash,
      certificateFingerprint: crypto.createHash('sha256').update(certificate.pemCertificate).digest('hex'),
      mspId: certificate.mspId || normalizeFabricMspId(signatureInfo.organization),
      certificateTrustStatus: getFabricCertificateTrustStatus(
        certificate.pemCertificate,
        certificate.mspId || signatureInfo.organization,
      ),
      previousEntryHash,
    };

    const payloadBytes = JSON.stringify(signedPayload);
    const privateKey = forge.pki.privateKeyFromPem(certificate.pemPrivateKey);
    const digest = forge.md.sha256.create();
    digest.update(payloadBytes, 'utf8');
    const signature = forge.util.encode64(privateKey.sign(digest));
    const entryHash = crypto.createHash('sha256').update(`${payloadBytes}.${signature}`).digest('hex');
    hashChain.push({ signedPayload, signature, certificatePem: certificate.pemCertificate, entryHash });
    fs.writeFileSync(hashChainPath, JSON.stringify(hashChain, null, 2));
    
    logger.info(`✅ Hash chain updated with ${hashChain.length} entries`);
  }

  /**
   * Add signature certificate page to document
   * Final page showing complete audit trail
   */
  public static async addSignatureCertificatePage(
    filePath: string,
    documentId: string,
    signatures: Array<{
      signerName: string;
      organization: string;
      signatureType: string;
      timestamp: Date;
      blockchainTxId: string;
      certificateInfo?: string;
    }>
  ): Promise<void> {
    try {
      logger.info(`📄 Adding signature certificate page with ${signatures.length} signatures`);
      
      const pdfBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const certPage = pdfDoc.addPage([595, 842]); // A4 size
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Title
      certPage.drawText('SIGNATURE RECORD', {
        x: 50,
        y: 800,
        size: 22,
        font: boldFont,
        color: rgb(0, 0.4, 0.1),
      });
      
      // Subtitle
      certPage.drawText('Ethiopian Coffee Export Consortium Blockchain System', {
        x: 50,
        y: 780,
        size: 10,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });
      
      // Document information
      certPage.drawText(`Document ID: ${documentId}`, {
        x: 50,
        y: 750,
        size: 12,
        font: boldFont,
      });
      
      certPage.drawText(`Record Generated: ${new Date().toLocaleString('en-US')}`, {
        x: 50,
        y: 735,
        size: 10,
        font: font,
      });
      
      certPage.drawText(`Total Signatures: ${signatures.length}`, {
        x: 50,
        y: 720,
        size: 10,
        font: font,
      });
      
      // Signature chain header
      certPage.drawText('SIGNATURE CHAIN', {
        x: 50,
        y: 690,
        size: 14,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      
      // Draw line
      certPage.drawLine({
        start: { x: 50, y: 685 },
        end: { x: 545, y: 685 },
        thickness: 1,
        color: rgb(0.7, 0.7, 0.7),
      });
      
      // List all signatures
      let yPos = 660;
      for (let i = 0; i < signatures.length; i++) {
        const sig = signatures[i];
        
        // Signature number
        certPage.drawText(`${i + 1}.`, {
          x: 50,
          y: yPos,
          size: 11,
          font: boldFont,
        });
        
        // Signature type badge
        certPage.drawRectangle({
          x: 70,
          y: yPos - 3,
          width: 60,
          height: 16,
          color: rgb(0, 0.6, 0.2),
        });
        certPage.drawText(sig.signatureType, {
          x: 75,
          y: yPos,
          size: 9,
          font: boldFont,
          color: rgb(1, 1, 1),
        });
        
        // Signer name
        certPage.drawText(`${sig.signerName} (${sig.organization})`, {
          x: 140,
          y: yPos,
          size: 10,
          font: boldFont,
        });
        
        // Timestamp
        certPage.drawText(
          `Signed: ${sig.timestamp.toLocaleString('en-US', { 
            month: 'short', 
            day: '2-digit', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}`,
          {
            x: 70,
            y: yPos - 15,
            size: 8,
            font: font,
            color: rgb(0.4, 0.4, 0.4),
          }
        );
        
        // A transaction ID is only a reference until the committed ledger proof is checked.
        certPage.drawText(`Ledger TX reference: ${sig.blockchainTxId.substring(0, 40)}...`, {
          x: 70,
          y: yPos - 27,
          size: 7,
          font: font,
          color: rgb(0.5, 0.5, 0.5),
        });
        
        yPos -= 50;
        
        // Add new page if needed
        if (yPos < 100 && i < signatures.length - 1) {
          const newPage = pdfDoc.addPage([595, 842]);
          yPos = 800;
          certPage.drawText('SIGNATURE RECORD (continued)', {
            x: 50,
            y: 800,
            size: 16,
            font: boldFont,
          });
          yPos = 770;
        }
      }
      
      // Add QR code for verification (if QRCode available)
      if (QRCode) {
        try {
          const verificationUrl = `${process.env.PUBLIC_URL || 'https://cecbs.et'}/verify/${documentId}`;
          const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
            width: 150,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
          });
          
          // Extract base64 from data URL
          const base64Data = qrCodeDataUrl.split(',')[1];
          const qrImage = await pdfDoc.embedPng(Buffer.from(base64Data, 'base64'));
          
          certPage.drawImage(qrImage, {
            x: 420,
            y: 600,
            width: 120,
            height: 120,
          });
          
          certPage.drawText('Scan to Verify', {
            x: 440,
            y: 585,
            size: 9,
            font: boldFont,
          });
          
          certPage.drawText(verificationUrl.substring(0, 35), {
            x: 420,
            y: 570,
            size: 7,
            font: font,
            color: rgb(0.5, 0.5, 0.5),
          });
        } catch (qrError) {
          logger.warn('Failed to generate QR code, skipping', qrError);
        }
      } else {
        // Add text URL instead
        const verificationUrl = `${process.env.PUBLIC_URL || 'https://cecbs.et'}/verify/${documentId}`;
        certPage.drawText('Verify at:', {
          x: 420,
          y: 620,
          size: 9,
          font: boldFont,
        });
        certPage.drawText(verificationUrl, {
          x: 420,
          y: 605,
          size: 7,
          font: font,
          color: rgb(0, 0, 0.8),
        });
      }
      
      // Footer
      certPage.drawText(
        'Detached signature proof accompanies this file. Verify signer trust and ledger status separately.',
        {
          x: 50,
          y: 50,
          size: 8,
          font: font,
          color: rgb(0.6, 0.6, 0.6),
        }
      );
      
      certPage.drawText('Tampering with this document will invalidate all signatures.', {
        x: 50,
        y: 38,
        size: 8,
        font: font,
        color: rgb(0.6, 0.6, 0.6),
      });
      
      // Save
      const finalPdfBytes = await pdfDoc.save();
      fs.writeFileSync(filePath, finalPdfBytes);
      
      logger.info(`✅ Signature certificate page added successfully`);
    } catch (error) {
      logger.error('Failed to add signature certificate page', error);
      throw error;
    }
  }

  /**
   * Verify all signatures in a document
   */
  public static async verifyDocumentSignatures(
    filePath: string
  ): Promise<SignatureVerificationResult> {
    try {
      logger.info(`🔍 Verifying signatures in: ${filePath}`);
      
      // Compute current document hash
      const fileBytes = fs.readFileSync(filePath);
      const documentHash = crypto.createHash('sha256').update(fileBytes).digest('hex');
      
      // Check for signature chain file
      const hashChainPath = filePath + '.signature-chain.json';
      if (!fs.existsSync(hashChainPath)) {
        logger.warn('No signature chain found for document');
        return {
          isValid: false,
          isTampered: false,
          cryptographicSignaturesValid: false,
          certificateTrustStatus: 'UNAVAILABLE',
          signatures: [],
          documentHash,
          verificationTimestamp: new Date(),
        };
      }
      
      // Load signature chain
      const hashChainData = fs.readFileSync(hashChainPath, 'utf8');
      const hashChain = JSON.parse(hashChainData);
      
      let chainValid = Array.isArray(hashChain) && hashChain.length > 0;
      let previousEntryHash = '';
      const signatures = (Array.isArray(hashChain) ? hashChain : []).map((entry: any) => {
        const payload = entry.signedPayload;
        let signatureValid = false;
        let certificateValid = false;
        let certificateSubject = 'Unavailable';
        let certificateIssuer = 'Unavailable';
        let certificateTrustStatus = 'UNAVAILABLE';
        try {
          if (!forge || !payload || !entry.signature || !entry.certificatePem) throw new Error('Detached signature proof is incomplete');
          const certificate = forge.pki.certificateFromPem(entry.certificatePem);
          const digest = forge.md.sha256.create();
          digest.update(JSON.stringify(payload), 'utf8');
          signatureValid = certificate.publicKey.verify(digest.digest().bytes(), forge.util.decode64(entry.signature));
          const signedAt = new Date(payload.signatureTimestamp);
          certificateValid = signedAt >= certificate.validity.notBefore && signedAt <= certificate.validity.notAfter;
          certificateSubject = certificate.subject.attributes.map((attribute: any) => `${attribute.shortName || attribute.name}=${attribute.value}`).join(', ');
          certificateIssuer = certificate.issuer.attributes.map((attribute: any) => `${attribute.shortName || attribute.name}=${attribute.value}`).join(', ');
          certificateTrustStatus = getFabricCertificateTrustStatus(entry.certificatePem, payload.mspId || payload.organization || '');
        } catch (_) {
          signatureValid = false;
        }
        const payloadBytes = payload ? JSON.stringify(payload) : '';
        const expectedEntryHash = payloadBytes && entry.signature
          ? crypto.createHash('sha256').update(`${payloadBytes}.${entry.signature}`).digest('hex')
          : '';
        const linked = payload?.previousEntryHash === previousEntryHash && expectedEntryHash === entry.entryHash;
        chainValid = chainValid && signatureValid && certificateValid && linked;
        previousEntryHash = entry.entryHash || '';
        return {
          signerName: payload?.signerName || 'Unknown',
          organization: payload?.organization || 'Unknown',
          signedAt: new Date(payload?.signatureTimestamp || 0),
          certificateValid,
          signatureValid,
          certificateTrusted: certificateTrustStatus === 'TRUSTED_BY_CONFIGURED_MSP_ROOT',
          certificateTrustStatus,
          certificateIssuer,
          certificateSubject,
          documentHash: payload?.documentHash || '',
          blockchainTxId: null,
          reason: payload?.reason || '',
        };
      });

      const latestPayload = hashChain[hashChain.length - 1]?.signedPayload;
      const latestHashMatches = latestPayload?.documentHash === documentHash;
      const hasLegacyUnverifiedEntries = signatures.some((entry: any) => !entry.signatureValid);
      const isTampered = !!latestPayload && !latestHashMatches || hasLegacyUnverifiedEntries && signatures.some((entry: any) => entry.signatureValid === false && entry.documentHash);
      const cryptographicSignaturesValid = signatures.length > 0 && signatures.every((entry: any) => entry.signatureValid && entry.certificateValid);
      
      return {
        isValid: cryptographicSignaturesValid && chainValid && latestHashMatches,
        isTampered,
        cryptographicSignaturesValid,
        certificateTrustStatus: signatures.length > 0 && signatures.every((entry: any) => entry.certificateTrustStatus === 'TRUSTED_BY_CONFIGURED_MSP_ROOT')
          ? 'TRUSTED_BY_CONFIGURED_MSP_ROOT'
          : signatures[0]?.certificateTrustStatus || 'UNAVAILABLE',
        signatures,
        documentHash,
        verificationTimestamp: new Date(),
      };
    } catch (error) {
      logger.error('Failed to verify document signatures', error);
      throw error;
    }
  }

  /**
   * Helper: Truncate text to fit
   */
  private static truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }
}

export default DigitalSignatureService;
