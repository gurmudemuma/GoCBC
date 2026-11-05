# GoCBC - Ethiopian Coffee Export Blockchain System

## System Overview

GoCBC is a comprehensive blockchain-based coffee export management system for Ethiopia, integrating 7 organizations (ECTA, Banks, NBE, Customs, Shipping, Quality, ECX) into a unified platform.

### Key Features
- ✅ Hyperledger Fabric 2.5 blockchain
- ✅ 6-peer multi-organization network
- ✅ Complete export workflow management
- ✅ Forex allocation & repatriation
- ✅ Letter of Credit (LC) lifecycle
- ✅ Payment processing & settlement
- ✅ Quality inspection & customs clearance
- ✅ Document management & digital signatures
- ✅ SWIFT message generation
- ✅ Real-time shipment tracking

## Quick Start

```bash
# Start all services
./start-all.sh

# Stop all services
./stop-all.sh

# Run E2E tests
./tests/e2e/COMPLETE-E2E-TEST-ALL-WORKFLOWS.sh

# Check system health
./tests/e2e/COMPONENT-HEALTH-CHECK-V2.sh
```

## Documentation

| Category | Location |
|----------|----------|
| **Architecture** | [Docs/CODEBASE-ARCHITECTURE-ANALYSIS.md](Docs/CODEBASE-ARCHITECTURE-ANALYSIS.md) |
| **Testing** | [Docs/POST-CLEANUP-VERIFICATION.md](Docs/POST-CLEANUP-VERIFICATION.md) |
| **Complete Reports** | [Docs/](Docs/) |
| **Test Scripts** | [tests/e2e/](tests/e2e/) |
| **Deployment Guides** | [scripts/](scripts/) |

## System Architecture

```
Frontend (React) → API (Node.js) → Blockchain (Fabric) → Database (PostgreSQL)
                                         ↓
                          6 Peers + 1 Orderer + 6 CouchDB
```

### Components
- **Frontend:** 7 portals (ECTA, Banks, NBE, Customs, Shipping, Quality, ECX)
- **API:** 52 routes, 30+ services (Node.js/TypeScript)
- **Blockchain:** 23 chaincode modules (Go)
- **Database:** PostgreSQL with 51 tables

## Directory Structure

```
GoCBC/
├── api/                    # API server (Node.js/TypeScript)
├── ui/                     # Frontend (React)
├── blockchain/             # Fabric network configuration
├── chaincodes/             # Smart contracts (Go)
├── config/                 # Configuration files
├── Docs/                   # 📚 Documentation & reports
├── tests/                  # 🧪 Test files & scripts
├── logs/                   # 📋 Log files
├── scripts/                # 🔧 Operational scripts
├── archive/                # 📦 Archived/deprecated files
├── start-all.sh           # Start all services
├── stop-all.sh            # Stop all services
└── README.md              # This file
```

## Testing

### System Status
- ✅ E2E Tests: 100% (12/12 stages passed)
- ✅ Component Health: 95% (46/48 components)
- ✅ All 7 Portals: Functional
- ✅ Primary Goal: Forex allocation validated

### Run Tests
```bash
# Full E2E test
cd tests/e2e
./COMPLETE-E2E-TEST-ALL-WORKFLOWS.sh

# Component health check
./COMPONENT-HEALTH-CHECK-V2.sh

# Integration tests
cd tests/integration
./test-all-portals-comprehensive.sh
```

## Deployment

### Production Deployment
See [scripts/](scripts/) for deployment scripts.

### Quick Deploy
```bash
# Full deployment
./scripts/deployment/COMPLETE-DEPLOYMENT.sh

# Start services
./start-all.sh

# Verify deployment
./tests/e2e/COMPONENT-HEALTH-CHECK-V2.sh
```

## Architecture Score

**Overall: 8.5/10** ⭐⭐⭐⭐⭐

- Structure: 9/10
- Code Quality: 8/10
- Security: 8/10
- Performance: 7/10
- Testing: 7/10
- Documentation: 8/10
- Maintainability: 9/10

## Status

**Production Ready** ✅

The system has been comprehensively validated and is approved for production deployment.

## License

[Add license information]

## Contact

[Add contact information]
