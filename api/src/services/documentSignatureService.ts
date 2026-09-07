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
}

export class DocumentSignatureService {
  /**
   * Add visual signature stamp to PDF document
   * Creates a signature box with signer details and watermark
   */
  public static async addVisualSignatureToPDF(
    filePath: string,
    stamp: SignatureStamp
  ): Promise<void> {
    try {
      logger.info(`Adding visual signature to PDF: ${filePath}`);

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
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();

      // Calculate stamp position (bottom right corner)
      const stampWidth = 200;
      const stampHeight = 90;
      const margin = 20;
      const stampX = width - stampWidth - margin;
      const stampY = margin;

      // Determine stamp color based on signature type
      const stampColor = this.getStampColor(stamp.signatureType);

      // ✅ Draw signature box
      firstPage.drawRectangle({
        x: stampX,
        y: stampY,
        width: stampWidth,
        height: stampHeight,
        borderColor: stampColor.border,
        borderWidth: 2,
        color: stampColor.background,
        opacity: 0.95,
      });

      // ✅ Draw checkmark icon
      firstPage.drawText('✓', {
        x: stampX + 10,
        y: stampY + stampHeight - 35,
        size: 32,
        font: boldFont,
        color: stampColor.icon,
      });

      // ✅ Draw signature label
      firstPage.drawText('DIGITALLY SIGNED', {
        x: stampX + 50,
        y: stampY + stampHeight - 22,
        size: 10,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      // ✅ Draw signature type
      firstPage.drawText(stamp.signatureType, {
        x: stampX + 50,
        y: stampY + stampHeight - 34,
        size: 8,
        font: font,
        color: stampColor.text,
      });

      // ✅ Draw signer name
      const signerText = `By: ${this.truncate(stamp.signer, 25)}`;
      firstPage.drawText(signerText, {
        x: stampX + 10,
        y: stampY + stampHeight - 50,
        size: 8,
        font: font,
        color: rgb(0, 0, 0),
      });

      // ✅ Draw organization
      const orgText = `Org: ${this.truncate(stamp.organization, 23)}`;
      firstPage.drawText(orgText, {
        x: stampX + 10,
        y: stampY + stampHeight - 62,
        size: 7,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });

      // ✅ Draw timestamp
      const dateText = `Date: ${new Date(stamp.timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })}`;
      firstPage.drawText(dateText, {
        x: stampX + 10,
        y: stampY + stampHeight - 74,
        size: 6,
        font: font,
        color: rgb(0.3, 0.3, 0.3),
      });

      // ✅ Draw transaction ID (if provided)
      if (stamp.transactionId) {
        const txText = `TX: ${stamp.transactionId.substring(0, 12)}...`;
        firstPage.drawText(txText, {
          x: stampX + 10,
          y: stampY + 8,
          size: 6,
          font: font,
          color: rgb(0.5, 0.5, 0.5),
        });
      }

      // ✅ Add watermark to all pages (optional - only for approved documents)
      if (stamp.signatureType === 'APPROVE') {
        for (const page of pages) {
          const { width: pageWidth, height: pageHeight } = page.getSize();
          page.drawText('SIGNED', {
            x: pageWidth / 2 - 80,
            y: pageHeight / 2,
            size: 80,
            font: boldFont,
            color: stampColor.watermark,
            opacity: 0.08,
            rotate: degrees(45),
          });
        }
      }

      // ✅ Save modified PDF
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(filePath, pdfBytes);

      logger.info(`✅ Visual signature added to PDF: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to add visual signature to PDF: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Add multiple signature stamps to PDF (for documents with multiple signers)
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

      // Get first page
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();

      // Calculate stamp dimensions
      const stampWidth = 180;
      const stampHeight = 70;
      const margin = 15;
      const spacing = 10;

      // Add stamps vertically (starting from bottom)
      let currentY = margin;

      for (let i = 0; i < Math.min(stamps.length, 5); i++) {
        const stamp = stamps[i];
        const stampX = width - stampWidth - margin;
        const stampColor = this.getStampColor(stamp.signatureType);

        // Draw signature box
        firstPage.drawRectangle({
          x: stampX,
          y: currentY,
          width: stampWidth,
          height: stampHeight,
          borderColor: stampColor.border,
          borderWidth: 1.5,
          color: stampColor.background,
          opacity: 0.9,
        });

        // Draw checkmark
        firstPage.drawText('✓', {
          x: stampX + 8,
          y: currentY + stampHeight - 25,
          size: 20,
          font: boldFont,
          color: stampColor.icon,
        });

        // Draw signer info
        firstPage.drawText(this.truncate(stamp.signer, 20), {
          x: stampX + 35,
          y: currentY + stampHeight - 20,
          size: 8,
          font: boldFont,
          color: rgb(0, 0, 0),
        });

        firstPage.drawText(stamp.organization, {
          x: stampX + 35,
          y: currentY + stampHeight - 32,
          size: 7,
          font: font,
          color: rgb(0.4, 0.4, 0.4),
        });

        firstPage.drawText(stamp.signatureType, {
          x: stampX + 35,
          y: currentY + stampHeight - 44,
          size: 7,
          font: font,
          color: stampColor.text,
        });

        const dateStr = new Date(stamp.timestamp).toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        });
        firstPage.drawText(dateStr, {
          x: stampX + 35,
          y: currentY + stampHeight - 56,
          size: 6,
          font: font,
          color: rgb(0.5, 0.5, 0.5),
        });

        currentY += stampHeight + spacing;

        // If running out of space, stop adding more stamps
        if (currentY + stampHeight > height - margin) {
          logger.warn(`Only ${i + 1} of ${stamps.length} signatures fit on first page`);
          break;
        }
      }

      // Save modified PDF
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(filePath, pdfBytes);

      logger.info(`✅ ${Math.min(stamps.length, 5)} visual signatures added to PDF`);
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
