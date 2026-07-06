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
  ThemeProvider,
  createTheme,
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
  CloudUpload,
  Attachment,
} from '@mui/icons-material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import api from '@/utils/api';
import { ETHIOPIAN_BANKS } from '@/utils/banks';
import BankSelect from '@/components/common/BankSelect';
import { createOrganizationTheme } from '@/theme/organizationThemes';import BankBranchSelect from '@/components/common/BankBranchSelect';
import { DocumentUploadDialog } from '@/components/portals/DocumentUploadDialog';

const steps = ['Company Information', 'Requirements', 'Documents', 'Contact Details', 'Review & Submit'];

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

// Apply EXPORTER theme (purple and golden colors)
const exporterTheme = createOrganizationTheme('EXPORTER');

const RegisterExporterPage = () => {
  const theme = useTheme();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);

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
    bankBranchName: '',
    bankBranchCode: '',
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
      // Prepare documents data for submission
      const documentsData = uploadedDocuments.map(doc => ({
        documentId: doc.documentId,
        fileName: doc.file.name,
        category: doc.category,
        hash: doc.hash,
        ipfsCID: doc.ipfsCID,
        description: doc.description,
        encrypted: doc.encrypt,
      }));

      // Submit application to API with documents
      await api.post('/exporters/exporter-applications', {
        ...formData,
        documents: documentsData,
      });
      
      setSuccess(true);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit application');
      setLoading(false);
    }
  };

  const handleDocumentUploadComplete = (documents: any[]) => {
    setUploadedDocuments(prevDocs => [...prevDocs, ...documents]);
    setUploadDialogOpen(false);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="600" gutterBottom sx={{ color: '#000000' }}>
                Company Information
              </Typography>
              <Typography variant="caption" sx={{ color: '#000000' }}>
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
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Business sx={{ color: '#9b30b7' }} />
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
                size="small"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                label="Business License Number"
                value={formData.businessLicenseNumber}
                onChange={handleChange('businessLicenseNumber')}
                size="small"
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
                size="small"
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="600" gutterBottom sx={{ color: '#000000' }}>
                ECTA Requirements
              </Typography>
              <Typography variant="caption" sx={{ color: '#000000' }}>
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
                size="small"
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
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoney sx={{ color: '#9b30b7' }} />
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
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person sx={{ color: '#9b30b7' }} />
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
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Description sx={{ color: '#9b30b7' }} />
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
                size="small"
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
                size="small"
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="600" gutterBottom sx={{ color: '#000000' }}>
                Required Documents
              </Typography>
              <Typography variant="caption" sx={{ color: '#000000' }}>
                Upload supporting documents for verification and compliance
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Required Business Documents (for application verification):</strong>
                <List dense sx={{ mt: 1 }}>
                  <ListItem>
                    <ListItemText primary="• Tax Certificate (TIN) - Valid tax registration" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="• Business Registration/Trade License - Current and valid" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="• Bank Statement (Last 3 months) - Showing minimum capital requirement" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="• Professional Taster Certificate - Renewed proficiency certificate" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="• Laboratory Certification - If you have ECTA-certified lab (optional)" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="• Company Profile/References - Business history or trade references (optional)" />
                  </ListItem>
                </List>
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Important:</strong> Your <strong>ECTA Export License</strong> will be issued by ECTA <em>after</em> your application is approved. 
                    You do not need to upload it now. These documents are for identity verification and qualification assessment only.
                  </Typography>
                </Alert>
              </Alert>
            </Grid>

            <Grid item xs={12}>
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  textAlign: 'center',
                  bgcolor: 'grey.50',
                  border: '2px dashed',
                  borderColor: uploadedDocuments.length > 0 ? 'success.main' : 'grey.400',
                }}
              >
                {uploadedDocuments.length === 0 ? (
                  <>
                    <CloudUpload sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      No documents uploaded yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      Click the button below to upload your supporting documents
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<CloudUpload />}
                      onClick={() => setUploadDialogOpen(true)}
                      size="large"
                    >
                      Upload Documents
                    </Button>
                  </>
                ) : (
                  <>
                    <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      {uploadedDocuments.length} Document{uploadedDocuments.length !== 1 ? 's' : ''} Uploaded
                    </Typography>
                    <List sx={{ mt: 2, textAlign: 'left' }}>
                      {uploadedDocuments.map((doc, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <Attachment />
                          </ListItemIcon>
                          <ListItemText
                            primary={doc.file.name}
                            secondary={`${doc.category} - ${(doc.file.size / 1024).toFixed(2)} KB`}
                          />
                        </ListItem>
                      ))}
                    </List>
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="outlined"
                        startIcon={<CloudUpload />}
                        onClick={() => setUploadDialogOpen(true)}
                      >
                        Upload More Documents
                      </Button>
                    </Box>
                  </>
                )}
              </Paper>
            </Grid>

            {uploadedDocuments.length === 0 && (
              <Grid item xs={12}>
                <Alert severity="warning">
                  Documents are required for application verification. You can proceed without uploading now, 
                  but your application may be rejected if documents are not provided.
                </Alert>
              </Grid>
            )}
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="600" gutterBottom sx={{ color: '#000000' }}>
                Contact Details
              </Typography>
              <Typography variant="caption" sx={{ color: '#000000' }}>
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
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person sx={{ color: '#9b30b7' }} />
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
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: '#9b30b7' }} />
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
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone sx={{ color: '#9b30b7' }} />
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
                size="small"
                sx={{ mt: 0 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOn sx={{ color: '#9b30b7' }} />
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
                size="small"
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
              <Divider sx={{ my: 1 }}>
                <Typography variant="caption" sx={{ color: '#000000' }}>Banking Information</Typography>
              </Divider>
            </Grid>

            <Grid item xs={12} md={6}>
              <BankSelect
                value={formData.bankName}
                onChange={(value) => setFormData({ ...formData, bankName: value, bankBranchName: '', bankBranchCode: '' })}
                label="Bank Name"
                helperText="Bank where you hold your export account"
                type="ethiopian"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Bank Account Number"
                value={formData.bankAccountNumber}
                onChange={handleChange('bankAccountNumber')}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccountBalance sx={{ color: '#9b30b7' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <BankBranchSelect
                bankName={formData.bankName}
                value={formData.bankBranchName}
                onChange={(branchName, branch) =>
                  setFormData({ ...formData, bankBranchName: branchName, bankBranchCode: branch?.branchCode || '' })
                }
                label="Bank Branch"
                helperText="Select your branch — this will be used for LC processing"
                showDetails
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Additional Comments"
                value={formData.comments}
                onChange={handleChange('comments')}
                multiline
                rows={2}
                size="small"
                placeholder="Any additional information you'd like to provide..."
              />
            </Grid>
          </Grid>
        );

      case 4:
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

            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Uploaded Documents
              </Typography>
              {uploadedDocuments.length > 0 ? (
                <List dense>
                  {uploadedDocuments.map((doc, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckCircle color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary={doc.file.name}
                        secondary={`${doc.category} - ${(doc.file.size / 1024).toFixed(2)} KB`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="warning">
                  No documents uploaded. Your application may require additional verification.
                </Alert>
              )}
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
                {formData.bankName && (
                  <>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Bank:</Typography>
                      <Typography variant="body1">{formData.bankName}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Account Number:</Typography>
                      <Typography variant="body1">{formData.bankAccountNumber || '—'}</Typography>
                    </Grid>
                    {formData.bankBranchName && (
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Branch:</Typography>
                        <Typography variant="body1">{formData.bankBranchName}{formData.bankBranchCode ? ` (${formData.bankBranchCode})` : ''}</Typography>
                      </Grid>
                    )}
                  </>
                )}
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
      <ThemeProvider theme={exporterTheme}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          background: '#9b30b7',
        }}
      >
        <Container maxWidth="md">
          <Card 
            elevation={24}
            sx={{
              borderRadius: 4,
              overflow: 'hidden',
              bgcolor: '#FFFFFF',
            }}
          >
            <Box 
              sx={{ 
                height: 4, 
                bgcolor: '#FFD700',
              }} 
            />
            <CardContent sx={{ p: 5, textAlign: 'center' }}>
              <Box 
                sx={{ 
                  display: 'inline-flex',
                  p: 2,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255, 215, 0, 0.15)',
                  mb: 2,
                }}
              >
                <CheckCircle sx={{ fontSize: 80, color: '#FFD700' }} />
              </Box>
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
                    <CheckCircle sx={{ color: '#FFD700' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Document Verification"
                    secondary="ECTA will verify your submitted documents (2-3 business days)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle sx={{ color: '#FFD700' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Site Inspection"
                    secondary="ECTA may schedule a site visit to verify facilities"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle sx={{ color: '#FFD700' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="License Issuance"
                    secondary="Upon approval, you'll receive your ECTA export license"
                  />
                </ListItem>
              </List>
              <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => router.push('/')}
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    bgcolor: '#9b30b7',
                    '&:hover': {
                      bgcolor: '#7b1fa2',
                    },
                  }}
                >
                  Go to Home
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => window.location.reload()}
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    borderColor: '#9b30b7',
                    color: '#9b30b7',
                    '&:hover': {
                      borderColor: '#7b1fa2',
                      bgcolor: 'rgba(155, 48, 183, 0.05)',
                    },
                  }}
                >
                  Submit Another Application
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Container>
      </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={exporterTheme}>
    <>
      <Head>
        <title>Register as Coffee Exporter - CECBS</title>
        <meta name="description" content="Apply for coffee export license" />
      </Head>

      <Box
        sx={{
          minHeight: '100vh',
          maxHeight: '100vh',
          overflow: 'hidden',
          py: 3,
          background: '#9b30b7',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Container maxWidth="lg" sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 2, color: 'white' }}>
            <Box 
              sx={{ 
                display: 'inline-flex',
                p: 1.5,
                borderRadius: '50%',
                bgcolor: 'rgba(255, 255, 255, 0.15)',
                mb: 1,
              }}
            >
              <Coffee sx={{ fontSize: 36, color: '#FFD700' }} />
            </Box>
            <Typography 
              variant="h4" 
              fontWeight="bold" 
              sx={{
                color: '#FFFFFF',
                letterSpacing: '-0.5px',
                mb: 0.5,
              }}
            >
              Coffee Exporter Registration
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.9)',
              }}
            >
              Ethiopian Coffee & Tea Authority (ECTA)
            </Typography>
          </Box>

          {/* Main Card */}
          <Card 
            elevation={24} 
            sx={{ 
              borderRadius: 3,
              overflow: 'hidden',
              bgcolor: '#FFFFFF',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box 
              sx={{ 
                height: 3, 
                bgcolor: '#FFD700',
              }} 
            />
            <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Stepper */}
              <Stepper 
                activeStep={activeStep} 
                sx={{ 
                  mb: 2,
                  '& .MuiStepLabel-root .Mui-completed': {
                    color: '#FFD700',
                  },
                  '& .MuiStepLabel-root .Mui-active': {
                    color: '#9b30b7',
                  },
                  '& .MuiStepIcon-root': {
                    color: 'rgba(0, 0, 0, 0.3)',
                  },
                  '& .MuiStepIcon-root.Mui-active': {
                    color: '#9b30b7',
                  },
                  '& .MuiStepIcon-root.Mui-completed': {
                    color: '#FFD700',
                  },
                  '& .MuiStepConnector-line': {
                    borderColor: 'rgba(0, 0, 0, 0.2)',
                  },
                  '& .Mui-completed .MuiStepConnector-line': {
                    borderColor: '#FFD700',
                  },
                  '& .MuiStepLabel-label': {
                    fontSize: '0.875rem',
                    color: '#000000',
                  },
                  '& .MuiStepLabel-label.Mui-active': {
                    fontWeight: 600,
                    color: '#9b30b7',
                  },
                  '& .MuiStepLabel-label.Mui-completed': {
                    color: '#000000',
                  },
                }}
              >
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {/* Step Content */}
              <Box sx={{ flex: 1, overflow: 'auto', pr: 1 }}>
                {renderStepContent(activeStep)}
              </Box>

              {/* Navigation Buttons */}
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  mt: 2,
                  pt: 2,
                  borderTop: '1px solid rgba(0, 0, 0, 0.1)',
                }}
              >
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                  startIcon={<ArrowBack />}
                  size="medium"
                  sx={{
                    textTransform: 'none',
                    px: 3,
                  }}
                >
                  Back
                </Button>

                {activeStep === steps.length - 1 ? (
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    endIcon={<Send />}
                    size="medium"
                    sx={{
                      textTransform: 'none',
                      px: 4,
                      bgcolor: '#9b30b7',
                      '&:hover': {
                        bgcolor: '#7b1fa2',
                      },
                    }}
                  >
                    {loading ? 'Submitting...' : 'Submit Application'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    endIcon={<ArrowForward />}
                    size="medium"
                    sx={{
                      textTransform: 'none',
                      px: 4,
                      bgcolor: '#9b30b7',
                      '&:hover': {
                        bgcolor: '#7b1fa2',
                      },
                    }}
                  >
                    Next
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Footer */}
          <Box 
            sx={{ 
              textAlign: 'center', 
              mt: 1.5, 
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              fontSize: '0.75rem',
            }}
          >
            <Typography variant="caption">
              © 2026 Ethiopian Coffee & Tea Authority
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>•</Typography>
            <Typography variant="caption">
              All rights reserved
            </Typography>
          </Box>
        </Container>

        {/* Document Upload Dialog */}
        <DocumentUploadDialog
          open={uploadDialogOpen}
          entityType="EXPORTER_APPLICATION"
          onClose={() => setUploadDialogOpen(false)}
          onUploadComplete={handleDocumentUploadComplete}
        />
      </Box>
    </>
    </ThemeProvider>
  );
};

export default RegisterExporterPage;
