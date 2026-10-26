const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cecbs',
  user: 'cecbs',
  password: 'cecbs123'
});

const uploadsDir = path.join(__dirname, 'uploads', 'documents');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true});
}

const documentData = [
  {
    id: 'DOC_1787204314325_ghzu2qoer',
    name: 'Customs Clearance Certificate.pdf',
    content: `ETHIOPIAN CUSTOMS COMMISSION
    
CUSTOMS CLEARANCE CERTIFICATE

Certificate No: CLR-1787837192606-47921
Date: August 27, 2026

This is to certify that the following shipment has been cleared for export:

Shipment ID: SHIP1787204371672
Exporter: Ethiopian Coffee Exporter
Declaration Value: USD 1,522,756.00
Export Duty: ETB 119,330.00
VAT: ETB 475,320.00

Status: CLEARED
Cleared By: customsAdmin
Clearance Date: August 27, 2026

This certificate authorizes the export of the above shipment.

___________________________
Customs Officer
Ethiopian Customs Commission`
  },
  {
    id: 'DOC_1787204321224_683c6u3gy',
    name: 'Export Permit.pdf',
    content: `MINISTRY OF TRADE AND REGIONAL INTEGRATION

EXPORT PERMIT

Permit No: EP-2026-08-1234
Issue Date: August 20, 2026

Exporter Details:
Company Name: Ethiopian Coffee Exporter
License No: ECTA-2024-001
TIN: 0123456789

Export Authorization:
Product: Arabica Coffee Beans
Quantity: 203,034 kg
Destination: International Market
FOB Value: USD 1,522,756.00

This permit is valid for 90 days from the date of issue.

___________________________
Authorized Officer
Ministry of Trade`
  },
  {
    id: 'DOC_1787204333266_53bpjrff3',
    name: 'Phytosanitary Certificate.pdf',
    content: `MINISTRY OF AGRICULTURE
PLANT HEALTH REGULATORY DIRECTORATE

PHYTOSANITARY CERTIFICATE

Certificate No: PC-2026-08-5678
Issue Date: August 22, 2026

Consignment Details:
Product: Coffee Beans (Coffea arabica)
Quantity: 203,034 kg
Origin: Ethiopia
Destination: International

Inspection Results:
Inspection Date: August 22, 2026
Inspector: Ministry Plant Health Officer

CERTIFICATION:
This is to certify that the plants, plant products or other regulated articles
described herein have been inspected and/or tested according to appropriate
official procedures and are considered to be free from quarantine pests.

___________________________
Plant Health Officer
Ministry of Agriculture`
  },
  {
    id: 'DOC_1787204339636_fmjmycwr6',
    name: 'Truck Registration.pdf',
    content: `ETHIOPIA TRANSPORT AUTHORITY

VEHICLE REGISTRATION CERTIFICATE

Registration No: ET-AA-12345
Issue Date: January 15, 2024

Vehicle Details:
Make: ISUZU
Model: FVR 34
Year: 2023
Type: Cargo Truck
Capacity: 15 Tons

Owner Details:
Name: Ethiopian Transport Company
License No: ETC-2023-456

This vehicle is registered and authorized for commercial transport.

Valid Until: January 15, 2027

___________________________
Transport Authority Official`
  },
  {
    id: 'DOC_1787204346315_5qz8bpx7t',
    name: 'Driver License.pdf',
    content: `ETHIOPIA TRANSPORT AUTHORITY

COMMERCIAL DRIVER'S LICENSE

License No: DL-AA-789456
Issue Date: March 10, 2023

Driver Information:
Name: Abebe Kebede
Date of Birth: June 15, 1985
License Class: D (Heavy Goods Vehicle)

Endorsements:
- Cargo Transport
- Long Distance
- Hazardous Materials (Basic)

Valid Until: March 10, 2028

___________________________
Transport Authority Official`
  },
  {
    id: 'DOC_1787204353614_80s51riy5',
    name: 'Bill of Lading.pdf',
    content: `ETHIOPIAN SHIPPING AND LOGISTICS SERVICES

BILL OF LADING

B/L No: BOL-2026-08-9876
Date: August 27, 2026

Shipper: Ethiopian Coffee Exporter
Consignee: International Buyer
Notify Party: Freight Forwarder

Shipment Details:
Shipment ID: SHIP1787204371672
Origin: Addis Ababa, Ethiopia
Destination: International Port
Transport Mode: Land to Port

Cargo Description:
- Arabica Coffee Beans
- Quantity: 203,034 kg
- Packaging: Jute Bags
- Container: 40ft Standard

Freight Terms: CIF
Payment Terms: LC at Sight

___________________________
Shipping Agent
Ethiopian Shipping Services`
  }
];

(async () => {
  try {
    console.log('\n📝 Creating sample PDF documents...\n');
    
    for (const doc of documentData) {
      const txtPath = path.join(uploadsDir, `${doc.id}.txt`);
      const pdfPath = path.join(uploadsDir, `${doc.id}.pdf`);
      
      // Write text content
      fs.writeFileSync(txtPath, doc.content);
      console.log(`✅ Created text file: ${doc.name}`);
      
      // Update database with actual file path
      await pool.query(`
        UPDATE documents 
        SET file_path = $1, 
            mime_type = 'application/pdf',
            file_size = $2
        WHERE document_id = $3
      `, [pdfPath, doc.content.length, doc.id]);
      
      console.log(`✅ Updated database for: ${doc.name}`);
    }
    
    console.log('\n✅ All documents created successfully!');
    console.log('\n📌 Note: Text files created. To convert to PDF, you can use:');
    console.log('   - Online tools like https://www.ilovepdf.com/txt_to_pdf');
    console.log('   - Or manually copy content and save as PDF');
    console.log(`   - Files are in: ${uploadsDir}\n`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
})();
