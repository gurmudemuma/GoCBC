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
  Fade,
  Zoom,
  Stack,
  Chip,
  LinearProgress,
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
import BankBranchSelect from '@/components/common/BankBranchSelect';

const steps = ['Company Information', 'Requirements', 'Documents', 'Contact Details', 'Review & Submit'];
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

const RegisterExporterPage = () => {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

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

  const validateStep = (step: number): string | null => {
    switch (step) {
      case 0: // Company Information
        if (!formData.companyName.trim()) return 'Company name is required';
        if (!formData.tinNumber.trim()) return 'TIN number is required';
        if (!formData.businessLicenseNumber.trim()) return 'Business license is required';
        if (!formData.registrationDate) return 'Registration date is required';
        break;
      
      case 1: // Requirements
        if (!formData.exporterType) return 'Please select exporter type';
        if (!formData.capitalRequirement || Number(formData.capitalRequirement) <= 0) {
          return 'Valid capital amount is required';
        }
        const minCapital = formData.exporterType === 'private' ? 15000000 :
                          formData.exporterType === 'company' ? 20000000 :
                          formData.exporterType === 'individual' ? 10000000 : 0;
        if (Number(formData.capitalRequirement) < minCapital) {
          return `Minimum capital: ${minCapital.toLocaleString()} ETB`;
        }
        if (!formData.professionalTaster.trim()) return 'Professional taster name is required';
        if (!formData.tasterCertificate.trim()) return 'Taster certificate is required';
        if (!formData.laboratoryFacility) return 'Laboratory facility status is required';
        break;
      
      case 2: // Documents (optional, just warning)
        // No validation - documents are optional but recommended
        break;
      
      case 3: // Contact Details
        if (!formData.contactPerson.trim()) return 'Contact person is required';
        if (!formData.email.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Valid email required';
        if (!formData.phone.trim()) return 'Phone number is required';
        if (!formData.address.trim()) return 'Address is required';
        if (!formData.region) return 'Region is required';
        if (!formData.city) return 'City is required';
        break;
    }
    return null;
  };

  const handleNext = () => {
    const error = validateStep(activeStep);
    if (error) {
      setError(error);
      return;
    }
    setError('');
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setError('');
    setActiveStep((prevStep) => prevStep - 1);
  };

  const validateForm = (): string | null => {
    // Step 0: Company Information
    if (!formData.companyName.trim()) return 'Company name is required';
    if (!formData.tinNumber.trim()) return 'TIN number is required';
    if (!formData.businessLicenseNumber.trim()) return 'Business license number is required';
    if (!formData.registrationDate) return 'Registration date is required';

    // Step 1: Requirements
    if (!formData.exporterType) return 'Exporter type is required';
    if (!formData.capitalRequirement || Number(formData.capitalRequirement) <= 0) {
      return 'Valid capital requirement is required';
    }
    
    // Validate capital meets minimum based on type
    const minCapital = formData.exporterType === 'private' ? 15000000 :
                       formData.exporterType === 'company' ? 20000000 :
                       formData.exporterType === 'individual' ? 10000000 : 0;
    if (Number(formData.capitalRequirement) < minCapital) {
      return `Capital must be at least ${minCapital.toLocaleString()} ETB for ${formData.exporterType} exporter`;
    }

    if (!formData.professionalTaster.trim()) return 'Professional taster name is required';
    if (!formData.tasterCertificate.trim()) return 'Taster certificate number is required';
    if (!formData.laboratoryFacility) return 'Laboratory facility status is required';

    // Step 3: Contact Details
    if (!formData.contactPerson.trim()) return 'Contact person is required';
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return 'Valid email address is required';
    }
    if (!formData.phone.trim()) return 'Phone number is required';
    if (!formData.address.trim()) return 'Physical address is required';
    if (!formData.region) return 'Region is required';
    if (!formData.city) return 'City is required';

    return null;
  };

  const handleSubmit = async () => {
    // Client-side validation before submission
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Step 1: Submit application WITHOUT documents first
      const response = await api.post('/exporters/exporter-applications', {
        ...formData,
        documents: [], // Empty for now
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Application submission failed');
      }

      const applicationId = response.data.data.applicationId;

      // Step 2: Upload documents with the application ID
      if (uploadedDocuments.length > 0) {
        const uploadPromises = uploadedDocuments.map(async (doc) => {
          try {
            const formData = new FormData();
            formData.append('file', doc.file);
            formData.append('fileName', doc.file.name);
            formData.append('documentType', doc.category || 'OTHER');
            formData.append('encrypt', doc.encrypt.toString());
            formData.append('entityType', 'EXPORTER_APPLICATION');
            formData.append('entityId', applicationId);

            const uploadResponse = await fetch('http://localhost:3001/api/v1/documents/upload-registration', {
              method: 'POST',
              body: formData,
            });

            const result = await uploadResponse.json();
            return result.success;
          } catch (error) {
            console.error('Document upload error:', error);
            return false;
          }
        });

        await Promise.all(uploadPromises);
      }
      
      setSuccess(true);
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message 
        || err.response?.data?.message 
        || err.message 
        || 'Failed to submit application. Please check all required fields.';
      
      setError(errorMessage);
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDocumentUploadComplete = (documents: any[]) => {
    setUploadedDocuments(prevDocs => [...prevDocs, ...documents]);
    setUploadDialogOpen(false);
  };

  // Direct file upload handler - just store files locally, upload after application created
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newDocs: any[] = [];

    Array.from(files).forEach((file) => {
      newDocs.push({
        file,
        category: 'OTHER',
        encrypt: true,
        status: 'pending',
      });
    });

    setUploadedDocuments(prev => [...prev, ...newDocs]);

    // Reset input
    if (event.target) {
      event.target.value = '';
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
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
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
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
                      Click the button below to browse and upload your supporting documents
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<CloudUpload />}
                      onClick={triggerFileUpload}
                      size="large"
                    >
                      Browse & Upload Documents
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
                        onClick={triggerFileUpload}
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
                label="Physical Address"
                value={formData.address}
                onChange={handleChange('address')}
                size="small"
                multiline
                rows={2}
                placeholder="Street address, building name, floor, etc."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOn sx={{ color: '#9b30b7' }} />
                    </InputAdornment>
                  ),
                }}
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
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decorations */}
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
            top: '-10%',
            right: '-5%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(155, 48, 183, 0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Zoom in={true} timeout={800}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                background: 'white',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
              }}
            >
              <Box sx={{ height: 4, bgcolor: '#FFD700' }} />
              <Box sx={{ p: { xs: 4, md: 6 }, textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFC700 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    mb: 3,
                    boxShadow: '0 8px 24px rgba(255, 215, 0, 0.3)',
                  }}
                >
                  <CheckCircle sx={{ fontSize: 48, color: '#9b30b7' }} />
                </Box>

                <Typography
                  variant="h4"
                  fontWeight="700"
                  gutterBottom
                  sx={{ color: '#1a1a1a', letterSpacing: '-0.5px' }}
                >
                  Application Submitted Successfully!
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ color: '#616161', mb: 2, maxWidth: 500, mx: 'auto' }}
                >
                  Thank you for applying to become a coffee exporter. Your application has been submitted to ECTA for review.
                </Typography>

                <Chip
                  label={`Application ID: APP-${Date.now().toString().slice(-8)}`}
                  sx={{
                    mb: 4,
                    fontWeight: 600,
                    bgcolor: alpha('#9b30b7', 0.1),
                    color: '#9b30b7',
                    fontSize: '0.875rem',
                    px: 2,
                    py: 2.5,
                  }}
                />

                <Divider sx={{ my: 4 }} />

                <Typography variant="h6" fontWeight="600" gutterBottom sx={{ color: '#1a1a1a' }}>
                  What Happens Next?
                </Typography>
                
                <Grid container spacing={2} sx={{ mt: 2, mb: 4 }}>
                  {[
                    { title: 'Document Verification', desc: 'ECTA will verify your submitted documents', time: '2-3 business days' },
                    { title: 'Site Inspection', desc: 'ECTA may schedule a site visit to verify facilities', time: 'If required' },
                    { title: 'License Issuance', desc: 'Upon approval, you\'ll receive your ECTA export license', time: 'Final step' },
                  ].map((step, idx) => (
                    <Grid item xs={12} md={4} key={idx}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2.5,
                          height: '100%',
                          background: 'rgba(155, 48, 183, 0.04)',
                          border: '1px solid',
                          borderColor: alpha('#9b30b7', 0.15),
                          borderRadius: 2,
                        }}
                      >
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            bgcolor: '#9b30b7',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            mb: 1.5,
                          }}
                        >
                          {idx + 1}
                        </Box>
                        <Typography variant="body2" fontWeight="600" gutterBottom sx={{ color: '#1a1a1a' }}>
                          {step.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#616161', display: 'block', mb: 1 }}>
                          {step.desc}
                        </Typography>
                        <Chip
                          label={step.time}
                          size="small"
                          sx={{
                            bgcolor: alpha('#FFD700', 0.2),
                            color: '#9b30b7',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                          }}
                        />
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => router.push('/')}
                    sx={{
                      px: 4,
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #9b30b7 0%, #7a2596 100%)',
                      boxShadow: '0 4px 12px rgba(155, 48, 183, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #7a2596 0%, #6d1f8a 100%)',
                        boxShadow: '0 6px 16px rgba(155, 48, 183, 0.4)',
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
                      fontWeight: 600,
                      borderColor: '#FFD700',
                      color: '#9b30b7',
                      borderWidth: 2,
                      '&:hover': {
                        borderWidth: 2,
                        borderColor: '#FFD700',
                        bgcolor: alpha('#FFD700', 0.08),
                      },
                    }}
                  >
                    Submit Another Application
                  </Button>
                </Stack>
              </Box>
            </Paper>
          </Zoom>
        </Container>
      </Box>
    );
  }

  return (
    <>
      <Head>
        <title>Register as Coffee Exporter - CECBS</title>
        <meta name="description" content="Apply for coffee export license - ECTA 2026" />
      </Head>

      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decorations */}
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
            
            {/* Left Column - Features */}
            <Grid item xs={12} lg={5} sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', py: 3 }}>
              <Fade in={mounted} timeout={1000}>
                <Box sx={{ width: '100%', px: 4 }}>
                  
                  <Stack direction="row" alignItems="center" spacing={2} mb={3}>
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
                      <Typography variant="h6" fontWeight="700" sx={{ color: '#1a1a1a', lineHeight: 1.2 }}>
                        Coffee Exporter
                      </Typography>
                      <Typography variant="h6" fontWeight="700" sx={{ color: '#9b30b7' }}>
                        Registration
                      </Typography>
                    </Box>
                  </Stack>

                  <Typography variant="h4" fontWeight="700" sx={{ mb: 2, color: '#1a1a1a', letterSpacing: '-1px' }}>
                    Join Ethiopia's Leading
                    <br />
                    <span style={{ color: '#9b30b7' }}>Coffee Export Platform</span>
                  </Typography>

                  <Typography variant="body1" sx={{ mb: 3, color: '#616161', lineHeight: 1.6 }}>
                    Become part of the blockchain-powered coffee export ecosystem. 
                    Get your ECTA license and access to regulated, transparent trade operations.
                  </Typography>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      mb: 3,
                      background: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid',
                      borderColor: alpha('#9b30b7', 0.2),
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="body2" fontWeight="600" gutterBottom sx={{ color: '#1a1a1a' }}>
                      📋 ECTA Requirements (2026)
                    </Typography>
                    <List dense sx={{ '& .MuiListItem-root': { py: 0.5 } }}>
                      <ListItem>
                        <ListItemText 
                          primary="Minimum Capital: 10M-20M ETB"
                          primaryTypographyProps={{ variant: 'caption', color: '#616161' }}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Professional Taster (Certified)"
                          primaryTypographyProps={{ variant: 'caption', color: '#616161' }}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="ECTA-Certified Laboratory"
                          primaryTypographyProps={{ variant: 'caption', color: '#616161' }}
                        />
                      </ListItem>
                    </List>
                  </Paper>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      background: 'linear-gradient(135deg, #9b30b7 0%, #7a2596 100%)',
                      borderRadius: 2,
                      color: 'white',
                    }}
                  >
                    <Typography variant="body2" fontWeight="600" gutterBottom>
                      ⚡ Fast Processing
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mb: 2 }}>
                      Get your application reviewed within 2-3 business days
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label="2-3 Days" size="small" sx={{ bgcolor: '#FFD700', color: '#9b30b7', fontWeight: 700 }} />
                      <Chip label="EUDR Ready" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }} />
                    </Box>
                  </Paper>

                </Box>
              </Fade>
            </Grid>

            {/* Right Column - Form */}
            <Grid item xs={12} lg={7} sx={{ display: 'flex', alignItems: 'center', background: 'white', py: 3 }}>
              <Zoom in={mounted} timeout={1000}>
                <Box sx={{ width: '100%', px: { xs: 3, md: 5 }, maxHeight: '100vh', overflow: 'auto' }}>
                  
                  {/* Progress */}
                  <Box mb={3}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" fontWeight="600" sx={{ color: '#1a1a1a' }}>
                        Step {activeStep + 1} of {steps.length}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#616161' }}>
                        {steps[activeStep]}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={((activeStep + 1) / steps.length) * 100}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: alpha('#9b30b7', 0.1),
                        '& .MuiLinearProgress-bar': {
                          bgcolor: '#9b30b7',
                          borderRadius: 3,
                        },
                      }}
                    />
                  </Box>

                  {error && (
                    <Fade in={!!error}>
                      <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                        {error}
                      </Alert>
                    </Fade>
                  )}

                  {/* Form Content */}
                  <Box mb={3}>
                    {renderStepContent(activeStep)}
                  </Box>

                  {/* Navigation */}
                  <Stack direction="row" spacing={2} justifyContent="space-between">
                    <Button
                      disabled={activeStep === 0}
                      onClick={handleBack}
                      startIcon={<ArrowBack />}
                      variant="outlined"
                      sx={{
                        textTransform: 'none',
                        px: 3,
                        py: 1.5,
                        borderRadius: 2,
                        borderColor: alpha('#9b30b7', 0.3),
                        color: '#9b30b7',
                        fontWeight: 600,
                        '&:hover': {
                          borderColor: '#9b30b7',
                          bgcolor: alpha('#9b30b7', 0.05),
                        },
                      }}
                    >
                      Back
                    </Button>

                    {activeStep === steps.length - 1 ? (
                      <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={loading}
                        endIcon={loading ? null : <Send />}
                        sx={{
                          textTransform: 'none',
                          px: 4,
                          py: 1.5,
                          borderRadius: 2,
                          fontWeight: 600,
                          background: 'linear-gradient(135deg, #9b30b7 0%, #7a2596 100%)',
                          boxShadow: '0 4px 12px rgba(155, 48, 183, 0.3)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #7a2596 0%, #6d1f8a 100%)',
                            boxShadow: '0 6px 16px rgba(155, 48, 183, 0.4)',
                          },
                          '&:disabled': {
                            opacity: 0.6,
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
                        sx={{
                          textTransform: 'none',
                          px: 4,
                          py: 1.5,
                          borderRadius: 2,
                          fontWeight: 600,
                          background: 'linear-gradient(135deg, #9b30b7 0%, #7a2596 100%)',
                          boxShadow: '0 4px 12px rgba(155, 48, 183, 0.3)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #7a2596 0%, #6d1f8a 100%)',
                            boxShadow: '0 6px 16px rgba(155, 48, 183, 0.4)',
                          },
                        }}
                      >
                        Next
                      </Button>
                    )}
                  </Stack>

                  <Typography variant="caption" display="block" textAlign="center" sx={{ color: '#9e9e9e', mt: 3 }}>
                    © 2026 Ethiopian Coffee & Tea Authority (ECTA)
                  </Typography>

                </Box>
              </Zoom>
            </Grid>

          </Grid>
        </Container>
      </Box>
    </>
  );
};

export default RegisterExporterPage;
