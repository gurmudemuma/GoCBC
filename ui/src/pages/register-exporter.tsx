// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Public Exporter Registration Page

import React, { useState } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Grid,
  InputAdornment,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Business,
  Person,
  AttachMoney,
  Description,
  CheckCircle,
  Coffee,
  ArrowForward,
  ArrowBack,
  Send,
  Email,
  Phone,
  LocationOn,
  AccountBalance,
} from '@mui/icons-material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import api from '@/utils/api';
import { ETHIOPIAN_BANKS } from '@/utils/banks';

const steps = ['Company Information', 'Requirements', 'Contact Details', 'Review & Submit'];

// Ethiopian Regions
const ETHIOPIAN_REGIONS = [
  'Addis Ababa',
  'Afar',
  'Amhara',
  'Benishangul-Gumuz',
  'Dire Dawa',
  'Gambela',
  'Harari',
  'Oromia',
  'Sidama',
  'SNNPR',
  'Somali',
  'Tigray',
];

// Cities mapped to their regions
const CITIES_BY_REGION: Record<string, string[]> = {
  'Addis Ababa': [
    'Addis Ababa',
  ],
  'Afar': [
    'Semera',
    'Awash',
    'Asayita',
    'Dubti',
  ],
  'Amhara': [
    'Bahir Dar',
    'Gondar',
    'Dessie',
    'Debre Birhan',
    'Debre Markos',
    'Kombolcha',
    'Woldia',
    'Debre Tabor',
    'Lalibela',
  ],
  'Benishangul-Gumuz': [
    'Asosa',
    'Metekel',
    'Pawe',
  ],
  'Dire Dawa': [
    'Dire Dawa',
  ],
  'Gambela': [
    'Gambela',
    'Itang',
    'Abobo',
  ],
  'Harari': [
    'Harar',
  ],
  'Oromia': [
    'Adama (Nazret)',
    'Jimma',
    'Bishoftu (Debre Zeit)',
    'Shashamane',
    'Nekemte',
    'Asella',
    'Ambo',
    'Bale Robe',
    'Gimbi',
    'Dera',
    'Burayu',
    'Sebeta',
    'Holeta',
    'Ziway',
  ],
  'Sidama': [
    'Hawassa',
    'Yirgalem',
    'Wondo Genet',
  ],
  'SNNPR': [
    'Arba Minch',
    'Dilla',
    'Sodo',
    'Hosaena',
    'Jinka',
    'Bonga',
    'Mizan Teferi',
    'Sawla',
  ],
  'Somali': [
    'Jijiga',
    'Gode',
    'Kebri Dahar',
    'Degahbur',
  ],
  'Tigray': [
    'Mekele',
    'Adigrat',
    'Axum',
    'Shire',
    'Adwa',
    'Wukro',
  ],
};

