// Wrapper for SWIFT Messages View (Exporter) to ensure compatibility
import React from 'react';
import { ConfigProvider } from 'antd';
import SWIFTMessagesView from './SWIFTMessagesView';

const SWIFTMessagesViewWrapper: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#9b30b7',
          borderRadius: 4,
        },
      }}
    >
      <div style={{ 
        fontFamily: 'Roboto, sans-serif',
        backgroundColor: '#fafafa',
        minHeight: '100vh',
        padding: 0
      }}>
        <SWIFTMessagesView />
      </div>
    </ConfigProvider>
  );
};

export default SWIFTMessagesViewWrapper;
