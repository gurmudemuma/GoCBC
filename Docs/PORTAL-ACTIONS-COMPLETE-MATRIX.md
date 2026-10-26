# Complete Portal Actions Matrix

**Date**: July 13, 2026  
**Purpose**: Ensure ALL portals have complete, visible, and functional action buttons

---

## Action Buttons Matrix

### **1. EXPORTER PORTAL**

#### **Contracts Table**
| Status | Actions |
|--------|---------|
| DRAFT | ✏️ Edit, 🗑️ Delete, 📄 View |
| REGISTERED | 👁️ View, 📥 Download PDF |
| APPROVED | 👁️ View, 📥 Download, 💱 Request Forex, 📋 Request LC |
| LC_ISSUED | 👁️ View, 🚢 Ship Coffee |
| SHIPPED | 👁️ View, 📦 Track Shipment |
| COMPLETED | 👁️ View, 📥 Download |

#### **LC Applications Table**
| Status | Actions |
|--------|---------|
| PENDING | 👁️ View, ✏️ Edit, ❌ Cancel |
| APPROVED | 👁️ View, 📥 Download |
| ISSUED | 👁️ View, 📥 Download LC Copy |
| UTILIZED | 👁️ View |

#### **Forex Requests Table**
| Status | Actions |
|--------|---------|
| REQUESTED | 👁️ View, ❌ Cancel |
| ALLOCATED | 👁️ View, 💰 Utilize |
| UTILIZED | 👁️ View |

---

### **2. ECTA PORTAL** (Ethiopian Coffee & Tea Authority)

#### **Exporter Applications Table**
| Status | Actions |
|--------|---------|
| PENDING | 👁️ View, ✅ Approve, ❌ Reject, 🧪 Request Samples |
| APPROVED | 👁️ View, 📄 Issue Certificate, ⚠️ Suspend |
| REJECTED | 👁️ View Only |

#### **Registered Exporters Table**
| Status | Actions |
|--------|---------|
| ACTIVE | 👁️ View, 🧪 Quality Control, 📋 Issue Permit, ⚠️ Suspend |
| SUSPENDED | 👁️ View, ✅ Activate, 📋 View History |

#### **Quality Inspections Table**
| Status | Actions |
|--------|---------|
| PENDING | 👁️ View, ✅ Pass, ❌ Fail, 🔬 Lab Test |
| PASSED | 👁️ View, 📄 Issue Certificate |
| FAILED | 👁️ View, 🔄 Re-inspect |

---

### **3. BANKS PORTAL**

#### **LC Requests Table**
| Status | Actions |
|--------|---------|
| REQUESTED | 👁️ View, ✅ Approve, ❌ Reject, 💬 Request More Info |
| APPROVED | 👁️ View, 📄 Issue LC, ✏️ Set Terms |
| ISSUED | 👁️ View, ✏️ Amend, 📄 Download |
| UTILIZED | 👁️ View, 💰 Process Payment |

#### **Forex Allocations Table** (NEW - Banks allocate)
| Status | Actions |
|--------|---------|
| REQUESTED | 👁️ View, ✅ Allocate, ❌ Reject |
| ALLOCATED | 👁️ View, 📄 Certificate |
| UTILIZED | 👁️ View |

#### **Payments Table**
| Status | Actions |
|--------|---------|
| PENDING | 👁️ View, ✅ Process, ❌ Hold |
| PROCESSING | 👁️ View, 📊 Track |
| COMPLETED | 👁️ View, 📄 Receipt |

---

### **4. NBE PORTAL** (National Bank of Ethiopia)

#### **Exchange Rates Table**
| Status | Actions |
|--------|---------|
| ACTIVE | 👁️ View, ✏️ Update, 📊 History |
| SUPERSEDED | 👁️ View Only |

#### **Forex Monitoring Table** (Read-only monitoring)
| Status | Actions |
|--------|---------|
| ALL | 👁️ View, 📊 Analytics, 📄 Export Report |

#### **Bank Compliance Table**
| Bank | Actions |
|------|---------|
| ALL | 👁️ View Details, 📊 Compliance Report, ⚠️ Issue Warning |

---

### **5. CUSTOMS PORTAL**

#### **Declarations Table**
| Status | Actions |
|--------|---------|
| SUBMITTED | 👁️ View, ✅ Approve, ❌ Hold, 🔍 Inspect |
| INSPECTING | 👁️ View, ✅ Clear, ❌ Seize |
| APPROVED | 👁️ View, 📄 Release Order |
| CLEARED | 👁️ View |

