# CECBS Test Files

Test scripts and validation utilities for the Coffee Export Blockchain System.

## Test Files

- `test-complete-workflow.js` - End-to-end workflow testing
- `test-blockchain-connection.sh` - Blockchain connectivity test
- `test-all-portals.sh` - All portal functionality tests
- `test-customs-data.js` - Customs data validation
- `test-document-display.js` - Document upload/display tests
- `test-document-flow.sh` - Document flow testing
- `test-payment-methods.js` - Payment method tests
- `validate-full-integration.js` - Full integration validation
- `verify-all-actions.js` - All actions verification
- `verify-portal-actions.js` - Portal actions verification
- `verify-swift-build.sh` - SWIFT build verification
- `quick-verify.js` - Quick system verification
- `final-actions-verification.js` - Final actions audit
- `detailed-action-audit.js` - Detailed action audit

## Usage

Most tests require the system to be running. Start services first:

```bash
# Start blockchain
cd blockchain && docker-compose up -d

# Start API
cd api && npm start

# Start UI
cd ui && npm start

# Run tests
node tests/test-complete-workflow.js
```

---

For deployment testing, see `docs/deployment/` folder.
