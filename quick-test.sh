#!/bin/bash
set -e
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjMsInVzZXJJZCI6MywidXNlcm5hbWUiOiJlY3RhQWRtaW4iLCJyb2xlIjoiRUNUQSIsIm9yZyI6IkVDVEEiLCJvcmdhbml6YXRpb24iOiJFQ1RBIiwicGVybWlzc2lvbnMiOlsidXNlcnM6Y3JlYXRlLW9yZyIsInVzZXJzOnJlYWQtb3JnIiwidXNlcnM6dXBkYXRlLW9yZyIsInVzZXJzOmRlbGV0ZS1vcmciLCJibG9ja2NoYWluOmVucm9sbC1vcmciLCJxdWFsaXR5Om1hbmFnZSIsInBlcm1pdHM6bWFuYWdlIiwicGh5dG9zYW5pdGFyeTptYW5hZ2UiLCJsaWNlbnNlczptYW5hZ2UiLCJhbmFseXRpY3M6dmlldy1vcmciLCJleHBvcnRlcnM6YXBwcm92ZSIsImV4cG9ydGVyczp2ZXJpZnkiXSwiaWF0IjoxNzg2MTAyNTI1LCJleHAiOjE3ODYxODg5MjV9.QMKbag8Jmk5vkSoQi3NezN1RQGplL_Q0JN99AAqRd58"

echo "Testing approval..."
timeout 10 curl -s -X POST "http://localhost:3001/api/v1/exporters/exporter-applications/APP-89403477/approve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"exporterId":"EXP001","ectaLicenseNumber":"LIC001","licenseExpiryDate":"2027-12-31","bankName":"CBE","bankAccountNumber":"1000123","bankBranch":"AA","bankBranchCode":"001"}'
echo ""
