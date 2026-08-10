#!/bin/bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"ectaAdmin","password":"password123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

curl -s -X POST "http://localhost:3001/api/v1/exporters/exporter-applications/APP-89282566/approve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"exporterId":"EXP123","ectaLicenseNumber":"LIC123","licenseExpiryDate":"2027-12-31","bankName":"CBE","bankAccountNumber":"1000123","bankBranch":"AA","bankBranchCode":"001"}'
