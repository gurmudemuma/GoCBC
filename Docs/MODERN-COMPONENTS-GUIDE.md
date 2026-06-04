# 🎨 Modern Components Library - 2026 Design System

**Complete Guide to Reusable Modern Components**

---

## 📦 Overview

The Modern Components Library provides a complete set of 2026-standard UI components with:
- ✨ Glassmorphism effects
- 🎨 Brand-color customization
- 🌓 Dark mode support
- ⚡ Smooth animations
- ♿ Full accessibility (WCAG AA)

All components accept a `brandColor` prop to match your organization's theme.

---

## 📚 Components Reference

### 1. ModernCard

**Glassmorphism card with brand-colored tint**

```tsx
import { ModernCard } from '@/components/modern';

// Basic usage
<ModernCard>
  <CardContent>Your content</CardContent>
</ModernCard>

// With brand color (ECTA green)
<ModernCard brandColor="#078930" hoverLift>
  <CardContent>Green-tinted card</CardContent>
</ModernCard>

// Without glassmorphism
<ModernCard glassmorphism={false}>
  <CardContent>Solid card</CardContent>
</ModernCard>
```

**Props:**
- `brandColor?: string` - Custom brand color for tint
- `glassmorphism?: boolean` - Enable glass effect (default: true)
- `hoverLift?: boolean` - Enable hover lift (default: true)
- `glassIntensity?: number` - Glass intensity 0-1 (default: 0.1)

---

### 2. AnimatedButton

**Button with loading/success states and gradients**

```tsx
import { AnimatedButton } from '@/components/modern';

// Basic usage
<AnimatedButton onClick={handleSubmit}>
  Submit
</AnimatedButton>

// With async handler (ECTA colors)
<AnimatedButton 
  brandColor="#078930" 
  secondaryColor="#6d4c41"
  onClick={async () => {
    await saveData();
  }}
>
  Save Application
</AnimatedButton>

// Outlined variant
<AnimatedButton variant="outlined" brandColor="#0F47AF">
  Cancel
</AnimatedButton>
```

**Props:**
- `brandColor?: string` - Primary color for gradient
- `secondaryColor?: string` - Secondary color for gradient
- `loading?: boolean` - Show loading state
- `showSuccess?: boolean` - Show success animation (default: true)
- `successDuration?: number` - Success duration in ms (default: 2000)
- `gradient?: boolean` - Enable gradient (default: true)
- `onClick?: () => Promise<void> | void` - Async click handler

---

### 3. DashboardKPI

**Animated KPI/stat card with icons and trends**

```tsx
import { DashboardKPI } from '@/components/modern';
import { Description as DescriptionIcon } from '@mui/icons-material';

// Basic usage
<DashboardKPI
  title="Total Applications"
  value={1234}
  icon={<DescriptionIcon />}
  trend="up"
  trendValue="+12%"
  brandColor="#078930"
/>

// Clickable with navigation
<DashboardKPI
  title="Pending Approvals"
  value={45}
  icon={<PendingIcon />}
  onClick={() => navigate('/approvals')}
  brandColor="#0F47AF"
  subtitle="Requires attention"
/>

// Loading state
<DashboardKPI
  title="Revenue"
  value="$0"
  loading={true}
/>
```

**Props:**
- `title: string` - KPI title
- `value: string | number` - Main value
- `icon?: ReactNode` - Icon component
- `trend?: 'up' | 'down' | 'flat'` - Trend direction
- `trendValue?: string` - Trend value (e.g., "+12%")
- `brandColor?: string` - Custom brand color
- `loading?: boolean` - Loading state
- `onClick?: () => void` - Click handler
- `subtitle?: string` - Description text

---

### 4. ModernDataTable

**Enhanced table with sorting, filtering, hover effects**

```tsx
import { ModernDataTable, Column } from '@/components/modern';
import { StatusChip } from '@/components/modern';

interface Application {
  id: string;
  company: string;
  status: string;
  date: string;
}

const columns: Column<Application>[] = [
  { id: 'company', label: 'Company', sortable: true },
  { 
    id: 'status', 
    label: 'Status',
    render: (value) => <StatusChip status={value} />
  },
  { id: 'date', label: 'Date', sortable: true, align: 'right' },
];

<ModernDataTable
  columns={columns}
  data={applications}
  brandColor="#078930"
  selectable
  selectedIds={selectedIds}
  onSelectionChange={setSelectedIds}
  onRowClick={(row) => navigate(`/app/${row.id}`)}
  onRowAction={(row) => showMenu(row)}
/>
```

