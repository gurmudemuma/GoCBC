// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Professional Navigation Bar with Breadcrumbs & Quick Actions

import React, { useState, useMemo } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Chip,
  Divider,
  ListItemIcon,
  ListItemText,
  Badge,
  Breadcrumbs,
  Link,
  Tooltip,
  Button,
  useScrollTrigger,
  Slide,
} from '@mui/material';
import {
  AccountCircle,
  Logout,
  Settings,
  Notifications,
  Coffee,
  Dashboard,
  Help,
  Home,
  NavigateNext,
  Search,
  Add,
  Assessment,
  LocalShipping,
  Description,
  VerifiedUser,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import NextLink from 'next/link';

interface HideOnScrollProps {
  children: React.ReactElement;
}

function HideOnScroll({ children }: HideOnScrollProps) {
  const trigger = useScrollTrigger();
  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  );
}

const NavigationBar: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotifOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotifAnchorEl(event.currentTarget);
  };

  const handleNotifClose = () => {
    setNotifAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  const handleProfile = () => {
    handleMenuClose();
    router.push('/profile');
  };

  const handleSettings = () => {
    handleMenuClose();
    router.push('/settings');
  };

  const getOrganizationLogo = (role: string) => {
    // For BANKS (CBE), show CBE branding with their colors
    if (role === 'BANKS') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 800,
              color: '#FFD700',  // Golden
              fontSize: '1.5rem',
              letterSpacing: '2px',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            CBE
          </Typography>
        </Box>
      );
    }
    
    // For NBE, show NBE branding with their colors
    if (role === 'NBE') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 800,
              color: '#C4A574',  // Light Bronze/Golden
              fontSize: '1.5rem',
              letterSpacing: '2px',
              textShadow: '2px 2px 4px rgba(92, 74, 51, 0.3)',
            }}
          >
            NBE
          </Typography>
        </Box>
      );
    }
    
    // For ECTA, show with green
    if (role === 'ECTA') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Coffee sx={{ fontSize: 32, color: '#078930' }} />
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 700,
              color: '#ffffff',
              fontSize: '1.1rem',
              letterSpacing: '1px',
            }}
          >
            ECTA
          </Typography>
        </Box>
      );
    }
    
    // For ECX, show with blue
    if (role === 'ECX') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Coffee sx={{ fontSize: 32, color: '#FCDD09' }} />
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 700,
              color: '#ffffff',
              fontSize: '1.1rem',
              letterSpacing: '1px',
            }}
          >
            ECX
          </Typography>
        </Box>
      );
    }
    
    // For CUSTOMS, show with government blue
    if (role === 'CUSTOMS') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VerifiedUser sx={{ fontSize: 32, color: '#FCDD09' }} />
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 700,
              color: '#ffffff',
              fontSize: '1.1rem',
              letterSpacing: '1px',
            }}
          >
            CUSTOMS
          </Typography>
        </Box>
      );
    }
    
    // For SHIPPING, show with teal
    if (role === 'SHIPPING') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalShipping sx={{ fontSize: 32, color: '#0097a7' }} />
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 700,
              color: '#ffffff',
              fontSize: '1.1rem',
              letterSpacing: '1px',
            }}
          >
            SHIPPING
          </Typography>
        </Box>
      );
    }
    
    // Default coffee icon for other organizations
    return <Coffee sx={{ fontSize: 32, color: '#ffd54f' }} />;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      ECTA: '#078930',
      ECX: '#0F47AF',
      NBE: '#8B6F47',
      BANKS: '#9b30b7',
      CUSTOMS: '#0F47AF',
      SHIPPING: '#006064',
      EXPORTER: '#078930',
      ADMIN: '#9b30b7',
    };
    return colors[role] || '#757575';
  };

  // Generate breadcrumbs from current route
  const breadcrumbs = useMemo(() => {
    const pathSegments = router.pathname.split('/').filter(Boolean);
    const crumbs = [
      { label: 'Home', path: '/', icon: <Home fontSize="small" /> },
    ];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label = segment
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      crumbs.push({
        label,
        path: currentPath,
        icon: index === 0 ? <Dashboard fontSize="small" /> : undefined,
      });
    });

    return crumbs;
  }, [router.pathname]);

  // Quick actions based on user role
  const quickActions = useMemo(() => {
    const actions: Record<string, Array<{ label: string; icon: React.ReactNode; path: string }>> = {
      ECTA: [
        { label: 'Register Exporter', icon: <Add />, path: '/portals/ecta?action=register' },
        { label: 'Quality Report', icon: <Assessment />, path: '/portals/ecta?action=quality' },
      ],
      ECX: [
        { label: 'New Lot', icon: <Add />, path: '/portals/ecx?action=lot' },
        { label: 'Market Data', icon: <Assessment />, path: '/portals/ecx?action=market' },
      ],
      NBE: [
        { label: 'Approve Contract', icon: <VerifiedUser />, path: '/portals/nbe?action=approve' },
        { label: 'Forex Report', icon: <Assessment />, path: '/portals/nbe?action=forex' },
      ],
      BANKS: [
        { label: 'Process Permit', icon: <Description />, path: '/portals/banks?action=permit' },
        { label: 'Transactions', icon: <Assessment />, path: '/portals/banks?action=transactions' },
      ],
      CUSTOMS: [
        { label: 'Clear Shipment', icon: <VerifiedUser />, path: '/portals/customs?action=clear' },
        { label: 'EUDR Verify', icon: <Assessment />, path: '/portals/customs?action=eudr' },
      ],
      SHIPPING: [
        { label: 'Track Shipment', icon: <LocalShipping />, path: '/portals/shipping?action=track' },
        { label: 'Logistics', icon: <Assessment />, path: '/portals/shipping?action=logistics' },
      ],
    };

    return actions[user?.role || ''] || [];
  }, [user?.role]);

  if (!user) return null;

  return (
    <>
      {/* Main Navigation Bar */}
      <AppBar 
        position="sticky" 
        elevation={2}
        sx={{ 
          // Uses theme gradient from organizationThemes.ts
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, justifyContent: 'space-between', px: { xs: 1, sm: 2, md: 3 } }}>
          {/* Organization Logo - Left */}
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: { xs: '80px', sm: '100px', md: '120px' }, flexShrink: 0 }}>
            {getOrganizationLogo(user.role)}
          </Box>

          {/* Professional Title - CENTER */}
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center',
              zIndex: 1,
              maxWidth: { xs: '50%', sm: '55%', md: '45%', lg: '40%' },
              pointerEvents: 'none',
              backgroundColor: 'rgba(0, 0, 0, 0.25)', // Semi-transparent background
              backdropFilter: 'blur(8px)', // Blur effect for modern look
              borderRadius: 2,
              px: { xs: 2, sm: 3, md: 4 },
              py: { xs: 0.5, sm: 1 },
              border: '1px solid rgba(255, 255, 255, 0.1)', // Subtle border
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)', // Depth shadow
            }}
          >
            <Typography 
              variant="h4" 
              component="div" 
              sx={{ 
                fontWeight: 800,
                letterSpacing: { xs: '1px', sm: '1.5px', md: '2px' },
                lineHeight: 1.2,
                fontSize: { xs: '1rem', sm: '1.2rem', md: '1.4rem', lg: '1.6rem' },
                textTransform: 'uppercase',
                color: '#FFFFFF', // Pure white for maximum contrast
                textShadow: `
                  0 0 10px rgba(255, 255, 255, 0.3),
                  0 0 20px rgba(255, 255, 255, 0.2),
                  2px 2px 4px rgba(0, 0, 0, 0.8),
                  4px 4px 8px rgba(0, 0, 0, 0.6)
                `, // Multiple shadows for glow and depth
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Coffee Export Blockchain
            </Typography>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.95)', // Almost pure white
                fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
                letterSpacing: '0.5px',
                fontWeight: 600,
                display: { xs: 'none', sm: 'block' },
                textShadow: `
                  0 0 8px rgba(255, 255, 255, 0.2),
                  2px 2px 4px rgba(0, 0, 0, 0.7)
                `, // Glow and depth
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                mt: 0.25,
              }}
            >
              Ethiopian Coffee Export Consortium
            </Typography>
          </Box>

          {/* Right Side Actions Container */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: { xs: 0.5, sm: 1 },
            minWidth: { xs: '80px', sm: '100px', md: '120px' },
            flexShrink: 0,
            position: 'relative',
            zIndex: 2,
          }}>
            {/* Quick Actions - Desktop Only */}
            <Box sx={{ display: { xs: 'none', lg: 'flex' }, gap: 1, mr: 1 }}>
              {quickActions.slice(0, 2).map((action, index) => (
                <Tooltip key={index} title={action.label}>
                  <Button
                    size="small"
                    startIcon={action.icon}
                    onClick={() => router.push(action.path)}
                    sx={{
                      color: 'white',
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      px: 1.5,
                      py: 0.5,
                      minWidth: 'auto',
                      whiteSpace: 'nowrap',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      },
                    }}
                  >
                    {action.label}
                  </Button>
                </Tooltip>
              ))}
            </Box>

            {/* Search Icon */}
            <Tooltip title="Search">
              <IconButton 
                color="inherit" 
                size="small"
                sx={{ 
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                }}
              >
                <Search fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton 
                color="inherit" 
                size="small"
                onClick={handleNotifOpen}
                sx={{ 
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                }}
              >
                <Badge badgeContent={3} color="error">
                  <Notifications fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* User Info - Desktop Only */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', alignItems: 'flex-end', mx: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2, fontSize: '0.85rem' }}>
                {user.fullName || user.username}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.7rem' }}>
                {user.organization}
              </Typography>
            </Box>

            {/* User Menu */}
            <Tooltip title="Account">
              <IconButton 
                onClick={handleMenuOpen}
                sx={{ 
                  p: 0.5,
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                }}
              >
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    backgroundColor: getRoleColor(user.role),
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                  }}
                >
                  {user.fullName ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2) : user.username?.slice(0, 2).toUpperCase() || 'U'}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>

          {/* User Dropdown Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              elevation: 8,
              sx: {
                mt: 1.5,
                minWidth: 280,
                borderRadius: 2,
                overflow: 'visible',
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                },
              },
            }}
          >
            {/* User Info Header */}
            <Box sx={{ px: 2.5, py: 2, backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    backgroundColor: getRoleColor(user.role),
                    mr: 1.5,
                    fontWeight: 700,
                  }}
                >
                  {user.fullName ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2) : user.username?.slice(0, 2).toUpperCase() || 'U'}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                    {user.fullName || user.username}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                    {user.email}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                <Chip
                  label={user.role}
                  size="small"
                  sx={{
                    backgroundColor: getRoleColor(user.role),
                    color: 'white',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    height: 22,
                  }}
                />
                <Chip
                  label={user.organization}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontSize: '0.65rem',
                    height: 22,
                  }}
                />
              </Box>
            </Box>
            
            <Divider />
            
            {/* Menu Items */}
            <MenuItem onClick={() => { handleMenuClose(); router.push('/'); }} sx={{ py: 1.5 }}>
              <ListItemIcon>
                <Dashboard fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Dashboard" 
                primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
              />
            </MenuItem>
            <MenuItem onClick={handleProfile} sx={{ py: 1.5 }}>
              <ListItemIcon>
                <AccountCircle fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="My Profile" 
                primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
              />
            </MenuItem>
            <MenuItem onClick={handleSettings} sx={{ py: 1.5 }}>
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Settings" 
                primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
              />
            </MenuItem>
            <MenuItem onClick={() => { handleMenuClose(); router.push('/help'); }} sx={{ py: 1.5 }}>
              <ListItemIcon>
                <Help fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Help & Support" 
                primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
              />
            </MenuItem>
            
            <Divider />
            
            <MenuItem 
              onClick={handleLogout} 
              sx={{ 
                py: 1.5,
                color: 'error.main',
                '&:hover': {
                  backgroundColor: 'error.lighter',
                },
              }}
            >
              <ListItemIcon>
                <Logout fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText 
                primary="Logout" 
                primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 600 }}
              />
            </MenuItem>
          </Menu>

          {/* Notifications Menu */}
          <Menu
            anchorEl={notifAnchorEl}
            open={Boolean(notifAnchorEl)}
            onClose={handleNotifClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              elevation: 8,
              sx: {
                mt: 1.5,
                minWidth: 360,
                maxWidth: 400,
                borderRadius: 2,
                overflow: 'visible',
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                },
              },
            }}
          >
            <Box sx={{ px: 2.5, py: 2, backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1rem' }}>
                Notifications
              </Typography>
              <Typography variant="caption" color="textSecondary">
                You have 3 unread notifications
              </Typography>
            </Box>
            <Divider />
            
            <MenuItem onClick={handleNotifClose} sx={{ py: 2, alignItems: 'flex-start' }}>
              <ListItemIcon>
                <Badge color="success" variant="dot">
                  <VerifiedUser fontSize="small" color="success" />
                </Badge>
              </ListItemIcon>
              <ListItemText
                primary="New shipment approved"
                secondary="Shipment #SHP0001234 has been approved for export"
                primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 600 }}
                secondaryTypographyProps={{ fontSize: '0.75rem' }}
              />
              <Typography variant="caption" color="textSecondary" sx={{ ml: 1, whiteSpace: 'nowrap' }}>
                2m ago
              </Typography>
            </MenuItem>
            
            <Divider />
            
            <MenuItem onClick={handleNotifClose} sx={{ py: 2, alignItems: 'flex-start' }}>
              <ListItemIcon>
                <Badge color="warning" variant="dot">
                  <Description fontSize="small" color="warning" />
                </Badge>
              </ListItemIcon>
              <ListItemText
                primary="Contract requires approval"
                secondary="Sales contract #CNT0005678 is pending your review"
                primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 600 }}
                secondaryTypographyProps={{ fontSize: '0.75rem' }}
              />
              <Typography variant="caption" color="textSecondary" sx={{ ml: 1, whiteSpace: 'nowrap' }}>
                1h ago
              </Typography>
            </MenuItem>
            
            <Divider />
            
            <MenuItem onClick={handleNotifClose} sx={{ py: 2, alignItems: 'flex-start' }}>
              <ListItemIcon>
                <Badge color="info" variant="dot">
                  <Assessment fontSize="small" color="info" />
                </Badge>
              </ListItemIcon>
              <ListItemText
                primary="EUDR compliance verified"
                secondary="All shipments passed deforestation-free verification"
                primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 600 }}
                secondaryTypographyProps={{ fontSize: '0.75rem' }}
              />
              <Typography variant="caption" color="textSecondary" sx={{ ml: 1, whiteSpace: 'nowrap' }}>
                3h ago
              </Typography>
            </MenuItem>
            
            <Divider />
            
            <MenuItem 
              onClick={handleNotifClose} 
              sx={{ 
                justifyContent: 'center', 
                py: 1.5,
                '&:hover': {
                  backgroundColor: 'primary.lighter',
                },
              }}
            >
              <Typography variant="body2" color="primary" fontWeight={600}>
                View All Notifications
              </Typography>
            </MenuItem>
          </Menu>
        </Toolbar>

        {/* Breadcrumbs Bar */}
        {router.pathname !== '/' && router.pathname !== '/login' && (
          <Box 
            sx={{ 
              px: 3, 
              py: 1, 
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <Breadcrumbs 
              separator={<NavigateNext fontSize="small" sx={{ color: 'rgba(255, 255, 255, 0.5)' }} />}
              sx={{ 
                '& .MuiBreadcrumbs-separator': { 
                  mx: 1,
                },
              }}
            >
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return isLast ? (
                  <Box key={crumb.path} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {crumb.icon}
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                      }}
                    >
                      {crumb.label}
                    </Typography>
                  </Box>
                ) : (
                  <NextLink key={crumb.path} href={crumb.path} passHref legacyBehavior>
                    <Link
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        color: 'rgba(255, 255, 255, 0.7)',
                        textDecoration: 'none',
                        fontSize: '0.85rem',
                        '&:hover': {
                          color: 'white',
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      {crumb.icon}
                      {crumb.label}
                    </Link>
                  </NextLink>
                );
              })}
            </Breadcrumbs>
          </Box>
        )}
      </AppBar>
    </>
  );
};

export default NavigationBar;
