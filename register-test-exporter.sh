#!/bin/bash

# Register Test Exporter EXP001 on Blockchain
# This script registers the test exporter used in the workflow test

echo "=============================================="
echo "Registering Test Exporter EXP001"
echo "=============================================="

# Register exporter via API
curl -X POST http://localhost:3001/api/v1/exporters/register \
  -H "Content-Type: application/json" \
  -d '{
    "exporterID": "EXP001",
    "companyName": "Test Coffee Exporter Ltd",
    "ectaLicenseNumber": "ECTA-2024-001",
    "exporterType": "company",
    "capitalRequirement": "5000000",
    "professionalTaster": "yes",
    "tasterCertificate": "TASTER-CERT-001",
    "laboratoryCertificateNumber": "LAB-CERT-001",
    "licenseExpiryDate": "2027-12-31"
  }'

echo ""
echo "=============================================="
echo "Exporter Registration Complete"
echo "=============================================="
