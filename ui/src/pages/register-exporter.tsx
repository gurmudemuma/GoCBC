// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Public Exporter Registration Page — 2026

import React, { useState, useRef } from 'react';
import {
  Box, Container, TextField, Button, Typography, Alert, Grid,
  InputAdornment, Divider, Paper, List, ListItem, ListItemIcon,
  ListItemText, MenuItem, alpha, Fade, Zoom, Stack, Chip,
  IconButton, Tooltip, Avatar,
} from '@mui/material';
import {
  Business, Person, AttachMoney, Description, CheckCircle, Coffee,
  Send, Email, Phone, LocationOn, AccountBalance, CloudUpload, Edit,
  Delete, InsertDriveFile, VerifiedUser, HistoryEdu, ArrowForward,
} from '@mui/icons-material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import api from '@/utils/api';
import BankSelect from '@/components/common/BankSelect';
import BankBranchSelect from '@/components/common/BankBranchSelect';

// ─── Constants ────────────────────────────────────────────────────────────────

const ETHIOPIAN_REGIONS = [
  'Addis Ababa','Afar','Amhara','Benishangul-Gumuz','Dire Dawa',
  'Gambela','Harari','Oromia','Sidama','SNNPR','Somali','Tigray',
];
const CITIES_BY_REGION: Record<string, string[]> = {
  'Addis Ababa': ['Addis Ababa'],
  'Afar': ['Semera','Awash','Asayita','Dubti'],
  'Amhara': ['Bahir Dar','Gondar','Dessie','Debre Birhan','Debre Markos','Kombolcha','Woldia','Debre Tabor','Lalibela'],
  'Benishangul-Gumuz': ['Asosa','Metekel','Pawe'],
  'Dire Dawa': ['Dire Dawa'],
  'Gambela': ['Gambela','Itang','Abobo'],
  'Harari': ['Harar'],
  'Oromia': ['Adama (Nazret)','Jimma','Bishoftu (Debre Zeit)','Shashamane','Nekemte','Asella','Ambo','Bale Robe','Gimbi','Ziway','Burayu','Sebeta','Holeta'],
  'Sidama': ['Hawassa','Yirgalem','Wondo Genet'],
  'SNNPR': ['Arba Minch','Dilla','Sodo','Hosaena','Jinka','Bonga','Mizan Teferi','Sawla'],
  'Somali': ['Jijiga','Gode','Kebri Dahar','Degahbur'],
  'Tigray': ['Mekele','Adigrat','Axum','Shire','Adwa','Wukro'],
};

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  purple: '#9b30b7',
  purpleDark: '#7a2596',
  purpleDarker: '#6d1f8a',
  gold: '#FFD700',
  green: '#2e7d32',
  blue: '#1565c0',
  orange: '#e65100',
  teal: '#00838f',
  indigo: '#6a1b9a',
};
const purpleGrad = `linear-gradient(135deg, ${C.purple} 0%, ${C.purpleDark} 100%)`;
const btnSx = { textTransform: 'none' as const, fontWeight: 700, borderRadius: 2, px: 4, py: 1.5 };

// ─── Types ────────────────────────────────────────────────────────────────────

type DocKey = 'tinDoc' | 'businessLicenseDoc' | 'bankStatementDoc' | 'tasterCertDoc' | 'labCertDoc' | 'historyDoc';
type DocFiles = Record<DocKey, File | null>;

interface FormData {
  companyName: string; tinNumber: string; businessLicenseNumber: string; registrationDate: string;
  exporterType: string; capitalRequirement: string; professionalTaster: string;
  tasterCertificate: string; laboratoryFacility: string; laboratoryCertificateNumber: string;
  contactPerson: string; email: string; phone: string; address: string;
  city: string; region: string; bankName: string; bankAccountNumber: string;
  bankBranchName: string; bankBranchCode: string; comments: string;
}

// ─── Upload adornment — lives inside the TextField as endAdornment ────────────
//
// Usage:  <TextField ... InputProps={{ endAdornment: <UploadAdornment ... /> }} />

interface UploadAdornmentProps {
  docKey: DocKey;
  file: File | null;
  color: string;
  touched?: boolean;            // show red outline when user tried to proceed without uploading
  onChange: (key: DocKey, file: File | null) => void;
}

