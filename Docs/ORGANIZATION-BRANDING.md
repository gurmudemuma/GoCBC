# Ethiopian Coffee Export Consortium Blockchain System (CECBS)
## Organization Brand Colors Documentation

This document explains the color schemes used for each organization in the CECBS system, based on actual Ethiopian institutional branding.

---

## 🎨 Color Palettes

### 1. **Commercial Bank of Ethiopia (CBE)** - Default Theme
**Brand Colors:** Black, Golden, Purple (Three-Color Palette)

- **Primary:** `#9b30b7` (Purple) - Main brand color
- **Secondary:** `#000000` (Black) - Professional, authoritative
- **Accent:** `#FFD700` (Golden) - Prosperity, premium highlights
- **Gradient:** Black to Purple
- **Usage:** Default theme for the system, represents Ethiopia's largest commercial bank

**Color Usage:**
- **Black (#000000):** Text, borders, table headers, secondary buttons
- **Golden (#FFD700):** Accents, highlights, special badges, premium features
- **Purple (#9b30b7):** Primary buttons, active states, brand elements

**Design Notes:**
- Navigation bar uses black-to-purple gradient
- Table headers: Black background with golden text
- Primary buttons: Purple
- Special buttons: Golden with black text
- Chips: Purple with golden borders
- Text: Black for readability
- Accents: Golden for premium feel
- Three-color harmony creates luxurious, professional appearance

---

### 2. **National Bank of Ethiopia (NBE)**
**Brand Colors:** Ethiopian Green, Gold

- **Primary:** `#078930` (Ethiopian Flag Green) - National identity
- **Secondary:** `#FCDD09` (Ethiopian Yellow/Gold) - National prosperity
- **Gradient:** Green to Gold
- **Usage:** Central bank theme, emphasizing national sovereignty

**Design Notes:**
- Uses official Ethiopian flag colors
- Represents national authority and stability
- Green symbolizes growth and agriculture
- Gold represents national wealth

---

### 3. **Ethiopian Coffee & Tea Authority (ECTA)**
**Brand Colors:** Deep Green, Coffee Brown

- **Primary:** `#078930` (Ethiopian Green) - Agriculture, coffee
- **Secondary:** `#6d4c41` (Coffee Brown) - Coffee heritage
- **Gradient:** Green to Brown
- **Usage:** Coffee authority theme, emphasizing agricultural roots

**Design Notes:**
- Green represents Ethiopian coffee growing regions
- Brown represents roasted coffee beans
- Natural, earthy color palette
- Reflects agricultural focus

---

### 4. **Ethiopian Commodity Exchange (ECX)**
**Brand Colors:** Cobalt Blue, Gold

- **Primary:** `#0F47AF` (Cobalt Blue) - Trust, exchange
- **Secondary:** `#FCDD09` (Ethiopian Gold) - Value, prosperity
- **Gradient:** Blue to Gold
- **Usage:** Trading platform theme, emphasizing reliability

**Design Notes:**
- Blue represents trust and stability in trading
- Gold represents commodity value
- Professional financial institution look
- Uses Ethiopian flag blue

---

### 5. **Ethiopian Customs Commission**
**Brand Colors:** Government Blue, Gold

- **Primary:** `#0F47AF` (Cobalt Blue) - Authority, government
- **Secondary:** `#FCDD09` (Ethiopian Gold) - National emblem
- **Gradient:** Blue to Blue (darker)
- **Usage:** Government authority theme

**Design Notes:**
- Uses Ethiopian emblem blue
- Represents government authority
- Professional, official appearance
- Gold accents for national identity

---

### 6. **Ethiopian Shipping Lines**
**Brand Colors:** Deep Teal, Cyan

- **Primary:** `#006064` (Deep Teal) - Maritime, ocean
- **Secondary:** `#0097a7` (Cyan) - Water, shipping
- **Gradient:** Teal to Cyan
- **Usage:** Shipping company theme, maritime focus

**Design Notes:**
- Teal and cyan represent ocean and maritime
- Professional shipping industry colors
- Distinct from other organizations
- Modern, international feel

---

## 🇪🇹 Ethiopian Flag Colors Reference

The Ethiopian flag colors are used throughout the system:

- **Green:** `#078930` - Fertility, hope, and the land
- **Yellow/Gold:** `#FCDD09` - Religious freedom and peace
- **Red:** `#DA121A` - Strength and bloodshed in defense of the country
- **Blue:** `#0F47AF` - Peace and democracy (from national emblem)

---

## 🎯 Implementation Details

### Dynamic Theme Switching
The system automatically switches themes based on the logged-in user's organization:

```typescript
// User logs in as bank_admin
// System applies BANKS theme (Black, Golden, Purple)

// User logs in as nbe_admin  
// System applies NBE theme (Green, Gold)
```

### Theme Components Affected
- **Navigation Bar:** Uses organization gradient
- **Buttons:** Primary color with gradient on hover
- **Cards:** Organization-themed shadows and borders
- **Chips/Badges:** Organization colors with special styling
- **Progress Bars:** Organization gradient
- **Tabs:** Organization primary color

### Special Features
- **CBE Theme:** Includes gold borders on chips for premium feel
- **All Themes:** Smooth gradients for modern appearance
- **Responsive:** Colors adapt to light/dark mode (currently light mode)

---

## 📝 Color Accessibility

All color combinations meet WCAG 2.1 AA standards for contrast:
- Text on backgrounds: Minimum 4.5:1 contrast ratio
- Large text: Minimum 3:1 contrast ratio
- Interactive elements: Clear visual distinction

---

## 🔄 Future Enhancements

Potential additions:
1. Dark mode variants for each organization
2. High contrast mode for accessibility
3. Colorblind-friendly alternatives
4. Seasonal theme variations
5. Custom themes for special events

---

**Last Updated:** June 1, 2026  
**System Version:** 1.2  
**Theme Version:** 1.0
