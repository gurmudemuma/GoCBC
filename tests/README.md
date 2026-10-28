# GoCBC Automated Workflow Tests

Comprehensive automated test suite for all 7 portals, testing all tabs, subtabs, and status transitions.

## Overview

- **7 Portals** fully tested
- **61 Main Tabs** covered
- **33 Subtabs/Stages** validated
- **94 Total Navigational Elements** tested
- **60+ Status Transitions** verified

## Test Coverage

### Portal Tests

1. **Exporter Portal** (`01-exporter-workflow.test.ts`)
   - 8 tabs tested
   - Contract, Forex, LC, Shipment, Customs workflows
   - Status: DRAFT → REGISTERED → APPROVED → ACTIVE

2. **ECTA Portal** (`02-ecta-workflow.test.ts`)
   - 10 tabs + 5-stage quality control
   - Application approval, Contract review, Quality inspection
   - 5 Stages: PENDING → SCHEDULED → UNDER_REVIEW → APPROVED → REJECTED

3. **Banks Portal** (`03-banks-workflow.test.ts`)
   - Hierarchical: 4 parents → 9 children
   - 4 Payment methods: LC, CAD, ADVANCE, CONSIGNMENT
   - LC workflow: REQUESTED → ISSUED → SETTLED

4. **NBE Portal** (`04-nbe-workflow.test.ts`)
   - 8 tabs + 9 subtabs
   - Forex Monitoring (3 views)
   - SWIFT Monitoring (3 tabs)
   - Analytics (3 sections)

5. **Customs Portal** (`05-all-portals.test.ts`)
   - 8 status-based tabs
   - Workflow: SUBMITTED → INSPECTING → CLEARED

6. **Shipping Portal** (`05-all-portals.test.ts`)
   - 10 lifecycle stages
   - Progress: CUSTOMS_CLEARED [10%] → DELIVERED [100%]

7. **ECX Portal** (`05-all-portals.test.ts`)
   - 4 tabs + 4-stage lot lifecycle
   - Coffee: WAREHOUSED → GRADED → ASSIGNED → RELEASED

## Installation

```bash
cd /home/guda/GoCBC/tests
npm install
```

## Usage

### Run All Tests
```bash
npm test
# or
npm run test:all
```

### Run Individual Portal Tests
```bash
npm run test:exporter    # Exporter Portal only
npm run test:ecta        # ECTA Portal only
npm run test:banks       # Banks Portal only
npm run test:nbe         # NBE Portal only
npm run test:customs     # Customs, Shipping, ECX
```

### Direct Execution
```bash
ts-node run-all-workflows.ts
ts-node workflows/01-exporter-workflow.test.ts
```

### Custom API URL
```bash
API_URL=http://your-api:4000 npm test
```

## Test Structure

```
tests/
├── helpers/
│   ├── api-client.ts          # API client classes for each portal
│   └── test-helpers.ts        # Test utilities & validators
├── workflows/
│   ├── 01-exporter-workflow.test.ts
│   ├── 02-ecta-workflow.test.ts
│   ├── 03-banks-workflow.test.ts
│   ├── 04-nbe-workflow.test.ts
│   └── 05-all-portals.test.ts
├── run-all-workflows.ts       # Master test runner
├── package.json
└── README.md (this file)
```

## What Gets Tested

### ✅ Tab Navigation
- All 61 main tabs
- All hierarchical structures (Banks)
- All subtab systems (ECTA, Banks, NBE)

### ✅ Status Transitions
- Contract lifecycle (7 statuses)
- Forex allocation (4 statuses)
- LC processing (8 statuses)
- Shipment logistics (10 statuses)
- Customs clearance (6 statuses)
- Quality inspection (5 statuses)
- ECX lot processing (4 statuses)

### ✅ Blockchain Integration
- Transaction recording
- Proof verification
- MSP endorsements
- Blockchain badges

### ✅ Role-Based Access
- ADMIN access
- Portal-specific roles
- Tab visibility rules
- Action permissions

## Expected Output

