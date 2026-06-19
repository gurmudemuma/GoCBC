# Ethiopian Coffee Export Consortium Blockchain System (CECBS)

Production-ready blockchain platform for transparent Ethiopian coffee export management.

## System Architecture

- **Blockchain**: Hyperledger Fabric 2.5 (6 organizations, 1 channel)
- **Smart Contracts**: Go chaincode v1.14 (CCAAS)
- **Backend API**: Node.js/Express + TypeScript
- **Database**: SQLite (exporter applications, user management)
- **Frontend**: Next.js 14 + React + TypeScript + Material-UI

## Organizations & Roles

| Organization | Peers | Role |
|-------------|-------|------|
| **ECTA** | 2 | Exporter registration, quality inspection, export permits |
| **NBE** | 2 | Forex allocation, contract approval, payment oversight |
| **Banks** | 2 | Letter of Credit (LC) issuance, payment settlement |
| **Customs** | 2 | Declaration review, physical inspection, clearance |
| **ECX** | 1 | Market oversight, price tracking |
| **Shipping** | 1 | Bill of Lading, vessel tracking |

## Complete Export Workflow

### Phase 1: Contract & Approvals
1. ✅ Exporter creates sales contract (with buyer/exporter banks)
2. ✅ ECTA reviews contract
3. ✅ NBE approves contract for forex eligibility
4. ✅ Bank issues Letter of Credit (LC)
5. ✅ NBE auto-allocates forex (with retention policy)

### Phase 2: Production & Quality
6. ✅ Exporter creates shipment
7. ✅ ECTA performs quality inspection (cupping, grading)
8. ✅ ECTA issues export permit (separate from quality approval)

### Phase 3: Logistics & Customs
9. ✅ Exporter books shipping
10. ✅ Shipping company records Bill of Lading
11. ✅ Exporter submits customs declaration
12. ✅ Customs physical inspection (UNDER_INSPECTION status)
13. ✅ Customs clearance

### Phase 4: Payment & Settlement
14. ✅ Exporter submits payment documents to bank
15. ✅ Bank verifies documents against LC terms
16. ✅ Bank initiates SWIFT payment
17. ✅ Buyer's bank sends payment via SWIFT
18. ✅ Exporter's bank receives payment
19. ✅ NBE applies forex retention (40% USD retained, 60% converted to ETB)
20. ✅ Bank settles final payment

## Key Features

### Smart Contract Functions (Chaincode v1.14)

**Exporter Management**
- `RegisterExporter` - Register new exporter with capital requirements
- `UpdateExporterStatus` - Update license status (ACTIVE/SUSPENDED/REVOKED)
- `SuspendExporter` - Suspend exporter license
- `RevokeExporterLicense` - Permanently revoke license

**Sales Contracts**
- `RegisterSalesContract` - Create contract with bank details
- `ApproveSalesContract` - NBE approves for forex
- `QueryAllContracts` - Get all contracts
- `QueryContractsByExporter` - Get exporter's contracts

**Quality & Export Permits**
- `RequestInspection` - Request quality inspection
- `PerformInspection` - Record inspection results (cupping scores, grading)
- `ApproveInspection` - Approve quality (certificate issued)
- `IssueExportPermit` - Issue export permit (separate step, legally required)
- `RejectInspection` - Reject poor quality

**Banking & Finance**
- `RequestLC` - Request Letter of Credit
- `ApproveLC` - Bank approves LC (auto-maps banks from contract)
- `IssueLC` - Issue LC to exporter
- `AllocateForex` - NBE allocates foreign exchange
- `UtilizeForex` - Mark forex as utilized

**Customs**
- `SubmitDeclaration` - Submit customs declaration (auto-maps from contract)
- `ReviewDeclaration` - Start physical inspection (UNDER_INSPECTION)
- `CompleteInspection` - Complete physical inspection
- `ClearDeclaration` - Issue clearance
- `RejectDeclaration` - Reject declaration

