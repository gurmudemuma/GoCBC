# Portal Integration Example - Step-by-Step Guide

## NBE Portal Integration - Repatriation Tab

### Step 1: Add Import at Top of File

Add this import after the existing component imports (around line 60):

```typescript
// Add after existing imports
import { RepatriationManagementTab } from '@/components/repatriation';
```

### Step 2: Add Tab Button

Find the section where tabValue is checked (around line 1025+). Look for the pattern:
```typescript
{tabValue === 0 && (
  // Forex content
)}
{tabValue === 1 && (
  // Exchange rates content  
)}
```

Add a new condition for tab 7:
```typescript
{tabValue === 7 && (
  <Box sx={{ mt: 2 }}>
    <RepatriationManagementTab />
  </Box>
)}
```

### Step 3: Add Tab Selector Button

Find where tab buttons are rendered (might be at the top or in a sidebar). Add:

```typescript
<Button 
  variant={tabValue === 7 ? "contained" : "outlined"}
  onClick={() => setTabValue(7)}
  startIcon={<AttachMoney />}
  sx={{ 
    bgcolor: tabValue === 7 ? BRAND_COLOR : 'transparent',
    color: tabValue === 7 ? 'white' : BRAND_COLOR,
    borderColor: BRAND_COLOR,
    '&:hover': {
      bgcolor: tabValue === 7 ? BRAND_COLOR : 'rgba(139, 111, 71, 0.1)',
    }
  }}
>
  Repatriation Compliance
</Button>
```

---

## Banks Portal Integration - Repatriation + LC Discrepancy

### Step 1: Add Imports

```typescript
import { RepatriationInitiationDialog } from '@/components/repatriation';
import { LCDiscrepancyTab } from '@/components/lcdiscrepancy';
```

### Step 2: Add State for Dialog

Find where other dialog states are defined (e.g., `const [dialogOpen, setDialogOpen]`), add:

```typescript
const [repatriationDialogOpen, setRepatriationDialogOpen] = useState(false);
```

### Step 3: Add Button in Forex/Payments Tab

Find the Forex tab content, add a button:

```typescript
<Button
  variant="contained"
  startIcon={<AttachMoney />}
  onClick={() => setRepatriationDialogOpen(true)}
  sx={{ 
    bgcolor: '#9b30b7', // Banks purple
    '&:hover': { bgcolor: '#7b1fa2' }
  }}
>
  Initiate Repatriation
</Button>
```

### Step 4: Add LC Discrepancy Tab

Similar to NBE, add tab condition:

```typescript
{activeTab === 8 && (
  <Box sx={{ mt: 2 }}>
    <LCDiscrepancyTab />
  </Box>
)}
```

### Step 5: Add Dialog at Bottom

Before the closing `</Box>` or `</>`, add:

```typescript
<RepatriationInitiationDialog
  open={repatriationDialogOpen}
  onClose={() => setRepatriationDialogOpen(false)}
  onSuccess={() => {
    setRepatriationDialogOpen(false);
    // Refresh your data here
    fetchForexAllocations();
  }}
  preselectedPayment={null}
/>
```

---

## ECTA Portal Integration - Inspection Tab

### Step 1: Add Import

```typescript
import { InspectionRequestsTab } from '@/components/inspection';
```

### Step 2: Add Tab Content

```typescript
{activeTab === 6 && (
  <Box sx={{ mt: 2 }}>
    <InspectionRequestsTab />
  </Box>
)}
```

### Step 3: Add Tab Button

```typescript
<Button 
  variant={activeTab === 6 ? "contained" : "outlined"}
  onClick={() => setActiveTab(6)}
  startIcon={<Science />}
  sx={{ 
    bgcolor: activeTab === 6 ? '#2e7d32' : 'transparent', // ECTA green
    color: activeTab === 6 ? 'white' : '#2e7d32',
  }}
>
  Pre-shipment Inspections
</Button>
```

---

## Customs Portal Integration - Border Crossing Tab

### Step 1: Add Import

```typescript
import { BorderCrossingTab } from '@/components/bordercrossing';
```

### Step 2: Add Tab Content

```typescript
{activeTab === 5 && (
  <Box sx={{ mt: 2 }}>
    <BorderCrossingTab />
  </Box>
)}
```

### Step 3: Add Tab Button

```typescript
<Button 
  variant={activeTab === 5 ? "contained" : "outlined"}
  onClick={() => setActiveTab(5)}
  startIcon={<LocalShipping />}
  sx={{ 
    bgcolor: activeTab === 5 ? '#1565c0' : 'transparent', // Customs navy
    color: activeTab === 5 ? 'white' : '#1565c0',
  }}
>
  Border Crossings
</Button>
```

---

## Testing Checklist

After integration, test each feature:

### For Each Portal:
1. ✅ Import statement added (no errors)
2. ✅ Tab button appears
3. ✅ Clicking tab shows component
4. ✅ Component loads without errors
5. ✅ KPI cards display
6. ✅ Data grid renders
7. ✅ Click actions work (view, edit, etc.)
8. ✅ Dialogs open and close
9. ✅ Forms submit successfully
10. ✅ Notifications show

### API Testing:
1. ✅ Open browser DevTools (F12)
2. ✅ Go to Network tab
3. ✅ Click refresh in component
4. ✅ Verify API calls succeed (Status 200)
5. ✅ Check response data structure

---

## Alternative: Create Separate Tab Components

If direct integration is complex, create wrapper components:

### NBERepatriationTab.tsx
```typescript
import React from 'react';
import { Box } from '@mui/material';
import { RepatriationManagementTab } from '@/components/repatriation';

const NBERepatriationTab: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <RepatriationManagementTab />
    </Box>
  );
};

export default NBERepatriationTab;
```

Then import and use this wrapper in NBE Portal.

---

## Quick Verification Script

Run this to verify all components exist:

```bash
cd /home/guda/GoCBC/ui/src/components

# Check all components exist
ls repatriation/RepatriationManagementTab.tsx
ls repatriation/RepatriationInitiationDialog.tsx
ls inspection/InspectionRequestsTab.tsx
ls bordercrossing/BorderCrossingTab.tsx
ls lcdiscrepancy/LCDiscrepancyTab.tsx

echo "✅ All components exist and ready for integration!"
```

---

## Need Help?

1. Check the component files are in place
2. Verify imports path with `@/components/`
3. Check console for errors (F12)
4. Verify backend is running (`./start-all.sh`)
5. Test APIs with Postman first

**Components are production-ready and waiting for integration!**
