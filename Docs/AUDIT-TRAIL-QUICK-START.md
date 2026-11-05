# Audit Trail - Quick Start Guide 🚀

## For End Users

### How to Access Audit Trail

| Portal | How to Access |
|--------|---------------|
| **ECTA Portal** | Login → Click **Tab 6: "Audit Trail"** |
| **Banks Portal** | Login → Click **Tab 6: "Audit Trail"** |
| **NBE Portal** | Login → Click **Tab 6: "Audit Trail"** |
| **Customs Portal** | Login → Click **Tab 7: "Audit Trail"** |
| **Exporter Portal** | Login → Click **Tab 6: "Audit Trail"** |
| **Admin Portal** | Login → Click **Tab 5: "Audit Trail"** |

---

## What You'll See

### Statistics Dashboard (Top of Page)
```
┌─────────────────────────────────────────────────────┐
│  Total Transactions: 127                            │
│  By Action: APPROVE (45), REJECT (8), VIEW (74)    │
│  By Entity: CONTRACT (53), DOCUMENT (74)           │
└─────────────────────────────────────────────────────┘
```

### Audit Trail Table
```
┌──────────────┬──────────┬─────────┬──────────────┬─────────────┬──────────────────────┐
│ Entity Type  │ Action   │ User    │ Organization │ Old → New   │ Timestamp            │
├──────────────┼──────────┼─────────┼──────────────┼─────────────┼──────────────────────┤
│ CONTRACT     │ APPROVE  │ admin   │ ECTAMSP      │ REG → APR   │ 2026-08-11 14:30:22  │
│ DOCUMENT     │ VIEW     │ user123 │ BANKSMSP     │ N/A → N/A   │ 2026-08-11 14:25:15  │
│ LC           │ CREATE   │ banker  │ BANKSMSP     │ N/A → ISSUE │ 2026-08-11 14:20:08  │
└──────────────┴──────────┴─────────┴──────────────┴─────────────┴──────────────────────┘
```

---

## Features

### ✅ Auto-Refresh
The table automatically refreshes **every 60 seconds** to show the latest transactions.

### 🔍 Filter by Action
Click the **"Action Filter"** dropdown to show only:
- All Actions
- APPROVE
- REJECT
- CREATE
- UPDATE
- VIEW
- DELETE

### 📄 Pagination
- Change rows per page: **5, 10, 25, 50, 100**
- Navigate pages with **< >** arrows
- See total count at bottom

### 📊 Color Coding
- **Green** ✅ - APPROVE, CREATE, ACTIVATE
- **Red** ❌ - REJECT, DELETE, SUSPEND
- **Orange** ⚠️ - UPDATE, EDIT
- **Blue** ℹ️ - VIEW, INFO

---

## Common Use Cases

### 1. Check if My Contract Was Approved
1. Go to Audit Trail tab
2. Look for your Contract ID in the table
3. Find row with Action = "APPROVE"
4. Check timestamp to see when it was approved

### 2. See Who Viewed a Document
1. Go to Audit Trail tab
2. Filter by Action = "VIEW"
3. Find the Document ID
4. See username and timestamp

### 3. Track Payment Processing
1. Go to Audit Trail tab (Banks or NBE)
2. Search for LC or PAYMENT entries
3. See complete lifecycle: CREATE → VERIFY → APPROVE → SETTLE

### 4. Monitor Recent Activity (Admin)
1. Go to Admin Portal → Tab 5
2. See ALL transactions from ALL portals
3. Monitor system-wide activity
4. Detect unusual patterns

---

## What Gets Logged?

### Automatically Logged Actions

| Portal | Actions Logged |
|--------|----------------|
| **ECTA** | Contract approvals/rejections, Quality inspections, Permit issuance, Document views |
| **Banks** | LC issuance, LC amendments, Payment releases, Document examinations |
| **NBE** | Forex allocations, Contract approvals, Exchange rate updates |
| **Customs** | Shipment clearances, Customs declarations, Inspection results |
| **Exporter** | Contract registrations, Shipment bookings, Document uploads |
| **Admin** | User management, System configuration, Role assignments |

