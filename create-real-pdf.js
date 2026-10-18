#!/usr/bin/env node
// Create a real PDF document for testing cryptographic signatures

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, 'test-document.pdf');

// Create a document
const doc = new PDFDocument({ size: 'A4', margin: 50 });

// Pipe to file
doc.pipe(fs.createWriteStream(outputPath));

// Add content
doc
  .fontSize(24)
  .fillColor('#00695c')
  .text('Ethiopian Coffee Export Contract', { align: 'center' })
  .moveDown();

doc
  .fontSize(12)
  .fillColor('black')
  .text('Contract ID: CNT-TEST-2026', { underline: true })
  .text('Date: October 18, 2026')
  .moveDown();

// Contract details box
doc
  .rect(50, doc.y, 495, 200)
  .stroke('#00695c');

doc
  .fontSize(14)
  .fillColor('#00695c')
  .text('Contract Terms', 60, doc.y + 10)
  .moveDown(0.5);

doc
  .fontSize(11)
  .fillColor('black')
  .text('Exporter: Test Coffee Exporter Ltd.', 60)
  .text('Importer: Global Coffee Importers Inc.')
  .text('Product: Arabica Coffee, Grade 1')
  .text('Quantity: 100 metric tons')
  .text('Price: $3,500 per metric ton')
  .text('Total Value: $350,000')
  .moveDown(2);

// Delivery terms
doc
  .fontSize(14)
  .fillColor('#00695c')
  .text('Delivery Terms')
  .moveDown(0.5);

doc
  .fontSize(11)
  .fillColor('black')
  .text('Delivery shall be made FOB Djibouti Port within 30 days of contract signing.')
  .text('This contract is subject to the laws of Ethiopia and international trade regulations.')
  .moveDown(2);

// Footer
doc
  .fontSize(10)
  .fillColor('#666')
  .text('_____________________________________________________________________', { align: 'center' })
  .moveDown(0.5)
  .text('This document will be cryptographically signed using blockchain technology.', { align: 'center' })
  .text('CECBS - Ethiopian Coffee Export Consortium Blockchain System', { align: 'center', oblique: true });

// Finalize the PDF
doc.end();

console.log(`✅ PDF created: ${outputPath}`);

// Wait for file to be written
doc.on('finish', () => {
  const stats = fs.statSync(outputPath);
  console.log(`   File size: ${stats.size} bytes`);
  console.log(`   Ready for cryptographic signature testing!`);
});
