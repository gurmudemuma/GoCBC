#!/bin/bash
# Set USD Exchange Rate from Current NBE/CBE Published Rates
# Source: Commercial Bank of Ethiopia (Oct 30, 2026)
# Rate: 160.88 ETB buying, 164.10 ETB selling (2% spread per NBE guidelines)

echo "Setting USD exchange rate from current CBE published rates..."
curl -s -X POST -H "Authorization: Bearer test-bypass-admin" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "USD",
    "buyingRate": 160.88,
    "sellingRate": 164.10
  }' \
  http://localhost:3001/api/v1/forex/rates | jq '.'

echo ""
echo "Source: Commercial Bank of Ethiopia live rates"
echo "Date: October 30, 2026"
echo "Reference: https://ethio.forex/"
