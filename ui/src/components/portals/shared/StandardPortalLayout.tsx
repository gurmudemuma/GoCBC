// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Standard Portal Layout Component
// Provides consistent structure for all portals

import React from 'react';
import {
  Box,
  Container,
  Typography,
  ThemeProvider,
  Grid,
  Card,
  Tabs,
  Tab,
} from '@mui/material';
import { BlockchainStatusIcon } from '@/components/blockchain';

interface KPICard {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  subtitle: string;
  description?: string;
  clickable?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
  tabIndex: number;
}

interface TabCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
  children: TabItem[];
}

interface StandardPortalLayoutProps {
  // Portal identification
  portalName: string;
  portalDescription: string;
  organizationTheme: any;
  organizationColors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
  };

  // Tab navigation
  tabStructure: TabCategory[];
  activeParentTab: number;
  activeChildTab: number;
  onParentTabChange: (event: React.SyntheticEvent, newValue: number) => void;
  onChildTabChange: (event: React.SyntheticEvent, newValue: number) => void;

  // KPI cards
  kpiCards: KPICard[];

  // Content
  children: React.ReactNode;

  // Blockchain status
  showBlockchainStatus?: boolean;
  blockchainHeight?: number;
}

const StandardPortalLayout: React.FC<StandardPortalLayoutProps> = ({
  portalName,
  portalDescription,
  organizationTheme,
  organizationColors,
  tabStructure,
  activeParentTab,
  activeChildTab,
  onParentTabChange,
  onChildTabChange,
  kpiCards,
  children,
  showBlockchainStatus = true,
  blockchainHeight,
}) => {
  return (
    <ThemeProvider theme={organizationTheme}>
      <Box sx={{ flexGrow: 1, bgcolor: '#f5f5f5', minHeight: '100vh', pb: 4 }}>
        
        {/* Header Banner */}
        <Box 
          sx={{ 
            bgcolor: organizationColors.primary, 
            color: 'white', 
            py: 3, 
            px: 4, 
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            background: `linear-gradient(135deg, ${organizationColors.primary} 0%, ${organizationColors.secondary} 100%)`,
          }}
        >
          <Container maxWidth="xl">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography 
                  variant="h4" 
                  fontWeight="bold"
                  sx={{ 
                    textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
                    mb: 0.5,
                  }}
                >
                  {portalName}
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    opacity: 0.95,
                    fontWeight: 300,
                  }}
                >
                  {portalDescription}
                </Typography>
              </Box>
              
              {/* Blockchain Status */}
              {showBlockchainStatus && (
                <Box sx={{ textAlign: 'right' }}>
                  <BlockchainStatusIcon 
                    verified={true} 
                    size="large"
                  />
                  {blockchainHeight && (
                    <Typography variant="caption" display="block" sx={{ mt: 0.5, opacity: 0.9 }}>
                      Block #{blockchainHeight}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Container>
        </Box>

        <Container maxWidth="xl" sx={{ mt: 4 }}>
          
          {/* KPI Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {kpiCards.map((kpi, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card 
                  sx={{ 
                    cursor: kpi.clickable ? 'pointer' : 'default',
                    height: 140,
                    border: kpi.selected ? `2px solid ${kpi.color}` : `1px solid #e0e0e0`,
                    bgcolor: kpi.selected ? `${kpi.color}08` : 'white',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderRadius: 2,
                    boxShadow: kpi.selected 
                      ? `0 4px 12px ${kpi.color}40` 
                      : '0 1px 3px rgba(0,0,0,0.05)',
                    '&:hover': kpi.clickable ? {
                      boxShadow: `0 8px 24px ${kpi.color}30`,
                      transform: 'translateY(-4px)',
                      borderColor: kpi.color,
                    } : {},
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    p: 2,
                  }}
                  onClick={kpi.clickable ? kpi.onClick : undefined}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box 
                      sx={{ 
                        bgcolor: `${kpi.color}15`,
                        borderRadius: 2,
                        p: 1,
                        mr: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Box sx={{ color: kpi.color, fontSize: 28 }}>
                        {kpi.icon}
                      </Box>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography 
                        variant="h4" 
                        fontWeight="bold"
                        sx={{ 
                          color: kpi.color,
                          lineHeight: 1,
                        }}
                      >
                        {kpi.value}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography 
                    variant="body2" 
                    fontWeight={600}
                    sx={{ color: 'text.primary', mb: 0.5 }}
                  >
                    {kpi.label}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ color: 'text.secondary' }}
                  >
                    {kpi.subtitle}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Hierarchical Tab Navigation */}
          <Card sx={{ mb: 3, overflow: 'visible' }}>
            {/* Parent Tabs */}
            <Tabs 
              value={activeParentTab} 
              onChange={onParentTabChange}
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                  minHeight: 64,
                },
                '& .Mui-selected': {
                  color: organizationColors.primary,
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: organizationColors.primary,
                  height: 3,
                },
              }}
            >
              {tabStructure.map((parent, idx) => (
                <Tab 
                  key={parent.id} 
                  label={parent.label} 
                  icon={parent.icon}
                  iconPosition="start"
                />
              ))}
            </Tabs>
            
            {/* Child Tabs */}
            {tabStructure[activeParentTab]?.children && tabStructure[activeParentTab].children.length > 0 && (
              <Box sx={{ bgcolor: '#fafafa', px: 2 }}>
                <Tabs 
                  value={activeChildTab} 
                  onChange={onChildTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    '& .MuiTab-root': {
                      textTransform: 'none',
                      fontSize: '0.9rem',
                      minHeight: 48,
                    },
                    '& .Mui-selected': {
                      color: organizationColors.primary,
                    },
                    '& .MuiTabs-indicator': {
                      backgroundColor: organizationColors.primary,
                      height: 2,
                    },
                  }}
                >
                  {tabStructure[activeParentTab].children.map((child, idx) => (
                    <Tab 
                      key={child.id} 
                      label={child.label}
                      icon={child.icon}
                      iconPosition="start"
                    />
                  ))}
                </Tabs>
              </Box>
            )}
          </Card>

          {/* Tab Content */}
          <Box sx={{ minHeight: '60vh' }}>
            {children}
          </Box>

        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default StandardPortalLayout;