```
================================================================================
🧪 Starting Test: Exporter Portal Workflow
⏰ Time: 2026-10-23T10:30:00.000Z
================================================================================

📍 Step 1: Authentication
  ✅ Logged in as exporter

📍 Step 2: Tab 1 - Create Sales Contract
  ✅ Contract created: CONTRACT-1729680600000-123
  📊 Status: "DRAFT"
  ✅ Contract status is DRAFT ✓

...

================================================================================
📊 Test Summary: Exporter Portal Workflow
================================================================================
  ✅ Passed: 25/25
  ❌ Failed: 0/25
  ⏱️  Duration: 5432ms
  📈 Success Rate: 100.00%
================================================================================

🎉 Exporter Portal Workflow: ALL TESTS PASSED!
```

## Test Configuration

### Test Users Required

The tests expect these user accounts:

```javascript
{
  exporter_test: 'Test@123',      // Exporter Portal
  ecta_officer: 'Test@123',        // ECTA Portal
  bank_officer: 'Test@123',        // Banks Portal
  nbe_officer: 'Test@123',         // NBE Portal
  customs_officer: 'Test@123',     // Customs Portal
  shipping_agent: 'Test@123',      // Shipping Portal
  ecx_officer: 'Test@123',         // ECX Portal
}
```

### API Endpoints Expected

Base URL: `http://localhost:3001/api/v1` (configurable)

- `/auth/login` - Authentication
- `/contracts` - Contract management
- `/forex` - Forex operations
- `/banking/lc` - LC operations
- `/shipments` - Shipment tracking
- `/customs/declarations` - Customs
- `/ecta/*` - ECTA operations
- `/nbe/*` - NBE operations
- `/ecx/*` - ECX operations

## Troubleshooting

### Tests Failing with 401 Unauthorized
- Check test user credentials
- Verify authentication endpoint
- Ensure tokens are being stored correctly

### Tests Failing with 404 Not Found
- Verify API is running on correct port
- Check endpoint paths match API routes
- Ensure API base URL is correct

### Connection Refused
```bash
# Check if API is running
curl http://localhost:3001/health

# Check if Docker containers are up
docker ps | grep coffee
```

### TypeScript Errors
```bash
# Reinstall dependencies
npm install

# Check TypeScript version
npx tsc --version
```

## Status Validators

The test suite includes status transition validators:

```typescript
ContractStatusValidator.validate('DRAFT', 'REGISTERED')     // ✓ Valid
ForexStatusValidator.validate('REQUESTED', 'ALLOCATED')     // ✓ Valid
LCStatusValidator.validate('ISSUED', 'DRAFT')               // ✗ Invalid
```

## Extending Tests

### Add New Test Case

```typescript
logger.step('Step X: Your Test Name');

try {
  const result = await api.yourMethod(data);
  logger.success('Test passed');
  logger.data('Result', result);
} catch (error) {
  logger.fail('Test failed', error);
}
```

### Add New Status Validator

```typescript
export const YourStatusValidator = new StatusValidator({
  'STATE_A': ['STATE_B', 'STATE_C'],
  'STATE_B': ['STATE_D'],
  'STATE_C': ['STATE_D'],
});
```

## Integration with CI/CD

```yaml
# .github/workflows/test.yml
name: Workflow Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Start Services
        run: docker-compose up -d
      - name: Run Tests
        run: |
          cd tests
          npm install
          npm test
```

## Performance Benchmarks

Expected test execution times:

- Exporter Portal: ~5-10s
- ECTA Portal: ~8-15s
- Banks Portal: ~10-20s
- NBE Portal: ~8-15s
- Customs Portal: ~5-8s
- Shipping Portal: ~6-10s
- ECX Portal: ~5-8s

**Total Suite: ~50-90s** (depending on API response times)

## Test Report Generation

Tests output to console. To save reports:

```bash
npm test > test-results.txt 2>&1
```

## Support

For issues or questions:
1. Check API logs: `docker logs coffee-api`
2. Review test output for specific errors
3. Verify all services are running
4. Check blockchain connectivity

## License

Part of the GoCBC Ethiopian Coffee Export Blockchain System

---

**Last Updated:** October 23, 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅
