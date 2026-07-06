// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Organization-Specific Theme Configurations

import { createTheme, ThemeOptions } from '@mui/material/styles';

// Organization color palettes based on real Ethiopian institutions
// Colors based on actual brand identities of Ethiopian organizations
export const organizationColors = {
  ECTA: {
    primary: '#078930',      // Ethiopian Green - Ethiopian Coffee & Tea Authority (Flag green for coffee)
    secondary: '#6d4c41',    // Coffee Brown
    dark: '#004d1a',
    light: '#4caf50',
    gradient: 'linear-gradient(135deg, #078930 0%, #6d4c41 100%)',
  },
  ECX: {
    primary: '#0F47AF',      // Cobalt Blue - Ethiopian Commodity Exchange (Ethiopian flag blue)
    secondary: '#FCDD09',    // Ethiopian Yellow/Gold
    dark: '#0a2f7a',
    light: '#4a7fd9',
    gradient: 'linear-gradient(135deg, #0F47AF 0%, #FCDD09 100%)',
  },
  NBE: {
    primary: '#8B6F47',      // Bronze - National Bank of Ethiopia (from CBE logo colors)
    secondary: '#C4A574',    // Light Bronze/Golden
    dark: '#5C4A33',         // Dark Brown
    light: '#D4B896',        // Very Light Bronze
    gradient: 'linear-gradient(135deg, #5C4A33 0%, #8B6F47 100%)',
  },
  BANKS: {
    primary: '#9b30b7',      // Purple - Commercial Bank of Ethiopia
    secondary: '#000000',    // Black
    dark: '#7a2592',         // Dark Purple
    light: '#b366cc',        // Light Purple
    gradient: 'linear-gradient(135deg, #9b30b7 0%, #9b30b7 100%)',  // Pure Purple
    accent: '#FFD700',       // Golden
  },
  EXPORTER: {
    primary: '#9b30b7',      // Purple
    secondary: '#000000',    // Black
    dark: '#7a2592',         // Dark Purple
    light: '#b366cc',        // Light Purple
    gradient: 'linear-gradient(135deg, #9b30b7 0%, #9b30b7 100%)',  // Pure Purple
    accent: '#FFD700',       // Golden
  },
  CUSTOMS: {
    primary: '#0F47AF',      // Government Blue - Ethiopian Customs Commission (Ethiopian emblem blue)
    secondary: '#FCDD09',    // Ethiopian Gold
    dark: '#0a2f7a',
    light: '#4a7fd9',
    gradient: 'linear-gradient(135deg, #0F47AF 0%, #FCDD09 100%)',
  },
  SHIPPING: {
    primary: '#006064',      // Deep Teal - Ethiopian Shipping Lines (Maritime/Ocean)
    secondary: '#0097a7',    // Cyan
    dark: '#004d40',
    light: '#26c6da',
    gradient: 'linear-gradient(135deg, #006064 0%, #0097a7 100%)',
  },
  DEFAULT: {
    primary: '#9b30b7',      // Purple - Commercial Bank of Ethiopia (default)
    secondary: '#FFD700',    // Golden
    dark: '#6d1f8a',         // Dark Purple
    light: '#c45dd9',        // Light Purple
    gradient: 'linear-gradient(135deg, #9b30b7 0%, #FFD700 100%)',  // Purple to Golden
    accent: '#FFD700',       // Golden
  },
};

