// Wrapper for SWIFT Monitoring to ensure compatibility with portal color schemes
import React from 'react';
import { ConfigProvider } from 'antd';
import SWIFTMonitoring from './SWIFTMonitoring';

export interface SWIFTMonitoringWrapperProps {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

const SWIFTMonitoringWrapper: React.FC<SWIFTMonitoringWrapperProps> = ({ 
  primaryColor = '#9b30b7', // Default to CBE Purple
  secondaryColor = '#FFD700', // Default to CBE Golden
  accentColor = '#000000' // Default to Black
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
        <SWIFTMonitoring 
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          accentColor={accentColor}
        />
      </div>
    </ConfigProvider>
  );
};

export default SWIFTMonitoringWrapper;
