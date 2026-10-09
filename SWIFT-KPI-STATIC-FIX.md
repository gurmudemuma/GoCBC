# SWIFT Monitoring - Static KPI Cards Fix

## Issue
The KPI cards above the SWIFT Monitoring tabs were changing when users switched between sub-tabs ("All Messages", "Analytics & Charts", "Compliance Alerts"). This was confusing because the sub-tabs are just different views of the same data, not different data categories.

## User Requirement
"the subtabs under swift monitoring must not show data on separate kpi cards"
"let it show data on the kpi cards above the tabs"

**Intent**: The KPI cards should remain **static** and show the same overview metrics regardless of which sub-tab is active. Sub-tabs are navigation within SWIFT Monitoring, not data categories.

## Solution
Removed the conditional logic that changed KPI cards based on `swiftSubTab` value. Now the KPI cards always show the same 4 metrics.

## Implementation

### Before (WRONG - Dynamic KPIs)
```typescript
tabValue === 2 ? (
  swiftSubTab === 0 ? [
    // Different KPIs for "All Messages"
    ...
  ] : swiftSubTab === 1 ? [
    // Different KPIs for "Analytics & Charts"
    ...
  ] : [
    // Different KPIs for "Compliance Alerts"
    ...
  ]
)
```

### After (CORRECT - Static KPIs)
```typescript
tabValue === 2 ? [
  // Same KPIs regardless of sub-tab
  { icon: <FlightTakeoff />, label: 'All SWIFT Messages', value: swiftMessages.length, color: BRAND_COLOR, onClick: () => setSwiftStatusFilter(null) },
  { icon: <CheckCircle />, label: 'Sent', value: swiftMessages.filter(m => m.status === 'SENT').length, color: '#4caf50', onClick: () => setSwiftStatusFilter('SENT') },
  { icon: <Warning />, label: 'Pending', value: swiftMessages.filter(m => m.status === 'PENDING').length, color: '#ff9800', onClick: () => setSwiftStatusFilter('PENDING') },
  { icon: <TrendingUp />, label: 'Today', value: swiftMessages.filter(m => new Date(m.createdAt).toDateString() === new Date().toDateString()).length, color: '#2196f3', onClick: () => setSwiftStatusFilter(null) },
]
```

## Behavior

### KPI Cards (Always Visible, Never Change)
1. **All SWIFT Messages** - Total count of all messages
2. **Sent** - Count of successfully sent messages (clickable filter)
3. **Pending** - Count of pending messages (clickable filter)
4. **Today** - Count of today's messages

### Sub-Tabs (Navigation Only)
1. **All Messages** - Shows table of SWIFT messages
2. **Analytics & Charts** - Shows charts and analytics
3. **Compliance Alerts** - Shows compliance information

### User Experience
- User switches from "All Messages" → "Analytics & Charts"
- **KPI cards remain unchanged** (still show All: 10, Sent: 5, Pending: 3, Today: 2)
- Only the content below changes (table → charts)

## Comparison with Other Tabs

### Analytics Tab - Dynamic KPIs (Correct)
```typescript
tabValue === 4 ? (
  analyticsSubTab === 0 ? [...] : // Overview KPIs
  analyticsSubTab === 1 ? [...] : // Trends KPIs
  [...] // Breakdown KPIs
)
```
**Why different?** Analytics sub-tabs show fundamentally different data perspectives (Overview vs Trends vs Breakdown), so KPIs should change.

### SWIFT Monitoring - Static KPIs (Correct)
```typescript
tabValue === 2 ? [
  // Always same KPIs
]
```
**Why static?** SWIFT sub-tabs are just different views/presentations of the same SWIFT message data (table vs charts vs alerts), so KPIs should NOT change.

## Files Modified
1. `/ui/src/components/portals/NBEPortal.tsx` (lines ~1058-1076)
   - Removed conditional logic based on `swiftSubTab`
   - Simplified to single array of 4 KPI cards

## Testing

1. Start the application:
   ```bash
   cd /home/guda/GoCBC
   ./stop-all.sh
   ./start-all.sh
   ```

2. Navigate to **NBE Portal → SWIFT Monitoring**

3. Note the KPI cards at top:
   - All SWIFT Messages: 10
   - Sent: 5
   - Pending: 3
   - Today: 2

4. Click **"Analytics & Charts"** sub-tab
   - ✅ KPI cards should **remain the same** (10, 5, 3, 2)
   - ✅ Content below changes to show charts

5. Click **"Compliance Alerts"** sub-tab
   - ✅ KPI cards should **still be the same** (10, 5, 3, 2)
   - ✅ Content below changes to show compliance info

6. Click **"All Messages"** sub-tab
   - ✅ KPI cards **still unchanged** (10, 5, 3, 2)
   - ✅ Content shows message table

## Success Criteria
✅ KPI cards remain static when switching SWIFT sub-tabs  
✅ KPI cards still clickable to filter data  
✅ Sub-tabs only change content below KPIs, not KPIs themselves  
✅ Consistent with user's mental model (sub-tabs = views, not categories)

---

**Status**: ✅ Complete  
**Date**: 2026-10-03  
**Issue**: SWIFT KPI cards were changing with sub-tabs  
**Fix**: Made KPI cards static for SWIFT Monitoring tab  
**Rationale**: Sub-tabs are navigation views, not data categories
