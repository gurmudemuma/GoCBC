# NBE Portal - Dynamic KPI Cards Visual Guide

## Tab 0: Forex Monitoring

### View 1: All Forex (forexSubTab = 0)
```
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ 📋 Total Requests   │ │ ✅ Allocated        │ │ ⚠️  Requested       │ │ 📈 Total Value      │
│     (clickable)     │ │   (clickable)       │ │   (clickable)       │ │                     │
│        150          │ │        120          │ │         30          │ │     $45.2M          │
│   #9b30b7 purple    │ │   #4caf50 green     │ │   #ff9800 orange    │ │   #2196f3 blue      │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
       (default)              onClick→1               onClick→2
```

### View 2: Allocated Forex (forexSubTab = 1)
```
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ ✅ Allocated        │ │ 💰 Allocated Amt    │ │ 📈 Avg Retention    │ │ 📋 Back to All      │
│                     │ │                     │ │                     │ │   (clickable)       │
│        120          │ │      $38.5M         │ │        42%          │ │        150          │
│   #4caf50 green     │ │   #4caf50 green     │ │   #2196f3 blue      │ │   #9b30b7 purple    │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
                                                                                onClick→0
```

### View 3: Requested Forex (forexSubTab = 2)
```
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ ⚠️  Pending Requests│ │ 💰 Requested Amt    │ │ ✅ Ready for Approval│ │ 📋 Back to All      │
│                     │ │                     │ │                     │ │   (clickable)       │
│         30          │ │       $9.5M         │ │         30          │ │        150          │
│   #ff9800 orange    │ │   #ff9800 orange    │ │   #4caf50 green     │ │   #9b30b7 purple    │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
                                                                                onClick→0
```

---

## Tab 2: SWIFT Monitoring

### View 1: All SWIFT (swiftSubTab = 0)
```
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ ✈️  All Messages    │ │ ✅ Sent             │ │ ⚠️  Pending         │ │ 📈 Today            │
│   (clickable)       │ │   (clickable)       │ │   (clickable)       │ │                     │
│        500          │ │        450          │ │         45          │ │         23          │
│   #9b30b7 purple    │ │   #4caf50 green     │ │   #ff9800 orange    │ │   #2196f3 blue      │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
       onClick→0             onClick→2               onClick→1
```

### View 2: Pending SWIFT (swiftSubTab = 1)
```
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ ⚠️  Pending         │ │ ⏰ Awaiting Action  │ │ 🔴 Priority         │ │ ✈️  Back to All     │
│                     │ │                     │ │                     │ │   (clickable)       │
│         45          │ │         45          │ │         12          │ │        500          │
│   #ff9800 orange    │ │   #ff9800 orange    │ │   #f44336 red       │ │   #9b30b7 purple    │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
                                                                                onClick→0
```

### View 3: Sent SWIFT (swiftSubTab = 2)
```
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ ✅ Sent Messages    │ │ 📈 Success Rate     │ │ 📊 This Week        │ │ ✈️  Back to All     │
│                     │ │                     │ │                     │ │   (clickable)       │
│        450          │ │        90%          │ │        125          │ │        500          │
│   #4caf50 green     │ │   #4caf50 green     │ │   #2196f3 blue      │ │   #9b30b7 purple    │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
                                                                                onClick→0
```

### View 4: Failed SWIFT (swiftSubTab = 3)
```
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ ❌ Failed Messages  │ │ ⚠️  Requires Retry  │ │ 📊 Error Rate       │ │ ✈️  Back to All     │
│                     │ │                     │ │                     │ │   (clickable)       │
│          5          │ │          5          │ │       1.0%          │ │        500          │
│   #f44336 red       │ │   #ff9800 orange    │ │   #f44336 red       │ │   #9b30b7 purple    │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
                                                                                onClick→0
```

---

## Tab 4: Analytics

### View 1: Overview (analyticsSubTab = 0)
```
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ 📊 Total Contracts  │ │ 💰 Export Value     │ │ 💱 Forex Allocated  │ │ ✈️  SWIFT Messages  │
│                     │ │                     │ │                     │ │                     │
│        230          │ │      $75.0M         │ │        120          │ │        500          │
│   #1976d2 blue      │ │   #4caf50 green     │ │   #ff9800 orange    │ │   #9c27b0 purple    │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

### View 2: Trends (analyticsSubTab = 1)
```
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ 📈 Monthly Growth   │ │ 💰 Avg Contract     │ │ 💱 Forex Utilization│ │ ✅ Completion Rate  │
│                     │ │                     │ │                     │ │                     │
│      +12.5%         │ │       $326K         │ │        80%          │ │        87%          │
│   #4caf50 green     │ │   #2196f3 blue      │ │   #ff9800 orange    │ │   #9c27b0 purple    │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

