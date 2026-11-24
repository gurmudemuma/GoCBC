# Transport Mode Implementation - Quick Reference

**For Developers** | Last Updated: July 7, 2026

---

## 🚀 Quick Start

### **What Was Implemented**
Transport mode (SEA/AIR) display logic across all 6 portals in CECBS.

### **Files Modified**
1. `ui/src/components/portals/CustomsPortal.tsx`
2. `ui/src/components/portals/BanksPortal.tsx`
3. `ui/src/components/portals/NBEPortal.tsx`
4. `ui/src/components/portals/ECTAPortal.tsx`
5. `ui/src/components/portals/QualityInspectionWorkflow.tsx`
6. `ui/src/components/portals/ExporterPortal.tsx`

---

## 🔍 Finding Changes

### **Search for:**
```
transportMode
DirectionsBoat
FlightTakeoff
```

All changes are marked with these keywords.

---

## 📦 Icon Imports

Add to imports section of any portal:

```tsx
import {
  DirectionsBoat,
  FlightTakeoff,
} from '@mui/icons-material';
```

---

## 🎨 Display Pattern

### **Basic Chip Display**
```tsx
<Chip
  icon={data.transportMode === 'AIR' ? 
    <FlightTakeoff /> : <DirectionsBoat />}
  label={data.transportMode === 'AIR' ? 
    'Air Freight' : 'Sea Freight'}
  color={data.transportMode === 'AIR' ? 
    'secondary' : 'primary'}
  size="small"
/>
```

### **With Icon and Text**
```tsx
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
  {data.transportMode === 'AIR' ? (
    <>
      <FlightTakeoff color="secondary" />
      <Typography>Air Freight</Typography>
    </>
  ) : (
    <>
      <DirectionsBoat color="primary" />
      <Typography>Sea Freight</Typography>
    </>
  )}
</Box>
```

### **With Transit Time**
```tsx
<Typography variant="caption">
  {data.transportMode === 'AIR' ? 
    '1-3 days transit' : '25-35 days transit'}
</Typography>
```

---

## ⚠️ Alert Pattern

### **Air Freight Alert**
```tsx
{data.transportMode === 'AIR' && (
  <Alert severity="info">
    <Typography variant="body2">
      <strong>Priority Processing:</strong> Air freight 
      requires expedited handling.
    </Typography>
  </Alert>
)}
```

---

## 📋 Interface Updates

### **Add to Interfaces**
```typescript
interface YourInterface {
  // ... existing fields
  transportMode?: 'SEA' | 'AIR';
}
```

**Updated Interfaces:**
- `CustomsDeclaration` in CustomsPortal.tsx
- `LetterOfCredit` in BanksPortal.tsx
- `ForexAllocation` in NBEPortal.tsx

---

## 🎯 Business Rules

### **Transit Times**
- **Air:** 1-3 days shipping
- **Sea:** 25-35 days shipping

### **Payment Timeline**
- **Air:** 3-7 days payment settlement
- **Sea:** 30-40 days payment settlement

### **Total Timeline**
- **Air:** 12-15 days (export to payment)
- **Sea:** 40-45 days (export to payment)

### **Customs Clearance**
- **Air:** 24-hour target (priority)
- **Sea:** 3-5 days (standard)

### **Quality Standards**
- **Air:** Premium specialty coffee, airline packaging
- **Sea:** Bulk commercial, moisture protection

---

## 🎨 Color Scheme

### **Sea Freight**
- Chip color: `primary` (blue)
- Icon: `<DirectionsBoat color="primary" />`
- Alert background: `#e3f2fd` (light blue)

### **Air Freight**
- Chip color: `secondary` (orange/purple)
- Icon: `<FlightTakeoff color="secondary" />`
- Alert background: `#fff3e0` (light orange)

---

## 📱 Responsive Patterns

### **Grid Layout**
```tsx
<Grid item xs={12} md={6}>
  {/* Transport mode display */}
</Grid>
```

