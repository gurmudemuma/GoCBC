# Navigation Bar Layout - CECBS

## Updated Professional Layout

### Visual Structure

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                    │
│  [CBE]    COFFEE EXPORT BLOCKCHAIN                    [Search] [🔔] [User Menu]  │
│           Ethiopian Coffee Export Consortium System                                │
│                                                                                    │
├────────────────────────────────────────────────────────────────────────────────────┤
│  Home > Portals > Banks                                                            │
└────────────────────────────────────────────────────────────────────────────────────┘
```

## Layout Components

### 1. **Organization Logo** (Left Side)
- **Position**: Far left of navigation bar
- **Content**: Organization-specific branding
  - BANKS: "CBE" in Golden (#FFD700)
  - NBE: "NBE" in Light Bronze (#C4A574)
  - ECTA: Coffee icon + "ECTA"
  - ECX: Coffee icon + "ECX"
  - CUSTOMS: Shield icon + "CUSTOMS"
  - SHIPPING: Truck icon + "SHIPPING"
- **Styling**: Large, bold, with text shadow
- **Spacing**: 3 units margin-right

### 2. **Professional Title** (Center-Left)
- **Position**: Next to logo, extends toward center
- **Primary Text**: "COFFEE EXPORT BLOCKCHAIN"
  - Font size: Responsive (1.1rem → 1.3rem → 1.5rem)
  - Font weight: 700 (bold)
  - Letter spacing: 1.5px
  - Text transform: UPPERCASE
  - Text shadow: 2px 2px 4px rgba(0,0,0,0.2)
  - Color: White
- **Secondary Text**: "Ethiopian Coffee Export Consortium System"
  - Font size: 0.75rem
  - Font weight: 500
  - Letter spacing: 0.5px
  - Color: rgba(255, 255, 255, 0.8)
  - Visibility: Hidden on extra-small screens
- **Spacing**: Uses `mr: 'auto'` to push right-side elements to the right

### 3. **Right Side Actions**
- **Quick Actions** (Desktop only, lg+)
  - Organization-specific action buttons
  - 2 most common actions displayed
- **Search Icon**
  - Global search functionality
- **Notifications Bell**
  - Badge with unread count
  - Dropdown menu with recent notifications
- **User Menu**
  - User avatar with initials
  - Dropdown with profile, settings, logout

### 4. **Breadcrumbs Bar** (Second Row)
- **Position**: Below main navigation bar
- **Content**: Current page path
- **Visibility**: Hidden on home and login pages
- **Styling**: Semi-transparent background

## Responsive Behavior

### Desktop (md and above)
```
[Logo]  COFFEE EXPORT BLOCKCHAIN                    [Actions] [Search] [🔔] [User]
        Ethiopian Coffee Export Consortium System
```

### Tablet (sm to md)
```
[Logo]  COFFEE EXPORT BLOCKCHAIN              [Search] [🔔] [User]
        Ethiopian Coffee Export Consortium System
