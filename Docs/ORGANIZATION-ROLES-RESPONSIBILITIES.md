# Ethiopian Coffee Export Consortium - Complete Organization Roles & Responsibilities

## Document Information
**Created:** June 3, 2026  
**Version:** 1.0  
**Purpose:** Complete mapping of organizational roles, responsibilities, and blockchain functions

---

## 1. ECTA (Ethiopian Coffee & Tea Authority)
**Primary Role:** Coffee Industry Regulator & Quality Authority

### Core Responsibilities:
1. **Exporter Licensing & Registration**
   - Issue export licenses to qualified companies/individuals
   - Verify capital requirements (1M Birr for private, 500K for companies, 250K for individuals)
   - Maintain exporter registry on blockchain
   - Suspend/revoke licenses for violations

2. **Laboratory Certification**
   - Certify coffee quality testing laboratories
   - Issue laboratory certificate numbers
   - Monitor lab compliance and standards

3. **Professional Certification**
   - Certify professional coffee tasters (Q-Graders)
   - Maintain taster registry
   - Issue taster certificates

4. **Quality Standards Enforcement**
   - Set minimum quality grades for export
   - Enforce Ethiopian coffee quality standards
   - Monitor EUDR compliance requirements

5. **Export Monitoring & Oversight**
   - Track export volumes and destinations
   - Generate export statistics and reports
   - Investigate violations and enforce penalties

6. **Policy & Regulation**
   - Set coffee export policies
   - Update regulations based on international standards
   - Coordinate with government ministries

### Blockchain Functions:
- `RegisterExporter()`
- `UpdateExporterStatus()`
- `SuspendExporter()`
- `RevokeExporterLicense()`
- `QueryExportersByStatus()`
- `QueryAllExporters()`

---

## 2. ECX (Ethiopian Commodity Exchange)
**Primary Role:** Coffee Trading Platform & Price Discovery

### Core Responsibilities:
1. **Coffee Lot Registration**
   - Register coffee lots from exporters
   - Assign unique lot numbers
   - Verify ownership and quality certificates

2. **Price Discovery & Market Operations**
   - Facilitate transparent price discovery
   - Set daily reference prices
   - Update lot prices based on market conditions

3. **Quality Grading & Classification**
   - Grade coffee (Grade 1-9 system)
   - Record quality scores
   - Link to laboratory test results

4. **Warehouse Management**
   - Register approved warehouses
   - Track warehouse locations
   - Monitor inventory levels

5. **Trade Matching**
   - Match buyers with sellers
   - Record sale transactions
   - Update lot status (REGISTERED → TRADING → SOLD)

6. **Contract Facilitation**
   - Link sold lots to export contracts
   - Verify minimum price compliance
   - Generate trade confirmation documents

7. **Market Information Services**
   - Publish market prices
   - Provide trading volumes data
   - Issue market reports

### Blockchain Functions:
- `RegisterLot()`
- `UpdateLotPrice()`
- `UpdateLotStatus()`
- `ReadLot()`
- `QueryLotsByExporter()`
- `QueryLotsByStatus()`
- `CreateSalesContract()` (in coordination with NBE)
- `ReadSalesContract()`

---

## 3. NBE (National Bank of Ethiopia)
**Primary Role:** Monetary Authority & Foreign Exchange Regulator

### Core Responsibilities:
1. **Foreign Exchange Allocation**
   - Review forex requests from exporters
   - Allocate foreign exchange based on export value
   - Set and enforce exchange rates
   - Monitor forex utilization

2. **Export Contract Approval**
   - Review and approve all export contracts
   - Assign NBE reference numbers
   - Verify minimum price compliance
   - Ensure forex availability

3. **Monetary Policy Enforcement**
   - Enforce forex regulations
   - Set retention rates for export earnings
   - Monitor capital flight risks

4. **Banking Supervision**
   - Oversee commercial bank operations
   - Approve LC issuance by banks
   - Monitor foreign currency accounts

5. **Payment Oversight**
   - Oversee SWIFT payment settlements
   - Monitor export earnings repatriation
   - Verify exchange rate compliance
   - Track forex utilization vs. allocation