**Props:**
- `columns: Column<T>[]` - Column configurations
- `data: T[]` - Table data
- `brandColor?: string` - Header color
- `selectable?: boolean` - Enable row selection
- `selectedIds?: (string | number)[]` - Selected row IDs
- `onSelectionChange?: (ids) => void` - Selection handler
- `onRowClick?: (row) => void` - Row click handler
- `onRowAction?: (row) => void` - Row actions handler
- `rowKey?: keyof T` - Row key field (default: 'id')
- `hover?: boolean` - Hover effect (default: true)

---

### 5. StatusChip

**Animated status indicator with brand colors**

```tsx
import { StatusChip } from '@/components/modern';

// Pre-defined status types
<StatusChip status="approved" />
<StatusChip status="pending" />
<StatusChip status="rejected" />
<StatusChip status="processing" pulse />

// Custom label
<StatusChip 
  status="approved" 
  label="Quality Approved"
  showIcon={false}
/>

// With brand color (ECTA green)
<StatusChip 
  status="approved" 
  brandColor="#078930"
/>
```

**Status Types:**
- `approved` / `success` - Green checkmark
- `rejected` / `error` - Red cancel
- `pending` - Orange clock
- `processing` - Blue hourglass (with pulse)
- `info` - Blue info icon
- `warning` - Orange warning
- `default` - Gray info

**Props:**
- `status: StatusType` - Status type
- `brandColor?: string` - Override status color
- `showIcon?: boolean` - Show icon (default: true)
- `pulse?: boolean` - Enable pulse animation
- `label?: string` - Custom label

---

### 6. LoadingSkeleton

**Content placeholder with brand-colored shimmer**

```tsx
import { LoadingSkeleton } from '@/components/modern';

// Card skeleton
<LoadingSkeleton variant="card" brandColor="#078930" />

// Table skeleton
<LoadingSkeleton variant="table" count={5} brandColor="#0F47AF" />

// List skeleton
<LoadingSkeleton variant="list" count={3} />

// KPI cards skeleton
<LoadingSkeleton variant="kpi" count={4} brandColor="#8B6F47" />

// Custom skeleton
<LoadingSkeleton 
  variant="custom" 
  customProps={{ width: 200, height: 40 }}
/>
```

**Variants:**
- `card` - Full card layout with image + text
- `table` - Table header + rows
- `list` - Avatar + text list items
- `kpi` - Dashboard KPI cards grid
- `custom` - Custom skeleton

---

### 7. EmptyState

**No data illustration component**

```tsx
import { EmptyState } from '@/components/modern';
import { Description as DescriptionIcon } from '@mui/icons-material';

// Pre-defined types
<EmptyState type="no-data" brandColor="#078930" />
<EmptyState type="no-results" brandColor="#0F47AF" />
<EmptyState type="error" />
<EmptyState type="offline" />
<EmptyState type="coming-soon" />

// With action button
<EmptyState 
  type="no-results"
  actionLabel="Clear Filters"
  onAction={() => clearFilters()}
  brandColor="#078930"
/>

// Custom empty state
<EmptyState
  title="No Applications Yet"
  description="Start by creating your first export application"
  icon={<DescriptionIcon />}
  actionLabel="Create Application"
  onAction={() => navigate('/apply')}
  brandColor="#8B6F47"
/>
```

**Empty State Types:**
- `no-data` - No data available
- `no-results` - No search results
- `error` - Error occurred
- `offline` - No connection
- `coming-soon` - Feature in development

---

### 8. SearchBar

**Advanced search with autocomplete**

```tsx
import { SearchBar } from '@/components/modern';

// Basic search
<SearchBar
  value={searchTerm}
  onChange={setSearchTerm}
  placeholder="Search applications..."
  brandColor="#078930"
/>

// With autocomplete suggestions
<SearchBar
  value={searchTerm}
  onChange={setSearchTerm}
  suggestions={['Coffee Beans', 'Green Coffee', 'Roasted Coffee']}
  brandColor="#0F47AF"
  showClear
/>

// Custom debounce
<SearchBar
  value={searchTerm}
  onChange={setSearchTerm}
  debounce={500}
/>
```

