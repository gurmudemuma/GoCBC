# SWIFT Monitoring - Dynamic KPI Cards (Final Implementation)

## Overview
Implemented dynamic KPI cards for SWIFT Monitoring that change based on which sub-tab is active. Each sub-tab shows contextually relevant metrics in the KPI cards above.

## User Requirement
"so why the subtabs of the swift monitoring are not showing dynamically on the kpi cards?"

**Intent**: The KPI cards above the tabs should **dynamically update** to show different metrics when switching between SWIFT sub-tabs (All Messages, Analytics & Charts, Compliance Alerts).

## Implementation

### Dynamic KPI Structure

The KPI cards now change based on `swiftSubTab` value (0, 1, or 2):

```typescript
tabValue === 2 ? (
  swiftSubTab === 0 ? [...] : // All Messages KPIs
  swiftSubTab === 1 ? [...] : // Analytics & Charts KPIs
  [...] // Compliance Alerts KPIs
)
```

## Sub-Tab Specific KPIs

### Sub-Tab 0: All Messages
**Focus**: Overview of all SWIFT messages

| KPI Card | Metric | Calculation | Color |
|----------|--------|-------------|-------|
| 📊 **Total Messages** | Count of all messages | `swiftMessages.length` | Bronze (Brand) |
| 💰 **Total Value** | Sum of all amounts | `$X.XM` | Green |
| 📈 **Forex Inflow** | Sum of SENT amounts | `$X.XM` | Blue |
| ⚠️ **High Value Txns** | Messages > $100K | Count | Orange |

**Example Display**:
```
[Total Messages: 25] [Total Value: $5.2M] [Forex Inflow: $3.8M] [High Value: 4]
```

### Sub-Tab 1: Analytics & Charts
**Focus**: Analytical metrics and trends

| KPI Card | Metric | Calculation | Color |
|----------|--------|-------------|-------|
| 📊 **Avg Message Value** | Average amount per message | `$XXK` | Bronze (Brand) |
| 📈 **Success Rate** | % of sent messages | `XX%` | Green |
| ✅ **Sent Messages** | Count of SENT status | Count | Blue |
| 📑 **Message Types** | Unique message types | Count | Orange |

**Example Display**:
```
[Avg Value: $208K] [Success Rate: 85%] [Sent: 21] [Types: 3]
```

**Calculations**:
- **Avg Message Value**: `total sum / message count / 1000` (in thousands)
- **Success Rate**: `(SENT count / total count) * 100`
- **Sent Messages**: `filter(m => m.status === 'SENT').length`
- **Message Types**: `new Set(messages.map(m => m.messageType)).size`

### Sub-Tab 2: Compliance Alerts
**Focus**: Compliance and regulatory metrics

| KPI Card | Metric | Calculation | Color |
|----------|--------|-------------|-------|
| ✅ **Compliant** | Successfully sent messages | Count | Green |
| ⚠️ **High Value Alerts** | Messages requiring review | Count | Orange |
| 📋 **Under Review** | Pending messages | Count | Blue |
| ✔️ **Compliance Rate** | % of compliant messages | `XX%` | Bronze (Brand) |

**Example Display**:
```
[Compliant: 21] [Alerts: 4] [Under Review: 3] [Rate: 85%]
```

**Calculations**:
- **Compliant**: Same as Sent Messages count
- **High Value Alerts**: Messages > $100K threshold
- **Under Review**: PENDING status messages
- **Compliance Rate**: Same as Success Rate

## User Experience Flow

### Scenario 1: User Viewing All Messages
1. User is on SWIFT Monitoring → "All Messages" sub-tab
2. KPI cards show: **Total Messages, Total Value, Forex Inflow, High Value Txns**
3. User can see overall SWIFT message statistics

### Scenario 2: User Switches to Analytics
1. User clicks **"Analytics & Charts"** sub-tab
2. **KPI cards immediately update** to show: **Avg Value, Success Rate, Sent, Types**
3. Content below shows charts and graphs
4. KPI cards now show analytical metrics relevant to the charts

### Scenario 3: User Checks Compliance
1. User clicks **"Compliance Alerts"** sub-tab
2. **KPI cards immediately update** to show: **Compliant, Alerts, Under Review, Rate**
3. Content below shows compliance information
4. KPI cards now show compliance-related metrics

### Scenario 4: User Returns to All Messages
1. User clicks **"All Messages"** sub-tab again
2. **KPI cards revert** to show: **Total Messages, Total Value, Forex Inflow, High Value**
3. Original overview metrics restored

## Technical Implementation

### State Management
```typescript
const [swiftSubTab, setSwiftSubTab] = useState(0);
```

### KPI Card Rendering Logic
```typescript
const kpiCards = tabValue === 2 ? (
  swiftSubTab === 0 ? [
    // All Messages KPIs
  ] : swiftSubTab === 1 ? [
    // Analytics KPIs
  ] : [
    // Compliance KPIs
  ]
) : // ... other tabs
```

