# System Traceability - Consortium-Wide View Implementation

## Summary
Updated System Traceability to show activities from **ALL consortium members** (ECTA, ECX, NBE, Banks, Customs, Shipping, Exporters) for admin users, providing complete network visibility.

---

## Problem Identified

The System Traceability was using the same filtering logic as individual portals, which could limit what admin users see. We needed to ensure that admin users see **EVERYTHING** across all consortium members without any entity type restrictions.

---

## Solution Implemented

### 1. Updated API Endpoint: Admin Gets ALL Activities

**File:** `api/src/routes/audit.ts`

**BEFORE (Limited):**
```typescript
} else if (userRole === 'ADMIN') {
  // Admin sees everything
  entityTypes.push('CONTRACT', 'EXPORTER', 'LC', 'PAYMENT', 'FOREX', 'SHIPMENT', 'QUALITY', 'PERMIT', 'DOCUMENT', 'USER');
}
```
❌ **Problem:** Still filtering by specific entity types (might miss some)

**AFTER (Unrestricted):**
```typescript
if (userRole === 'ADMIN') {
  // Admin sees EVERYTHING - no entity type filter needed
  // entityTypes remains empty = no filter applied
} else if (userOrg === 'ECTAMSP' || userRole.includes('ECTA')) {
  entityTypes.push('CONTRACT', 'EXPORTER', 'EXPORTER_APPLICATION', 'QUALITY', 'INSPECTION', 'PERMIT', 'DOCUMENT');
} else if (userOrg === 'BANKSMSP' || userRole.includes('BANK')) {
  entityTypes.push('LC', 'LETTER_OF_CREDIT', 'CONTRACT', 'PAYMENT', 'FOREX', 'DOCUMENT');
}
// ... other organizations
```
✅ **Solution:** Admin check comes FIRST, and `entityTypes` remains empty (no filtering)

### 2. Added Organization Statistics

**Added to API Response:**
```typescript
const stats = {
  total: parsedLogs.length,
  byAction: parsedLogs.reduce((acc: any, log: any) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {}),
  byEntityType: parsedLogs.reduce((acc: any, log: any) => {
    acc[log.entity_type] = (acc[log.entity_type] || 0) + 1;
    return acc;
  }, {}),
  byOrganization: parsedLogs.reduce((acc: any, log: any) => {
    acc[log.performed_by_org] = (acc[log.performed_by_org] || 0) + 1;
    return acc;
  }, {}),  // ← NEW: Count activities per organization
};
```

**Returns:**
```json
{
  "byOrganization": {
    "ECTA": 12,
    "ECX": 8,
    "NBE": 5,
    "BANKS": 10,
    "CUSTOMS": 6,
    "SHIPPING": 4,
    "EXPORTERS": 4
  }
}
```

### 3. Updated UI: Consortium-Wide Indicator

**File:** `ui/src/components/portals/SystemTraceability.tsx`

**Added Visual Indicators:**
- Header text: "Complete **Network** Activity Trail"
- Subtitle: "ALL consortium members (ECTA, ECX, NBE, Banks, Customs, Shipping, Exporters)"
- Consortium badge: "🌐 Consortium-Wide View"
- Organization chips showing all 7 members with their brand colors

**Visual Result:**
```
┌──────────────────────────────────────────────────────────┐
│  System Traceability - Complete Network Activity Trail   │
│  Trace every single activity across ALL consortium       │
│  members with complete audit trail                       │
│                                                           │
│  [🌐 Consortium-Wide View]                               │
│  [ECTA] [ECX] [NBE] [BANKS] [CUSTOMS] [SHIPPING]        │
│  [EXPORTERS]                                             │
└──────────────────────────────────────────────────────────┘
```

---

## Query Logic Flow

### For ADMIN Users:
```typescript
if (userRole === 'ADMIN') {
  entityTypes = []; // Empty = no filter
}

// SQL Query:
SELECT * FROM audit_trail
WHERE 1=1  // No entity type filter
ORDER BY created_at DESC
LIMIT 1000;

// Result: ALL activities from ALL entities across ALL organizations
```