---

## Troubleshooting

### "No Data Available"
- ✅ This is normal if no transactions have occurred yet
- ✅ Perform an action (approve contract, view document) to populate data
- ✅ Wait 60 seconds for auto-refresh

### "Failed to Load"
- ❌ Check internet connection
- ❌ Verify you're logged in
- ❌ Contact system administrator

### "Empty Statistics"
- ✅ Normal for new systems or quiet periods
- ✅ Statistics update as actions occur

---

## Tips & Tricks

### 💡 Tip 1: Use Filter for Quick Search
Instead of scrolling through all logs, filter by action type to find what you need quickly.

### 💡 Tip 2: Check Timestamps
All timestamps are in your local timezone. Use them to track when actions occurred.

### 💡 Tip 3: Monitor Auto-Refresh
The table refreshes automatically every 60 seconds. You'll see new entries appear without clicking anything.

### 💡 Tip 4: Admin Portal Sees Everything
If you need to see actions across ALL portals, use Admin Portal → Tab 5.

### 💡 Tip 5: Old Value → New Value
Look at the "Old → New" column to see state changes (e.g., "PENDING → APPROVED").

---

## Security & Privacy

### What's Tracked?
- ✅ Action type (what you did)
- ✅ Entity involved (which contract, LC, etc.)
- ✅ Your username
- ✅ Your organization
- ✅ Timestamp
- ✅ IP address (for security)

### Why Track This?
- **Accountability** - Know who did what
- **Transparency** - Clear audit trail
- **Compliance** - Meet regulatory requirements
- **Security** - Detect suspicious activity
- **Dispute Resolution** - Prove what happened

### Can I Delete My Actions?
❌ **No.** Audit logs are immutable for compliance and security.  
Once an action is logged, it cannot be modified or deleted.

---

## FAQs

**Q: How long are audit logs kept?**  
A: Minimum 90 days, configurable by system administrator.

**Q: Can I export audit logs?**  
A: Not yet, but it's a planned feature. Contact admin for manual exports.

**Q: Why don't I see other users' actions?**  
A: You only see actions relevant to your portal/organization. Admin sees everything.

**Q: What's the difference between PostgreSQL and Blockchain logs?**  
A: PostgreSQL logs user actions, Blockchain logs system transactions. The audit trail combines both.

**Q: Can audit logs be tampered with?**  
A: No. They're stored in immutable database records with blockchain verification for critical actions.

**Q: Does logging slow down the system?**  
A: No. Audit logging is non-blocking and has zero performance impact.

---

## Need Help?

### Contact Support
- **Email:** support@cecbs.et
- **Phone:** +251-XXX-XXX-XXX
- **Portal:** Help → Submit Ticket

### Admin Support
- **System Admin:** admin@cecbs.et
- **Technical Support:** tech@cecbs.et

---

## Quick Reference Card

```
╔════════════════════════════════════════════════════════╗
║              AUDIT TRAIL QUICK REFERENCE               ║
╠════════════════════════════════════════════════════════╣
║  Access: Your Portal → Tab "Audit Trail"              ║
║  Refresh: Automatic every 60 seconds                   ║
║  Filter: Dropdown menu for action types               ║
║  Pages: Change rows/page at bottom                     ║
╠════════════════════════════════════════════════════════╣
║  GREEN ✅  = Approved/Created/Activated                ║
║  RED ❌    = Rejected/Deleted/Suspended                ║
║  ORANGE ⚠️ = Updated/Edited                            ║
║  BLUE ℹ️   = Viewed/Info                               ║
╠════════════════════════════════════════════════════════╣
║  Admin Portal = See ALL transactions                   ║
║  User Portals = See only relevant transactions         ║
╚════════════════════════════════════════════════════════╝
```

---

**That's it! You're ready to use the Audit Trail! 🎉**

For detailed documentation, see:
- `ALL-PORTALS-AUDIT-TRAIL-COMPLETE.md`
- `AUDIT-TRAIL-REAL-DATA-GUIDE.md`

---

**Last Updated:** August 11, 2026  
**Version:** 1.0
