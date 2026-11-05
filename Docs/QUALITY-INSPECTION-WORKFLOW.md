# Quality Inspection Workflow - Complete Guide

## Overview
The Quality Control tab manages the 4-stage coffee quality inspection workflow required before export.

---

## 📊 Inspection Stages & Status Flow

```
PENDING → INSPECTED → APPROVED → PERMIT_ISSUED
                   ↓
                REJECTED
```

---

## 🔘 Stage 1: Request Inspection (Status: PENDING)

**Who**: Exporter or ECTA creates inspection request  
**Button**: "Schedule" (for shipments awaiting inspection)  
**What Happens**:
1. Creates inspection record in database
2. Records on blockchain: `RequestInspection` chaincode
3. Status: `pending`
4. Shipment is now in inspection queue

---

## 🔬 Stage 2: Perform Inspection (Status: PENDING → INSPECTED)

**Who**: ECTA Quality Inspector / Lab Analyst  
**Button**: "Inspect" (blue button)  
**What Should Happen**:

### API Call:
```
POST /api/v1/quality/inspections/{inspectionID}/perform
```

### Request Body (sent by frontend):
```json
{
  "inspectorID": "ECTA-01",
  "inspectorName": "ECTA Quality Lab",
  "sampleSize": 100,
  "moistureContent": 11.2,
  "defectCount": 3,
  "beanSize": "17",
  "color": "Green",
  "odor": "Clean",
  "fragrance": 8,
  "flavor": 8,
  "aftertaste": 8,
  "acidity": 8,
  "body": 8,
  "balance": 8,
  "uniformity": 10,
  "cleanCup": 10,
  "sweetness": 10,
  "overall": 87,
  "classification": "WASHED",
  "pesticideTest": "PASSED",
  "heavyMetalTest": "PASSED",
  "mycotoxinTest": "PASSED",
  "remarks": "Quality inspection completed - meets export standards"
}
```

### Backend Processing:
1. **Validate Status**: Must be `pending` or `requested`
2. **Calculate Grade**: Based on overall score
   - ≥85 = Grade 1
   - ≥80 = Grade 2
   - ≥75 = Grade 3
   - <75 = Below Grade
3. **Store Cup Quality**: JSON object with all scores
4. **Build Comprehensive Remarks**: Full inspection report
5. **Record on Blockchain**: Call `PerformInspection` chaincode
6. **Update Database**:
   ```sql
   UPDATE quality_inspections SET
     status = 'inspected',
     inspection_date = NOW(),
     inspector_name = 'ECTA Quality Lab',
     sample_size = 100,
     moisture_content = 11.2,
     defect_count = 3,
     screen_size = 17,
     grade = 'Grade 1',
     cup_quality = '{"fragrance":8,"flavor":8,...}',
     remarks = '...',
     blockchain_tx_id = 'TX123...',
     updated_at = NOW()
   WHERE inspection_id = 'QI-TEST-xxx'
   ```

### UI Response:
- ✅ Success notification: "Inspection Completed"
- ✅ Reload data
- ✅ Status changes: PENDING → INSPECTED
- ✅ Buttons change: "Inspect" → "Approve" / "Reject"

---

## ✅ Stage 3: Approve Inspection (Status: INSPECTED → APPROVED)

**Who**: ECTA Quality Director  
**Button**: "Approve" (green button)  
**What Should Happen**:

### API Call:
```
POST /api/v1/quality/inspections/{inspectionID}/approve
```

### Backend Processing:
1. **Validate Status**: Must be `inspected`
2. **Generate Certificate Number**: e.g., `CERT1730000000`
3. **Record on Blockchain**: Call `ApproveInspection` chaincode
4. **Update Database**:
   ```sql
   UPDATE quality_inspections SET
     status = 'approved',
     passed = true,
     certification_number = 'CERT1730000000',
     blockchain_tx_id = 'TX124...',
     updated_at = NOW()
   ```
5. **Sign Documents**: Add cryptographic signature to inspection documents
6. **Auto-Trigger Customs**: Create customs declaration (optional)

### UI Response:
- ✅ Success: "Inspection Approved - Certificate CERT1730000000 issued"
- ✅ Status: INSPECTED → APPROVED
- ✅ Button: "Issue Permit" (green)

---

## 🎫 Stage 4: Issue Export Permit (Status: APPROVED → PERMIT_ISSUED)

**Who**: ECTA Export Permit Office  
**Button**: "Issue Permit" (green button)  
**What Should Happen**:

### API Call:
```
POST /api/v1/quality/inspections/{inspectionID}/issue-permit
```

### Backend Processing:
1. **Validate Status**: Must be `approved`
2. **Generate Permit Number**: e.g., `PERMIT1730000000`
3. **Record on Blockchain**: Call `IssueExportPermit` chaincode
4. **Update Shipment Status**: QUALITY_APPROVED
5. **Auto-Create Customs Declaration**: Trigger customs workflow
6. **Update Database**:
   ```sql
   UPDATE quality_inspections SET
     status = 'permit_issued',
     export_permit_number = 'PERMIT1730000000',
     permit_issued_date = NOW()
   ```

### UI Response:
- ✅ Success: "Export Permit PERMIT1730000000 issued"
- ✅ Status: APPROVED → PERMIT_ISSUED
- ✅ Display: "Permit Issued" chip (green)
- ✅ Ready for customs clearance

---

## ❌ Alternative: Reject Inspection (Status: INSPECTED → REJECTED)

**Who**: ECTA Quality Director  
**Button**: "Reject" (red button)  
**What Should Happen**:

### API Call:
```
POST /api/v1/quality/inspections/{inspectionID}/reject
```

### Request Body:
```json
{
  "rejectedBy": "ECTA Quality Director",
  "reason": "Does not meet minimum quality standards - high defect count"
}
```

### Backend Processing:
1. **Record on Blockchain**: Call `RejectInspection` chaincode
2. **Update Database**:
   ```sql
   UPDATE quality_inspections SET
     status = 'rejected',
     passed = false,
     remarks = 'REJECTED: Does not meet minimum quality standards',
     updated_at = NOW()
   ```

### UI Response:
- ⚠️ Error: "Inspection Rejected"
- ✅ Status: INSPECTED → REJECTED
- ℹ️ Exporter must address issues and request new inspection

---

## 🐛 Current Issue in Your System

**Symptom**: Page reloading 4 times with increasing delays (54+ seconds)

**Possible Causes**:
1. **Blockchain timeout**: Chaincode call taking too long
2. **Database constraint**: Missing/wrong column causing retry
3. **Frontend loop**: Success handler causing infinite reload
4. **Network issue**: API not responding properly

**Next Diagnostic Step**:
Check database to see if inspection was actually updated:
```sql
SELECT inspection_id, status, inspector_name, grade, inspection_date 
FROM quality_inspections 
WHERE inspection_id = 'QI-TEST-1793365775';
```

---

## 📝 Summary

**Expected Flow**:
1. Click "Inspect" → API performs inspection → Database updated → Blockchain recorded → UI shows success
2. Takes: 2-5 seconds
3. No page reload (just data refresh)
4. Status changes, buttons change

**Your Current Flow**:
1. Click "Inspect" → ??? → Page reloads 4 times → Takes 54+ seconds

**We need to check**: Did the inspection actually complete in the database?
