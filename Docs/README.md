# CECBS - Coffee Export Consortium Blockchain System

> Ethiopian Coffee Export Blockchain Platform powered by Hyperledger Fabric

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Go](https://img.shields.io/badge/go-%3E%3D1.20-00ADD8.svg)](https://golang.org/)
[![Docker](https://img.shields.io/badge/docker-required-2496ED.svg)](https://www.docker.com/)

---

## 🚀 Quick Start

**📚 New to CECBS?** Start here: **[Docs/START-HERE.md](Docs/START-HERE.md)**

### Fastest Way to Start

**Windows Users (Double-Click):**
1. Double-click `START-SYSTEM.bat`
2. Wait 60 seconds
3. Open browser to http://localhost:3000
4. Login: `ecta_admin` / `password123`

**PowerShell (Recommended):**
```powershell
.\start-all.ps1 -SkipBuild
```

**Linux/macOS (Bash):**
```bash
./start-all.sh --skip-build
```

**Development Mode:**
```powershell
.\dev-mode.ps1  # Opens 4 terminals with hot-reload
```

📖 **Complete Guide:** [Docs/GETTING-STARTED.md](Docs/GETTING-STARTED.md)  
🔧 **Script Reference:** [Docs/SCRIPTS-OVERVIEW.md](Docs/SCRIPTS-OVERVIEW.md)  
📑 **All Documentation:** [Docs/DOCUMENTATION-INDEX.md](Docs/DOCUMENTATION-INDEX.md)

---

## 📋 What is CECBS?

CECBS is a comprehensive blockchain-based system for managing Ethiopian coffee exports, built on Hyperledger Fabric. It digitizes and automates the entire export process from contract registration to payment settlement.

### Key Features

✅ **Contract Management** - Register and track sales contracts  
✅ **Letter of Credit (LC)** - Digital LC issuance and management  
✅ **Quality Control** - ECTA inspection and certification  
✅ **Customs Clearance** - Automated customs declaration and clearance  
✅ **Forex Management** - NBE forex allocation and tracking  
✅ **Document Management** - Secure document storage and verification  
✅ **Payment Processing** - SWIFT MT700/799 integration  
✅ **Audit Trail** - Complete immutable transaction history  
✅ **Multi-Stakeholder** - Exporters, Banks, ECTA, NBE, Customs, Shipping

### Technology Stack

- **Blockchain**: Hyperledger Fabric 2.5
- **Smart Contracts**: Go (Golang)
- **Backend API**: Node.js, TypeScript, Express
- **Frontend**: Next.js 14, React, Material-UI
- **Databases**: PostgreSQL, CouchDB, Redis
- **Message Queue**: Apache Kafka
- **Deployment**: Docker, Docker Compose

---

## 🛠️ Prerequisites

| Software | Version | Required | Download |
|----------|---------|----------|----------|
| Docker Desktop | Latest | ✅ Yes | [docker.com](https://www.docker.com/products/docker-desktop) |
| Node.js | 18+ | ✅ Yes | [nodejs.org](https://nodejs.org/) |
| Go | 1.20+ | ✅ Yes | [go.dev](https://go.dev/dl/) |
| Git | Latest | 📝 Optional | [git-scm.com](https://git-scm.com/) |

**System Requirements:**
- **RAM**: 8GB minimum, 16GB recommended
- **Disk**: 20GB free space
- **OS**: Windows 10/11, macOS, or Linux
- **CPU**: 4 cores recommended

---

## 📥 Installation

### First Time Setup

```powershell
# 1. Clone the repository
git clone <repository-url>
cd goCBC

# 2. Ensure Docker Desktop is running

# 3. Start the system (first run takes 5-10 minutes)
.\start-all.ps1

# 4. Verify installation
.\status.ps1
```

**What happens during first start:**
- Downloads Docker images (~2GB)
- Installs npm dependencies (~500MB)
- Builds Go chaincode
- Generates blockchain crypto material
- Creates blockchain channel
- Deploys smart contracts
- Initializes databases
- Starts all services

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Docs/STARTUP-GUIDE.md](Docs/STARTUP-GUIDE.md) | Complete startup & troubleshooting guide |
| [Docs/QUICK-START.md](Docs/QUICK-START.md) | Quick reference |
| [Docs/COMPLETE-WORKFLOW-SEQUENCE.md](Docs/COMPLETE-WORKFLOW-SEQUENCE.md) | End-to-end workflow |
| [Docs/WORKFLOW-VERIFICATION.md](Docs/WORKFLOW-VERIFICATION.md) | Testing workflows |
| [Docs/IMPLEMENTATION-ROADMAP.md](Docs/IMPLEMENTATION-ROADMAP.md) | Feature roadmap |
| [Docs/EMAIL-NOTIFICATIONS-SETUP.md](Docs/EMAIL-NOTIFICATIONS-SETUP.md) | Email configuration |

---

## 🎮 Usage

### Daily Operations

```powershell
# Start the system (quick)
.\start-all.ps1 -SkipBuild

# Check system status
.\status.ps1

# Stop the system (keep data)
.\stop-all.ps1 -KeepData

# Restart
.\restart-all.ps1 -KeepData -SkipBuild
```

### Development Mode

```powershell
# Open multi-terminal dev environment
.\dev-mode.ps1

# Or manually:
# Terminal 1: Infrastructure
.\start-all.ps1 -SkipBuild

# Terminal 2: API with hot-reload
cd api && npm run dev

# Terminal 3: UI with hot-reload
cd ui && npm run dev
```

### Testing

```powershell
# Run API tests
cd api
npm test

# Run UI tests
cd ui
npm test

# Run complete workflow test
node tests\test-complete-workflow.js
```

---

## 🌐 Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend UI** | http://localhost:3000 | Web interface |
| **Backend API** | http://localhost:3001 | REST API |
| **API Docs** | http://localhost:3001/api-docs | Swagger documentation |
| **PostgreSQL** | localhost:5432 | Database |
| **Redis** | localhost:6379 | Cache |

---

## 🔐 Default Credentials

| Role | Username | Password | Portal |
|------|----------|----------|--------|
| ECTA Admin | `ecta_admin` | `password123` | ECTA |
| NBE Officer | `nbe_admin` | `password123` | NBE |
| Bank Officer | `bank_admin` | `password123` | Banks |
| Customs Officer | `customs_admin` | `password123` | Customs |
| Exporter | `EXP1087072` | `password123` | Exporters |

⚠️ **Change these credentials in production!**

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CECBS Platform                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Frontend (Next.js)  ◄──► Backend API (Node.js)      │
│   Port 3000                  Port 3001                  │
│                                  │                       │
│          ┌───────────────────────┼────────────┐        │
│          ▼                       ▼            ▼        │
│    PostgreSQL          Fabric Network      Redis       │
│    (Metadata)          (Blockchain)      (Cache)       │
│                               │                         │
│                   ┌───────────┼──────────┐             │
│                   ▼           ▼          ▼             │
│              Orderer      Peers      CouchDB           │
│              (7050)     (7051+)     (5984+)            │
│                           │                             │
│                           ▼                             │
│                Coffee Chaincode (Go)                    │
│                    Port 9999                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Organizations in Fabric Network

1. **ECTA** - Ethiopian Coffee & Tea Authority (Regulator)
2. **ECX** - Ethiopian Commodity Exchange
3. **Banks** - Commercial Banks
4. **NBE** - National Bank of Ethiopia
5. **Customs** - Ethiopian Customs Authority
6. **Shipping** - Shipping & Logistics Companies
7. **Exporters** - Coffee Exporters
8. **Buyers** - International Coffee Buyers

---

## 🔧 Common Commands

### Docker Management

```powershell
# View all containers
docker ps

# View logs for specific container
docker logs coffee-chaincode --tail 100 -f

# Restart specific container
docker restart coffee-chaincode

# Stop all containers
docker-compose -f docker-compose-fabric.yml down

# Remove all data (WARNING: destructive)
docker-compose -f docker-compose-fabric.yml down -v
```

### Blockchain Operations

```powershell
# View chaincode logs
docker logs coffee-chaincode -f

# Rebuild chaincode
cd chaincodes\coffee
go build -o chaincode.exe
docker restart coffee-chaincode

# Deploy updated chaincode
.\scripts\deploy-chaincode.ps1
```

### Database Operations

```powershell
# Access PostgreSQL
docker exec -it cecbs-postgres psql -U cecbs -d cecbs

# Access Redis
docker exec -it cecbs-redis redis-cli -a redis123

# Backup database
docker exec cecbs-postgres pg_dump -U cecbs cecbs > backup.sql

# Restore database
docker exec -i cecbs-postgres psql -U cecbs cecbs < backup.sql
```

---

## 🐛 Troubleshooting

### System Won't Start

**Issue:** Docker daemon not running
```powershell
# Solution: Start Docker Desktop and wait for it to be ready
```

**Issue:** Port already in use
```powershell
# Find process using the port
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <process_id> /F

# Or stop everything first
.\stop-all.ps1
```

**Issue:** Chaincode errors
```powershell
# Rebuild and restart
cd chaincodes\coffee
go build -o chaincode.exe
docker restart coffee-chaincode
```

### System is Slow

```powershell
# Check Docker resource usage
docker stats

# Increase Docker Desktop resources
# Settings → Resources → Increase CPU/Memory

# Clean restart
.\stop-all.ps1
docker system prune -a --volumes
.\start-all.ps1
```

### Database Issues

```powershell
# Reset database (WARNING: deletes data)
.\stop-all.ps1
docker volume rm gocbc_postgres-data
.\start-all.ps1
```

📖 **More Solutions:** See [STARTUP-GUIDE.md](STARTUP-GUIDE.md#troubleshooting)

---

## 🧪 Testing Workflows

### Complete Export Workflow

1. **Create Contract** (Exporter)
   - Login: EXP1087072 / password123
   - Navigate: Exporter Portal → Register Contract

2. **Approve Contract** (ECTA)
   - Login: ecta_admin / password123
   - Navigate: ECTA Portal → Review Contracts

3. **Issue LC** (Bank)
   - Login: bank_admin / password123
   - Navigate: Banks Portal → Issue LC

4. **Quality Inspection** (ECTA)
   - Navigate: ECTA Portal → Quality Control
   - Perform inspection → Approve
   - Issue Export Permit

5. **Customs Clearance** (Customs)
   - Login: customs_admin / password123
   - Navigate: Customs Portal → Declarations
   - Inspect → Clear

6. **Submit Documents** (Exporter)
   - Navigate: Exporter Portal → Payments
   - Upload documents (B/L, Invoice, etc.)

7. **Verify & Pay** (Bank)
   - Navigate: Banks Portal → Payments
   - Verify documents → Initiate SWIFT payment

📖 **Detailed Workflow:** See [COMPLETE-WORKFLOW-SEQUENCE.md](COMPLETE-WORKFLOW-SEQUENCE.md)

---

## 📊 Project Structure

```
goCBC/
├── api/                    # Backend API (Node.js/TypeScript)
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Auth, validation
│   │   └── config/        # Configuration
│   └── package.json
├── ui/                     # Frontend (Next.js/React)
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Next.js pages
│   │   └── styles/        # CSS/styling
│   └── package.json
├── chaincodes/            # Smart contracts
│   └── coffee/            # Coffee chaincode (Go)
├── blockchain/            # Fabric network config
├── scripts/               # Utility scripts
├── Docs/                  # Documentation
├── tests/                 # Test files
├── start-all.ps1          # Main startup script
├── stop-all.ps1           # Stop script
├── status.ps1             # Status checker
├── dev-mode.ps1           # Dev environment launcher
├── STARTUP-GUIDE.md       # Complete guide
└── docker-compose-fabric.yml
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙋 Support

### Getting Help

1. **Check Documentation:**
   - [STARTUP-GUIDE.md](Docs/STARTUP-GUIDE.md) - Complete troubleshooting
   - [Docs/QUICK-START.md](Docs/QUICK-START.md) - Quick reference

2. **Check System Status:**
   ```powershell
   .\status.ps1
   ```

3. **View Logs:**
   ```powershell
   docker-compose -f docker-compose-fabric.yml logs -f
   ```

4. **Common Issues:**
   - See [STARTUP-GUIDE.md#troubleshooting](STARTUP-GUIDE.md#troubleshooting)

---

## 🎯 Roadmap

- [x] Core blockchain infrastructure
- [x] Contract management
- [x] LC issuance and tracking
- [x] Quality control integration
- [x] Customs clearance
- [x] Payment processing
- [x] Document management
- [ ] Mobile app (iOS/Android)
- [ ] Advanced analytics dashboard
- [ ] Integration with external systems
- [ ] Multi-language support
- [ ] Enhanced reporting

See [IMPLEMENTATION-ROADMAP.md](IMPLEMENTATION-ROADMAP.md) for details.

---

## ⭐ Quick Reference

```powershell
# Start system
.\start-all.ps1 -SkipBuild

# Check status
.\status.ps1

# Stop system (keep data)
.\stop-all.ps1 -KeepData

# Development mode
.\dev-mode.ps1

# View logs
docker-compose -f docker-compose-fabric.yml logs -f

# Restart
.\restart-all.ps1 -KeepData -SkipBuild
```

---

## 📧 Contact

- **Project Website:** [Coming Soon]
- **Documentation:** See `/Docs` folder
- **Issue Tracker:** GitHub Issues

---

<div align="center">

**Made with ❤️ for Ethiopian Coffee Exports**

🇪🇹 ☕ 🚀

[Documentation](Docs/STARTUP-GUIDE.md) • [Quick Start](Docs/QUICK-START.md) • [Workflow](COMPLETE-WORKFLOW-SEQUENCE.md)

</div>
