# Post-Delivery Workflow UI Integration Guide

## 🎯 Integration Strategy

The Post-Delivery Workflow Panel should be integrated **contextually** - appearing when users view DELIVERED shipment details, rather than as a separate tab. This provides:

✅ **Contextual relevance** - Only shown when applicable  
✅ **Clean UI** - No additional tabs cluttering the interface  
✅ **Role-based actions** - Each portal shows appropriate actions  
✅ **Consistent experience** - Same component across all portals

---

## 📋 Integration Points

### 1. **ShippingPortal** (View Status Only)
**Location:** Shipment detail dialog when `status === 'DELIVERED'`  
**Actions:** Read-only view  
**User Role:** `SHIPPING`

```typescript
// In ShippingPortal.tsx - Inside shipment detail dialog
{selectedRecord && selectedRecord.status === 'DELIVERED' && (
  <Box sx={{ mt: 3 }}>
    <Divider sx={{ mb: 2 }} />
    <PostDeliveryWorkflowPanel 
      shipmentId={selectedRecord.shipmentId}
      userRole="SHIPPING"
      onRefresh={() => loadShippingRecords()}
    />
  </Box>
)}
```

---

### 2. **BanksPortal** (Payment & LC Recording)
**Location:** After viewing shipment/contract details  
**Actions:** Record Payment, Record LC Settlement  
**User Role:** `BANK`

**Implementation Option A: Add to existing Payment Methods tab**

```typescript
// In BanksPortal.tsx - Add new section in Payment Methods tab
<Box sx={{ mt: 4 }}>
  <Typography variant="h6" gutterBottom>
    <Payment /> Post-Delivery Settlements
  </Typography>
  <Typography variant="body2" color="text.secondary" paragraph>
    Record payments received and LC settlements for delivered shipments
  </Typography>
  
  {/* Show list of delivered shipments awaiting payment */}
  {deliveredShipments.map(shipment => (
    <Card key={shipment.shipmentId} sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="subtitle1">{shipment.shipmentId}</Typography>
            <Typography variant="body2" color="text.secondary">
              Contract: {shipment.contractId} | Delivered: {new Date(shipment.deliveryDate).toLocaleDateString()}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={() => {
              setSelectedShipmentForPostDelivery(shipment);
              setPostDeliveryDialogOpen(true);
            }}
          >
            Manage Settlement
          </Button>
        </Box>
      </CardContent>
    </Card>
  ))}
</Box>

{/* Post-Delivery Dialog */}
<Dialog open={postDeliveryDialogOpen} onClose={() => setPostDeliveryDialogOpen(false)} maxWidth="md" fullWidth>
  <DialogTitle>
    Post-Delivery Settlement: {selectedShipmentForPostDelivery?.shipmentId}
  </DialogTitle>
  <DialogContent>
    <PostDeliveryWorkflowPanel 
      shipmentId={selectedShipmentForPostDelivery?.shipmentId || ''}
      userRole="BANK"
      onRefresh={() => {
        loadBankingData();
        setPostDeliveryDialogOpen(false);
      }}
    />
  </DialogContent>
</Dialog>
```

**Implementation Option B: Add dashboard widget**

```typescript
// Add to Banks Portal dashboard (Tab 0)
<Grid item xs={12} md={6}>
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        ⏳ Pending Payment Settlements
      </Typography>
      <Typography variant="h3" color="primary">
        {pendingPayments.length}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Delivered shipments awaiting payment recording
      </Typography>
      <Button 
        variant="text" 
        fullWidth 
        sx={{ mt: 2 }}
        onClick={() => setTabValue(1)} // Navigate to settlements section
      >
        View All →
      </Button>
    </CardContent>
  </Card>
</Grid>
```

---

### 3. **NBEPortal** (Forex Repatriation)
**Location:** Forex Monitoring tab (Tab 0)  
**Actions:** Record Forex Repatriation  
**User Role:** `NBE`

**Implementation:**

