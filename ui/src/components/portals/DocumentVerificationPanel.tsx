/**
 * Document Verification Panel for Bank Portal
 * Allows banks to review and verify submitted payment documents
 * UCP 600 Article 14 Compliance: 5 banking days for document examination
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  TextField,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  LinearProgress,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Visibility,
  Description,
  Warning,
  Info,
  AccessTime,
  Download,
  Comment,
} from '@mui/icons-material';

interface DocumentVerificationPanelProps {
  open: boolean;
  paymentId: string;
  paymentData: any;
  onClose: () => void;
  onVerify: (approved: boolean, comments: string, checklist: DocumentChecklist) => Promise<void>;
}

interface DocumentChecklist {
  billOfLading: boolean;
  commercialInvoice: boolean;
  packingList: boolean;
  certificateOfOrigin: boolean;
  insuranceCertificate: boolean;
  inspectionCertificate: boolean;
  phytosanitaryCertificate: boolean;
  [key: string]: boolean;
}

export const DocumentVerificationPanel: React.FC<DocumentVerificationPanelProps> = ({
  open,
  paymentId,
  paymentData,
  onClose,
  onVerify,
}) => {
  const [checklist, setChecklist] = useState<DocumentChecklist>({
    billOfLading: false,
    commercialInvoice: false,
    packingList: false,
    certificateOfOrigin: false,
    insuranceCertificate: false,
    inspectionCertificate: false,
    phytosanitaryCertificate: false,
  });

  const [comments, setComments] = useState('');
  const [discrepancies, setDiscrepancies] = useState<string[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [examinationDaysRemaining, setExaminationDaysRemaining] = useState(5);

  useEffect(() => {
    if (paymentData && paymentData.submittedDate) {
      // Calculate days remaining for document examination (UCP 600: 5 banking days)
      const submitted = new Date(paymentData.submittedDate);
      const now = new Date();
      const daysPassed = Math.floor((now.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
      setExaminationDaysRemaining(Math.max(0, 5 - daysPassed));
    }
  }, [paymentData]);

  const requiredDocuments = [
    { key: 'billOfLading', label: 'Bill of Lading (B/L)', icon: <Description />, required: true },
    { key: 'commercialInvoice', label: 'Commercial Invoice', icon: <Description />, required: true },
    { key: 'packingList', label: 'Packing List', icon: <Description />, required: true },
    { key: 'certificateOfOrigin', label: 'Certificate of Origin', icon: <Description />, required: true },
    { key: 'insuranceCertificate', label: 'Insurance Certificate', icon: <Description />, required: false },
    { key: 'inspectionCertificate', label: 'Quality Inspection Certificate', icon: <Description />, required: true },
    { key: 'phytosanitaryCertificate', label: 'Phytosanitary Certificate', icon: <Description />, required: true },
  ];

  const handleCheckboxChange = (key: string) => {
    setChecklist({ ...checklist, [key]: !checklist[key] });
  };

  const addDiscrepancy = (discrepancy: string) => {
    if (discrepancy && !discrepancies.includes(discrepancy)) {
      setDiscrepancies([...discrepancies, discrepancy]);
    }
  };

  const removeDiscrepancy = (index: number) => {
    setDiscrepancies(discrepancies.filter((_, i) => i !== index));
  };

  const allRequiredChecked = requiredDocuments
    .filter(doc => doc.required)
    .every(doc => checklist[doc.key]);

  const completionPercentage = Math.round(
    (Object.values(checklist).filter(v => v).length / Object.keys(checklist).length) * 100
  );

  const handleApprove = async () => {
    if (!allRequiredChecked) {
      alert('All required documents must be checked before approval');
      return;
    }

    setVerifying(true);
    try {
      await onVerify(true, comments || 'Documents verified and compliant with LC terms', checklist);
    } finally {
      setVerifying(false);
    }
  };

  const handleReject = async () => {
    if (discrepancies.length === 0 && !comments) {
      alert('Please specify discrepancies or comments for rejection');
      return;
    }

    const rejectionComments = discrepancies.length > 0
      ? `DISCREPANCIES FOUND:\n${discrepancies.map((d, i) => `${i + 1}. ${d}`).join('\n')}\n\nComments: ${comments}`
      : comments;

    setVerifying(true);
    try {
      await onVerify(false, rejectionComments, checklist);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <Description sx={{ mr: 1, color: 'primary.main' }} />
            Document Verification - {paymentId}
          </Box>
          {examinationDaysRemaining <= 2 && (
            <Chip
              icon={<AccessTime />}
              label={`${examinationDaysRemaining} days remaining`}
              color={examinationDaysRemaining === 0 ? 'error' : 'warning'}
              size="small"
            />
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* UCP 600 Article 14 Notice */}
        <Alert severity="info" icon={<Info />} sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight={600}>
            UCP 600 Article 14: Document Examination
          </Typography>
          <Typography variant="caption">
            Banks have a maximum of 5 banking days following presentation to examine documents and determine compliance.
            If discrepant, provide detailed notice specifying all discrepancies.
          </Typography>
        </Alert>

        {/* Progress Bar */}
        <Box sx={{ mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Verification Progress
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {completionPercentage}%
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={completionPercentage} sx={{ height: 8, borderRadius: 1 }} />
        </Box>

        <Grid container spacing={3}>
          {/* Document Checklist */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Document Checklist
                </Typography>
                <List dense>
                  {requiredDocuments.map((doc, index) => (
                    <React.Fragment key={doc.key}>
                      <ListItem>
                        <ListItemIcon>{doc.icon}</ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center">
                              {doc.label}
                              {doc.required && (
                                <Chip label="Required" size="small" color="error" sx={{ ml: 1, height: 20 }} />
                              )}
                            </Box>
                          }
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={checklist[doc.key]}
                              onChange={() => handleCheckboxChange(doc.key)}
                              color="primary"
                            />
                          }
                          label={checklist[doc.key] ? 'Verified' : 'Pending'}
                        />
                      </ListItem>
                      {index < requiredDocuments.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Payment Details */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Payment Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Payment ID
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {paymentId}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Payment Method
                    </Typography>
                    <Chip
                      label={paymentData?.paymentMethod || 'LC'}
                      size="small"
                      color="primary"
                      sx={{ mt: 0.5 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Amount
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      ${paymentData?.amount?.toLocaleString()} {paymentData?.currency}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Exporter
                    </Typography>
                    <Typography variant="body2">
                      {paymentData?.exporterId}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Documents Submitted
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                      {paymentData?.documents?.map((doc: string, i: number) => (
                        <Chip key={i} label={doc} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Submitted Documents */}
            <Card variant="outlined" sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Submitted Documents ({paymentData?.documents?.length || 0})
                </Typography>
                {paymentData?.documents && paymentData.documents.length > 0 ? (
                  <List dense>
                    {paymentData.documents.map((doc: string, index: number) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Description color="action" />
                        </ListItemIcon>
                        <ListItemText primary={doc} />
                        <Tooltip title="View Document">
                          <IconButton size="small" color="primary">
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download">
                          <IconButton size="small" color="default">
                            <Download />
                          </IconButton>
                        </Tooltip>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Alert severity="warning">No documents submitted yet</Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Discrepancies */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Warning sx={{ mr: 1, verticalAlign: 'middle', color: 'warning.main' }} />
                  Document Discrepancies (UCP 600 Article 16)
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                  Specify all discrepancies if documents do not comply with LC terms
                </Typography>

                <Box display="flex" gap={1} mb={2}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Type discrepancy and press Enter"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addDiscrepancy((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </Box>

                <Paper variant="outlined" sx={{ p: 2, minHeight: 100, maxHeight: 200, overflowY: 'auto' }}>
                  {discrepancies.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      No discrepancies noted
                    </Typography>
                  ) : (
                    <List dense>
                      {discrepancies.map((disc, index) => (
                        <ListItem
                          key={index}
                          secondaryAction={
                            <IconButton edge="end" size="small" onClick={() => removeDiscrepancy(index)}>
                              <Cancel />
                            </IconButton>
                          }
                        >
                          <ListItemIcon>
                            <Warning color="warning" />
                          </ListItemIcon>
                          <ListItemText primary={`${index + 1}. ${disc}`} />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Paper>
              </CardContent>
            </Card>
          </Grid>

          {/* Comments */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Verification Comments"
              placeholder="Enter detailed comments about document examination..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              helperText="Provide detailed explanation of verification outcome"
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Box display="flex" justifyContent="space-between" width="100%">
          <Button onClick={onClose} disabled={verifying}>
            Cancel
          </Button>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Cancel />}
              onClick={handleReject}
              disabled={verifying}
            >
              Reject (Discrepant)
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
              onClick={handleApprove}
              disabled={!allRequiredChecked || verifying}
            >
              Approve (Compliant)
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentVerificationPanel;
