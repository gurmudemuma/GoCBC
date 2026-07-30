# 🏦 Banks Portal - User Guide
## Commercial Bank of Ethiopia - Trade Finance System

---

## Quick Start

### Your Role: Bank Officer
You manage **Letters of Credit** and **Forex Allocation** for coffee exporters.

### Main Tasks:
1. **Review & Approve LC Requests** from exporters
2. **Issue Letters of Credit** to activate trade finance
3. **Allocate Foreign Exchange** (USD) per NBE policy
4. **Verify Documents** and release payments (coming soon)

---

## Portal Overview

### 3 Main Tabs (Workflow Sequence)

```
┌────────────────────────────────────────────────────────────────┐
│  📊 Dashboard   │   🏦 LC Workflow   │   💱 Forex Allocation   │
└────────────────────────────────────────────────────────────────┘
```

---

## Tab 1: 📊 Dashboard & Quick Actions

### Purpose
See everything at a glance and jump to priority tasks.

### What You'll See
- **KPI Cards**: Total contracts, active LCs, forex allocated, pending approvals
- **Action Cards**: Urgent tasks, ready tasks, next steps
- **Recent Activity**: Last 10 actions across all workflows

### How to Use
- Click any action card to jump directly to that workflow
- Example: Click "🚨 URGENT: Review LCs" → Goes to LC Workflow tab

**TIP:** Start here every morning to see what needs attention!

---

## Tab 2: 🏦 LC Workflow (Request → Approve → Issue)

### Purpose
Manage the complete Letter of Credit lifecycle.

### Sub-sections

#### A. **ECTA-Approved Contracts**
- Lists all contracts approved by ECTA
- Shows which contracts need LCs
- Action: Click "Request LC" to start

#### B. **LCs Pending Approval** (🟠 Orange if any)
- LCs in REQUESTED status
- Waiting for your approval
- Actions:
  - ✅ Approve (moves to next section)
  - ❌ Reject (with reason)
  - 👁️ View Details

**IMPORTANT:** LCs > 48 hours show as URGENT

#### C. **LCs Ready to Issue** (🟢 Green if any)
- LCs in APPROVED status
- Ready for you to issue
- Action: Click "Issue LC" → Enter terms → Submit

#### D. **Active LCs** (🔵 Blue)
- LCs in ISSUED status
- Shows forex allocation status
- If "Forex Pending" → Go to Tab 3

### Workflow Steps
```
Contract → Request LC → Approve LC → Issue LC → Allocate Forex
  (Tab 2)    (Tab 2)      (Tab 2)      (Tab 2)       (Tab 3)
```

---

## Tab 3: 💱 Forex Allocation (50% Retention)

### Purpose
Allocate foreign exchange (USD) to exporters for trade payments.

### ⚠️ LC Pending Alert (If any)
When you issue an LC, it appears here in an **orange warning box**:

```
⚠️ 1 LC Waiting for Forex Allocation

┌──────────────────────────────────────────────────────┐
│ LC1784719332565              [Allocate Forex Button] │
│ Contract: CONTRACT123                                 │
│ Amount: $282,906 USD                                  │
│ Issued: Jan 22, 2026                                  │
└──────────────────────────────────────────────────────┘
```

### How to Allocate Forex

1. **Click "Allocate Forex" button**

2. **Form Pre-fills:**
   - Amount: (from LC)
   - Exchange Rate: 57.50 ETB/USD (current NBE rate)
   - Retention: 50% (NBE policy - locked)
   - Expiry: 90 days (standard)
   - Officer: Your username
   - Approval Ref: Auto-generated

3. **Review and Submit**
   - Check the amount
   - Confirm exchange rate
   - Click "Allocate"

4. **Done!**
   - System creates forex request + allocation automatically
   - LC status updates to FOREX_ALLOCATED
   - Exporter notified to proceed with shipment

### Forex Allocations Table
- View all forex allocations (current and historical)
- Filter by status: Allocated | Pending | Utilized
- Actions: View Details, Print Certificate

### NBE Policy Info
```
ℹ️ NBE Forex Retention Policy (2024)
• 50% retained in USD (exporter keeps in foreign currency account)
• 50% converted to ETB at official rate (mandatory repatriation)
• Forex allocation valid for 90-180 days per directive FXD/01/2024
```

---

## Complete Workflow Example

### Scenario: Approve a new LC and allocate forex

#### Step 1: Start (Tab 2 - LC Workflow)
```
Go to Tab 2
→ See "1 LC Pending Approval"
→ LC1234567 | Exporter123 | $282,906 | Requested: Jan 20
→ Click "Approve LC"
→ Success: "LC Approved"
```

#### Step 2: Issue LC (Still Tab 2)
```
LC moves to "LCs Ready to Issue" section
→ Click "Issue LC"
→ Form pre-fills with LC data
→ Review terms (auto-filled)
→ Click "Submit"
→ Success: "LC Issued"
```

#### Step 3: Allocate Forex (Tab 3)
```
Go to Tab 3
→ See orange alert: "1 LC Waiting for Forex Allocation"
→ LC1234567 shown in alert box
→ Click "Allocate Forex"
→ Form pre-fills:
   • Amount: $282,906
   • Rate: 57.50 ETB/USD
   • Retention: 50%
   • Expiry: 90 days
→ Click "Allocate"
→ Success: "Forex Allocated"
→ Alert disappears
```