### View 3: Breakdown (analyticsSubTab = 2)
```
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│ 📁 By Status        │ │ 💰 Avg LC Amount    │ │ ✈️  By Transport    │ │ 🌍 Top Destination  │
│                     │ │                     │ │                     │ │                     │
│    52% Approved     │ │       $317K         │ │      15% Air        │ │      Germany        │
│   #4caf50 green     │ │   #2196f3 blue      │ │   #ff9800 orange    │ │   #1976d2 blue      │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

---

## Color Coding

```
Brand Purple:  #9b30b7  (NBE brand, default, "All" views)
Green:         #4caf50  (Success, Allocated, Sent, Approved)
Orange:        #ff9800  (Warning, Pending, Requested)
Blue:          #2196f3  (Info, Totals, Metrics)
Dark Blue:     #1976d2  (Analytics, Primary)
Purple:        #9c27b0  (Secondary, SWIFT)
Red:           #f44336  (Error, Failed, Critical)
```

---

## Interaction Patterns

### Pattern 1: Drill-down (Forward Navigation)
```
Main View (All) → Click "Allocated" → Allocated View
              → Click "Requested" → Requested View
              → Click "Pending" → Pending View
```

### Pattern 2: Breadcrumb (Backward Navigation)
```
Filtered View → Click "Back to All" → Main View (All)
```

### Pattern 3: Sub-tab Navigation
```
Overview → Click "Trends" tab → Trends View
       → Click "Breakdown" tab → Breakdown View
       → Click "Overview" tab → Overview View
```

---

## Visual Indicators

### Clickable Cards:
- 🖱️  Pointer cursor on hover
- ⬆️  Lifts 4px on hover (vs 2px for non-clickable)
- 💫 Deeper shadow: `0 6px 12px` (vs `0 4px 8px`)

### Non-clickable Cards:
- 🖰  Default cursor
- ⬆️  Lifts 2px on hover
- 💫 Lighter shadow: `0 4px 8px`

---

## Real-time Calculations

All KPI values are calculated from live data:

```typescript
// Total forex value
forexAllocations.reduce((sum, f) => sum + (f.allocatedAmount || 0), 0) / 1000000

// Average retention
allocatedForex.reduce((sum, f) => sum + f.retentionRate, 0) / allocatedForex.length

// Success rate
(sentMessages.length / allMessages.length) * 100

// Approval percentage
(approvedContracts.length / allContracts.length) * 100
```

---

## State Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│              NBEPortal Component                    │
│                                                     │
│  State:                                             │
│  - tabValue (main tab: 0-7)                         │
│  - forexSubTab (0-2)                                │
│  - swiftSubTab (0-3)                                │
│  - analyticsSubTab (0-2)                            │
│                                                     │
│  ┌───────────────────────────────────────────┐     │
│  │ KPI Cards Section (Dynamic)               │     │
│  │                                           │     │
│  │ if (tabValue === 0) {                     │     │
│  │   if (forexSubTab === 0) → All Forex KPIs│     │
│  │   if (forexSubTab === 1) → Allocated KPIs│     │
│  │   if (forexSubTab === 2) → Requested KPIs│     │
│  │ }                                         │     │
│  │                                           │     │
│  │ if (tabValue === 2) {                     │     │
│  │   if (swiftSubTab === 0) → All SWIFT KPIs│     │
│  │   if (swiftSubTab === 1) → Pending KPIs  │     │
│  │   if (swiftSubTab === 2) → Sent KPIs     │     │
│  │   if (swiftSubTab === 3) → Failed KPIs   │     │
│  │ }                                         │     │
│  │                                           │     │
│  │ if (tabValue === 4) {                     │     │
│  │   if (analyticsSubTab === 0) → Overview  │     │
│  │   if (analyticsSubTab === 1) → Trends    │     │
│  │   if (analyticsSubTab === 2) → Breakdown │     │
│  │ }                                         │     │
│  └───────────────────────────────────────────┘     │
│                                                     │
│  ┌───────────────────────────────────────────┐     │
│  │ Tab Content                               │     │
│  │                                           │     │
│  │ <TabPanel value={tabValue} index={4}>     │     │
│  │   <AnalyticsDashboard                     │     │
│  │     activeSubTab={analyticsSubTab}        │     │
│  │     onSubTabChange={setAnalyticsSubTab}   │     │
│  │   />                                      │     │
│  │ </TabPanel>                               │     │
│  └───────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────┘
```

---

## Summary

**Before:** Static KPI cards, no sub-tab awareness  
**After:** Dynamic KPI cards that update based on:
- Main tab selection (tabValue)
- Sub-tab selection (forexSubTab, swiftSubTab, analyticsSubTab)
- User clicks on interactive KPI cards

**Result:** Rich, contextual data exploration experience! 🎉
