# Complete Coffee Export Workflow Status Diagram

## Full Workflow Visualization

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                        ETHIOPIAN COFFEE EXPORT WORKFLOW                          │
│                    (Consortium Blockchain Coffee System)                          │
└───────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: CONTRACT & BANKING                                                    │
│  Organization: Exporter, Buyer, Banks (CBE)                                     │
└─────────────────────────────────────────────────────────────────────────────────┘
    │
    ├─► 1. Sales Contract Signed
    │      Status: CONTRACT_SIGNED
    │      Blockchain: RegisterSalesContract
    │
    ├─► 2. Letter of Credit (L/C) Issued
    │      Status: LC_ISSUED
    │      Blockchain: IssueLC
    │
    ├─► 3. Forex Allocation Approved
    │      Status: FOREX_ALLOCATED
    │      Blockchain: AllocateForex
    │
    ├─► 4. Shipment Created
    │      Status: SHIPMENT_CREATED
    │      Blockchain: RegisterShipment
    │
    └──────────────────────────────────────────┐
                                               │
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: ECTA QUALITY INSPECTION                                               │
│  Organization: ECTA (Ethiopian Coffee & Tea Authority)                          │
│  ⚠️ PREREQUISITE: Shipment must exist                                           │
└─────────────────────────────────────────────────────────────────────────────────┘
    │
    ├─► 5. Quality Inspection Requested
    │      Status: INSPECTION_PENDING
    │      Blockchain: RequestInspection
    │      User Role: Exporter
    │
    ├─► 6. Physical Inspection Performed
    │      Status: INSPECTED
    │      Blockchain: PerformInspection
    │      Details: Cupping test, physical analysis, lab tests
    │      User Role: ECTA Inspector
    │
    ├─► 7. Quality Approved
    │      Status: APPROVED (inspection), QUALITY_APPROVED (shipment)
    │      Blockchain: ApproveInspection
    │      Certificate: Quality Certificate No. issued
    │      User Role: ECTA Officer
    │
    ├─► 8. Export Permit Issued ✅ (ECTA FINAL STATUS)
    │      Status: PERMIT_ISSUED (shipment)
    │      Blockchain: IssueExportPermit
    │      Event: ExportPermitIssued
    │      User Role: ECTA Officer
    │      ⚠️ TRIGGER: Automatically initiates Customs workflow
    │
    └──────────────────────────────────────────┐
                                               │
                    🔗 AUTOMATIC WORKFLOW TRIGGER 🔗
                    Event: ExportPermitIssued
                    NextWorkflow: CUSTOMS_DECLARATION
                                               │
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: CUSTOMS CLEARANCE                                                     │
│  Organization: Ethiopian Customs Authority                                       │
│  ⚠️ PREREQUISITE: ECTA Export Permit must be issued (PERMIT_ISSUED)            │
│  ⚠️ VALIDATION: System checks for valid export permit before proceeding         │
└─────────────────────────────────────────────────────────────────────────────────┘
    │
    ├─► 9. Customs Declaration Submitted
    │      Status: CUSTOMS_DECLARED (shipment), SUBMITTED (declaration)
    │      Blockchain: SubmitCustomsDeclaration
    │      Auto-Created: Yes (from ECTA permit)
    │      User Role: Exporter/Customs Agent
    │      Data Auto-Mapping:
    │      • Quantity from shipment
    │      • Value from shipment/contract
    │      • Destination from contract
    │      • EUDR compliance from shipment
    │      • HS Code: 090111 (coffee, not roasted)
    │      • Port of Exit: Djibouti Port (default)
    │
    ├─► 10. Risk Assessment & Documentary Review
    │      Status: UNDER_INSPECTION
    │      Blockchain: ReviewCustomsDeclaration
    │      Risk Factors: Value, permits, HS code
    │      User Role: Customs Officer
    │
    ├─► 11. Physical Inspection (if required)
    │      Status: UNDER_REVIEW
    │      Blockchain: CompleteCustomsInspection
    │      Inspection Types: DOCUMENTARY, PHYSICAL, BOTH
    │      User Role: Customs Inspector
    │
    ├─► 12. Customs Clearance Granted ✅ (CUSTOMS FINAL STATUS)
    │      Status: CUSTOMS_CLEARED (shipment), CLEARED (declaration)
    │      Blockchain: ClearCustomsDeclaration
    │      Clearance Number: CLR-YYYYMMDD-XXXXX
    │      User Role: Customs Officer
    │      ⚠️ TRIGGER: Shipment ready for export
    │
    └──────────────────────────────────────────┐
                                               │
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: LAND TRANSPORT & PHYTOSANITARY                                        │
│  Organization: Transporter, Ministry of Agriculture                              │
└─────────────────────────────────────────────────────────────────────────────────┘
    │
    ├─► 13. Land Transport Arranged
    │      Status: IN_TRANSIT_TO_PORT
    │      Blockchain: RegisterLandTransport
    │      Route: Addis Ababa → Djibouti Port
    │
    ├─► 14. Phytosanitary Certificate Issued
    │      Status: PHYTO_CERTIFIED
    │      Blockchain: IssuePhytosanitaryCertificate
    │      Certificate: PHYTO-ET-YYYYMMDD-XXXXX
    │      User Role: Ministry of Agriculture Officer
    │
    └──────────────────────────────────────────┐
                                               │
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5: INTERNATIONAL SHIPMENT                                                │
│  Organization: Shipping Line, Port Authority                                     │
└─────────────────────────────────────────────────────────────────────────────────┘
    │
    ├─► 15. Container Loaded at Port
    │      Status: LOADED
    │      Blockchain: UpdateShipmentStatus
    │      Port: Djibouti Port
    │
    ├─► 16. Bill of Lading Issued
    │      Status: SHIPPED
    │      Blockchain: IssueBillOfLading
    │      Document: B/L Number
    │      User Role: Shipping Agent
    │
    ├─► 17. Vessel Departed
    │      Status: IN_TRANSIT_SEA
    │      Blockchain: UpdateShipmentStatus
    │      Tracking: Vessel name, voyage number
    │
    ├─► 18. Arrived at Destination Port
    │      Status: ARRIVED_DESTINATION
    │      Blockchain: UpdateShipmentStatus
    │      Port: Rotterdam/Hamburg/Other
    │
    └──────────────────────────────────────────┐
                                               │
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 6: PAYMENT & SETTLEMENT                                                  │
│  Organization: Banks (CBE, Issuing Bank)                                        │
└─────────────────────────────────────────────────────────────────────────────────┘
    │
    ├─► 19. Documents Submitted to Bank
    │      Status: DOCUMENTS_SUBMITTED
    │      Documents: Invoice, B/L, Certificate of Origin, Inspection Cert
    │
    ├─► 20. Payment Received
    │      Status: PAYMENT_RECEIVED
    │      Blockchain: RecordPayment
    │      Amount: Full contract value in USD/EUR
    │
    ├─► 21. Forex Settled
    │      Status: FOREX_SETTLED
    │      Blockchain: SettleForex
    │      NBE Reporting: Export proceeds repatriated
    │
    └─► 22. Shipment Completed ✅ (FINAL STATUS)
           Status: DELIVERED
           Blockchain: CompleteShipment
           All parties notified

