# UI Updates Required for Accurate NBE Role

**Date**: July 13, 2026  
**Reference**: NBE-ROLE-ACTUAL-IMPLEMENTATION.md

---

## Summary of Changes Needed

### **NBE Portal** (`NBEPortal.tsx`)

#### ❌ **REMOVE** (No longer NBE responsibility):
1. **Forex Allocation Dialog** - Banks allocate, not NBE
2. **"Approve for Forex" button** on contracts
3. **Forex Allocations Tab** - Move to Banks Portal
4. **Individual forex approval workflow**

#### ✅ **KEEP/UPDATE**:
1. **Exchange Rate Management** - NBE's primary role
2. **Banking Metrics Dashboard** - Overview monitoring
3. **SWIFT Monitoring** - Transaction oversight

#### ➕ **ADD**:
1. **Retention Policy Management** (set 50/50 policy)
2. **FEMoUS-style Monitoring Dashboard**
3. **Forex Policy Directives** (issue new policies)
4. **Compliance Reporting** (bank compliance with policies)

---

## Detailed Changes

### 1. **NBE Portal Tabs** (Update from 4 to 3 tabs)

**BEFORE**:
```tsx
<Tab label="Contract Approvals" />      // ❌ REMOVE
<Tab label="Forex Allocations" />       // ❌ REMOVE  
<Tab label="Exchange Rates" />          // ✅ KEEP
<Tab label="SWIFT Monitoring" />        // ✅ KEEP
```

**AFTER**:
```tsx
<Tab label="Exchange Rates" />          // ✅ PRIMARY ROLE
<Tab label="Retention Policy" />        // ➕ NEW - Set 50/50 policy
<Tab label="FEMoUS Monitoring" />       // ➕ NEW - Monitor all forex
<Tab label="Compliance Reports" />      // ➕ NEW - Bank compliance
<Tab label="SWIFT Monitoring" />        // ✅ KEEP
```

### 2. **Banks Portal** (Add Forex Allocation)

**NEW TAB**: "Forex Allocation"
- Move forex allocation functionality FROM NBE TO Banks
- Banks allocate following NBE's 50% retention policy
- Auto-fetch current NBE exchange rate
- Show retention policy compliance

### 3. **Exchange Rate Tab** (NBE Portal)

**CURRENT**: ✅ Already correct
- Set buying/selling rates
- 2% spread limit guideline
- Daily rate publishing

**ENHANCE**:
- Show rate history chart
- Show banks' compliance with spread limit
- Alert if any bank exceeds 2% spread

### 4. **NEW: Retention Policy Tab** (NBE Portal)

```tsx
<Card>
  <CardHeader title="Forex Retention Policy" />
  <CardContent>
    <Typography>Current Policy: 50% Retention / 50% Surrender</Typography>
    <Typography>Effective Date: July 2024</Typography>
    <Typography>Surrender Deadline: 30 days</Typography>
    
    <Button>Update Retention Policy</Button>
    <Button>Issue New Directive</Button>
  </CardContent>
</Card>
```

### 5. **NEW: FEMoUS Monitoring Tab** (NBE Portal)

```tsx
<Grid container spacing={2}>
  {/* KPIs */}
  <Grid item xs={3}>
    <Card>
      <Statistic title="Total Forex Allocated (All Banks)" value="$125.5M" />
    </Card>
  </Grid>
  <Grid item xs={3}>
    <Card>
      <Statistic title="Retention Accounts" value="$62.75M (50%)" />
    </Card>
  </Grid>
  <Grid item xs={3}>
    <Card>
      <Statistic title="Surrendered to Banks" value="$62.75M (50%)" />
    </Card>
  </Grid>
  <Grid item xs={3}>
    <Card>
      <Statistic title="Overdue Surrenders" value="12" />
    </Card>
  </Grid>
  
  {/* Transaction Table */}
  <DataGrid>
    {/* All forex transactions from all banks */}
    {/* Read-only view for NBE monitoring */}
  </DataGrid>
</Grid>
```

### 6. **NEW: Compliance Reports Tab** (NBE Portal)

