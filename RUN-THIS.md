# Complete LC Workflow Test - Commands to Run

## Step 1: Test the retention policy endpoint

```bash
curl -s -X POST -H "Authorization: Bearer test-bypass-admin" \
  -H "Content-Type: application/json" \
  -d '{
    "commodityType": "COFFEE",
    "retentionRate": 40,
    "setBy": "NBE Director General",
    "justification": "Per NBE FXD/01/2024 - Coffee export earnings retention policy"
  }' \
  http://localhost:3001/api/v1/retention/policy | jq '.'
```

## Step 2: Run the complete workflow test

```bash
cd /home/guda/GoCBC
./complete-lc-workflow-with-policy.sh
```

---

## Or run these individual test commands:

### 1. Set NBE Policy
```bash
curl -s -X POST -H "Authorization: Bearer test-bypass-admin" \
  -H "Content-Type: application/json" \
  -d '{"commodityType":"COFFEE","retentionRate":40,"setBy":"NBE Director","justification":"NBE FXD/01/2024"}' \
  http://localhost:3001/api/v1/retention/policy | jq '.'
```

### 2. Check Policy Exists
```bash
curl -s -H "Authorization: Bearer test-bypass-admin" \
  http://localhost:3001/api/v1/retention/policy/COFFEE | jq '.'
```

### 3. Create Forex Request
```bash
curl -s -X POST -H "Authorization: Bearer test-bypass-admin" \
  -H "Content-Type: application/json" \
  -d '{
    "forexId": "FOREX-TEST-'$(date +%s)'",
    "contractId": "CONT-1793296520",
    "exporterId": "EXP-TEST-1793296510",
    "amount": 4250,
    "currency": "USD"
  }' \
  http://localhost:3001/api/v1/forex/request | jq '.'
```

### 4. Allocate Forex (use the forexId from step 3)
```bash
FOREX_ID="FOREX-TEST-1793346999"  # Replace with actual ID from step 3

curl -s -X POST -H "Authorization: Bearer test-bypass-admin" \
  -H "Content-Type: application/json" \
  -d '{
    "forexId": "'$FOREX_ID'",
    "lcId": "LC-1793296548",
    "amount": 4250,
    "exchangeRate": 57.5,
    "retentionRate": 40,
    "officer": "Bank Officer Test",
    "approvalRef": "NBE-FOREX-'$(date +%s)'",
    "expiryDate": "2027-12-31"
  }' \
  http://localhost:3001/api/v1/forex/allocate | jq '.'
```

---

## Expected Results:

✅ **Step 1 (Set Policy)**: Should return `success: true` with policy details
✅ **Step 2 (Check Policy)**: Should show COFFEE policy with 40% retention rate
✅ **Step 3 (Create Forex)**: Should return `success: true` with forexId
✅ **Step 4 (Allocate)**: Should return `success: true` with retention amounts

If all steps succeed, the workflow is fixed! 🎉
