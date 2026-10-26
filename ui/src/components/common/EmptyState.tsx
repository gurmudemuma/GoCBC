// Empty State Component for Exporter Portal
// Shows when there's no data with a clear call-to-action

import React from 'react';
import { Box, Typography, Button } from '@mui/material';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 8,
        px: 3,
        bgcolor: '#F9FAFB',
        borderRadius: 2,
        border: '2px dashed #E5E7EB',
      }}
    >
      <Box
        sx={{
          color: 'text.secondary',
          mb: 3,
          '& svg': { fontSize: 80, opacity: 0.3 },
        }}
      >
        {icon}
      </Box>
      <Typography
        variant="h6"
        color="text.secondary"
        gutterBottom
        fontWeight="600"
      >
        {title}
      </Typography>
      <Typography
        variant="body2"
        color="text.disabled"
        mb={3}
        maxWidth="400px"
        mx="auto"
      >
        {description}
      </Typography>
      {action && action}
    </Box>
  );
};

export default EmptyState;
