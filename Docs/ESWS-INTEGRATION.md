# Ethiopian Single Window Service (ESWS) Integration

**Date:** June 3, 2026  
**System:** Ethiopian Coffee Export Consortium Blockchain System (CECBS)

---

## 🌐 **Overview**

The **Ethiopian Single Window Service (ESWS)** is Ethiopia's national trade facilitation platform that serves as the central portal for all import/export procedures. CECBS integrates with ESWS to streamline coffee export processes while maintaining blockchain traceability.

---

## 🔄 **ESWS Role in Coffee Export**

### **What is ESWS?**

The Ethiopian Single Window Service is a unified electronic platform that:
- **Centralizes** all trade-related submissions and approvals
- **Connects** government agencies, customs, banks, and traders
- **Digitizes** export documentation and permits
- **Facilitates** inter-agency coordination
- **Manages** exporter registration and licensing data

### **ESWS Platform:** 
```
https://www.ethiopiantradelogistics.com
```

---

## 👥 **Exporter Interaction with ESWS**

### **Current Workflow (Pre-CECBS):**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Exporter Registration via ESWS                          │
│    • Company registers on ESWS portal                       │
│    • Submits business licenses, TIN, documents             │
│    • ESWS assigns Exporter ID (EXP########)                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. ECTA License Application                                │
│    • Exporter submits coffee export license via ESWS       │
│    • ECTA reviews through ESWS dashboard                   │
│    • ECTA approves/rejects in ESWS                         │
│    • License data stored in ESWS database                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Contract Registration                                    │
│    • Exporter submits sales contract via ESWS              │
│    • NBE reviews and approves via ESWS                     │
│    • ESWS generates contract reference number              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Export Documentation                                     │
│    • All permits, customs declarations via ESWS            │
│    • ESWS routes documents to relevant agencies            │
│    • Status tracking through ESWS portal                   │
└─────────────────────────────────────────────────────────────┘
```

### **ESWS Data Management:**

ESWS maintains:
- ✅ **Exporter Registry** - Company details, licenses, TIN numbers
- ✅ **License Database** - ECTA licenses with expiry tracking
- ✅ **Contract Repository** - NBE-approved sales contracts
- ✅ **Document Archive** - All export-related documents
- ✅ **Status Tracking** - Real-time workflow status
- ✅ **Agency Integration** - ECTA, NBE, Customs, Banks connections

---

## 🔗 **CECBS ↔ ESWS Integration Architecture**

### **Hybrid Approach:**

CECBS doesn't replace ESWS but **complements** it by adding blockchain layer:

```
┌─────────────────────────────────────────────────────────────┐
│                    EXPORTER PORTAL                          │
│           (CECBS - This System)                             │
│                                                             │
│  • Blockchain traceability                                  │
│  • Real-time stakeholder visibility                        │
│  • EUDR compliance tracking                                │
│  • GPS shipment tracking                                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ API Integration
                  │ Data Synchronization
                  ▼
┌─────────────────────────────────────────────────────────────┐
│        Ethiopian Single Window Service (ESWS)              │
│                                                             │
│  • Exporter registration master data                       │
│  • License management                                      │
│  • Government approvals                                    │
│  • Official documentation                                  │
│  • Inter-agency coordination                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 **Data Flow Between Systems**

### **1. Exporter Registration Flow**

```
ESWS (Master)                          CECBS (Blockchain)
─────────────                          ──────────────────

Exporter registers ──────────────────> ESWS API sends data
on ESWS portal                         ↓
                                      CECBS validates
ESWS assigns                          ↓
Exporter ID                           RegisterExporter()
(EXP2026001)                          ↓
                                      Blockchain record created
ESWS stores                           ↓
master data ←──────────────────────── Confirmation returned
                                      
Result: Exporter exists in BOTH systems
```

### **2. License Approval Flow**

```
ESWS                                   CECBS
────                                   ─────

ECTA approves license ──────────────> API notification
in ESWS                                ↓
                                      UpdateExporterLicense()
ESWS updates                          ↓
license status                        Blockchain updated
                                      ↓
License data synced ←──────────────── Immutable record created
```

### **3. Contract Registration Flow**

```
Exporter                 ESWS                      CECBS
────────                ─────                     ─────

Submits contract ────> ESWS portal
                        ↓
                       NBE reviews
                        ↓
                       Approves ─────────────────> API sync
                        ↓                           ↓
                       Generates                   RegisterContract()
                       NBE ref #                   ↓
                        ↓                          Blockchain
                       Contract ←──────────────── record created
                       finalized
```

---

## 🔐 **Authentication Integration**

### **How Exporters Get CECBS Access:**

#### **Option 1: ESWS SSO (Single Sign-On) - Recommended**

```
1. Exporter logs into ESWS
   ↓
2. ESWS authenticates (OAuth2)
   ↓
3. Exporter clicks "Coffee Export Blockchain"
   ↓
4. ESWS generates SSO token
   ↓
5. CECBS validates token with ESWS
   ↓
6. CECBS creates session
   ↓
7. Exporter accesses CECBS portal
```

**Implementation:**
```typescript
// CECBS API - ESWS SSO endpoint
router.post('/auth/esws-sso', async (req, res) => {
  const { eswsToken } = req.body;
  
  // Validate token with ESWS
  const eswsUser = await validateESWSToken(eswsToken);
  
  // Get exporter data from ESWS
  const exporterData = await fetchESWSExporterData(eswsUser.exporterId);
  
  // Create CECBS session
  const cecbsToken = generateCECBSToken(exporterData);
  
  res.json({ token: cecbsToken, user: exporterData });
});
```

#### **Option 2: Standalone Login (Current)**

For exporters who prefer direct access:
- CECBS maintains separate user accounts
- Credentials created after ECTA approval
- Independent of ESWS login

---

## 📡 **API Integration Points**

### **ESWS → CECBS (Push)**

ESWS sends real-time updates to CECBS:

```javascript
// Exporter Registration
POST /api/v1/esws/exporter-registered
{
  "exporterId": "EXP2026001",
  "companyName": "Ethiopian Premium Coffee",
  "tinNumber": "0012345678",
  "ectaLicense": "ECTA-LIC-2026-001",
  "licenseExpiry": "2026-12-31",
  "timestamp": "2026-06-03T10:00:00Z"
}

// License Status Update
POST /api/v1/esws/license-status
{
  "exporterId": "EXP2026001",
  "ectaLicense": "ECTA-LIC-2026-001",
  "status": "ACTIVE" | "SUSPENDED" | "EXPIRED",
  "reason": "Late compliance report",
  "timestamp": "2026-06-03T10:00:00Z"
}

// Contract Approval
POST /api/v1/esws/contract-approved
{
  "contractId": "CONTRACT2026001",
  "exporterId": "EXP2026001",
  "nbeReferenceNumber": "NBE-REF-2026-001",
  "buyerName": "German Coffee Importers GmbH",
  "value": 130000,
  "currency": "USD",
  "approvalDate": "2026-05-20",
  "timestamp": "2026-06-03T10:00:00Z"
}
```

### **CECBS → ESWS (Pull)**

CECBS queries ESWS for validation:

```javascript
// Verify Exporter Exists
GET /esws/api/v1/exporters/{exporterId}
Response: {
  "exporterId": "EXP2026001",
  "status": "ACTIVE",
  "companyName": "...",
  "licenses": [...]
}

// Verify License Valid
GET /esws/api/v1/licenses/{licenseNumber}
Response: {
  "licenseNumber": "ECTA-LIC-2026-001",
  "status": "ACTIVE",
  "expiryDate": "2026-12-31",
  "issueDate": "2025-01-01"
}

// Fetch Contract Details
GET /esws/api/v1/contracts/{nbeReferenceNumber}
Response: {
  "nbeRefNumber": "NBE-REF-2026-001",
  "status": "APPROVED",
  "approvalDate": "2026-05-20",
  "contractValue": 130000
}
```

---

## 🎯 **Benefits of Integration**

### **For Exporters:**

1. **Single Entry, Multiple Uses**
   - Register once in ESWS
   - Automatic CECBS account creation
   - Unified exporter ID across systems

2. **Seamless Workflow**
   - ESWS for government procedures
   - CECBS for blockchain traceability
   - No duplicate data entry

3. **Real-Time Sync**
   - License status synchronized
   - Contract approvals instant
   - Document updates reflected immediately

4. **Enhanced Visibility**
   - ESWS for compliance tracking
   - CECBS for shipment tracking
   - Complete export journey view

### **For Government Agencies:**

1. **Data Consistency**
   - ESWS as master data source
   - CECBS for immutable audit trail
   - No conflicting records

2. **Reduced Manual Work**
   - Automatic data synchronization
   - No manual entry in multiple systems
   - Error reduction

3. **Enhanced Oversight**
   - ESWS for regulatory compliance
   - CECBS for blockchain verification
   - Complete transparency

---

## 🔧 **Implementation Status**

### **Phase 1: Standalone Operation (Current)**

✅ CECBS operates independently  
✅ Manual exporter account creation  
✅ Blockchain functionality complete  
✅ All 6 organizations integrated  

### **Phase 2: ESWS Integration (Planned)**

🔄 ESWS API connection  
🔄 SSO authentication  
🔄 Real-time data synchronization  
🔄 Automatic exporter onboarding  

### **Phase 3: Full Integration (Future)**

📋 ESWS embedded CECBS widget  
📋 Unified exporter dashboard  
📋 Complete workflow automation  
📋 Cross-system reporting  

---

## 📝 **Current Exporter Onboarding Process**

### **Without ESWS Integration (Phase 1):**

```
1. Exporter applies for ECTA license (via ESWS)
   ↓
2. ECTA approves in ESWS
   ↓
3. ECTA admin manually registers exporter in CECBS
   ├─ Uses ESWS data (Exporter ID, License Number)
   ├─ Creates blockchain record
   └─ Generates login credentials
   ↓
4. ECBS sends credentials to exporter
   ↓
5. Exporter logs into CECBS portal
   ↓
6. Exporter uses both systems:
   ├─ ESWS: Government procedures, documentation
   └─ CECBS: Blockchain tracking, EUDR compliance
```

### **With ESWS Integration (Phase 2 - Future):**

```
1. Exporter applies for ECTA license (via ESWS)
   ↓
2. ECTA approves in ESWS
   ↓
3. ESWS automatically calls CECBS API
   ├─ Registers exporter on blockchain
   ├─ Creates CECBS account
   └─ Links ESWS SSO
   ↓
4. Exporter logs into ESWS
   ↓
5. Click "Coffee Export Blockchain" button
   ↓
6. Automatic SSO to CECBS portal (no separate login)
```

---

## 🌟 **Key Differences: ESWS vs CECBS**

| Aspect | ESWS | CECBS |
|--------|------|-------|
| **Purpose** | Government procedures | Blockchain traceability |
| **Scope** | All import/export | Coffee export only |
| **Data Type** | Regulatory documents | Supply chain events |
| **Technology** | Centralized database | Distributed blockchain |
| **Users** | All traders | Coffee stakeholders |
| **Focus** | Compliance & approvals | Transparency & EUDR |
| **Managed By** | Ministry of Trade | Coffee Consortium |
| **Data Authority** | Master data source | Immutable audit trail |

---

## 🔐 **Data Privacy & Security**

### **Data Sharing Agreement:**

- **ESWS owns** exporter registration master data
- **CECBS stores** blockchain transaction records
- **Both share** via secure API with encryption
- **Exporter consent** required for data sync
- **GDPR/local laws** compliance maintained

### **What Gets Shared:**

**ESWS → CECBS:**
- ✅ Exporter ID
- ✅ Company name
- ✅ License numbers
- ✅ License status
- ✅ Contract approvals
- ❌ Financial details
- ❌ Bank account info
- ❌ Private business data

**CECBS → ESWS:**
- ✅ Blockchain transaction IDs
- ✅ Shipment status updates
- ✅ EUDR compliance status
- ❌ Blockchain private data
- ❌ Internal workflow details

---

## 📞 **Contact Information**

### **ESWS Support:**
- Website: https://www.ethiopiantradelogistics.com
- Email: support@esws.gov.et
- Phone: +251-11-xxx-xxxx

### **CECBS Support:**
- System: CECBS Portal
- Email: support@cecbs.et
- Phone: +251-11-xxx-xxxx

### **ECTA (Licensing):**
- Website: http://www.ect.gov.et
- Email: info@ecta.gov.et
- Phone: +251-11-xxx-xxxx

---

## 📚 **Related Documents**

- `EXPORTER-REQUIREMENTS-2026.md` - Complete exporter requirements
- `EXPORTER-LOGIN-GUIDE.md` - How exporters access CECBS
- `ARCHITECTURE.md` - System architecture overview
- `API-DOCUMENTATION.md` - API integration details

---

## 🎯 **Summary**

**ESWS** = Ethiopian government's trade facilitation platform (master data)  
**CECBS** = Coffee export blockchain system (traceability + transparency)

**Integration Status:** Planned for Phase 2  
**Current Operation:** Standalone with manual data entry from ESWS  
**Future Vision:** Seamless SSO and automatic synchronization

Exporters benefit from:
- ✅ Single registration (ESWS)
- ✅ Dual system access (ESWS + CECBS)
- ✅ Blockchain traceability (CECBS)
- ✅ Government compliance (ESWS)
- ✅ Complete visibility (both systems)

---

**Last Updated:** June 3, 2026  
**Version:** 1.0  
**Status:** ESWS integration planned for Phase 2
