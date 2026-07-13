# Portal Actions Column Implementation Status

## Analysis Results

### ✅ Portals with Complete Action Columns

1. **ExporterPortal** - Uses DataGrid with Actions column ✅
   - Contract actions: View button with icon
   - Properly implemented in GridColDef[]

2. **BanksPortal** - Has Actions columns in all tables ✅
   - Contracts Table: "Issue LC" button
   - LC Table: Approve/View icon buttons
   - Forex Table: Needs verification
   - Documentary Collections Table: Needs verification
   - Advance Payments Table: Needs verification
   - Consignment Permits Table: Needs verification
   - Export Permits Table: Needs verification

### ⚠️ Portals Needing Actions Column Implementation

3. **CustomsPortal** - Uses DataGrid
   - Needs Actions column added to DataGrid

4. **ECTAPortal** - Mixed (DataGrid + Tables)
   - Has 2 tables with Actions columns ✅
   - Needs verification of remaining tables

5. **ECXPortal** - Has Tables
   - Needs Actions columns added

6. **ShippingPortal** - Mixed (DataGrid + Tables)
   - Needs Actions columns added

7. **NBEPortal** - Uses DataGrids
   - Needs Actions column added to DataGrids

## Required Actions by Portal

### CustomsPortal
**Tables/DataGrids:**
- Declarations DataGrid
**Actions Needed:**
- View Details
- Approve/Reject
- Download Documents
- Track Status

### ECTAPortal
**Tables:**
- Applications Table (needs verification)
- Certificates Table (needs verification)
- Inspections DataGrid (needs actions)
**Actions Needed:**
- View/Edit Applications
- Approve/Reject
- Issue Certificates
- Schedule Inspections

### ECXPortal
**Tables:**
- Warehouse Lots Table
- Contracts Table
**Actions Needed:**
- View Details
- Grade Coffee
- Assign to Contract
- Release Lot
- Track Status

### ShippingPortal
**Tables:**
- Shipments DataGrid/Table
- BOL Table
**Actions Needed:**
- View Details
- Update Status
- Track Shipment
- Download BOL
- Generate QR Code

### NBEPortal
**DataGrids:**
- Contracts DataGrid
- Forex Allocations DataGrid
**Actions Needed:**
- View Details
- Approve for Forex
- Allocate Forex
- Download Report

## Implementation Plan

### Phase 1: Verify Existing Actions (BanksPortal)
- [x] Contracts table - ✅ Has "Issue LC"
- [x] LC table - ✅ Has Approve/View
- [ ] Forex table - Need to verify
- [ ] Documentary Collections table - Need to verify
- [ ] Advance Payments table - Need to verify
- [ ] Consignment table - Need to verify
- [ ] Export Permits table - Need to verify

### Phase 2: Add Actions to DataGrids
- [ ] CustomsPortal - Declarations DataGrid
- [ ] ECTAPortal - Inspections DataGrid
- [ ] NBEPortal - Contracts and Forex DataGrids
- [ ] ShippingPortal - Shipments DataGrid

### Phase 3: Add Actions to Tables
- [ ] ECXPortal - All tables
- [ ] ShippingPortal - BOL table
- [ ] ECTAPortal - Remaining tables

### Phase 4: Standardize Action Patterns
- [ ] Icon buttons with tooltips for quick actions
- [ ] Primary button for main action
- [ ] Menu button for additional actions
- [ ] Consistent icon usage across portals

## Action Button Patterns

### Standard Action Icons
- View: `<Visibility />` - Blue/Primary
- Edit: `<Edit />` - Orange/Secondary
- Delete: `<Delete />` - Red/Error
- Download: `<Download />` - Green
- Upload: `<Upload />` - Blue
- Approve: `<CheckCircle />` - Green/Success
- Reject: `<Cancel />` - Red/Error
- Track: `<Timeline />` or `<LocalShipping />` - Blue

### Implementation Template

```typescript
// For DataGrid
{
  field: 'actions',
  headerName: 'Actions',
  width: 180,
  sortable: false,
  renderCell: (params) => (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <Tooltip title="View Details">
        <IconButton size="small" color="primary" onClick={() => handleView(params.row)}>
          <Visibility />
        </IconButton>
      </Tooltip>
      <Tooltip title="Edit">
        <IconButton size="small" color="secondary" onClick={() => handleEdit(params.row)}>
          <Edit />
        </IconButton>
      </Tooltip>
      <Tooltip title="Download">
        <IconButton size="small" color="success" onClick={() => handleDownload(params.row)}>
          <Download />
        </IconButton>
      </Tooltip>
    </Box>
  ),
}

// For Table
<TableCell>
  <Box sx={{ display: 'flex', gap: 0.5 }}>
    <Tooltip title="View Details">
      <IconButton size="small" color="primary" onClick={() => handleView(row)}>
        <Visibility />
      </IconButton>
    </Tooltip>
    <Tooltip title="Approve">
      <IconButton size="small" color="success" onClick={() => handleApprove(row)}>
        <CheckCircle />
      </IconButton>
    </Tooltip>
  </Box>
</TableCell>
```

## Next Steps

1. Verify all BanksPortal table actions
2. Add actions to CustomsPortal DataGrid
3. Add actions to NBEPortal DataGrids
4. Add actions to ECXPortal tables
5. Add actions to ShippingPortal
6. Add remaining actions to ECTAPortal
7. Test all actions work correctly
8. Ensure accessibility (tooltips, aria-labels)