**Props:**
- `value: string` - Search value
- `onChange: (value: string) => void` - Change handler
- `placeholder?: string` - Placeholder text
- `suggestions?: string[]` - Autocomplete options
- `brandColor?: string` - Focus color
- `showClear?: boolean` - Show clear button (default: true)
- `debounce?: number` - Debounce ms (default: 300)

---

### 9. FilterPanel

**Multi-criteria filter component**

```tsx
import { FilterPanel, FilterConfig } from '@/components/modern';

const filters: FilterConfig[] = [
  {
    id: 'status',
    label: 'Status',
    options: [
      { label: 'Approved', value: 'approved' },
      { label: 'Pending', value: 'pending' },
      { label: 'Rejected', value: 'rejected' },
    ],
  },
  {
    id: 'type',
    label: 'Coffee Type',
    options: [
      { label: 'Arabica', value: 'arabica' },
      { label: 'Robusta', value: 'robusta' },
    ],
    multiple: true,
  },
];

const [filterValues, setFilterValues] = useState({});

<FilterPanel
  filters={filters}
  values={filterValues}
  onChange={(id, value) => 
    setFilterValues({ ...filterValues, [id]: value })
  }
  brandColor="#078930"
/>
```

**FilterConfig:**
- `id: string` - Filter ID
- `label: string` - Display label
- `options: FilterOption[]` - Filter options
- `multiple?: boolean` - Multiple selection

---

### 10. ThemeToggle

**Dark mode toggle with smooth animation**

```tsx
import { ThemeToggle } from '@/components/modern';

const [mode, setMode] = useState<'light' | 'dark'>('light');

<ThemeToggle
  mode={mode}
  onToggle={() => setMode(mode === 'light' ? 'dark' : 'light')}
  brandColor="#078930"
/>
```

**Props:**
- `mode: 'light' | 'dark'` - Current theme mode
- `onToggle: () => void` - Toggle handler
- `brandColor?: string` - Button color

---

## 🎨 Organization Brand Colors

Use these brand colors for each portal:

```tsx
// ECTA - Ethiopian Coffee & Tea Authority
brandColor="#078930"          // Green
secondaryColor="#6d4c41"      // Coffee Brown

// ECX - Ethiopian Commodity Exchange
brandColor="#0F47AF"          // Cobalt Blue
secondaryColor="#FCDD09"      // Golden

// NBE - National Bank of Ethiopia
brandColor="#8B6F47"          // Bronze
secondaryColor="#C4A574"      // Light Bronze

// BANKS - Commercial Bank of Ethiopia
brandColor="#9b30b7"          // Purple
secondaryColor="#FFD700"      // Golden

// CUSTOMS - Ethiopian Customs Commission
brandColor="#0F47AF"          // Government Blue
secondaryColor="#FCDD09"      // Ethiopian Gold

// SHIPPING - Ethiopian Shipping Lines
brandColor="#006064"          // Deep Teal
secondaryColor="#0097a7"      // Cyan
```

---

## 🚀 Complete Portal Example

Here's how to modernize a complete portal using these components:

