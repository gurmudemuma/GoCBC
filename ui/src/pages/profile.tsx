import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AccountBalance,
  ArrowBack,
  Badge,
  Business,
  CheckCircle,
  Coffee,
  Description,
  Email,
  Event,
  History,
  LocationOn,
  Phone,
  Refresh,
  VerifiedUser,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { apiFetch, getAuthHeaders } from '@/config/api.config';

interface ExporterRecord {
  exporterId?: string;
  companyName?: string;
  ectaLicenseNumber?: string;
  licenseStatus?: string;
  licenseExpiryDate?: string;
  registrationDate?: string;
  exporterType?: string;
  capitalRequirement?: number | string;
  laboratoryCertified?: boolean;
  laboratoryCertificateNumber?: string;
  professionalTaster?: string;
  tasterCertificate?: string;
  bankName?: string;
  bankBranch?: string;
  bankBranchCode?: string;
  address?: string;
  city?: string;
  region?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ActivityRecord {
  id?: string;
  entity_type?: string;
  entity_id?: string;
  action?: string;
  performed_by?: string;
  performed_by_org?: string;
  reason?: string;
  old_value?: string;
  new_value?: string;
  created_at?: string;
  metadata?: {
    blockchainVerified?: boolean;
    source?: string;
    txId?: string;
    transactionId?: string;
  } | null;
}

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: { message?: string };
}

const forest = '#123d32';
const green = '#176b4d';
const gold = '#d8ad55';
const muted = '#6f7d77';

const formatDate = (value?: string) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatMoney = (value?: number | string) => {
  if (value === undefined || value === null || value === '') return 'Not recorded';
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'ETB', maximumFractionDigits: 0 }).format(amount)
    : String(value);
};