```typescript
// In NBEPortal.tsx - Add section to Forex Monitoring tab
<Box sx={{ mt: 4 }}>
  <Typography variant="h6" gutterBottom>
    <CurrencyExchange /> Forex Repatriation Tracking
  </Typography>
  <Alert severity="info" sx={{ mb: 2 }}>
    Monitor and record forex repatriation for delivered shipments. 
    Repatriation must occur within 7 days of payment receipt per NBE regulations.
  </Alert>
  
  {/* Dashboard KPIs */}
  <Grid container spacing={2} sx={{ mb: 3 }}>
    <Grid item xs={12} md={4}>
      <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h4" color="warning.main">{pendingForexCount}</Typography>
        <Typography variant="body2">Pending Repatriation</Typography>
      </Paper>
    </Grid>
    <Grid item xs={12} md={4}>
      <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h4" color="error.main">{overdueForexCount}</Typography>
        <Typography variant="body2">Overdue (>7 days)</Typography>
      </Paper>
    </Grid>
    <Grid item xs={12} md={4}>
      <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h4" color="success.main">{repatriatedThisMonth}</Typography>
        <Typography variant="body2">Repatriated This Month</Typography>
      </Paper>
    </Grid>
  </Grid>
  
  {/* List of shipments */}
  <TableContainer component={Paper}>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Shipment ID</TableCell>
          <TableCell>Payment Received</TableCell>
          <TableCell>Amount (USD)</TableCell>
          <TableCell>Days Elapsed</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {pendingForexShipments.map(shipment => (
          <TableRow key={shipment.shipmentId}>
            <TableCell>{shipment.shipmentId}</TableCell>
            <TableCell>{new Date(shipment.paymentDate).toLocaleDateString()}</TableCell>
            <TableCell>${shipment.paymentAmount.toLocaleString()}</TableCell>
            <TableCell>
              <Chip 
                label={`${shipment.daysElapsed} days`}
                color={shipment.daysElapsed > 7 ? 'error' : shipment.daysElapsed > 5 ? 'warning' : 'default'}
                size="small"
              />
            </TableCell>
            <TableCell>
              <Chip label={shipment.forexStatus} size="small" />
            </TableCell>
            <TableCell>
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  setSelectedForexShipment(shipment);
                  setForexRepatriationDialogOpen(true);
                }}
              >
                Record Repatriation
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
</Box>

{/* Forex Repatriation Dialog */}
<Dialog open={forexRepatriationDialogOpen} onClose={() => setForexRepatriationDialogOpen(false)} maxWidth="md" fullWidth>
  <DialogTitle>Record Forex Repatriation</DialogTitle>
  <DialogContent>
    <PostDeliveryWorkflowPanel 
      shipmentId={selectedForexShipment?.shipmentId || ''}
      userRole="NBE"
      onRefresh={() => {
        loadForexData();
        setForexRepatriationDialogOpen(false);
      }}
    />
  </DialogContent>
</Dialog>
```

---

### 4. **ECTAPortal** (Audit & Contract Closure)
**Location:** Contracts tab - add "Post-Delivery" sub-section  
**Actions:** Complete Audit, Close Contract  
**User Role:** `ECTA`

**Implementation:**

```typescript
// In ECTAPortal.tsx - Add new tab or section for Post-Delivery Management
const allTabs = [
  // ... existing tabs
  { 
    index: 6, 
    label: 'Post-Delivery Audits', 
    icon: <Gavel />, 
    roles: ['ECTA', 'ADMIN', 'ECTA Officer', 'Compliance Officer'] 
  },
];

// Tab content
{tabValue === 6 && (
  <Box>
    <Typography variant="h5" gutterBottom>
      <Gavel /> Post-Delivery Audits & Contract Closure
    </Typography>
    <Typography variant="body2" color="text.secondary" paragraph>
      Conduct final export compliance audits and close completed export contracts.
    </Typography>
    
    {/* Dashboard */}
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} md={3}>
        <DashboardKPI
          icon={<Assignment />}
          label="Pending Audits"
          value={pendingAuditsCount}
          color="#ff9800"
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <DashboardKPI
          icon={<CheckCircle />}
          label="Ready for Closure"
          value={readyForClosureCount}
          color="#4caf50"
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <DashboardKPI
          icon={<Warning />}
          label="Overdue"
          value={overdueAuditsCount}
          color="#f44336"
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <DashboardKPI
          icon={<Timeline />}
          label="Closed This Month"
          value={closedThisMonthCount}
          color="#2196f3"
        />
      </Grid>
    </Grid>
    
    {/* Shipments List */}
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Shipment ID</TableCell>
            <TableCell>Contract ID</TableCell>
            <TableCell>Exporter</TableCell>
            <TableCell>Delivered</TableCell>
            <TableCell>Workflow Status</TableCell>
            <TableCell>Completion</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {deliveredShipments.map(shipment => (
            <TableRow key={shipment.shipmentId}>
              <TableCell>{shipment.shipmentId}</TableCell>
              <TableCell>{shipment.contractId}</TableCell>
              <TableCell>{shipment.exporterId}</TableCell>
              <TableCell>{new Date(shipment.deliveryDate).toLocaleDateString()}</TableCell>
              <TableCell>
                <Chip 
                  label={shipment.postDeliveryStatus}
                  color={getStatusColor(shipment.postDeliveryStatus)}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center">
                  <LinearProgress 
                    variant="determinate" 
                    value={shipment.completionPercentage} 
                    sx={{ width: 100, mr: 1 }}
                  />
                  <Typography variant="body2">{shipment.completionPercentage}%</Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => {
                    setSelectedAuditShipment(shipment);
                    setAuditDialogOpen(true);
                  }}
                >
                  Manage
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
)}

{/* Audit & Closure Dialog */}
<Dialog open={auditDialogOpen} onClose={() => setAuditDialogOpen(false)} maxWidth="lg" fullWidth>
  <DialogTitle>
    Post-Delivery Management: {selectedAuditShipment?.shipmentID}
  </DialogTitle>
  <DialogContent>
    <PostDeliveryWorkflowPanel 
      shipmentId={selectedAuditShipment?.shipmentId || ''}
      userRole="ECTA"
      onRefresh={() => {
        loadECTAData();
        setAuditDialogOpen(false);
      }}
    />
  </DialogContent>
</Dialog>
```