6. **Compliance & Reporting**
   - Generate forex allocation reports
   - Monitor export earnings trends
   - Report to Ministry of Finance

### Blockchain Functions:
- `CreateSalesContract()` (approve & assign NBE reference)
- `ApproveSalesContract()`
- `RequestForex()`
- `AllocateForex()`
- `UtilizeForex()`
- `ReadForex()`
- `QueryForexByExporter()`
- `QueryForexByStatus()`

---

## 4. Banks (Commercial Banks)
**Primary Role:** Financial Services & Trade Finance

### Core Responsibilities:
1. **Letter of Credit (LC) Services**
   - Receive LC requests from exporters
   - Verify exporter creditworthiness
   - Issue LCs for approved contracts
   - Notify beneficiary banks abroad
   - Manage LC lifecycle (issuance → utilization → expiry)

2. **SWIFT Payment Processing**
   - Execute SWIFT MT700 (LC issuance)
   - Process SWIFT MT103 (payment orders)
   - Handle SWIFT MT799/MT999 (free format messages)
   - Receive payment confirmations
   - Credit exporter accounts

3. **Documentary Collections**
   - Collect shipping documents (B/L, Invoice, Certificate of Origin)
   - Verify document compliance with LC terms
   - Forward documents to paying bank
   - Release payment upon document verification

4. **Foreign Currency Accounts**
   - Maintain exporter foreign currency accounts
   - Process incoming SWIFT payments
   - Convert forex to Birr at NBE rates
   - Transfer retention amounts per NBE rules

5. **Trade Finance Advisory**
   - Advise exporters on LC requirements
   - Assist with document preparation
   - Provide trade finance solutions

6. **Risk Management**
   - Assess credit risk
   - Require collateral/guarantees
   - Monitor exposure limits

7. **Compliance & AML**
   - Verify exporter identity (KYC)
   - Screen for sanctions/watchlists
   - Report suspicious transactions
   - Comply with FATF guidelines

### Blockchain Functions:
- `RequestLC()`
- `ApproveLC()`
- `IssueLC()`
- `ReadLC()`
- `UpdateLCStatus()`
- `QueryLCsByExporter()`
- `QueryLCsByStatus()`
- `InitiatePayment()`
- `VerifyPaymentDocuments()`
- `SettlePayment()` (record SWIFT payment)
- `QueryPaymentsByExporter()`

---

## 5. Customs (Ethiopian Customs Commission)
**Primary Role:** Border Control & Export Clearance

### Core Responsibilities:
1. **Export Declaration Processing**
   - Receive customs declarations from exporters
   - Verify declaration accuracy
   - Check document completeness

2. **Physical Inspection**
   - Conduct cargo inspections at ports
   - Verify quantity and quality
   - Check for contraband/prohibited items
   - Inspect packaging and labeling

3. **Document Verification**
   - Verify export contracts
   - Check LC documents
   - Validate forex allocations
   - Review quality certificates
   - Verify ECTA licenses

4. **Duty & Tax Assessment**
   - Calculate export duties (if applicable)
   - Assess taxes and fees
   - Collect payments
   - Issue tax receipts

5. **Export Clearance**
   - Issue clearance certificates
   - Assign clearance numbers
   - Authorize cargo release
   - Update declaration status

6. **Risk Assessment**
   - Flag high-risk shipments
   - Reject non-compliant exports
   - Investigate discrepancies

7. **Trade Statistics**
   - Record export volumes
   - Track destination countries
   - Generate customs reports
   - Share data with relevant agencies

### Blockchain Functions:
- `SubmitDeclaration()`
- `ReviewDeclaration()`
- `ClearDeclaration()`
- `RejectDeclaration()`
- `ReadDeclaration()`
- `QueryDeclarationsByExporter()`
- `QueryDeclarationsByStatus()`

---

## 6. Shipping Companies
**Primary Role:** Logistics & Cargo Transportation

### Core Responsibilities:
1. **Booking & Space Allocation**
   - Accept shipment bookings from exporters
   - Allocate container space
   - Confirm vessel schedules
   - Issue booking confirmations