```

## Status Definitions by Entity

### Shipment Statuses
| Status | Description | Phase | Can Proceed? |
|--------|-------------|-------|--------------|
| `SHIPMENT_CREATED` | Initial registration | 1 | ✅ → ECTA |
| `INSPECTION_PENDING` | Awaiting quality check | 2 | ⏳ Wait |
| `QUALITY_APPROVED` | Quality passed | 2 | ✅ → Permit |
| `PERMIT_ISSUED` | ✅ ECTA permit issued | 2 | ✅ → Customs |
| `CUSTOMS_DECLARED` | Declaration submitted | 3 | ⏳ Wait |
| `CUSTOMS_CLEARED` | ✅ Customs approved | 3 | ✅ → Transport |
| `IN_TRANSIT_TO_PORT` | Moving to Djibouti | 4 | ⏳ Wait |
| `LOADED` | Container loaded | 5 | ⏳ Wait |
| `SHIPPED` | Vessel departed | 5 | ⏳ Wait |
| `IN_TRANSIT_SEA` | At sea | 5 | ⏳ Wait |
| `ARRIVED_DESTINATION` | Reached buyer port | 5 | ⏳ Wait |
| `DELIVERED` | ✅ Final delivery | 6 | ✅ Complete |

### Quality Inspection Statuses
| Status | Description | Organization | Next Action |
|--------|-------------|--------------|-------------|
| `PENDING` | Awaiting inspection | ECTA | Perform inspection |
| `INSPECTED` | Tests completed | ECTA | Approve/Reject |
| `APPROVED` | Quality meets standards | ECTA | Issue export permit |
| `REJECTED` | Quality failed | ECTA | ❌ Cannot export |

### Customs Declaration Statuses
| Status | Description | Organization | Next Action |
|--------|-------------|--------------|-------------|
| `SUBMITTED` | Declaration filed | Exporter | Review |
| `UNDER_INSPECTION` | Documentary/physical check | Customs | Complete inspection |
| `UNDER_REVIEW` | Inspection done, awaiting decision | Customs | Clear/Reject |
| `CLEARED` | ✅ Approved for export | Customs | Proceed to transport |
| `REJECTED` | ❌ Cannot proceed | Customs | Fix issues |
| `HELD` | Pending additional info | Customs | Provide documents |

## Critical Integration Points

### 🔗 Integration Point 1: ECTA → Customs
**Trigger:** `IssueExportPermit` in quality.go
```
When: ECTA issues export permit
Event: ExportPermitIssued
Action: Auto-create customs declaration
Validation: Verify shipment status = PERMIT_ISSUED
```

### 🔗 Integration Point 2: Customs → Transport
**Trigger:** `ClearCustomsDeclaration` in customs.go
```
When: Customs clears declaration
Event: CustomsCleared
Action: Notify land transport
Status: CUSTOMS_CLEARED → IN_TRANSIT_TO_PORT
```

### 🔗 Integration Point 3: Shipment → Payment
**Trigger:** `UpdateShipmentStatus` to ARRIVED_DESTINATION
```
When: Shipment arrives at destination
Event: ShipmentArrived
Action: Banks can process payment
Status: ARRIVED_DESTINATION → PAYMENT_RECEIVED
```

## Validation Rules

### ECTA Permit Issuance
✅ Must Have:
- Quality inspection performed
- Quality approved (Grade 1-5)
- Quality certificate issued
- MSP: ECTAMSP

### Customs Declaration Submission
✅ Must Have:
- ECTA export permit issued
- Shipment status: `PERMIT_ISSUED`
- Valid inspection with `ExportPermitNo`
- Supporting documents

❌ Will Fail If:
- No ECTA permit
- Shipment status not `PERMIT_ISSUED`
- Quality not approved
- Missing required fields

### Customs Clearance
✅ Must Have:
- Declaration submitted
- Risk assessment completed
- Inspection done (if required)
- Duties paid (if applicable)
- MSP: CustomsMSP

## Rejection Flows

### Quality Rejected Path
```
INSPECTED → REJECTED
  ↓