#### Step 4: Exporter Ships (Exporter Portal)
```
Exporter receives notification
→ Proceeds with shipment
→ Submits shipping documents
→ You verify documents (future: Tab 4)
→ Release payment
```

**Total Time: <2 minutes**
**Total Clicks: 6**

---

## Common Questions

### Q: I issued an LC. Where do I allocate forex?
**A:** Go to **Tab 3: Forex Allocation**. You'll see an orange alert showing your LC with an "Allocate Forex" button.

### Q: Can I allocate forex without issuing an LC first?
**A:** No. The LC must be ISSUED before forex can be allocated. This ensures proper trade finance compliance.

### Q: What if I don't see my LC in the forex tab?
**A:** Check:
1. Is LC status = "ISSUED"? (Check Tab 2 → Active LCs)
2. Has forex already been allocated? (Check Forex Allocations table)
3. Clear browser cache and refresh (Ctrl+Shift+R)

### Q: Can I edit the retention rate?
**A:** No. The 50% retention rate is mandated by NBE policy and cannot be changed.

### Q: How long is forex valid?
**A:** Standard validity is 90 days, extendable up to 180 days per NBE guidelines.

### Q: Can I allocate forex for multiple LCs at once?
**A:** Currently no. Each LC requires individual forex allocation for audit trail purposes.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Alt + 1` | Go to Dashboard |
| `Alt + 2` | Go to LC Workflow |
| `Alt + 3` | Go to Forex Allocation |
| `Ctrl + F` | Search/Filter |
| `Esc` | Close dialog |

---

## Status Reference

### LC Status Colors
- 🟡 **REQUESTED** - Pending your approval
- 🟢 **APPROVED** - Ready to issue
- 🔵 **ISSUED** - Active, ready for forex
- ✅ **FOREX_ALLOCATED** - Complete, exporter can ship

### Forex Status Colors
- 🟡 **REQUESTED** - Pending allocation
- 🟢 **ALLOCATED** - Active, available for use
- 🔵 **UTILIZED** - Used for trade payment
- ⚪ **EXPIRED** - Validity period ended

---

## Troubleshooting

### Problem: LC not showing in forex tab
**Solution:**
1. Verify LC status is "ISSUED" (Tab 2)
2. Check if forex already allocated (Forex table)
3. Refresh browser (Ctrl+Shift+R)
4. Check browser console for errors (F12)

### Problem: Forex allocation fails
**Solution:**
1. Verify all form fields are filled
2. Check exchange rate is reasonable (40-70 ETB/USD)
3. Ensure expiry date is in the future
4. Check API logs for errors

### Problem: Can't find a specific LC
**Solution:**
1. Use search bar (top of LC table)
2. Check status filter (All | Requested | Approved | Issued)
3. Sort by date (click column header)
4. Clear all filters and try again

---

## Best Practices

### Daily Routine
1. **Morning:** Check Dashboard for urgent items
2. **Review:** Approve pending LCs (Tab 2)
3. **Issue:** Issue approved LCs (Tab 2)
4. **Allocate:** Allocate forex for issued LCs (Tab 3)
5. **Monitor:** Check active LCs and forex status

### Efficiency Tips
- ✅ Use bulk approve for multiple LCs with same conditions
- ✅ Pre-fill templates for common LC terms
- ✅ Allocate forex immediately after issuing LC
- ✅ Monitor expiry dates to avoid lapses

### Compliance Reminders
- ❗ Always verify contract is ECTA-approved before LC request
- ❗ Ensure exporter has valid ECTA license
- ❗ Follow UCP 600 standards for LC terms
- ❗ Adhere to NBE 50% retention policy
- ❗ Document all rejections with clear reasons

---

## Support

### Technical Issues
- **API Errors:** Contact IT support
- **Blockchain Issues:** Contact system administrator
- **Browser Issues:** Clear cache, try different browser

### Workflow Questions
- **LC Procedures:** Refer to UCP 600 guidelines
- **Forex Policy:** Refer to NBE Directive FXD/01/2024
- **ECTA Compliance:** Contact ECTA office

### Documentation
- **Full Workflow:** `BANKS-WORKFLOW-FIXED.md`
- **Redesign Spec:** `BANKS-PORTAL-WORKFLOW-REDESIGN.md`
- **Changes Log:** `BANKS-PORTAL-IMPROVEMENTS-SUMMARY.md`

---

## Recent Updates

### ✅ Version 2.1 (Current)
- **Added:** Orange alert for LCs pending forex allocation
- **Fixed:** Forex allocation now works directly from issued LCs
- **Improved:** Clearer tab labels with workflow sequence
- **Enhanced:** Auto-create forex request when allocating from LC

### Previous Versions
- **v2.0:** Added sub-tabs for LC workflow
- **v1.9:** Integrated SWIFT messaging
- **v1.8:** Initial forex allocation module

---

**Need Help?** Contact your system administrator or refer to the documentation files in the `/goCBC` directory.

**Last Updated:** January 2026