2. **Bill of Lading (B/L) Issuance**
   - Issue original B/L after cargo loading
   - Provide B/L copies to exporter
   - Record B/L numbers on blockchain
   - Manage B/L transfers

3. **Cargo Handling**
   - Receive cargo at port
   - Load containers onto vessels
   - Secure cargo for transport
   - Maintain cargo temperature (if refrigerated)

4. **Transportation Management**
   - Transport from Addis Ababa to Djibouti Port
   - Coordinate with port authorities
   - Track vessel movements
   - Update shipment status in real-time

5. **Documentation**
   - Generate shipping manifests
   - Provide tracking numbers
   - Issue delivery orders
   - Maintain shipping records

6. **Tracking & Notifications**
   - Provide real-time GPS tracking
   - Send status updates to exporters
   - Notify arrival at destination
   - Alert on delays or issues

7. **Claims & Insurance**
   - Handle cargo insurance claims
   - Investigate damaged shipments
   - Process compensation claims

### Blockchain Functions:
- `CreateShipment()`
- `UpdateShipmentStatus()`
- `RecordBillOfLading()`
- `UpdateShipmentLocation()`
- `QueryShipmentsByExporter()`
- `QueryShipmentsByStatus()`

---

## Cross-Organization Workflow Dependencies

### Export Process Flow:
```
1. ECTA → Approve Exporter License
2. ECX → Register Coffee Lot & Set Price
3. ECX + NBE → Create Export Contract
4. NBE → Allocate Foreign Exchange
5. Banks → Issue Letter of Credit
6. Customs → Clear Export Declaration
7. Shipping → Transport & Issue B/L
8. Banks → Process SWIFT Payment
9. NBE → Verify Forex Utilization
```

### Information Sharing Requirements:
- **ECTA ↔ ECX:** Exporter license status verification
- **ECX ↔ NBE:** Contract details, minimum price compliance
- **NBE ↔ Banks:** Forex allocations, exchange rates, LC approvals
- **Banks ↔ Customs:** LC documents, payment status
- **Customs ↔ Shipping:** Clearance certificates, cargo release
- **Banks ↔ Exporters:** Payment confirmations, SWIFT messages
- **All → Blockchain:** Immutable transaction records

---

## Access Control Matrix

| Organization | Read Access | Write Access | Approve Access |
|--------------|-------------|--------------|----------------|
| **ECTA** | All exporters, contracts | Exporters, licenses | Exporter status |
| **ECX** | All lots, contracts | ECX lots, prices | Lot registrations |
| **NBE** | All contracts, forex, LCs | Forex allocations, contract approvals | Contracts, Forex |
| **Banks** | Own LCs, payments | LCs, payment records | LC issuance |
| **Customs** | Declarations for review | Declaration status | Export clearance |
| **Shipping** | Own shipments | Shipment status, B/L | Cargo receipt |
| **Exporters** | Own records only | Requests (LC, Forex, Declarations) | None |

---

## Blockchain Data Ownership

| Data Type | Owner | Shared With | Validators |
|-----------|-------|-------------|------------|
| Exporter Profiles | ECTA | All organizations | ECTA only |
| ECX Lots | ECX | ECTA, NBE, Exporters | ECX, ECTA |
| Sales Contracts | NBE | All organizations | NBE, ECX |
| Forex Allocations | NBE | Banks, Exporters | NBE only |
| Letters of Credit | Banks | NBE, Customs, Exporters | Banks, NBE |
| Customs Declarations | Customs | Banks, Shipping, NBE | Customs only |
| Shipments | Shipping | All organizations | Shipping only |
| Payments | Banks | NBE, Exporters | Banks, NBE |

---

## Compliance & Audit Trail

All organizations must:
1. Record all transactions on blockchain with timestamps
2. Maintain digital signatures for approvals
3. Provide audit logs for government review
4. Ensure GDPR/data protection compliance
5. Report suspicious activities to relevant authorities

---

**Document Control:**  
This document defines the complete organizational structure and must be updated whenever new roles or responsibilities are added to the system.
