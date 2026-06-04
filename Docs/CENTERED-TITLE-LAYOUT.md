# Centered Title Layout - CECBS Navigation Bar

## Updated Layout - Centered Professional Title

### Visual Structure

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  [CBE]           COFFEE EXPORT BLOCKCHAIN              [Search] [🔔] [User]   │
│                  Ethiopian Coffee Export Consortium System                      │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Home > Portals > Banks                                                         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Layout Architecture

### Three-Column Layout

```
┌──────────────┬────────────────────────────────────┬──────────────┐
│   LEFT       │           CENTER                   │    RIGHT     │
│   (Logo)     │      (Main Title)                  │   (Actions)  │
├──────────────┼────────────────────────────────────┼──────────────┤
│ Min: 120px   │    Absolute Center                 │  Min: 120px  │
│              │    position: absolute              │              │
│              │    left: 50%                       │              │
│              │    transform: translateX(-50%)     │              │
└──────────────┴────────────────────────────────────┴──────────────┘
```

## Implementation Details

### 1. **Toolbar Container**
```typescript
<Toolbar sx={{ 
  minHeight: { xs: 56, sm: 64 }, 
  justifyContent: 'space-between' 
}}>
```
- Uses `space-between` to push left and right sections apart
- Creates balanced layout

### 2. **Left Section - Organization Logo**
```typescript
<Box sx={{ 
  display: 'flex', 
  alignItems: 'center', 
  minWidth: '120px' 
}}>
  {getOrganizationLogo(user.role)}
</Box>
```
- Fixed minimum width: 120px
- Contains organization logo (CBE, NBE, etc.)

### 3. **Center Section - Main Title (ABSOLUTE POSITIONING)**
```typescript
<Box sx={{ 
  display: 'flex', 
  flexDirection: 'column', 
  alignItems: 'center',
  justifyContent: 'center',
  position: 'absolute',      // KEY: Absolute positioning
  left: '50%',               // KEY: Start at 50% from left
  transform: 'translateX(-50%)',  // KEY: Shift back by 50% of own width
  textAlign: 'center',
  zIndex: 1,                 // Above background, below actions
}}
>
```

**Why Absolute Positioning?**
- Ensures title is **perfectly centered** regardless of left/right content
- Not affected by flex layout of other elements
- `left: 50%` + `transform: translateX(-50%)` = true center

### 4. **Right Section - Actions & User Menu**
```typescript
<Box sx={{ 
  display: 'flex', 
  alignItems: 'center', 
  minWidth: '120px', 
  justifyContent: 'flex-end' 
}}>
```
- Fixed minimum width: 120px (matches left section)
- Creates visual balance
- All action buttons have `zIndex: 2` to appear above centered title

## Typography Specifications

### Main Title: "COFFEE EXPORT BLOCKCHAIN"

| Property | Value |
|----------|-------|
| Variant | h4 |
| Font Weight | 800 (Extra Bold) |
| Letter Spacing | 2px |
| Text Transform | UPPERCASE |
| Text Shadow | 3px 3px 6px rgba(0,0,0,0.3) |
| White Space | nowrap (prevents wrapping) |
| **Font Sizes** | |
| xs (mobile) | 1.2rem (19.2px) |
| sm (tablet) | 1.5rem (24px) |
| md (desktop) | 1.8rem (28.8px) |
| lg (large) | 2rem (32px) |

### Subtitle: "Ethiopian Coffee Export Consortium System"

| Property | Value |
|----------|-------|
| Variant | subtitle2 |
| Font Weight | 600 (Semi-Bold) |
| Letter Spacing | 1px |
| Color | rgba(255, 255, 255, 0.9) |
| Text Shadow | 2px 2px 4px rgba(0,0,0,0.2) |
| White Space | nowrap |
| **Font Sizes** | |
| xs (mobile) | Hidden |
| sm (tablet) | 0.7rem (11.2px) |
| md (desktop) | 0.8rem (12.8px) |
| lg (large) | 0.85rem (13.6px) |

## Z-Index Layering

```
Layer 3 (z-index: 2) - Interactive Elements
├── Quick Action Buttons
├── Search Icon
├── Notifications Icon
├── User Info
└── User Avatar

Layer 2 (z-index: 1) - Title
├── Main Title Text
└── Subtitle Text

Layer 1 (z-index: 0) - Background
└── AppBar Gradient
```

## Responsive Behavior

### Desktop (lg+) - 1200px+
```
[Logo]              COFFEE EXPORT BLOCKCHAIN                [Actions] [Search] [🔔] [User]
                    Ethiopian Coffee Export Consortium System
```
- Full title visible
- Subtitle visible
- Quick actions visible
- User info visible

### Tablet (md) - 900px to 1199px
```
[Logo]              COFFEE EXPORT BLOCKCHAIN              [Search] [🔔] [User]
                    Ethiopian Coffee Export Consortium System
```
- Full title visible
- Subtitle visible
- Quick actions hidden
- User info visible

### Small Tablet (sm) - 600px to 899px
```
[Logo]         COFFEE EXPORT BLOCKCHAIN         [Search] [🔔] [User]
               Ethiopian Coffee Export Consortium System
```
- Smaller title
- Subtitle visible
- Quick actions hidden
- User info hidden

