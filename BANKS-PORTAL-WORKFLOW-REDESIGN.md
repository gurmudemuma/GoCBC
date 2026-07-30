# Banks Portal Workflow Redesign
## Clear, Step-by-Step Banking Operations

### Current Issues
1. **Multiple tabs/sub-tabs causing confusion** - Users don't know where to go
2. **Workflow steps are scattered** - LC Request, Approval, Issue, Forex are in different places
3. **No clear "next action" guidance** - Users must figure out what to do next
4. **Duplicate functionality** - Payment Methods tab vs Banking Operations tab overlap

### Redesigned Workflow Structure

## **NEW SIMPLIFIED STRUCTURE**

### Main Navigation (5 Clear Steps)
```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard  │  1. Contracts  │  2. LC  │  3. Forex  │  4. Docs  │
└─────────────────────────────────────────────────────────────┘
```

---

## **TAB 1: DASHBOARD** 📊
**Purpose:** Overview of all banking operations

### KPI Cards (4)
- Total Contracts Available
- Active Letters of Credit  
- Forex Allocated (USD)
- Pending Approvals

### Action Cards (3 Prioritized)
1. **🚨 URGENT: Review LCs** (Orange)
   - Shows: Count of LCs in REQUESTED status > 48hrs
   - Action: "Review & Approve" → Goes to Tab 2

2. **✅ READY: Issue LCs** (Green)
   - Shows: Count of LCs in APPROVED status
   - Action: "Issue Letters of Credit" → Goes to Tab 2

3. **💰 NEXT: Allocate Forex** (Blue)
   - Shows: Count of ISSUED LCs without forex
   - Action: "Allocate Foreign Exchange" → Goes to Tab 3

### Workflow Guide
Visual stepper showing: Contract → Request → Approve → Issue → Forex → Verify → Pay

### Recent Activity Table
Last 10 actions across all workflows

---

## **TAB 2: 1. SELECT CONTRACT** 📄
**Purpose:** Starting point - choose which contract to work with

### What's Displayed
- Table of ALL ECTA-approved contracts
- Columns: Contract ID, Exporter, Buyer, Coffee Type, Quantity, Value, Status
- Each row shows NEXT ACTION button

### Actions Available
For each contract:
- If NO LC exists: **"Request LC"** button (golden)
- If LC REQUESTED: **"View LC"** button → goes to Tab 2
- If LC exists: Show LC status badge + "View Details" link

### Smart Indicators
- 🟢 Ready for LC (no LC yet)
- 🟡 LC In Progress (REQUESTED/APPROVED)
- 🔵 LC Active (ISSUED)
- ✅ Complete (Forex allocated)

---

## **TAB 3: 2. MANAGE LC** 🏦
**Purpose:** Request, Approve, and Issue Letters of Credit

### Sub-sections (Expandable Cards)

#### A. **Contracts Awaiting LC** (Yellow Alert)
- Shows contracts with NO LC yet
- Button: "Request LC" → Opens dialog pre-filled

#### B. **LCs Pending Approval** (Orange Alert if >0)
- Table of REQUESTED LCs
- Columns: LC ID, Contract, Exporter, Amount, Request Date, Days Waiting
- Actions: 
  - ✅ "Approve" (green button)
  - ❌ "Reject" (red outline button)
  - 👁️ "View Details"
- Bulk selection available

#### C. **LCs Ready to Issue** (Green Alert if >0)
- Table of APPROVED LCs
- Columns: LC ID, Contract, Amount, Approval Date
- Actions:
  - 📝 "Issue LC" → Opens dialog for terms/conditions
  - 👁️ "View Details"

#### D. **Active LCs** (Blue Info)
- Table of ISSUED LCs
- Shows: LC ID, Status, Amount, Issue Date, Forex Status
- Forex Status column:
  - 🟡 "Forex Pending" → Link to Tab 4
  - 🟢 "Forex Allocated" → Checkmark
- Actions:
  - 👁️ "View Details"
  - 📊 "View Audit Trail"

### Workflow Hints (Always Visible)
```
Current Step: Approve LC
✅ LC Requested → ⏳ Approve LC → ⬜ Issue LC → ⬜ Allocate Forex
Next: After approval, click "Issue LC" to activate the Letter of Credit
```

---

## **TAB 4: 3. ALLOCATE FOREX** 💱
**Purpose:** Allocate foreign exchange for issued LCs

### Priority Alert (If any pending)
```
⚠️ 3 LCs Waiting for Forex Allocation
These LCs have been issued and require forex allocation before exporters can ship.
```

Shows expandable list of each LC:
- LC ID | Contract | Amount | Issue Date | [Allocate Forex Button]

### Forms Section
When "Allocate Forex" clicked:
- Pre-filled form with LC data
- Amount (from LC)
- Exchange Rate (default: 57.50 ETB/USD - editable)
- Retention Rate (locked at 50% per NBE policy)
- Expiry Date (default: 90 days)
- Bank Officer (current user)
- Approval Reference (auto-generated)

