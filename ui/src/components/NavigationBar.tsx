// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Professional Navigation Bar with Breadcrumbs & Quick Actions

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Breadcrumbs,
  Link,
  Tooltip,
  useScrollTrigger,
  TextField,
  InputAdornment,
  Paper,
  CircularProgress,
  ClickAwayListener,
} from '@mui/material';
import {
  AccountCircle,
  Logout,
  Settings,
  Dashboard,
  Help,
  Home,
  NavigateNext,
  Search,
  Clear,
  Add,
  Assessment,
  LocalShipping,
  Description,
  VerifiedUser,
  Gavel,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import NotificationCenter from '@/components/NotificationCenter';
import OrganizationLogo from '@/components/OrganizationLogo';
import api from '@/utils/api';

// Global search (GET /api/v1/search) result shape — kept local to this
// component; the endpoint is the single source of truth.
interface GlobalSearchItem {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  href: string;
}

interface GlobalSearchGroup {
  type: string;
  label: string;
  items: GlobalSearchItem[];
}

const NavigationBar: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  // ---- Global search (GET /api/v1/search) ---------------------------
  // Debounced 300 ms; 2+ chars only (the endpoint answers shorter
  // queries with an empty groups array). Results are grouped by entity
  // type; click navigates to the result href (a portal tab deep-link),
  // Enter opens the first result, Esc / click-away closes.
  const [searchQuery, setSearchQuery] = useState('');
  const [searchGroups, setSearchGroups] = useState<GlobalSearchGroup[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchGroups([]);
      setSearchLoading(false);
      setSearchError('');
      return;
    }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await api.get('/search', { params: { q: query } });
        const groups: GlobalSearchGroup[] = response?.data?.data?.groups || [];
        setSearchGroups(groups);
        setSearchError('');
      } catch (error) {
        setSearchGroups([]);
        setSearchError('Search is unavailable right now.');
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchHasResults = searchGroups.some((g) => g.items.length > 0);
  const firstSearchResult: GlobalSearchItem | null =
    searchGroups.flatMap((g) => g.items)[0] || null;

  const closeSearch = () => {
    setSearchOpen(false);
  };

  const goToSearchResult = (href: string) => {
    closeSearch();
    setSearchQuery('');
    setSearchGroups([]);
    router.push(href);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && firstSearchResult) {
      event.preventDefault();
      goToSearchResult(firstSearchResult.href);
    } else if (event.key === 'Escape') {
      closeSearch();
      searchInputRef.current?.blur();
    }
  };

  const handleProfile = () => {
    handleMenuClose();
    router.push('/profile');
  };

  // Admin quick links (appear in user menu for ADMIN or CUSTOMS roles)
  const showRiskRulesLink = user?.role === 'ADMIN' || user?.role === 'CUSTOMS';
  const handleSettings = () => {
    handleMenuClose();
    router.push('/settings');
  };

  const getOrganizationLogo = (role: string) => {
    // Use the reusable OrganizationLogo with professional styling
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <OrganizationLogo role={role} height={40} width={120} variant="professional" showBorder={true} />
      </Box>
    );
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
        icon: index === 0 ? <Dashboard fontSize="small" /> : <Home fontSize="small" />,
      });
    });

    return crumbs;
  }, [router.pathname]);

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
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: { xs: '80px', sm: '100px', md: '120px' }, flexShrink: 0, position: 'relative', zIndex: 10 }}>
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
              zIndex: 0, // Behind other elements to avoid overlap
              maxWidth: { xs: '40%', sm: '45%', md: '35%', lg: '30%' },
              pointerEvents: 'none',
              backgroundColor: 'rgba(0, 0, 0, 0.2)', // Lighter semi-transparent background
              backdropFilter: 'blur(6px)', // Subtle blur effect
              borderRadius: 2,
              px: { xs: 1.5, sm: 2, md: 3 },
              py: { xs: 0.5, sm: 0.75 },
              border: '1px solid rgba(255, 255, 255, 0.08)', // More subtle border
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)', // Lighter shadow
            }}
          >
            <Typography 
              variant="h4" 
              component="div" 
              sx={{ 
                fontWeight: 700,
                letterSpacing: { xs: '0.5px', sm: '1px', md: '1.5px' },
                lineHeight: 1.2,
                fontSize: { xs: '0.75rem', sm: '0.9rem', md: '1.1rem', lg: '1.3rem' },
                textTransform: 'uppercase',
                color: '#FFFFFF',
                textShadow: `
                  0 0 8px rgba(255, 255, 255, 0.2),
                  2px 2px 4px rgba(0, 0, 0, 0.7)
                `,
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
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: { xs: '0.55rem', sm: '0.65rem', md: '0.7rem' },
                letterSpacing: '0.3px',
                fontWeight: 500,
                display: { xs: 'none', sm: 'block' },
                textShadow: `
                  0 0 6px rgba(255, 255, 255, 0.15),
                  1px 1px 3px rgba(0, 0, 0, 0.6)
                `,
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
            zIndex: 10, // Higher z-index to stay on top
          }}>
            {/* Quick Actions - REMOVED to prevent overlap with title */}
            
            {/* Search — global search across shipments, contracts, LCs,
                ECX lots, payments, applications and forex. Was a
                decorative icon button (no onClick); now a debounced
                input with grouped results. Rendered on every page: this
                bar is mounted once in pages/_app.tsx, outside the
                portals, so it is usable from all 7 portals. */}
            <ClickAwayListener onClickAway={closeSearch}>
              <Box
                sx={{
                  position: 'relative',
                  display: { xs: 'none', md: 'block' },
                }}
              >
                <TextField
                  size="small"
                  placeholder="Search shipments, contracts, LCs…"
                  value={searchQuery}
                  inputRef={searchInputRef}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  onKeyDown={handleSearchKeyDown}
                  sx={{
                    width: 280,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.12)',
                      borderRadius: 2,
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.25)' },
                      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                      '&.Mui-focused fieldset': { borderColor: 'white' },
                    },
                    '& .MuiInputBase-input': {
                      color: 'white',
                      '&::placeholder': { color: 'rgba(255, 255, 255, 0.6)', opacity: 1 },
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: 'rgba(255, 255, 255, 0.8)' }} />
                      </InputAdornment>
                    ),
                    endAdornment: searchLoading ? (
                      <InputAdornment position="end">
                        <CircularProgress size={18} sx={{ color: 'white' }} />
                      </InputAdornment>
                    ) : searchQuery ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          aria-label="Clear search"
                          onClick={() => {
                            setSearchQuery('');
                            setSearchGroups([]);
                            searchInputRef.current?.focus();
                          }}
                          sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
                        >
                          <Clear fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : undefined,
                  }}
                />
                {searchOpen && searchQuery.trim().length >= 2 && (
                  <Paper
                    elevation={8}
                    sx={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      width: 380,
                      maxWidth: '90vw',
                      maxHeight: 480,
                      overflowY: 'auto',
                      borderRadius: 2,
                      zIndex: 1300,
                    }}
                  >
                    {searchLoading && !searchHasResults ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 2 }}>
                        <CircularProgress size={18} />
                        <Typography variant="body2" color="text.secondary">
                          Searching…
                        </Typography>
                      </Box>
                    ) : searchError ? (
                      <Typography variant="body2" color="error" sx={{ px: 2, py: 2 }}>
                        {searchError}
                      </Typography>
                    ) : !searchHasResults ? (
                      <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
                        No results for &lsquo;{searchQuery.trim()}&rsquo;
                      </Typography>
                    ) : (
                      searchGroups.map((group) =>
                        group.items.length === 0 ? null : (
                          <Box key={group.type}>
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                px: 2,
                                pt: 1.5,
                                pb: 0.5,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                color: 'text.secondary',
                              }}
                            >
                              {group.label}
                            </Typography>
                            {group.items.map((item) => (
                              <Box
                                key={`${group.type}-${item.id}`}
                                onMouseDown={(e) => {
                                  // Fire before the input blurs / the
                                  // click-away closes the dropdown.
                                  e.preventDefault();
                                  goToSearchResult(item.href);
                                }}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  px: 2,
                                  py: 1,
                                  cursor: 'pointer',
                                  '&:hover': { backgroundColor: 'action.hover' },
                                }}
                              >
                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                  <Typography variant="body2" fontWeight={600} noWrap>
                                    {item.title}
                                  </Typography>
                                  {item.subtitle ? (
                                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                      {item.subtitle}
                                    </Typography>
                                  ) : null}
                                </Box>
                                {item.status ? (
                                  <Chip label={item.status} size="small" variant="outlined" sx={{ flexShrink: 0 }} />
                                ) : null}
                              </Box>
                            ))}
                            <Divider />
                          </Box>
                        ),
                      )
                    )}
                  </Paper>
                )}
              </Box>
            </ClickAwayListener>

            {/* Notifications */}
            <NotificationCenter userRole={user.role} />

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
            {showRiskRulesLink && (
              <MenuItem onClick={() => { handleMenuClose(); router.push('/admin/risk-rules'); }} sx={{ py: 1.5 }}>
                <ListItemIcon>
                  <Gavel fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="Risk Rules" 
                  primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
                />
              </MenuItem>
            )}
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
