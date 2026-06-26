# Quick Reference Guide - CECBS with Cryptographic Signatures
## Ethiopian Coffee Export Consortium Blockchain System

**Version:** 2.0.0  
**Last Updated:** June 25, 2026

---

## 🚀 QUICK START

### **Start the System:**
```bash
# 1. Start Blockchain Network
cd c:\CEX
./scripts/start.sh

# 2. Start API Server
cd api
npm start

# 3. Start UI
cd ui
npm run dev
```

### **Access URLs:**
- **UI:** http://localhost:3000
- **API:** http://localhost:3001
- **API Docs:** http://localhost:3001/api-docs
- **Health Check:** http://localhost:3001/health

---

## 🔑 USER CREDENTIALS

### **Default Test Users:**
```
ECTA Officer:
  Email: admin@ecta.gov.et
  Password: [set during setup]
  Portal: /portals/ecta

NBE Officer:
  Email: admin@nbe.gov.et
  Password: [set during setup]
  Portal: /portals/nbe

Bank Officer:
  Email: admin@cbe.com.et
  Password: [set during setup]
  Portal: /portals/banks

Exporter:
  Email: [registered email]
  Password: [set during registration]
  Portal: /portals/exporter
```

---

## 📊 WORKFLOW QUICK REFERENCE

### **16-Step Process:**
```
1. Registration      → Public → ECTA
2. ECTA Approval     → ECTA assigns bank/branch
3. Contract          → Exporter creates
4. NBE Approval      → NBE approves contract
5. LC Request        → Bank processes
6. Forex Allocation  → NBE allocates
7. Shipment          → Exporter creates
8. Quality Check     → ECTA inspects
9. Export Permit     → ECTA issues
10. Customs          → Customs clears
11. Shipping         → Vessel departs, B/L issued
12. Payment Docs     → Exporter submits (within 21 days!)
13. Bank Verify      → Bank checks documents
14. SWIFT            → Payment transfer
15. Settlement       → 40% USD, 60% ETB
16. ✅ Complete
```

---

## 🔐 AUDIT TRAIL QUICK ACCESS

### **View Audit Logs:**
```typescript
// In any portal component
import AuditTrailViewer from './AuditTrailViewer';

<Button onClick={() => setAuditOpen(true)}>
  View Audit Trail
</Button>

<AuditTrailViewer
  entityType="EXPORTER"  // or CONTRACT, SHIPMENT, LC, PAYMENT
  entityId={entityId}
  open={auditOpen}
  onClose={() => setAuditOpen(false)}
/>
```

### **Query Audit via API:**
```bash
# Get entity audit trail
curl http://localhost:3001/api/v1/audit/entity/EXPORTER/EXP123

# Get all actions by person
curl http://localhost:3001/api/v1/audit/actor/9a7b8c6d5e...

# Verify integrity
curl http://localhost:3001/api/v1/audit/verify/CONTRACT/CNT-2026-001

# Download compliance report
curl http://localhost:3001/api/v1/audit/compliance-report/EXPORTER/EXP123 -o report.json
```

---

## 🏦 BANK/BRANCH INTEGRATION

### **Banks Available:**
```
1. Commercial Bank of Ethiopia (CBE) - 10 branches
2. Awash Bank - 5 branches
3. Dashen Bank - 5 branches
4. Bank of Abyssinia - 4 branches
5. Wegagen Bank - 3 branches
... 15 banks total, 50+ branches
```

### **Use Bank/Branch Selector:**
```typescript
import BankBranchSelect from './BankBranchSelect';

<BankBranchSelect
  value={{ bank: bankName, branch: branchName }}
  onChange={(bank, branch) => {
    setBankName(bank);
    setBranchName(branch);
  }}
/>
```

---

## ⚡ COMMON TASKS

### **1. Register New Exporter**
```
Portal: Public Registration
Steps:
  1. Fill company details
  2. Upload documents (6 required)
  3. Submit application
  4. Wait for ECTA approval
  5. Receive credentials via email
```

### **2. Approve Exporter (ECTA)**
```
Portal: ECTA Portal → Pending Applications
Steps:
  1. Review application
  2. Verify documents
  3. Select bank/branch for LC
  4. Approve or reject
  5. System auto-generates exporter ID + license
```

