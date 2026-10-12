#!/bin/bash

TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"shippingAdmin","password":"password123"}' | \
  node -e "const data = JSON.parse(require('fs').readFileSync(0, 'utf-8')); console.log(data.data?.token || data.token);")

echo "✅ Authenticated"
echo ""

# Record LC Settlement
echo "📄 Recording LC settlement..."
curl -s -X POST http://localhost:3001/api/v1/post-delivery/SHIP1787204371672/lc-settlement \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lcReference":"LC-2026-45678"}' | node -e "const data = JSON.parse(require('fs').readFileSync(0, 'utf-8')); console.log(data.success ? '✅ LC Settlement Recorded' : '❌ Failed: ' + data.error?.message);"

echo ""

# Close Contract
echo "📝 Closing contract..."
curl -s -X POST http://localhost:3001/api/v1/post-delivery/SHIP1787204371672/close-contract \
  -H "Authorization: Bearer $TOKEN" | node -e "const data = JSON.parse(require('fs').readFileSync(0, 'utf-8')); console.log(data.success ? '✅ Contract Closed' : '❌ Failed: ' + data.error?.message);"

echo ""

# Get Final Status
echo "📊 Final Status:"
curl -s http://localhost:3001/api/v1/post-delivery/SHIP1787204371672/status \
  -H "Authorization: Bearer $TOKEN" | node -e "
const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
if (data.success) {
  const s = data.data;
  console.log('   Status:', s.overallStatus);
  console.log('   Completion:', s.completionPercentage + '%');
  console.log('   Payment:', s.paymentReceived ? '✅' : '❌');
  console.log('   Forex:', s.forexRepatriated ? '✅' : '❌');
  console.log('   LC:', s.lcSettled ? '✅' : '❌');
  console.log('   Audit:', s.ectaAuditCompleted ? '✅' : '❌');
  console.log('   Contract Closed:', s.contractClosed ? '✅' : '❌');
} else {
  console.log('❌ Failed to get status');
}
"

echo ""
echo "🎉 Workflow Complete!"
