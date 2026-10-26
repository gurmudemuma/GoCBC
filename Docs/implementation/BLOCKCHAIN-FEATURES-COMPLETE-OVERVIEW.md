# Ethiopian Coffee Export Consortium Blockchain System (CECBS)
## Complete Blockchain Features Overview

**System Type**: Hyperledger Fabric Consortium Blockchain  
**Channel**: coffeechannel  
**Chaincode**: coffee (Version 1.56)  
**Network**: 6 Organizations (ECTA, ECX, NBE, Banks, Customs, Shipping)  

---

## 🏗️ Architecture Overview

### Blockchain Network Components

#### **Organizations (6 MSPs)**
1. **ECTA** (Ethiopian Coffee & Tea Authority)
   - Peer: peer0.ecta.cecbs.et
   - Role: Regulatory authority, exporter licensing
   
2. **ECX** (Ethiopia Commodity Exchange)
   - Peer: peer0.ecx.cecbs.et
   - Role: Coffee lot grading and trading

3. **NBE** (National Bank of Ethiopia)
   - Peer: peer0.nbe.cecbs.et
   - Role: Forex allocation, payment oversight

4. **Banks** (Commercial Banks Consortium)
   - Peer: peer0.banks.cecbs.et
   - Role: LC issuance, payments, SWIFT

5. **Customs** (Ethiopian Customs Authority)
   - Peer: peer0.customs.cecbs.et
   - Role: Customs declarations and clearance

6. **Shipping** (Logistics Consortium)
   - Peer: peer0.shipping.cecbs.et
   - Role: Shipment tracking, transport

#### **Orderer**
- **Type**: Solo (Development) / Raft (Production)
- **Node**: orderer.cecbs.et
- **Function**: Transaction ordering and block creation

#### **Channel**
- **Name**: coffeechannel
- **Privacy**: Private consortium channel
- **Participants**: All 6 organizations

---

## 📦 Blockchain Data Models (Chaincode)

The system implements **15 core business entity types** on the blockchain:

### 1. **Exporters** (`main.go`)
**Chaincode Functions:**
- `RegisterExporter` - Register new exporter after ECTA approval
- `GetExporter` - Retrieve exporter details
- `QueryAllExporters` - List all registered exporters
- `UpdateExporterLaboratory` - Update laboratory certification
- `UpdateExporterStatus` - Change exporter status (active/suspended)
- `GetHistory` - Complete transaction history

**Data Tracked:**
- Exporter ID, Company Name, License
- ECTA License Number & Expiry
- Capital Requirement, Exporter Type
- Laboratory Certification Status
- Professional Taster Details
- Banking Information
- Registration Date, Status

**API Endpoints:**
- `POST /api/v1/exporters` - Register exporter
- `GET /api/v1/exporters` - List all exporters
- `GET /api/v1/exporters/:id` - Get exporter details
- `PUT /api/v1/exporters/:id/laboratory` - Update lab status
- `PUT /api/v1/exporters/:id/status` - Update status

---

### 2. **Contracts** (`main.go`)
**Chaincode Functions:**
- `RegisterContract` - Create new export contract
- `GetContract` - Retrieve contract details
- `QueryAllContracts` - List all contracts
- `ApproveContract` - ECTA approval workflow
- `UpdateContractStatus` - Status updates

**Data Tracked:**
- Contract ID, Exporter ID, Buyer Details
- Coffee Type, Grade, Quantity, Price
- Total Value (USD), Incoterms
- Contract Status (Registered, Approved, Active, Completed)
- ECTA Approval, Date & Officer
- Shipment Terms, Delivery Schedule

**API Endpoints:**
- `POST /api/v1/contracts` - Register contract
- `GET /api/v1/contracts` - Query contracts
- `GET /api/v1/contracts/:id` - Get contract
- `PUT /api/v1/contracts/:id/approve` - Approve contract
- `GET /api/v1/exporters/:id/contracts` - Exporter's contracts

---

### 3. **Shipments** (`main.go`)
**Chaincode Functions:**
- `RegisterShipment` - Create shipment record
- `GetShipment` - Retrieve shipment
- `QueryAllShipments` - List shipments
- `UpdateShipmentStatus` - Track shipment progress
- `UpdateShipmentLocation` - GPS tracking

