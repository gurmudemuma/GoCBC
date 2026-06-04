# Commercial Bank of Ethiopia - Three-Color Scheme

## 🎨 Official Color Palette

**Black, Golden, Purple** - The exclusive three-color combination for CBE branding

---

## Color Definitions

### 1. **Black** - `#000000`
**Usage:** Authority, Professionalism, Text

**Where to use:**
- Text content (headings, body text)
- Table headers background
- Secondary buttons
- Borders and dividers
- Icons (secondary)
- Card borders

**Examples:**
```typescript
// Headings
<Typography variant="h4" sx={{ color: '#000000' }}>
  Banks Portal
</Typography>

// Table headers
<TableHead sx={{ backgroundColor: '#000000', color: '#FFD700' }}>
  ...
</TableHead>

// Secondary buttons
<Button variant="outlined" sx={{ borderColor: '#000000', color: '#000000' }}>
  Cancel
</Button>
```

---

### 2. **Golden** - `#FFD700`
**Usage:** Accents, Highlights, Premium Features

**Where to use:**
- Special badges and chips
- Premium feature highlights
- Table header text (on black background)
- Icon accents
- Chip borders
- Call-to-action accents
- Success indicators (financial context)

**Examples:**
```typescript
// Golden button
<Button variant="contained" color="warning" sx={{ backgroundColor: '#FFD700', color: '#000000' }}>
  Premium Feature
</Button>

// Golden chip
<Chip 
  label="VIP" 
  sx={{ 
    backgroundColor: '#FFD700', 
    color: '#000000',
    border: '2px solid #9b30b7'
  }} 
/>

// Table header text
<TableCell sx={{ color: '#FFD700' }}>
  Amount (USD)
</TableCell>
```

---

### 3. **Purple** - `#9b30b7`
**Usage:** Primary Brand Color, Main Actions

**Where to use:**
- Primary buttons
- Navigation bar (gradient with black)
- Active states
- Selected items
- Primary chips
- Brand elements
- Links
- Progress bars

**Examples:**
```typescript
// Primary button
<Button variant="contained" color="primary" sx={{ backgroundColor: '#9b30b7' }}>
  New Permit
</Button>

// Purple chip with golden border
<Chip 
  label="STANDARD" 
  sx={{ 
    backgroundColor: '#9b30b7', 
    color: '#ffffff',
    border: '2px solid #FFD700'
  }} 
/>

// Active tab
<Tab 
  label="Export Permits" 
  sx={{ 
    '&.Mui-selected': { color: '#9b30b7' }
  }} 
/>
```

---

## 🎯 Color Combination Rules

### Navigation Bar
```
Background: Black to Purple gradient
Text: White
Icons: White
Logo accent: Golden
```

### Buttons
```
Primary: Purple background, white text
Secondary: Black outline, black text
Special/Premium: Golden background, black text
```

### Data Tables
```
Headers: Black background, golden text
Rows: White background, black text
Selected: Light purple tint
Hover: Very light purple
```

### Cards
```
Background: White
Border: Black (subtle)
Title: Black text
Accent: Purple or golden highlights
```

### Chips/Badges
```
Standard: Purple background, white text, golden border
Premium: Golden background, black text, purple border
Status: Purple background, golden border
```

### Typography
```
Headings (H1-H6): Black
Body text: Black
Links: Purple
Emphasis: Golden
```

---

## 📋 Component Color Guide

### 1. **AppBar (Navigation)**
```typescript
<AppBar sx={{
  background: 'linear-gradient(135deg, #000000 0%, #9b30b7 100%)',
  color: '#ffffff'
}}>
  <Coffee sx={{ color: '#FFD700' }} /> {/* Golden logo */}
</AppBar>
```

### 2. **Primary Button**
```typescript
<Button 
  variant="contained" 
  sx={{ 
    backgroundColor: '#9b30b7',
    color: '#ffffff',
    '&:hover': { backgroundColor: '#8a28a0' }
  }}
>
  New Permit
</Button>
```

### 3. **Golden Button (Premium)**
```typescript
<Button 
  variant="contained" 
  sx={{ 
    backgroundColor: '#FFD700',
    color: '#000000',
    '&:hover': { backgroundColor: '#FFC700' }
  }}
>
  Export Report
</Button>
```

### 4. **Data Table**
```typescript
<TableHead>
  <TableRow sx={{ backgroundColor: '#000000' }}>
    <TableCell sx={{ color: '#FFD700', fontWeight: 700 }}>
      Permit ID
    </TableCell>
  </TableRow>
</TableHead>
<TableBody>
  <TableRow sx={{ 
    '&:hover': { backgroundColor: 'rgba(155, 48, 183, 0.05)' },
    '&.Mui-selected': { backgroundColor: 'rgba(155, 48, 183, 0.1)' }
  }}>
    <TableCell sx={{ color: '#000000' }}>
      EP2026001
    </TableCell>
  </TableRow>
</TableBody>
```

