// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Professional Enterprise Login Page

import React, { useState, useEffect } from 'react';
import {
  Box, Container, TextField, Button, Typography, Alert,
  InputAdornment, IconButton, CircularProgress, Divider,
  Grid, Stack, alpha, Checkbox, FormControlLabel,
  Chip, Fade, Zoom, Paper,
} from '@mui/material';
import {
  Visibility, VisibilityOff, Lock, Person, Coffee,
  Security, CheckCircle, Verified, Shield, TrendingUp,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const savedUsername = localStorage.getItem('rememberedUsername');
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
    if (router.query.error === 'session_expired') {
      setError('Your session has expired. Please log in again.');
    }
  }, [router.query]);

  useEffect(() => {
    if (isAuthenticated) router.push('/');
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (rememberMe) {
      localStorage.setItem('rememberedUsername', username);
    } else {
      localStorage.removeItem('rememberedUsername');
    }
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
      setLoading(false);
    }
  };

  const features = [
    { icon: <Shield sx={{ fontSize: 32 }} />, title: 'Enterprise Security', desc: 'Bank-grade encryption', color: '#1976d2' },
    { icon: <Verified sx={{ fontSize: 32 }} />, title: 'EUDR Compliant', desc: '2026 regulations ready', color: '#2e7d32' },
    { icon: <TrendingUp sx={{ fontSize: 32 }} />, title: 'Real-Time Analytics', desc: 'Live supply chain insights', color: '#ed6c02' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.03, backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }} />
      <Box sx={{ position: 'absolute', top: '-20%', right: '-10%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(25, 118, 210, 0.15) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <Box sx={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(46, 125, 50, 0.15) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      
      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, py: 4 }}>
        <Grid container spacing={0} alignItems="stretch" sx={{ minHeight: '100vh' }}>
          <Grid item xs={12} lg={7} sx={{ display: 'flex', alignItems: 'center', py: 6 }}>
            <Fade in={mounted} timeout={1000}>
              <Box sx={{ width: '100%', px: { xs: 3, md: 8 } }}>
                <Stack direction="row" alignItems="center" spacing={2} mb={4}>
                  <Box sx={{ width: 64, height: 64, borderRadius: 2, background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(25, 118, 210, 0.3)' }}>
                    <Coffee sx={{ fontSize: 36, color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight="700" sx={{ color: '#1a1a1a', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                      Ethiopian Coffee Export
                    </Typography>
                    <Typography variant="h5" fontWeight="700" sx={{ color: '#1976d2', letterSpacing: '-0.5px' }}>
                      Consortium Blockchain
                    </Typography>
                  </Box>
                </Stack>
                
                <Typography variant="h3" fontWeight="700" sx={{ mb: 3, color: '#1a1a1a', letterSpacing: '-1px', lineHeight: 1.2 }}>
                  Transforming Coffee Export<br /><span style={{ color: '#1976d2' }}>Through Blockchain</span>
                </Typography>
                
                <Typography variant="h6" sx={{ mb: 5, color: '#616161', fontWeight: 400, lineHeight: 1.6, maxWidth: '600px' }}>
                  A unified digital ecosystem connecting ECTA, ECX, NBE, banks, customs, shipping companies, and exporters with transparent, compliant, and efficient coffee trade operations.
                </Typography>
                
                <Grid container spacing={3} mb={5}>
                  {features.map((feature, index) => (
                    <Grid item xs={12} sm={4} key={index}>
                      <Zoom in={mounted} timeout={1200 + index * 200}>
                        <Paper elevation={0} sx={{ p: 3, height: '100%', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid', borderColor: alpha(feature.color, 0.2), borderRadius: 2, transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 24px ${alpha(feature.color, 0.15)}`, borderColor: alpha(feature.color, 0.4) } }}>
                          <Box sx={{ color: feature.color, mb: 2 }}>{feature.icon}</Box>
                          <Typography variant="subtitle1" fontWeight="700" gutterBottom sx={{ color: '#1a1a1a' }}>{feature.title}</Typography>
                          <Typography variant="body2" sx={{ color: '#616161', lineHeight: 1.6 }}>{feature.desc}</Typography>
                        </Paper>
                      </Zoom>
                    </Grid>
                  ))}
                </Grid>
                
                <Paper elevation={0} sx={{ p: 4, background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', borderRadius: 2, color: 'white' }}>
                  <Grid container spacing={3}>
                    <Grid item xs={4}><Typography variant="h3" fontWeight="700">8</Typography><Typography variant="body2" sx={{ opacity: 0.9 }}>Stakeholder Organizations</Typography></Grid>
                    <Grid item xs={4}><Typography variant="h3" fontWeight="700">100%</Typography><Typography variant="body2" sx={{ opacity: 0.9 }}>Traceable Supply Chain</Typography></Grid>
                    <Grid item xs={4}><Typography variant="h3" fontWeight="700">2026</Typography><Typography variant="body2" sx={{ opacity: 0.9 }}>EUDR Ready Compliance</Typography></Grid>
                  </Grid>
                </Paper>
              </Box>
            </Fade>
          </Grid>
          
          <Grid item xs={12} lg={5} sx={{ display: 'flex', alignItems: 'center', background: 'white', py: 6 }}>
            <Zoom in={mounted} timeout={1000}>
              <Box sx={{ width: '100%', px: { xs: 3, md: 6 } }}>
                <Box mb={4}>
                  <Box sx={{ width: 56, height: 56, borderRadius: 2, background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3, boxShadow: '0 8px 16px rgba(25, 118, 210, 0.25)' }}>
                    <Lock sx={{ color: 'white', fontSize: 28 }} />
                  </Box>
                  <Typography variant="h4" fontWeight="700" gutterBottom sx={{ color: '#1a1a1a' }}>Welcome Back</Typography>
                  <Typography variant="body1" sx={{ color: '#616161' }}>Sign in to access your organization portal</Typography>
                </Box>
                
                {error && (<Fade in={!!error}><Alert severity="error" sx={{ mb: 3, borderRadius: 2, border: '1px solid', borderColor: alpha('#d32f2f', 0.3) }}>{error}</Alert></Fade>)}
                
                <form onSubmit={handleSubmit}>
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant="body2" fontWeight="600" gutterBottom sx={{ color: '#1a1a1a', mb: 1 }}>Username</Typography>
                      <TextField fullWidth value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus placeholder="Enter your username" InputProps={{ startAdornment: (<InputAdornment position="start"><Person sx={{ color: '#9e9e9e' }} /></InputAdornment>) }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#f5f5f5', transition: 'all 0.2s ease', '& fieldset': { borderColor: 'transparent' }, '&:hover': { backgroundColor: '#eeeeee', '& fieldset': { borderColor: 'transparent' } }, '&.Mui-focused': { backgroundColor: 'white', boxShadow: `0 0 0 3px ${alpha('#1976d2', 0.1)}`, '& fieldset': { borderColor: '#1976d2', borderWidth: '2px' } } } }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight="600" gutterBottom sx={{ color: '#1a1a1a', mb: 1 }}>Password</Typography>
                      <TextField fullWidth type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password" InputProps={{ startAdornment: (<InputAdornment position="start"><Lock sx={{ color: '#9e9e9e' }} /></InputAdornment>), endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small" sx={{ color: '#9e9e9e' }}>{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>) }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#f5f5f5', transition: 'all 0.2s ease', '& fieldset': { borderColor: 'transparent' }, '&:hover': { backgroundColor: '#eeeeee', '& fieldset': { borderColor: 'transparent' } }, '&.Mui-focused': { backgroundColor: 'white', boxShadow: `0 0 0 3px ${alpha('#1976d2', 0.1)}`, '& fieldset': { borderColor: '#1976d2', borderWidth: '2px' } } } }} />
                    </Box>
                    <FormControlLabel control={<Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} sx={{ color: '#bdbdbd', '&.Mui-checked': { color: '#1976d2' } }} />} label={<Typography variant="body2" sx={{ color: '#616161' }}>Remember me on this device</Typography>} />
                    <Button fullWidth type="submit" variant="contained" size="large" disabled={loading} sx={{ py: 1.75, borderRadius: 2, textTransform: 'none', fontSize: '1rem', fontWeight: 600, background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)', transition: 'all 0.2s ease', '&:hover': { background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)', boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)', transform: 'translateY(-1px)' }, '&:active': { transform: 'translateY(0px)' }, '&:disabled': { background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', opacity: 0.6 } }}>
                      {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Sign In'}
                    </Button>
                  </Stack>
                </form>
                
                <Divider sx={{ my: 4 }}><Chip label="New Exporter" size="small" sx={{ fontWeight: 600, backgroundColor: alpha('#1976d2', 0.1), color: '#1976d2' }} /></Divider>
                
                <Button fullWidth variant="outlined" size="large" onClick={() => router.push('/register-exporter')} startIcon={<Coffee />} sx={{ py: 1.75, borderRadius: 2, textTransform: 'none', fontSize: '1rem', fontWeight: 600, borderColor: '#1976d2', color: '#1976d2', borderWidth: 2, transition: 'all 0.2s ease', '&:hover': { borderWidth: 2, borderColor: '#1565c0', backgroundColor: alpha('#1976d2', 0.04), transform: 'translateY(-1px)' } }}>
                  Register as Coffee Exporter
                </Button>
                
                <Typography variant="caption" display="block" textAlign="center" sx={{ color: '#9e9e9e', mt: 4 }}>
                  © 2026 Ethiopian Coffee Export Consortium. All rights reserved.
                </Typography>
                
                <Stack direction="row" spacing={2} justifyContent="center" mt={3} sx={{ opacity: 0.6 }}>
                  <Stack alignItems="center" spacing={0.5}><Security sx={{ fontSize: 20, color: '#9e9e9e' }} /><Typography variant="caption" sx={{ color: '#9e9e9e' }}>Secure</Typography></Stack>
                  <Stack alignItems="center" spacing={0.5}><CheckCircle sx={{ fontSize: 20, color: '#9e9e9e' }} /><Typography variant="caption" sx={{ color: '#9e9e9e' }}>Verified</Typography></Stack>
                  <Stack alignItems="center" spacing={0.5}><Verified sx={{ fontSize: 20, color: '#9e9e9e' }} /><Typography variant="caption" sx={{ color: '#9e9e9e' }}>Compliant</Typography></Stack>
                </Stack>
              </Box>
            </Zoom>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default LoginPage;