```tsx
import React, { useState } from 'react';
import {
  ModernCard,
  AnimatedButton,
  DashboardKPI,
  ModernDataTable,
  StatusChip,
  LoadingSkeleton,
  EmptyState,
  SearchBar,
  FilterPanel,
  ThemeToggle,
  Column,
} from '@/components/modern';

// ECTA Portal Example
const ECTAPortal = () => {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  
  const BRAND_COLOR = '#078930';  // ECTA Green
  const SECONDARY_COLOR = '#6d4c41';  // Coffee Brown
  
  // Sample data
  const applications = [
    { id: '1', company: 'Yirgacheffe Coop', status: 'approved', date: '2026-06-01' },
    { id: '2', company: 'Sidama Union', status: 'pending', date: '2026-06-02' },
  ];
  
  const columns: Column<typeof applications[0]>[] = [
    { id: 'company', label: 'Company', sortable: true },
    { 
      id: 'status', 
      label: 'Status',
      render: (value) => <StatusChip status={value} brandColor={BRAND_COLOR} />
    },
    { id: 'date', label: 'Date', sortable: true },
  ];
  
  return (
    <Box>
      {/* Header with Theme Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">ECTA Portal</Typography>
        <ThemeToggle
          mode={mode}
          onToggle={() => setMode(mode === 'light' ? 'dark' : 'light')}
          brandColor={BRAND_COLOR}
        />
      </Box>
      
      {/* KPI Dashboard */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <DashboardKPI
            title="Total Applications"
            value={1234}
            icon={<DescriptionIcon />}
            trend="up"
            trendValue="+12%"
            brandColor={BRAND_COLOR}
          />
        </Grid>
        {/* More KPI cards... */}
      </Grid>
      
      {/* Search and Filters */}
      <Box sx={{ mb: 3 }}>
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search applications..."
          brandColor={BRAND_COLOR}
        />
      </Box>
      
      {/* Data Table */}
      {loading ? (
        <LoadingSkeleton variant="table" count={5} brandColor={BRAND_COLOR} />
      ) : applications.length > 0 ? (
        <ModernDataTable
          columns={columns}
          data={applications}
          brandColor={BRAND_COLOR}
          onRowClick={(row) => navigate(`/app/${row.id}`)}
        />
      ) : (
        <EmptyState
          type="no-results"
          brandColor={BRAND_COLOR}
          actionLabel="Clear Filters"
          onAction={() => setSearchTerm('')}
        />
      )}
      
      {/* Action Buttons */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <AnimatedButton
          brandColor={BRAND_COLOR}
          secondaryColor={SECONDARY_COLOR}
          onClick={async () => await handleApprove()}
        >
          Approve Selected
        </AnimatedButton>
        
        <AnimatedButton
          variant="outlined"
          brandColor={BRAND_COLOR}
        >
          Export Data
        </AnimatedButton>
      </Box>
    </Box>
  );
};
```

---

## ✅ Best Practices

### 1. Consistent Brand Colors
Always use your organization's brand colors for consistency:
```tsx
// Define at top of component
const BRAND_COLOR = '#078930';
const SECONDARY_COLOR = '#6d4c41';

// Pass to all components
<ModernCard brandColor={BRAND_COLOR}>
<AnimatedButton brandColor={BRAND_COLOR} secondaryColor={SECONDARY_COLOR}>
```

### 2. Loading States
Show skeletons while loading data:
```tsx
{loading ? (
  <LoadingSkeleton variant="table" count={5} brandColor={BRAND_COLOR} />
) : (
  <ModernDataTable ... />
)}
```

### 3. Empty States
Handle empty data gracefully:
```tsx
{data.length === 0 && (
  <EmptyState
    type="no-data"
    brandColor={BRAND_COLOR}
    actionLabel="Create New"
    onAction={() => navigate('/create')}
  />
)}
```

### 4. Async Actions
Use AnimatedButton for async operations:
```tsx
<AnimatedButton
  onClick={async () => {
    await saveData();
    showSuccess();
  }}
>
  Save
</AnimatedButton>
```

---

## 🎯 Migration Checklist

When modernizing a portal, follow this checklist:

- [ ] Replace standard `<Card>` with `<ModernCard brandColor="...">`
- [ ] Replace `<Button>` with `<AnimatedButton brandColor="...">`
- [ ] Add KPI cards with `<DashboardKPI>`
- [ ] Replace tables with `<ModernDataTable>`
- [ ] Use `<StatusChip>` for status indicators
- [ ] Add `<LoadingSkeleton>` for loading states
- [ ] Add `<EmptyState>` for empty data
- [ ] Add `<SearchBar>` for search functionality
- [ ] Add `<FilterPanel>` if multiple filters
- [ ] Add `<ThemeToggle>` for dark mode
- [ ] Test all interactions and animations
- [ ] Verify brand colors throughout
- [ ] Test dark mode
- [ ] Test accessibility (keyboard nav)

---

## 📱 Responsive Design

All components are mobile-responsive. Use MUI Grid for layout:

```tsx
<Grid container spacing={3}>
  <Grid item xs={12} md={6} lg={3}>
    <DashboardKPI ... />
  </Grid>
  {/* Stacks on mobile, 2 cols on tablet, 4 cols on desktop */}
</Grid>
```

---

## ♿ Accessibility

All components follow WCAG AA standards:
- ✅ Keyboard navigation
- ✅ Focus indicators
- ✅ ARIA labels
- ✅ Screen reader support
- ✅ High contrast mode
- ✅ Sufficient color contrast

---

## 🚀 Ready to Modernize!

Use these components to create beautiful, modern, brand-consistent portals that meet 2026 professional standards!

**Questions or need help?**
Refer to the component files in `ui/src/components/modern/` for detailed prop types and examples.

