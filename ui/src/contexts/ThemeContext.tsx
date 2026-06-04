// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Dynamic Theme Context - Organization-Based Theming

import React, { createContext, useContext, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useAuth } from './AuthContext';
import { createOrganizationTheme, organizationColors } from '@/theme/organizationThemes';

interface ThemeContextType {
  currentTheme: string;
  organizationColor: string;
  organizationGradient: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const DynamicThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { user } = useAuth();

  // Determine theme based on user's organization
  const organizationKey = useMemo(() => {
    if (!user) return 'DEFAULT';
    
    // Map user roles to organization keys
    const roleMap: Record<string, keyof typeof organizationColors> = {
      ECTA: 'ECTA',
      ECX: 'ECX',
      NBE: 'NBE',
      BANKS: 'BANKS',
      CUSTOMS: 'CUSTOMS',
      SHIPPING: 'SHIPPING',
      EXPORTER: 'ECTA',
      ADMIN: 'BANKS', // Default admin to Banks theme
    };

    return roleMap[user.role] || 'DEFAULT';
  }, [user]);

  // Create theme based on organization
  const theme = useMemo(() => {
    return createOrganizationTheme(organizationKey);
  }, [organizationKey]);

  // Get organization colors for custom styling
  const organizationColor = useMemo(() => {
    return organizationColors[organizationKey]?.primary || organizationColors.DEFAULT.primary;
  }, [organizationKey]);

  const organizationGradient = useMemo(() => {
    return organizationColors[organizationKey]?.gradient || organizationColors.DEFAULT.gradient;
  }, [organizationKey]);

  const value: ThemeContextType = {
    currentTheme: organizationKey,
    organizationColor,
    organizationGradient,
  };

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export default DynamicThemeProvider;
