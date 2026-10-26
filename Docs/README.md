# Ethiopian Coffee Export Consortium Blockchain System (CECBS)

A comprehensive blockchain-based platform for managing Ethiopian coffee exports with complete traceability, compliance, and multi-stakeholder collaboration.

## 🚀 Quick Start

```bash
# Windows
START-SYSTEM.bat

# Linux/Mac
./start-all.ps1
```

**Default Login:**
- **Admin:** username: `admin`, password: `password123`
- **ECTA:** username: `ectaAdmin`, password: `password123`
- **Bank:** username: `bankAdmin`, password: `password123`
- **NBE:** username: `nbeAdmin`, password: `password123`
- **Exporter:** Register via public form

**Access URLs:**
- UI: http://localhost:3000
- API: http://localhost:3001
- Blockchain Explorer: http://localhost:8080 (if enabled)

## 📚 Documentation

All documentation is organized in the `Docs/` folder:

### Essential Guides
- **[Quick Start Guide](Docs/QUICK-START.md)** - Get started in minutes
- **[Consortium Value Proposition](Docs/CONSORTIUM-BLOCKCHAIN-VALUE-PROPOSITION.md)** - Why this system matters
- **[Production Security Checklist](Docs/PRODUCTION-SECURITY-CHECKLIST.md)** - Pre-deployment security

### Reference Documentation
- **[Quick References](Docs/quick-reference/)** - Fast lookup for features
- **[User Guides](Docs/guides/)** - Step-by-step tutorials
- **[Admin Documentation](Docs/admin/)** - User management & administration
- **[Audit Trail](Docs/audit-trail/)** - Complete traceability documentation
- **[Implementation Details](Docs/implementation/)** - Technical implementation docs

## 🏗️ System Architecture

### Technology Stack
- **Frontend:** Next.js 14, React, Material-UI, TypeScript
- **Backend:** Node.js, Express, TypeScript
- **Blockchain:** Hyperledger Fabric 2.5
- **Database:** SQLite (development) / PostgreSQL (production)
- **Smart Contracts:** Go (Chaincode)

### Key Features
- ✅ Multi-portal system (Exporter, ECTA, NBE, Banks, Admin)
- ✅ Blockchain-based audit trail with immutable records
- ✅ Letter of Credit (LC) management
- ✅ Forex allocation tracking
- ✅ Quality control & inspection workflow
- ✅ Document validation & compliance
- ✅ Role-based access control (RBAC)
- ✅ Real-time analytics & reporting
- ✅ SWIFT message integration
- ✅ Complete end-to-end traceability

## 🎯 Portals & Roles

| Portal | Role | Key Functions |
|--------|------|---------------|
| **Admin** | System Administrator | User management, blockchain identity, system oversight |
| **Exporter** | Coffee Exporters | Contract creation, shipment tracking, document upload |
| **ECTA** | Ethiopian Coffee & Tea Authority | Application approval, quality control, export permits |
| **Banks** | Commercial Banks | LC issuance, payments, forex requests, SWIFT messages |
| **NBE** | National Bank of Ethiopia | Forex allocation, compliance monitoring, exchange rates |

## 🛠️ Development Commands

```bash
# Start all services
npm run start              # Development mode
npm run start:prod         # Production mode

# Individual services
npm run start:api          # API only
npm run start:ui           # UI only
npm run start:blockchain   # Blockchain network only

# Utilities
npm run status             # Check system status
npm run logs:api           # View API logs
npm run logs:ui            # View UI logs
npm run restart            # Restart all services
npm run stop               # Stop all services
```

## 📦 Project Structure

```
goCBC/
├── api/                   # Backend API
│   ├── src/              # TypeScript source
│   ├── dist/             # Compiled JavaScript
│   └── cecbs.db          # SQLite database
├── ui/                    # Frontend application
│   ├── src/              # React/Next.js source
│   └── public/           # Static assets
├── chaincodes/           # Hyperledger Fabric chaincodes
│   └── coffee/           # Coffee export chaincode (Go)
├── blockchain/           # Fabric network configuration
├── scripts/              # Utility scripts
├── tests/                # Test suites
├── Docs/                 # Documentation
└── nginx-configs/        # Production nginx configs
```

## 🔐 Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Blockchain identity management
- Encrypted document storage
- Audit trail for all operations
- Input validation & sanitization
- HTTPS support (production)
- Rate limiting
- CORS protection

## 🌐 Production Deployment

See [Production Security Checklist](Docs/PRODUCTION-SECURITY-CHECKLIST.md) for complete deployment guide.

**Key Steps:**
1. Configure environment variables (`.env`)
2. Set up PostgreSQL database
3. Deploy Hyperledger Fabric network
4. Configure nginx reverse proxy
5. Enable HTTPS with SSL certificates
6. Set up monitoring & logging
7. Configure backup strategy

## 🤝 Contributing

This is a consortium project. For contributions:
1. Follow the TypeScript/Go coding standards
2. Write tests for new features
3. Update documentation
4. Follow blockchain best practices

## 📄 License

Proprietary - Ethiopian Coffee Export Consortium

## 💬 Support

- **Technical Issues:** Check `Docs/guides/TROUBLESHOOTING.md`
- **User Guides:** See `Docs/guides/`
- **API Reference:** See `Docs/quick-reference/API-QUICK-REFERENCE.md`

## 🎓 Training Materials

- **Admin Training:** `Docs/admin/ADMIN-PORTAL-VISUAL-GUIDE.md`
- **User Training:** `Docs/guides/USER-MANAGEMENT-ACCESS-GUIDE.md`
- **Blockchain Concepts:** `Docs/guides/BLOCKCHAIN-QUICK-REFERENCE.md`

---

**Built with ❤️ for Ethiopian Coffee Exporters**
