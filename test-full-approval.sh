#!/bin/bash
API="http://localhost:3001/api/v1"
TS=$(date +%s)

# Login
TOKEN=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" -d '{"username":"ectaAdmin","password":"password123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Token: ${TOKEN:0:20}..."

# Submit application
APP_RESULT=$(curl -s -X POST "$API/exporters/exporter-applications" -H "Content-Type: application/json" \
  -d '{"companyName":"Test","tinNumber":"TIN'$TS'","businessLicenseNumber":"BL'$TS'","capitalRequirement":"5000000","professionalTaster":"yes","tasterCertificate":"C1","contactPerson":"John","email":"test'$TS'@t.com","phone":"+251911111111","address":"AA","city":"AA","exporterType":"company","laboratoryFacility":"yes"}')

APP_ID=$(echo "$APP_RESULT" | grep -o '"applicationId":"[^"]*"' | cut -d'"' -f4)
echo "Application ID: $APP_ID"
echo "Submit result: $APP_RESULT"

# Approve
APPROVE_RESULT=$(curl -s -X POST "$API/exporters/exporter-applications/$APP_ID/approve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"exporterId":"EXP'$TS'","ectaLicenseNumber":"LIC'$TS'","licenseExpiryDate":"2027-12-31","bankName":"CBE","bankAccountNumber":"1000'$TS'","bankBranch":"AA","bankBranchCode":"001"}')

echo "Approve result: $APPROVE_RESULT"
