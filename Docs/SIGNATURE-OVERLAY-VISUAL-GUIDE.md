# Signature Overlay - Visual Guide

## How It Looks in Action

### 1. Document Viewer Without Signatures
```
┌────────────────────────────────────────────────────────┐
│  📄 Commercial Invoice                          [Close] │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────┐     │
│  │                                               │     │
│  │                                               │     │
│  │         [PDF Document Preview]               │     │
│  │                                               │     │
│  │                                               │     │
│  │                                               │     │
│  └──────────────────────────────────────────────┘     │
│                                                         │
└────────────────────────────────────────────────────────┘
```

### 2. Document Viewer With ONE Signature
```
┌────────────────────────────────────────────────────────┐
│  📄 Packing List                                [Close] │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────┐     │
│  │                                               │     │
│  │                                               │     │
│  │         [PDF Document Preview]               │     │
│  │                                               │     │
│  │                               ┌──────────────┐│     │
│  │                               │ ✓  APPROVED ▼││     │
│  └───────────────────────────────│  bankAdmin   │┘     │
│                                  │  BANKS       │      │
│                                  │  Sep 28, 2:15│      │
│                                  └──────────────┘      │
│                                  ┌──────────────┐      │
│                                  │📄 Packing... │      │
│                                  │ 1 Signature  │      │
│                                  └──────────────┘      │
└────────────────────────────────────────────────────────┘
```

### 3. Signature Badge - EXPANDED State
```
┌────────────────────────────────────┐
│ ✓  APPROVED                      ▲│  ← Click to collapse
│    bankAdmin                       │
│    BANKS                           │
│    Sep 28, 2026, 08:15 AM         │
├────────────────────────────────────┤  ← Blockchain details
│ 🔐 Blockchain Verified             │
│    4169f0fe4a75155d882dce17881a... │
│                                    │
│ ID: SIG-DOC-LC1789460822330...    │
└────────────────────────────────────┘
```

### 4. Multiple Signatures (Stacked)
```
┌────────────────────────────────────────────────────────┐
│  📄 Bill of Lading                              [Close] │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────┐     │
│  │                                               │     │
│  │         [PDF Document Preview]               │     │
│  │                               ┌──────────────┐│     │
│  │                               │ ✓  VERIFIED ▼││     │
│  │                               │  ectaInspect ││     │
│  └───────────────────────────────│  ECTA        │┘     │
│                                  │  Sep 28, 1:30│      │
│                                  └──────────────┘      │
│                                  ┌──────────────┐      │
│                                  │ ✓  APPROVED ▼│      │
│                                  │  bankAdmin   │      │
│                                  │  BANKS       │      │
│                                  │  Sep 28, 2:15│      │
│                                  └──────────────┘      │
│                                  ┌──────────────┐      │
│                                  │📄 Bill_of... │      │
│                                  │ 2 Signatures │      │
│                                  └──────────────┘      │
└────────────────────────────────────────────────────────┘
```

## Color Codes

### Signature Type → Badge Color

```
┌──────────────┬───────────────┬────────────┐
│ Type         │ Badge Color   │ Use Case   │
├──────────────┼───────────────┼────────────┤
│ APPROVE      │ 🟢 Green      │ Approval   │
│ VERIFY       │ 🔵 Blue       │ Inspection │
│ UPLOAD       │ ⚪ Gray       │ Upload     │
│ REJECT       │ 🔴 Red        │ Rejection  │
└──────────────┴───────────────┴────────────┘
```

## Badge Components Breakdown

```
┌─────────────────────────────────────────┐
│ ✓  APPROVED                           ▼│ ← Header (type + expand)
│    │                                    │
│    └─ Checkmark icon                   │
│       APPROVED label                   │
│       Expand/collapse button           │
├─────────────────────────────────────────┤
│    bankAdmin                            │ ← Signer name
│    BANKS                                │ ← Organization
│    Sep 28, 2026, 08:15 AM              │ ← Timestamp
└─────────────────────────────────────────┘
                   │
                   └─ Click expand ▼
                   
┌─────────────────────────────────────────┐
│ ✓  APPROVED                           ▲│
│    bankAdmin                            │
│    BANKS                                │
│    Sep 28, 2026, 08:15 AM              │
├─────────────────────────────────────────┤ ← Dark overlay section
│ 🔐 Blockchain Verified                  │ ← Verification badge
│    4169f0fe4a75155d882dce17881a2128... │ ← TX ID (truncated)
│                                         │
│ ID: SIG-DOC-LC1789460822330-PACKING... │ ← Signature ID
└─────────────────────────────────────────┘
```

## Interaction Flow

### User Journey:
```
1. User opens Banks Portal
         ↓
2. Clicks "Document Examination" tab
         ↓
3. Finds LC with documents
         ↓
4. Clicks 👁️ "View" icon on document
         ↓
5. Document viewer modal opens
         ↓
6. Signature badges appear (bottom-right)
         ↓
7. User sees green "APPROVED" badge
         ↓
8. User clicks ▼ to expand
         ↓
9. Blockchain TX ID reveals
         ↓
10. User verifies: "Yes, I signed this!"
```

## Real-World Example

### Scenario: Bank Officer Reviews Packing List

**Before Signing:**
- Document shows: "No signatures yet"
- Sign button available
- Badge overlay: Not visible

**After Signing:**
- Green badge appears immediately
- Shows: "bankAdmin | BANKS | Sep 28, 08:15 AM"
- Blockchain TX ID: 4169f0fe4a75155d...
- Sign button changes to "Signed" (green, disabled)
- Badge overlay: Visible with 1 signature

**When Another Officer Views:**
- Sees same green badge
- Knows document is already approved
- Can expand to see who signed and when
- Can verify blockchain transaction

## Design Philosophy

### Why This Design?

1. **Non-intrusive**: Floats in corner, doesn't block document
2. **Expandable**: Collapsed by default, expand for details
3. **Professional**: Mimics Adobe Acrobat digital signatures
4. **Transparent**: Blockchain TX ID prominently displayed
5. **Color-coded**: Instant visual recognition of signature type
6. **Stackable**: Multiple signatures shown cleanly
7. **Glassmorphism**: Modern, premium aesthetic

### Visual Hierarchy:
```
Most Important → Least Important
────────────────────────────────
1. Signature Type (APPROVED)
2. Signer Name (bankAdmin)
3. Organization (BANKS)
4. Timestamp (Sep 28, 2:15 PM)
5. Blockchain TX ID (collapsed)
6. Signature ID (collapsed)
```

## Browser Compatibility

✅ Works in all modern browsers:
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support

Features used:
- CSS backdrop-filter (glassmorphism)
- MUI components (React)
- Flexbox/Grid layouts
- CSS transforms (rotate for expand icon)

## Accessibility

✅ **Keyboard Navigation**: 
- Tab to navigate between badges
- Enter/Space to expand/collapse

✅ **Screen Readers**:
- Proper ARIA labels on badges
- Semantic HTML structure
- Alt text for icons

✅ **Color Contrast**:
- All text meets WCAG AA standards
- Icons have sufficient contrast

## Performance

- **Lazy Loading**: Signatures fetched only when document viewed
- **Efficient Rendering**: Only re-renders on signature changes
- **Optimized**: No performance impact on document preview
- **Caching**: API responses cached by browser

## Mobile Responsive

Badge adapts to mobile screens:
- Smaller width (max-width: 280px)
- Touch-friendly expand button
- Stacks vertically on narrow screens
- Positioned: bottom-center on mobile

---

**Ready to Test!** 🚀

Open Banks Portal → Document Examination → View Packing List → See the green signature badge!
