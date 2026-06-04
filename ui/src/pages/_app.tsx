// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Main Application Component with Dynamic Theming

import React from 'react';
import type { AppProps } from 'next/app';
import { Box } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from '@/contexts/AuthContext';
import { DynamicThemeProvider } from '@/contexts/ThemeContext';
import NavigationBar from '@/components/NavigationBar';
import { useRouter } from 'next/router';
import 'react-toastify/dist/ReactToastify.css';

function AppContent({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isLoginPage = router.pathname === '/login';
  const isPublicPage = isLoginPage || router.pathname === '/unauthorized';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {!isPublicPage && <NavigationBar />}
      <Box sx={{ flexGrow: 1 }}>
        <Component {...pageProps} />
      </Box>
    </Box>
  );
}

export default function App(props: AppProps) {
  return (
    <AuthProvider>
      <DynamicThemeProvider>
        <AppContent {...props} />
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </DynamicThemeProvider>
    </AuthProvider>
  );
}
