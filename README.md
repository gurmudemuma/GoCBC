# GoCBC - Coffee Bean Certification System

> Ethiopian Coffee and Tea Blockchain System for export management and certification

## 🚀 Quick Start

```bash
# Start all services
./start.sh

# Check system status
./status.sh

# Stop all services
./stop.sh
```

## 📁 Project Structure

```
GoCBC/
├── 📄 Core Configuration
│   ├── go.mod                      # Go module dependencies
│   ├── main.go                     # Go application entry point
│   ├── package.json                # Node.js dependencies
│   └── docker-compose-fabric.yml   # Docker orchestration
│
├── 🗂️ Source Code
│   ├── api/                        # Backend API (Node.js/Express)
│   ├── ui/                         # Frontend (React/TypeScript)
│   ├── chaincodes/                 # Hyperledger Fabric smart contracts
│   └── blockchain/                 # Blockchain network configuration
│
├── 📚 Documentation
│   └── Docs/                       # All project documentation
│       ├── 00-START-HERE.md       # Getting started guide
│       ├── ARCHITECTURE.md         # System architecture
│       ├── API-DOCUMENTATION.md    # API reference
│       └── [120+ more docs]        # Comprehensive documentation
│
├── 🧪 Testing
│   └── tests/                      # All test files
│       ├── test-*.js              # Integration tests
│       ├── verify-*.js            # Verification scripts
│       └── README.md              # Testing guide
│
├── 🛠️ Scripts
│   └── scripts/                    # Operational scripts
│       ├── operations/             # Start/stop/restart/logs
│       ├── monitoring/             # Status and health checks
│       ├── deployment/             # Deployment tools
│       ├── utilities/              # Helper scripts
│       ├── [database scripts]      # DB migrations & seeds
│       ├── [blockchain scripts]    # Channel & chaincode mgmt
│       └── README-ORGANIZATION.md  # Scripts documentation
│
├── ⚙️ Configuration
│   ├── config/                     # Application configuration
│   ├── nginx-configs/              # Web server configs
│   └── .github/                    # CI/CD workflows
│
└── 🔧 Infrastructure
    ├── bin/                        # Fabric binaries
    ├── builders/                   # Chaincode builders
    ├── kubo/                       # IPFS configuration
    ├── logs/                       # Application logs
    └── tmp/                        # Temporary files
```

## 🎯 Key Features

- **Blockchain-Powered**: Hyperledger Fabric consortium blockchain
- **Multi-Portal System**: Separate portals for different stakeholders
  - Exporter Portal
  - Bank Portal
  - Customs Portal
  - Shipping Portal
  - Quality Control Portal
- **Smart Contracts**: Automated workflow enforcement
- **Dual Database**: PostgreSQL + CouchDB for optimal performance
- **Document Management**: Cryptographic signing and verification
- **Audit Trail**: Complete blockchain-backed activity tracking

## 🔧 System Operations

### Starting Services

```bash
# Start everything
./start.sh

# Start specific services
./scripts/operations/start-api.sh
./scripts/operations/start-ui.sh
./scripts/operations/start-postgres.sh
```

### Stopping Services

```bash
# Stop all
./stop.sh

# Stop specific services
./scripts/operations/stop-api.sh
./scripts/operations/stop-ui.sh
```

### Monitoring

```bash
# Quick status check
./status.sh

# Comprehensive system health
./scripts/monitoring/system-health.sh

# Full system check
./scripts/monitoring/full-system-check.sh

# Check specific components
./scripts/monitoring/check-api-status.sh
./scripts/monitoring/check-chaincode-status.sh
```

### Logs

```bash
# View API logs
./scripts/operations/logs-api.sh

# View UI logs
./scripts/operations/logs-ui.sh
```

## 📖 Documentation

All documentation is organized in the `Docs/` directory:

- **Getting Started**: `Docs/00-START-HERE.md`
- **Architecture**: `Docs/ARCHITECTURE.md`
- **API Documentation**: `Docs/API-DOCUMENTATION.md`
- **Deployment Guide**: `Docs/DEPLOYMENT-CHECKLIST.md`
- **Workflow Guides**: `Docs/COMPLETE-WORKFLOW-GUIDE.md`
- **Troubleshooting**: Various troubleshooting guides

### Documentation Index

See `Docs/DOCUMENTATION-INDEX.md` for a complete list of all available documentation.

## 🧪 Testing

All test files are in the `tests/` directory:

```bash
# Run integration tests
cd tests
node test-complete-workflow.js

# Run specific portal tests
node test-banks-portal-complete-workflow.js
node test-customs-portal-buttons.js

# Verify system integration
node verify-complete-customs-workflow.js
```

## 🏗️ Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL + CouchDB
- **Blockchain**: Hyperledger Fabric 2.x

### Frontend
- **Framework**: React
- **Language**: TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI

### Blockchain
- **Platform**: Hyperledger Fabric
- **Consensus**: Raft (Orderer)
- **Endorsement**: Multi-organization consensus
- **Storage**: CouchDB (World State)

### DevOps
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Web Server**: Nginx (production)
- **CI/CD**: GitHub Actions

## 🔐 Security

- **Authentication**: JWT-based authentication
- **Authorization**: Role-based access control (RBAC)
- **Document Signing**: Cryptographic signatures
- **Blockchain**: Immutable audit trail
- **TLS**: Encrypted communications

## 🌐 Environment Setup

### Prerequisites

- Docker & Docker Compose
- Node.js 16+
- Go 1.19+
- PostgreSQL 14+

### Installation

```bash
# Install dependencies
npm install
cd api && npm install
cd ../ui && npm install

# Initialize database
./scripts/init-db.sql

# Setup blockchain
./scripts/init-blockchain.sh

# Start system
./start.sh
```

## 📦 Deployment

For production deployment:

1. Review: `Docs/deployment/DEPLOYMENT-CHECKLIST.md`
2. Run preflight checks: `./scripts/deployment/preflight-check.sh`
3. Prepare deployment: `./scripts/deployment/prepare-deployment.sh`
4. Follow deployment guide

## 🤝 Contributing

1. Read the architecture documentation in `Docs/ARCHITECTURE.md`
2. Check coding standards in `Docs/CODEBASE-ORGANIZATION.md`
3. Run tests before committing
4. Follow the Git workflow

## 📝 License

[Your License Here]

## 📞 Support

- **Documentation**: See `Docs/` directory
- **Issues**: [Your Issue Tracker]
- **Team**: [Your Team Contact]

## 🎓 Learning Resources

- **System Overview**: `Docs/00-START-HERE.md`
- **Architecture Deep Dive**: `Docs/ARCHITECTURE.md`
- **Workflow Understanding**: `Docs/COMPLETE-WORKFLOW-SEQUENCE.md`
- **API Reference**: `Docs/API-DOCUMENTATION.md`

---

**Project Status**: ✅ Production Ready

Last Updated: 2026