**Data Tracked:**
- Shipment ID, Contract ID, Exporter ID
- Origin, Destination, Route
- Quantity, Container Numbers
- Departure Date, Estimated Arrival
- Shipment Status (Prepared, In Transit, Customs, Delivered)
- GPS Coordinates, Temperature Logs
- Carrier Information

**API Endpoints:**
- `POST /api/v1/shipments` - Create shipment
- `GET /api/v1/shipments` - Query shipments
- `GET /api/v1/shipments/:id` - Get shipment
- `PUT /api/v1/shipments/:id/status` - Update status
- `GET /api/v1/exporters/:id/shipments` - Exporter's shipments

---

### 4. **Letters of Credit (LC)** (`banking.go`)
**Chaincode Functions:**
- `RequestLC` - Exporter requests LC
- `IssueLC` - Bank issues LC
- `AmendLC` - Modify LC terms
- `UtilizeLC` - Mark LC as utilized
- `GetLC` - Retrieve LC details
- `QueryAllLCs` - List all LCs

**Data Tracked:**
- LC Number, Contract ID, Exporter ID
- Issuing Bank, Beneficiary Bank
- LC Amount (USD), Currency
- Issue Date, Expiry Date
- LC Type (Sight, Usance, Confirmed)
- Status (Requested, Issued, Utilized, Expired)
- UCP 600 Compliance Markers
- Amendment History

**API Endpoints:**
- `POST /api/v1/banking/lc` - Request LC
- `POST /api/v1/banking/lc/:id/issue` - Issue LC
- `POST /api/v1/banking/lc/:id/amend` - Amend LC
- `GET /api/v1/banking/lc` - Query LCs
- `GET /api/v1/exporters/:id/lcs` - Exporter's LCs

---

### 5. **Payments** (`payment.go`)
**Chaincode Functions:**
- `InitiatePayment` - Start payment process
- `ApprovePayment` - NBE approval
- `CompletePayment` - Mark as completed
- `GetPayment` - Retrieve payment
- `QueryAllPayments` - List payments

**Data Tracked:**
- Payment ID, Contract ID, LC Number
- Payer, Payee, Amount (USD)
- Payment Method (LC, CAD, TT, DP, DA)
- Payment Status (Initiated, Approved, Completed, Failed)
- NBE Approval Status
- Transaction Reference, SWIFT Code
- Fees, Exchange Rate
- Payment Date

**API Endpoints:**
- `POST /api/v1/payments` - Initiate payment
- `POST /api/v1/payments/:id/approve` - Approve payment
- `GET /api/v1/payments` - Query payments
- `GET /api/v1/exporters/:id/payments` - Exporter's payments

---

### 6. **Forex Allocations** (`forex.go`)
**Chaincode Functions:**
- `AllocateForex` - NBE allocates forex
- `UtilizeForex` - Mark forex as utilized
- `GetForex` - Retrieve allocation
- `QueryAllForex` - List allocations

**Data Tracked:**
- Forex ID, Exporter ID, Contract ID
- Allocated Amount (USD)
- Utilized Amount (USD)
- Allocation Date, Expiry Date
- Status (Allocated, Utilized, Expired)
- NBE Approval Officer
- Exchange Rate, Purpose

**API Endpoints:**
- `POST /api/v1/forex` - Allocate forex
- `POST /api/v1/forex/:id/utilize` - Utilize forex
- `GET /api/v1/forex` - Query forex
- `GET /api/v1/exporters/:id/forex` - Exporter's forex

---

### 7. **Advance Payments** (`advance.go`)
**Chaincode Functions:**
- `RequestAdvancePayment` - Exporter requests advance
- `ApproveAdvancePayment` - NBE approves
- `DisburseAdvancePayment` - Mark as disbursed
- `GetAdvancePayment` - Retrieve advance
- `QueryAllAdvancePayments` - List advances

**Data Tracked:**
- Advance ID, Exporter ID, Contract ID
- Requested Amount, Approved Amount
- Purpose, Justification
- Status (Requested, Approved, Disbursed, Rejected)
- NBE Approval Date & Officer
- Repayment Terms, Interest Rate
- Disbursement Date