const RegisterExporterPage: React.FC = () => {
  const theme = useTheme();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    // Company Information
    companyName: '',
    tinNumber: '',
    businessLicenseNumber: '',
    registrationDate: '',
    
    // Requirements
    exporterType: '', // Added for 2026 requirements
    capitalRequirement: '',
    professionalTaster: '',
    tasterCertificate: '',
    laboratoryFacility: '',
    laboratoryCertificateNumber: '', // Added for 2026 requirements
    
    // Contact Details
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    region: '',
    
    // Additional
    bankName: '',
    bankAccountNumber: '',
    comments: '',
  });

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    
    // If region changes, clear the city selection
    if (field === 'region') {
      setFormData({ ...formData, [field]: newValue, city: '' });
    } else {
      setFormData({ ...formData, [field]: newValue });
    }
  };

  // Get available cities based on selected region
  const getAvailableCities = () => {
    if (!formData.region) {
      return [];
    }
    return CITIES_BY_REGION[formData.region] || [];
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // Submit application to API
      await api.post('/exporters/exporter-applications', formData);
      
      setSuccess(true);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit application');
      setLoading(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Company Information
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Please provide your company's basic information
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Company Name"
                value={formData.companyName}
                onChange={handleChange('companyName')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Business />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="TIN Number"
                value={formData.tinNumber}
                onChange={handleChange('tinNumber')}
                helperText="Tax Identification Number"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Business License Number"
                value={formData.businessLicenseNumber}
                onChange={handleChange('businessLicenseNumber')}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type="date"
                label="Registration Date"
                value={formData.registrationDate}
                onChange={handleChange('registrationDate')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                ECTA Requirements
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Coffee export license requirements as per ECTA regulations
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info">
                <strong>ECTA Requirements as per Directive 1106/2025 (Effective 2026):</strong>
                <List dense sx={{ mt: 1 }}>
                  <ListItem>
                    <ListItemText 
                      primary="• Minimum Capital Requirement:" 
                      secondary="- Private Exporters: 15,000,000 ETB
                      - Trade Associations/Companies (Joint Stock, Limited Liability): 20,000,000 ETB
                      - Individual Exporters (Competency Certification): 10,000,000 ETB"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="• Professional Coffee Taster (Mandatory):" 
                      secondary="Must have at least a diploma and a renewed proficiency certificate. One taster can serve only one coffee dispatcher."
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="• Coffee Laboratory (Mandatory):" 
                      secondary="ECTA-certified laboratory for basic quality testing (except for farmer exporters)"
                    />
                  </ListItem>
                </List>
              </Alert>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                required
                label="Exporter Type"
                value={formData.exporterType}
                onChange={handleChange('exporterType')}
                helperText="Select your business structure"
                sx={{ mt: 0 }}
              >
                <MenuItem value="">Select Type</MenuItem>
                <MenuItem value="private">Private Exporter (15M ETB minimum)</MenuItem>
                <MenuItem value="company">Trade Association/Company (20M ETB minimum)</MenuItem>
                <MenuItem value="individual">Individual with Competency Certificate (10M ETB minimum)</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type="number"
                label="Capital Requirement (ETB)"
                value={formData.capitalRequirement}
                onChange={handleChange('capitalRequirement')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoney />
                    </InputAdornment>
                  ),
                }}
                helperText={
                  formData.exporterType === 'private' ? 'Minimum 15,000,000 ETB' :
                  formData.exporterType === 'company' ? 'Minimum 20,000,000 ETB' :
                  formData.exporterType === 'individual' ? 'Minimum 10,000,000 ETB' :
                  'Select exporter type first'
                }
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Professional Taster Name"
                value={formData.professionalTaster}
                onChange={handleChange('professionalTaster')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
                helperText="Must have at least a diploma"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Taster Proficiency Certificate Number"
                value={formData.tasterCertificate}
                onChange={handleChange('tasterCertificate')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Description />
                    </InputAdornment>
                  ),
                }}
                helperText="Must be a renewed/valid certificate"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                select
                label="ECTA-Certified Laboratory"
                value={formData.laboratoryFacility}
                onChange={handleChange('laboratoryFacility')}
                helperText="Mandatory for basic quality testing"
                sx={{ mt: 0 }}
              >
                <MenuItem value="">Select</MenuItem>
                <MenuItem value="yes">Yes - Own Laboratory</MenuItem>
                <MenuItem value="contracted">Yes - Contracted Laboratory</MenuItem>
                <MenuItem value="farmer">N/A - Farmer Exporter (Exempt)</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Laboratory Certificate Number"
                value={formData.laboratoryCertificateNumber}
                onChange={handleChange('laboratoryCertificateNumber')}
                helperText="If you have an ECTA-certified lab"
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Contact Details
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                How can ECTA reach you regarding your application?
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Contact Person"
                value={formData.contactPerson}
                onChange={handleChange('contactPerson')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type="email"
                label="Email Address"
                value={formData.email}
                onChange={handleChange('email')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Phone Number"
                value={formData.phone}
                onChange={handleChange('phone')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone />
                    </InputAdornment>
                  ),
                }}
                helperText="Include country code (e.g., +251)"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                select
                label="Region"
                value={formData.region}
                onChange={handleChange('region')}
                helperText="Select your region/state first"
                sx={{ mt: 0 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOn />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="">Select Region</MenuItem>
                {ETHIOPIAN_REGIONS.map((region) => (
                  <MenuItem key={region} value={region}>
                    {region}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                select
                label="City"
                value={formData.city}
                onChange={handleChange('city')}
                disabled={!formData.region}
                helperText={formData.region ? `Select city in ${formData.region}` : 'Select region first'}
                sx={{ mt: 0 }}
              >
                <MenuItem value="">Select City</MenuItem>
                {getAvailableCities().map((city) => (
                  <MenuItem key={city} value={city}>
                    {city}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Street Address"
                value={formData.address}
                onChange={handleChange('address')}
                placeholder="e.g., Bole Road, near Edna Mall"
                helperText="Provide detailed street address"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Bank Name"
                value={formData.bankName}
                onChange={handleChange('bankName')}
                sx={{ mt: 0 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccountBalance />
                    </InputAdornment>
                  ),
                }}
              >
                <MenuItem value="">Select Bank</MenuItem>
                {ETHIOPIAN_BANKS.map((bank) => (
                  <MenuItem key={bank.id} value={bank.name}>
                    {bank.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Bank Account Number"
                value={formData.bankAccountNumber}
                onChange={handleChange('bankAccountNumber')}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Additional Comments"
                value={formData.comments}
                onChange={handleChange('comments')}
                multiline
                rows={3}
                placeholder="Any additional information you'd like to provide..."
              />
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Your Application
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Please review your information before submitting
            </Typography>

            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Company Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Company Name:</Typography>
                  <Typography variant="body1">{formData.companyName}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">TIN Number:</Typography>
                  <Typography variant="body1">{formData.tinNumber}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Business License:</Typography>
                  <Typography variant="body1">{formData.businessLicenseNumber}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Registration Date:</Typography>
                  <Typography variant="body1">{formData.registrationDate}</Typography>
                </Grid>
              </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Requirements
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Exporter Type:</Typography>
                  <Typography variant="body1">
                    {formData.exporterType === 'private' ? 'Private Exporter' :
                     formData.exporterType === 'company' ? 'Trade Association/Company' :
                     formData.exporterType === 'individual' ? 'Individual with Competency Certificate' :
                     formData.exporterType}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Capital:</Typography>
                  <Typography variant="body1">{Number(formData.capitalRequirement).toLocaleString()} ETB</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Professional Taster:</Typography>
                  <Typography variant="body1">{formData.professionalTaster}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Taster Certificate:</Typography>
                  <Typography variant="body1">{formData.tasterCertificate}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Laboratory:</Typography>
                  <Typography variant="body1">
                    {formData.laboratoryFacility === 'yes' ? 'Own Laboratory' :
                     formData.laboratoryFacility === 'contracted' ? 'Contracted Laboratory' :
                     formData.laboratoryFacility === 'farmer' ? 'Farmer Exporter (Exempt)' :
                     formData.laboratoryFacility}
                  </Typography>
                </Grid>
                {formData.laboratoryCertificateNumber && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Lab Certificate:</Typography>
                    <Typography variant="body1">{formData.laboratoryCertificateNumber}</Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Contact Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Contact Person:</Typography>
                  <Typography variant="body1">{formData.contactPerson}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Email:</Typography>
                  <Typography variant="body1">{formData.email}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Phone:</Typography>
                  <Typography variant="body1">{formData.phone}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">City:</Typography>
                  <Typography variant="body1">{formData.city}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Address:</Typography>
                  <Typography variant="body1">{formData.address}</Typography>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        );

      default:
        return null;
    }
  };

  if (success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          background: `linear-gradient(135deg, ${alpha('#078930', 0.95)}, ${alpha('#6d4c41', 0.98)})`,
        }}
      >
        <Container maxWidth="md">
          <Card elevation={24}>
            <CardContent sx={{ p: 5, textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Application Submitted Successfully!
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Thank you for applying to become a coffee exporter. Your application has been submitted to ECTA for review.
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Application Reference: <strong>APP-{Date.now().toString().slice(-8)}</strong>
              </Typography>
              <Divider sx={{ my: 3 }} />
              <Typography variant="h6" gutterBottom>
                What's Next?
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Document Verification"
                    secondary="ECTA will verify your submitted documents (2-3 business days)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Site Inspection"
                    secondary="ECTA may schedule a site visit to verify facilities"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="License Issuance"
                    secondary="Upon approval, you'll receive your ECTA export license"
                  />
                </ListItem>
              </List>
              <Box sx={{ mt: 4 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => router.push('/')}
                  sx={{ mr: 2 }}
                >
                  Go to Home
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => window.location.reload()}
                >
                  Submit Another Application
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  return (
    <>
      <Head>
        <title>Register as Coffee Exporter - CECBS</title>
        <meta name="description" content="Apply for coffee export license" />
      </Head>

      <Box
        sx={{
          minHeight: '100vh',
          py: 4,
          background: `linear-gradient(135deg, ${alpha('#078930', 0.95)}, ${alpha('#6d4c41', 0.98)})`,
        }}
      >
        <Container maxWidth="lg">
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4, color: 'white' }}>
            <Coffee sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h3" fontWeight="bold" gutterBottom>
              Coffee Exporter Registration
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Ethiopian Coffee & Tea Authority (ECTA)
            </Typography>
            <Typography variant="body1" sx={{ mt: 2, opacity: 0.8 }}>
              Apply for your coffee export license online
            </Typography>
          </Box>

          {/* Main Card */}
          <Card elevation={24} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: { xs: 3, md: 5 } }}>
              {/* Stepper */}
              <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {/* Step Content */}
              <Box sx={{ minHeight: 400 }}>
                {renderStepContent(activeStep)}
              </Box>

              {/* Navigation Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                  startIcon={<ArrowBack />}
                  size="large"
                >
                  Back
                </Button>

                {activeStep === steps.length - 1 ? (
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    endIcon={<Send />}
                    size="large"
                  >
                    {loading ? 'Submitting...' : 'Submit Application'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    endIcon={<ArrowForward />}
                    size="large"
                  >
                    Next
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Footer */}
          <Typography
            variant="caption"
            sx={{ display: 'block', textAlign: 'center', mt: 3, color: 'white', opacity: 0.8 }}
          >
            © 2026 Ethiopian Coffee & Tea Authority. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </>
  );
};

export default RegisterExporterPage;
