# Database Connection Configuration Guide

## Overview

The GoCBC system uses PostgreSQL as its primary database. The connection string varies depending on how the API is running:
- **Host-based API** (npm run dev on host machine)
- **Containerized API** (Docker Compose)

## Connection String Formats

### 1. Host-Based API (Development)

When running the API directly on your host machine (outside Docker):

```bash
# In api/.env
DATABASE_URL=postgresql://cecbs:cecbs123@localhost:5432/cecbs
```

**Explanation:**
- Uses `localhost` because PostgreSQL container exposes port 5432 to the host
- API runs on host → connects to `localhost:5432` → Docker port mapping routes to container

**Use Case:**
- Local development with `npm run dev` in the api directory
- Debugging with IDE
- Running tests directly

### 2. Containerized API (Docker Compose)

When running the API inside a Docker container:

```bash
# In docker-compose-fabric.yml or api/.env.production
DATABASE_URL=postgresql://cecbs:cecbs123@cecbs-postgres:5432/cecbs
```

**Explanation:**
- Uses `cecbs-postgres` (container name) instead of localhost
- Containers communicate via Docker network names
- Port 5432 is internal to the Docker network (no port mapping needed for inter-container communication)

**Use Case:**
- Production deployment
- Full stack Docker Compose deployment
- API running as `cecbs-api` container

## Current Configuration Files

### api/.env (Host-Based Development)
```bash
DATABASE_URL=postgresql://cecbs:cecbs123@localhost:5432/cecbs
```
✅ **Correct** - For running API on host machine

### docker-compose-fabric.yml (Containerized)
```yaml
services:
  cecbs-api:
    environment:
      - DATABASE_URL=postgresql://cecbs:cecbs123@cecbs-postgres:5432/cecbs
```
✅ **Correct** - For running API in container

## How to Choose

| Scenario | Connection String | Config File |
|----------|------------------|-------------|
| Running `npm run dev` in api/ directory | `localhost:5432` | `api/.env` |
| Running API in Docker container | `cecbs-postgres:5432` | docker-compose or api/.env.production |
| Running tests locally | `localhost:5432` | `api/.env` or `api/.env.test` |
| Production deployment | `cecbs-postgres:5432` or production host | `api/.env.production` |

## CouchDB Configuration

The same principle applies to CouchDB connections:

### Host-Based API
```bash
# In api/.env
COUCHDB_URL=http://127.0.0.1:5985
```
Port 5985 is the host-mapped port for ECTA's CouchDB (see docker-compose-fabric.yml)

### Containerized API
```bash
# In docker-compose-fabric.yml
COUCHDB_URL=http://couchdb.ecta:5984
```
Uses container name and internal port 5984

## CouchDB Port Mapping Reference

Each organization has its own CouchDB instance:

| Organization | Host Port | Container Name | Internal Port |
|--------------|-----------|----------------|---------------|
| ECTA | 5985 | couchdb.ecta | 5984 |
| ECX | 6984 | couchdb.ecx | 5984 |
| Banks | 7984 | couchdb.banks | 5984 |
| NBE | 8984 | couchdb.nbe | 5984 |
| Customs | 9984 | couchdb.customs | 5984 |
| Shipping | 10984 | couchdb.shipping | 5984 |

## Blockchain Peer Connections

### Host-Based API
When FABRIC_AS_LOCALHOST=false (connecting to Docker network from host):
```bash
FABRIC_PEER_URL_ECTA=grpcs://peer0.ecta.cecbs.et:7051
```
Uses peer DNS names that resolve via `/etc/hosts` or Docker network

### Containerized API
Same configuration - container uses Docker network DNS:
```bash
FABRIC_PEER_URL_ECTA=grpcs://peer0.ecta.cecbs.et:7051
```

**Note:** `FABRIC_AS_LOCALHOST` should be `false` in both cases when using Docker network.

## Environment Detection

The API can automatically detect its environment:

```javascript
// In API code
const isDocker = fs.existsSync('/.dockerenv');
const dbHost = isDocker ? 'cecbs-postgres' : 'localhost';
const DATABASE_URL = `postgresql://cecbs:cecbs123@${dbHost}:5432/cecbs`;
```

However, it's cleaner to use separate .env files:
- `api/.env` → host-based development
- `api/.env.production` → production/Docker deployment
- docker-compose environment variables override both

## Common Issues

### Issue 1: API Can't Connect to Database

**Symptom:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
- If API is in Docker → change `localhost` to `cecbs-postgres`
- If API is on host → ensure PostgreSQL container is running and port 5432 is mapped

### Issue 2: CouchDB Connection Refused

**Symptom:**
```
Error: connect ECONNREFUSED 127.0.0.1:5985
```

**Solution:**
- Check COUCHDB_URL matches your deployment mode
- Host-based: `http://127.0.0.1:5985`
- Container-based: `http://couchdb.ecta:5984`

### Issue 3: Peer Connection Timeout

**Symptom:**
```
Error: 14 UNAVAILABLE: failed to connect to peer
```

**Solution:**
- Verify FABRIC_AS_LOCALHOST=false
- Check peer containers are running: `docker ps | grep peer`
- Verify TLS certificates exist in blockchain/organizations/

## Best Practices

1. **Never commit production credentials** to .env files
2. **Use separate .env files** for different environments
3. **Document connection strings** in deployment guides
4. **Test both modes** (host and container) during development
5. **Use Docker network names** in production (never localhost in containers)

## Quick Reference Commands

### Check Database Connection (Host)
```bash
psql -h localhost -p 5432 -U cecbs -d cecbs
```

### Check Database Connection (Container)
```bash
docker exec -it cecbs-postgres psql -U cecbs -d cecbs
```

### Check CouchDB (Host)
```bash
curl http://admin:adminpw@127.0.0.1:5985/_up
```

### Check CouchDB (Container)
```bash
docker exec -it couchdb.ecta curl http://admin:adminpw@localhost:5984/_up
```

## Related Files

- `api/.env` - Local development environment variables
- `api/.env.example` - Template with all possible variables
- `api/.env.blockchain.fixed` - Blockchain-specific settings
- `docker-compose-fabric.yml` - Container environment variables
- `start-all.sh` - Startup script that validates configurations

## Summary

The key rule is simple:
- **API on host** → use `localhost` and host-mapped ports
- **API in Docker** → use container names and internal ports

Always ensure your DATABASE_URL matches how you're running the API.