Shipment Status: QUALITY_REJECTED
  ↓
Cannot proceed to customs
  ↓
Options:
  1. Fix issues and re-inspect
  2. Cancel shipment
```

### Customs Rejected Path
```
UNDER_REVIEW → REJECTED
  ↓
Shipment Status: CUSTOMS_REJECTED
  ↓
Cannot proceed to export
  ↓
Options:
  1. Provide additional documents
  2. Fix discrepancies
  3. Re-submit declaration
```

## Time-Based Considerations

| Phase | Typical Duration | Critical Deadline |
|-------|------------------|-------------------|
| Quality Inspection | 2-5 days | None |
| Export Permit | 1-2 days | After quality approval |
| Customs Declaration | 1-3 days | Before shipment |
| Customs Clearance | 1-7 days | Before vessel departure |
| Land Transport | 2-3 days | 48h before vessel |
| Sea Transit | 20-30 days | Per B/L |
| Payment Processing | 7-14 days | After documents submitted |

## Acronyms & Terminology

- **ECTA**: Ethiopian Coffee & Tea Authority
- **CBE**: Commercial Bank of Ethiopia
- **NBE**: National Bank of Ethiopia
- **L/C**: Letter of Credit
- **B/L**: Bill of Lading
- **HS Code**: Harmonized System Code (090111 for coffee)
- **EUDR**: EU Deforestation Regulation
- **MSP**: Membership Service Provider (blockchain identity)
- **ASYCUDA**: Automated System for Customs Data (Ethiopian customs system)

## References

- [ECTA-CUSTOMS-WORKFLOW-INTEGRATION.md](./ECTA-CUSTOMS-WORKFLOW-INTEGRATION.md) - Detailed integration guide
- [COMPLETE-WORKFLOW-SEQUENCE.md](./COMPLETE-WORKFLOW-SEQUENCE.md) - API call sequences
- Chaincode: `chaincodes/coffee/quality.go`, `chaincodes/coffee/customs.go`
- API Routes: `api/src/routes/quality.ts`, `api/src/routes/customs.ts`
