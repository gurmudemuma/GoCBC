# UI Portal Validation Tests

This directory contains comprehensive tests for all portal tabs and subtabs in the GoCBC system.

## Test Files

### 1. PORTAL-TAB-DATA-VALIDATION.sh
Validates that all 61 main tabs + 18 subtabs are correctly fetching data from the API.

**Coverage:**
- 7 Portals (Exporter, ECTA, Banks, NBE, Customs, Shipping, ECX)
- 61 Main tabs
- 18 Subtabs/filters
- 79 Total data endpoints

### 2. RUN-PORTAL-VALIDATION.sh
Helper script that:
- Checks if system is running
- Starts system if needed
- Runs the complete validation test

## Quick Start

```bash
# Option 1: Auto-start system if needed
./RUN-PORTAL-VALIDATION.sh

# Option 2: Run validation (system already running)
./PORTAL-TAB-DATA-VALIDATION.sh
```

## Test Coverage by Portal

| Portal | Main Tabs | Subtabs | Total Endpoints |
|--------|-----------|---------|-----------------|
| Exporter | 8 | 0 | 8 |
| ECTA | 10 | 5 | 15 |
| Banks | 13 (4+9) | 4 | 17 |
| NBE | 8 | 9 | 17 |
| Customs | 8 | 0 | 8 |
| Shipping | 10 | 0 | 10 |
| ECX | 4 | 0 | 4 |
| **Total** | **61** | **18** | **79** |

## Success Criteria

- ✅ Pass Rate: ≥ 95%
- ✅ Failed Tests: 0
- ✅ HTTP Status: 200 or 201
- ✅ Response: Valid JSON with data

## Prerequisites

1. System must be running:
   ```bash
   cd /home/guda/GoCBC
   ./start-all.sh
   ```

2. Wait for services to be ready (~60 seconds)

3. Optionally, run E2E test first to populate data:
   ```bash
   cd /home/guda/GoCBC/test/e2e
   ./COMPLETE-E2E-TEST-ALL-WORKFLOWS.sh
   ```

## Documentation

For detailed information, see:
- [Docs/PORTAL-TAB-VALIDATION-GUIDE.md](../../Docs/PORTAL-TAB-VALIDATION-GUIDE.md)
- [Docs/COMPLETE-PORTAL-TABS-LIST.md](../../Docs/COMPLETE-PORTAL-TABS-LIST.md)

## Troubleshooting

### API Not Running
```bash
cd /home/guda/GoCBC
./start-all.sh
```

### Authentication Failed
Check user credentials:
```bash
docker exec -it postgres psql -U postgres -d gocbc_db \
  -c "SELECT email, role FROM users WHERE role IN ('ECTA', 'BANKS', 'NBE');"
```

### No Data Warnings
Run E2E test to populate data:
```bash
cd /home/guda/GoCBC/test/e2e
./COMPLETE-E2E-TEST-ALL-WORKFLOWS.sh
```

## Test Output

### Success
```
✓ Dashboard stats (5 records)
✓ Contracts list (12 records)
```

### Warning (Acceptable)
```
⚠ Analytics - No data field found
```

### Failure (Needs Fix)
```
✗ Coffee lots (HTTP 404)
```

---

*For complete documentation, see [PORTAL-TAB-VALIDATION-GUIDE.md](../../Docs/PORTAL-TAB-VALIDATION-GUIDE.md)*