```tsx
<TableContainer>
  <Table>
    <TableHead>
      <TableRow>
        <TableCell>Bank</TableCell>
        <TableCell>Forex Allocated</TableCell>
        <TableCell>Retention Rate Compliance</TableCell>
        <TableCell>Spread Compliance</TableCell>
        <TableCell>Outstanding Violations</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      <TableRow>
        <TableCell>Commercial Bank of Ethiopia</TableCell>
        <TableCell>$45.2M</TableCell>
        <TableCell>✅ 100%</TableCell>
        <TableCell>✅ 1.8% avg</TableCell>
        <TableCell>0</TableCell>
      </TableRow>
      {/* ... */}
    </TableBody>
  </Table>
</TableContainer>
```

---

## Banks Portal Updates

### **NEW Tab**: "Forex Allocation"

```tsx
<Tab label="Forex Allocation" />

// Content:
<Box>
  <Alert severity="info">
    <Typography>
      <strong>NBE Policy</strong>: You can allocate forex for approved contracts.
      50% must go to retention account, 50% must be surrendered within 30 days.
    </Typography>
  </Alert>
  
  <DataGrid
    rows={forexRequests}  // From exporters
    columns={[
      { field: 'forexId', headerName: 'Forex ID' },
      { field: 'exporter', headerName: 'Exporter' },
      { field: 'amount', headerName: 'Requested Amount' },
      { field: 'status', headerName: 'Status' },
      {
        field: 'actions',
        headerName: 'Actions',
        renderCell: (params) => (
          <Button onClick={() => allocateForex(params.row)}>
            Allocate Forex
          </Button>
        )
      }
    ]}
  />
</Box>

// Allocation Dialog:
<Dialog>
  <DialogTitle>Allocate Forex</DialogTitle>
  <DialogContent>
    <TextField label="Allocated Amount" />
    <TextField 
      label="Exchange Rate" 
      value={currentNBERate}  // Auto-fetched from NBE
      disabled
      helperText="Current NBE rate (±2% spread allowed)"
    />
    <TextField 
      label="Retention Rate (%)" 
      value="50"
      disabled
      helperText="NBE Policy: 50% retention"
    />
    <TextField label="Bank Officer" />
    <TextField label="Reference Number" />
  </DialogContent>
  <DialogActions>
    <Button onClick={handleAllocate}>Allocate</Button>
  </DialogActions>
</Dialog>
```

---

## Exporter Portal Updates

### **NO CHANGES NEEDED**
- Exporters still request forex
- They see status: REQUESTED → ALLOCATED
- No need to know who allocated (Bank vs NBE)

---

## Implementation Priority

### **Phase 1: Critical** (Blocking incorrect workflow)
1. ✅ Remove forex allocation from NBE Portal
2. ✅ Add forex allocation to Banks Portal
3. ✅ Update retention rate to 50% everywhere
4. ✅ Update UI text removing "NBE approves forex"

### **Phase 2: Important** (Accurate representation)
1. ✅ Add Retention Policy tab to NBE Portal
2. ✅ Add FEMoUS monitoring to NBE Portal
3. ✅ Auto-fetch NBE exchange rates in Banks Portal

### **Phase 3: Enhancement** (Full monitoring)
1. Compliance reports
2. Historical analytics
3. Policy directive management

---

## Files to Update

1. `ui/src/components/portals/NBEPortal.tsx` - Major restructure
2. `ui/src/components/portals/BanksPortal.tsx` - Add forex allocation
3. `ui/src/types/index.ts` - Update types if needed
4. `ui/src/utils/api.ts` - Update API calls

---

## Testing Checklist

- [ ] NBE can set exchange rates
- [ ] NBE can view all forex transactions (monitoring)
- [ ] NBE cannot allocate individual forex
- [ ] Banks can allocate forex following NBE policy
- [ ] Retention rate shows as 50% everywhere
- [ ] Exchange rates auto-populate in bank allocations
- [ ] Exporters can still request forex
- [ ] Workflow: Exporter → Request → Bank → Allocate (no NBE step)

---
