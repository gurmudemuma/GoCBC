# Ethiopian Coffee Export Consortium Blockchain System (CECBS)

**Version:** 1.4  
**Status:** Production Ready ✅  
**Last Updated:** June 4, 2026

---

## 🎯 Overview

CECBS is a comprehensive blockchain-based system for managing Ethiopian coffee exports, built on Hyperledger Fabric. It connects 6 organizations (ECTA, ECX, Banks, NBE, Customs, Shipping) in a transparent, secure, and efficient export workflow.

### Current Production State
- ✅ **Chaincode v1.4** - Fully deployed and operational
- ✅ **62+ Functions** - Complete workflow coverage
- ✅ **6 Organizations** - All connected and endorsed
- ✅ **Sub-2s Queries** - High performance
- ✅ **Professional Upgrade System** - Automated deployments

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Go 1.21+
- PowerShell (Windows) or Bash (Linux/Mac)

### Start the System
```bash
# 1. Start Fabric network
./scripts/start.sh

# 2. Start API server (new terminal)
cd api
npm install
npm start

# 3. Start UI (new terminal)
cd ui
npm install
npm run dev
```

### Access Points
- **UI:** http://localhost:3000
- **API:** http://localhost:3001
- **API Health:** http://localhost:3001/health

---

## 📦 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface (Next.js)                 │
│  ECTA │ ECX │ Banks │ NBE │ Customs │ Shipping │ Exporters │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              REST API Gateway (Node.js/Express)              │
│         Auth │ Validation │ Blockchain Service               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           Hyperledger Fabric Network (6 Orgs)                │
│                                                               │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐│
│  │ ECTA │  │ ECX  │  │Banks │  │ NBE  │  │Customs│ │Ship  ││
│  │Peer0 │  │Peer0 │  │Peer0 │  │Peer0 │  │Peer0  │ │Peer0 ││
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘│
│                                                               │
│         Chaincode v1.4 (62+ Functions, 6 Modules)            │
│  ECTA │ Banking │ Forex │ Customs │ Payment │ ECX            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
│         Blockchain Ledger │ SQLite Database                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏢 Organizations & Roles

| Organization | Role | Functions |
|--------------|------|-----------|
| **ECTA** | Ethiopian Coffee & Tea Authority | Exporter licensing, contract registration, compliance |
| **ECX** | Ethiopian Commodity Exchange | Lot registration, price management, trading |
| **Banks** | Commercial Banks | Letter of Credit (LC) issuance, payment processing |
| **NBE** | National Bank of Ethiopia | Forex allocation, exchange rates, retention policy |
| **Customs** | Ethiopian Customs Commission | Export declarations, clearance, compliance |
| **Shipping** | Shipping Lines | Bill of Lading, vessel tracking, GPS traceability |

---

## 💼 Key Features

### ✅ 2026 Compliance
- Lab certification requirements
- Professional coffee taster validation
- 40% forex retention policy
- EUDR (EU Deforestation Regulation) compliance
- GPS-based traceability

### ✅ Complete Workflow
1. **Exporter Registration** - ECTA licenses with full compliance checks
2. **Sales Contract** - ECTA registers, NBE approves for forex
3. **ECX Lot Management** - Coffee lot registration and trading
4. **Forex Allocation** - NBE allocates foreign currency with retention
5. **LC Processing** - Banks issue and manage Letters of Credit
6. **Customs Declaration** - Export declaration and clearance
7. **SWIFT Payments** - International payment processing (MT103/MT700)
8. **Bill of Lading** - Shipping documentation and tracking
9. **Payment Settlement** - Final settlement with retention calculation

### ✅ Advanced Features
- License suspension/revocation
- Multi-peer endorsement
- Real-time notifications via WebSocket
- Comprehensive audit trail
- Role-based access control (RBAC)
- Export analytics and reporting

---

## 🔧 Chaincode v1.4

### Modules & Functions (62+ total)

#### 1. ECTA Module (main.go) - 8 functions
- RegisterExporter (9 params with lab cert)
- UpdateExporterStatus
- SuspendExporter
- RevokeExporterLicense
- RegisterSalesContract
- ApproveSalesContract
- CreateShipment
- RecordBillOfLading

#### 2. Banking Module (banking.go) - 18 functions
- LC Management (8 functions)
- Payment Settlement (10 functions)

#### 3. Forex Module (forex.go) - 16 functions
- Forex Allocation (7 functions)
- Exchange Rates (3 functions)
- Retention Policy (2 functions)
- Oversight (4 functions)

#### 4. Customs Module (customs.go) - 8 functions
- Declaration management and clearance

#### 5. Payment Module (payment.go) - 11 functions
- SWIFT payment processing and tracking

#### 6. ECX Module (ecx.go) - 6 functions
- Commodity lot management

