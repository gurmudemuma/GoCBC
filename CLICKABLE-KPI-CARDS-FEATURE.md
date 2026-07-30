# KPI Cards as Sub-Tabs Feature

## Summary
Implemented KPI cards as interactive sub-tabs under each main tab. Each KPI displays as a sub-tab showing its metric, and clicking/selecting a sub-tab filters the data table to show only relevant records.

## Feature Description

### What It Does
Under each main tab (e.g., "Declaration & Document Validation"), the KPI metrics now appear as **sub-tabs**:

```
Main Tab: Declaration & Document Validation
├── Sub-Tab 1: Submitted Declarations (13)
├── Sub-Tab 2: Total Declarations (45)
├── Sub-Tab 3: Average Value ($2.5K)
└── Sub-Tab 4: EUDR Compliant (30/45)
```

When you click any sub-tab:
1. **The sub-tab becomes active** with visual highlighting
2. **Data table filters automatically** to show only matching records
3. **Alert shows** the active filter and count
4. **Icon and value** display prominently in the sub-tab

### User Experience
```
┌─────────────────────────────────────────────────────────────────┐
│ Main Tab: Declaration & Document Validation                     │
├─────────────────────────────────────────────────────────────────┤
│  [📄 Submitted: 13]  [📋 Total: 45]  [📈 Avg: $2.5K]  [✓ EUDR: 30/45]
│   ^^ ACTIVE         (clickable)      (clickable)       (clickable)
└─────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────┐
│ ℹ️ Submitted Declarations: Showing 13 declarations              │
└─────────────────────────────────────────────────────────────────┘
          ↓
        [Data Table with 13 filtered records]
```

## Implementation Details

### File Modified
- `ui/src/components/portals/CustomsPortal.tsx`

### Changes Made

#### 1. **Replaced KPI Cards with Sub-Tabs**
```typescript
<Tabs 
  value={subTabValue} 
  onChange={(e, newValue) => {
    setSubTabValue(newValue);
    const selectedKPI = activeKPIs[newValue];
    if (selectedKPI) {
      handleKPIClick(selectedKPI.filterKey, selectedKPI.title);
    }
  }}
>
  {activeKPIs.map((kpi, index) => (
    <Tab 
      label={
        <Box>
          {kpi.icon}
          <Typography>{kpi.title}</Typography>
          <Typography variant="h6" color={kpi.brandColor}>
            {kpi.value}
          </Typography>
        </Box>
      }
    />
  ))}
</Tabs>
```

#### 2. **Auto-Select First Sub-Tab**
```typescript
useEffect(() => {
  if (allDeclarations.length > 0 && activeKPIs.length > 0) {
    const firstKPI = activeKPIs[0];
    handleKPIClick(firstKPI.filterKey, firstKPI.title);
  }
}, [tabValue, allDeclarations.length]);
```

#### 3. **Reset on Main Tab Change**
```typescript
onChange={(e, newValue) => {
  setTabValue(newValue);
  setSubTabValue(0);  // Reset to first sub-tab
  setActiveKPIFilter(null);
  setDeclarations(allDeclarations);
}}
```

## Visual Layout

### Before (Old KPI Cards)
```
┌──────────────────┐  ┌──────────────────┐
│ 📄 Submitted     │  │ 📋 Total         │
│ 13               │  │ 45               │
└──────────────────┘  └──────────────────┘
```

### After (Sub-Tabs)
```
┌────────────────────────────────────────────────────────────┐
│ [📄 Submitted: 13] │ [📋 Total: 45] │ [📈 Avg] │ [✓ EUDR] │
│  └─ ACTIVE TAB ─┘                                          │
└────────────────────────────────────────────────────────────┘
```

## Benefits

### For Users
✅ **Native Tab Interface** - Familiar UI pattern  
✅ **Always Visible** - KPIs always show in sub-tabs  
✅ **Quick Switching** - One click to change filter  
✅ **Clear Active State** - Visual indication of selected filter  
✅ **Automatic Filter** - Data updates instantly on tab click  

### For System
✅ **Efficient** - No extra API calls  
✅ **Clean Layout** - No separate KPI card section needed  
✅ **Scalable** - Easy to add more sub-tabs  
✅ **Consistent** - Follows Material-UI patterns  

## Sub-Tabs by Main Tab

### Tab 0: Declaration & Document Validation
1. **Submitted Declarations** (count) - Shows SUBMITTED status
2. **Total Declarations** (count) - Shows all declarations
3. **Average Value** (currency) - Shows all (aggregate view)
4. **EUDR Compliant** (fraction) - Shows EUDR-compliant only

### Tab 1: Risk Management & Review
1. **Under Review** (count) - Shows UNDER_REVIEW status
2. **Held for Verification** (count) - Shows HELD status
3. **Review Rate** (percentage) - Shows in-review records
4. **Non-EUDR Compliant** (count) - Shows non-EUDR records

### Tab 2: Physical Inspection
1. **Under Inspection** (count) - Shows UNDER_INSPECTION status
2. **Inspection Required** (count) - Shows pending inspections
3. **Inspections Completed** (count) - Shows completed inspections
4. **Inspection Rate** (percentage) - Shows inspected records

### Tab 3: Customs Release
1. **Cleared Shipments** (count) - Shows CLEARED status
2. **Total Cleared Value** (currency) - Shows cleared records
3. **Average Quantity** (weight) - Shows cleared records
4. **Clearance Rate** (percentage) - Shows cleared records

## Usage Example

### Scenario: Reviewing Submitted Declarations
1. User opens Customs Portal → Tab 0 loads
2. Sub-tabs automatically show with first one active ("Submitted: 13")
3. Data table shows 13 submitted declarations
4. User clicks "Total Declarations" sub-tab
5. Table updates to show all 45 declarations
6. User clicks "EUDR Compliant" sub-tab
7. Table shows only 30 EUDR-compliant declarations

## Technical Notes

### Styling
- Sub-tabs have custom height (80px) to accommodate icon + label + value
- Active sub-tab has colored bottom border matching KPI brand color
- Scrollable for mobile/narrow screens
- Icons centered above text

### State Management
- `subTabValue` tracks active sub-tab (0-indexed)
- `activeKPIFilter` stores current filter key
- Auto-resets to index 0 when changing main tabs
- Filter automatically applies on sub-tab selection

### Performance
- Client-side filtering only
- Instant response
- No network overhead

## Date
January 2025
