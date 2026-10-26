// Decode blockchain certificate to get user identity
const certString = "eDUwOTo6Q049QWRtaW5AZWN0YS5jZWNicy5ldCxPVT1hZG1pbixMPVNhbiBGcmFuY2lzY28sU1Q9Q2FsaWZvcm5pYSxDPVVTOjpDTj1jYS5lY3RhLmNlY2JzLmV0LE89ZWN0YS5jZWNicy5ldCxMPVNhbiBGcmFuY2lzY28sU1Q9Q2FsaWZvcm5pYSxDPVVT";

const decoded = Buffer.from(certString, 'base64').toString('utf8');
console.log('Decoded certificate:');
console.log(decoded);

// Extract CN (Common Name)
const cnMatch = decoded.match(/CN=([^,]+)/);
if (cnMatch) {
  console.log('\nExtracted User:', cnMatch[1]);
}
