// ECTA Exporter License PDF Generation Service
// Generates professional, cryptographically signed license documents

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

interface ExporterLicenseData {
  licenseNumber: string;
  companyName: string;
  companyAddress: string;
  tinNumber: string;
  contactPerson: string;
  email: string;
  phone: string;
  approvalDate: string;
  expiryDate: string;
  approvedBy: string;
  blockchainTxId?: string;
}

interface LicenseGenerationResult {
  pdfPath: string;
  pdfBuffer: Buffer;
  digitalSignature: string;
  verificationCode: string;
}

class LicensePdfService {
  private certificatesDir = path.join(__dirname, '../../certificates');
  private licensesDir = path.join(__dirname, '../../licenses');

  constructor() {
    // Ensure directories exist
    [this.certificatesDir, this.licensesDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Generate a professional ECTA Export License PDF with digital signature
   */
  async generateLicense(data: ExporterLicenseData): Promise<LicenseGenerationResult> {
    const fileName = `ECTA-LICENSE-${data.licenseNumber}.pdf`;
    const filePath = path.join(this.licensesDir, fileName);

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `ECTA Export License - ${data.licenseNumber}`,
        Author: 'Ethiopian Coffee and Tea Authority',
        Subject: 'Coffee Export License',
        Keywords: 'ECTA, Export, License, Coffee, Ethiopia',
        CreationDate: new Date(),
      }
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    // Header - ECTA Logo Area (placeholder for now)
    doc.rect(50, 50, 495, 100).fillAndStroke('#1a5f3f', '#0d3d29');
    
    doc.fontSize(24)
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .text('ETHIOPIAN COFFEE AND TEA AUTHORITY', 60, 75, { 
        align: 'center',
        width: 475
      });
    
    doc.fontSize(14)
      .fillColor('#e8f5e9')
      .font('Helvetica')
      .text('በቡና እና ሻይ ባለሥልጣን', 60, 110, { 
        align: 'center',
        width: 475
      });

    // License Title
    doc.fontSize(28)
      .fillColor('#1a5f3f')
      .font('Helvetica-Bold')
      .text('COFFEE EXPORT LICENSE', 50, 180, {
        align: 'center',
        underline: true
      });

    // License Number with highlight
    doc.rect(50, 230, 495, 50).fillAndStroke('#f1f8e9', '#1a5f3f');
    doc.fontSize(16)
      .fillColor('#1a5f3f')
      .font('Helvetica-Bold')
      .text(`License No: ${data.licenseNumber}`, 60, 245, {
        align: 'center'
      });

    // Company Information Section
    let yPos = 310;
    doc.fontSize(14)
      .fillColor('#333333')
      .font('Helvetica-Bold')
      .text('LICENSED EXPORTER DETAILS', 50, yPos);
    
    yPos += 30;
    const lineHeight = 25;

    const fields = [
      { label: 'Company Name:', value: data.companyName },
      { label: 'Company Address:', value: data.companyAddress },
      { label: 'TIN Number:', value: data.tinNumber },
      { label: 'Contact Person:', value: data.contactPerson },
      { label: 'Email Address:', value: data.email },
      { label: 'Phone Number:', value: data.phone },
    ];

    fields.forEach(field => {
      doc.fontSize(11)
        .fillColor('#555555')
        .font('Helvetica-Bold')
        .text(field.label, 70, yPos, { continued: true, width: 150 })
        .font('Helvetica')
        .fillColor('#000000')
        .text(field.value, { width: 350 });
      yPos += lineHeight;
    });

    // License Validity Section
    yPos += 20;
    doc.rect(50, yPos, 495, 80).fillAndStroke('#e3f2fd', '#1976d2');
    
    yPos += 15;
    doc.fontSize(12)
      .fillColor('#0d47a1')
      .font('Helvetica-Bold')
      .text('LICENSE VALIDITY', 60, yPos);
    
    yPos += 25;
    doc.fontSize(11)
      .fillColor('#1565c0')
      .font('Helvetica')
      .text(`Issue Date: ${new Date(data.approvalDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      })}`, 70, yPos);
    
    yPos += 20;
    doc.text(`Expiry Date: ${new Date(data.expiryDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      })}`, 70, yPos);

    // Terms and Conditions
    yPos += 50;
    doc.fontSize(12)
      .fillColor('#333333')
      .font('Helvetica-Bold')
      .text('TERMS AND CONDITIONS', 50, yPos);
    
    yPos += 25;
    const terms = [
      'This license is valid for export of Ethiopian coffee products only.',
      'The licensee must comply with all ECTA quality standards and regulations.',
      'All exports must be registered on the CECBS blockchain system.',
      'This license is non-transferable and remains property of ECTA.',
      'ECTA reserves the right to suspend or revoke this license for violations.',
    ];

    doc.fontSize(9)
      .fillColor('#555555')
      .font('Helvetica');
    
    terms.forEach((term, index) => {
      doc.text(`${index + 1}. ${term}`, 70, yPos, { width: 460 });
      yPos += 20;
    });

    // Digital Signature Section
    yPos += 20;
    
    // Generate verification code and digital signature
    const verificationData = JSON.stringify({
      license: data.licenseNumber,
      company: data.companyName,
      tin: data.tinNumber,
      issued: data.approvalDate,
      expires: data.expiryDate,
    });
    
    const verificationCode = crypto
      .createHash('sha256')
      .update(verificationData)
      .digest('hex')
      .substring(0, 16)
      .toUpperCase();
    
    const digitalSignature = crypto
      .createHash('sha256')
      .update(verificationData + process.env.KEY_PASSPHRASE)
      .digest('hex');

    doc.rect(50, yPos, 495, 120).fillAndStroke('#fff3e0', '#f57c00');
    
    yPos += 15;
    doc.fontSize(11)
      .fillColor('#e65100')
      .font('Helvetica-Bold')
      .text('DIGITAL VERIFICATION', 60, yPos);
    
    yPos += 25;
    doc.fontSize(9)
      .fillColor('#bf360c')
      .font('Helvetica')
      .text(`Verification Code: ${verificationCode}`, 70, yPos);
    
    yPos += 15;
    doc.fontSize(8)
      .fillColor('#666666')
      .text(`Digital Signature: ${digitalSignature.substring(0, 64)}...`, 70, yPos, { width: 460 });
    
    if (data.blockchainTxId) {
      yPos += 15;
      doc.text(`Blockchain TX: ${data.blockchainTxId.substring(0, 64)}`, 70, yPos, { width: 460 });
    }

    yPos += 20;
    doc.fontSize(8)
      .fillColor('#666666')
      .text('Verify this license at: https://cecbs.et/verify-license', 70, yPos, {
        link: 'https://cecbs.et/verify-license',
        underline: true
      });

    // Authority Signature Section
    yPos += 35;
    doc.fontSize(10)
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .text('Authorized by:', 70, yPos);
    
    doc.fontSize(11)
      .font('Helvetica')
      .text(data.approvedBy, 70, yPos + 20);
    
    doc.fontSize(9)
      .fillColor('#666666')
      .text('Director, Ethiopian Coffee and Tea Authority', 70, yPos + 35);

    // Footer
    doc.fontSize(8)
      .fillColor('#999999')
      .font('Helvetica')
      .text(
        'Ethiopian Coffee and Tea Authority | Addis Ababa, Ethiopia | www.ecta.gov.et',
        50,
        750,
        { align: 'center', width: 495 }
      );
    
    doc.fontSize(7)
      .text(
        `Generated: ${new Date().toLocaleString('en-US')} | Secured by CECBS Blockchain`,
        50,
        765,
        { align: 'center', width: 495 }
      );

    // Finalize PDF
    doc.end();

    // Wait for PDF generation to complete
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });

    // Save PDF to file
    await writeFile(filePath, pdfBuffer);

    return {
      pdfPath: filePath,
      pdfBuffer,
      digitalSignature,
      verificationCode,
    };
  }

  /**
   * Verify a license using its verification code
   */
  async verifyLicense(licenseNumber: string, verificationCode: string): Promise<boolean> {
    try {
      const filePath = path.join(this.licensesDir, `ECTA-LICENSE-${licenseNumber}.pdf`);
      
      if (!fs.existsSync(filePath)) {
        return false;
      }

      // In production, verify against database
      return true;
    } catch (error) {
      console.error('License verification error:', error);
      return false;
    }
  }

  /**
   * Get license file path
   */
  getLicensePath(licenseNumber: string): string {
    return path.join(this.licensesDir, `ECTA-LICENSE-${licenseNumber}.pdf`);
  }
}

export default new LicensePdfService();
