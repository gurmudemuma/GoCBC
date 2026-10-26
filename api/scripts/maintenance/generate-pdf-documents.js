const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

const uploadsDir = path.join(__dirname, 'uploads', 'documents');

const documents = [
  {
    id: 'DOC_1787204314325_ghzu2qoer',
    title: 'CUSTOMS CLEARANCE CERTIFICATE',
    organization: 'ETHIOPIAN CUSTOMS COMMISSION',
    content: [
      'Certificate No: CLR-1787837192606-47921',
      'Date: August 27, 2026',
      '',
      'This is to certify that the following shipment has been cleared for export:',
      '',
      'Shipment ID: SHIP1787204371672',
      'Exporter: Ethiopian Coffee Exporter',
      'Declaration Value: USD 1,522,756.00',
      'Export Duty: ETB 119,330.00',
      'VAT: ETB 475,320.00',
      '',
      'Status: CLEARED',
      'Cleared By: customsAdmin',
      'Clearance Date: August 27, 2026',
      '',
      'This certificate authorizes the export of the above shipment.',
      '',
      '',
      '___________________________',
      'Customs Officer',
      'Ethiopian Customs Commission'
    ]
  },
  {
    id: 'DOC_1787204321224_683c6u3gy',
    title: 'EXPORT PERMIT',
    organization: 'MINISTRY OF TRADE AND REGIONAL INTEGRATION',
    content: [
      'Permit No: EP-2026-08-1234',
      'Issue Date: August 20, 2026',
      '',
      'Exporter Details:',
      'Company Name: Ethiopian Coffee Exporter',
      'License No: ECTA-2024-001',
      'TIN: 0123456789',
      '',
      'Export Authorization:',
      'Product: Arabica Coffee Beans',
      'Quantity: 203,034 kg',
      'Destination: International Market',
      'FOB Value: USD 1,522,756.00',
      '',
      'This permit is valid for 90 days from the date of issue.',
      '',
      '',
      '___________________________',
      'Authorized Officer',
      'Ministry of Trade'
    ]
  },
  {
    id: 'DOC_1787204333266_53bpjrff3',
    title: 'PHYTOSANITARY CERTIFICATE',
    organization: 'MINISTRY OF AGRICULTURE - PLANT HEALTH REGULATORY DIRECTORATE',
    content: [
      'Certificate No: PC-2026-08-5678',
      'Issue Date: August 22, 2026',
      '',
      'Consignment Details:',
      'Product: Coffee Beans (Coffea arabica)',
      'Quantity: 203,034 kg',
      'Origin: Ethiopia',
      'Destination: International',
      '',
      'Inspection Results:',
      'Inspection Date: August 22, 2026',
      'Inspector: Ministry Plant Health Officer',
      '',
      'CERTIFICATION:',
      'This is to certify that the plants, plant products or other regulated',
      'articles described herein have been inspected and/or tested according',
      'to appropriate official procedures and are considered to be free from',
      'quarantine pests.',
      '',
      '',
      '___________________________',
      'Plant Health Officer',
      'Ministry of Agriculture'
    ]
  },
  {
    id: 'DOC_1787204339636_fmjmycwr6',
    title: 'VEHICLE REGISTRATION CERTIFICATE',
    organization: 'ETHIOPIA TRANSPORT AUTHORITY',
    content: [
      'Registration No: ET-AA-12345',
      'Issue Date: January 15, 2024',
      '',
      'Vehicle Details:',
      'Make: ISUZU',
      'Model: FVR 34',
      'Year: 2023',
      'Type: Cargo Truck',
      'Capacity: 15 Tons',
      '',
      'Owner Details:',
      'Name: Ethiopian Transport Company',
      'License No: ETC-2023-456',
      '',
      'This vehicle is registered and authorized for commercial transport.',
      '',
      'Valid Until: January 15, 2027',
      '',
      '',
      '___________________________',
      'Transport Authority Official'
    ]
  },
  {
    id: 'DOC_1787204346315_5qz8bpx7t',
    title: "COMMERCIAL DRIVER'S LICENSE",
    organization: 'ETHIOPIA TRANSPORT AUTHORITY',
    content: [
      'License No: DL-AA-789456',
      'Issue Date: March 10, 2023',
      '',
      'Driver Information:',
      'Name: Abebe Kebede',
      'Date of Birth: June 15, 1985',
      'License Class: D (Heavy Goods Vehicle)',
      '',
      'Endorsements:',
      '- Cargo Transport',
      '- Long Distance',
      '- Hazardous Materials (Basic)',
      '',
      'Valid Until: March 10, 2028',
      '',
      '',
      '___________________________',
      'Transport Authority Official'
    ]
  },
  {
    id: 'DOC_1787204353614_80s51riy5',
    title: 'BILL OF LADING',
    organization: 'ETHIOPIAN SHIPPING AND LOGISTICS SERVICES',
    content: [
      'B/L No: BOL-2026-08-9876',
      'Date: August 27, 2026',
      '',
      'Shipper: Ethiopian Coffee Exporter',
      'Consignee: International Buyer',
      'Notify Party: Freight Forwarder',
      '',
      'Shipment Details:',
      'Shipment ID: SHIP1787204371672',
      'Origin: Addis Ababa, Ethiopia',
      'Destination: International Port',
      'Transport Mode: Land to Port',
      '',
      'Cargo Description:',
      '- Arabica Coffee Beans',
      '- Quantity: 203,034 kg',
      '- Packaging: Jute Bags',
      '- Container: 40ft Standard',
      '',
      'Freight Terms: CIF',
      'Payment Terms: LC at Sight',
      '',
      '',
      '___________________________',
      'Shipping Agent',
      'Ethiopian Shipping Services'
    ]
  }
];

