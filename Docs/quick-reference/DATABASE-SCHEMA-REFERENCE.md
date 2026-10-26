# Database Schema Reference

## Overview

CECBS uses **dual database support**:
- **SQLite**: Development and testing (file: `api/cecbs.db`)
- **PostgreSQL**: Production deployment (configured via `DATABASE_URL`)

The system automatically selects the database based on the `DATABASE_URL` environment variable.

---

## Schema Definitions

### Primary Schema Source
- **File**: `scripts/init-db.sql` (PostgreSQL format)
- **Purpose**: Initial database setup for production
- **Usage**: Executed when PostgreSQL container first starts

### Fallback Schema Source  
- **File**: `api/src/services/databaseService.ts` (SQLite format)
- **Purpose**: Automatic table creation for development
- **Usage**: Executed on first API startup if tables don't exist

---

## Users Table

### Complete Schema

```sql
CREATE TABLE IF NOT EXISTS users (
    -- Identity
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Profile
    full_name VARCHAR(255),
    phone VARCHAR(50),
    
    -- Organization & Role
    organization VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    
    -- Exporter-specific fields
    exporter_id VARCHAR(50),
    ecta_license VARCHAR(100),
    
    -- Banking information
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(100),
    bank_branch VARCHAR(255),
    bank_branch_code VARCHAR(50),
    
    -- Permissions & Status
    permissions TEXT,              -- JSON array of permission strings
    status VARCHAR(50) DEFAULT 'active',
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);
```

### Valid Roles
- `ADMIN` - System administrator (full access)
- `ECTA` - Ethiopian Coffee & Tea Authority admin
- `ECX` - Ethiopian Commodity Exchange admin
- `NBE` - National Bank of Ethiopia admin
- `BANKS` - Commercial bank admin
- `CUSTOMS` - Customs authority admin
- `SHIPPING` - Shipping company admin
- `EXPORTER` - Coffee exporter user

### Valid Statuses
- `active` - User can login and access system
- `suspended` - Temporarily disabled
- `inactive` - Permanently disabled
- `rejected` - Application rejected (can view rejection reason)
- `pending` - Awaiting approval

### Permissions Format
JSON array stored as TEXT:
```json
["users:create-org", "users:read-org", "quality:manage", "permits:manage"]
```

---

## Default Users

The system creates these users on first setup:

| Username | Password | Role | Organization |
|----------|----------|------|--------------|
| admin | admin123 | ADMIN | Admin |
| ecta_admin | password123 | ECTA | ECTA |
| ecx_admin | password123 | ECX | ECX |
| nbe_admin | password123 | NBE | NBE |
| bank_admin | password123 | BANKS | Banks |
| customs_admin | password123 | CUSTOMS | Customs |
| shipping_admin | password123 | SHIPPING | Shipping |
| testexporter | password123 | EXPORTER | Exporters |

**⚠️ SECURITY**: Change all passwords before production deployment!

---

## Other Important Tables

### Exporter Applications
```sql
CREATE TABLE IF NOT EXISTS exporter_applications (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR(100) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    tin_number VARCHAR(50) NOT NULL,
    business_license_number VARCHAR(100) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP,
    rejection_reason TEXT,
    exporter_id VARCHAR(50),
    ecta_license_number VARCHAR(100),
    -- Additional fields...
);
```