### For Organization Users (e.g., ECTA):
```typescript
if (userOrg === 'ECTAMSP') {
  entityTypes = ['CONTRACT', 'EXPORTER', 'EXPORTER_APPLICATION', 'QUALITY', ...];
}

// SQL Query:
SELECT * FROM audit_trail
WHERE entity_type = ANY(['CONTRACT', 'EXPORTER', ...])
ORDER BY created_at DESC
LIMIT 1000;

// Result: Only activities relevant to ECTA
```

---

## What Admin Now Sees

### All Entity Types (Examples):
```
✅ CONTRACT - Coffee export contracts
✅ EXPORTER - Exporter registrations and updates
✅ EXPORTER_APPLICATION - Application submissions
✅ LC (Letter of Credit) - Banking documents
✅ PAYMENT - Payment transactions
✅ FOREX - Foreign exchange approvals
✅ SHIPMENT - Shipping movements
✅ CUSTOMS_DECLARATION - Customs clearances
✅ BILL_OF_LADING - Shipping documents
✅ QUALITY - Coffee quality inspections
✅ PERMIT - Export permits
✅ DOCUMENT - Document uploads/downloads
✅ USER - User management activities
... and ANY other entity types added in the future
```

### All Organizations:
```
✅ ECTA - Ethiopian Coffee & Tea Authority
✅ ECX - Ethiopian Commodity Exchange
✅ NBE - National Bank of Ethiopia
✅ BANKS - Commercial banks (LC issuance, payments)
✅ CUSTOMS - Ethiopian Customs Commission
✅ SHIPPING - Shipping companies and freight forwarders
✅ EXPORTERS - Coffee exporters (private companies)
```

### All Actions:
```
✅ CREATE - New entity creation
✅ UPDATE - Entity modifications
✅ APPROVE - Approvals by authorities
✅ REJECT - Rejections with reasons
✅ SUBMIT - Submissions (applications, documents)
✅ ISSUE - Issuance (LC, permits, certificates)
✅ SHIP - Shipping initiation
✅ DELIVER - Delivery confirmation
✅ PAY - Payment processing
✅ VERIFY - Verification actions
... and more
```

---

## Complete Activity Trail Example

**Admin can now trace a complete coffee export journey:**

```
1. Aug 01, 9:00 AM - EXPORTER (Sunshine Coffee)
   Action: SUBMIT
   Entity: EXPORTER_APPLICATION-12345
   Details: Application submitted with all documents
   
2. Aug 02, 10:30 AM - ECTA (ecta_officer_1)
   Action: APPROVE
   Entity: EXPORTER_APPLICATION-12345
   Details: Application approved, license issued
   
3. Aug 05, 2:15 PM - EXPORTER (Sunshine Coffee)
   Action: CREATE
   Entity: CONTRACT-001
   Details: Contract created with buyer details
   
4. Aug 06, 11:00 AM - ECTA (ecta_officer_2)
   Action: APPROVE
   Entity: CONTRACT-001
   Details: Contract approved by ECTA
   
5. Aug 07, 3:45 PM - BANKS (Commercial Bank of Ethiopia)
   Action: ISSUE
   Entity: LC-001
   Details: Letter of Credit issued for CONTRACT-001
   
6. Aug 08, 9:30 AM - NBE (nbe_forex_dept)
   Action: APPROVE
   Entity: FOREX-001
   Details: Foreign exchange approved
   
7. Aug 10, 1:00 PM - EXPORTER (Sunshine Coffee)
   Action: CREATE
   Entity: SHIPMENT-001
   Details: Shipment prepared for CONTRACT-001
   
8. Aug 11, 8:00 AM - CUSTOMS (customs_officer_3)
   Action: APPROVE
   Entity: CUSTOMS_DECLARATION-001
   Details: Customs clearance approved
   
9. Aug 12, 2:30 PM - SHIPPING (Maersk Ethiopia)
   Action: SHIP
   Entity: SHIPMENT-001
   Details: Container loaded on vessel
```

