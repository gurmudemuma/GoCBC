// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Professional Page Transition Component

import React, { ReactNode } from 'react';
import { Box, Fade } from '@mui/material';

interface PageTransitionProps {
  children: ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  return (
    <Fade in={true} timeout={500}>
      <Box
        sx={{
          animation: 'slideUp 0.4s ease-out',
          '@keyframes slideUp': {
            '0%': {
              opacity: 0,
              transform: 'translateY(20px)',
            },
            '100%': {
              opacity: 1,
              transform: 'translateY(0)',
            },
          },
        }}
      >
        {children}
      </Box>
    </Fade>
  );
};

export default PageTransition;
