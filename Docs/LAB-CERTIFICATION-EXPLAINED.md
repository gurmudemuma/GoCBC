# Laboratory Certification Status - Explained

## Understanding the Two Tabs

### 1. "Approved Exporters" Tab (Index 1)
**Data Source:** Database (`exporter_applications` table)  
**Shows:** Applications that have been approved by ECTA  
**Lab Status Column:** Displays registration form data

**Values:**
- ✅ **"Certified"** (green with icon) - Has own lab or contracted lab
- ⚪ **"Exempt"** (gray) - Farmer exporter (exempt from requirement)
- ⚠️ **"Required"** (orange) - Marked as "no" or empty (needs certification)

### 2. "Exporters Management" Tab (Index 2)
**Data Source:** Blockchain (Hyperledger Fabric)  
**Shows:** Exporters registered on the blockchain ledger  
**Lab Status Column:** Toggle switch (On/Off)

**Switch States:**
- 🟢 **ON** - Laboratory certified on blockchain
- ⚫ **OFF** - Not yet certified on blockchain

---

## Why Some Show "Off"?

### The Issue:
Exporters registered before the lab certification update show "Off" because:
1. The chaincode `RegisterExporter` function sets `laboratoryCertified: false` by default
2. Old registrations didn't pass lab certification status
3. Blockchain data is immutable - can't retroactively change past registrations

### The Solution:
Use the **toggle switch** to update certification status:
1. Go to "Exporters Management" tab
2. Find the exporter with "Off" switch
3. Click the switch to turn it "On"
4. This calls the blockchain to update the status

---

## How It Works

### During Approval Process:
```
1. Application submitted → Database (pending)
2. ECTA reviews application
3. ECTA clicks "Approve"
4. System generates:
   - Exporter ID
   - License Number
   - Expiry Date
5. System registers exporter on blockchain
6. Database updated (status = approved)
```

### Blockchain Registration:
```javascript
RegisterExporter(
  exporterId,
  companyName,
  ectaLicenseNumber,
  capitalRequirement,
  professionalTaster,
  tasterCertificate,
  licenseExpiryDate
)
```

**Note:** Current chaincode function doesn't include `laboratoryCertified` parameter.  
This is why it defaults to `false` and must be updated manually via the switch.

---

## Manual Update Process

### For ECTA Administrators:

**Step 1:** Verify in "Approved Exporters" Tab
- Check if exporter has lab certification in database
- Look for "Certified" or "Yes" status

**Step 2:** Update in "Exporters Management" Tab
- Find the same exporter
- If switch is "Off", toggle it "On"
- System updates blockchain

**Step 3:** Verification
- Switch should now be "On"
- Blockchain updated with `laboratoryCertified: true`

---

## Current Status

### Database (Approved Exporters Tab):
```
AbacoffEx
├── Lab Facility: yes
├── Type: private
├── License: ECTA-LIC-2026-003
└── Status: ✅ Shows as "Certified"
```

### Blockchain (Exporters Management Tab):
```
Modern Coffee Exports PLC
├── Lab Certified: ON (75M capital)
├── Status: ACTIVE
└── Can be toggled by ECTA admin

AbacoffEx
├── Lab Certified: OFF (15M capital)
├── Status: ACTIVE
└── ⚠️ Needs manual toggle ON

Mainu
├── Lab Certified: OFF (15M capital)
├── Status: ACTIVE
└── ⚠️ Needs manual toggle ON
```

---

## Future Improvement

### Option 1: Update Chaincode
Add `laboratoryCertified` parameter to `RegisterExporter` function:
```go
func (c *CoffeeContract) RegisterExporter(
    ctx contractapi.TransactionContextInterface,
    exporterID, companyName, ectaLicenseNumber, 
    capitalRequirementStr, professionalTaster, 
    tasterCertificate, licenseExpiryDate string,
    laboratoryCertified bool // NEW PARAMETER
) error {
    // ...
    exporter := Exporter{
        // ... other fields
        LaboratoryCertified: laboratoryCertified, // Use parameter
    }
    // ...
}
```

### Option 2: Automatic Sync
During approval, automatically call the update function to set lab status to true.

### Option 3: Validation Rule
Reject approvals if `laboratory_facility` is not "yes", "contracted", or "farmer".

---

## Quick Action Items

### For Current Exporters with "Off" Status:

1. **AbacoffEx** (EXP4778418)
   - Database says: Lab = yes
   - Blockchain says: Lab = OFF
   - **Action:** Toggle switch ON in Exporters Management tab

2. **Mainu** (EXP9934157)  
   - Database says: Lab = yes (if approved recently)
   - Blockchain says: Lab = OFF
   - **Action:** Toggle switch ON in Exporters Management tab

3. **Modern Coffee Exports PLC** (EXP2026001)
   - Already ON ✅
   - No action needed

---

## Understanding the Discrepancy

### Why Database ≠ Blockchain?

**Database (Applications):**
- Stores application form data
- Includes `laboratory_facility` field
- Updated during approval
- Used for ECTA review process

**Blockchain (Exporters):**
- Stores registered exporter data
- Includes `laboratoryCertified` boolean
- Set during RegisterExporter call
- Used for operational status
- **Immutable** - requires update transaction to change

### They Are Different Records!
- Database = Application record
- Blockchain = Exporter identity record
- Both are needed for different purposes

---

## Recommendation

### Short-term (Now):
1. ✅ Use toggle switches to update existing exporters
2. ✅ Takes 2-3 seconds per exporter
3. ✅ Updates blockchain immediately

### Long-term (Future Enhancement):
1. Update chaincode to accept lab certification parameter
2. Modify approval process to pass lab status
3. Add validation rule requiring lab certification
4. Implement automatic sync during approval

---

## Summary

**Question:** Why does Lab Certified show "Off"?  
**Answer:** Blockchain data defaults to `false`, must be toggled manually for existing exporters.

**Question:** Is the data wrong?  
**Answer:** No, database is correct. Blockchain just needs manual update via switch.

**Question:** Will new approvals have this issue?  
**Answer:** Yes, until chaincode is updated. But easy to toggle after approval.

**Action Required:** Toggle switches ON for exporters that should be lab certified.

---

**Document Date:** June 2, 2026  
**System:** CECBS v1.2.0  
**Status:** ✅ Working as designed (manual update required for old data)
