import React from 'react';
import Head from 'next/head';
import { Box, Container, Typography, Button } from '@mui/material';
import { useRouter } from 'next/router';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

export default function ServerErrorPage() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>500 - Server Error | CECBS</title>
        <meta name="description" content="Internal server error" />
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
            <ReportProblemIcon
              sx={{
                fontSize: '8rem',
                color: 'warning.main',
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
              500
            </Typography>
            <Typography
              variant="h4"
              sx={{
                mb: 2,
                fontWeight: 600,
              }}
            >
              Internal Server Error
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 4 }}
            >
              Something went wrong on our end. Please try again later.
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
                onClick={() => router.reload()}
                size="large"
              >
                Retry
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>
    </>
  );
}