---

### 5. **ExporterPortal** (Read-Only View)
**Location:** Shipments tab - detail dialog  
**Actions:** View only (no edit permissions)  
**User Role:** `EXPORTER`

```typescript
// In ExporterPortal.tsx - Add to shipment detail dialog
{selectedShipment && selectedShipment.status === 'DELIVERED' && (
  <Box sx={{ mt: 3 }}>
    <Divider sx={{ mb: 2 }} />
    <Alert severity="info" sx={{ mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        📦 Post-Delivery Process
      </Typography>
      <Typography variant="body2">
        Your shipment has been delivered. Track the payment settlement and contract closure process below.
      </Typography>
    </Alert>
    <PostDeliveryWorkflowPanel 
      shipmentId={selectedShipment.shipmentId}
      userRole="EXPORTER"
      onRefresh={() => loadShipments()}
    />
  </Box>
)}
```

---

## 📦 Component Import

Add to each portal file:

```typescript
import PostDeliveryWorkflowPanel from '@/components/shared/PostDeliveryWorkflowPanel';
```

---

## 🔄 Data Loading

Each portal needs to fetch delivered shipments:

```typescript
// Add to portal's data loading functions
const loadDeliveredShipments = async () => {
  try {
    const response = await apiFetch('/shipments?status=DELIVERED', {
      headers: getAuthHeaders()
    });
    
    if (response.success) {
      setDeliveredShipments(response.data);
      
      // Fetch post-delivery status for each
      const statusPromises = response.data.map(ship => 
        apiFetch(`/post-delivery/${ship.shipmentId}/status`, {
          headers: getAuthHeaders()
        })
      );
      
      const statuses = await Promise.all(statusPromises);
      // Merge status data with shipments
    }
  } catch (error) {
    console.error('Error loading delivered shipments:', error);
  }
};
```

---

## 🎨 Styling Consistency

Ensure the PostDeliveryWorkflowPanel matches each portal's theme:

```typescript
<ThemeProvider theme={createOrganizationTheme('BANKS')}>
  <PostDeliveryWorkflowPanel 
    shipmentId={shipmentId}
    userRole="BANK"
    onRefresh={refresh}
  />
</ThemeProvider>
```

---

## ✅ Implementation Checklist

### Phase 1: Core Integration
- [ ] Add PostDeliveryWorkflowPanel import to BanksPortal
- [ ] Add PostDeliveryWorkflowPanel import to NBEPortal
- [ ] Add PostDeliveryWorkflowPanel import to ECTAPortal
- [ ] Add read-only view to ExporterPortal
- [ ] Add read-only view to ShippingPortal

### Phase 2: Data Loading
- [ ] Implement loadDeliveredShipments() in each portal
- [ ] Fetch post-delivery status for UI display
- [ ] Handle loading states and errors

### Phase 3: UI Polish
- [ ] Add dashboard KPIs for pending items
- [ ] Add alerts for overdue items
- [ ] Implement filters and search
- [ ] Add export/print functionality

### Phase 4: Testing
- [ ] Test payment recording (Banks)
- [ ] Test forex repatriation (NBE)
- [ ] Test audit completion (ECTA)
- [ ] Test contract closure (ECTA)
- [ ] Test read-only views (Exporter, Shipping)

---

## 🚀 Quick Start

The fastest way to see it working:

1. **Copy the component file:**
   ```bash
   # Component already created at:
   ui/src/components/shared/PostDeliveryWorkflowPanel.tsx
   ```

2. **Add to BanksPortal (easiest first):**
   - Open `ui/src/components/portals/BanksPortal.tsx`
   - Add import at top
   - Add dashboard widget showing pending payments
   - Add dialog with PostDeliveryWorkflowPanel

3. **Test with delivered shipment:**
   - Use shipment `SHIP1787204371672` (already delivered)
   - Banks can record payment
   - NBE can record forex
   - ECTA can complete audit and close contract

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify API endpoints are responding
3. Confirm user has correct role permissions
4. Review POST-DELIVERY-WORKFLOW-IMPLEMENTATION.md for API details

---

**The component is ready - just needs to be wired into the portals!** 🎉
