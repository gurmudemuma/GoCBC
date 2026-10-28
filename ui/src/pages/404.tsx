import React from 'react';
import Head from 'next/head';
import { Box, Container, Typography, Button } from '@mui/material';
import { useRouter } from 'next/router';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>404 - Page Not Found | CECBS</title>
        <meta name="description" content="Page not found" />
      </Head>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Container maxWidth="sm">
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
            }}
          >
            <ErrorOutlineIcon
              sx={{
                fontSize: '8rem',
                color: 'error.main',
                mb: 2,
              }}
            />
            <Typography
              variant="h1"
              sx={{
                fontSize: '4rem',
                fontWeight: 700,
                color: 'text.primary',
                mb: 2,
              }}
            >
              404
            </Typography>
            <Typography
              variant="h4"
              sx={{
                mb: 2,
                fontWeight: 600,
              }}
            >
              Page Not Found
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 4 }}
            >
              The page you are looking for does not exist or has been moved.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={() => router.push('/')}
                size="large"
              >
                Go to Home
              </Button>
              <Button
                variant="outlined"
                onClick={() => router.back()}
                size="large"
              >
                Go Back
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>
    </>
  );
}
