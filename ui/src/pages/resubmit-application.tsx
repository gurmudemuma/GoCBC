// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Resubmit Rejected Exporter Application

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  Grid,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Fade,
  Chip,
} from '@mui/material';
import {
  ErrorOutline,
  Edit,
  Send,
  CheckCircle,
  Warning,
  Info,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import api from '@/utils/api';
import Head from 'next/head';

const ResubmitApplicationPage: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [application, setApplication] = useState<any>(null);

  // Form data - ALL fields from application
  const [formData, setFormData] = useState({
    companyName: '',
    tinNumber: '',
    businessLicenseNumber: '',
    registrationDate: '',
    capitalRequirement: '',
    professionalTaster: true,
    tasterCertificate: '',
    laboratoryFacility: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    region: '',
    bankName: '',
    bankAccountNumber: '',
    bankBranchName: '',
    bankBranchCode: '',
    comments: '',
  });

  useEffect(() => {
    if (!user || user.status !== 'rejected') {
      // Only rejected users can access this page
      router.push('/');
      return;
    }

    loadApplicationData();
  }, [user]);

  const loadApplicationData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/exporters/exporter-applications/check/${user?.email}`);
      
      if (response.data.success) {
        const app = response.data.data;
        setApplication(app);
        
        // Pre-fill form with ALL existing data
        setFormData({
          companyName: app.company_name || '',
          tinNumber: app.tin_number || '',
          businessLicenseNumber: app.business_license_number || '',
          registrationDate: app.registration_date || '',
          capitalRequirement: app.capital_requirement || '',
          professionalTaster: app.professional_taster === 1 || app.professional_taster === true,
          tasterCertificate: app.taster_certificate || '',
          laboratoryFacility: app.laboratory_facility || '',
          contactPerson: app.contact_person || '',
          email: app.email || '',
          phone: app.phone || '',
          address: app.address || '',
          city: app.city || '',
          region: app.region || '',
          bankName: app.bank_name || '',
          bankAccountNumber: app.bank_account_number || '',
          bankBranchName: app.bank_branch_name || '',
          bankBranchCode: app.bank_branch_code || '',
          comments: app.comments || '',
        });
      }
    } catch (err: any) {
      setError('Failed to load application data. Please try again.');
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await api.post(
        `/exporters/exporter-applications/${application.application_id}/resubmit`,
        {
          ...formData,
          email: user?.email,
        }
      );

      if (response.data.success) {
        setSuccess(true);
        
        // Auto-logout after 3 seconds so they can't access rejected account anymore
        setTimeout(() => {
          logout();
        }, 3000);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message || 
        err.response?.data?.message || 
        'Failed to resubmit application. Please try again.'
      );
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <CircularProgress size={60} sx={{ color: 'white' }} />
      </Box>
    );
  }

  if (success) {
    return (
      <>
        <Head>
          <title>Application Resubmitted - CECBS</title>
        </Head>
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            p: 3,
          }}
        >
          <Fade in={success}>
            <Card sx={{ maxWidth: 600, width: '100%' }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <CheckCircle sx={{ fontSize: 80, color: '#4caf50', mb: 2 }} />
                <Typography variant="h4" gutterBottom fontWeight="bold">
                  Application Resubmitted Successfully!
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Thank you for updating your application. Your corrected application has been 
                  submitted to ECTA for review.
                </Typography>
                <Divider sx={{ my: 3 }} />
                <Typography variant="body2" color="text.secondary" paragraph>
                  You will receive an email notification once your application is reviewed. 
                  If approved, you will receive new login credentials.
                </Typography>
                <Alert severity="info" sx={{ mt: 2 }}>
                  You are being logged out...
                </Alert>
              </CardContent>
            </Card>
          </Fade>
        </Box>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Resubmit Application - CECBS</title>
      </Head>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          py: 4,
        }}
      >
        <Container maxWidth="md">
          <Fade in={!loading}>
            <Box>
              {/* Header */}
              <Paper
                elevation={8}
                sx={{
                  p: 3,
                  mb: 3,
                  background: 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)',
                  color: 'white',
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <ErrorOutline sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h5" fontWeight="bold">
                      Application Rejected
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Your application requires corrections
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              {/* Rejection Reason */}
              {application?.rejection_reason && (
                <Alert severity="warning" icon={<Warning />} sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Rejection Reason:
                  </Typography>
                  <Typography variant="body2">
                    {application.rejection_reason}
                  </Typography>
                </Alert>
              )}

              {/* Instructions */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <Info sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Instructions
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle fontSize="small" color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Review the rejection reason above"
                        secondary="Understand what needs to be corrected"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle fontSize="small" color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Update the required information below"
                        secondary="Only fields that need correction are editable"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle fontSize="small" color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Submit your corrected application"
                        secondary="ECTA will review your updated application"
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>

              {/* Application Info */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Application ID
                  </Typography>
                  <Typography variant="h6" gutterBottom>
                    {application?.application_id}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Original Submission
                      </Typography>
                      <Typography variant="body2">
                        {new Date(application?.submitted_at).toLocaleDateString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Status
                      </Typography>
                      <Chip
                        label="REJECTED"
                        size="small"
                        color="error"
                        sx={{ mt: 0.5 }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Correction Form */}
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    <Edit sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Update Application Information
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    All original data is shown below. Fields highlighted in yellow may need correction based on the rejection reason.
                  </Typography>
                  <Divider sx={{ mb: 3 }} />

                  {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                      {error}
                    </Alert>
                  )}

                  <form onSubmit={handleSubmit}>
                    <Stack spacing={3}>
                      {/* Company Information Section */}
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ color: '#667eea' }}>
                          Company Information
                        </Typography>
                        <Stack spacing={2}>
                          <TextField
                            fullWidth
                            label="Company Name"
                            value={formData.companyName}
                            onChange={(e) =>
                              setFormData({ ...formData, companyName: e.target.value })
                            }
                            required
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: '#fffbea',
                              }
                            }}
                            helperText="✏️ Editable - verify company name is correct"
                          />

                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="TIN Number"
                                value={formData.tinNumber}
                                onChange={(e) =>
                                  setFormData({ ...formData, tinNumber: e.target.value })
                                }
                                required
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    backgroundColor: '#fffbea',
                                  }
                                }}
                                helperText="✏️ Editable - must match official records"
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="Business License Number"
                                value={formData.businessLicenseNumber}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    businessLicenseNumber: e.target.value,
                                  })
                                }
                                required
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    backgroundColor: '#fffbea',
                                  }
                                }}
                                helperText="✏️ Editable - verify license number"
                              />
                            </Grid>
                          </Grid>

                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="Registration Date"
                                type="date"
                                value={formData.registrationDate}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    registrationDate: e.target.value,
                                  })
                                }
                                InputLabelProps={{ shrink: true }}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    backgroundColor: '#fffbea',
                                  }
                                }}
                                helperText="✏️ Editable - business registration date"
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="Capital Requirement (ETB)"
                                type="number"
                                value={formData.capitalRequirement}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    capitalRequirement: e.target.value,
                                  })
                                }
                                required
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    backgroundColor: '#fffbea',
                                  }
                                }}
                                helperText="✏️ Editable - minimum 5,000,000 ETB required"
                              />
                            </Grid>
                          </Grid>
                        </Stack>
                      </Box>

                      <Divider />

                      {/* Professional Requirements Section */}
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ color: '#667eea' }}>
                          Professional Requirements
                        </Typography>
                        <Stack spacing={2}>
                          <TextField
                            fullWidth
                            label="Professional Taster Certificate"
                            value={formData.tasterCertificate}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                tasterCertificate: e.target.value,
                              })
                            }
                            required
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: '#fffbea',
                              }
                            }}
                            helperText="✏️ Editable - taster certification number"
                          />

                          <TextField
                            fullWidth
                            label="Laboratory Facility"
                            value={formData.laboratoryFacility}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                laboratoryFacility: e.target.value,
                              })
                            }
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                backgroundColor: '#fffbea',
                              }
                            }}
                            helperText="✏️ Editable - laboratory facility description"
                          />
                        </Stack>
                      </Box>

                      <Divider />

                      {/* Contact Information Section - Read Only */}
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ color: '#999' }}>
                          Contact Information (Read-Only)
                        </Typography>
                        <Alert severity="info" sx={{ mb: 2 }}>
                          <Typography variant="body2">
                            Contact details cannot be changed during resubmission. If these are incorrect, 
                            please contact ECTA support at <strong>support@ecta.gov.et</strong>
                          </Typography>
                        </Alert>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Contact Person"
                              value={formData.contactPerson}
                              disabled
                              helperText="🔒 Read-only - contact ECTA to change"
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Email"
                              value={formData.email}
                              disabled
                              helperText="🔒 Read-only - contact ECTA to change"
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Phone"
                              value={formData.phone}
                              disabled
                              helperText="🔒 Read-only - contact ECTA to change"
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="City"
                              value={formData.city}
                              disabled
                              helperText="🔒 Read-only - contact ECTA to change"
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="Address"
                              value={formData.address}
                              disabled
                              multiline
                              rows={2}
                              helperText="🔒 Read-only - contact ECTA to change"
                            />
                          </Grid>
                          {formData.region && (
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="Region"
                                value={formData.region}
                                disabled
                                helperText="🔒 Read-only"
                              />
                            </Grid>
                          )}
                        </Grid>
                      </Box>

                      <Divider />

                      {/* Banking Information Section - Optional */}
                      {(formData.bankName || formData.bankAccountNumber || formData.bankBranchName) && (
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ color: '#999' }}>
                            Banking Information (Read-Only)
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="Bank Name"
                                value={formData.bankName}
                                disabled
                                helperText="🔒 Read-only"
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="Bank Account Number"
                                value={formData.bankAccountNumber}
                                disabled
                                helperText="🔒 Read-only"
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="Bank Branch"
                                value={formData.bankBranchName}
                                disabled
                                helperText="🔒 Read-only"
                              />
                            </Grid>
                            {formData.bankBranchCode && (
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  fullWidth
                                  label="Branch Code"
                                  value={formData.bankBranchCode}
                                  disabled
                                  helperText="🔒 Read-only"
                                />
                              </Grid>
                            )}
                          </Grid>
                        </Box>
                      )}

                      {formData.comments && (
                        <>
                          <Divider />
                          <Box>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ color: '#999' }}>
                              Additional Comments (Original)
                            </Typography>
                            <TextField
                              fullWidth
                              value={formData.comments}
                              disabled
                              multiline
                              rows={3}
                              helperText="🔒 Original comments from your application"
                            />
                          </Box>
                        </>
                      )}

                      <Divider />

                      <Alert severity="warning" icon={<Warning />}>
                        <Typography variant="body2" fontWeight="bold" gutterBottom>
                          Before Resubmitting:
                        </Typography>
                        <List dense>
                          <ListItem sx={{ pl: 0 }}>
                            <ListItemText primary="✓ Review the rejection reason above carefully" />
                          </ListItem>
                          <ListItem sx={{ pl: 0 }}>
                            <ListItemText primary="✓ Update all highlighted fields (yellow background)" />
                          </ListItem>
                          <ListItem sx={{ pl: 0 }}>
                            <ListItemText primary="✓ Ensure all information matches official documents" />
                          </ListItem>
                          <ListItem sx={{ pl: 0 }}>
                            <ListItemText primary="✓ Double-check TIN and Business License numbers" />
                          </ListItem>
                        </List>
                      </Alert>

                      <Stack direction="row" spacing={2} justifyContent="flex-end">
                        <Button
                          variant="outlined"
                          onClick={() => logout()}
                          disabled={submitting}
                          size="large"
                        >
                          Cancel & Logout
                        </Button>
                        <Button
                          type="submit"
                          variant="contained"
                          size="large"
                          disabled={submitting}
                          endIcon={submitting ? <CircularProgress size={20} /> : <Send />}
                          sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #5568d3 0%, #65398d 100%)',
                            },
                          }}
                        >
                          {submitting ? 'Resubmitting...' : 'Resubmit Corrected Application'}
                        </Button>
                      </Stack>
                    </Stack>
                  </form>
                </CardContent>
              </Card>
            </Box>
          </Fade>
        </Container>
      </Box>
    </>
  );
};

export default ResubmitApplicationPage;