**Performance:** < 2 second query response time

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **[QUICK-REFERENCE.md](QUICK-REFERENCE.md)** | Quick commands and tips |
| **[Docs/UPGRADE-SYSTEM-GUIDE.md](Docs/UPGRADE-SYSTEM-GUIDE.md)** | Complete upgrade guide |
| **[Docs/ARCHITECTURE.md](Docs/ARCHITECTURE.md)** | System architecture |
| **[Docs/API-DOCUMENTATION.md](Docs/API-DOCUMENTATION.md)** | API reference |
| **[Docs/CHAINCODE-V1.4-DEPLOYED-SUCCESS.md](Docs/CHAINCODE-V1.4-DEPLOYED-SUCCESS.md)** | Deployment details |
| **[Docs/CODEBASE-CLEANUP-REPORT.md](Docs/CODEBASE-CLEANUP-REPORT.md)** | Cleanup report |

---

## 🔄 Upgrading to New Version

When you add new features to the chaincode:

```powershell
# 1. Modify chaincode source files in chaincodes/coffee/

# 2. Run automated upgrade (dry-run first)
.\scripts\upgrade-chaincode-version.ps1 -NewVersion "1.5" -DryRun

# 3. Execute actual upgrade
.\scripts\upgrade-chaincode-version.ps1 -NewVersion "1.5"
```

The upgrade script automatically:
- ✅ Validates version
- ✅ Creates backup
- ✅ Builds chaincode
- ✅ Creates Docker image
- ✅ Generates external package
- ✅ Installs on all 6 peers
- ✅ Approves for all organizations
- ✅ Commits to channel
- ✅ Restarts container
- ✅ Verifies deployment

See [UPGRADE-SYSTEM-GUIDE.md](Docs/UPGRADE-SYSTEM-GUIDE.md) for complete details.

---

## 🛠️ Development

### Project Structure
```
CEX/
├── api/                    # REST API (Node.js/Express)
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Auth, validation
│   │   └── utils/         # Utilities
│   └── package.json
│
├── ui/                     # Frontend (Next.js/React)
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page routes
│   │   └── types/         # TypeScript types
│   └── package.json
│
├── blockchain/             # Fabric network config
│   ├── organizations/     # Crypto materials
│   ├── channel-artifacts/ # Channel config
│   ├── configtx.yaml      # Channel configuration
│   └── crypto-config.yaml # Crypto configuration
│
├── chaincodes/coffee/      # Smart contracts (Go)
│   ├── main.go            # ECTA functions
│   ├── banking.go         # Banking functions
│   ├── forex.go           # Forex functions
│   ├── customs.go         # Customs functions
│   ├── payment.go         # Payment functions
│   ├── ecx.go             # ECX functions
│   └── Dockerfile         # Container build
│
└── scripts/                # Automation scripts
    ├── upgrade-chaincode-version.ps1  # Upgrade system
    ├── cleanup-codebase.ps1           # Cleanup tool
    ├── install-v1.4-now.ps1           # Current deploy
    └── [network scripts]
```

### Technology Stack
- **Blockchain:** Hyperledger Fabric 2.5
- **Chaincode:** Go 1.21
- **API:** Node.js 18, Express, TypeScript
- **Frontend:** Next.js 14, React 18, TypeScript
- **Database:** SQLite (offchain data)
- **Container:** Docker, Docker Compose

---

## 🧪 Testing

### Test Chaincode
```bash
# Query from peer
docker exec peer0.ecta.cecbs.et peer chaincode query \
  -C coffeechannel -n coffee \
  -c '{"function":"QueryAllExporters","Args":[]}'
```

### Test API
```bash
curl http://localhost:3001/health
curl http://localhost:3001/api/v1/exporters
```

### Check System Status
```powershell
# Container status
docker ps

# Chaincode logs
docker logs coffee-chaincode -f

# Peer logs
docker logs peer0.ecta.cecbs.et -f

# API logs
cd api && tail -f logs/combined.log
```

---

## 🐛 Troubleshooting

### Chaincode Issues
```powershell
# Check container
docker logs coffee-chaincode

# Restart container
docker stop coffee-chaincode
docker rm coffee-chaincode
# See QUICK-REFERENCE.md for restart command
```

### Network Issues
```bash
# Check all containers
docker ps

# Restart network
./scripts/stop.sh
./scripts/start.sh
```

