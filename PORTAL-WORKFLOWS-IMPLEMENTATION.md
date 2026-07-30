# Portal Workflows Implementation Summary

## ✅ COMPLETED

### 1. Customs Portal (6 Stages) - DONE
- Permit Ready → Submit Declaration → Schedule Inspection → Complete Inspection → Clear/Reject → Cleared/Rejected
- All handlers implemented
- Auto-trigger to Shipping Portal after clearance

### 2. Shipping Portal (8 Stages) - DONE  
- Ready → Land Transport → Port Arrived → Container Stuffed → Vessel Loaded → Departed → In Transit → Destination Arrived → Delivered
- All handlers implemented
- Blockchain functions deployed (v1.56, Seq 29)

### 3. ECTA Portal - PARTIALLY DONE
#### ✅ Implemented:
- **Exporter Registration Workflow** (existing)
- **Quality Inspection Workflow** (5 stages - just implemented):
  1. Pending Inspection → Schedule
  2. Scheduled → Perform Inspection
  3. Under Review → Approve/Reject  
  4. Approved → Issue Export Permit
  5. Rejected → Final state

#### ❌ Still Needed:
- **Contract Approval Workflow** (needs dedicated tab):
  - REGISTERED → Approve/Reject → APPROVED/REJECTED

## 🚧 NEEDS IMPLEMENTATION

### 4. Banks Portal (7-Stage LC/Payment Workflow)

**Backend API Analysis:**
- `POST /api/v1/banking/lc/request` - Request LC
- `POST /api/v1/banking/lc/:id/approve` - Approve LC
- `POST /api/v1/banking/lc/:id/issue` - Issue LC
- `POST /api/v1/banking/payment/:id/submit-documents` - Submit documents
- `POST /api/v1/banking/payment/:id/verify-documents` - Verify documents
- `POST /api/v1/banking/payment/initiate` - Initiate payment
- `POST /api/v1/banking/payment/:id/confirm` - Confirm payment

**Workflow Stages:**
1. **LC Requested** (REQUESTED) → Button: Approve LC
2. **LC Approved** (APPROVED) → Button: Issue LC  
3. **LC Issued** (ISSUED) → Button: Auto-Request Forex
4. **Documents Submitted** (DOCUMENTS_SUBMITTED) → Button: Verify Documents
5. **Documents Verified** (DOCUMENTS_VERIFIED) → Button: Initiate Payment
6. **Payment Initiated** (PAYMENT_INITIATED) → Button: Confirm Payment
7. **Payment Complete** (PAYMENT_COMPLETE) → Final state

**Handler Functions Needed:**
```typescript
handleApproveLCWorkflow(lc) // Stage 1→2
handleIssueLCWorkflow(lc) // Stage 2→3
handleSubmitDocuments(lc) // Stage 3→4
handleVerifyDocuments(payment) // Stage 4→5
handleInitiatePayment(payment) // Stage 5→6
handleConfirmPayment(payment) // Stage 6→7
```

### 5. NBE Portal (5-Stage Forex Monitoring + Contract Approval)

**Backend API Analysis:**
- `POST /api/v1/forex/request` - Request forex (auto-created by banks)
- `POST /api/v1/forex/allocate` - Allocate forex (done by banks per NBE policy)
- `POST /api/v1/forex/utilize` - Utilize forex
- `GET /api/v1/forex/rates` - Exchange rates
- `POST /api/v1/forex/rates` - Set exchange rate
- `POST /api/v1/contracts/:id/approve` - Approve contract for forex

**Workflow 1: Contract Approval (NBE validates before forex)**
1. **Pending Approval** (REGISTERED) → Button: Approve Contract
2. **Approved** (APPROVED) → Final state (enables forex)

**Workflow 2: Forex Monitoring (Read-only - Banks allocate)**
1. **Forex Requested** (REQUESTED) → Allocated by Banks
2. **Forex Allocated** (ALLOCATED) → Utilized by system
3. **Forex Utilized** (UTILIZED) → Final state
4. **Retention Applied** (automatic 50% retention)
5. **Retention Released** (after export confirmed)

**Handler Functions Needed:**
```typescript
handleApproveContractForForex(contract) // NBE approves contract
handleSetExchangeRate(currency, buyingRate, sellingRate) // NBE sets rates
// Forex allocation done by Banks Portal, NBE monitors only
```

### 6. ECX Portal (4-Stage Lot Lifecycle)

**Backend API Analysis:**
- `POST /api/v1/ecx/lots` - Warehouse intake (issue receipt)
- `POST /api/v1/ecx/lots/:id/grade` - Grade lot
- `POST /api/v1/ecx/lots/:id/assign` - Assign to contract
- `POST /api/v1/ecx/lots/:id/release` - Release lot

**Workflow Stages:**
1. **Warehouse Intake** → Button: Grade Lot
2. **Graded** → Button: Assign to Contract
3. **Assigned to Contract** → Button: Release Lot (after clearance)
4. **Released** → Final state

**Handler Functions Needed:**
```typescript
handleWarehouseIntake(exporterId, origin, quantity, processingMethod)
handleGradeLot(lotId, grade, moisture, defects, cuppingScore)
handleAssignLotToContract(lotId, contractId, pricePerKg)
handleReleaseLot(lotId) // After customs clearance
```

### 7. Exporter Portal - Dashboard Only (Read-Only)
- No workflow - monitoring only
- Shows KPIs for exporter's contracts, shipments, LCs, forex, etc.

## Implementation Priority

1. ✅ **ECTA Quality Inspection** - DONE
2. **Banks LC Workflow** - CRITICAL (blocks payment flow)
3. **NBE Contract Approval** - CRITICAL (blocks forex)  
4. **ECX Lot Lifecycle** - IMPORTANT (blocks quality)
5. **ECTA Contract Approval Tab** - IMPORTANT (separate from quality)

## Code Pattern (Consistent across all portals)

```typescript
// 1. Add workflow filter state
const [workflowFilterTab, setWorkflowFilterTab] = useState<STATUS_TYPE>('INITIAL_STATUS');

// 2. Add handler functions for each stage transition
const handleStage1to2 = async (entity) => {
  const response = await api.post('/endpoint', { ...data });
  if (response.data.success) {
    showSuccess('Stage Complete', 'Message');
    loadData();
  }
};

// 3. Add status tabs with counts
<Tabs value={...} onChange={...}>
  <Tab label={<Box>{status} ({count})</Box>} />
</Tabs>

// 4. Add card grids per status with action buttons
{entities.filter(e => e.status === 'STATUS').map(entity => (
  <Card>
    <CardContent>
      ...details...
      <Button onClick={() => handleTransition(entity)}>
        Next Action
      </Button>
    </CardContent>
  </Card>
))}
```

## Next Steps

1. Implement Banks Portal 7-stage LC workflow
2. Implement NBE Portal contract approval + forex monitoring
3. Implement ECX Portal 4-stage lot lifecycle
4. Add ECTA contract approval tab (separate from quality)
5. Test all workflows end-to-end
6. Deploy any needed chaincode updates
