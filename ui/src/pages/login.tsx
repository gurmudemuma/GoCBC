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

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, py: 2 }}>
        <Grid container spacing={0} alignItems="center" sx={{ minHeight: '100vh' }}>
          
          <Grid item xs={12} lg={7} sx={{ display: 'flex', alignItems: 'center', py: 3 }}>
            <Fade in={mounted} timeout={1000}>
              <Box sx={{ width: '100%', px: { xs: 3, md: 6 } }}>
                
                <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #9b30b7 0%, #7a2596 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 24px rgba(155, 48, 183, 0.3)',
                    }}
                  >
                    <Coffee sx={{ fontSize: 32, color: '#FFD700' }} />
                  </Box>
                  <Box>
                    <Typography 
                      variant="h6" 
                      fontWeight="700" 
                      sx={{ 
                        color: '#1a1a1a',
                        letterSpacing: '-0.5px',
                        lineHeight: 1.2
                      }}
                    >
                      Ethiopian Coffee Export
                    </Typography>
                    <Typography 
                      variant="h6" 
                      fontWeight="700" 
                      sx={{ 
                        color: '#9b30b7',
                        letterSpacing: '-0.5px' 
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
                    mb: 2,
                    color: '#1a1a1a',
                    letterSpacing: '-1px',
                    lineHeight: 1.2,
                  }}
                >
                  Transforming Coffee Export
                  <br />
                  <span style={{ color: '#9b30b7' }}>Through Blockchain</span>
                </Typography>

                <Typography 
                  variant="body1" 
                  sx={{ 
                    mb: 3,
                    color: '#616161',
                    fontWeight: 400,
                    lineHeight: 1.5,
                    maxWidth: '600px'
                  }}
                >
                  A unified digital ecosystem connecting all stakeholders with transparent, 
                  compliant, and efficient coffee trade operations.
                </Typography>

                <Grid container spacing={2} mb={3}>
                  {features.map((feature, index) => (
                    <Grid item xs={12} sm={4} key={index}>
                      <Zoom in={mounted} timeout={1200 + index * 200}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: 2,
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
                              mb: 1
                            }}
                          >
                            {feature.icon}
                          </Box>
                          <Typography 
                            variant="body2" 
                            fontWeight="700" 
                            gutterBottom
                            sx={{ color: '#1a1a1a' }}
                          >
                            {feature.title}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ color: '#616161', lineHeight: 1.4 }}
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
                    p: 3,
                    background: 'linear-gradient(135deg, #9b30b7 0%, #7a2596 100%)',
                    borderRadius: 2,
                    color: 'white',
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="h4" fontWeight="700">8</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        Organizations
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="h4" fontWeight="700">100%</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        Traceable
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="h4" fontWeight="700">2026</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9 }}>
                        EUDR Ready
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

              </Box>
            </Fade>
          </Grid>

          <Grid 
            item 
            xs={12} 
            lg={5} 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              background: 'white',
              py: 3
            }}
          >
            <Zoom in={mounted} timeout={1000}>
              <Box sx={{ width: '100%', px: { xs: 3, md: 5 } }}>
                
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
                  <Stack spacing={2.5}>
                    
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
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Person sx={{ color: '#9e9e9e' }} />
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            backgroundColor: '#f5f5f5',
                            transition: 'all 0.2s ease',
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
                        placeholder="Enter your password"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Lock sx={{ color: '#9e9e9e' }} />
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
                        py: 1.5,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '1rem',
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, #9b30b7 0%, #7a2596 100%)',
                        boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #7a2596 0%, #6d1f8a 100%)',
                          boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
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

                <Divider sx={{ my: 3 }}>
                  <Chip
                    label="New Exporter"
                    size="small"
                    sx={{
                      fontWeight: 600,
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
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1rem',
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
                  sx={{ color: '#9e9e9e', mt: 2 }}
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