### Mobile (xs) - Below 600px
```
[Logo]    COFFEE EXPORT BLOCKCHAIN    [🔔] [User]
```
- Smallest title
- Subtitle hidden
- Quick actions hidden
- User info hidden
- Search may be hidden

## Visual Enhancements

### 1. **Text Shadow**
- Main title: `3px 3px 6px rgba(0,0,0,0.3)` - Strong shadow for prominence
- Subtitle: `2px 2px 4px rgba(0,0,0,0.2)` - Subtle shadow for readability

### 2. **Letter Spacing**
- Main title: `2px` - Creates professional, spaced-out look
- Subtitle: `1px` - Subtle spacing for elegance

### 3. **Font Weight**
- Main title: `800` - Extra bold for maximum impact
- Subtitle: `600` - Semi-bold for clear readability

### 4. **White Space Control**
- `whiteSpace: 'nowrap'` - Prevents text from wrapping to multiple lines
- Ensures title stays on one line even on smaller screens

## Organization-Specific Examples

### BANKS (CBE) Portal
```
┌─────────────────────────────────────────────────────────────┐
│ [CBE]        COFFEE EXPORT BLOCKCHAIN        [Actions]      │
│ (Golden)     Ethiopian Coffee Export...      [User]         │
│                                                              │
│ Background: Black → Purple Gradient                          │
└─────────────────────────────────────────────────────────────┘
```

### NBE Portal
```
┌─────────────────────────────────────────────────────────────┐
│ [NBE]        COFFEE EXPORT BLOCKCHAIN        [Actions]      │
│ (Bronze)     Ethiopian Coffee Export...      [User]         │
│                                                              │
│ Background: Dark Brown → Bronze Gradient                     │
└─────────────────────────────────────────────────────────────┘
```

### ECTA Portal
```
┌─────────────────────────────────────────────────────────────┐
│ [☕ ECTA]    COFFEE EXPORT BLOCKCHAIN        [Actions]      │
│ (Green)      Ethiopian Coffee Export...      [User]         │
│                                                              │
│ Background: Green → Coffee Brown Gradient                    │
└─────────────────────────────────────────────────────────────┘
```

## Accessibility Features

### 1. **High Contrast**
- White text on colored gradient background
- Text shadows improve readability
- Minimum contrast ratio: 4.5:1 (WCAG AA)

### 2. **Readable Font Sizes**
- Minimum 1.2rem (19.2px) on mobile
- Up to 2rem (32px) on large screens
- Subtitle minimum 0.7rem (11.2px)

### 3. **Semantic HTML**
- `<Typography variant="h4" component="div">` - Proper heading hierarchy
- `<Typography variant="subtitle2">` - Semantic subtitle

### 4. **Responsive Design**
- Text scales appropriately
- Content doesn't overflow
- Touch targets remain accessible

## Testing Checklist

- [x] Title is perfectly centered on all screen sizes
- [x] Title doesn't overlap with logo or actions
- [x] Title is readable on all organization themes
- [x] Subtitle shows/hides at correct breakpoints
- [x] Text doesn't wrap to multiple lines
- [x] Text shadow improves readability
- [x] Z-index layering works correctly
- [x] Interactive elements remain clickable
- [x] Layout doesn't break on window resize
- [x] Title remains centered when scrolling

## Performance Considerations

### 1. **CSS Transform**
- Uses GPU-accelerated `transform: translateX(-50%)`
- More performant than JavaScript centering
- No layout recalculation needed

### 2. **Absolute Positioning**
- Removes element from normal flow
- Doesn't affect other elements' layout
- Prevents reflow on content changes

### 3. **Fixed Z-Index**
- Establishes stacking context
- Prevents z-index conflicts
- Ensures predictable layering

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Known Limitations

### 1. **Very Small Screens (< 400px)**
- Title may appear cramped
- Consider hiding subtitle earlier
- May need to reduce font size further

### 2. **Very Long Organization Names**
- Logo section may expand
- Could affect centering slightly
- Mitigated by fixed minWidth

### 3. **High Zoom Levels (> 150%)**
- Text may overlap with actions
- Users should use browser zoom responsibly
- Consider media queries for high zoom

## Future Enhancements

### Option 1: Dynamic Font Sizing
```typescript
fontSize: `clamp(1.2rem, 3vw, 2rem)`
```
- Fluid typography based on viewport width
- Smoother scaling across screen sizes

### Option 2: Animated Entrance
```typescript
animation: 'fadeInDown 0.6s ease-out'
```
- Title fades in and slides down on page load
- Adds professional polish

### Option 3: Gradient Text
```typescript
background: 'linear-gradient(90deg, #FFD700, #9b30b7)',
backgroundClip: 'text',
WebkitBackgroundClip: 'text',
WebkitTextFillColor: 'transparent',
```
- Organization colors in the text itself
- Eye-catching effect

---

**Last Updated**: June 1, 2026  
**Status**: Production Ready  
**Version**: 3.0 - Centered Title Layout