const UploadAdornment: React.FC<UploadAdornmentProps> = ({ docKey, file, color, touched = false, onChange }) => {
  const ref = useRef<HTMLInputElement>(null);
  const isUploaded = !!file;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f) onChange(docKey, f);
    e.target.value = '';
  };

  return (
    <InputAdornment position="end">
      <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ display: 'none' }} onChange={handleFile} />

      {isUploaded ? (
        /* ── Uploaded: green chip with filename + ✕ ── */
        <Stack direction="row" alignItems="center" spacing={0.3}
          sx={{
            bgcolor: alpha(color, 0.1), border: `1px solid ${alpha(color, 0.35)}`,
            borderRadius: 1, px: 0.8, py: 0.3, maxWidth: 160, cursor: 'default',
          }}
        >
          <CheckCircle sx={{ fontSize: 13, color, flexShrink: 0 }} />
          <Typography variant="caption" fontWeight={700} sx={{ color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.65rem' }}>
            {file!.name.length > 16 ? file!.name.slice(0, 14) + '…' : file!.name}
          </Typography>
          <Tooltip title="Remove file">
            <IconButton size="small" onClick={() => onChange(docKey, null)} sx={{ color: '#d32f2f', p: 0.2, ml: 0.3, flexShrink: 0 }}>
              <Delete sx={{ fontSize: 12 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      ) : (
        /* ── Not uploaded: upload icon button ── */
        <Tooltip title="Click to upload document">
          <IconButton
            size="small"
            onClick={() => ref.current?.click()}
            sx={{
              color: touched ? '#d32f2f' : color,
              bgcolor: touched ? alpha('#d32f2f', 0.08) : alpha(color, 0.08),
              border: `1.5px solid`,
              borderColor: touched ? alpha('#d32f2f', 0.4) : alpha(color, 0.3),
              borderRadius: 1.2,
              px: 1,
              py: 0.4,
              gap: 0.4,
              '&:hover': {
                bgcolor: touched ? alpha('#d32f2f', 0.14) : alpha(color, 0.15),
                borderColor: touched ? '#d32f2f' : color,
              },
            }}
          >
            <CloudUpload sx={{ fontSize: 15 }} />
            <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.62rem', lineHeight: 1 }}>
              Upload
            </Typography>
          </IconButton>
        </Tooltip>
      )}
    </InputAdornment>
  );
};

// ─── Standalone history upload (dashed box) ────────────────────────────────────

const HistoryUpload: React.FC<{ file: File | null; onChange: (key: DocKey, f: File | null) => void }> = ({ file, onChange }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <Box
      onClick={() => !file && ref.current?.click()}
      sx={{
        border: `2px dashed`, borderColor: file ? C.indigo : alpha(C.indigo, 0.3),
        borderRadius: 2, p: 2, cursor: file ? 'default' : 'pointer',
        bgcolor: file ? alpha(C.indigo, 0.05) : 'transparent',
        transition: 'all 0.18s ease',
        '&:hover': !file ? { borderColor: C.indigo, bgcolor: alpha(C.indigo, 0.05), boxShadow: `0 0 0 3px ${alpha(C.indigo, 0.1)}` } : {},
      }}
    >
      <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onChange('historyDoc', f); e.target.value = ''; }} />
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Avatar sx={{ width: 38, height: 38, bgcolor: file ? C.indigo : alpha(C.indigo, 0.12), color: file ? 'white' : C.indigo }}>
          {file ? <CheckCircle sx={{ fontSize: 22 }} /> : <HistoryEdu sx={{ fontSize: 20 }} />}
        </Avatar>
        <Box flex={1} minWidth={0}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="body2" fontWeight={700} sx={{ color: '#1a1a1a' }}>Company History / References</Typography>
            <Chip label="Optional" size="small" sx={{ height: 15, fontSize: '0.6rem', bgcolor: alpha('#616161', 0.1), color: '#616161' }} />
          </Stack>
          <Typography variant="caption" sx={{ color: file ? C.indigo : '#9e9e9e' }}>
            {file ? `${file.name} (${(file.size / 1024).toFixed(0)} KB)` : 'Business history or trade references — click to upload'}
          </Typography>
        </Box>
        {file ? (
          <Tooltip title="Remove">
            <IconButton size="small" onClick={e => { e.stopPropagation(); onChange('historyDoc', null); }} sx={{ color: '#d32f2f' }}>
              <Delete sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        ) : (
          <CloudUpload sx={{ color: alpha(C.indigo, 0.45), fontSize: 22 }} />
        )}
      </Stack>
    </Box>
  );
};

// ─── Section header ────────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ icon: React.ReactNode; color: string; title: string; subtitle: string }> = ({ icon, color, title, subtitle }) => (
  <Box sx={{ mb: 2, pb: 1.5, borderBottom: `2px solid ${alpha(color, 0.15)}` }}>
    <Stack direction="row" alignItems="center" spacing={1.5}>
      <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: alpha(color, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        {React.cloneElement(icon as React.ReactElement, { sx: { fontSize: 20 } })}
      </Box>
      <Box>
        <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#1a1a1a', lineHeight: 1.2 }}>{title}</Typography>
        <Typography variant="caption" sx={{ color: '#9e9e9e' }}>{subtitle}</Typography>
      </Box>
    </Stack>
  </Box>
);

// ─── Background blobs ──────────────────────────────────────────────────────────