#### **Shipments Table**
| Status | Actions |
|--------|---------|
| PENDING_CLEARANCE | 👁️ View, 🔍 Inspect, ✅ Clear |
| CLEARED | 👁️ View, 📄 Certificate |

---

### **6. SHIPPING PORTAL**

#### **Shipments Table**
| Status | Actions |
|--------|---------|
| BOOKED | 👁️ View, ✏️ Edit, 📄 Issue B/L or AWB |
| IN_TRANSIT | 👁️ View, 📍 Update Location, 📊 Track |
| ARRIVED | 👁️ View, ✅ Confirm Delivery |
| DELIVERED | 👁️ View, 📄 POD (Proof of Delivery) |

---

## Implementation Checklist

### **Priority 1: Critical Actions** (Users blocked without these)

- [ ] **EXPORTER**: Request LC button when contract APPROVED
- [ ] **EXPORTER**: Request Forex button when contract APPROVED
- [ ] **ECTA**: Approve/Reject buttons for PENDING applications
- [ ] **ECTA**: Issue Certificate button for ACTIVE exporters
- [ ] **BANKS**: Approve/Reject LC requests
- [ ] **BANKS**: Allocate Forex button (NEW)
- [ ] **BANKS**: Issue LC button when APPROVED
- [ ] **CUSTOMS**: Approve/Clear buttons for declarations
- [ ] **SHIPPING**: Issue B/L/AWB buttons

### **Priority 2: Important Actions** (Workflow completion)

- [ ] **EXPORTER**: Edit/Cancel buttons for drafts
- [ ] **ECTA**: Quality control/inspection actions
- [ ] **BANKS**: Amendment buttons for LCs
- [ ] **BANKS**: Payment processing buttons
- [ ] **NBE**: Exchange rate update buttons
- [ ] **CUSTOMS**: Inspection workflow actions
- [ ] **SHIPPING**: Location update buttons

### **Priority 3: Nice-to-Have** (Enhanced UX)

- [ ] Download/Export buttons
- [ ] Print buttons
- [ ] Share/Notify buttons
- [ ] Bulk actions (select multiple)
- [ ] Quick filters
- [ ] Action history

---

## Common Issues & Fixes

### **Issue 1: Buttons Not Visible**
**Symptoms**: Action column exists but empty  
**Causes**:
1. Conditional rendering hiding all buttons
2. Status doesn't match any condition
3. Data doesn't have expected fields

**Fix**:
```tsx
// WRONG - All conditions might fail
{params.row.status === 'PENDING' && <Button>Approve</Button>}

// RIGHT - Always show View, conditionally show others
<>
  <Button>View</Button>
  {params.row.status === 'PENDING' && <Button>Approve</Button>}
  {params.row.status === 'PENDING' && <Button>Reject</Button>}
</>
```

### **Issue 2: Buttons Don't Work**
**Symptoms**: Click does nothing  
**Causes**:
1. Event propagation issues
2. Missing handler functions
3. API calls not wired up

**Fix**:
```tsx
// WRONG
<Button onClick={() => alert('Not implemented')}>

// RIGHT
<Button onClick={(e) => {
  e.stopPropagation();
  handleApprove(params.row);
}}>
```

### **Issue 3: Buttons Show for Wrong Status**
**Symptoms**: Actions available when they shouldn't be  
**Causes**:
1. Status check logic wrong
2. Multiple status values not handled

**Fix**:
```tsx
// WRONG
{params.row.status === 'PENDING' && <ApproveButton />}

// RIGHT
{['PENDING', 'UNDER_REVIEW'].includes(params.row.status) && <ApproveButton />}
```

---

## Testing Script

For each portal, verify:

```javascript
// 1. Check action column exists
const actionColumn = columns.find(c => c.field === 'actions');
console.assert(actionColumn !== undefined, 'Action column missing');

// 2. Check buttons render
const row = getTestRow();
const buttons = actionColumn.renderCell({ row });
console.assert(buttons !== null, 'No buttons rendered');

// 3. Check at least View button exists
console.assert(
  buttons.props.children.some(b => b.props.title?.includes('View')),
  'View button missing'
);

// 4. Check status-specific buttons
if (row.status === 'PENDING') {
  console.assert(
    buttons.props.children.some(b => b.props.title?.includes('Approve')),
    'Approve button missing for PENDING status'
  );
}
```

---

## Next Steps

1. **Audit each portal** - Check actions matrix against implementation
2. **Add missing buttons** - Implement critical actions first
3. **Test workflows** - Verify end-to-end with real data
4. **Add tooltips** - Clear action descriptions
5. **Add confirmations** - Prevent accidental actions
6. **Add success/error feedback** - User knows what happened

---
