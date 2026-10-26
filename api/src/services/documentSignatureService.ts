// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Document Signature Service - PDF Visual Signature Stamping

import { PDFDocument, rgb, RGB, StandardFonts, degrees } from 'pdf-lib';
import fs from 'fs';
import { logger } from '../utils/logger';

export interface SignatureStamp {
  signer: string;
  organization: string;
  timestamp: string;
  signatureType: string;
  role?: string;
  transactionId?: string;
  documentId?: string;
  documentType?: string;
}

export class DocumentSignatureService {
  /**
   * Add visual signature stamp to PDF document
   * Creates a signature box with signer details and watermark
   */
  public static async addVisualSignatureToPDF(
    filePath: string,
    stamp: SignatureStamp,
    positionIndex: number = 0
  ): Promise<void> {
    try {
      logger.info(`Adding visual signature to PDF: ${filePath} at position ${positionIndex}`);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Load existing PDF
      const existingPdfBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);

      // Embed fonts
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Get all pages
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      const { width, height } = lastPage.getSize();

      // Professional Multi-Signer Layout Constants
      const stampWidth = 200; 
      const stampHeight = 100; // Increased height for document details
      const marginX = 30; 
      const marginY = 40;
      const horizontalSpacing = 20;
      const verticalSpacing = 15;

      // Calculate how many stamps fit per row
      const stampsPerRow = Math.floor((width - 2 * marginX + horizontalSpacing) / (stampWidth + horizontalSpacing));
      
      // Calculate grid position (starting from bottom right and moving left/up)
      const row = Math.floor(positionIndex / stampsPerRow);
      const col = positionIndex % stampsPerRow;

      // Positioning: Right to Left, Bottom to Top
      const stampX = width - marginX - (col + 1) * stampWidth - col * horizontalSpacing;
      const stampY = marginY + row * stampHeight + row * verticalSpacing;

      // Determine stamp color based on signature type
      const stampColor = this.getStampColor(stamp.signatureType);

      // ✅ Draw signature box (Modern professional design)
      lastPage.drawRectangle({
        x: stampX,
        y: stampY,
        width: stampWidth,
        height: stampHeight,
        borderColor: stampColor.border,
        borderWidth: 1.5,
        color: rgb(1, 1, 1),
        opacity: 1.0,
      });

      // ✅ Draw professional side accent bar
      lastPage.drawRectangle({
        x: stampX,
        y: stampY,
        width: 5,
        height: stampHeight,
        color: stampColor.border,
      });

      // ✅ Draw checkmark icon
      lastPage.drawText('V', {
        x: stampX + 15,
        y: stampY + stampHeight - 30,
        size: 24,
        font: boldFont,
        color: stampColor.icon,
      });

      // ✅ Draw header label
      lastPage.drawText('CECBS DIGITAL PROOF', {
        x: stampX + 45,
        y: stampY + stampHeight - 18,
        size: 8,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      // ✅ NEW: Document Details (Liability requirement)
      if (stamp.documentId || stamp.documentType) {
        const docInfo = `${stamp.documentType || 'DOC'}: ${stamp.documentId || 'N/A'}`;
        lastPage.drawText(this.truncate(docInfo, 35), {
          x: stampX + 45,
          y: stampY + stampHeight - 28,
          size: 6,
          font: font,
          color: rgb(0.4, 0.4, 0.4),
        });
      }

      // ✅ Draw signature type
      lastPage.drawText(stamp.signatureType, {
        x: stampX + 45,
        y: stampY + stampHeight - 38,
        size: 7.5,
        font: boldFont,
        color: stampColor.text,
      });

      // ✅ Draw signer name
      const signerText = `Signer: ${this.truncate(stamp.signer, 22)}`;
      lastPage.drawText(signerText, {
        x: stampX + 15,
        y: stampY + stampHeight - 55,
        size: 7.5,
        font: font,
        color: rgb(0.1, 0.1, 0.1),
      });

      // ✅ Draw organization
      const orgText = `Org: ${this.truncate(stamp.organization, 25)}`;
      lastPage.drawText(orgText, {
        x: stampX + 15,
        y: stampY + stampHeight - 67,
        size: 7.5,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.2),
      });

      // ✅ Draw timestamp
      const dateText = new Date(stamp.timestamp).toLocaleDateString('en-US', {
        month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      lastPage.drawText(dateText, {
        x: stampX + 15,
        y: stampY + 22,
        size: 6.5,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });

      // ✅ Draw transaction ID
      if (stamp.transactionId) {
        const txText = `TX: ${stamp.transactionId.substring(0, 18)}...`;
        lastPage.drawText(txText, {
          x: stampX + 15,
          y: stampY + 10,
          size: 6,
          font: font,
          color: rgb(0.5, 0.5, 0.5),
        });
      }

      // ✅ Add permanent watermark to all pages for high-trust documents
      if (['APPROVE', 'VERIFY'].includes(stamp.signatureType)) {
        for (const page of pages) {
          const { width: pageWidth, height: pageHeight } = page.getSize();
          
          // Bottom-left corner small confirmation stamp on every page
          page.drawText(`Verified by CECBS Blockchain - ${stamp.organization}`, {
            x: 20,
            y: 10,
            size: 6,
            font: font,
            color: rgb(0.7, 0.7, 0.7),
            opacity: 0.5,
          });

          // Large diagonal watermark
          page.drawText(stamp.signatureType === 'APPROVE' ? 'APPROVED' : 'VERIFIED', {
            x: pageWidth / 2 - 120,
            y: pageHeight / 2 - 50,
            size: 70,
            font: boldFont,
            color: stampColor.watermark,
            opacity: 0.05,
            rotate: degrees(45),
          });
        }
      }

      // ✅ Save modified PDF with full write synchronization
      const pdfBytes = await pdfDoc.save();
      
      // Use fs.writeSync to ensure the data is flushed to the physical disk immediately
      const fd = fs.openSync(filePath, 'w');
      fs.writeSync(fd, pdfBytes, 0, pdfBytes.length);
      fs.fsyncSync(fd); // Force OS to flush to disk
      fs.closeSync(fd);

      logger.info(`✅ Visual signature permanently flushed to disk: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to add visual signature to PDF: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Add multiple signature stamps to PDF (for documents with multiple signers from different orgs)
   */
  public static async addMultipleSignaturesToPDF(
    filePath: string,
    stamps: SignatureStamp[]
  ): Promise<void> {
    try {
      if (stamps.length === 0) {
        logger.warn('No signatures to add to PDF');
        return;
      }

      logger.info(`Adding ${stamps.length} visual signatures to PDF: ${filePath}`);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Load existing PDF
      const existingPdfBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);

      // Embed fonts
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Get last page for official signatures
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      const { width, height } = lastPage.getSize();

      // Professional Multi-Signer Layout Constants
      const stampWidth = 180;
      const stampHeight = 85;
      const marginX = 30;
      const marginY = 40;
      const horizontalSpacing = 20;
      const verticalSpacing = 15;

      // Calculate how many stamps fit per row
      const stampsPerRow = Math.floor((width - 2 * marginX + horizontalSpacing) / (stampWidth + horizontalSpacing));

      for (let i = 0; i < Math.min(stamps.length, 9); i++) {
        const stamp = stamps[i];
        
        // Calculate grid position (starting from bottom right and moving left/up)
        const row = Math.floor(i / stampsPerRow);
        const col = i % stampsPerRow;

        // Positioning: Right to Left, Bottom to Top
        const stampX = width - marginX - (col + 1) * stampWidth - col * horizontalSpacing;
        const stampY = marginY + row * stampHeight + row * verticalSpacing;

        const stampColor = this.getStampColor(stamp.signatureType);

        // ✅ Draw signature box (Modern professional design)
        lastPage.drawRectangle({
          x: stampX,
          y: stampY,
          width: stampWidth,
          height: stampHeight,
          borderColor: stampColor.border,
          borderWidth: 1,
          color: rgb(1, 1, 1),
          opacity: 1.0,
        });

        // ✅ Draw professional side accent bar
        lastPage.drawRectangle({
          x: stampX,
          y: stampY,
          width: 4,
          height: stampHeight,
          color: stampColor.border,
        });

        // ✅ Draw small checkmark icon
        lastPage.drawText('V', {
          x: stampX + 10,
          y: stampY + stampHeight - 25,
          size: 18,
          font: boldFont,
          color: stampColor.icon,
        });

        // ✅ Draw header label
        lastPage.drawText('DIGITAL PROOF', {
          x: stampX + 35,
          y: stampY + stampHeight - 15,
          size: 7,
          font: boldFont,
          color: rgb(0, 0, 0),
        });

        // ✅ Draw signature type
        lastPage.drawText(stamp.signatureType, {
          x: stampX + 35,
          y: stampY + stampHeight - 25,
          size: 7,
          font: boldFont,
          color: stampColor.text,
        });

        // ✅ Draw signer name
        lastPage.drawText(`By: ${this.truncate(stamp.signer, 22)}`, {
          x: stampX + 10,
          y: stampY + stampHeight - 40,
          size: 7,
          font: font,
          color: rgb(0.1, 0.1, 0.1),
        });

        // ✅ Draw organization (Prominent for multi-org tracking)
        lastPage.drawText(`Org: ${this.truncate(stamp.organization, 25)}`, {
          x: stampX + 10,
          y: stampY + stampHeight - 52,
          size: 7.5,
          font: boldFont,
          color: rgb(0.2, 0.2, 0.2),
        });

        // ✅ Draw date
        const dateStr = new Date(stamp.timestamp).toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        lastPage.drawText(dateStr, {
          x: stampX + 10,
          y: stampY + 8,
          size: 6,
          font: font,
          color: rgb(0.4, 0.4, 0.4),
        });

        // If transaction ID exists, add a tiny TX reference
        if (stamp.transactionId) {
          lastPage.drawText(`TX: ${stamp.transactionId.substring(0, 10)}...`, {
            x: stampX + 10,
            y: stampY + 18,
            size: 5,
            font: font,
            color: rgb(0.5, 0.5, 0.5),
          });
        }
      }

      // Save modified PDF with full write synchronization
      const pdfBytes = await pdfDoc.save();
      
      const fd = fs.openSync(filePath, 'w');
      fs.writeSync(fd, pdfBytes, 0, pdfBytes.length);
      fs.fsyncSync(fd);
      fs.closeSync(fd);

      logger.info(`✅ Multi-signer layout permanently flushed to disk`);
    } catch (error) {
      logger.error(`Failed to add multiple signatures to PDF: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Remove signature stamps from PDF (admin function)
   */
  public static async removeSignaturesFromPDF(filePath: string): Promise<void> {
    try {
      logger.info(`Removing signatures from PDF: ${filePath}`);

      // This is a placeholder - actual implementation would require
      // storing original PDF before adding signatures
      // For now, this function is not implemented

      logger.warn('Remove signatures not implemented - requires original PDF backup');
    } catch (error) {
      logger.error(`Failed to remove signatures from PDF: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Sync signatures between database and PDF file.
   * Ensures all recorded signatures are visually present on the PDF.
   */
  public static async syncSignatures(
    filePath: string,
    documentId: string,
    documentType: string,
    postgresDb: any
  ): Promise<void> {
    try {
      logger.info(`🔍 SYNC START: Document ${documentId} at ${filePath}`);

      // 1. Get all signatures from DB
      const dbSignatures = await postgresDb.all(
        'SELECT * FROM document_signatures WHERE document_id = $1 ORDER BY signed_at ASC',
        [documentId]
      );

      if (!dbSignatures || dbSignatures.length === 0) {
        logger.info(`ℹ️ SYNC SKIP: No signatures found in DB for ${documentId}`);
        return;
      }

      logger.info(`📝 SYNC PROCESS: Found ${dbSignatures.length} signatures in DB for ${documentId}`);

      // 2. Load PDF once for efficiency
      if (!fs.existsSync(filePath)) {
        logger.error(`❌ SYNC ERROR: File not found at ${filePath}`);
        return;
      }

      const existingPdfBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      const { width, height } = lastPage.getSize();

      // Professional Multi-Signer Layout Constants
      const stampWidth = 200; 
      const stampHeight = 100;
      const marginX = 30; 
      const marginY = 40;
      const horizontalSpacing = 20;
      const verticalSpacing = 15;
      const stampsPerRow = Math.floor((width - 2 * marginX + horizontalSpacing) / (stampWidth + horizontalSpacing));

      // 3. Apply all signatures in one pass
      for (let i = 0; i < dbSignatures.length; i++) {
        const sig = dbSignatures[i];
        const stamp = {
          signer: sig.signer_id,
          organization: sig.signer_org,
          timestamp: sig.signed_at,
          signatureType: sig.signature_type,
          transactionId: sig.blockchain_tx_id,
          documentId,
          documentType
        };

        const row = Math.floor(i / stampsPerRow);
        const col = i % stampsPerRow;
        const stampX = width - marginX - (col + 1) * stampWidth - col * horizontalSpacing;
        const stampY = marginY + row * stampHeight + row * verticalSpacing;
        const stampColor = this.getStampColor(stamp.signatureType);

        logger.info(`   - Applying stamp ${i+1}/${dbSignatures.length}: ${sig.signature_type} by ${sig.signer_id}`);

        // Draw signature box
        lastPage.drawRectangle({
          x: stampX, y: stampY, width: stampWidth, height: stampHeight,
          borderColor: stampColor.border, borderWidth: 1.5,
          color: rgb(1, 1, 1), opacity: 1.0,
        });

        // Side accent bar
        lastPage.drawRectangle({
          x: stampX, y: stampY, width: 5, height: stampHeight,
          color: stampColor.border,
        });

        // Checkmark icon
        lastPage.drawText('V', {
          x: stampX + 15, y: stampY + stampHeight - 30,
          size: 24, font: boldFont, color: stampColor.icon,
        });

        // Header
        lastPage.drawText('CECBS DIGITAL PROOF', {
          x: stampX + 45, y: stampY + stampHeight - 18,
          size: 8, font: boldFont, color: rgb(0, 0, 0),
        });

        // Doc Info
        const docInfo = `${stamp.documentType || 'DOC'}: ${stamp.documentId || 'N/A'}`;
        lastPage.drawText(this.truncate(docInfo, 35), {
          x: stampX + 45, y: stampY + stampHeight - 28,
          size: 6, font: font, color: rgb(0.4, 0.4, 0.4),
        });

        // Signature type
        lastPage.drawText(stamp.signatureType, {
          x: stampX + 45, y: stampY + stampHeight - 38,
          size: 7.5, font: boldFont, color: stampColor.text,
        });

        // Signer name
        lastPage.drawText(`Signer: ${this.truncate(stamp.signer, 22)}`, {
          x: stampX + 15, y: stampY + stampHeight - 55,
          size: 7.5, font: font, color: rgb(0.1, 0.1, 0.1),
        });

        // Organization
        lastPage.drawText(`Org: ${this.truncate(stamp.organization, 25)}`, {
          x: stampX + 15, y: stampY + stampHeight - 67,
          size: 7.5, font: boldFont, color: rgb(0.2, 0.2, 0.2),
        });

        // Timestamp
        const dateText = new Date(stamp.timestamp).toLocaleDateString('en-US', {
          month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        lastPage.drawText(dateText, {
          x: stampX + 15, y: stampY + 22,
          size: 6.5, font: font, color: rgb(0.3, 0.3, 0.3),
        });

        // Transaction ID
        if (stamp.transactionId) {
          const txText = `TX: ${stamp.transactionId.substring(0, 18)}...`;
          lastPage.drawText(txText, {
            x: stampX + 15, y: stampY + 10,
            size: 6, font: font, color: rgb(0.5, 0.5, 0.5),
          });
        }
      }

      // 4. Save and flush to disk once
      const pdfBytes = await pdfDoc.save();
      const fd = fs.openSync(filePath, 'w');
      fs.writeSync(fd, pdfBytes, 0, pdfBytes.length);
      fs.fsyncSync(fd);
      fs.closeSync(fd);

      logger.info(`✅ SYNC COMPLETE: ${dbSignatures.length} signatures permanently embedded in ${filePath}`);
    } catch (error) {
      logger.error(`❌ SYNC FAILED for document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Get stamp colors based on signature type
   */
  private static getStampColor(signatureType: string): {
    border: RGB;
    background: RGB;
    icon: RGB;
    text: RGB;
    watermark: RGB;
  } {
    switch (signatureType) {
      case 'APPROVE':
        return {
          border: rgb(0, 0.6, 0),
          background: rgb(0.9, 1, 0.9),
          icon: rgb(0, 0.7, 0),
          text: rgb(0, 0.5, 0),
          watermark: rgb(0, 0.7, 0),
        };
      case 'VERIFY':
        return {
          border: rgb(0.2, 0.5, 0.8),
          background: rgb(0.9, 0.95, 1),
          icon: rgb(0, 0.5, 0.9),
          text: rgb(0, 0.4, 0.8),
          watermark: rgb(0, 0.5, 0.9),
        };
      case 'REJECT':
        return {
          border: rgb(0.8, 0, 0),
          background: rgb(1, 0.9, 0.9),
          icon: rgb(0.8, 0, 0),
          text: rgb(0.7, 0, 0),
          watermark: rgb(0.8, 0, 0),
        };
      case 'UPLOAD':
        return {
          border: rgb(0.6, 0.6, 0.6),
          background: rgb(0.95, 0.95, 0.95),
          icon: rgb(0.5, 0.5, 0.5),
          text: rgb(0.4, 0.4, 0.4),
          watermark: rgb(0.5, 0.5, 0.5),
        };
      default:
        return {
          border: rgb(0.4, 0.4, 0.4),
          background: rgb(0.97, 0.97, 0.97),
          icon: rgb(0.5, 0.5, 0.5),
          text: rgb(0.3, 0.3, 0.3),
          watermark: rgb(0.5, 0.5, 0.5),
        };
    }
  }

  /**
   * Truncate text to fit in stamp
   */
  private static truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Verify if PDF has been modified (basic check)
   */
  public static async verifyPDFIntegrity(
    filePath: string,
    expectedHash: string
  ): Promise<boolean> {
    try {
      const crypto = require('crypto');
      const fileBuffer = fs.readFileSync(filePath);
      const currentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      return currentHash === expectedHash;
    } catch (error) {
      logger.error(`Failed to verify PDF integrity: ${filePath}`, error);
      return false;
    }
  }

  /**
   * Get PDF signature count (count signature stamps)
   */
  public static async getSignatureCount(filePath: string): Promise<number> {
    try {
      const existingPdfBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();

      // This is a placeholder - actual implementation would parse PDF annotations
      // For now, return 0
      return 0;
    } catch (error) {
      logger.error(`Failed to get signature count: ${filePath}`, error);
      return 0;
    }
  }
}

export default DocumentSignatureService;