async function generatePDF(docInfo) {
  return new Promise((resolve, reject) => {
    const pdfPath = path.join(uploadsDir, `${docInfo.id}.pdf`);
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(pdfPath);

    doc.pipe(stream);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text(docInfo.organization, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).text(docInfo.title, { align: 'center' });
    doc.moveDown(2);

    // Content
    doc.fontSize(11).font('Helvetica');
    docInfo.content.forEach(line => {
      if (line === '') {
        doc.moveDown(0.5);
      } else if (line.startsWith('___')) {
        doc.text(line, { align: 'left' });
      } else {
        doc.text(line);
      }
    });

    // Footer with seal/stamp placeholder
    doc.moveDown(2);
    doc.fontSize(8).fillColor('gray').text('Official Document - For Export Purposes', { align: 'center' });
    
    doc.end();

    stream.on('finish', () => resolve(pdfPath));
    stream.on('error', reject);
  });
}

(async () => {
  try {
    console.log('\n📝 Generating PDF documents...\n');

    for (const docInfo of documents) {
      const pdfPath = await generatePDF(docInfo);
      const stats = fs.statSync(pdfPath);
      
      // Update database
      await pool.query(`
        UPDATE documents 
        SET file_path = $1, 
            mime_type = 'application/pdf',
            file_size = $2
        WHERE document_id = $3
      `, [pdfPath, stats.size, docInfo.id]);

      console.log(`✅ Generated ${docInfo.title}.pdf (${(stats.size / 1024).toFixed(2)} KB)`);
    }

    console.log('\n✅ All PDF documents generated successfully!');
    console.log(`📂 Location: ${uploadsDir}\n`);

    // Clean up old .txt files
    documents.forEach(doc => {
      const txtPath = path.join(uploadsDir, `${doc.id}.txt`);
      if (fs.existsSync(txtPath)) {
        fs.unlinkSync(txtPath);
      }
    });
    console.log('🗑️  Cleaned up old .txt files\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
  } finally {
    await pool.end();
  }
})();