**Payments**
- `InitiatePayment` - Initiate payment (auto-maps from LC)
- `SubmitPaymentDocuments` - Submit shipping documents
- `VerifyPaymentDocuments` - Bank verifies documents
- `InitiateSWIFT` - Send SWIFT payment
- `ReceiveSWIFT` - Receive SWIFT payment
- `SettlePayment` - Final settlement (auto-maps forex retention)

**Shipments**
- `CreateShipment` - Create shipment record
- `RecordBillOfLading` - Record B/L details
- `UpdateShipmentLocation` - GPS tracking
- `UpdateShipmentStatus` - Update status

### Auto-Mapping System

The system automatically maps data between workflow steps to reduce redundant data entry:

- **Contract → LC**: Banks, amount, currency, exporter
- **LC → Forex**: Amount, currency, contract reference
- **Contract → Shipment**: Exporter, buyer, quantity, value, EUDR
- **Forex → Shipment**: Exchange rate
- **Shipment → Quality**: EUDR compliance
- **Contract → Customs**: Exporter, currency, destination
- **LC → Payment**: All payment details
- **Forex → Settlement**: Exchange rate, retention rate

### Bank Selection System

- **Buyer Bank (Issuing Bank)**: International banks (30+ options)
- **Exporter Bank (Advising Bank)**: Ethiopian banks (15 banks)
- Validation: Issuing ≠ Advising (UCP 600 compliance)
- Auto-fill in LC issuance from contract data

### User Management

- **SQLite Database**: User accounts, roles, permissions
- **Exporter Applications**: Complete registration workflow
- **Password Reset**: Admin can reset passwords (default: "password123")
- **Session Management**: JWT tokens with 24h expiry

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Go 1.21+
- Git

### 1. Start Blockchain Network

```powershell
# Windows
cd c:\CEX
.\CLEAR-AND-RESTART.ps1
```

```bash
# Linux/Mac
cd /path/to/CEX
./scripts/start.sh
```

### 2. Start API Server

```powershell
cd api
npm install
npm start
```

API runs on `http://localhost:3001`

### 3. Start UI

```powershell
cd ui
npm install
npm run dev
```

UI runs on `http://localhost:3000`

### 4. Default Logins

| Role | Username | Password | Portal URL |
|------|----------|----------|-----------|
| ECTA Admin | `ecta_admin` | `password123` | `/portals/ecta` |
| NBE Officer | `nbe_admin` | `password123` | `/portals/nbe` |
| Bank Officer | `bank_admin` | `password123` | `/portals/banks` |
| Customs Officer | `customs_admin` | `password123` | `/portals/customs` |
| Exporter | `EXP1087072` | `password123` | `/portals/exporter` |

## Project Structure

```
CEX/
├── blockchain/          # Fabric network configuration
│   ├── crypto-config.yaml
│   ├── configtx.yaml
│   └── organizations/   # MSP & certificates
├── chaincodes/
│   └── coffee/         # Smart contract (Go)
│       ├── main.go     # Core functions
│       ├── banking.go  # LC & forex
│       ├── quality.go  # Inspections & permits
│       ├── customs.go  # Declarations
│       └── payment.go  # SWIFT payments
├── api/                # Backend API
│   ├── src/
│   │   ├── routes/     # REST endpoints
│   │   ├── services/   # Fabric connection
│   │   └── middleware/ # Auth, validation
│   └── cecbs.db        # SQLite database
├── ui/                 # Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── portals/  # Organization portals
│   │   │   ├── modern/   # 2026 UI components
│   │   │   └── common/   # Reusable components
│   │   ├── pages/        # Next.js pages
│   │   └── utils/        # API client, helpers
│   └── public/           # Static assets
└── scripts/            # Deployment scripts
```

## API Endpoints

### Contracts
- `POST /api/v1/contracts` - Register contract
- `GET /api/v1/contracts` - Query contracts
- `POST /api/v1/contracts/:id/approve` - NBE approval

