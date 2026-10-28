import React from 'react';
import { NextPageContext } from 'next';
import Head from 'next/head';
import { Box, Container, Typography, Button } from '@mui/material';
import { useRouter } from 'next/router';

interface ErrorProps {
  statusCode?: number;
}

function Error({ statusCode }: ErrorProps) {
  const router = useRouter();

  const getErrorMessage = () => {
    switch (statusCode) {
      case 404:
        return 'Page Not Found';
      case 500:
        return 'Internal Server Error';
      case 403:
        return 'Access Forbidden';
      case 401:
        return 'Unauthorized';
      default:
        return 'An Error Occurred';
    }
  };

  const getErrorDescription = () => {
    switch (statusCode) {
      case 404:
        return 'The page you are looking for does not exist.';
      case 500:
        return 'Something went wrong on our end. Please try again later.';
      case 403:
        return 'You do not have permission to access this resource.';
      case 401:
        return 'Please log in to access this page.';
      default:
        return statusCode
          ? `An error ${statusCode} occurred on server`
          : 'An error occurred on client';
    }
  };

  return (
    <>
      <Head>
        <title>{getErrorMessage()} - CECBS</title>
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
            <Typography
              variant="h1"
              sx={{
                fontSize: '6rem',
                fontWeight: 700,
                color: 'primary.main',
                mb: 2,
              }}
            >
              {statusCode || 'Error'}
            </Typography>
            <Typography
              variant="h4"
              sx={{
                mb: 2,
                fontWeight: 600,
              }}
            >
              {getErrorMessage()}
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 4 }}
            >
              {getErrorDescription()}
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

Error.getInitialProps = ({ res, err }: NextPageContext): ErrorProps => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
