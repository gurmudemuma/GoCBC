// Wrapper for SWIFT Dashboard to ensure compatibility with Material-UI portals
// Provides Ant Design ConfigProvider and proper styling context with CBE colors

import React from 'react';
import { ConfigProvider } from 'antd';
import SWIFTDashboard from './SWIFTDashboard';

export interface SWIFTDashboardWrapperProps {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

// CBE Color Palette (default for Banks portal)
const CBE_COLORS = {
  purple: '#9b30b7',
  golden: '#FFD700',
  black: '#000000',
  white: '#ffffff',
};

const SWIFTDashboardWrapper: React.FC<SWIFTDashboardWrapperProps> = ({ 
  primaryColor = CBE_COLORS.purple,
  secondaryColor = CBE_COLORS.golden,
  accentColor = CBE_COLORS.black
}) => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: primaryColor,
          colorSuccess: secondaryColor,
          colorInfo: primaryColor,
          colorLink: primaryColor,
          borderRadius: 4,
          colorBgContainer: CBE_COLORS.white,
        },
      }}
    >
      <div style={{ 
        fontFamily: 'Roboto, sans-serif',
        backgroundColor: '#fafafa',
        minHeight: '100vh',
        padding: 0
      }}>
        <SWIFTDashboard 
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          accentColor={accentColor}
        />
      </div>
    </ConfigProvider>
  );
};

export default SWIFTDashboardWrapper;