### Sub-Tab Change Handler
```typescript
<SWIFTMonitoringWrapper 
  activeSubTab={swiftSubTab}
  onSubTabChange={setSwiftSubTab} // Updates parent state
/>
```

## Data Flow

```
User clicks "Analytics & Charts" sub-tab
    ↓
SWIFTMonitoringWrapper receives tab change
    ↓
Calls onSubTabChange(1)
    ↓
NBEPortal's setSwiftSubTab(1) updates state
    ↓
NBEPortal re-renders
    ↓
KPI logic evaluates: swiftSubTab === 1 ?
    ↓
Returns Analytics KPIs array
    ↓
KPI cards display: Avg Value, Success Rate, Sent, Types
    ↓
SWIFTMonitoring receives activeSubTab={1}
    ↓
Shows Analytics & Charts content
```

## Files Modified

1. **NBEPortal.tsx** (lines ~1058-1079)
   - Restored dynamic KPI logic with 3 conditional branches
   - Added different KPI calculations for each sub-tab

## Design Principles

### Contextual Relevance
Each sub-tab shows KPIs that are **relevant to the content** being displayed:
- **All Messages**: Overview stats (totals and sums)
- **Analytics**: Analytical metrics (averages and rates)
- **Compliance**: Regulatory metrics (compliance and alerts)

### Consistency
All 4 KPI cards always displayed, just with different:
- Labels
- Values
- Icons (optional - could be varied per sub-tab)
- Colors (maintained for visual consistency)

### Real-Time Updates
KPIs recalculate immediately when:
- Sub-tab changes
- Message data updates
- Filters applied

## Testing Instructions

### Test 1: Sub-Tab 0 - All Messages
1. Navigate to **NBE Portal → SWIFT Monitoring → All Messages**
2. Verify KPI cards show:
   - ✅ Total Messages: (count)
   - ✅ Total Value: ($X.XM)
   - ✅ Forex Inflow: ($X.XM)
   - ✅ High Value Txns: (count)

### Test 2: Sub-Tab 1 - Analytics & Charts
1. Click **"Analytics & Charts"** sub-tab
2. **Watch KPI cards change**
3. Verify KPI cards now show:
   - ✅ Avg Message Value: ($XXK)
   - ✅ Success Rate: (XX%)
   - ✅ Sent Messages: (count)
   - ✅ Message Types: (count)

### Test 3: Sub-Tab 2 - Compliance Alerts
1. Click **"Compliance Alerts"** sub-tab
2. **Watch KPI cards change again**
3. Verify KPI cards now show:
   - ✅ Compliant: (count)
   - ✅ High Value Alerts: (count)
   - ✅ Under Review: (count)
   - ✅ Compliance Rate: (XX%)

### Test 4: Navigation Back
1. Click **"All Messages"** sub-tab
2. **Watch KPI cards revert**
3. Verify original KPIs restored (Total Messages, etc.)

### Test 5: Data Accuracy
1. Count messages in table manually
2. Verify "Total Messages" KPI matches
3. Verify "Sent Messages" (in Analytics) matches green tags in table
4. Verify "High Value" counts match messages > $100K

## Edge Cases

### No Data
When `swiftMessages.length === 0`:
- Total Messages: 0
- Total Value: $0.0M
- Averages: $0K or 0%
- All counts: 0

### Division by Zero
Protected by ternary operators:
```typescript
swiftMessages.length > 0 ? (calculation) : 0
```

### Single Message Type
Message Types KPI will show "1" if all messages same type

### 100% Success Rate
Success Rate and Compliance Rate will show "100%" if all messages sent

## Benefits

1. ✅ **Contextual Information** - Relevant metrics for each view
2. ✅ **Better UX** - Users see metrics that relate to current content
3. ✅ **Data Exploration** - Different perspectives on same dataset
4. ✅ **Consistency** - Always 4 KPI cards, just different content
5. ✅ **Real-Time** - Immediate updates on sub-tab changes

## Success Criteria

✅ KPI cards change when switching SWIFT sub-tabs  
✅ Each sub-tab shows contextually relevant metrics  
✅ All calculations accurate and match table data  
✅ No console errors during sub-tab switching  
✅ Smooth transitions without visual glitches  
✅ Values formatted correctly (M for millions, K for thousands, % for rates)

---

**Status**: ✅ Complete  
**Date**: 2026-10-03  
**Feature**: Dynamic KPI cards for SWIFT Monitoring sub-tabs  
**Sub-Tabs**: 3 (All Messages, Analytics & Charts, Compliance Alerts)  
**KPI Variations**: 3 sets of 4 KPIs each (12 unique metrics)  
**Implementation**: Conditional rendering based on swiftSubTab state
