// Wrapper for SWIFT Monitoring to ensure compatibility with portal color schemes
import React, { useState } from 'react';
import { ConfigProvider } from 'antd';
import { Box, Tabs, Tab } from '@mui/material';
import SWIFTMonitoring from './SWIFTMonitoring';

export interface SWIFTMonitoringWrapperProps {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  activeSubTab?: number;
  onSubTabChange?: (value: number) => void;
  statusFilter?: string | null;
}

const SWIFTMonitoringWrapper: React.FC<SWIFTMonitoringWrapperProps> = ({ 
  primaryColor = '#9b30b7', // Default to CBE Purple
  secondaryColor = '#FFD700', // Default to CBE Golden
  accentColor = '#000000', // Default to Black
  activeSubTab: externalActiveSubTab,
  onSubTabChange,
  statusFilter = null,
}) => {
  // Use external activeSubTab if provided, otherwise use internal state
  const [internalSubTab, setInternalSubTab] = useState(0);
  const activeSubTab = externalActiveSubTab !== undefined ? externalActiveSubTab : internalSubTab;
  const handleSubTabChange = onSubTabChange || setInternalSubTab;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: primaryColor,
          colorSuccess: secondaryColor,
          colorInfo: primaryColor,
          colorLink: primaryColor,
          borderRadius: 4,
          colorBgContainer: '#ffffff',
        },
      }}
    >
      <div style={{ 
        fontFamily: 'Roboto, sans-serif',
        backgroundColor: '#fafafa',
        minHeight: '100vh',
        padding: 0
      }}>
        {/* Material-UI Tabs for consistency with portal */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'white', mb: 2 }}>
          <Tabs
            value={activeSubTab}
            onChange={(_, newValue) => handleSubTabChange(newValue)}
            sx={{
              px: 3,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
              },
              '& .Mui-selected': {
                color: primaryColor,
              },
              '& .MuiTabs-indicator': {
                backgroundColor: primaryColor,
              },
            }}
          >
            <Tab label="All Messages" />
            <Tab label="Analytics & Charts" />
            <Tab label="Compliance Alerts" />
          </Tabs>
        </Box>

        <SWIFTMonitoring 
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          accentColor={accentColor}
          activeSubTab={activeSubTab}
          statusFilter={statusFilter}
        />
      </div>
    </ConfigProvider>
  );
};

export default SWIFTMonitoringWrapper;
