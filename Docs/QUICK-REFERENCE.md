# Quick Reference: Exporter Registration v1.3

## Summary
✅ **Status**: Complete alignment achieved - chaincode, backend, and frontend all support 2026 compliance fields  
⏳ **Pending**: Chaincode v1.3 deployment to blockchain network  
📅 **Date**: 2026-06-02

---

## What Changed

### New Fields (2026 Compliance):
1. **Exporter Type**: private | company | individual
2. **Laboratory Certificate Number**: ECTA lab certification

### Updated Components:
- ✅ Chaincode: 7 → 9 parameters
- ✅ Backend API: 7 → 9 parameters  
- ✅ Frontend: Already had fields
- ✅ Database: Already had columns

---

## Parameter List (9 Total)

| # | Parameter | Type | Example | Required |
|---|-----------|------|---------|----------|
| 1 | exporterId | string | "EXP0001234" | Yes |
| 2 | companyName | string | "Ethiopian Premium Coffee" | Yes |
| 3 | ectaLicenseNumber | string | "ECTA-LIC-2026-001" | Yes |
| 4 | **exporterType** | string | "private" | **NEW** |
| 5 | capitalRequirement | string | "15000000" | Yes |
| 6 | professionalTaster | string | "Alemayehu Tadesse" | Yes |
| 7 | tasterCertificate | string | "ECTA-TASTER-2026-0023" | Yes |
| 8 | **laboratoryCertificateNumber** | string | "ECTA-LAB-2025-0156" | **NEW** |
| 9 | licenseExpiryDate | string | "2027-06-02" | Yes |

---

## Quick Commands

### Deploy Chaincode v1.3:
```bash
# 1. Package
peer lifecycle chaincode package coffee-1.3.tar.gz \
  --path ./chaincodes/coffee --lang golang --label coffee_1.3

# 2. Install (on each peer)
peer lifecycle chaincode install coffee-1.3.tar.gz

# 3. Get Package ID
peer lifecycle chaincode queryinstalled

# 4. Approve (each org, replace <PACKAGE_ID>)
peer lifecycle chaincode approveformyorg \
  --channelID coffeechannel --name coffee --version 1.3 \
  --package-id <PACKAGE_ID> --sequence 3 --tls \
  --cafile ${PWD}/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/ca.crt

# 5. Commit (after majority approval)
peer lifecycle chaincode commit \
  --channelID coffeechannel --name coffee --version 1.3 --sequence 3 \
  --tls --cafile ${PWD}/blockchain/organizations/ordererOrganizations/cecbs.et/orderers/orderer.cecbs.et/tls/ca.crt \
  [... peer addresses ...]

# 6. Verify
peer lifecycle chaincode querycommitted --channelID coffeechannel --name coffee
```

### Test New Function:
```bash
# Register exporter with 9 parameters
peer chaincode invoke -C coffeechannel -n coffee \
  -c '{"Args":["RegisterExporter","TEST001","Test Coffee","ECTA-LIC-2026-TEST","private","15000000","John Doe","ECTA-TASTER-001","ECTA-LAB-001","2027-12-31"]}'

# Query exporter
peer chaincode query -C coffeechannel -n coffee \
  -c '{"Args":["ReadExporter","TEST001"]}'
```

### Restart API:
```bash
cd api
# Stop current process (Ctrl+C)
npm run dev
```

---

## Exporter Types & Capital Requirements

| Type | Description | Minimum Capital | Use Case |
|------|-------------|-----------------|----------|
| `private` | Private Exporter | 15,000,000 ETB | Single owner businesses |
| `company` | Trade Association/Company | 20,000,000 ETB | Joint stock, limited liability |
| `individual` | Individual with Certificate | 10,000,000 ETB | Competency-certified individuals |

---

## Data Flow

```
User submits form → Database (pending) → ECTA approves → 
Backend calls fabricService → Chaincode RegisterExporter (9 params) → 
Blockchain record with 2026 fields
```

---

## Documentation Files

| File | Purpose |
|------|---------|
| `EXPORTER-REGISTRATION-ALIGNMENT-2026.md` | Complete technical documentation |
| `ALIGNMENT-COMPLETE.md` | Summary with diagrams |
| `DEPLOY-V1.3-GUIDE.md` | Step-by-step deployment |
| `TASK-COMPLETE-SUMMARY.md` | Task completion report |
| `QUICK-REFERENCE.md` | This file |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "incorrect number of arguments" | Chaincode v1.3 not deployed yet |
| "function not found" | Restart API server after chaincode deployment |
| "endorsement policy failure" | Include all required peer addresses in commit |
| Exporter type shows "Not Specified" | Old exporter (before 2026) - expected behavior |

---

## Next Steps

1. ✅ Code complete - all layers aligned
2. ⏳ Deploy chaincode v1.3 (30-45 min)
3. ⏳ Restart API server
4. ⏳ Test approval workflow
5. ⏳ Test license suspension
6. ⏳ Go live with 2026-compliant registration

---

**Quick Status**: ✅ Ready for deployment  
**Risk Level**: Low (backward compatible)  
**Estimated Deployment Time**: 30-45 minutes
