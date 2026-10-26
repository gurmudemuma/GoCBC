# Scripts Directory Organization

This directory contains all operational, deployment, and utility scripts for the GoCBC system.

## Directory Structure

```
scripts/
├── operations/          # Daily operational scripts
│   ├── start-*.sh      # Service startup scripts
│   ├── stop-*.sh       # Service shutdown scripts
│   ├── restart-*.sh    # Service restart scripts
│   └── logs-*.sh       # Log viewing scripts
│
├── monitoring/          # System monitoring and health checks
│   ├── status.sh       # Overall system status
│   ├── check-*.sh      # Specific component checks
│   └── system-health.sh # Health monitoring
│
├── deployment/          # Deployment related scripts
│   ├── prepare-deployment.sh
│   └── preflight-check.sh
│
├── utilities/           # Utility scripts
│   ├── kill-ports.sh
│   └── START-ON-LINUX.sh
│
└── [Other files]        # Database, blockchain, and test scripts
```

## Quick Access from Root

Convenience symlinks in the project root:
- `./start.sh` → `scripts/operations/start-all.sh`
- `./stop.sh` → `scripts/operations/stop-api.sh`
- `./status.sh` → `scripts/monitoring/status.sh`

## Common Operations

### Start Services
```bash
./start.sh                              # Start all services
./scripts/operations/start-api.sh       # Start API only
./scripts/operations/start-ui.sh        # Start UI only
```

### Stop Services
```bash
./stop.sh                               # Stop all
./scripts/operations/stop-api.sh        # Stop API only
./scripts/operations/stop-ui.sh         # Stop UI only
```

### Monitor System
```bash
./status.sh                             # Check status
./scripts/monitoring/system-health.sh   # Full health check
```

### Deployment
```bash
./scripts/deployment/preflight-check.sh        # Pre-deployment checks
./scripts/deployment/prepare-deployment.sh     # Prepare for deployment
```

## Database Scripts

Database related scripts are in the main `scripts/` directory:
- Migration scripts: `migrate-*.js`
- Seeding scripts: `seed-*.js`
- Database setup: `init-db.sql`

## Blockchain Scripts

Blockchain related scripts are in the main `scripts/` directory:
- Channel management: `create-channel.sh`, `join-*.sh`
- Chaincode deployment: `deploy-chaincode-*.sh`
- Crypto generation: `generate-*.sh`

## Testing Scripts

All testing scripts are in the `tests/` directory at the project root.