### Quality
- `POST /api/v1/quality/inspections` - Request inspection
- `POST /api/v1/quality/inspections/:id/perform` - Perform inspection
- `POST /api/v1/quality/inspections/:id/approve` - Approve quality
- `POST /api/v1/quality/inspections/:id/issue-permit` - Issue export permit

### Banking
- `POST /api/v1/banking/lc/request` - Request LC
- `POST /api/v1/banking/lc/:id/approve` - Approve LC
- `POST /api/v1/banking/payment/:id/submit-documents` - Submit docs
- `POST /api/v1/banking/payment/:id/verify-documents` - Verify docs

### Customs
- `POST /api/v1/customs/declaration/submit` - Submit declaration
- `POST /api/v1/customs/declaration/:id/review` - Start inspection
- `POST /api/v1/customs/declaration/:id/complete-inspection` - Complete inspection
- `POST /api/v1/customs/declaration/:id/clear` - Issue clearance

### Forex
- `POST /api/v1/forex/allocate` - Allocate forex
- `GET /api/v1/forex` - Query allocations

## Technical Specifications

### Blockchain Network
- **Consensus**: Raft (3 orderers)
- **Channel**: `coffeechannel`
- **Chaincode**: CCAAS (Chaincode as a Service)
- **Endorsement Policy**: Majority (4 of 6 organizations)

### Smart Contract Persistence
- **State DB**: LevelDB
- **Composite Keys**: Prefix-based (CONTRACT_, EXPORTER_, LC_, etc.)
- **Rich Queries**: CouchDB-style selectors
- **History**: Full transaction history via GetHistoryForKey

### Security
- **TLS**: Enabled for all peer-to-peer communication
- **MSP**: X.509 certificates for identity
- **JWT**: API authentication with role-based access
- **Password Hashing**: bcrypt for user credentials

### Performance
- **Block Time**: ~2 seconds
- **TPS**: ~300 transactions/second
- **Latency**: <500ms for queries, <2s for transactions

## Status Codes

### Contract Status
- `DRAFT` - Created but not submitted
- `REGISTERED` - Submitted to ECTA
- `APPROVED` - NBE approved for forex
- `ACTIVE` - LC issued, forex allocated
- `COMPLETED` - Fully executed

### Inspection Status
- `PENDING` - Awaiting inspection
- `INSPECTED` - Results recorded
- `APPROVED` - Quality approved
- `REJECTED` - Failed quality
- Shipment: `QUALITY_APPROVED` - Permit pending
- Shipment: `PERMIT_ISSUED` - Ready for export

### Customs Status
- `SUBMITTED` - Declaration submitted
- `UNDER_INSPECTION` - Physical inspection ongoing
- `UNDER_REVIEW` - Inspection complete, review pending
- `CLEARED` - Approved for export
- `HELD` - Issues found
- `REJECTED` - Cannot export

### Payment Status
- `PENDING` - Payment initiated
- `DOCUMENTS_SUBMITTED` - Docs sent to bank
- `VERIFIED` - Bank verified documents
- `SWIFT_INITIATED` - SWIFT sent
- `SWIFT_RECEIVED` - Payment received
- `SETTLED` - Final settlement with retention

## Troubleshooting

### Blockchain Issues
```powershell
# Check peer status
docker ps | findstr peer

# View peer logs
docker logs peer0.ecta.cecbs.et

# Restart network
.\CLEAR-AND-RESTART.ps1
```

### API Issues
```powershell
# Check API logs
cd api
npm start

# Test Fabric connection
curl http://localhost:3001/api/v1/contracts
```

### Chaincode Issues
```powershell
# Rebuild chaincode
cd chaincodes/coffee
go build -o chaincode.exe

# Restart chaincode container
docker restart coffee-chaincode
```

## License

Proprietary - Ethiopian Coffee & Tea Authority (ECTA)

## Support

For technical support, contact the development team or refer to `/Docs/` for detailed documentation.
