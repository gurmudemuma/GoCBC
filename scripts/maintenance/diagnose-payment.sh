#!/bin/bash

echo "=== Payment Release Diagnostics ==="
echo ""

# Check if API is running
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo "✓ API is running"
else
    echo "✗ API is NOT running"
    exit 1
fi

# Check latest test data
echo ""
echo "Latest E2E test IDs:"
ls -t /tmp/*_e2e*.json 2>/dev/null | head -5 | while read file; do
    echo "  - $(basename $file)"
done

# Check if payment exists
echo ""
echo "Checking payment record..."
PAYMENT_ID="PAY-E2E-1793608688"
echo "Payment ID: $PAYMENT_ID"

# Try to get payment via API
ADMIN_TOKEN=$(curl -s -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ADMIN_TOKEN" ]; then
    echo "✓ Admin authenticated"
    
    # Get payment details
    PAYMENT_INFO=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
      "http://localhost:5001/api/v1/payments/$PAYMENT_ID")
    
    echo ""
    echo "Payment details:"
    echo "$PAYMENT_INFO" | python3 -m json.tool 2>/dev/null || echo "$PAYMENT_INFO"
fi

# Check API logs for errors
echo ""
echo "Recent API errors:"
tail -20 /tmp/api-restart.log 2>/dev/null | grep -i "error\|failed" | tail -5

echo ""
echo "=== End Diagnostics ==="