**API Endpoints:**
- `POST /api/v1/advance` - Request advance
- `POST /api/v1/advance/:id/approve` - Approve advance
- `GET /api/v1/advance` - Query advances

---

### 8. **Quality Inspections** (`quality.go`)
**Chaincode Functions:**
- `RegisterInspection` - Create inspection record
- `CompleteInspection` - Record inspection results
- `ApproveInspection` - ECTA approval
- `GetInspection` - Retrieve inspection
- `QueryAllInspections` - List inspections

**Data Tracked:**
- Inspection ID, Lot Number, Exporter ID
- Inspector Name, License
- Inspection Date, Location
- Quality Grade (Q1, Q2, Q3, etc.)
- Defects, Moisture Content, Screen Size
- Cupping Score (if applicable)
- Result (PASS/FAIL)
- ECTA Approval Status
- Quality Certificate Number

**API Endpoints:**
- `POST /api/v1/quality` - Register inspection
- `POST /api/v1/quality/:id/complete` - Complete inspection
- `GET /api/v1/quality` - Query inspections

---

### 9. **Export Permits** (`permit.go`)
**Chaincode Functions:**
- `IssuePermit` - ECTA issues export permit
- `RevokePermit` - Revoke permit
- `GetPermit` - Retrieve permit
- `QueryAllPermits` - List permits

**Data Tracked:**
- Permit Number, Exporter ID, Contract ID
- Issue Date, Expiry Date
- Quantity Authorized (kg)
- Destination Country
- Status (Issued, Utilized, Expired, Revoked)
- ECTA Officer
- Conditions, Restrictions

**API Endpoints:**
- `POST /api/v1/permits` - Issue permit
- `GET /api/v1/permits` - Query permits
- `PUT /api/v1/permits/:id/revoke` - Revoke permit

---

### 10. **Phytosanitary Certificates** (`phytosanitary.go`)
**Chaincode Functions:**
- `IssuePhytoCertificate` - Issue certificate
- `GetPhytoCertificate` - Retrieve certificate
- `QueryAllPhytosanitaryCertificates` - List certificates

**Data Tracked:**
- Certificate Number, Exporter ID, Shipment ID
- Issue Date, Expiry Date
- Consignment Details
- Treatment Applied
- Inspection Results
- Status (Issued, Expired)
- Issuing Officer, Authority

**API Endpoints:**
- `POST /api/v1/phytosanitary` - Issue certificate
- `GET /api/v1/phytosanitary` - Query certificates

---

### 11. **Insurance Certificates** (`insurance.go`)
**Chaincode Functions:**
- `RegisterInsurance` - Register insurance policy
- `GetInsurance` - Retrieve insurance
- `QueryAllInsuranceCertificates` - List policies

**Data Tracked:**
- Policy Number, Exporter ID, Shipment ID
- Insurance Company
- Insured Amount (USD)
- Coverage Type
- Issue Date, Expiry Date
- Status (Active, Expired, Claimed)
- Premium Paid

**API Endpoints:**
- `POST /api/v1/insurance` - Register insurance
- `GET /api/v1/insurance` - Query insurance

---

### 12. **Customs Declarations** (`customs.go`)
**Chaincode Functions:**
- `RegisterCustomsDeclaration` - File customs declaration
- `ClearCustoms` - Mark as cleared
- `HoldShipment` - Hold for inspection
- `GetCustomsDeclaration` - Retrieve declaration
- `QueryAllCustomsDeclarations` - List declarations

**Data Tracked:**
- Declaration Number, Shipment ID, Exporter ID
- Declaration Date
- Goods Description, Quantity, Value
- Duty Amount, Tax Amount
- Status (Declared, Under Review, Cleared, Held)
- Customs Officer
- Clearance Date

**API Endpoints:**
- `POST /api/v1/customs` - Register declaration
- `POST /api/v1/customs/:id/clear` - Clear customs
- `GET /api/v1/customs` - Query declarations

---

### 13. **ECX Lots** (`ecx.go`)
**Chaincode Functions:**
- `RegisterECXLot` - Register coffee lot
- `GradeLot` - Assign quality grade
- `ReleaseLot` - Release to exporter
- `GetECXLot` - Retrieve lot
- `QueryAllECXLots` - List lots

