# Coffee Export Workflow - Quick Reference Card

## Test Command
```bash
cd /home/guda/GoCBC && bash tests/complete-workflow-test.sh
```

## Workflow Sequence (9 Steps)

```
1. Application → 2. Approval → 3. Contract → 4. Contract Approval →
5. Shipment Record → 6. Quality Inspection → 7. LC Issuance →
8. Forex (Auto) → 9. Customs Declaration
```

## API Endpoints Quick Reference

| Step | Endpoint | Method | Role | Key Fields |
|------|----------|--------|------|------------|
| 1 | `/exporters/exporter-applications` | POST | PUBLIC | capitalRequirement: 20000000 |
| 2 | `/exporters/exporter-applications/:id/approve` | POST | ECTA | exporterId, ectaLicenseNumber |
| 3 | `/contracts` | POST | ADMIN | **PascalCase**: contractID, exporterID, buyerID |
| 4 | `/contracts/:id/approve` | POST | ECTA | approvedBy, comments |
| 5 | `/shipments` | POST | SHIPPING | **PascalCase**: shipmentID, grade, icoNumber |
| 6 | `/quality/inspections` | POST | QUALITY | **PascalCase**: inspectionID, shipmentID |
| 7 | `/banking/lc/issue` | POST | BANK | lcID, amount, contractID |
| 8 | (auto) | - | - | Auto-created by LC |
| 9 | `/customs/declaration/submit` | POST | CUSTOMS | **PascalCase**: declarationID, shipmentID |

## Critical Requirements

### Capital Requirement
- **Company**: 20,000,000 ETB minimum ⚠️
- **Private/Individual**: Lower (not tested)

### Field Name Conventions
- **PascalCase**: contractID, exporterID, shipmentID, declarationID (contracts, shipments, quality, customs)
- **camelCase**: companyName, tinNumber (applications)

### Authorization Roles
| Action | Required Role |
|--------|---------------|
| Application Approval | ECTA |
| Contract Creation | ADMIN/SUPER_ADMIN |
| Contract Approval | ECTA ⚠️ Required! |
| LC Issuance | BANK_ADMIN |
| Customs Declaration | CUSTOMS |

### Workflow Dependencies
1. **Shipment before Quality**: Quality needs `shipmentID`
2. **Contract Approval before Forex**: Contract must be APPROVED
3. **LC Auto-Creates Forex**: No manual forex request needed

## Expected Results

### Success Indicators
- ✅ All 12 actions pass
- ✅ 0 failures
- ✅ 0 warnings
- ✅ 9 records created
- ✅ NBE LC count increases

### Sample IDs Created
```
Application: APP-1794133860686-EVH8MR
Exporter: EXP-20261108133100
Contract: CONT-20261108133112
Shipment: SHIP-20261108133132
Quality: QI-20261108133133
LC: LC-20261108133133
Customs: DECL-20261108133137
```

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Capital too low | < 20M ETB | Set to 20000000 |
| Field not found | Wrong case | Use PascalCase for contracts/shipments |
| Unauthorized | Wrong role | Check role requirements table |
| Contract not APPROVED | Missing approval | Add contract approval step |
| Forex fails | Contract not approved | Approve contract first |
| Quality needs shipmentID | Wrong order | Create shipment before quality |
| LC endpoint 404 | Wrong path | Use `/banking/lc/issue` |

## Test Duration
- **Runtime**: ~40-50 seconds
- **Includes**: Blockchain propagation waits (8 seconds total)

## Documentation
- **Full Guide**: `/home/guda/GoCBC/COMPLETE-WORKFLOW-TEST-SUCCESS.md`
- **API Reference**: `/home/guda/GoCBC/WORKFLOW-API-REFERENCE.md`
- **Fixes Applied**: `/home/guda/GoCBC/WORKFLOW-TEST-FIXES-NEEDED.md`

## Status
✅ **100% PASSING** - Production Ready
