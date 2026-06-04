// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Ultra-Modern 2026 Login Page - Next-Gen Design

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
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
  LinearProgress,
  Chip,
  Tooltip,
  Switch,
  Fade,
  Zoom,
  Slide,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock,
  Person,
  Coffee,
  Security,
  AccountBalance,
  LocalShipping,
  Store,
  CheckCircle,
  Fingerprint,
  DarkMode,
  LightMode,
  FaceRetouchingNatural,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';

const LoginPage2026: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [mounted, setMounted] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const theme = useTheme();

  // Mount animation
  useEffect(() => {
    setMounted(true);
    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
    }
    // Load saved username if "remember me" was checked
    const savedUsername = localStorage.getItem('rememberedUsername');
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Password strength calculator
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 10;
    setPasswordStrength(Math.min(strength, 100));
  }, [password]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Save username if remember me is checked
    if (rememberMe) {
      localStorage.setItem('rememberedUsername', username);
    } else {
      localStorage.removeItem('rememberedUsername');
    }

    try {
      await login(username, password);
      // Success - login function will handle redirect
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
      setLoading(false);
    }
  };

  const quickLogin = (user: string) => {
    setUsername(user);
    setPassword('password123');
  };

  const features = [
    { icon: <Security />, title: 'Blockchain Security', desc: 'Immutable & transparent' },
    { icon: <CheckCircle />, title: 'EUDR Compliant', desc: '2026 regulations ready' },
    { icon: <Coffee />, title: 'Full Traceability', desc: 'Farm to export tracking' },
  ];

  const organizations = [
    { name: 'ECTA', user: 'ecta_admin', color: '#078930', icon: <Coffee /> },
    { name: 'ECX', user: 'ecx_admin', color: '#0F47AF', icon: <Store /> },
    { name: 'NBE', user: 'nbe_admin', color: '#8B6F47', icon: <AccountBalance /> },
    { name: 'Banks', user: 'bank_admin', color: '#9b30b7', icon: <AccountBalance /> },
    { name: 'Customs', user: 'customs_admin', color: '#0F47AF', icon: <Security /> },
    { name: 'Shipping', user: 'shipping_admin', color: '#006064', icon: <LocalShipping /> },
  ];

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return '#f44336';
    if (passwordStrength < 70) return '#ff9800';
    return '#4caf50';
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength < 40) return 'Weak';
    if (passwordStrength < 70) return 'Medium';
    return 'Strong';
  };

  // Animated particles background
  const Particles = () => (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        opacity: 0.3,
      }}
    >
      {[...Array(20)].map((_, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            width: Math.random() * 4 + 2,
            height: Math.random() * 4 + 2,
            borderRadius: '50%',
            background: darkMode ? '#FFD700' : '#ffffff',
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animation: `float${i % 3} ${15 + Math.random() * 10}s ease-in-out infinite`,
            '@keyframes float0': {
              '0%, 100%': { transform: 'translateY(0px)' },
              '50%': { transform: 'translateY(-20px)' },
            },
            '@keyframes float1': {
              '0%, 100%': { transform: 'translate(0px, 0px)' },
              '50%': { transform: 'translate(10px, -15px)' },
            },
            '@keyframes float2': {
              '0%, 100%': { transform: 'translate(0px, 0px)' },
              '50%': { transform: 'translate(-10px, -25px)' },
            },
          }}
        />
      ))}
    </Box>
  );

  const bgColor = darkMode
    ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
    : 'linear-gradient(135deg, #8b2ca8 0%, #7a2596 50%, #6d1f8a 100%)';

  const cardBg = darkMode
    ? 'rgba(30, 30, 46, 0.85)'
    : 'rgba(255, 255, 255, 0.85)';

  return (
    <Fade in={mounted} timeout={800}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          background: bgColor,
          position: 'relative',
          overflow: 'hidden',
          transition: 'background 0.5s ease',
        }}
      >
        <Particles />

        {/* Dark Mode Toggle - Top Right */}
        <Box
          sx={{
            position: 'absolute',
            top: 20,
            right: 20,
            zIndex: 1000,
          }}
        >
          <Tooltip title={darkMode ? 'Light Mode' : 'Dark Mode'}>
            <IconButton
              onClick={toggleDarkMode}
              sx={{
                background: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.3)'}`,
                color: darkMode ? '#FFD700' : '#ffffff',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.3)',
                  transform: 'rotate(180deg)',
                },
              }}
            >
              {darkMode ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Tooltip>
        </Box>

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: 4 }}>
          <Grid container spacing={4} alignItems="center" sx={{ minHeight: '100vh' }}>
            {/* Left Side - Branding & Info */}
            <Grid item xs={12} md={6}>
              <Slide direction="right" in={mounted} timeout={1000}>
                <Box sx={{ color: darkMode ? '#ffffff' : 'white', pr: { md: 4 } }}>
                  {/* Logo & Title */}
                  <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                    <Box
                      sx={{
                        width: 70,
                        height: 70,
                        borderRadius: 3,
                        background: alpha('#fff', darkMode ? 0.1 : 0.15),
                        backdropFilter: 'blur(20px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `2px solid ${alpha('#fff', darkMode ? 0.15 : 0.2)}`,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'scale(1.05) rotate(5deg)',
                        },
                      }}
                    >
                      <Coffee sx={{ fontSize: 40, color: '#ffd54f' }} />
                    </Box>
                    <Box>
                      <Typography variant="h3" fontWeight="700" letterSpacing="-0.5px">
                        CECBS
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                        Blockchain-Powered Coffee Export
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Main Description */}
                  <Typography variant="h5" fontWeight="600" mb={2} sx={{ lineHeight: 1.4 }}>
                    Ethiopian Coffee Export Consortium
                  </Typography>
                  <Typography variant="body1" sx={{ opacity: 0.85, mb: 4, lineHeight: 1.7 }}>
                    Unified platform connecting all stakeholders in the Ethiopian coffee export ecosystem
                    with blockchain-powered traceability, EUDR compliance, and seamless collaboration.
                  </Typography>

                  {/* Features with Animation */}
                  <Stack spacing={2} mb={4}>
                    {features.map((feature, index) => (
                      <Zoom in={mounted} timeout={1200 + index * 200} key={index}>
                        <Stack
                          direction="row"
                          spacing={2}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            background: alpha('#fff', darkMode ? 0.08 : 0.1),
                            backdropFilter: 'blur(20px)',
                            border: `1px solid ${alpha('#fff', darkMode ? 0.1 : 0.15)}`,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              background: alpha('#fff', darkMode ? 0.12 : 0.15),
                              transform: 'translateX(10px)',
                            },
                          }}
                        >
                          <Box sx={{ color: '#ffd54f' }}>{feature.icon}</Box>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="600">
                              {feature.title}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                              {feature.desc}
                            </Typography>
                          </Box>
                        </Stack>
                      </Zoom>
                    ))}
                  </Stack>

                  {/* Stats */}
                  <Grid container spacing={2}>
                    {[
                      { value: '6', label: 'Organizations' },
                      { value: '100%', label: 'Traceable' },
                      { value: '2026', label: 'EUDR Ready' },
                    ].map((stat, index) => (
                      <Grid item xs={4} key={index}>
                        <Fade in={mounted} timeout={1500 + index * 200}>
                          <Box>
                            <Typography variant="h4" fontWeight="700">
                              {stat.value}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                              {stat.label}
                            </Typography>
                          </Box>
                        </Fade>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Slide>
            </Grid>

            {/* Right Side - Login Form */}
            <Grid item xs={12} md={6}>
              <Zoom in={mounted} timeout={1000}>
                <Card
                  elevation={24}
                  sx={{
                    borderRadius: 4,
                    overflow: 'visible',
                    background: cardBg,
                    backdropFilter: 'blur(40px)',
                    border: `1px solid ${darkMode ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 215, 0, 0.2)'}`,
                    boxShadow: darkMode
                      ? '0 25px 70px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 215, 0, 0.1)'
                      : '0 20px 60px rgba(255, 215, 0, 0.3), 0 0 0 1px rgba(255, 215, 0, 0.1)',
                    transition: 'all 0.5s ease',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: darkMode
                        ? '0 30px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 215, 0, 0.2)'
                        : '0 25px 70px rgba(255, 215, 0, 0.4), 0 0 0 1px rgba(255, 215, 0, 0.2)',
                    },
                  }}
                >
                  <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
                    {/* Form Header */}
                    <Box textAlign="center" mb={4}>
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          background: `linear-gradient(135deg, #9b30b7, #7a2596)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                          mb: 2,
                          boxShadow: `0 8px 24px ${alpha('#9b30b7', 0.4)}`,
                          border: '3px solid rgba(255, 215, 0, 0.3)',
                          transition: 'all 0.3s ease',
                          animation: 'pulse 2s ease-in-out infinite',
                          '@keyframes pulse': {
                            '0%, 100%': {
                              transform: 'scale(1)',
                              boxShadow: `0 8px 24px ${alpha('#9b30b7', 0.4)}`,
                            },
                            '50%': {
                              transform: 'scale(1.05)',
                              boxShadow: `0 12px 32px ${alpha('#9b30b7', 0.6)}`,
                            },
                          },
                        }}
                      >
                        <Lock sx={{ color: 'white', fontSize: 28 }} />
                      </Box>
                      <Typography
                        variant="h4"
                        fontWeight="700"
                        gutterBottom
                        sx={{ color: darkMode ? '#ffffff' : 'inherit' }}
                      >
                        Welcome Back
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Sign in to access your organization portal
                      </Typography>

                      {/* Biometric Login Hint */}
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="center"
                        mt={2}
                        sx={{ opacity: 0.6 }}
                      >
                        <Tooltip title="Face ID (Coming Soon)">
                          <IconButton size="small" disabled>
                            <FaceRetouchingNatural />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Fingerprint (Coming Soon)">
                          <IconButton size="small" disabled>
                            <Fingerprint />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>

                    {error && (
                      <Fade in={!!error}>
                        <Alert
                          severity="error"
                          sx={{
                            mb: 3,
                            borderRadius: 2,
                            animation: 'shake 0.5s',
                            '@keyframes shake': {
                              '0%, 100%': { transform: 'translateX(0)' },
                              '25%': { transform: 'translateX(-10px)' },
                              '75%': { transform: 'translateX(10px)' },
                            },
                          }}
                        >
                          {error}
                        </Alert>
                      </Fade>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit}>
                      <Stack spacing={2.5}>
                        <TextField
                          fullWidth
                          label="Username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                          autoFocus
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Person color="action" />
                              </InputAdornment>
                            ),
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                              },
                              '&.Mui-focused': {
                                transform: 'translateY(-2px)',
                                boxShadow: `0 4px 12px ${alpha('#9b30b7', 0.2)}`,
                              },
                            },
                          }}
                        />

                        <Box>
                          <TextField
                            fullWidth
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <Lock color="action" />
                                </InputAdornment>
                              ),
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    onClick={() => setShowPassword(!showPassword)}
                                    edge="end"
                                    size="small"
                                  >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  transform: 'translateY(-2px)',
                                },
                                '&.Mui-focused': {
                                  transform: 'translateY(-2px)',
                                  boxShadow: `0 4px 12px ${alpha('#9b30b7', 0.2)}`,
                                },
                              },
                            }}
                          />

                          {/* Password Strength Indicator */}
                          {password && (
                            <Fade in={!!password}>
                              <Box mt={1}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <LinearProgress
                                    variant="determinate"
                                    value={passwordStrength}
                                    sx={{
                                      flex: 1,
                                      height: 4,
                                      borderRadius: 2,
                                      backgroundColor: alpha(getPasswordStrengthColor(), 0.2),
                                      '& .MuiLinearProgress-bar': {
                                        backgroundColor: getPasswordStrengthColor(),
                                        borderRadius: 2,
                                        transition: 'all 0.3s ease',
                                      },
                                    }}
                                  />
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: getPasswordStrengthColor(),
                                      fontWeight: 600,
                                      minWidth: 60,
                                    }}
                                  >
                                    {getPasswordStrengthLabel()}
                                  </Typography>
                                </Stack>
                              </Box>
                            </Fade>
                          )}
                        </Box>

                        {/* Remember Me */}
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={rememberMe}
                              onChange={(e) => setRememberMe(e.target.checked)}
                              sx={{
                                color: '#9b30b7',
                                '&.Mui-checked': {
                                  color: '#9b30b7',
                                },
                              }}
                            />
                          }
                          label={
                            <Typography variant="body2" color="text.secondary">
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
                            background: `linear-gradient(135deg, #9b30b7 0%, #7a2596 100%)`,
                            color: '#ffffff',
                            boxShadow: `0 4px 14px ${alpha('#9b30b7', 0.3)}`,
                            border: '1px solid rgba(255, 215, 0, 0.2)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              background: `linear-gradient(135deg, #8b2ca8 0%, #6d1f8a 100%)`,
                              boxShadow: `0 8px 24px ${alpha('#9b30b7', 0.5)}`,
                              border: '1px solid rgba(255, 215, 0, 0.4)',
                              transform: 'translateY(-2px)',
                            },
                            '&:active': {
                              transform: 'translateY(0px)',
                            },
                            '&:disabled': {
                              background: `linear-gradient(135deg, #9b30b7 0%, #7a2596 100%)`,
                              opacity: 0.6,
                            },
                          }}
                        >
                          {loading ? (
                            <CircularProgress size={24} color="inherit" />
                          ) : (
                            'Sign In Securely'
                          )}
                        </Button>
                      </Stack>
                    </form>

                    <Divider sx={{ my: 3 }}>
                      <Chip
                        label="Quick Access"
                        size="small"
                        sx={{
                          fontWeight: 600,
                          background: darkMode ? 'rgba(255, 215, 0, 0.1)' : undefined,
                        }}
                      />
                    </Divider>

                    {/* Quick Login Buttons */}
                    <Grid container spacing={1.5}>
                      {organizations.map((org, index) => (
                        <Grid item xs={6} sm={4} key={org.name}>
                          <Fade in={mounted} timeout={1500 + index * 100}>
                            <Button
                              fullWidth
                              variant="outlined"
                              size="small"
                              onClick={() => quickLogin(org.user)}
                              sx={{
                                py: 1.5,
                                borderRadius: 2,
                                textTransform: 'none',
                                borderColor: alpha(org.color, 0.3),
                                color: org.color,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  borderColor: org.color,
                                  background: alpha(org.color, 0.1),
                                  transform: 'scale(1.05)',
                                },
                              }}
                            >
                              <Stack alignItems="center" spacing={0.5}>
                                <Box sx={{ fontSize: 20 }}>{org.icon}</Box>
                                <Typography variant="caption" fontWeight="600">
                                  {org.name}
                                </Typography>
                              </Stack>
                            </Button>
                          </Fade>
                        </Grid>
                      ))}
                    </Grid>

                    <Divider sx={{ my: 3 }}>
                      <Chip
                        label="New Exporter?"
                        size="small"
                        sx={{
                          fontWeight: 600,
                          background: darkMode ? 'rgba(255, 215, 0, 0.1)' : undefined,
                        }}
                      />
                    </Divider>

                    {/* Register as Exporter Button */}
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
                        borderColor: '#078930',
                        color: '#078930',
                        borderWidth: 2,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          borderWidth: 2,
                          borderColor: '#078930',
                          background: alpha('#078930', 0.1),
                          transform: 'translateY(-2px)',
                          boxShadow: `0 4px 12px ${alpha('#078930', 0.3)}`,
                        },
                      }}
                    >
                      Register as Coffee Exporter
                    </Button>

                    <Box
                      sx={{
                        mt: 3,
                        p: 2,
                        borderRadius: 2,
                        background: alpha(darkMode ? '#FFD700' : theme.palette.info.main, 0.1),
                        border: `1px solid ${alpha(
                          darkMode ? '#FFD700' : theme.palette.info.main,
                          0.2
                        )}`,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        <strong>Demo Password:</strong> password123
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Click any organization above to auto-fill credentials
                      </Typography>
                    </Box>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      textAlign="center"
                      mt={3}
                    >
                      © 2026 Ethiopian Coffee Export Consortium. All rights reserved.
                    </Typography>
                  </CardContent>
                </Card>
              </Zoom>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Fade>
  );
};

export default LoginPage2026;