const BgBlobs: React.FC = () => (
  <>
    <Box sx={{ position: 'absolute', inset: 0, opacity: 0.025, backgroundImage: 'repeating-linear-gradient(45deg,#000 0,#000 1px,transparent 0,transparent 50%)', backgroundSize: '10px 10px' }} />
    <Box sx={{ position: 'absolute', top: '-15%', right: '-8%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(155,48,183,0.18) 0%,transparent 70%)', filter: 'blur(60px)' }} />
    <Box sx={{ position: 'absolute', bottom: '-15%', left: '-8%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,215,0,0.15) 0%,transparent 70%)', filter: 'blur(60px)' }} />
  </>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const RegisterExporterPage = () => {
  const router = useRouter();
  const [mode, setMode] = useState<'form' | 'review' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = React.useState(false);
  const [docsTouched, setDocsTouched] = useState(false); // turns upload buttons red after first failed attempt
  React.useEffect(() => { setMounted(true); }, []);

  const [formData, setFormData] = useState<FormData>({
    companyName: '', tinNumber: '', businessLicenseNumber: '', registrationDate: '',
    exporterType: '', capitalRequirement: '', professionalTaster: '', tasterCertificate: '',
    laboratoryFacility: '', laboratoryCertificateNumber: '',
    contactPerson: '', email: '', phone: '', address: '', city: '', region: '',
    bankName: '', bankAccountNumber: '', bankBranchName: '', bankBranchCode: '', comments: '',
  });

  const [docFiles, setDocFiles] = useState<DocFiles>({
    tinDoc: null, businessLicenseDoc: null, bankStatementDoc: null,
    tasterCertDoc: null, labCertDoc: null, historyDoc: null,
  });

  const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (field === 'region') { setFormData(p => ({ ...p, region: v, city: '' })); }
    else if (field === 'phone') { setFormData(p => ({ ...p, phone: v.replace(/\D/g, '').slice(0, 9) })); }
    else { setFormData(p => ({ ...p, [field]: v })); }
  };

  const handleDoc = (key: DocKey, file: File | null) => setDocFiles(p => ({ ...p, [key]: file }));

  // ── absolute minimum across all types
  const ABS_MIN_CAPITAL = 50_000_000;
  const minCapital = Math.max(
    ABS_MIN_CAPITAL,
    formData.exporterType === 'private' ? 50_000_000
      : formData.exporterType === 'company' ? 50_000_000
      : formData.exporterType === 'individual' ? 50_000_000 : ABS_MIN_CAPITAL
  );

  const validate = (): string | null => {
    if (!formData.companyName.trim())           return 'Company name is required';
    if (!formData.tinNumber.trim())             return 'TIN number is required';
    if (!docFiles.tinDoc)                       return 'Please upload your TIN Certificate';
    if (!formData.businessLicenseNumber.trim()) return 'Business license number is required';
    if (!docFiles.businessLicenseDoc)           return 'Please upload your Business License';
    if (!formData.registrationDate)             return 'Registration date is required';
    if (!formData.exporterType)                 return 'Exporter type is required';
    if (!formData.capitalRequirement || Number(formData.capitalRequirement) <= 0)
      return 'Valid capital amount is required';
    if (Number(formData.capitalRequirement) < ABS_MIN_CAPITAL)
      return `Minimum capital requirement is ${ABS_MIN_CAPITAL.toLocaleString()} ETB`;
    if (!docFiles.bankStatementDoc)             return 'Please upload your Bank Statement';
    if (!formData.professionalTaster.trim())    return 'Professional taster name is required';
    if (!formData.tasterCertificate.trim())     return 'Taster certificate number is required';
    if (!docFiles.tasterCertDoc)                return 'Please upload your Taster Certificate';
    if (!formData.laboratoryFacility)           return 'Laboratory facility status is required';
    if (formData.laboratoryFacility !== 'farmer' && !docFiles.labCertDoc)
      return 'Please upload your Laboratory Certificate';
    if (!formData.contactPerson.trim())         return 'Contact person is required';
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      return 'Valid email address is required';
    if (!formData.phone || formData.phone.length !== 9)
      return 'Phone number must be exactly 9 digits after +251';
    if (!formData.address.trim())              return 'Physical address is required';
    if (!formData.region)                      return 'Region is required';
    if (!formData.city)                        return 'City is required';
    return null;
  };

  const handleReview = () => {
    setDocsTouched(true);
    const err = validate();
    if (err) { setError(err); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setError('');
    setMode('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.post('/exporters/exporter-applications', {
        ...formData, phone: `+251${formData.phone}`, documents: [],
      });
      if (!res.data.success) throw new Error(res.data.error?.message || 'Submission failed');
      const appId = res.data.data.applicationId;
      await Promise.all(
        (Object.entries(docFiles) as [DocKey, File | null][]).filter(([, f]) => !!f).map(async ([key, f]) => {
          const fd = new FormData();
          fd.append('file', f!); fd.append('fileName', f!.name);
          fd.append('documentType', key.toUpperCase()); fd.append('encrypt', 'true');
          fd.append('entityType', 'EXPORTER_APPLICATION'); fd.append('entityId', appId);
          await fetch('http://localhost:3001/api/v1/documents/upload-registration', { method: 'POST', body: fd });
        })
      );
      setMode('success');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ══════════════════════════════════════════════════════════════
  // SUCCESS
  // ══════════════════════════════════════════════════════════════

  if (mode === 'success') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', background: 'linear-gradient(135deg,#f5f5f5 0%,#ede7f6 100%)', position: 'relative', overflow: 'hidden' }}>
        <BgBlobs />
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Zoom in timeout={700}>
            <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', background: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}>
              <Box sx={{ height: 5, background: `linear-gradient(90deg,${C.purple},${C.gold})` }} />
              <Box sx={{ p: { xs: 4, md: 6 }, textAlign: 'center' }}>
                <Box sx={{ width: 80, height: 80, borderRadius: '50%', background: `linear-gradient(135deg,${C.gold} 0%,#FFC700 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', mb: 3, boxShadow: '0 8px 24px rgba(255,215,0,0.3)' }}>
                  <CheckCircle sx={{ fontSize: 48, color: C.purple }} />
                </Box>
                <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: '#1a1a1a', letterSpacing: '-0.5px' }}>Application Submitted!</Typography>
                <Typography variant="body1" sx={{ color: '#616161', mb: 3, maxWidth: 480, mx: 'auto' }}>
                  Your application has been sent to ECTA for review. You'll receive an email with next steps.
                </Typography>
                <Chip label={`Application ID: APP-${Date.now().toString().slice(-8)}`} sx={{ mb: 4, fontWeight: 600, bgcolor: alpha(C.purple, 0.1), color: C.purple, fontSize: '0.875rem', px: 2, py: 2.5 }} />
                <Divider sx={{ my: 3 }} />
                <Grid container spacing={2} sx={{ mb: 4 }}>
                  {[
                    { n: 1, t: 'Document Verification', d: 'ECTA verifies submitted documents', tag: '2–3 business days' },
                    { n: 2, t: 'Site Inspection', d: 'Facility visit if required', tag: 'If required' },
                    { n: 3, t: 'License Issuance', d: 'ECTA export license upon approval', tag: 'Final step' },
                  ].map(s => (
                    <Grid item xs={12} md={4} key={s.n}>
                      <Paper elevation={0} sx={{ p: 2.5, height: '100%', background: alpha(C.purple, 0.04), border: `1px solid ${alpha(C.purple, 0.15)}`, borderRadius: 2 }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: C.purple, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, mb: 1.5, fontSize: '0.85rem' }}>{s.n}</Box>
                        <Typography variant="body2" fontWeight={600} gutterBottom sx={{ color: '#1a1a1a' }}>{s.t}</Typography>
                        <Typography variant="caption" sx={{ color: '#616161', display: 'block', mb: 1 }}>{s.d}</Typography>
                        <Chip label={s.tag} size="small" sx={{ bgcolor: alpha(C.gold, 0.25), color: C.purple, fontWeight: 600, fontSize: '0.7rem' }} />
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
                  <Button variant="contained" size="large" onClick={() => router.push('/')} sx={{ ...btnSx, background: purpleGrad, boxShadow: `0 4px 12px ${alpha(C.purple, 0.3)}`, '&:hover': { background: `linear-gradient(135deg,${C.purpleDark} 0%,${C.purpleDarker} 100%)` } }}>Go to Home</Button>
                  <Button variant="outlined" size="large" onClick={() => window.location.reload()} sx={{ ...btnSx, borderColor: C.gold, color: C.purple, borderWidth: 2, '&:hover': { borderWidth: 2, borderColor: C.gold, bgcolor: alpha(C.gold, 0.08) } }}>Submit Another</Button>
                </Stack>
              </Box>
            </Paper>
          </Zoom>
        </Container>
      </Box>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // REVIEW
  // ══════════════════════════════════════════════════════════════

  if (mode === 'review') {
    const typeLabel = formData.exporterType === 'private' ? 'Private Exporter'
      : formData.exporterType === 'company' ? 'Trade Association / Company'
      : formData.exporterType === 'individual' ? 'Individual (Competency Certificate)' : formData.exporterType;
    const labLabel = formData.laboratoryFacility === 'yes' ? 'Own Laboratory'
      : formData.laboratoryFacility === 'contracted' ? 'Contracted Laboratory' : 'Farmer Exporter (Exempt)';

    const reviewSections = [
      {
        title: 'Company Information', icon: <Business />, color: C.purple,
        rows: [
          ['Company Name', formData.companyName], ['TIN Number', formData.tinNumber],
          ['Business License', formData.businessLicenseNumber], ['Registration Date', formData.registrationDate],
        ],
      },
      {
        title: 'ECTA Requirements', icon: <VerifiedUser />, color: C.green,
        rows: [
          ['Exporter Type', typeLabel],
          ['Capital', `${Number(formData.capitalRequirement).toLocaleString()} ETB`],
          ['Professional Taster', formData.professionalTaster],
          ['Taster Certificate', formData.tasterCertificate],
          ['Laboratory', labLabel],
          ...(formData.laboratoryCertificateNumber ? [['Lab Certificate No.', formData.laboratoryCertificateNumber] as [string,string]] : []),
        ],
      },
      {
        title: 'Contact Details', icon: <Person />, color: C.blue,
        rows: [
          ['Contact Person', formData.contactPerson], ['Email', formData.email],
          ['Phone', `+251 ${formData.phone}`], ['Address', formData.address],
          ['Region', formData.region], ['City', formData.city],
          ...(formData.bankName ? [['Bank', formData.bankName] as [string,string]] : []),
          ...(formData.bankAccountNumber ? [['Account No.', formData.bankAccountNumber] as [string,string]] : []),
          ...(formData.bankBranchName ? [['Branch', `${formData.bankBranchName}${formData.bankBranchCode ? ` (${formData.bankBranchCode})` : ''}`] as [string,string]] : []),
        ],
      },
    ];

    const uploadedDocs = (Object.entries(docFiles) as [DocKey, File | null][]).filter(([, f]) => !!f);

    return (
      <>
        <Head><title>Review Application – CECBS</title></Head>
        <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg,#f5f5f5 0%,#ede7f6 100%)', position: 'relative', py: 4 }}>
          <BgBlobs />
          <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
            <Fade in timeout={400}>
              <Box>
                {/* Header */}
                <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                  <Box sx={{ width: 48, height: 48, borderRadius: 2, background: purpleGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 16px ${alpha(C.purple, 0.3)}` }}>
                    <Coffee sx={{ fontSize: 28, color: C.gold }} />
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight={700} sx={{ color: '#1a1a1a', lineHeight: 1.2 }}>Review Your Application</Typography>
                    <Typography variant="caption" sx={{ color: '#616161' }}>Verify all details before submitting</Typography>
                  </Box>
                </Stack>

                {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                {/* Info sections */}
                {reviewSections.map(sec => (
                  <Paper key={sec.title} elevation={0} sx={{ mb: 2.5, borderRadius: 2.5, overflow: 'hidden', border: `1px solid ${alpha(sec.color, 0.2)}`, boxShadow: `0 2px 12px ${alpha(sec.color, 0.08)}` }}>
                    <Box sx={{ px: 3, py: 1.5, background: alpha(sec.color, 0.06), borderBottom: `1px solid ${alpha(sec.color, 0.12)}` }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ color: sec.color, display: 'flex' }}>{React.cloneElement(sec.icon as React.ReactElement, { sx: { fontSize: 18 } })}</Box>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ color: sec.color }}>{sec.title}</Typography>
                      </Stack>
                    </Box>
                    <Box sx={{ px: 3, py: 2 }}>
                      <Grid container spacing={1.5}>
                        {sec.rows.map(([label, value]) => (
                          <Grid item xs={12} sm={6} key={label}>
                            <Typography variant="caption" sx={{ color: '#9e9e9e', display: 'block', mb: 0.2 }}>{label}</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ color: '#1a1a1a' }}>{value || '—'}</Typography>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Paper>
                ))}

                {/* Documents */}
                <Paper elevation={0} sx={{ mb: 3, borderRadius: 2.5, overflow: 'hidden', border: `1px solid ${alpha(C.teal, 0.2)}`, boxShadow: `0 2px 12px ${alpha(C.teal, 0.08)}` }}>
                  <Box sx={{ px: 3, py: 1.5, background: alpha(C.teal, 0.06), borderBottom: `1px solid ${alpha(C.teal, 0.12)}` }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CloudUpload sx={{ fontSize: 18, color: C.teal }} />
                      <Typography variant="subtitle2" fontWeight={700} sx={{ color: C.teal }}>Uploaded Documents</Typography>
                      <Chip label={`${uploadedDocs.length} file${uploadedDocs.length !== 1 ? 's' : ''}`} size="small" sx={{ bgcolor: alpha(C.teal, 0.12), color: C.teal, fontWeight: 700 }} />
                    </Stack>
                  </Box>
                  <Box sx={{ px: 3, py: 2 }}>
                    {uploadedDocs.length === 0
                      ? <Alert severity="warning">No documents uploaded.</Alert>
                      : (
                        <Grid container spacing={1}>
                          {uploadedDocs.map(([key, f]) => (
                            <Grid item xs={12} sm={6} key={key}>
                              <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 0.5 }}>
                                <CheckCircle sx={{ fontSize: 15, color: C.teal }} />
                                <Box minWidth={0}>
                                  <Typography variant="caption" fontWeight={700} sx={{ color: '#1a1a1a', textTransform: 'capitalize' }}>
                                    {key.replace(/Doc$/, '').replace(/([A-Z])/g, ' $1').trim()}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#9e9e9e', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {f!.name}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Grid>
                          ))}
                        </Grid>
                      )
                    }
                  </Box>
                </Paper>

                {/* Buttons */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end">
                  <Button variant="outlined" size="large" startIcon={<Edit />} onClick={() => { setMode('form'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    sx={{ ...btnSx, borderColor: alpha(C.purple, 0.4), color: C.purple, borderWidth: 2, '&:hover': { borderWidth: 2, borderColor: C.purple, bgcolor: alpha(C.purple, 0.05) } }}>
                    Edit Application
                  </Button>
                  <Button variant="contained" size="large" startIcon={<Send />} onClick={handleSubmit} disabled={loading}
                    sx={{ ...btnSx, background: purpleGrad, boxShadow: `0 4px 16px ${alpha(C.purple, 0.35)}`, '&:hover': { background: `linear-gradient(135deg,${C.purpleDark} 0%,${C.purpleDarker} 100%)`, boxShadow: `0 6px 20px ${alpha(C.purple, 0.45)}` }, '&:disabled': { opacity: 0.6 } }}>
                    {loading ? 'Submitting…' : 'Submit Application'}
                  </Button>
                </Stack>
              </Box>
            </Fade>
          </Container>
        </Box>
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // FORM
  // ══════════════════════════════════════════════════════════════

  return (
    <>
      <Head>
        <title>Register as Coffee Exporter – CECBS</title>
        <meta name="description" content="Apply for coffee export license – ECTA 2026" />
      </Head>

      <Box sx={{ minHeight: '100vh', display: 'flex', background: 'linear-gradient(135deg,#f5f5f5 0%,#ede7f6 100%)', position: 'relative', overflow: 'hidden' }}>
        <BgBlobs />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, py: 2 }}>
          <Grid container alignItems="stretch" sx={{ minHeight: '100vh' }}>

            {/* ── Left panel ── */}
            <Grid item xs={12} lg={4} sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', py: 4 }}>
              <Fade in={mounted} timeout={1000}>
                <Box sx={{ width: '100%', px: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                    <Box sx={{ width: 52, height: 52, borderRadius: 2, background: purpleGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${alpha(C.purple, 0.3)}` }}>
                      <Coffee sx={{ fontSize: 30, color: C.gold }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={700} sx={{ color: '#1a1a1a', lineHeight: 1.2 }}>Coffee Exporter</Typography>
                      <Typography variant="h6" fontWeight={700} sx={{ color: C.purple }}>Registration</Typography>
                    </Box>
                  </Stack>
                  <Typography variant="h4" fontWeight={700} sx={{ mb: 2, color: '#1a1a1a', letterSpacing: '-1px' }}>
                    Join Ethiopia's Leading<br />
                    <span style={{ color: C.purple }}>Coffee Export Platform</span>
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 3, color: '#616161', lineHeight: 1.8 }}>
                    Become part of the blockchain-powered coffee export ecosystem. Get your ECTA license and access regulated, transparent trade operations.
                  </Typography>
                  <Paper elevation={0} sx={{ p: 2.5, mb: 2.5, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', border: `1px solid ${alpha(C.purple, 0.2)}`, borderRadius: 2 }}>
                    <Typography variant="body2" fontWeight={700} gutterBottom sx={{ color: '#1a1a1a' }}>📋 ECTA Requirements (2026)</Typography>
                    <List dense sx={{ '& .MuiListItem-root': { py: 0.3 } }}>
                      {['Min. Capital: 10M–20M ETB','Professional Taster (Certified)','ECTA-Certified Laboratory','Valid TIN & Business License'].map(t => (
                        <ListItem key={t} disableGutters>
                          <ListItemIcon sx={{ minWidth: 20 }}><CheckCircle sx={{ fontSize: 13, color: C.purple }} /></ListItemIcon>
                          <ListItemText primaryTypographyProps={{ variant: 'caption', color: '#616161' }} primary={t} />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                  <Paper elevation={0} sx={{ p: 2.5, background: purpleGrad, borderRadius: 2, color: 'white' }}>
                    <Typography variant="body2" fontWeight={700} gutterBottom>⚡ Fast Processing</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mb: 1.5 }}>Applications reviewed within 2–3 business days</Typography>
                    <Stack direction="row" spacing={1}>
                      <Chip label="2–3 Days" size="small" sx={{ bgcolor: C.gold, color: C.purple, fontWeight: 700 }} />
                      <Chip label="EUDR Ready" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }} />
                    </Stack>
                  </Paper>
                </Box>
              </Fade>
            </Grid>

            {/* ── Right panel — scrollable form ── */}
            <Grid item xs={12} lg={8} sx={{ background: 'white', display: 'flex', alignItems: 'flex-start' }}>
              <Zoom in={mounted} timeout={800}>
                <Box sx={{ width: '100%', px: { xs: 3, md: 5 }, py: 4, maxHeight: '100vh', overflowY: 'auto' }}>

                  {/* Top bar */}
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ height: 4, borderRadius: 2, background: `linear-gradient(90deg,${C.purple},${C.gold})`, mb: 2 }} />
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6" fontWeight={700} sx={{ color: '#1a1a1a' }}>New Exporter Application</Typography>
                      <Chip label="ECTA 2026" size="small" sx={{ bgcolor: alpha(C.purple, 0.1), color: C.purple, fontWeight: 700 }} />
                    </Stack>
                  </Box>

                  {error && (
                    <Fade in={!!error}>
                      <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>
                    </Fade>
                  )}

                  {/* ══ 1. Company Information ══ */}
                  <SectionHeader icon={<Business />} color={C.purple} title="Company Information" subtitle="Basic details about your business" />

                  <Grid container spacing={2} sx={{ mb: 4 }}>

                    {/* Company name */}
                    <Grid item xs={12} md={6}>
                      <TextField fullWidth required label="Company Name" value={formData.companyName} onChange={handleChange('companyName')} size="small"
                        InputProps={{ startAdornment: <InputAdornment position="start"><Business sx={{ color: C.purple, fontSize: 18 }} /></InputAdornment> }} />
                    </Grid>

                    {/* TIN number — upload button lives inside the field */}
                    <Grid item xs={12} md={6}>
                      <TextField fullWidth required label="TIN Number" value={formData.tinNumber} onChange={handleChange('tinNumber')} size="small"
                        error={docsTouched && !docFiles.tinDoc}
                        helperText={docsTouched && !docFiles.tinDoc ? 'TIN certificate upload required' : 'Tax Identification Number'}
                        InputProps={{
                          endAdornment: <UploadAdornment docKey="tinDoc" file={docFiles.tinDoc} color={C.purple} touched={docsTouched && !docFiles.tinDoc} onChange={handleDoc} />,
                        }} />
                    </Grid>

                    {/* Business license number — upload inside field */}
                    <Grid item xs={12} md={6}>
                      <TextField fullWidth required label="Business License Number" value={formData.businessLicenseNumber} onChange={handleChange('businessLicenseNumber')} size="small"
                        error={docsTouched && !docFiles.businessLicenseDoc}
                        helperText={docsTouched && !docFiles.businessLicenseDoc ? 'Business license upload required' : ''}
                        InputProps={{
                          endAdornment: <UploadAdornment docKey="businessLicenseDoc" file={docFiles.businessLicenseDoc} color={C.green} touched={docsTouched && !docFiles.businessLicenseDoc} onChange={handleDoc} />,
                        }} />
                    </Grid>

                    {/* Registration date */}
                    <Grid item xs={12} md={6}>
                      <TextField fullWidth required type="date" label="Registration Date" value={formData.registrationDate} onChange={handleChange('registrationDate')} InputLabelProps={{ shrink: true }} size="small" />
                    </Grid>

                  </Grid>

                  {/* ══ 2. ECTA Requirements ══ */}
                  <SectionHeader icon={<VerifiedUser />} color={C.green} title="ECTA Requirements" subtitle="As per Directive 1106/2025 (Effective 2026)" />

                  <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                    <Typography variant="caption" fontWeight={700}>Minimum Capital Requirements:</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" mt={0.5}>
                      <Chip label="All types: minimum 50,000,000 ETB" size="small" sx={{ bgcolor: alpha(C.green, 0.1), color: C.green, fontWeight: 600, fontSize: '0.7rem' }} />
                    </Stack>
                  </Alert>

                  <Grid container spacing={2} sx={{ mb: 4 }}>

                    <Grid item xs={12}>
                      <TextField fullWidth select required label="Exporter Type" value={formData.exporterType} onChange={handleChange('exporterType')} size="small" helperText="Select your business structure">
                        <MenuItem value="">Select Type</MenuItem>
                        <MenuItem value="private">Private Exporter (min. 15,000,000 ETB)</MenuItem>
                        <MenuItem value="company">Trade Association / Company (min. 20,000,000 ETB)</MenuItem>
                        <MenuItem value="individual">Individual — Competency Certificate (min. 10,000,000 ETB)</MenuItem>
                      </TextField>
                    </Grid>

                    {/* Capital + bank statement upload inside the field */}
                    <Grid item xs={12} md={6}>
                      <TextField fullWidth required type="number" label="Capital Requirement (ETB)" value={formData.capitalRequirement} onChange={handleChange('capitalRequirement')} size="small"
                        error={
                          (!!formData.capitalRequirement && Number(formData.capitalRequirement) < 50_000_000) ||
                          (docsTouched && !docFiles.bankStatementDoc)
                        }
                        helperText={
                          formData.capitalRequirement && Number(formData.capitalRequirement) < 50_000_000
                            ? 'Minimum is 50,000,000 ETB'
                            : docsTouched && !docFiles.bankStatementDoc
                            ? 'Bank statement upload required'
                            : 'Minimum: 50,000,000 ETB'
                        }
                        inputProps={{ min: 50_000_000 }}
                        InputProps={{
                          startAdornment: <InputAdornment position="start"><AttachMoney sx={{ color: C.green, fontSize: 18 }} /></InputAdornment>,
                          endAdornment: <UploadAdornment docKey="bankStatementDoc" file={docFiles.bankStatementDoc} color={C.blue} touched={docsTouched && !docFiles.bankStatementDoc} onChange={handleDoc} />,
                        }} />
                    </Grid>

                    {/* Professional taster */}
                    <Grid item xs={12} md={6}>
                      <TextField fullWidth required label="Professional Taster Name" value={formData.professionalTaster} onChange={handleChange('professionalTaster')} size="small"
                        InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ color: C.green, fontSize: 18 }} /></InputAdornment> }}
                        helperText="Must hold at least a diploma" />
                    </Grid>

                    {/* Taster certificate + upload inside field */}
                    <Grid item xs={12} md={6}>
                      <TextField fullWidth required label="Taster Proficiency Certificate No." value={formData.tasterCertificate} onChange={handleChange('tasterCertificate')} size="small"
                        error={docsTouched && !docFiles.tasterCertDoc}
                        helperText={docsTouched && !docFiles.tasterCertDoc ? 'Taster certificate upload required' : 'Renewed / valid certificate number'}
                        InputProps={{
                          startAdornment: <InputAdornment position="start"><Description sx={{ color: C.green, fontSize: 18 }} /></InputAdornment>,
                          endAdornment: <UploadAdornment docKey="tasterCertDoc" file={docFiles.tasterCertDoc} color={C.orange} touched={docsTouched && !docFiles.tasterCertDoc} onChange={handleDoc} />,
                        }} />
                    </Grid>

                    {/* Laboratory facility */}
                    <Grid item xs={12} md={6}>
                      <TextField fullWidth required select label="ECTA-Certified Laboratory" value={formData.laboratoryFacility} onChange={handleChange('laboratoryFacility')} size="small" helperText="Mandatory for basic quality testing">
                        <MenuItem value="">Select</MenuItem>
                        <MenuItem value="yes">Yes – Own Laboratory</MenuItem>
                        <MenuItem value="contracted">Yes – Contracted Laboratory</MenuItem>
                        <MenuItem value="farmer">N/A – Farmer Exporter (Exempt)</MenuItem>
                      </TextField>
                    </Grid>

                    {/* Lab certificate number + upload (only shown when lab is selected, not for farmer) */}
                    {formData.laboratoryFacility && formData.laboratoryFacility !== 'farmer' && (
                      <Grid item xs={12} md={6}>
                        <TextField fullWidth label="Laboratory Certificate Number" value={formData.laboratoryCertificateNumber} onChange={handleChange('laboratoryCertificateNumber')} size="small"
                          error={docsTouched && !docFiles.labCertDoc}
                          helperText={docsTouched && !docFiles.labCertDoc ? 'Lab certificate upload required' : 'ECTA-certified lab certificate number'}
                          InputProps={{
                            endAdornment: <UploadAdornment docKey="labCertDoc" file={docFiles.labCertDoc} color={C.teal} touched={docsTouched && !docFiles.labCertDoc} onChange={handleDoc} />,
                          }} />
                      </Grid>
                    )}

                  </Grid>

                  {/* ══ 3. Company History (standalone optional upload) ══ */}
                  <SectionHeader icon={<HistoryEdu />} color={C.indigo} title="Company History" subtitle="Optional — trade references or business history" />
                  <Box sx={{ mb: 4 }}>
                    <HistoryUpload file={docFiles.historyDoc} onChange={handleDoc} />
                  </Box>

                  {/* ══ 4. Contact Details ══ */}
                  <SectionHeader icon={<Person />} color={C.blue} title="Contact Details" subtitle="How ECTA will reach you regarding your application" />

                  <Grid container spacing={2} sx={{ mb: 4 }}>

                    <Grid item xs={12} md={6}>
                      <TextField fullWidth required label="Contact Person" value={formData.contactPerson} onChange={handleChange('contactPerson')} size="small"
                        InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ color: C.blue, fontSize: 18 }} /></InputAdornment> }} />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField fullWidth required type="email" label="Email Address" value={formData.email} onChange={handleChange('email')} size="small"
                        InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ color: C.blue, fontSize: 18 }} /></InputAdornment> }} />
                    </Grid>

                    {/* Phone — Ethiopia code prefix */}
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth required label="Phone Number" value={formData.phone} onChange={handleChange('phone')} size="small"
                        inputProps={{ maxLength: 9, inputMode: 'numeric', pattern: '[0-9]*' }}
                        helperText={`${formData.phone.length}/9 digits after +251`}
                        error={formData.phone.length > 0 && formData.phone.length !== 9}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pr: 1, borderRight: `2px solid ${alpha(C.blue, 0.2)}`, mr: 0.5 }}>
                                <Typography sx={{ fontSize: '1.1rem', lineHeight: 1 }}>🇪🇹</Typography>
                                <Typography variant="body2" fontWeight={700} sx={{ color: C.blue, fontSize: '0.8rem' }}>+251</Typography>
                              </Box>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField fullWidth required label="Physical Address" value={formData.address} onChange={handleChange('address')} size="small" multiline rows={2} placeholder="Street address, building name, floor…"
                        InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn sx={{ color: C.blue, fontSize: 18 }} /></InputAdornment> }} />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField fullWidth required select label="Region" value={formData.region} onChange={handleChange('region')} size="small" helperText="Select region first">
                        <MenuItem value="">Select Region</MenuItem>
                        {ETHIOPIAN_REGIONS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                      </TextField>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField fullWidth required select label="City" value={formData.city} onChange={handleChange('city')} disabled={!formData.region} size="small"
                        helperText={formData.region ? `Cities in ${formData.region}` : 'Select region first'}>
                        <MenuItem value="">Select City</MenuItem>
                        {(CITIES_BY_REGION[formData.region] || []).map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                      </TextField>
                    </Grid>

                    <Grid item xs={12}>
                      <Divider sx={{ my: 0.5 }}><Typography variant="caption" sx={{ color: '#9e9e9e' }}>Banking Information</Typography></Divider>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <BankSelect value={formData.bankName} onChange={v => setFormData(p => ({ ...p, bankName: v, bankBranchName: '', bankBranchCode: '' }))} label="Bank Name" helperText="Bank holding your export account" type="ethiopian" />
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <TextField fullWidth label="Bank Account Number" value={formData.bankAccountNumber} onChange={handleChange('bankAccountNumber')} size="small"
                        InputProps={{ startAdornment: <InputAdornment position="start"><AccountBalance sx={{ color: C.blue, fontSize: 18 }} /></InputAdornment> }} />
                    </Grid>

                    <Grid item xs={12}>
                      <BankBranchSelect bankName={formData.bankName} value={formData.bankBranchName} onChange={(bName, b) => setFormData(p => ({ ...p, bankBranchName: bName, bankBranchCode: b?.branchCode || '' }))} label="Bank Branch" helperText="Used for LC processing" showDetails />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField fullWidth label="Additional Comments" value={formData.comments} onChange={handleChange('comments')} multiline rows={2} size="small" placeholder="Any additional information…" />
                    </Grid>

                  </Grid>

                  {/* ══ Review button ══ */}
                  <Box sx={{ pt: 1, pb: 4 }}>
                    <Button fullWidth variant="contained" size="large" endIcon={<ArrowForward />} onClick={handleReview}
                      sx={{
                        ...btnSx, background: purpleGrad, fontSize: '1rem', py: 1.8,
                        boxShadow: `0 6px 20px ${alpha(C.purple, 0.35)}`,
                        '&:hover': { background: `linear-gradient(135deg,${C.purpleDark} 0%,${C.purpleDarker} 100%)`, boxShadow: `0 8px 24px ${alpha(C.purple, 0.45)}` },
                      }}>
                      Review Application
                    </Button>
                    <Typography variant="caption" display="block" textAlign="center" sx={{ color: '#9e9e9e', mt: 2 }}>
                      © 2026 Ethiopian Coffee &amp; Tea Authority (ECTA)
                    </Typography>
                  </Box>

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