**Data Tracked:**
- Lot Number, Producer, Seller
- Coffee Type, Origin (Zone, Woreda)
- Quantity (kg), Quality Grade
- Lot Status (Registered, Graded, Released)
- ECX Transaction ID
- Buyer (Exporter ID)
- Price per kg
- Release Date

**API Endpoints:**
- `POST /api/v1/ecx` - Register lot
- `POST /api/v1/ecx/:id/grade` - Grade lot
- `GET /api/v1/ecx` - Query lots

---

### 14. **SWIFT Messages** (`swift.go`)
**Chaincode Functions:**
- `RegisterSWIFTMessage` - Log SWIFT message
- `GetSWIFTMessage` - Retrieve message
- `QueryAllSWIFTMessages` - List messages

**Data Tracked:**
- Message ID, SWIFT Code (MT103, MT700, etc.)
- Sender Bank, Receiver Bank
- Direction (Incoming/Outgoing)
- Amount, Currency
- Message Type
- Related Contract/LC/Payment ID
- Timestamp
- Status (Sent, Received, Processed)

**API Endpoints:**
- `POST /api/v1/swift` - Register message
- `GET /api/v1/swift` - Query messages

---

### 15. **Documentary Collections** (`collection.go`)
**Chaincode Functions:**
- `InitiateCollection` - Start documentary collection (D/P, D/A)
- `PresentDocuments` - Present docs to buyer bank
- `AcceptCollection` - Buyer accepts
- `CompleteCollection` - Mark as paid
- `GetCollection` - Retrieve collection
- `QueryAllCollections` - List collections

**Data Tracked:**
- Collection ID, Exporter ID, Contract ID
- Collection Type (D/P, D/A)
- Amount (USD)
- Presenting Bank, Collecting Bank
- Status (Initiated, Presented, Accepted, Paid)
- Document List
- Tenor (for D/A)
- Payment Date

**API Endpoints:**
- `POST /api/v1/collections` - Initiate collection
- `POST /api/v1/collections/:id/present` - Present docs
- `GET /api/v1/collections` - Query collections

---

### 16. **Consignment Payments** (`consignment.go`)
**Chaincode Functions:**
- `RegisterConsignment` - Register consignment sale
- `SettleConsignment` - Record final settlement
- `GetConsignment` - Retrieve consignment
- `QueryAllConsignments` - List consignments

**Data Tracked:**
- Consignment ID, Exporter ID, Contract ID
- Goods Description, Estimated Value
- Status (Active, Settled, Disputed)
- Settlement Amount
- Settlement Date
- Commission, Expenses

**API Endpoints:**
- `POST /api/v1/consignment` - Register consignment
- `POST /api/v1/consignment/:id/settle` - Settle
- `GET /api/v1/consignment` - Query consignments

---

## 🔐 Blockchain Security Features

### 1. **Digital Signatures**
**Implementation**: `signature.go`
- Every transaction signed with organization's private key
- Signature verification on all reads/writes
- Certificate-based authentication (X.509)

### 2. **Access Control**
**Implementation**: Membership Service Provider (MSP)
- Organization-level access control
- Role-based permissions (ECTA, NBE, Banks, etc.)
- Channel-level privacy

### 3. **Endorsement Policy**
**Configuration**: Requires endorsement from:
- ECTA (for regulatory actions)
- NBE (for financial transactions)
- Relevant organization (for entity-specific actions)

### 4. **Immutability**
- All transactions permanently recorded
- Complete audit trail with cryptographic hashes
- Block hash linking prevents tampering

### 5. **Data Privacy**
- Private data collections for sensitive info
- Channel-level isolation
- Query-based access control

---

## 📊 Audit Trail & Compliance

### **GetHistory Function** (`main.go`)
Tracks complete transaction history for any entity:
- All state changes over time
- Transaction IDs, Block numbers
- Timestamps for each modification
- Actor identification (MSP, User)

### **Audit Trail API** (`audit.ts`)
**Three Key Endpoints:**

