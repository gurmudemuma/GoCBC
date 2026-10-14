// Professional Styling for Exporter Portal
// Colors match login page: Purple #9b30b7, Gold #FFD700

// Brand Colors (matching login page theme)
export const colors = {
  brandPrimary: '#9b30b7',      // Purple (matching login)
  brandSecondary: '#FFD700',    // Gold (matching login)
  brandSuccess: '#10B981',      // Green
  brandWarning: '#F59E0B',      // Orange
  brandError: '#EF4444',        // Red
  brandInfo: '#3B82F6',         // Blue
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F9FAFB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
};

// Header Styles
export const headerStyles = {
  container: {
    background: 'linear-gradient(135deg, #9b30b7 0%, #7a2596 100%)',
    color: 'white',
    py: 4,
    px: 3,
    borderRadius: 2,
    mb: 3,
    boxShadow: '0 4px 20px rgba(155, 48, 183, 0.25)',
  },
  content: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 2,
  },
  title: {
    fontWeight: 700,
    mb: 0.5,
  },
  subtitle: {
    opacity: 0.9,
  },
  chip: {
    bgcolor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    fontWeight: 500,
    '&:hover': {
      bgcolor: 'rgba(255, 255, 255, 0.3)',
    },
  },
};

// Card Styles
export const cardStyles = {
  kpiPrimary: {
    background: 'linear-gradient(135deg, #9b30b7 0%, #7a2596 100%)',
    color: 'white',
    height: '100%',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-8px)',
      boxShadow: '0 12px 24px rgba(155, 48, 183, 0.4)',
    },
  },
  kpiSecondary: {
    height: '100%',
    borderLeft: `4px solid ${colors.brandPrimary}`,
    transition: 'box-shadow 0.3s',
    '&:hover': { 
      boxShadow: 4,
    },
  },
  chart: {
    mb: 3,
    '& .recharts-wrapper': {
      borderRadius: 2,
    },
  },
};

// DataGrid Styles
export const dataGridStyles = {
  border: 'none',
  borderRadius: 2,
  '& .MuiDataGrid-cell': {
    borderColor: '#F3F4F6',
    py: 2,
  },
  '& .MuiDataGrid-columnHeaders': {
    bgcolor: '#F9FAFB',
    borderColor: '#E5E7EB',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#374151',
  },
  '& .MuiDataGrid-row': {
    '&:hover': {
      bgcolor: '#F9FAFB',
      cursor: 'pointer',
    },
  },
  '& .MuiDataGrid-footerContainer': {
    borderColor: '#E5E7EB',
    bgcolor: '#F9FAFB',
  },
  '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
    outline: 'none',
  },
};

// Tab Styles
export const tabStyles = {
  borderBottom: 1,
  borderColor: 'divider',
  mb: 3,
  '& .MuiTab-root': {
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.9375rem',
  },
  '& .Mui-selected': {
    color: colors.brandPrimary,
  },
  '& .MuiTabs-indicator': {
    backgroundColor: colors.brandPrimary,
    height: 3,
  },
};

// Button Styles
export const buttonStyles = {
  primary: {
    bgcolor: colors.brandPrimary,
    color: 'white',
    fontWeight: 600,
    textTransform: 'none' as 'none',
    px: 3,
    py: 1.5,
    borderRadius: 2,
    '&:hover': {
      bgcolor: '#7a2596',
    },
  },
  secondary: {
    bgcolor: colors.brandSecondary,
    color: '#1a1a1a',
    fontWeight: 600,
    textTransform: 'none' as 'none',
    px: 3,
    py: 1.5,
    borderRadius: 2,
    '&:hover': {
      bgcolor: '#E6C200',
    },
  },
};

// Status Chip Colors
export const statusColors = {
  ACTIVE: { bgcolor: colors.brandSuccess, color: 'white' },
  PENDING: { bgcolor: colors.brandWarning, color: 'white' },
  COMPLETED: { bgcolor: '#6B7280', color: 'white' },
  DRAFT: { bgcolor: '#E5E7EB', color: '#374151' },
  APPROVED: { bgcolor: colors.brandInfo, color: 'white' },
  REJECTED: { bgcolor: colors.brandError, color: 'white' },
};

// Chart Gradients
export const chartGradients = {
  primary: (
    <defs>
      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#9b30b7" stopOpacity={0.3} />
        <stop offset="95%" stopColor="#9b30b7" stopOpacity={0.05} />
      </linearGradient>
    </defs>
  ),
};

// Export legacy structure for backward compatibility
export const exporterPortalStyles = {
  colors: {
    primary: colors.brandPrimary,
    secondary: colors.brandSecondary,
    success: colors.brandSuccess,
    warning: colors.brandWarning,
    error: colors.brandError,
    info: colors.brandInfo,
    bgPrimary: colors.bgPrimary,
    bgSecondary: colors.bgSecondary,
    textPrimary: colors.textPrimary,
    textSecondary: colors.textSecondary,
    border: colors.border,
  },
  header: headerStyles.container,
  primaryKPI: cardStyles.kpiPrimary,
  secondaryKPI: (accentColor: string) => ({
    height: '100%',
    borderLeft: `4px solid ${accentColor}`,
    transition: 'box-shadow 0.3s',
    '&:hover': { boxShadow: 4 },
  }),
  emptyState: {
    textAlign: 'center',
    py: 8,
    px: 3,
    bgcolor: colors.bgSecondary,
    borderRadius: 2,
    border: `2px dashed ${colors.border}`,
  },
  chartCard: cardStyles.chart,
  dataGrid: dataGridStyles,
  loadingOverlay: {
    position: 'fixed' as 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    bgcolor: 'rgba(255, 255, 255, 0.95)',
    zIndex: 9999,
    backdropFilter: 'blur(4px)',
  },
  tabs: tabStyles,
  statusChips: statusColors,
  buttons: buttonStyles,
};

export default exporterPortalStyles;
