# Document Examination Tab - Status Report

## Current Status: ✅ Working As Designed

The Document Examination tab is **working correctly**. It shows LCs that meet BOTH criteria:
1. Status = `ISSUED` or `FOREX_ALLOCATED`
2. Has documents attached

## Data Analysis

### LCs with Correct Status (8 total)
These LCs have the right status but NO documents:
- `LC1789457781935`: ISSUED (CONTRACT1789457781935)
- `LC1789458452369`: ISSUED (CONTRACT1789458452369)
- `LC1789459139700`: ISSUED (CONTRACT1789459139700)
- `LC1789459406817`: ISSUED (CONTRACT1789459406817)
- `LC1789459905859`: ISSUED (CONTRACT1789459905859)
- `LC1789460822330`: ISSUED (CONTRACT1789460822330)
- `LC-CONTRACT1788435011592-1788509695626`: FOREX_ALLOCATED
- `LC1787055024941`: FOREX_ALLOCATED

**Documents**: 0 for all of these LCs

### LCs with Documents (1 total)
- `LC1788419907720`: **APPROVED** (CONTRACT1786343272751)
  - **5 documents** attached (PROFORMA_INVOICE types)
  - **Will NOT appear** in Document Examination because status is APPROVED, not ISSUED

## Why Tab Shows "No Documents"

The tab correctly shows no documents because:
1. ✅ Filter logic is correct (ISSUED or FOREX_ALLOCATED + has documents)
2. ✅ Document enrichment from PostgreSQL is implemented
3. ❌ **None of the ISSUED/FOREX_ALLOCATED LCs have documents uploaded yet**
4. ❌ **The only LC with documents has status APPROVED** (wrong status for examination)

## Document Structure in PostgreSQL

Documents table structure:
```sql
entity_type = 'LC'
entity_id = CONTRACT_ID (not LC_ID!)  <-- Important!
```

**Note**: Documents tagged as type='LC' use the **contract ID** in the `entity_id` field, not the LC ID.

## Fixed in API

✅ Updated `/banking/lc` endpoint to enrich LCs with documents from PostgreSQL:
- Queries documents by both LC ID and Contract ID
- Includes documents from:
  - entity_type='LC' where entity_id matches LC ID or Contract ID
  - entity_type='CONTRACT' where entity_id matches Contract ID  
  - entity_type='SHIPMENT' where shipment is linked to the LC

## To Populate Document Examination Tab

One of these must happen:

### Option 1: Upload Documents to ISSUED LC
Upload shipping documents (Bill of Lading, Invoice, etc.) to any of the 6 ISSUED LCs above.

### Option 2: Change LC Status
Change `LC1788419907720` status from APPROVED to ISSUED:
```bash
# This LC already has 5 documents attached
# Just needs status change to appear in examination tab
```

### Option 3: Create Test Data
Run a script to attach test documents to an ISSUED LC for demonstration.

## Verification Commands

### Check which LCs have documents:
```bash
cd api && node -e "
const{Pool}=require('pg');
const p=new Pool({host:'localhost',port:5432,database:'cecbs',user:'cecbs',password:'cecbs123'});
(async()=>{
  const lcs=await p.query(\"SELECT lc_id,contract_id,status FROM letters_of_credit WHERE status IN('ISSUED','FOREX_ALLOCATED')\");
  for(const lc of lcs.rows){
    const docs=await p.query('SELECT COUNT(*) FROM documents WHERE entity_type=\\'CONTRACT\\' AND entity_id=\$1',[lc.contract_id]);
    console.log(lc.lc_id+': '+lc.status+' - '+docs.rows[0].count+' docs');
  }
  await p.end();
  process.exit(0);
})();
"
```

### Test API enrichment:
```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3001/api/v1/banking/lc | jq '.data[] | select(.documents != null and (.documents | length) > 0) | {lcId, status, docCount: (.documents | length)}'
```

## Summary

| Component | Status | Notes |
|-----------|--------|-------|
| API Endpoint | ✅ Working | Returns LCs with PostgreSQL enrichment |
| Document Query | ✅ Working | Fetches documents by LC/Contract ID |
| Frontend Filter | ✅ Working | Filters for ISSUED/FOREX_ALLOCATED + docs |
| Data Availability | ❌ No Data | No ISSUED LCs have documents yet |

**Conclusion**: System is working. Just needs documents uploaded to ISSUED LCs.