### **3. Create Contract (Exporter)**
```
Portal: Exporter Portal → My Contracts → Create
Steps:
  1. Enter buyer details
  2. Enter coffee details (type, quantity, price)
  3. Upload sales contract
  4. Submit for NBE approval
```

### **4. Approve Contract (NBE)**
```
Portal: NBE Portal → Contract Approvals
Steps:
  1. Review contract details
  2. Verify minimum price
  3. Check buyer country (sanctions)
  4. Approve or reject
```

### **5. Submit Payment Documents (Exporter)**
```
Portal: Exporter Portal → Payments → Submit Documents
Prerequisites:
  ✅ Shipment status = DEPARTED
  ✅ Within 21 days of B/L date
  ✅ Before LC expiry
Steps:
  1. Upload 10 required documents
  2. System validates timing
  3. Submit to bank
  4. Wait for verification (5-7 days)
```

---

## 🔍 TROUBLESHOOTING

### **Issue: Cannot submit payment documents**
**Cause:** Shipment not departed yet  
**Solution:** Wait until shipment status = DEPARTED (B/L issued)

### **Issue: "LC has expired" error**
**Cause:** Trying to submit after LC expiry date  
**Solution:** Contact buyer to extend LC or get authorization

### **Issue: "Presentation period expired"**
**Cause:** More than 21 days since B/L date  
**Solution:** Contact bank immediately for options

### **Issue: Audit logs not appearing**
**Cause:** Chaincode not updated  
**Solution:** Ensure chaincode v2.0 is deployed with signature.go

### **Issue: Bank verification taking too long**
**Cause:** Discrepancies in documents  
**Solution:** Check for consistency across all documents

---

## 📱 API ENDPOINTS CHEAT SHEET

### **Authentication:**
```
POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/auth/logout
```

### **Exporters:**
```
GET    /api/v1/exporters
POST   /api/v1/exporters/applications
GET    /api/v1/exporters/:id
PATCH  /api/v1/exporters/:id/approve
```

### **Contracts:**
```
GET    /api/v1/contracts
POST   /api/v1/contracts
GET    /api/v1/contracts/:id
PATCH  /api/v1/contracts/:id/approve
```

### **Banking:**
```
GET    /api/v1/banking/lcs
POST   /api/v1/banking/lcs/request
PATCH  /api/v1/banking/lcs/:id/approve
GET    /api/v1/banking/payments
POST   /api/v1/banking/payments/:id/documents
PATCH  /api/v1/banking/payments/:id/verify
```

### **🆕 Audit:**
```
GET    /api/v1/audit/log/:logId
GET    /api/v1/audit/entity/:type/:id
GET    /api/v1/audit/actor/:certHash
GET    /api/v1/audit/verify/:type/:id
GET    /api/v1/audit/compliance-report/:type/:id
```

---

## 🔐 SECURITY BEST PRACTICES

### **For Developers:**
1. ✅ Always use environment variables for secrets
2. ✅ Never commit private keys or certificates
3. ✅ Use HTTPS in production
4. ✅ Implement rate limiting
5. ✅ Validate all user inputs
6. ✅ Sanitize data before blockchain writes
7. ✅ Review audit logs regularly

### **For Users:**
1. ✅ Use strong passwords (min 12 characters)
2. ✅ Enable 2FA if available
3. ✅ Never share credentials
4. ✅ Log out after use
5. ✅ Report suspicious activity
6. ✅ Review your audit trail regularly

---

## 📊 STATUS CODES

### **Shipment Status:**
```
CREATED           → Just created, awaiting inspection
QUALITY_APPROVED  → ECTA approved quality
PERMIT_ISSUED     → Export permit issued
CUSTOMS_CLEARED   → Customs cleared
BOOKED            → Container booked
LOADED            → Loaded on vessel
DEPARTED          → Vessel departed (B/L issued) ⚠️ Can submit docs now!
IN_TRANSIT        → En route to buyer
ARRIVED           → Arrived at destination
DELIVERED         → Delivered to buyer
```