const displayValue = (value?: string | number | boolean | null) => {
  if (value === undefined || value === null || value === '') return 'Not recorded';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

const getPortalPath = (role?: string) => {
  const portalPaths: Record<string, string> = {
    ECTA: '/portals/ecta',
    ECX: '/portals/ecx',
    NBE: '/portals/nbe',
    BANKS: '/portals/banks',
    CUSTOMS: '/portals/customs',
    SHIPPING: '/portals/shipping',
    EXPORTER: '/portals/exporter',
    ADMIN: '/admin',
  };
  return portalPaths[role || ''] || '/';
};

const getErrorMessage = async (response: Response, fallback: string) => {
  try {
    const body = await response.json() as ApiEnvelope<unknown>;
    return body.error?.message || `${fallback} (HTTP ${response.status})`;
  } catch {
    return `${fallback} (HTTP ${response.status})`;
  }
};

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ExporterRecord | null>(null);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [profileError, setProfileError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [loading, setLoading] = useState(true);

  const tokenClaims = useMemo(() => {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('authToken');
    if (!token) return {};
    try {
      const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(payload)) as Record<string, string>;
    } catch {
      return {};
    }
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setProfileError('');
    setHistoryError('');

    const profileRequest = user?.role === 'EXPORTER' || tokenClaims.exporterId
      ? apiFetch('/exporters/me/profile', { headers: getAuthHeaders() })
      : Promise.resolve(null);
    const [profileResult, historyResult] = await Promise.allSettled([
      profileRequest,
      apiFetch('/audit/portal/recent?limit=100', { headers: getAuthHeaders() }),
    ]);

    if (profileResult.status === 'fulfilled') {
      const response = profileResult.value;
      if (response?.ok) {
        try {
          const result = await response.json() as ApiEnvelope<ExporterRecord>;
          if (result.success && result.data) {
            setProfile(result.data);
          } else {
            setProfileError(result.error?.message || 'A registry profile is not available for this account yet.');
          }
        } catch {
          setProfileError('The exporter registry returned an unreadable profile response.');
        }
      } else if (response) {
        setProfileError(await getErrorMessage(response, 'Unable to load the exporter registry profile'));
      }
    } else {
      setProfileError('Could not connect to the exporter profile service. Please try again.');
    }

    if (historyResult.status === 'fulfilled') {
      const response = historyResult.value;
      if (response.ok) {
        try {
          const result = await response.json() as ApiEnvelope<{ logs?: ActivityRecord[] }>;
          if (result.success && result.data) {
            setActivities(result.data.logs || []);
          } else {
            setHistoryError(result.error?.message || 'Account activity is not available right now.');
          }
        } catch {
          setHistoryError('The activity service returned an unreadable response.');
        }
      } else {
        setHistoryError(await getErrorMessage(response, 'Unable to load account activity'));
      }
    } else {
      setHistoryError('Could not connect to the account activity service. Please try again.');
    }

    setLoading(false);
  }, [tokenClaims.exporterId, user?.role]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const exporterId = profile?.exporterId || tokenClaims.exporterId;
  const licenseNumber = profile?.ectaLicenseNumber || tokenClaims.ectaLicense;
  const fullName = user?.fullName || user?.username || 'Account holder';
  const companyName = profile?.companyName;
  const address = [profile?.address, profile?.city, profile?.region].filter(Boolean).join(', ');
  const lastActivity = activities[0]?.created_at;
  const portalPath = getPortalPath(user?.role);

  return (
    <ProtectedRoute>
      <Head>
        <title>My Profile | CECBS</title>
        <meta name="description" content="Exporter account profile, licensing details, and account history." />
      </Head>

      <Box sx={{ minHeight: '100vh', bgcolor: '#f4f7f4', pb: 7 }}>
        <Box
          sx={{
            position: 'relative',
            overflow: 'hidden',
            color: 'white',
            background: `linear-gradient(118deg, ${forest} 0%, #1d6048 60%, #397c5d 100%)`,
            px: { xs: 2, md: 5 },
            pt: { xs: 3, md: 4 },
            pb: { xs: 7, md: 9 },
          }}
        >
          <Box sx={{
            position: 'absolute', width: 360, height: 360, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,.1)', right: { xs: -180, md: 80 }, top: -205,
          }} />
          <Box sx={{
            position: 'absolute', width: 240, height: 240, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,.08)', right: { xs: -120, md: 150 }, top: -140,
          }} />

          <Box sx={{ maxWidth: 1280, mx: 'auto', position: 'relative', zIndex: 1 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => router.push(portalPath)}
              sx={{ color: 'rgba(255,255,255,.82)', textTransform: 'none', mb: 3, ml: -1 }}
            >
              Back to exporter portal
            </Button>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              spacing={3}
            >
              <Stack direction="row" spacing={2.5} alignItems="center">
                <Avatar
                  sx={{
                    width: { xs: 68, md: 82 }, height: { xs: 68, md: 82 },
                    bgcolor: 'rgba(255,255,255,.13)', color: '#f6d987',
                    border: '1px solid rgba(255,255,255,.28)',
                  }}
                >
                  {companyName ? <Business sx={{ fontSize: 38 }} /> : <Coffee sx={{ fontSize: 38 }} />}
                </Avatar>
                <Box>
                  <Typography variant="overline" sx={{ color: '#e4c879', letterSpacing: 2, fontWeight: 700 }}>
                    {user?.role === 'EXPORTER' ? 'EXPORTER ACCOUNT' : 'ACCOUNT PROFILE'}
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 750, letterSpacing: '-.035em', fontSize: { xs: 28, md: 38 } }}>
                    {companyName || fullName}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,.76)', mt: 0.5 }}>
                    {companyName ? `${fullName} · ` : ''}{user?.email || user?.username || 'Account profile'}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
                <Chip
                  icon={<VerifiedUser sx={{ color: 'inherit !important' }} />}
                  label={profile?.licenseStatus || user?.status || 'Registry status unavailable'}
                  sx={{
                    color: 'white', fontWeight: 700, textTransform: 'capitalize',
                    bgcolor: profile?.licenseStatus?.toUpperCase() === 'ACTIVE' ? 'rgba(43,143,99,.36)' : 'rgba(255,255,255,.12)',
                    border: '1px solid rgba(255,255,255,.24)',
                  }}
                />
                <Tooltip title="Reload profile and history">
                  <span>
                    <IconButton onClick={() => void loadProfile()} disabled={loading} sx={{ color: 'white', border: '1px solid rgba(255,255,255,.3)' }}>
                      {loading ? <CircularProgress size={20} color="inherit" /> : <Refresh />}
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 5 }, mt: { xs: -4, md: -5 }, position: 'relative', zIndex: 2 }}>
          <Grid container spacing={2}>
            {[
              { label: 'Exporter ID', value: exporterId || 'Not linked', icon: <Badge /> },
              { label: 'ECTA licence', value: licenseNumber || 'Not recorded', icon: <VerifiedUser /> },
              { label: 'Account activity', value: `${activities.length} recorded events`, icon: <History /> },
              { label: 'Last recorded activity', value: lastActivity ? formatDate(lastActivity) : 'No activity recorded', icon: <Event /> },
            ].map((item) => (
              <Grid item xs={12} sm={6} md={3} key={item.label}>
                <Card elevation={0} sx={{ height: '100%', borderRadius: 3, border: '1px solid #e5ebe6', boxShadow: '0 12px 30px rgba(24,62,45,.06)' }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.6, p: '20px !important' }}>
                    <Avatar sx={{ bgcolor: '#edf5ef', color: green, width: 42, height: 42 }}>{item.icon}</Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" sx={{ color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em' }}>
                        {item.label}
                      </Typography>
                      <Typography sx={{ color: forest, fontWeight: 700, mt: 0.3, overflowWrap: 'anywhere' }}>
                        {item.value}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {(profileError || historyError) && (
            <Stack spacing={1.2} sx={{ mt: 3 }}>
              {profileError && (
                <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => void loadProfile()}>Retry</Button>}>
                  {profileError} Account details below are shown from the information currently available.
                </Alert>
              )}
              {historyError && <Alert severity="info">{historyError}</Alert>}
            </Stack>
          )}

          <Grid container spacing={3} sx={{ mt: 0.3 }}>
            <Grid item xs={12} md={7}>
              <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e5ebe6', overflow: 'hidden' }}>
                <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.3 }}>
                  <Avatar sx={{ bgcolor: '#edf5ef', color: green }}><Business /></Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ color: forest, fontWeight: 750 }}>Business profile</Typography>
                    <Typography variant="body2" color="text.secondary">Identity and registration information</Typography>
                  </Box>
                </Box>
                <Divider />
                <Grid container spacing={0} sx={{ p: { xs: 2, sm: 3 } }}>
                  <Grid item xs={12} sm={6}>
                    <Detail label="Registered business name" value={profile?.companyName || companyName} icon={<Business />} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Detail label="Exporter reference" value={exporterId} icon={<Badge />} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Detail label="Exporter category" value={profile?.exporterType} icon={<Coffee />} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Detail label="Registered on" value={formatDate(profile?.registrationDate || profile?.createdAt)} icon={<Event />} />
                  </Grid>
                  <Grid item xs={12}>
                    <Detail label="Business location" value={address || undefined} icon={<LocationOn />} />
                  </Grid>
                </Grid>
              </Paper>

              <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e5ebe6', overflow: 'hidden', mt: 3 }}>
                <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.3 }}>
                  <Avatar sx={{ bgcolor: '#fbf4e3', color: '#a87817' }}><VerifiedUser /></Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ color: forest, fontWeight: 750 }}>Licensing & quality</Typography>
                    <Typography variant="body2" color="text.secondary">ECTA credentials and certification status</Typography>
                  </Box>
                </Box>
                <Divider />
                <Grid container spacing={0} sx={{ p: { xs: 2, sm: 3 } }}>
                  <Grid item xs={12} sm={6}>
                    <Detail label="ECTA licence number" value={licenseNumber} icon={<Description />} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Detail label="Licence status" value={profile?.licenseStatus || user?.status} icon={<CheckCircle />} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Detail label="Licence expiry" value={formatDate(profile?.licenseExpiryDate)} icon={<Event />} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Detail label="Capital requirement" value={formatMoney(profile?.capitalRequirement)} icon={<AccountBalance />} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Detail label="Laboratory certified" value={displayValue(profile?.laboratoryCertified)} icon={<CheckCircle />} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Detail label="Laboratory certificate" value={profile?.laboratoryCertificateNumber} icon={<Description />} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Detail label="Professional taster" value={profile?.professionalTaster} icon={<Badge />} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Detail label="Taster certificate" value={profile?.tasterCertificate} icon={<Description />} />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12} md={5}>
              <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e5ebe6', overflow: 'hidden', height: '100%' }}>
                <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.3 }}>
                  <Avatar sx={{ bgcolor: '#edf5ef', color: green }}><History /></Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ color: forest, fontWeight: 750 }}>Account history</Typography>
                    <Typography variant="body2" color="text.secondary">Recent recorded actions and status changes</Typography>
                  </Box>
                </Box>
                <Divider />

                {loading && activities.length === 0 ? (
                  <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: 260, p: 3 }}>
                    <CircularProgress size={30} sx={{ color: green }} />
                    <Typography variant="body2" color="text.secondary">Loading account history…</Typography>
                  </Stack>
                ) : activities.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Avatar sx={{ mx: 'auto', mb: 1.5, bgcolor: '#f1f4f1', color: muted }}><History /></Avatar>
                    <Typography fontWeight={700} color={forest}>No history to show yet</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Account actions and exporter workflow events will appear here when they are recorded.
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ p: { xs: 2, sm: 3 } }}>
                    <Stack spacing={0}>
                      {activities.map((activity, index) => {
                        const verified = activity.metadata?.blockchainVerified ||
                          activity.metadata?.source === 'HYPERLEDGER_FABRIC' ||
                          Boolean(activity.metadata?.txId || activity.metadata?.transactionId);
                        return (
                          <Box key={activity.id || `${activity.entity_id}-${activity.action}-${activity.created_at}-${index}`} sx={{ display: 'flex', gap: 1.8, minHeight: 95 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <Box sx={{ width: 11, height: 11, mt: 0.7, borderRadius: '50%', bgcolor: index === 0 ? gold : '#72a18a', boxShadow: '0 0 0 4px #eef5ef' }} />
                              {index < activities.length - 1 && <Box sx={{ width: 1, flex: 1, bgcolor: '#e2ebe4', my: 0.8 }} />}
                            </Box>
                            <Box sx={{ pb: 2.2, minWidth: 0, flex: 1 }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                                <Typography sx={{ color: forest, fontWeight: 750 }}>
                                  {(activity.action || 'Activity').replace(/_/g, ' ')}
                                </Typography>
                                {verified && <Chip size="small" label="Ledger" sx={{ height: 21, color: green, bgcolor: '#edf5ef', fontSize: 11 }} />}
                              </Stack>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                                {[activity.entity_type, activity.entity_id].filter(Boolean).join(' · ') || 'Account activity'}
                              </Typography>
                              {activity.reason && (
                                <Typography variant="body2" sx={{ color: '#42544a', mt: 0.7, overflowWrap: 'anywhere' }}>
                                  {activity.reason}
                                </Typography>
                              )}
                              <Typography variant="caption" sx={{ color: muted, mt: 0.8, display: 'block' }}>
                                {formatDate(activity.created_at)}
                                {activity.performed_by_org ? ` · ${activity.performed_by_org}` : ''}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>

          <Paper elevation={0} sx={{ mt: 3, borderRadius: 3, border: '1px solid #e5ebe6', overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.3 }}>
              <Avatar sx={{ bgcolor: '#f0eef8', color: '#6750a4' }}><AccountBalance /></Avatar>
              <Box>
                <Typography variant="h6" sx={{ color: forest, fontWeight: 750 }}>Account & banking contacts</Typography>
                <Typography variant="body2" color="text.secondary">Contact details associated with your signed-in account</Typography>
              </Box>
            </Box>
            <Divider />
            <Grid container sx={{ p: { xs: 2, sm: 3 } }}>
              <Grid item xs={12} sm={6} md={3}>
                <Detail label="Account holder" value={fullName} icon={<Badge />} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Detail label="Email address" value={user?.email} icon={<Email />} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Detail label="Phone" value={user?.phone} icon={<Phone />} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Detail label="Bank" value={profile?.bankName} icon={<AccountBalance />} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Detail label="Bank branch" value={profile?.bankBranch} icon={<LocationOn />} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Detail label="Branch code" value={profile?.bankBranchCode} icon={<Badge />} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Detail label="Organization" value={user?.organization} icon={<Business />} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Detail label="Username" value={user?.username} icon={<Badge />} />
              </Grid>
            </Grid>
          </Paper>

          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" spacing={1.5} sx={{ mt: 3, px: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Registry and history information is read from CECBS services. Profile edits are managed through the appropriate ECTA workflow.
            </Typography>
            <Button
              variant="contained"
              startIcon={<ArrowBack />}
              onClick={() => router.push(portalPath)}
              sx={{ bgcolor: green, borderRadius: 2, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: forest } }}
            >
              Return to exporter portal
            </Button>
          </Stack>
        </Box>
      </Box>
    </ProtectedRoute>
  );
};

interface DetailProps {
  label: string;
  value?: string | number | null;
  icon: React.ReactNode;
}

const Detail: React.FC<DetailProps> = ({ label, value, icon }) => (
  <Box sx={{ display: 'flex', gap: 1.2, py: 1.25, px: { xs: 0, sm: 1 }, minWidth: 0 }}>
    <Box sx={{ color: '#789187', mt: 0.25, display: 'flex' }}>{icon}</Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: muted, display: 'block', fontWeight: 650 }}>{label}</Typography>
      <Typography variant="body2" sx={{ color: forest, fontWeight: 650, mt: 0.3, overflowWrap: 'anywhere' }}>
        {displayValue(value)}
      </Typography>
    </Box>
  </Box>
);

export default ProfilePage;