1. **Complete Lifecycle Audit**
   ```
   GET /api/v1/audit/entity/:entityType/:entityId
   ```
   - Returns: Database actions + Blockchain transactions
   - Tracks: WHO, WHAT, WHEN, WHY, WHERE
   - Sources: PostgreSQL + Hyperledger Fabric

2. **Cryptographic Verification**
   ```
   GET /api/v1/audit/verify/:entityType/:entityId
   ```
   - Verifies data hashes
   - Confirms endorsements
   - Checks chain of custody

3. **Compliance Report**
   ```
   GET /api/v1/audit/compliance-report/:entityType/:entityId
   ```
   - Comprehensive business metrics (40+)
   - All 15 entity categories
   - Performance ratios & KPIs

---

## 🌐 API Integration Layer

### **FabricService** (`fabricService.ts`)
Central service for all blockchain operations:
- Connection management
- Transaction submission
- Query execution
- Error handling
- Retry logic

### **API Routes** (27 Route Files)
All routes integrate with blockchain:
- `exporters.ts` - Exporter management
- `contracts.ts` - Contract operations
- `shipments.ts` - Shipment tracking
- `banking.ts` - LC and banking
- `payments.ts` - Payment processing
- `forex.ts` - Forex operations
- `quality.ts` - Inspections
- `permits.ts` - Export permits
- `phytosanitary.ts` - Certificates
- `insurance.ts` - Insurance policies
- `customs.ts` - Customs declarations
- `ecx.ts` - ECX lot management
- `swift.ts` - SWIFT messages
- `collections.ts` - Documentary collections
- `consignment.ts` - Consignment sales
- `advance.ts` - Advance payments
- `audit.ts` - Audit trail
- (+ 10 more supporting routes)

---

## 🔄 Workflow Examples

### **Export Lifecycle on Blockchain**

1. **Exporter Registration**
   - Application (Database) →
   - ECTA Approval (Database) →
   - Blockchain Registration (Blockchain)

2. **Contract Registration**
   - Contract Registered (Blockchain) →
   - ECTA Reviews (Blockchain) →
   - Contract Approved (Blockchain)

3. **Financial Setup**
   - LC Requested (Blockchain) →
   - Bank Issues LC (Blockchain) →
   - Forex Allocated by NBE (Blockchain)

4. **Quality & Compliance**
   - ECX Lot Registered (Blockchain) →
   - Quality Inspection (Blockchain) →
   - Export Permit Issued (Blockchain) →
   - Phytosanitary Certificate (Blockchain)

5. **Shipment & Customs**
   - Shipment Registered (Blockchain) →
   - Insurance Certificate (Blockchain) →
   - Customs Declaration (Blockchain) →
   - Customs Cleared (Blockchain) →
   - Shipment Departed (Blockchain)

6. **Payment**
   - Payment Initiated (Blockchain) →
   - NBE Approves (Blockchain) →
   - SWIFT Message (Blockchain) →
   - Payment Completed (Blockchain)

**Result**: Complete end-to-end traceability with immutable records

---

## 📈 System Metrics & Monitoring

### **Health Check** (`/api/v1/status`)
```json
{
  "status": "healthy",
  "services": {
    "database": true,
    "blockchain": true,
    "api": true
  }
}
```

### **Blockchain Status**
- Connected Peers: 6
- Channel: coffeechannel
- Chaincode: coffee v1.56
- Block Height: Dynamic
- Transaction Rate: Real-time

---

## 🚀 Deployment Architecture

### **Development Environment**
```
Docker Compose Stack:
├── PostgreSQL (Database)
├── Orderer (orderer.cecbs.et)
├── Peer0.ecta.cecbs.et (ECTA)
├── Peer0.ecx.cecbs.et (ECX)
├── Peer0.nbe.cecbs.et (NBE)
├── Peer0.banks.cecbs.et (Banks)
├── Peer0.customs.cecbs.et (Customs)
├── Peer0.shipping.cecbs.et (Shipping)
├── API Server (Node.js + Express)
└── UI (React + TypeScript)
```

### **Production Architecture**
```
Cloud Deployment:
├── Load Balancer (Nginx)
├── API Cluster (3+ nodes)
├── Blockchain Network
│   ├── Orderer Cluster (Raft consensus)
│   ├── Organization Peers (6 orgs)
│   └── CouchDB State Database
├── PostgreSQL Cluster (Primary + Replicas)
└── UI Cluster (Static hosting)
```