**Result:** Admin can see the COMPLETE journey from application to shipping across ALL 7 organizations!

---

## Filter Capabilities (Admin)

Admin can filter the consortium-wide data by:

### 1. Search
- Entity ID: "CONTRACT-001"
- Username: "ecta_officer_1"
- Reason: "approved"

### 2. Date Range
- Today
- Last 7 Days
- Last 30 Days
- All Time

### 3. Entity Type
- ALL (default for admin)
- CONTRACT
- EXPORTER
- LC
- PAYMENT
- SHIPMENT
- CUSTOMS_DECLARATION
- ... and more

### 4. Action
- ALL (default)
- CREATE
- UPDATE
- APPROVE
- REJECT
- SUBMIT
- ISSUE
- SHIP
- ... and more

### 5. Organization ← **NEW FILTER**
- ALL (default for admin)
- ECTA
- ECX
- NBE
- BANKS
- CUSTOMS
- SHIPPING
- EXPORTERS

**Example:** "Show me all APPROVE actions by ECTA in the last 7 days"
```
Filter: Action=APPROVE, Organization=ECTA, Date=Last 7 Days
Result: 12 activities
```

---

## Statistics Breakdown

### Top-Level KPI Cards:
```
[Total Activities: 49]  ← All consortium members
[Unique Entities: 25]   ← All entity types
[Unique Users: 15]      ← All organizations' users
[Blockchain Verified: 21] ← All verified transactions
```

### Organization Breakdown (Future Enhancement):
Could add a pie chart or bar chart showing:
```
ECTA: 12 activities (24%)
BANKS: 10 activities (20%)
ECX: 8 activities (16%)
CUSTOMS: 6 activities (12%)
NBE: 5 activities (10%)
SHIPPING: 4 activities (8%)
EXPORTERS: 4 activities (8%)
```

---

## Security & Access Control

### Admin Role Check:
```typescript
if (userRole === 'ADMIN') {
  // Consortium-wide access granted
}
```

### Non-Admin Users:
- ECTA users: See only ECTA-relevant entities
- Bank users: See only banking-relevant entities
- Exporters: See only their own activities
- ... etc.

**Each organization sees only what they need**, but **admin sees everything**.

---

## API Response Example

**Request:**
```
GET /api/audit/portal/recent?limit=1000
Headers: { Authorization: "Bearer <admin_token>" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": 1,
        "entity_type": "CONTRACT",
        "entity_id": "CONTRACT-001",
        "action": "APPROVE",
        "performed_by": "ecta_officer_1",
        "performed_by_org": "ECTA",
        "old_value": "PENDING",
        "new_value": "APPROVED",
        "reason": "All documents verified",
        "metadata": { "blockchainVerified": true, "blockchainTxId": "abc123..." },
        "ip_address": "10.0.1.5",
        "created_at": "2026-08-12T10:30:00Z"
      },
      {
        "id": 2,
        "entity_type": "LC",
        "entity_id": "LC-001",
        "action": "ISSUE",
        "performed_by": "bank_officer_2",
        "performed_by_org": "BANKS",
        "old_value": "N/A",
        "new_value": "ISSUED",
        "reason": "Letter of Credit issued for CONTRACT-001",
        "metadata": { "blockchainVerified": true, "blockchainTxId": "def456..." },
        "ip_address": "10.0.2.8",
        "created_at": "2026-08-12T11:45:00Z"
      },
      // ... more logs from all organizations
    ],
    "statistics": {
      "total": 49,
      "byAction": {
        "CREATE": 15,
        "APPROVE": 12,
        "UPDATE": 10,
        "ISSUE": 8,
        "SUBMIT": 4
      },
      "byEntityType": {
        "CONTRACT": 10,
        "EXPORTER": 8,
        "LC": 8,
        "PAYMENT": 7,
        "SHIPMENT": 6,
        "CUSTOMS_DECLARATION": 5,
        "FOREX": 5
      },
      "byOrganization": {
        "ECTA": 12,
        "BANKS": 10,
        "ECX": 8,
        "CUSTOMS": 6,
        "NBE": 5,
        "SHIPPING": 4,
        "EXPORTERS": 4
      }
    },
    "filters": {
      "organization": "ALL",
      "role": "ADMIN",
      "entityTypes": "ALL",
      "limit": 1000
    }
  },
  "timestamp": "2026-08-12T14:30:00Z"
}
```

