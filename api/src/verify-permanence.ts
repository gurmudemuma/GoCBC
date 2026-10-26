import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DocumentSignatureService } from './services/documentSignatureService';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { logger } from './utils/logger';

async function verifyPermanence() {
    const testDir = path.join(__dirname, '../test-data');
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
    }

    const testPdfPath = path.join(testDir, 'permanence-test.pdf');
    
    logger.info('1. Creating a fresh test PDF...');
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText('CECBS PERMANENCE TEST DOCUMENT', {
        x: 50,
        y: 350,
        size: 20,
        font,
        color: rgb(0, 0, 0),
    });
    
    const initialPdfBytes = await pdfDoc.save();
    fs.writeFileSync(testPdfPath, initialPdfBytes);
    
    const initialHash = crypto.createHash('sha256').update(initialPdfBytes).digest('hex');
    const initialSize = fs.statSync(testPdfPath).size;
    
    logger.info(`Initial File Hash: ${initialHash}`);
    logger.info(`Initial File Size: ${initialSize} bytes`);

    logger.info('2. Applying a permanent digital signature...');
    const stamp = {
        signer: 'Test Supervisor',
        organization: 'ECTAMSP',
        timestamp: new Date().toISOString(),
        signatureType: 'APPROVE',
        role: 'SUPERVISOR',
        transactionId: 'TX-TEST-' + Date.now()
    };

    await DocumentSignatureService.addVisualSignatureToPDF(testPdfPath, stamp, 0);

    logger.info('3. Verifying file modification...');
    const signedPdfBytes = fs.readFileSync(testPdfPath);
    const signedHash = crypto.createHash('sha256').update(signedPdfBytes).digest('hex');
    const signedSize = fs.statSync(testPdfPath).size;

    logger.info(`Signed File Hash: ${signedHash}`);
    logger.info(`Signed File Size: ${signedSize} bytes`);

    if (initialHash !== signedHash) {
        logger.info('✅ SUCCESS: The file hash has changed. The signature is permanently written to the file.');
    } else {
        logger.error('❌ FAILURE: The file hash did not change.');
        process.exit(1);
    }

    if (signedSize > initialSize) {
        logger.info(`✅ SUCCESS: File size increased by ${signedSize - initialSize} bytes, confirming added data.`);
    }

    logger.info('4. Applying a second signature (Multi-party test)...');
    const stamp2 = {
        signer: 'Test Inspector',
        organization: 'ECTAMSP',
        timestamp: new Date().toISOString(),
        signatureType: 'VERIFY',
        role: 'INSPECTOR',
        transactionId: 'TX-TEST-2-' + Date.now()
    };

    await DocumentSignatureService.addVisualSignatureToPDF(testPdfPath, stamp2, 1);

    const multiSignedPdfBytes = fs.readFileSync(testPdfPath);
    const multiSignedHash = crypto.createHash('sha256').update(multiSignedPdfBytes).digest('hex');
    const multiSignedSize = fs.statSync(testPdfPath).size;

    logger.info(`Multi-Signed File Hash: ${multiSignedHash}`);
    logger.info(`Multi-Signed File Size: ${multiSignedSize} bytes`);

    if (multiSignedHash !== signedHash) {
        logger.info('✅ SUCCESS: Second signature also permanently modified the file.');
    }

    // Cleanup
    // fs.unlinkSync(testPdfPath);
    // logger.info('Cleaned up test data.');
}

verifyPermanence().catch(err => {
    logger.error('Verification failed:', err);
    process.exit(1);
});
