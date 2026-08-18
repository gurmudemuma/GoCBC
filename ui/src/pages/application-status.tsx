// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Application Status Tracking Page for Pending Applicants

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  Chip,
  Stack,
  Divider,
  Card,
  CardContent,
  Grid,
  alpha,
  useTheme,
} from '@mui/material';
import {
  CheckCircle,
  HourglassEmpty,
  Cancel,
  Info,
  ExitToApp,
  Refresh,
  Email,
  Phone,
  Business,
  Assignment,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import api from '@/utils/api';

interface Application {
  id: number;
  application_id: string;
  company_name: string;
  email: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  exporter_id?: string;
  license_number?: string;
}

const ApplicationStatusPage: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // If user is active exporter, redirect to exporter portal
    if (user.status === 'active') {
      router.push('/portals/exporter');
      return;
    }

    // If user is rejected, redirect to resubmission page
    if (user.status === 'rejected') {
      router.push('/resubmit-application');
      return;
    }

    // Fetch application status
    fetchApplicationStatus();
  }, [user]);

  const fetchApplicationStatus = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get application by email
      const response = await api.get(`/exporters/exporter-applications/check/${user?.email}`);
      
      if (response.data.success) {
        setApplication(response.data.data);
      } else {
        setError('Application not found');
      }
    } catch (err: any) {
      console.error('Error fetching application:', err);
      setError(err.response?.data?.error?.message || 'Failed to load application status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#4caf50';
      case 'rejected':
        return '#f44336';
      case 'pending':
        return '#ff9800';
      default:
        return '#757575';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle sx={{ color: '#4caf50', fontSize: 48 }} />;
      case 'rejected':
        return <Cancel sx={{ color: '#f44336', fontSize: 48 }} />;
      case 'pending':
        return <HourglassEmpty sx={{ color: '#ff9800', fontSize: 48 }} />;
      default:
        return <Info sx={{ color: '#757575', fontSize: 48 }} />;
    }
  };

  const activeStep = application?.status === 'pending' ? 1 : application?.status === 'approved' ? 3 : 2;

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
        }}
      >
        <CircularProgress size={60} sx={{ color: '#9b30b7' }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            background: 'linear-gradient(135deg, #9b30b7 0%, #7a2596 100%)',
            color: 'white',
            borderRadius: 2,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4" fontWeight="700" gutterBottom>
                Application Status
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Track your coffee export license application
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<ExitToApp />}
              onClick={logout}
              sx={{
                borderColor: 'white',
                color: 'white',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: alpha('#ffffff', 0.1),
                },
              }}
            >
              Logout
            </Button>
          </Stack>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {application && (
          <Grid container spacing={3}>
            {/* Status Overview */}
            <Grid item xs={12} md={4}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  borderRadius: 2,
                  border: '2px solid',
                  borderColor: getStatusColor(application.status),
                }}
              >
                <CardContent>
                  <Box textAlign="center" py={2}>
                    {getStatusIcon(application.status)}
                    <Typography variant="h5" fontWeight="700" mt={2} mb={1}>
                      {application.status.toUpperCase()}
                    </Typography>
                    <Chip
                      label={application.status}
                      sx={{
                        backgroundColor: alpha(getStatusColor(application.status), 0.1),
                        color: getStatusColor(application.status),
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}
                    />
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Application ID
                      </Typography>
                      <Typography variant="body2" fontWeight="600">
                        {application.application_id}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Submitted Date
                      </Typography>
                      <Typography variant="body2" fontWeight="600">
                        {new Date(application.submitted_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Typography>
                    </Box>
                    {application.approved_at && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Approved Date
                        </Typography>
                        <Typography variant="body2" fontWeight="600">
                          {new Date(application.approved_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={fetchApplicationStatus}
                    sx={{ mt: 3 }}
                  >
                    Refresh Status
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Application Details & Progress */}
            <Grid item xs={12} md={8}>
              {/* Company Information */}
              <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight="700" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Business /> Company Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Company Name
                    </Typography>
                    <Typography variant="body1" fontWeight="600">
                      {application.company_name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Email Address
                    </Typography>
                    <Typography variant="body1" fontWeight="600" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Email fontSize="small" /> {application.email}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">
                      Phone Number
                    </Typography>
                    <Typography variant="body1" fontWeight="600" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Phone fontSize="small" /> {application.phone}
                    </Typography>
                  </Grid>
                  {application.exporter_id && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        Exporter ID
                      </Typography>
                      <Typography variant="body1" fontWeight="600">
                        {application.exporter_id}
                      </Typography>
                    </Grid>
                  )}
                  {application.license_number && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary">
                        License Number
                      </Typography>
                      <Typography variant="body1" fontWeight="600">
                        {application.license_number}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>

              {/* Application Progress */}
              <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight="700" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assignment /> Application Progress
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Stepper activeStep={activeStep} orientation="vertical">
                  <Step completed={true}>
                    <StepLabel>Application Submitted</StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary">
                        Your application has been received and is awaiting review by ECTA officers.
                      </Typography>
                    </StepContent>
                  </Step>

                  <Step completed={application.status !== 'pending'}>
                    <StepLabel>Under Review</StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary">
                        ECTA officers are reviewing your application and verifying submitted documents.
                      </Typography>
                    </StepContent>
                  </Step>

                  {application.status === 'rejected' ? (
                    <Step completed={true}>
                      <StepLabel error>Application Rejected</StepLabel>
                      <StepContent>
                        <Alert severity="error" sx={{ mt: 1 }}>
                          <Typography variant="body2" fontWeight="600" gutterBottom>
                            Rejection Reason:
                          </Typography>
                          <Typography variant="body2">
                            {application.rejection_reason || 'Please contact ECTA for more details.'}
                          </Typography>
                        </Alert>
                        <Button
                          variant="contained"
                          color="error"
                          onClick={() => router.push('/resubmit-application')}
                          sx={{ mt: 2 }}
                        >
                          Resubmit Application
                        </Button>
                      </StepContent>
                    </Step>
                  ) : (
                    <Step completed={application.status === 'approved'}>
                      <StepLabel>Application Approved</StepLabel>
                      <StepContent>
                        {application.status === 'approved' ? (
                          <Alert severity="success" sx={{ mt: 1 }}>
                            <Typography variant="body2" fontWeight="600" gutterBottom>
                              Congratulations! Your application has been approved.
                            </Typography>
                            <Typography variant="body2">
                              You can now access the full exporter portal to manage your coffee exports.
                            </Typography>
                            <Button
                              variant="contained"
                              color="success"
                              onClick={() => router.push('/portals/exporter')}
                              sx={{ mt: 2 }}
                            >
                              Go to Exporter Portal
                            </Button>
                          </Alert>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Once approved, you will receive your exporter ID and license number.
                          </Typography>
                        )}
                      </StepContent>
                    </Step>
                  )}
                </Stepper>

                {application.status === 'pending' && (
                  <Alert severity="info" sx={{ mt: 3 }}>
                    <Typography variant="body2">
                      <strong>Please wait:</strong> Your application is being reviewed. You will receive an email notification once a decision is made.
                      This process typically takes 3-5 business days.
                    </Typography>
                  </Alert>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default ApplicationStatusPage;
