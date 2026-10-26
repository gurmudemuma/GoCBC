// Document Examination Panel for Banks
// UCP 600 Compliant Document Review Interface

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  TextField,
  Alert,
  Chip,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Warning,
  Description,
  CloudUpload,
} from '@mui/icons-material';

interface DocumentCheck {
  documentType: string;
  required: boolean;
  present: boolean;
  compliant: boolean;
  discrepancies: string;
}

interface DocumentExaminationPanelProps {
  open: boolean;
  lc: any;
  documents: any[];
  onClose: () => void;
  onAccept: (lcId: string, comments: string, checks: DocumentCheck[]) => void;
  onReject: (lcId: string, reason: string, checks: DocumentCheck[]) => void;
}

const REQUIRED_DOCUMENTS = [
  { type: 'Commercial Invoice', required: true, description: 'Original commercial invoice' },
  { type: 'Bill of Lading', required: true, description: 'Original B/L or Air Waybill' },
  { type: 'Certificate of Origin', required: true, description: 'Ethiopian Chamber of Commerce' },
  { type: 'Phytosanitary Certificate', required: true, description: 'Ministry of Agriculture' },
  { type: 'Quality Certificate', required: true, description: 'ECX/ECTA Quality Certification' },
  { type: 'Packing List', required: true, description: 'Detailed packing list' },
  { type: 'Insurance Certificate', required: false, description: 'If required by LC terms' },
  { type: 'Weight Certificate', required: false, description: 'If required by LC terms' },
];