### Coffee Lots
```sql
CREATE TABLE IF NOT EXISTS coffee_lots (
    id SERIAL PRIMARY KEY,
    lot_number VARCHAR(100) UNIQUE NOT NULL,
    farm_id VARCHAR(100) NOT NULL,
    variety VARCHAR(100),
    processing_method VARCHAR(50),
    quantity_kg DECIMAL(10,2) NOT NULL,
    harvest_date DATE,
    quality_grade VARCHAR(20),
    certification VARCHAR(100),
    status VARCHAR(50) DEFAULT 'registered',
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Export Contracts
```sql
CREATE TABLE IF NOT EXISTS export_contracts (
    id SERIAL PRIMARY KEY,
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    exporter_id VARCHAR(100) NOT NULL,
    buyer_id VARCHAR(100) NOT NULL,
    lot_ids TEXT[],  -- PostgreSQL array
    total_quantity_kg DECIMAL(10,2) NOT NULL,
    price_per_kg DECIMAL(10,2) NOT NULL,
    total_value_usd DECIMAL(15,2) NOT NULL,
    payment_terms VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft',
    blockchain_tx_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Audit Log
```sql
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    details TEXT,  -- JSON
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Database Migrations

### Manual Migrations
When schema changes are needed:

1. **Add columns**:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS new_column VARCHAR(255);
```

2. **Update existing data**:
```sql
UPDATE users SET new_column = 'default_value' WHERE new_column IS NULL;
```

3. **Create indexes**:
```sql
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
```

### Recent Migrations Applied
```sql
-- Added banking information columns (2026-08-03)
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_branch_code VARCHAR(50);

-- Added session tracking (2026-08-03)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
```

---

## Common Queries

### Check User Permissions
```sql
SELECT username, role, organization, permissions, status
FROM users
WHERE username = 'admin';
```

### List All Active Users by Organization
```sql
SELECT organization, role, COUNT(*) as user_count
FROM users
WHERE status = 'active'
GROUP BY organization, role
ORDER BY organization, role;
```

### Find Users Needing Password Reset
```sql
SELECT username, email, last_login
FROM users
WHERE last_login < NOW() - INTERVAL '90 days'
  AND status = 'active';
```

### Audit User Activity
```sql
SELECT u.username, a.action, a.resource_type, a.created_at
FROM audit_log a
JOIN users u ON a.user_id = u.id
WHERE u.username = 'admin'
ORDER BY a.created_at DESC
LIMIT 50;
```

---

## Database Maintenance

### Backup PostgreSQL
```bash
# Full database backup
docker exec cecbs-postgres pg_dump -U cecbs cecbs > backup_$(date +%Y%m%d).sql

# Compressed backup
docker exec cecbs-postgres pg_dump -U cecbs cecbs | gzip > backup_$(date +%Y%m%d).sql.gz

# Backup specific table
docker exec cecbs-postgres pg_dump -U cecbs -t users cecbs > users_backup.sql
```

### Restore PostgreSQL
```bash
# Restore from backup
docker exec -i cecbs-postgres psql -U cecbs cecbs < backup_20260803.sql

# Restore from compressed backup
gunzip -c backup_20260803.sql.gz | docker exec -i cecbs-postgres psql -U cecbs cecbs
```

### Vacuum and Analyze (PostgreSQL)
```sql
-- Reclaim space and update statistics
VACUUM ANALYZE users;

-- Full vacuum (requires downtime)
VACUUM FULL users;
```

---

## Troubleshooting

### Check Database Connection
```bash
# PostgreSQL
docker exec cecbs-postgres psql -U cecbs -d cecbs -c "SELECT 1;"

# From API
curl http://localhost:3001/health
```

### Check Table Exists
```sql
-- PostgreSQL
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

-- SQLite (via API)
SELECT name FROM sqlite_master WHERE type='table';
```

### Check Column Exists
```sql
-- PostgreSQL
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users';
```

### Reset Database (Development Only!)
```bash
# Stop system
bash stop-all.sh

# Remove volumes
docker-compose -f docker-compose-fabric.yml down -v

# Restart system (will recreate database)
bash start-all.sh
```

---

## Schema Consistency Checklist

When modifying schema, update ALL of these:

- [ ] `scripts/init-db.sql` - PostgreSQL initial schema
- [ ] `api/src/services/databaseService.ts` - SQLite schema (if applicable)
- [ ] TypeScript interfaces in relevant service files
- [ ] API route validation schemas
- [ ] Frontend form models
- [ ] This documentation file
- [ ] Migration scripts (if needed)

---

## Foreign Key Relationships

```
users (1) ----< (*) exporter_applications (reviewer)
users (1) ----< (*) audit_log (user_id)
users (1) ----< (*) coffee_lots (via exporter_id)
users (1) ----< (*) export_contracts (via exporter_id)
```

---

## Performance Recommendations

### Essential Indexes
```sql
-- User lookups
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organization ON users(organization);
CREATE INDEX idx_users_status ON users(status);

-- Audit queries
CREATE INDEX idx_audit_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_created_at ON audit_log(created_at);

-- Business operations
CREATE INDEX idx_lots_exporter ON coffee_lots(exporter_id);
CREATE INDEX idx_contracts_exporter ON export_contracts(exporter_id);
```

### Query Optimization
- Use `EXPLAIN ANALYZE` for slow queries
- Keep permissions JSON small (< 1KB)
- Archive old audit_log entries periodically
- Use connection pooling (already configured)

---

## Version History

- v1.0 - 2026-08-03 - Initial schema documentation
- v1.1 - 2026-08-03 - Added banking columns to users table

---

For questions or schema change requests, contact: devops@cecbs.et
