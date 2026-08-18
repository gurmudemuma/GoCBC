// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Professional Enterprise Login Page - 2026

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  alpha,
  useTheme,
  Checkbox,
  FormControlLabel,
  Chip,
  Fade,
  Zoom,
  Paper,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock,
  Person,
  Coffee,
  Security,
  CheckCircle,
  Verified,
  Shield,
  TrendingUp,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';

const ProfessionalLoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const theme = useTheme();

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
    if (isAuthenticated) {
      router.push('/');
    }
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
    { 
      icon: <Shield sx={{ fontSize: 32 }} />, 
      title: 'Enterprise Security', 
      desc: 'Bank-grade encryption and blockchain immutability',
      color: '#9b30b7'
    },
    { 
      icon: <Verified sx={{ fontSize: 32 }} />, 
      title: 'EUDR Compliant', 
      desc: '2026 regulations ready with full traceability',
      color: '#FFD700'
    },
    { 
      icon: <TrendingUp sx={{ fontSize: 32 }} />, 
      title: 'Real-Time Analytics', 
      desc: 'Live insights across entire supply chain',
      color: '#9b30b7'
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.03,
          backgroundImage: `repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)`,
          backgroundSize: '10px 10px',
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(155, 48, 183, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-20%',
          left: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      <Container 
        maxWidth="xl" 
        sx={{ 
          position: 'relative', 
          zIndex: 1, 
          py: { xs: 2, md: 4 },
          px: { xs: 1, sm: 2, md: 3 }, // Responsive horizontal padding
          overflow: 'hidden', // Prevent horizontal scroll
          width: '100%',
          maxWidth: { xs: '100vw', sm: '100%' } // Prevent overflow on mobile
        }}
      >
        <Grid container spacing={0} alignItems="stretch" sx={{ minHeight: '100vh', width: '100%', margin: 0 }}>
          
          {/* Left Side - Hero Section */}
          <Grid 
            item 
            xs={12} 
            md={7} 
            sx={{ 
              display: 'flex',
              alignItems: 'center', 
              py: { xs: 2, md: 3 },
              px: { xs: 1, sm: 2 } // Responsive padding
            }}
          >
            <Fade in={mounted} timeout={1000}>
              <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 6 } }}>
                
                <Stack direction="row" alignItems="center" spacing={{ xs: 1.5, sm: 2 }} mb={{ xs: 1.5, md: 2 }}>
                  <Box
                    sx={{
                      width: { xs: 48, md: 56 },
                      height: { xs: 48, md: 56 },
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #9b30b7 0%, #7a2596 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 24px rgba(155, 48, 183, 0.3)',
                    }}
                  >
                    <Coffee sx={{ fontSize: { xs: 28, md: 32 }, color: '#FFD700' }} />
                  </Box>
                  <Box>
                    <Typography 
                      variant="h6" 
                      fontWeight="700" 
                      sx={{ 
                        color: '#1a1a1a',
                        letterSpacing: '-0.5px',
                        lineHeight: 1.2,
                        fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' }
                      }}
                    >
                      Ethiopian Coffee Export
                    </Typography>
                    <Typography 
                      variant="h6" 
                      fontWeight="700" 
                      sx={{ 
                        color: '#9b30b7',
                        letterSpacing: '-0.5px',
                        fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' }
                      }}
                    >
                      Consortium Blockchain
                    </Typography>
                  </Box>
                </Stack>

                <Typography 
                  variant="h4" 
                  fontWeight="700" 
                  sx={{ 
                    mb: { xs: 1.5, md: 2 },
                    color: '#1a1a1a',
                    letterSpacing: '-1px',
                    lineHeight: 1.2,
                    fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' }
                  }}
                >
                  Transforming Coffee Export
                  <br />
                  <span style={{ color: '#9b30b7' }}>Through Blockchain</span>
                </Typography>

                <Typography 
                  variant="body1" 
                  sx={{ 
                    mb: { xs: 2, md: 3 },
                    color: '#616161',
                    fontWeight: 400,
                    lineHeight: 1.5,
                    maxWidth: '600px',
                    fontSize: { xs: '0.875rem', sm: '0.95rem', md: '1rem' }
                  }}
                >
                  A unified digital ecosystem connecting all stakeholders with transparent, 
                  compliant, and efficient coffee trade operations.
                </Typography>

                <Grid container spacing={{ xs: 1.5, md: 2 }} mb={{ xs: 2, md: 3 }}>
                  {features.map((feature, index) => (
                    <Grid item xs={12} sm={4} key={index}>
                      <Zoom in={mounted} timeout={1200 + index * 200}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: { xs: 1.5, sm: 2, md: 2.5 },
                            height: '100%',
                            background: 'rgba(255, 255, 255, 0.9)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid',
                            borderColor: alpha(feature.color, 0.2),
                            borderRadius: 2,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: `0 12px 24px ${alpha(feature.color, 0.15)}`,
                              borderColor: alpha(feature.color, 0.4),
                            },
                          }}
                        >
                          <Box 
                            sx={{ 
                              color: feature.color,
                              mb: { xs: 0.5, md: 1.5 },
                              '& svg': { fontSize: { xs: 24, md: 32 } }
                            }}
                          >
                            {feature.icon}
                          </Box>
                          <Typography 
                            variant="body2" 
                            fontWeight="700" 
                            gutterBottom
                            sx={{ 
                              color: '#1a1a1a',
                              fontSize: { xs: '0.8rem', sm: '0.85rem', md: '0.875rem' }
                            }}
                          >
                            {feature.title}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: '#616161', 
                              lineHeight: 1.5,
                              fontSize: { xs: '0.7rem', sm: '0.75rem' }
                            }}
                          >
                            {feature.desc}
                          </Typography>
                        </Paper>
                      </Zoom>
                    </Grid>
                  ))}
                </Grid>

                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 2, sm: 2.5, md: 3 },
                    background: 'linear-gradient(135deg, #9b30b7 0%, #7a2596 100%)',
                    borderRadius: 2,
                    color: 'white',
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="h4" fontWeight="700" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' } }}>
                        8
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                        Organizations
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="h4" fontWeight="700" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' } }}>
                        100%
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                        Traceable
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="h4" fontWeight="700" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' } }}>
                        2026
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                        EUDR Ready
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

              </Box>
            </Fade>
          </Grid>

          {/* Right Side - Login Form */}
          <Grid 
            item 
            xs={12} 
            lg={5} 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'center',
              background: 'white',
              py: { xs: 4, md: 3 },
              minHeight: { xs: '100vh', lg: 'auto' }, // Full height on mobile
            }}
          >
            <Zoom in={mounted} timeout={1000}>
              <Box sx={{ width: '100%', maxWidth: '480px', px: { xs: 3, sm: 4, md: 5 } }}>
                
                {/* Mobile Logo Header - Only visible on small screens */}
                <Box 
                  sx={{ 
                    display: { xs: 'block', lg: 'none' }, 
                    mb: 4,
                    textAlign: 'center'
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} mb={2}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #9b30b7 0%, #7a2596 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 24px rgba(155, 48, 183, 0.3)',
                      }}
                    >
                      <Coffee sx={{ fontSize: 28, color: '#FFD700' }} />
                    </Box>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography 
                        variant="body1" 
                        fontWeight="700" 
                        sx={{ 
                          color: '#1a1a1a',
                          letterSpacing: '-0.3px',
                          lineHeight: 1.2
                        }}
                      >
                        Ethiopian Coffee Export
                      </Typography>
                      <Typography 
                        variant="body1" 
                        fontWeight="700" 
                        sx={{ 
                          color: '#9b30b7',
                          letterSpacing: '-0.3px' 
                        }}
                      >
                        Consortium Blockchain
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#616161',
                      maxWidth: '400px',
                      mx: 'auto'
                    }}
                  >
                    Transforming coffee export through blockchain technology
                  </Typography>
                </Box>
                
                <Box mb={3} textAlign="center">
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #9b30b7 0%, #7a2596 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2,
                      boxShadow: '0 8px 16px rgba(155, 48, 183, 0.25)',
                      margin: '0 auto',
                    }}
                  >
                    <Lock sx={{ color: '#FFD700', fontSize: 24 }} />
                  </Box>
                  <Typography 
                    variant="h5" 
                    fontWeight="700" 
                    gutterBottom
                    sx={{ color: '#1a1a1a' }}
                  >
                    Login
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ color: '#616161' }}
                  >
                    Sign in to access your organization portal
                  </Typography>
                </Box>

                {error && (
                  <Fade in={!!error}>
                    <Alert
                      severity="error"
                      sx={{
                        mb: 2,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: alpha(theme.palette.error.main, 0.3),
                      }}
                    >
                      {error}
                    </Alert>
                  </Fade>
                )}

                <form onSubmit={handleSubmit}>
                  <Stack spacing={{ xs: 2, sm: 2.5 }}>
                    
                    <Box>
                      <Typography 
                        variant="body2" 
                        fontWeight="600" 
                        gutterBottom
                        sx={{ color: '#1a1a1a', mb: 1 }}
                      >
                        Username
                      </Typography>
                      <TextField
                        fullWidth
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        autoFocus
                        placeholder="Enter your username"
                        size="medium"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Person sx={{ color: '#9e9e9e', fontSize: { xs: 20, sm: 24 } }} />
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            backgroundColor: '#f5f5f5',
                            transition: 'all 0.2s ease',
                            fontSize: { xs: '16px', sm: '1rem' }, // Prevent zoom on iOS
                            '& fieldset': {
                              borderColor: 'transparent',
                            },
                            '&:hover': {
                              backgroundColor: '#eeeeee',
                              '& fieldset': {
                                borderColor: 'transparent',
                              },
                            },
                            '&.Mui-focused': {
                              backgroundColor: 'white',
                              boxShadow: `0 0 0 3px ${alpha('#9b30b7', 0.1)}`,
                              '& fieldset': {
                                borderColor: '#9b30b7',
                                borderWidth: '2px',
                              },
                            },
                          },
                        }}
                      />
                    </Box>

                    <Box>
                      <Typography 
                        variant="body2" 
                        fontWeight="600" 
                        gutterBottom
                        sx={{ color: '#1a1a1a', mb: 1 }}
                      >
                        Password
                      </Typography>
                      <TextField
                        fullWidth
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        size="medium"
                        placeholder="Enter your password"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Lock sx={{ color: '#9e9e9e', fontSize: { xs: 20, sm: 24 } }} />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                                size="small"
                                sx={{ color: '#9e9e9e' }}
                              >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            backgroundColor: '#f5f5f5',
                            transition: 'all 0.2s ease',
                            fontSize: { xs: '16px', sm: '1rem' }, // Prevent zoom on iOS
                            '& fieldset': {
                              borderColor: 'transparent',
                            },
                            '&:hover': {
                              backgroundColor: '#eeeeee',
                              '& fieldset': {
                                borderColor: 'transparent',
                              },
                            },
                            '&.Mui-focused': {
                              backgroundColor: 'white',
                              boxShadow: `0 0 0 3px ${alpha('#9b30b7', 0.1)}`,
                              '& fieldset': {
                                borderColor: '#9b30b7',
                                borderWidth: '2px',
                              },
                            },
                          },
                        }}
                      />
                    </Box>

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          sx={{
                            color: '#bdbdbd',
                            '&.Mui-checked': {
                              color: '#9b30b7',
                            },
                          }}
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ color: '#616161' }}>
                          Remember me on this device
                        </Typography>
                      }
                    />

                    <Button
                      fullWidth
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={loading}
                      sx={{
                        py: { xs: 1.5, sm: 1.75 },
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: { xs: '0.95rem', sm: '1rem' },
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, #9b30b7 0%, #7a2596 100%)',
                        boxShadow: '0 4px 12px rgba(155, 48, 183, 0.3)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #7a2596 0%, #6d1f8a 100%)',
                          boxShadow: '0 6px 16px rgba(155, 48, 183, 0.4)',
                          transform: 'translateY(-1px)',
                        },
                        '&:active': {
                          transform: 'translateY(0px)',
                        },
                        '&:disabled': {
                          background: 'linear-gradient(135deg, #9b30b7 0%, #7a2596 100%)',
                          opacity: 0.6,
                        },
                      }}
                    >
                      {loading ? (
                        <CircularProgress size={24} sx={{ color: 'white' }} />
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </Stack>
                </form>

                <Divider sx={{ my: { xs: 2.5, sm: 3 } }}>
                  <Chip
                    label="New Exporter"
                    size="small"
                    sx={{
                      fontWeight: 600,
                      fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                      backgroundColor: alpha('#FFD700', 0.15),
                      color: '#9b30b7',
                      border: `1px solid ${alpha('#FFD700', 0.3)}`,
                    }}
                  />
                </Divider>

                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  onClick={() => router.push('/register-exporter')}
                  startIcon={<Coffee />}
                  sx={{
                    py: { xs: 1.5, sm: 1.75 },
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: { xs: '0.95rem', sm: '1rem' },
                    fontWeight: 600,
                    borderColor: '#FFD700',
                    color: '#9b30b7',
                    borderWidth: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderWidth: 2,
                      borderColor: '#FFD700',
                      backgroundColor: alpha('#FFD700', 0.08),
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  Register as Coffee Exporter
                </Button>

                <Typography
                  variant="caption"
                  display="block"
                  textAlign="center"
                  sx={{ color: '#9e9e9e', mt: { xs: 2.5, sm: 3 }, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                >
                  © 2026 Ethiopian Coffee Export Consortium
                </Typography>

              </Box>
            </Zoom>
          </Grid>

        </Grid>
      </Container>
    </Box>
  );
};

export default ProfessionalLoginPage;