### **Conditional Display**
```tsx
{data.transportMode && (
  <Grid item xs={12} sm={6} md={3}>
    {/* Display only if transport mode exists */}
  </Grid>
)}
```

---

## 🧪 Testing

### **Manual Tests**
1. Open each portal
2. Look for transport mode icons
3. Verify alerts show for air freight
4. Check tooltips and chips

### **Data Requirements**
```json
{
  "transportMode": "AIR"  // or "SEA"
}
```

### **Console Checks**
- No TypeScript errors
- No missing icon warnings
- No undefined transportMode errors

---

## 🔧 Build Commands

```bash
# Navigate to UI folder
cd c:\goCBC\ui

# Install dependencies (if needed)
npm install

# Build for production
npm run build

# Start development server
npm start

# Lint check
npm run lint
```

---

## 📊 Implementation Status

| Portal | Icons | Interface | Display | Status |
|--------|-------|-----------|---------|--------|
| Shipping | ✅ | ✅ | ✅ | 100% |
| Customs | ✅ | ✅ | ✅ | 100% |
| Banks | ✅ | ✅ | ✅ | 100% |
| NBE | ✅ | ✅ | ✅ | 100% |
| ECTA | ✅ | N/A | ✅ | 100% |
| Exporter | ✅ | N/A | ✅ | 100% |

**Overall:** ✅ 100% Complete

---

## 📚 Documentation Files

1. **AWB-IMPLEMENTATION-COMPLETE.md** - Full completion summary
2. **FINAL-IMPLEMENTATION-STATUS.md** - Detailed status
3. **IMPLEMENTATION-SUMMARY.md** - Implementation guide
4. **AWB-IMPLEMENTATION.md** - Shipping portal reference
5. **TRANSPORT-MODE-QUICK-REFERENCE.md** - This file

---

## 🆘 Troubleshooting

### **Icons Not Showing**
- Check icon imports at top of file
- Verify MUI version supports these icons
- Check browser console for errors

### **TypeScript Errors**
- Ensure interface includes `transportMode?: 'SEA' | 'AIR'`
- Use type assertion: `(data as any).transportMode`
- Check all optional chaining: `data?.transportMode`

### **Data Not Displaying**
- Check if blockchain data includes `transportMode` field
- Verify API response structure
- Console.log the data to inspect

### **Styling Issues**
- Check MUI theme is loaded
- Verify color names (primary, secondary)
- Check Box/Grid spacing values

---

## 💡 Best Practices

1. **Always check if transportMode exists** before displaying
2. **Use optional chaining** (`?.`) for safety
3. **Consistent icon colors** (primary=sea, secondary=air)
4. **Add tooltips** for better UX
5. **Keep alerts concise** and actionable
6. **Follow existing portal patterns** for consistency

---

## 🎯 Code Snippets by Portal

### **Customs Portal**
- Location: Declaration details dialog
- Pattern: Chip + Priority alert

### **Banks Portal**
- Location: L/C details dialog
- Pattern: Section with timeline analysis

### **NBE Portal**
- Location: Contract approval + Forex dialogs
- Pattern: Chip + Timeline alert + Colored box

### **ECTA Portal**
- Location: Quality inspection form
- Pattern: Dropdown selector + Quality alerts

### **Exporter Portal**
- Location: Shipments view cards
- Pattern: Icon + Text + Transit time

---

## 📞 Support

### **For Questions:**
- Review full documentation in `AWB-IMPLEMENTATION-COMPLETE.md`
- Check portal-specific guides (e.g., `CUSTOMS-PORTAL-GUIDE.md`)
- Search for `transportMode` in codebase to see examples

### **For Bugs:**
- Check browser console for errors
- Verify data structure in API response
- Test with both AIR and SEA values

---

**Last Updated:** July 7, 2026  
**Status:** ✅ Production Ready  
**Version:** 1.0.0