```

### Mobile (xs)
```
[Logo]  COFFEE EXPORT BLOCKCHAIN    [Search] [🔔] [User]
```

## Typography Specifications

### Main Title
- **Font Family**: "Inter", "Roboto", "Helvetica", "Arial", sans-serif
- **Font Size**: 
  - xs: 1.1rem (17.6px)
  - sm: 1.3rem (20.8px)
  - md+: 1.5rem (24px)
- **Font Weight**: 700
- **Letter Spacing**: 1.5px
- **Line Height**: 1.2
- **Text Transform**: UPPERCASE
- **Color**: White (#FFFFFF)
- **Text Shadow**: 2px 2px 4px rgba(0,0,0,0.2)

### Subtitle
- **Font Size**: 0.75rem (12px)
- **Font Weight**: 500
- **Letter Spacing**: 0.5px
- **Color**: rgba(255, 255, 255, 0.8)
- **Display**: None on xs, block on sm+

## Organization-Specific Styling

### BANKS (CBE) Portal
- **Logo**: "CBE" in Golden (#FFD700)
- **Background**: Black to Purple gradient
- **Title**: White with shadow
- **Overall Theme**: Professional banking aesthetic

### NBE Portal
- **Logo**: "NBE" in Light Bronze (#C4A574)
- **Background**: Dark Brown to Bronze gradient
- **Title**: White with shadow
- **Overall Theme**: Government institution aesthetic

### ECTA Portal
- **Logo**: Coffee icon (Green) + "ECTA"
- **Background**: Green to Coffee Brown gradient
- **Title**: White with shadow
- **Overall Theme**: Agricultural authority aesthetic

### ECX Portal
- **Logo**: Coffee icon (Gold) + "ECX"
- **Background**: Blue to Gold gradient
- **Title**: White with shadow
- **Overall Theme**: Commodity exchange aesthetic

### CUSTOMS Portal
- **Logo**: Shield icon (Gold) + "CUSTOMS"
- **Background**: Blue to Gold gradient
- **Title**: White with shadow
- **Overall Theme**: Government customs aesthetic

### SHIPPING Portal
- **Logo**: Truck icon (Cyan) + "SHIPPING"
- **Background**: Teal to Cyan gradient
- **Title**: White with shadow
- **Overall Theme**: Maritime/logistics aesthetic

## Design Principles

### 1. **Professional Appearance**
- Large, prominent title establishes system identity
- Clean, modern typography
- Consistent spacing and alignment

### 2. **Brand Recognition**
- Organization logo immediately identifies the portal
- Color-coded themes reinforce organization identity
- Consistent branding across all pages

### 3. **Information Hierarchy**
- Logo → Title → Actions → User
- Primary information (title) is prominent
- Secondary information (subtitle) is subtle but readable

### 4. **Responsive Design**
- Title scales appropriately on different screen sizes
- Subtitle hidden on mobile to save space
- Quick actions hidden on smaller screens

### 5. **Accessibility**
- High contrast text (white on colored background)
- Text shadows improve readability
- Sufficient font sizes for readability
- Semantic HTML structure

## Implementation Details

### File Location
- **Component**: `ui/src/components/NavigationBar.tsx`
- **Theme Config**: `ui/src/theme/organizationThemes.ts`
- **Theme Context**: `ui/src/contexts/ThemeContext.tsx`

### Key Code Sections

```typescript
// Organization Logo
<Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
  {getOrganizationLogo(user.role)}
</Box>

// Professional Title
<Box sx={{ display: 'flex', flexDirection: 'column', mr: 'auto' }}>
  <Typography variant="h5" component="div" sx={{ ... }}>
    Coffee Export Blockchain
  </Typography>
  <Typography variant="caption" sx={{ ... }}>
    Ethiopian Coffee Export Consortium System
  </Typography>
</Box>
```

### Flexbox Layout
- **Container**: `display: flex`, `alignItems: center`
- **Logo**: Fixed width, `mr: 3`
- **Title**: Flexible, `mr: 'auto'` (pushes right content to the right)
- **Right Actions**: Fixed width, aligned to the right

## User Experience Benefits

### 1. **Immediate Context**
- Users instantly know which system they're using
- Organization branding is clear and prominent

### 2. **Professional Credibility**
- Large, professional title conveys system importance
- Clean design inspires confidence

### 3. **Easy Navigation**
- Clear visual hierarchy
- Breadcrumbs provide location context
- Quick actions for common tasks

### 4. **Consistent Experience**
- Same layout across all organization portals
- Only colors and logo change per organization
- Familiar interface reduces learning curve

## Testing Checklist

- [x] Title displays correctly on all screen sizes
- [x] Title is readable on all organization themes
- [x] Logo and title have proper spacing
- [x] Subtitle shows on tablet/desktop, hides on mobile
- [x] Text shadow improves readability
- [x] Layout doesn't break with long organization names
- [x] Right-side elements properly aligned
- [x] Responsive breakpoints work correctly

## Future Enhancements

### Option 1: Animated Title
- Fade-in animation on page load
- Subtle glow effect on hover

### Option 2: Dynamic Subtitle
- Show different text based on current page
- Display system status or announcements

### Option 3: Multilingual Support
- Support for Amharic language
- Language switcher in navigation bar

---

**Last Updated**: June 1, 2026  
**Status**: Production Ready  
**Version**: 2.0
