# CouchDB to PostgreSQL Sync Service

This service continuously synchronizes blockchain data from all 6 CouchDB state databases to PostgreSQL for efficient querying.

## Features

- ✅ Syncs all 6 organization CouchDB instances (ECTA, ECX, Banks, NBE, Customs, Shipping)
- ✅ Continuous watch mode (syncs every 30 seconds)
- ✅ Automatic table creation in PostgreSQL
- ✅ Handles shipments, documents, contracts, payments, and customs clearances
- ✅ Tracks sync status and errors
- ✅ Stores raw blockchain data in JSONB format

## CouchDB Instances

| Organization | Port | Database |
|-------------|------|----------|
| ECTA | 5984 | coffeechannel_* |
| ECX | 6984 | coffeechannel_* |
| Banks | 7984 | coffeechannel_* |
| NBE | 8984 | coffeechannel_* |
| Customs | 9984 | coffeechannel_* |
| Shipping | 10984 | coffeechannel_* |

## PostgreSQL Tables

- `blockchain_shipments` - All shipment records from blockchain
- `blockchain_documents` - All document records
- `blockchain_contracts` - All contract records
- `blockchain_payments` - All payment records
- `blockchain_customs` - All customs clearance records
- `sync_status` - Tracks last sync time and status for each CouchDB instance

## Usage

### One-Time Sync

```bash
node couchdb-postgres-sync.js
```

### Continuous Sync (Watch Mode)

```bash
node couchdb-postgres-sync.js --watch
```

### Using PM2 (Recommended for Production)

```bash
# Install PM2 globally
npm install -g pm2

# Start sync service
./start-sync.sh

# Check status
pm2 status

# View logs
pm2 logs couchdb-postgres-sync

# Stop service
./stop-sync.sh
```

### Using Systemd (Linux Service)

```bash
# Copy service file
sudo cp couchdb-postgres-sync.service /etc/systemd/system/

# Enable and start service
sudo systemctl enable couchdb-postgres-sync
sudo systemctl start couchdb-postgres-sync

# Check status
sudo systemctl status couchdb-postgres-sync

# View logs
sudo journalctl -u couchdb-postgres-sync -f
```

## Configuration

Edit `couchdb-postgres-sync.js` to modify:

- PostgreSQL connection details (lines 10-15)
- CouchDB instances (lines 18-25)
- CouchDB credentials (lines 27-28)
- Sync interval in watch mode (line 267 - default: 30 seconds)

## Monitoring

### Check Sync Status

```sql
SELECT * FROM sync_status ORDER BY last_sync DESC;
```

### View Synced Data

```sql
-- Count synced documents by organization
SELECT synced_from, COUNT(*) as total
FROM blockchain_shipments
GROUP BY synced_from;

-- Recent shipments
SELECT shipment_id, status, synced_from, synced_at
FROM blockchain_shipments
ORDER BY synced_at DESC
LIMIT 10;

-- Documents by type
SELECT document_type, COUNT(*) as total
FROM blockchain_documents
GROUP BY document_type;
```

## Troubleshooting

### Connection Errors

1. Check CouchDB containers are running:
   ```bash
   docker ps | grep couchdb
   ```

2. Check PostgreSQL container is running:
   ```bash
   docker ps | grep postgres
   ```

3. Test CouchDB connectivity:
   ```bash
   curl -u admin:adminpw http://localhost:5984/_all_dbs
   ```

4. Test PostgreSQL connectivity:
   ```bash
   docker exec -it postgres psql -U cecbs -d cecbs -c "SELECT version();"
   ```

### No Data Syncing

1. Check if coffeechannel databases exist:
   ```bash
   curl -u admin:adminpw http://localhost:5984/_all_dbs | grep coffeechannel
   ```

2. Check if documents exist in CouchDB:
   ```bash
   curl -u admin:adminpw http://localhost:5984/mychannel_coffee/_all_docs
   ```

3. Review sync service logs for errors

### Performance Issues

- Adjust sync interval in watch mode (default: 30 seconds)
- Consider adding PostgreSQL indexes for frequently queried fields
- Monitor PostgreSQL query performance with `EXPLAIN ANALYZE`

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Hyperledger Fabric Network              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │  ECTA    │  │   ECX    │  │  Banks   │            │
│  │ CouchDB  │  │ CouchDB  │  │ CouchDB  │            │
│  │ :5984    │  │ :6984    │  │ :7984    │            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
│       │             │             │                    │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐            │
│  │   NBE    │  │ Customs  │  │ Shipping │            │
│  │ CouchDB  │  │ CouchDB  │  │ CouchDB  │            │
│  │ :8984    │  │ :9984    │  │ :10984   │            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
│       │             │             │                    │
└───────┼─────────────┼─────────────┼────────────────────┘
        │             │             │
        └─────────────┴─────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │  CouchDB-PostgreSQL Sync    │
        │  Service (This Service)     │
        │  • Polls every 30 seconds   │
        │  • Transforms data          │
        │  • Handles conflicts        │
        └──────────────┬──────────────┘
                       │
                       ▼
        ┌─────────────────────────────┐
        │      PostgreSQL Database    │
        │      :5432                  │
        │                             │
        │  • blockchain_shipments     │
        │  • blockchain_documents     │
        │  • blockchain_contracts     │
        │  • blockchain_payments      │
        │  • blockchain_customs       │
        │  • sync_status              │
        └─────────────────────────────┘
```

## Data Flow

1. **Blockchain Transaction** → Committed to Hyperledger Fabric
2. **State Database** → Data written to organization's CouchDB
3. **Sync Service** → Polls CouchDB every 30 seconds
4. **Transform** → Converts blockchain data to relational format
5. **PostgreSQL** → Inserts/updates records (UPSERT on conflict)
6. **API/UI** → Queries PostgreSQL for fast access

## Benefits

- **Performance**: PostgreSQL queries are much faster than CouchDB queries
- **Joins**: Can join across multiple blockchain entities
- **Analytics**: Complex aggregations and reporting
- **Backup**: PostgreSQL data can be backed up independently
- **Legacy Integration**: Existing tools can query PostgreSQL
- **Caching**: Reduces load on blockchain network

## Future Enhancements

- [ ] Bidirectional sync (PostgreSQL changes push to blockchain)
- [ ] Change stream monitoring (real-time sync instead of polling)
- [ ] Conflict resolution strategies
- [ ] Data transformation pipeline
- [ ] Metrics and monitoring dashboard
- [ ] Multi-channel support
- [ ] Configurable sync filters
- [ ] Incremental sync using last_seq