### **Contract Status:**
```
REGISTERED        → Created, awaiting NBE
NBE_APPROVED      → NBE approved
APPROVED          → Fully approved
ACTIVE            → Active with shipments
COMPLETED         → All shipments delivered
```

### **Payment Status:**
```
PENDING                → Awaiting document submission
DOCUMENTS_SUBMITTED    → Documents submitted to bank
VERIFIED              → Bank verified documents
SWIFT_INITIATED       → SWIFT payment initiated
SWIFT_RECEIVED        → SWIFT received at bank
SETTLED               → Payment settled (40%/60%)
```

### **LC Status:**
```
REQUESTED    → LC requested
APPROVED     → Bank approved
ISSUED       → LC issued (SWIFT MT700)
UTILIZED     → Used for payment
EXPIRED      → Expired
```

---

## 🚨 CRITICAL TIMING RULES

### **Payment Documents:**
```
⚠️ MUST submit AFTER:    Shipment status = DEPARTED
⚠️ MUST submit WITHIN:   21 days of B/L date
⚠️ MUST submit BEFORE:   LC expiry date

Failure = Late presentation = May not get paid!
```

### **Quality Inspection:**
```
MUST complete BEFORE:    Export permit issuance
MUST complete BEFORE:    Customs clearance
```

### **LC Issuance:**
```
SHOULD issue BEFORE:     Shipment creation (recommended)
MUST issue BEFORE:       Payment document submission
```

---

## 🔧 DEVELOPER COMMANDS

### **Blockchain:**
```bash
# Query chaincode
peer chaincode query -C coffeechannel -n coffee -c '{"Args":["ReadExporter","EXP123"]}'

# Invoke chaincode
peer chaincode invoke -C coffeechannel -n coffee -c '{"Args":["RegisterExporter","..."]}'

# View chaincode logs
docker logs peer0.ecta.cecbs.et

# View audit logs
peer chaincode query -C coffeechannel -n coffee -c '{"Args":["QueryAuditLogsByEntity","EXPORTER","EXP123"]}'
```

### **API:**
```bash
# View logs
pm2 logs cecbs-api

# Restart API
pm2 restart cecbs-api

# Test endpoint
curl -X GET http://localhost:3001/health
```

### **Database:**
```bash
# SQLite console
sqlite3 api/cecbs.db

# List tables
.tables

# Query exporters
SELECT * FROM exporter_applications LIMIT 10;

# Query users
SELECT * FROM users WHERE role = 'exporter';
```

---

## 📚 USEFUL LINKS

- **Main Documentation:** README.md
- **Workflow Details:** WORKFLOW-SEQUENCE-ENFORCEMENT.md
- **Audit System:** CRYPTOGRAPHIC-SIGNATURE-SYSTEM.md
- **Deployment Guide:** CRYPTOGRAPHIC-SIGNATURE-FINAL-STATUS.md
- **Complete Overview:** SYSTEM-COMPLETE-OVERVIEW.md
- **API Documentation:** http://localhost:3001/api-docs

---

## 🆘 SUPPORT

### **For Technical Issues:**
- Check logs: `pm2 logs cecbs-api`
- Check blockchain logs: `docker logs peer0.ecta.cecbs.et`
- Review documentation in `/Docs` folder
- Check audit trail for error tracking

### **For Business Issues:**
- Contact ECTA: ecta@cecbs.et
- Contact NBE: nbe@cecbs.et
- Contact Bank: [your assigned bank]
- Review compliance report for details

---

## 📝 QUICK NOTES

### **Remember:**
- ✅ Always verify audit trail after critical actions
- ✅ Payment documents timing is CRITICAL (21 days!)
- ✅ Every action is cryptographically signed and traceable
- ✅ Hash chain verification ensures data integrity
- ✅ X.509 certificates provide non-repudiation
- ✅ Compliance metadata tracks all regulatory requirements

### **Tips:**
- 💡 Use audit trail viewer for investigation
- 💡 Download compliance reports for records
- 💡 Check verification status regularly
- 💡 Monitor deadlines (LC expiry, presentation period)
- 💡 Keep documents consistent across all submissions

---

**Quick Reference Version:** 2.0.0  
**Last Updated:** June 25, 2026  
**Status:** ✅ Current

**For detailed information, refer to complete documentation.**