// Create theme for specific organization
export const createOrganizationTheme = (organization: keyof typeof organizationColors = 'DEFAULT') => {
  const colors = organizationColors[organization] || organizationColors.DEFAULT;

  const themeOptions: ThemeOptions = {
    palette: {
      mode: 'light',
      primary: {
        main: colors.primary,
        dark: colors.dark,
        light: colors.light,
      },
      secondary: {
        main: colors.secondary,
      },
      // For BANKS: Override all colors to use only Black, Golden, Purple
      ...(organization === 'BANKS' ? {
        background: {
          default: '#ffffff',  // White background
          paper: '#ffffff',    // White paper
        },
        text: {
          primary: '#000000',    // Black text
          secondary: '#000000',  // Black text
          disabled: '#666666',   // Dark gray for disabled
        },
        error: {
          main: '#9b30b7',  // Purple for errors
          light: '#b366cc',
          dark: '#7a2592',
        },
        warning: {
          main: '#FFD700',  // Golden for warnings
          light: '#FFE44D',
          dark: '#CCB000',
        },
        info: {
          main: '#9b30b7',  // Purple for info
          light: '#b366cc',
          dark: '#7a2592',
        },
        success: {
          main: '#FFD700',  // Golden for success
          light: '#FFE44D',
          dark: '#CCB000',
        },
        divider: '#000000',  // Black dividers
      } : organization === 'EXPORTER' ? {
        background: {
          default: '#ffffff',  // White background
          paper: '#ffffff',    // White paper
        },
        text: {
          primary: '#000000',    // Black text
          secondary: '#000000',  // Black text
          disabled: '#666666',   // Dark gray for disabled
        },
        error: {
          main: '#9b30b7',  // Purple for errors
          light: '#b366cc',
          dark: '#7a2592',
        },
        warning: {
          main: '#FFD700',  // Golden for warnings
          light: '#FFE44D',
          dark: '#CCB000',
        },
        info: {
          main: '#9b30b7',  // Purple for info
          light: '#b366cc',
          dark: '#7a2592',
        },
        success: {
          main: '#FFD700',  // Golden for success
          light: '#FFE44D',
          dark: '#CCB000',
        },
        divider: '#000000',  // Black dividers
      } : organization === 'NBE' ? {
        background: {
          default: '#ffffff',
          paper: '#ffffff',
        },
        text: {
          primary: '#5C4A33',    // Dark Brown text
          secondary: '#8B6F47',  // Bronze text
          disabled: '#A89580',   // Light brown for disabled
        },
        error: {
          main: '#8B6F47',  // Bronze for errors
        },
        warning: {
          main: '#C4A574',  // Light Bronze for warnings
        },
        info: {
          main: '#8B6F47',  // Bronze for info
        },
        success: {
          main: '#C4A574',  // Light Bronze for success
        },
        divider: '#8B6F47',  // Bronze dividers
      } : {
        background: {
          default: '#f5f5f5',
          paper: '#ffffff',
        },
      }),
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      // For BANKS and EXPORTER: All text in black
      ...(organization === 'BANKS' || organization === 'EXPORTER' ? {
        allVariants: {
          color: '#000000',
        },
      } : organization === 'NBE' ? {
        allVariants: {
          color: '#5C4A33',
        },
      } : {}),
      h1: {
        fontWeight: 700,
        ...((organization === 'BANKS' || organization === 'EXPORTER') && { color: '#000000' }),
        ...(organization === 'NBE' && { color: '#5C4A33' }),
      },
      h2: {
        fontWeight: 700,
        ...((organization === 'BANKS' || organization === 'EXPORTER') && { color: '#000000' }),
        ...(organization === 'NBE' && { color: '#5C4A33' }),
      },
      h3: {
        fontWeight: 600,
        ...((organization === 'BANKS' || organization === 'EXPORTER') && { color: '#000000' }),
        ...(organization === 'NBE' && { color: '#5C4A33' }),
      },
      h4: {
        fontWeight: 600,
        ...((organization === 'BANKS' || organization === 'EXPORTER') && { color: '#000000' }),
        ...(organization === 'NBE' && { color: '#5C4A33' }),
      },
      h5: {
        fontWeight: 600,
        ...((organization === 'BANKS' || organization === 'EXPORTER') && { color: '#000000' }),
        ...(organization === 'NBE' && { color: '#5C4A33' }),
      },
      h6: {
        fontWeight: 600,
        ...((organization === 'BANKS' || organization === 'EXPORTER') && { color: '#000000' }),
        ...(organization === 'NBE' && { color: '#5C4A33' }),
      },
      body1: {
        ...((organization === 'BANKS' || organization === 'EXPORTER') && { color: '#000000' }),
        ...(organization === 'NBE' && { color: '#5C4A33' }),
      },
      body2: {
        ...((organization === 'BANKS' || organization === 'EXPORTER') && { color: '#000000' }),
        ...(organization === 'NBE' && { color: '#5C4A33' }),
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 24px',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: organization === 'BANKS' ? '0 4px 12px rgba(0,0,0,0.3)' : organization === 'NBE' ? '0 4px 12px rgba(92, 74, 51, 0.3)' : '0 4px 12px rgba(0,0,0,0.15)',
            },
          },
          contained: {
            background: colors.gradient,
            color: '#ffffff',
            '&:hover': {
              background: colors.gradient,
              opacity: 0.9,
            },
          },
          outlined: {
            ...(organization === 'BANKS' || organization === 'EXPORTER' ? {
              borderColor: '#000000',
              color: '#000000',
              '&:hover': {
                borderColor: '#9b30b7',
                backgroundColor: 'rgba(155, 48, 183, 0.05)',
              },
            } : organization === 'NBE' ? {
              borderColor: '#8B6F47',
              color: '#5C4A33',
              '&:hover': {
                borderColor: '#C4A574',
                backgroundColor: 'rgba(139, 111, 71, 0.05)',
              },
            } : {}),
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            ...(organization === 'BANKS' || organization === 'EXPORTER' ? {
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              border: '1px solid #000000',
              '&:hover': {
                boxShadow: '0 4px 16px rgba(155, 48, 183, 0.3)',
                borderColor: '#9b30b7',
              },
            } : organization === 'NBE' ? {
              boxShadow: '0 2px 8px rgba(92, 74, 51, 0.15)',
              border: '1px solid #8B6F47',
              '&:hover': {
                boxShadow: '0 4px 16px rgba(139, 111, 71, 0.3)',
                borderColor: '#C4A574',
              },
            } : {
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              '&:hover': {
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              },
            }),
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: colors.gradient,
            boxShadow: organization === 'BANKS' || organization === 'EXPORTER' ? '0 2px 8px rgba(0,0,0,0.3)' : organization === 'NBE' ? '0 2px 8px rgba(92, 74, 51, 0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
          },
          filled: {
            backgroundColor: colors.primary,
            color: '#ffffff',
            ...(organization === 'BANKS' || organization === 'EXPORTER' ? {
              border: '2px solid #FFD700',
            } : organization === 'NBE' ? {
              border: '2px solid #C4A574',
            } : {}),
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            height: 8,
            backgroundColor: organization === 'BANKS' || organization === 'EXPORTER' ? 'rgba(0,0,0,0.1)' : organization === 'NBE' ? 'rgba(139, 111, 71, 0.1)' : undefined,
          },
          bar: {
            borderRadius: 4,
            background: colors.gradient,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
            ...(organization === 'BANKS' || organization === 'EXPORTER' ? {
              color: '#000000',
              '&.Mui-selected': {
                color: '#9b30b7',
              },
            } : organization === 'NBE' ? {
              color: '#5C4A33',
              '&.Mui-selected': {
                color: '#8B6F47',
              },
            } : {}),
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            ...(organization === 'BANKS' || organization === 'EXPORTER' ? {
              backgroundColor: '#9b30b7',
              height: 3,
            } : organization === 'NBE' ? {
              backgroundColor: '#8B6F47',
              height: 3,
            } : {}),
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            ...(organization === 'BANKS' || organization === 'EXPORTER' ? {
              '& .MuiTableCell-head': {
                backgroundColor: '#000000',
                color: '#FFD700',
                fontWeight: 700,
                borderBottom: '2px solid #9b30b7',
              },
            } : organization === 'NBE' ? {
              '& .MuiTableCell-head': {
                backgroundColor: '#5C4A33',
                color: '#C4A574',
                fontWeight: 700,
                borderBottom: '2px solid #8B6F47',
              },
            } : {}),
          },
        },
      },
      MuiTableBody: {
        styleOverrides: {
          root: {
            ...(organization === 'BANKS' || organization === 'EXPORTER' ? {
              '& .MuiTableRow-root': {
                '&:hover': {
                  backgroundColor: 'rgba(155, 48, 183, 0.05)',
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(155, 48, 183, 0.1)',
                },
              },
              '& .MuiTableCell-body': {
                color: '#000000',
                borderBottom: '1px solid rgba(0,0,0,0.1)',
              },
            } : organization === 'NBE' ? {
              '& .MuiTableRow-root': {
                '&:hover': {
                  backgroundColor: 'rgba(139, 111, 71, 0.05)',
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(139, 111, 71, 0.1)',
                },
              },
              '& .MuiTableCell-body': {
                color: '#5C4A33',
                borderBottom: '1px solid rgba(139, 111, 71, 0.1)',
              },
            } : {}),
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            ...(organization === 'BANKS' || organization === 'EXPORTER' ? {
              color: '#000000',
              '&:hover': {
                backgroundColor: 'rgba(155, 48, 183, 0.1)',
                color: '#9b30b7',
              },
            } : organization === 'NBE' ? {
              color: '#5C4A33',
              '&:hover': {
                backgroundColor: 'rgba(139, 111, 71, 0.1)',
                color: '#8B6F47',
              },
            } : {}),
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            ...(organization === 'BANKS' || organization === 'EXPORTER' ? {
              borderColor: '#000000',
            } : organization === 'NBE' ? {
              borderColor: '#8B6F47',
            } : {}),
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            ...(organization === 'BANKS' || organization === 'EXPORTER' ? {
              '&.MuiAlert-standardSuccess': {
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                color: '#000000',
                border: '1px solid #FFD700',
              },
              '&.MuiAlert-standardError': {
                backgroundColor: 'rgba(155, 48, 183, 0.1)',
                color: '#000000',
                border: '1px solid #9b30b7',
              },
              '&.MuiAlert-standardWarning': {
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                color: '#000000',
                border: '1px solid #FFD700',
              },
              '&.MuiAlert-standardInfo': {
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                color: '#000000',
                border: '1px solid #000000',
              },
            } : organization === 'NBE' ? {
              '&.MuiAlert-standardSuccess': {
                backgroundColor: 'rgba(196, 165, 116, 0.1)',
                color: '#5C4A33',
                border: '1px solid #C4A574',
              },
              '&.MuiAlert-standardError': {
                backgroundColor: 'rgba(139, 111, 71, 0.1)',
                color: '#5C4A33',
                border: '1px solid #8B6F47',
              },
              '&.MuiAlert-standardWarning': {
                backgroundColor: 'rgba(196, 165, 116, 0.1)',
                color: '#5C4A33',
                border: '1px solid #C4A574',
              },
              '&.MuiAlert-standardInfo': {
                backgroundColor: 'rgba(139, 111, 71, 0.05)',
                color: '#5C4A33',
                border: '1px solid #8B6F47',
              },
            } : {}),
          },
        },
      },
    },
  };

  return createTheme(themeOptions);
};

// Get organization display name
export const getOrganizationName = (role: string): string => {
  const names: Record<string, string> = {
    ECTA: 'Ethiopian Coffee & Tea Authority',
    ECX: 'Ethiopian Commodity Exchange',
    NBE: 'National Bank of Ethiopia',
    BANKS: 'Commercial Bank of Ethiopia',
    CUSTOMS: 'Ethiopian Customs Commission',
    SHIPPING: 'Ethiopian Shipping Lines',
  };
  return names[role] || 'CECBS';
};

// Get organization logo/icon color
export const getOrganizationColor = (role: string): string => {
  const colors: Record<string, string> = {
    ECTA: organizationColors.ECTA.primary,
    ECX: organizationColors.ECX.primary,
    NBE: organizationColors.NBE.primary,
    BANKS: organizationColors.BANKS.primary,
    CUSTOMS: organizationColors.CUSTOMS.primary,
    SHIPPING: organizationColors.SHIPPING.primary,
  };
  return colors[role] || organizationColors.DEFAULT.primary;
};

export default createOrganizationTheme;