### See Full Troubleshooting Guide
[UPGRADE-SYSTEM-GUIDE.md - Troubleshooting](Docs/UPGRADE-SYSTEM-GUIDE.md#troubleshooting)

---

## 🔐 Security Features

- **TLS Encryption** - All peer-to-peer communication
- **MSP Authentication** - Organization-based identity
- **Role-Based Access Control** - Permission-based operations
- **Digital Signatures** - Transaction non-repudiation
- **Audit Trail** - Complete transaction history
- **API Authentication** - JWT-based auth
- **Input Validation** - All API endpoints
- **Rate Limiting** - DDoS protection

---

## 📊 System Requirements

### Development
- **CPU:** 4+ cores
- **RAM:** 8GB minimum, 16GB recommended
- **Disk:** 20GB free space
- **OS:** Windows 10/11, Ubuntu 20.04+, macOS 12+

### Production
- **CPU:** 8+ cores
- **RAM:** 16GB minimum, 32GB recommended  
- **Disk:** 100GB SSD
- **Network:** 100Mbps minimum
- **OS:** Ubuntu Server 20.04 LTS or RHEL 8+

---

## 🤝 Contributing

### Code Style
- Go: `gofmt` formatting
- TypeScript: ESLint + Prettier
- Git: Conventional commits

### Before Committing
1. Test locally
2. Run linters
3. Update documentation
4. Write clear commit messages

---

## 📄 License

This project is proprietary software developed for the Ethiopian Coffee Export Consortium.

---

## 🆘 Support

### Documentation
- [Quick Reference](QUICK-REFERENCE.md)
- [Upgrade Guide](Docs/UPGRADE-SYSTEM-GUIDE.md)
- [Architecture](Docs/ARCHITECTURE.md)
- [API Docs](Docs/API-DOCUMENTATION.md)

### Common Issues
- See [Troubleshooting](#-troubleshooting) section above
- Check logs: `docker logs coffee-chaincode`
- Review error messages carefully

---

## 🎉 Acknowledgments

Built with:
- Hyperledger Fabric
- Go Programming Language
- Node.js & Express
- React & Next.js
- Docker

---

## 📈 Version History

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| **1.4** | 2026-06-04 | ✅ Production | 62+ functions, 6 organizations, professional upgrade system |
| 1.3 | 2026-06-03 | Deprecated | External chaincode, limited functions |
| 1.2 | 2026-05 | Deprecated | Basic functions |
| 1.1 | 2026-04 | Deprecated | Initial CaaS attempt |
| 1.0 | 2026-03 | Deprecated | Initial version |

---

**CECBS** | Ethiopian Coffee Export Consortium Blockchain System  
**Version 1.4** | Production Ready ✅ | Last Updated: June 4, 2026

## Overview
National digital infrastructure for Ethiopian coffee exports using Hyperledger Fabric blockchain consortium.

## Architecture
- **Blockchain**: Hyperledger Fabric v2.x with Raft consensus
- **Backend**: Go microservices (replacing Node.js)
- **Database**: PostgreSQL + CouchDB (world state)
- **Cache**: Redis
- **Events**: Apache Kafka
- **Frontend**: React (Vite)

## Consortium Members (6 Organizations + Clients)

### Network Members (with Blockchain Peers):
1. ECTA (Ethiopian Coffee & Tea Authority) - Regulatory Authority - Port 3003
2. ECX (Ethiopian Commodity Exchange) - Trading Platform - Port 3006
3. Commercial Banks (CBE) - Financial Services - Port 3002
4. National Bank of Ethiopia (NBE) - Central Bank - Port 3004
5. Ethiopian Customs Commission - Import/Export Control - Port 3005
6. Shipping Lines - Logistics - Port 3007

### Client Applications (SDK Access via Gateway):
- **Licensed Exporters** (300+ companies) - Connect via ECTA gateway (Port 3010)
  - Submit export applications
  - Track shipment status
  - Access via Fabric SDK
- **International Buyers** - Connect via public API gateway (Port 3009)
  - Verify shipment authenticity
  - Confirm receipt
  - Track delivery status
- **Farmers/Cooperatives** - Connect via ECTA gateway
- **Warehouses** - Connect via ECX gateway

## Quick Start

### Prerequisites
- Docker & Docker Compose 2.0+
- Go 1.21+
- 16GB RAM (32GB recommended)
- 8 CPU cores minimum

### Start System
```bash
./scripts/start.sh
```

### Access
- Frontend: http://localhost:5173
- Gateway API: http://localhost:3000

### Test Credentials (Dev Only)
- admin / admin123
- exporter1 / password123

## Project Structure
```
├── blockchain/          # Hyperledger Fabric network config
├── chaincodes/         # Smart contracts (Go)
├── services/           # Microservices (Go)
├── frontend/           # React UI
├── scripts/            # Deployment scripts
└── docker/             # Docker configurations
```

## Key Features
- End-to-end traceability (farm to port)
- Real-time forex reporting to NBE
- EUDR compliance (EU Deforestation Regulation)
- Dual-channel support (ECX + DSL)
- Immutable audit trail
- 15-25 day export cycle (vs 30-60 legacy)

## Documentation
See `docs/` for detailed technical documentation.

**Confidential** | Ethiopian Coffee Export Consortium | v2.0 | May 2026
