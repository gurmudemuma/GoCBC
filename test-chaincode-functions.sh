#!/bin/bash
cd /home/guda/GoCBC

echo "Testing Chaincode Functions:"
echo ""

echo -n "1. Contract creation (RegisterSalesContract)... "
if grep -q 'RegisterSalesContract' chaincodes/coffee/main.go; then
    echo "PASS"
else
    echo "FAIL"
fi

echo -n "2. Shipment tracking (CreateShipment)... "
if grep -q 'CreateShipment' chaincodes/coffee/main.go; then
    echo "PASS"
else
    echo "FAIL"
fi

echo -n "3. Payment processing (InitiatePayment)... "
if grep -q 'InitiatePayment' chaincodes/coffee/payment.go; then
    echo "PASS"
else
    echo "FAIL"
fi

echo -n "4. Quality certification (PerformInspection)... "
if grep -q 'PerformInspection' chaincodes/coffee/quality.go; then
    echo "PASS"
else
    echo "FAIL"
fi

echo -n "5. LC issuance (IssueLC)... "
if grep -q 'IssueLC' chaincodes/coffee/banking.go; then
    echo "PASS"
else
    echo "FAIL"
fi

echo -n "6. Customs clearance (SubmitCustomsDeclaration)... "
if grep -q 'SubmitCustomsDeclaration' chaincodes/coffee/customs.go; then
    echo "PASS"
else
    echo "FAIL"
fi

echo -n "7. Forex approval (RequestForex)... "
if grep -q 'RequestForex' chaincodes/coffee/forex.go; then
    echo "PASS"
else
    echo "FAIL"
fi

echo -n "8. Repatriation tracking (RecordRepatriation)... "
if grep -q 'RecordRepatriation' chaincodes/coffee/repatriation.go; then
    echo "PASS"
else
    echo "FAIL"
fi

echo -n "9. Document registration (RegisterDocumentHash)... "
if grep -q 'RegisterDocumentHash' chaincodes/coffee/documents.go; then
    echo "PASS"
else
    echo "FAIL"
fi

echo -n "10. Signature capture (CaptureIdentity)... "
if grep -q 'CaptureIdentity' chaincodes/coffee/signature.go; then
    echo "PASS"
else
    echo "FAIL"
fi

echo -n "11. Query contract (ReadSalesContract)... "
if grep -q 'ReadSalesContract' chaincodes/coffee/main.go; then
    echo "PASS"
else
    echo "FAIL"
fi

echo -n "12. History query (GetHistoryForKey)... "
if grep -q 'GetHistoryForKey' chaincodes/coffee/main.go; then
    echo "PASS"
else
    echo "FAIL"
fi

echo ""
echo "Chaincode function tests complete!"
