# GoCBC Test Suite

## Test Categories

### E2E Tests (`e2e/`)
Complete end-to-end workflow tests covering all 7 portals.

**Main Test:**
- `COMPLETE-E2E-TEST-ALL-WORKFLOWS.sh` - Comprehensive E2E test (12 stages)
- `COMPONENT-HEALTH-CHECK-V2.sh` - System health validation

**Results:** 100% success (12/12 stages passed)

### Integration Tests (`integration/`)
Multi-component integration tests.

**Main Tests:**
- `test-all-portals-comprehensive.sh` - All portal functionality
- `test-complete-workflow.sh` - Complete workflow validation
- `continue-workflow-test.sh` - Workflow continuation

### Unit Tests (`unit/`)
Individual component tests (run via npm/jest).

### Test Scripts (`scripts/`)
Various utility test scripts for specific components.

## Running Tests

```bash
# Full E2E test
cd e2e
./COMPLETE-E2E-TEST-ALL-WORKFLOWS.sh

# System health check
cd e2e
./COMPONENT-HEALTH-CHECK-V2.sh

# Portal tests
cd integration
./test-all-portals-comprehensive.sh
```

## Test Results

See `../logs/test-results/` for test execution logs.