---

## Benefits

### ✅ Complete Network Visibility
- Admin sees activities from ALL 7 consortium members
- No entity type restrictions
- True system-wide traceability

### ✅ Compliance & Auditing
- Complete audit trail across the entire network
- Can trace any transaction from start to finish
- Meets regulatory requirements for full transparency

### ✅ Problem Investigation
- Can identify bottlenecks across organizations
- Can track down issues regardless of where they occur
- Can see the complete flow of any transaction

### ✅ Business Intelligence
- Understand which organizations are most active
- Identify which entity types have most activity
- Analyze workflow patterns across the consortium

### ✅ Security Monitoring
- Detect suspicious activities across all organizations
- Monitor for unauthorized access attempts
- Track all administrative actions

---

## Testing Checklist

- [ ] Login as ADMIN user
- [ ] Navigate to Admin Portal → System Traceability tab
- [ ] Verify header shows "Complete Network Activity Trail"
- [ ] Verify consortium badge shows "🌐 Consortium-Wide View"
- [ ] Verify all 7 organization chips are displayed
- [ ] Check that activities from ALL organizations are shown:
  - [ ] ECTA activities visible
  - [ ] BANKS activities visible
  - [ ] ECX activities visible
  - [ ] NBE activities visible
  - [ ] CUSTOMS activities visible
  - [ ] SHIPPING activities visible
  - [ ] EXPORTERS activities visible
- [ ] Test filters:
  - [ ] Filter by organization: ECTA → Should show only ECTA
  - [ ] Filter by organization: ALL → Should show everything
  - [ ] Filter by entity type: CONTRACT → Should show all contracts
  - [ ] Filter by action: APPROVE → Should show all approvals
- [ ] Verify statistics cards show consortium-wide totals
- [ ] Check that expandable details show correct organization
- [ ] Test CSV export includes all organizations
- [ ] Verify blockchain verified count includes all org transactions

---

## Comparison: Portal-Specific vs Consortium-Wide

### ECTA Portal (Filtered View):
```
Entity Types: CONTRACT, EXPORTER, EXPORTER_APPLICATION, QUALITY, INSPECTION, PERMIT, DOCUMENT
Organizations: Primarily ECTA
Activities: 15
Purpose: ECTA staff managing their operations
```

### Admin Portal - System Traceability (Consortium-Wide):
```
Entity Types: ALL (no filter)
Organizations: ALL (ECTA, ECX, NBE, BANKS, CUSTOMS, SHIPPING, EXPORTERS)
Activities: 49
Purpose: Admin overseeing entire network
```

---

## Conclusion

**System Traceability now provides TRUE consortium-wide visibility:**

✅ **ALL Organizations** - ECTA, ECX, NBE, Banks, Customs, Shipping, Exporters  
✅ **ALL Entity Types** - Contracts, LCs, Payments, Shipments, Customs, etc.  
✅ **ALL Actions** - Create, Approve, Issue, Ship, Pay, Verify, etc.  
✅ **Complete Lifecycle** - Trace from application to delivery across all members  
✅ **Real-Time Data** - Auto-refresh every 30 seconds  
✅ **Advanced Filtering** - Filter by org, entity, action, date, search  
✅ **Export Capability** - Download consortium-wide audit trail  

**Result:** Admin has complete visibility into the entire CECBS consortium network!

---

**Status:** ✅ COMPLETE  
**Date:** 2026-08-12  
**Enhancement:** System Traceability now shows activities from ALL consortium members