### Forex Allocations Table
- Columns: Forex ID, LC ID, Contract, Amount, Rate, Retention, Status, Date
- Filter by status: All | Allocated | Pending | Utilized
- Actions: View Details, Print Certificate

### NBE Policy Info Box
```
ℹ️ NBE Forex Retention Policy (2024)
50% retained in USD | 50% converted to ETB at official rate
Forex allocation valid for 90-180 days per directive FXD/01/2024
```

---

## **TAB 5: 4. VERIFY DOCUMENTS** 📋
**Purpose:** Document verification and payment release

### Pending Documents (Orange if >0)
- Table of shipments with documents submitted
- Columns: Payment ID, LC ID, Exporter, Documents, Submission Date
- Document Icons: ✅ Bill of Lading, ✅ Invoice, ❌ Certificate (example)
- Actions:
  - 📄 "Review Documents"
  - ✅ "Approve & Release Payment"
  - ❌ "Reject (Discrepancy)"

### Document Review Dialog
When clicked:
- Checklist of required documents
- View/download each document
- Compliance checks (automated)
- Discrepancy notes field
- Actions: Approve | Request Clarification | Reject

### Completed Verifications
- Table of approved documents
- Payment status tracking

---

## **REMOVED / CONSOLIDATED**

### ❌ Removed
- "Payment Methods (View Only)" tab - confusing, read-only
- Multiple sub-tab layers - flattened to main tabs
- Separate forex request workflow - integrated into LC workflow

### ✅ Consolidated
- All LC operations in ONE place (Tab 2)
- All Forex operations in ONE place (Tab 3)
- SWIFT messages moved to a dedicated "Messages" menu item (optional)

---

## **KEY IMPROVEMENTS**

### 1. **Clear Next Actions**
Every screen shows "WHAT TO DO NEXT" prominently

### 2. **Status-Based Filtering**
Automatic filtering by status with counts

### 3. **Workflow Progress Indicators**
Visual progress bars showing where you are in the process

### 4. **Smart Pre-filling**
Forms auto-fill from previous steps (LC → Forex)

### 5. **Inline Guidance**
Contextual help text on every screen

### 6. **Action Prioritization**
Urgent items (>48hrs) highlighted in orange
Ready items (approved) in green
Next steps in blue

### 7. **One-Click Actions**
From dashboard, jump directly to relevant screen with context

---

## **IMPLEMENTATION PLAN**

### Phase 1: Core Structure ✅
- [x] Add workflow state management
- [ ] Create new main navigation
- [ ] Build dashboard with action cards

### Phase 2: LC Management 
- [ ] Consolidate contracts + LC into single workflow
- [ ] Add status-based sections
- [ ] Implement inline actions

### Phase 3: Forex Integration
- [ ] Auto-detect LCs needing forex
- [ ] Pre-fill forex forms from LC data
- [ ] Add forex allocation tracking

### Phase 4: Polish
- [ ] Add workflow progress indicators
- [ ] Implement smart hints
- [ ] Add keyboard shortcuts
- [ ] Mobile responsive layout

---

## **USER JOURNEY EXAMPLE**

### Scenario: Process a new export contract

1. **Login → Dashboard**
   - See "38 Forex Pending" in blue card
   - Click "Allocate Foreign Exchange"

2. **Lands on Tab 3: Forex**
   - Orange alert shows "3 LCs Waiting for Forex"
   - See LC LC1784719332565 in list
   - Click "Allocate Forex"

3. **Form Opens (Pre-filled)**
   - Amount: $282,906 (from LC)
   - Rate: 57.50 ETB/USD
   - Retention: 50% (locked)
   - Review and click "Allocate"

4. **Success**
   - Confirmation message
   - Dashboard updates: "37 Forex Pending"
   - Exporter notified to proceed with shipment

**Total clicks: 2** (Dashboard action → Allocate button)
**Time: <30 seconds**

---

## **VISUAL DESIGN PRINCIPLES**

### Colors
- 🟠 **Orange** - Urgent (>48hrs, needs immediate attention)
- 🟢 **Green** - Ready (approved, can proceed)
- 🔵 **Blue** - Next Step (what to do after current task)
- 🟡 **Yellow** - New/Pending (just submitted, awaiting review)
- ⚪ **Gray** - Completed/Inactive

### Layout
- **Left to Right Workflow** - Tabs ordered 1→2→3→4 matching process flow
- **Top Action Cards** - Most important actions always visible
- **Expandable Sections** - Reduce clutter, expand on demand
- **Inline Actions** - Buttons next to each row, no separate screens

### Typography
- **Bold Numbers** - KPIs and counts stand out
- **ALL CAPS** - Tab labels and section headers
- **Regular** - Body text and descriptions
- **Mono** - IDs, references, amounts

---

## **SUCCESS METRICS**

- ✅ Reduce clicks to complete LC workflow from 8 → 3
- ✅ Eliminate "where do I go next?" questions
- ✅ 100% of users know which tab to use for each action
- ✅ Zero duplicate functionality across tabs
- ✅ All pending actions visible from dashboard

