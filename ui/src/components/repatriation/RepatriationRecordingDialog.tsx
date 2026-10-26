import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import { apiFetch, getAuthHeaders } from '@/config/api.config';
import { useNotification } from '@/hooks/useNotification';

interface RepatriationRecord {
  repatriationId: string;
  paymentId: string;
  contractId: string;
  exporterId: string;
  exportAmount: number;
  currency: string;
  status: string;
  requiredRetention: number;
  requiredConversion: number;
  repatriatedAmount: number;
  convertedAmount: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const RepatriationRecordingDialog: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const { showSuccess, showError } = useNotification();
  const [records, setRecords] = useState<RepatriationRecord[]>([]);
  const [selected, setSelected] = useState<RepatriationRecord | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [repatriatedAmount, setRepatriatedAmount] = useState('');
  const [convertedAmount, setConvertedAmount] = useState('');
  const [swiftReference, setSwiftReference] = useState('');
  const [bankCertificate, setBankCertificate] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const response = await apiFetch('/repatriation', { method: 'GET', headers: getAuthHeaders() });
        const result = await response.json();
        if (!active) return;
        const eligible = (result.data || []).filter((item: RepatriationRecord) =>
          ['PENDING', 'PARTIAL', 'OVERDUE'].includes(String(item.status).toUpperCase())
        );
        setRecords(eligible);
      } catch (error) {
        if (active) showError('Error', 'Could not load repatriation records');
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchRecords();
    return () => { active = false; };
  }, [open]);

  useEffect(() => {
    if (!open || !selected) {
      setExchangeRate(null);
      return;
    }
    let active = true;
    const fetchRate = async () => {
      setExchangeRate(null);
      try {
        const response = await apiFetch(`/forex/rates/${encodeURIComponent(selected.currency)}/current`, {
          method: 'GET',
          headers: getAuthHeaders(),
        });
        const result = await response.json();
        const rate = Number(result.data?.midRate ?? result.data?.MidRate);
        if (active && result.success && Number.isFinite(rate) && rate > 0) setExchangeRate(rate);
      } catch {
        if (active) setExchangeRate(null);
      }
    };
    void fetchRate();
    return () => { active = false; };
  }, [open, selected]);

  const label = useMemo(() => (item: RepatriationRecord) =>
    `${item.repatriationId} · ${item.currency} ${Number(item.exportAmount || 0).toLocaleString()} · ${item.status}`,
  []);

  const remainingRetention = selected ? Math.max(0, selected.requiredRetention - selected.repatriatedAmount) : 0;
  const remainingConversion = selected ? Math.max(0, selected.requiredConversion - selected.convertedAmount) : 0;
  const reset = () => {
    setSelected(null);
    setRepatriatedAmount('');
    setConvertedAmount('');
    setSwiftReference('');
    setBankCertificate('');
    setExchangeRate(null);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!selected || exchangeRate === null || !swiftReference.trim() || !bankCertificate.trim()) return;
    setSubmitting(true);
    try {
      const response = await apiFetch(`/repatriation/${encodeURIComponent(selected.repatriationId)}/record`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          repatriatedAmount: Number(repatriatedAmount || 0),
          convertedAmount: Number(convertedAmount || 0),
          exchangeRate,
          swiftReference: swiftReference.trim(),
          bankCertificate: bankCertificate.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        showError('Error', result.error?.message || result.error || 'Failed to record repatriation evidence');
        return;
      }
      showSuccess('Recorded', 'Bank evidence was recorded on the ledger and is ready for NBE review when requirements are met.');
      reset();
      onSuccess();
      onClose();
    } catch {
      showError('Error', 'Failed to record repatriation evidence');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Record Repatriation Evidence</DialogTitle>
      <Divider />
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Record the actual foreign-currency retention and conversion amounts with their bank evidence. NBE policy and the exchange rate are verified against ledger state.
          </Alert>
          <Autocomplete
            options={records}
            value={selected}
            onChange={(_, value) => {
              setSelected(value);
              setRepatriatedAmount('');
              setConvertedAmount('');
              setSwiftReference('');
              setBankCertificate('');
            }}
            getOptionLabel={label}
            isOptionEqualToValue={(option, value) => option.repatriationId === value.repatriationId}
            loading={loading}
            renderInput={(params) => (
              <TextField {...params} label="Repatriation record" placeholder="Select a pending record" />
            )}
            sx={{ mb: 2 }}
          />
          {selected && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Remaining required amounts: {selected.currency} {remainingRetention.toLocaleString()} retained; {selected.currency} {remainingConversion.toLocaleString()} converted.
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="FCY retained amount" type="number" inputProps={{ min: 0, step: '0.01', max: remainingRetention }} value={repatriatedAmount} onChange={(event) => setRepatriatedAmount(event.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Amount converted" type="number" inputProps={{ min: 0, step: '0.01', max: remainingConversion }} value={convertedAmount} onChange={(event) => setConvertedAmount(event.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Active NBE mid-rate" value={exchangeRate ?? ''} InputProps={{ readOnly: true }} helperText={exchangeRate === null ? 'No active ledger rate is available' : `ETB per ${selected.currency}`} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth required label="SWIFT reference" value={swiftReference} onChange={(event) => setSwiftReference(event.target.value)} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth required multiline minRows={2} label="Bank certificate or evidence reference" value={bankCertificate} onChange={(event) => setBankCertificate(event.target.value)} />
                </Grid>
              </Grid>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={submitting}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || !selected || exchangeRate === null || (!Number(repatriatedAmount) && !Number(convertedAmount)) || !swiftReference.trim() || !bankCertificate.trim()}
          startIcon={submitting ? <CircularProgress size={16} /> : undefined}
        >
          {submitting ? 'Recording…' : 'Record on ledger'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RepatriationRecordingDialog;
