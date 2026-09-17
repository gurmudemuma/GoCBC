# Manual Endorsement Verification Test

## Goal
Verify that new transactions collect endorsements from all 6 organizations.

## Steps

### 1. Open the UI
Navigate to: `http://localhost:3000`

### 2. Login as Exporter
- Username: `EXP8958382`
- Password: `password123`

### 3. Request a New LC
- Go to "My Contracts" or "Sales Contracts"
- Find contract: `CONTRACT1788435011592`
- Click "Request Letter of Credit" or similar button
- Submit the request
- **Note the LC ID** (e.g., `LC-CONTRACT1788435011592-1788509695626`)

### 4. Logout and Login as Bank
- Logout from exporter account
- Login as bank user:
  - Username: `admin` (or any bank user)
  - Password: `admin123`

### 5. Approve the LC
- Go to "Banks Portal" or "Letters of Credit"
- Find the LC you just requested
- Click "Approve" button
- Wait for confirmation

### 6. Check Endorsements
- Click on the approved LC to view details
- Scroll down to "🔐 Cryptographic Signatures & Blockchain Verification"
- Look for the "ApproveLC" transaction
- Check the "🏛️ Consortium Endorsements" section

## Expected Result

### ✅ SUCCESS (Full Consensus Working):
```
🏛️ Consortium Endorsements (6 Organizations)
Full Consensus: 6 endorser(s) captured.
✓ ECTAMSP
✓ ECXMSP
✓ BanksMSP
✓ NBEMSP
✓ CustomsMSP
✓ ShippingMSP
```

### ⚠️ PARTIAL (Needs Debugging):
```
🏛️ Consortium Endorsements (3-5 Organizations)
Partial Consensus Data: 3-5 endorser(s) captured.
```

### ❌ FAILURE (Code Issue):
```
🏛️ Consortium Endorsements (0-2 Organizations)
OR
Error message during approval
```

## Troubleshooting

If you see partial consensus:
1. Check API logs: `tail -f logs/api.log`
2. Check if all 6 peers are running: `docker ps | grep peer0`
3. Look for endorsement errors in the logs

If approval fails:
1. Check API logs for error details
2. May need to adjust `setEndorsingOrganizations` call
3. One or more peers might be down

## Alternative: Check Forex Allocation

Instead of creating a new LC, you can also:
1. Login as NBE user
2. Allocate forex to an existing approved LC
3. Check endorsements on the "AllocateForex" transaction

This will also show if the 6-org endorsement is working.
