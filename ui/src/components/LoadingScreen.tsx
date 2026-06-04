// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Professional Loading Screen

import React from 'react';
import { Box, CircularProgress, Typography, LinearProgress } from '@mui/material';
import { Coffee } from '@mui/icons-material';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading...', 
  fullScreen = true 
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: fullScreen ? '100vh' : '400px',
        backgroundColor: fullScreen ? '#f5f5f5' : 'transparent',
        position: fullScreen ? 'fixed' : 'relative',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: fullScreen ? 9999 : 1,
      }}
    >
      {/* Animated Logo */}
      <Box
        sx={{
          position: 'relative',
          mb: 4,
          animation: 'pulse 2s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': {
              transform: 'scale(1)',
              opacity: 1,
            },
            '50%': {
              transform: 'scale(1.05)',
              opacity: 0.8,
            },
          },
        }}
      >
        <Coffee 
          sx={{ 
            fontSize: 80, 
            color: '#9b30b7',
            filter: 'drop-shadow(0 4px 8px rgba(155, 48, 183, 0.3))',
          }} 
        />
      </Box>

      {/* Loading Spinner */}
      <CircularProgress 
        size={60} 
        thickness={4}
        sx={{ 
          color: '#9b30b7',
          mb: 3,
        }} 
      />

      {/* Loading Message */}
      <Typography 
        variant="h6" 
        sx={{ 
          color: '#9b30b7',
          fontWeight: 600,
          mb: 1,
          textAlign: 'center',
        }}
      >
        {message}
      </Typography>

      {/* System Name */}
      <Typography 
        variant="body2" 
        sx={{ 
          color: 'text.secondary',
          textAlign: 'center',
          mb: 4,
        }}
      >
        Ethiopian Coffee Export Consortium Blockchain System
      </Typography>

      {/* Progress Bar */}
      <Box sx={{ width: 300 }}>
        <LinearProgress 
          sx={{
            height: 4,
            borderRadius: 2,
            background: 'linear-gradient(90deg, rgba(155, 48, 183, 0.1), rgba(255, 215, 0, 0.1))',
            '& .MuiLinearProgress-bar': {
              background: 'linear-gradient(90deg, #9b30b7, #FFD700)',
              borderRadius: 2,
            },
          }}
        />
      </Box>
    </Box>
  );
};

export default LoadingScreen;
