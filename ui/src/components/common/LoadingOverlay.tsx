// Loading Overlay Component
// Shows during data fetching operations

import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingOverlayProps {
  message?: string;
  subMessage?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Loading your export data...',
  subMessage = 'Fetching contracts, shipments, and payments from blockchain',
}) => {
  return (
    <Box
      sx={{
        position: 'fixed',
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
      }}
    >
      <Box textAlign="center">
        <CircularProgress
          size={60}
          thickness={4}
          sx={{ color: '#7C3AED' }}
        />
        <Typography
          variant="body1"
          color="text.secondary"
          mt={2}
          fontWeight="500"
        >
          {message}
        </Typography>
        {subMessage && (
          <Typography variant="caption" color="text.disabled">
            {subMessage}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default LoadingOverlay;