---

## 🎯 Blockchain Value Proposition

### **For Exporters**
✅ Transparent export process  
✅ Faster approvals and clearances  
✅ Reduced paperwork and delays  
✅ Immutable proof of compliance  
✅ Real-time shipment tracking  

### **For ECTA**
✅ Complete regulatory oversight  
✅ Automated compliance checking  
✅ Fraud prevention  
✅ Performance analytics  
✅ Audit trail for all actions  

### **For NBE**
✅ Forex tracking and control  
✅ Payment monitoring  
✅ Foreign exchange compliance  
✅ Financial analytics  
✅ Risk management  

### **For Banks**
✅ Secure LC issuance  
✅ Payment automation  
✅ Reduced documentary fraud  
✅ Faster settlements  
✅ SWIFT integration  

### **For Customs**
✅ Pre-clearance information  
✅ Document verification  
✅ Duty calculation automation  
✅ Shipment tracking  
✅ Trade compliance  

### **For All Stakeholders**
✅ **Single Source of Truth** - No data conflicts  
✅ **Real-time Visibility** - All parties see same data  
✅ **Immutability** - Cannot alter past records  
✅ **Transparency** - Clear audit trail  
✅ **Efficiency** - Reduced manual processes  
✅ **Trust** - Cryptographically secured  

---

## 📚 Documentation & Resources

### **Technical Documentation**
- `QUICK-START.md` - System setup guide
- `CONSORTIUM-BLOCKCHAIN-VALUE-PROPOSITION.md` - Business case
- `AUDIT-TRAIL-VERIFICATION-COMPLETE.md` - Audit system
- `API-QUICK-REFERENCE.md` - API documentation
- `PRODUCTION-SECURITY-CHECKLIST.md` - Security guide

### **Chaincode Files** (17 files)
- `main.go` - Core entities (exporters, contracts, shipments)
- `banking.go` - Letters of Credit, banking operations
- `payment.go` - Payment processing
- `forex.go` - Forex allocations
- `advance.go` - Advance payments
- `quality.go` - Quality inspections
- `permit.go` - Export permits
- `phytosanitary.go` - Phytosanitary certificates
- `insurance.go` - Insurance policies
- `customs.go` - Customs declarations
- `ecx.go` - ECX lot management
- `swift.go` - SWIFT messages
- `collection.go` - Documentary collections
- `consignment.go` - Consignment sales
- `signature.go` - Digital signatures
- `validation.go` - Data validation
- `errors.go` - Error handling

### **API Routes** (27 files)
Complete REST API covering all blockchain entities

---

## ✅ System Status

**Blockchain Network**: ✅ Operational  
**Chaincode Deployed**: ✅ Version 1.56  
**API Integration**: ✅ Complete  
**Audit Trail**: ✅ Verified  
**Data Models**: ✅ 16 entities implemented  
**Security**: ✅ Multi-layer protection  
**Documentation**: ✅ Comprehensive  

---

## 🎉 Summary

The Ethiopian Coffee Export Consortium Blockchain System (CECBS) is a **production-ready, enterprise-grade blockchain solution** built on **Hyperledger Fabric** that provides:

- ✅ **16 Core Business Entities** fully implemented on blockchain
- ✅ **6-Organization Consortium** (ECTA, ECX, NBE, Banks, Customs, Shipping)
- ✅ **Complete API Layer** with 27 route modules
- ✅ **Comprehensive Audit Trail** tracking entire lifecycle
- ✅ **Cryptographic Security** with digital signatures and endorsements
- ✅ **Real-time Visibility** for all stakeholders
- ✅ **Immutable Records** preventing fraud and tampering
- ✅ **End-to-End Traceability** from application to payment

**Total Blockchain Integration**: **100%**  
All core export operations are recorded on the immutable ledger, providing unprecedented transparency, security, and efficiency in Ethiopia's coffee export industry.

---

**Document Version**: 1.0  
**Last Updated**: August 8, 2026  
**System Version**: CECBS v1.2.0  
**Chaincode Version**: coffee v1.56  
