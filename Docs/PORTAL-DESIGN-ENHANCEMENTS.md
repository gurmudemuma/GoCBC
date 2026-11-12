# Portal Design Enhancement Guide

## Issues Identified in Current Design

Based on the screenshot of the ECTA portal, here are the main issues:

1. **Visual Hierarchy**: Cards are too flat with minimal shadows
2. **Color Usage**: Icons and text lack vibrant brand colors
3. **Spacing**: Cards feel cramped without adequate padding
4. **Interactive Feedback**: No hover states or transitions visible
5. **Typography**: Numbers and labels lack visual weight
6. **Layout**: Grid could use better responsive spacing

## Recommended Enhancements

### 1. Enhanced PortalKpiCard Styling

The existing `PortalKpiCard` component has good foundation but needs:

```typescript
// Enhanced shadow system
boxShadow: selected 
  ? `0 8px 24px ${accent}30, 0 2px 8px ${accent}20`
  : '0 2px 8px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',

// Better hover effect
'&:hover': clickable ? {
  boxShadow: `0 12px 32px ${accent}35, 0 4px 12px ${accent}25`,
  transform: 'translateY(-6px) scale(1.02)',
  borderColor: accent,
} : {},

// Gradient background for selected state
background: selected 
  ? `linear-gradient(135deg, ${accent}05 0%, ${accent}15 100%)`
  : 'white',
```

### 2. Icon Enhancement

```typescript
// Add gradient to icon background
<Box
  sx={{
    width: 56,  // Slightly larger
    height: 56,
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${accent}20 0%, ${accent}30 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    mb: 1.5,
    color: accent,
    boxShadow: `0 4px 12px ${accent}25`,
    '& .MuiSvgIcon-root': { 
      fontSize: 32,  // Larger icons
      filter: `drop-shadow(0 2px 4px ${accent}40)`
    },
  }}
>
  {icon}
</Box>
```

### 3. Typography Improvements

```typescript
// Value typography
<Typography 
  variant="h3"  // Larger
  sx={{ 
    fontWeight: 800,  // Bolder
    color: accent,
    lineHeight: 1,
    mt: 0.75,
    fontSize: '2.5rem',  // Explicit size
    textShadow: `0 2px 8px ${accent}20`,
  }}
>
  {value}
</Typography>

// Label typography
<Typography
  variant="caption"
  sx={{
    color: '#555',  // Darker
    textTransform: 'uppercase',
    fontWeight: 700,  // Bolder
    fontSize: '0.75rem',
    letterSpacing: 1,  // More spacing
    mb: 0.5,
  }}
>
  {label}
</Typography>
```

### 4. Grid Layout Enhancement

```typescript
<Grid container spacing={3}>  {/* Increase from 2 to 3 */}
  <Grid item xs={12} sm={6} md={4} lg=Human: continue