### 5. **Status Chip**
```typescript
<Chip 
  label="STANDARD" 
  sx={{ 
    backgroundColor: '#9b30b7',
    color: '#ffffff',
    border: '2px solid #FFD700',
    fontWeight: 600
  }} 
/>
```

### 6. **Premium Badge**
```typescript
<Chip 
  label="FRANCO VALUTA" 
  sx={{ 
    backgroundColor: '#FFD700',
    color: '#000000',
    border: '2px solid #9b30b7',
    fontWeight: 700
  }} 
/>
```

### 7. **Card with Accent**
```typescript
<Card sx={{ 
  border: '1px solid rgba(0,0,0,0.1)',
  '&:hover': { 
    borderColor: '#9b30b7',
    boxShadow: '0 4px 16px rgba(155, 48, 183, 0.2)'
  }
}}>
  <CardContent>
    <Typography variant="h6" sx={{ color: '#000000' }}>
      Total Permits
    </Typography>
    <Typography variant="h3" sx={{ color: '#9b30b7' }}>
      2
    </Typography>
    <Chip 
      label="+15%" 
      size="small" 
      sx={{ backgroundColor: '#FFD700', color: '#000000' }} 
    />
  </CardContent>
</Card>
```

### 8. **Progress Bar**
```typescript
<LinearProgress 
  variant="determinate" 
  value={75} 
  sx={{
    backgroundColor: 'rgba(0,0,0,0.1)',
    '& .MuiLinearProgress-bar': {
      background: 'linear-gradient(90deg, #000000 0%, #9b30b7 100%)'
    }
  }}
/>
```

### 9. **Tabs**
```typescript
<Tabs 
  value={tabValue}
  sx={{
    '& .MuiTab-root': { 
      color: '#000000',
      '&.Mui-selected': { color: '#9b30b7' }
    },
    '& .MuiTabs-indicator': { 
      backgroundColor: '#9b30b7',
      height: 3
    }
  }}
>
  <Tab label="Export Permits" />
</Tabs>
```

---

## ✅ Do's and Don'ts

### ✅ DO:
- Use black for text and professional elements
- Use golden for accents and premium features
- Use purple for primary actions and brand elements
- Combine all three colors harmoniously
- Use white backgrounds for content areas
- Use gradients between black and purple

### ❌ DON'T:
- Don't use other colors (except semantic: green for success, red for error)
- Don't use light purple or dark purple variations
- Don't use yellow instead of golden
- Don't use gray instead of black
- Don't mix with other brand colors
- Don't use purple for text (use black instead)

---

## 🎨 Color Ratios

**Recommended usage distribution:**
- **Black:** 40% (text, headers, borders)
- **Purple:** 35% (buttons, accents, brand elements)
- **Golden:** 25% (highlights, premium features, accents)

---

## 📊 Accessibility

### Contrast Ratios (WCAG 2.1 AA)

**Black on White:**
- Ratio: 21:1 ✅ (Excellent)
- Use for: Body text, headings

**Purple on White:**
- Ratio: 5.8:1 ✅ (Good)
- Use for: Large text, buttons

**Golden on Black:**
- Ratio: 10.4:1 ✅ (Excellent)
- Use for: Table headers

**White on Purple:**
- Ratio: 5.8:1 ✅ (Good)
- Use for: Button text

**Black on Golden:**
- Ratio: 10.4:1 ✅ (Excellent)
- Use for: Premium buttons

---

## 🚀 Implementation Checklist

- [x] Navigation bar: Black-to-purple gradient
- [x] Primary buttons: Purple
- [x] Premium buttons: Golden
- [x] Table headers: Black background, golden text
- [x] Status chips: Purple with golden borders
- [x] Premium badges: Golden with purple borders
- [x] Text: Black
- [x] Cards: White with black borders
- [x] Progress bars: Black-to-purple gradient
- [x] Tabs: Black text, purple when active
- [x] Links: Purple
- [x] Icons: Black (primary), Golden (accents)

---

**Color Scheme:** Black + Golden + Purple  
**Status:** ✅ IMPLEMENTED  
**Theme File:** `ui/src/theme/organizationThemes.ts`

---

*Commercial Bank of Ethiopia - Ethiopian Coffee Export Consortium Blockchain System (CECBS) - 2026*