export const DocumentExaminationPanel: React.FC<DocumentExaminationPanelProps> = ({
  open,
  lc,
  documents,
  onClose,
  onAccept,
  onReject,
}) => {
  const [documentChecks, setDocumentChecks] = useState<DocumentCheck[]>(
    REQUIRED_DOCUMENTS.map(doc => ({
      documentType: doc.type,
      required: doc.required,
      present: false,
      compliant: false,
      discrepancies: '',
    }))
  );
  const [examinerComments, setExaminerComments] = useState('');
  const [decision, setDecision] = useState<'ACCEPT' | 'REJECT' | null>(null);

  const handleCheckChange = (index: number, field: 'present' | 'compliant', value: boolean) => {
    const updated = [...documentChecks];
    updated[index][field] = value;
    setDocumentChecks(updated);
  };

  const handleDiscrepancyChange = (index: number, value: string) => {
    const updated = [...documentChecks];
    updated[index].discrepancies = value;
    setDocumentChecks(updated);
  };

  const allRequiredDocsPresent = documentChecks
    .filter(doc => doc.required)
    .every(doc => doc.present);

  const allDocsCompliant = documentChecks
    .filter(doc => doc.present)
    .every(doc => doc.compliant);

  const hasDiscrepancies = documentChecks.some(doc => doc.discrepancies.length > 0);

  const handleAccept = () => {
    if (!allRequiredDocsPresent) {
      alert('All required documents must be present before accepting.');
      return;
    }
    if (!allDocsCompliant) {
      alert('All present documents must be compliant before accepting.');
      return;
    }
    onAccept(lc.lcId, examinerComments, documentChecks);
    resetForm();
  };

  const handleReject = () => {
    if (!examinerComments.trim()) {
      alert('Please provide rejection reason in comments.');
      return;
    }
    onReject(lc.lcId, examinerComments, documentChecks);
    resetForm();
  };

  const resetForm = () => {
    setDocumentChecks(
      REQUIRED_DOCUMENTS.map(doc => ({
        documentType: doc.type,
        required: doc.required,
        present: false,
        compliant: false,
        discrepancies: '',
      }))
    );
    setExaminerComments('');
    setDecision(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" fontWeight={600}>
            Document Examination - LC {lc?.lcId}
          </Typography>
          <Chip
            label="UCP 600"
            size="small"
            color="primary"
            sx={{ bgcolor: '#9b30b7' }}
          />
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>UCP 600 Article 14:</strong> Examine documents within 5 banking days. Check for strict compliance with LC terms.
        </Alert>

        {/* LC Summary */}
        <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">LC Amount</Typography>
              <Typography variant="body2" fontWeight={600}>
                {lc?.currency} {lc?.amount?.toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">Beneficiary</Typography>
              <Typography variant="body2" fontWeight={600}>{lc?.exporterId}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">Expiry Date</Typography>
              <Typography variant="body2" fontWeight={600}>
                {lc?.expiryDate ? new Date(lc.expiryDate).toLocaleDateString() : 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">Shipping Terms</Typography>
              <Typography variant="body2" fontWeight={600}>{lc?.paymentTerms || 'Sight LC'}</Typography>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Document Checklist */}
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Document Compliance Checklist
        </Typography>

        <List>
          {REQUIRED_DOCUMENTS.map((doc, index) => (
            <ListItem key={doc.type} sx={{ flexDirection: 'column', alignItems: 'stretch', borderBottom: '1px solid #eee' }}>
              <Box display="flex" alignItems="center" width="100%">
                <ListItemIcon>
                  {documentChecks[index].present && documentChecks[index].compliant ? (
                    <CheckCircle color="success" />
                  ) : documentChecks[index].discrepancies ? (
                    <Warning color="warning" />
                  ) : (
                    <Description color="disabled" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography fontWeight={600}>{doc.type}</Typography>
                      {doc.required && <Chip label="Required" size="small" color="error" />}
                    </Box>
                  }
                  secondary={doc.description}
                />
              </Box>
              
              <Box sx={{ ml: 7, mt: 1, mb: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={documentChecks[index].present}
                      onChange={(e) => handleCheckChange(index, 'present', e.target.checked)}
                    />
                  }
                  label="Document Present"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={documentChecks[index].compliant}
                      onChange={(e) => handleCheckChange(index, 'compliant', e.target.checked)}
                      disabled={!documentChecks[index].present}
                    />
                  }
                  label="Compliant with LC Terms"
                />
                
                {documentChecks[index].present && (
                  <TextField
                    fullWidth
                    size="small"
                    label="Discrepancies (if any)"
                    placeholder="Describe any discrepancies found..."
                    value={documentChecks[index].discrepancies}
                    onChange={(e) => handleDiscrepancyChange(index, e.target.value)}
                    sx={{ mt: 1 }}
                    multiline
                    rows={2}
                  />
                )}
              </Box>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        {/* Examiner Comments */}
        <TextField
          fullWidth
          label="Examiner Comments"
          placeholder="Overall assessment and findings..."
          value={examinerComments}
          onChange={(e) => setExaminerComments(e.target.value)}
          multiline
          rows={3}
          required
        />

        {/* Status Summary */}
        <Box sx={{ mt: 3, p: 2, bgcolor: hasDiscrepancies ? '#fff3e0' : allDocsCompliant ? '#e8f5e9' : '#f5f5f5', borderRadius: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Typography variant="caption" color="textSecondary">Required Docs</Typography>
              <Typography variant="body2" fontWeight={600}>
                {documentChecks.filter(d => d.required && d.present).length} / {documentChecks.filter(d => d.required).length}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption" color="textSecondary">Compliant</Typography>
              <Typography variant="body2" fontWeight={600}>
                {documentChecks.filter(d => d.present && d.compliant).length} / {documentChecks.filter(d => d.present).length}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption" color="textSecondary">Discrepancies</Typography>
              <Typography variant="body2" fontWeight={600} color={hasDiscrepancies ? 'error' : 'success'}>
                {documentChecks.filter(d => d.discrepancies).length}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<Cancel />}
          onClick={handleReject}
          disabled={!examinerComments.trim()}
        >
          Reject Documents
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<CheckCircle />}
          onClick={handleAccept}
          disabled={!allRequiredDocsPresent || !allDocsCompliant}
        >
          Accept Documents
        </Button>
      </DialogActions>
    </Dialog>
  );
};
