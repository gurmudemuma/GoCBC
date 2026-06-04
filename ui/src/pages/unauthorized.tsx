// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Unauthorized Access Page

import React from 'react';
import { Box, Container, Typography, Button, Paper } from '@mui/material';
import { Block, Home } from '@mui/icons-material';
import { useRouter } from 'next/router';

const UnauthorizedPage: React.FC = () => {
  const router = useRouter();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
      }}
    >
      <Container maxWidth="sm">
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Block sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
          <Typography variant="h3" gutterBottom fontWeight="bold">
            Access Denied
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            You don't have permission to access this page. Please contact your administrator
            if you believe this is an error.
          </Typography>
          <Button
            variant="contained"
            startIcon={<Home />}
            onClick={() => router.push('/')}
            sx={{ mt: 2 }}
          >
            Go to Home
          </Button>
        </Paper>
      </Container>
    </Box>
  );
};

export default UnauthorizedPage;
