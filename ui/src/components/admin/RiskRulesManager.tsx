import React, { useEffect, useState } from 'react';
import { Box, TextField, Button, Typography, Alert } from '@mui/material';
import api from '@/utils/api';

const RiskRulesManager: React.FC = () => {
  const [rules, setRules] = useState<any>({ highValueThreshold: 50000, hsPrefixesMedium: ['07','08','09'] });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const resp = await api.get('/customs/risk-rules');
        if (resp.data && resp.data.success) {
          setRules(resp.data.data || rules);
        }
      } catch (err) {
        console.warn('Could not load risk rules:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      const payload = {
        highValueThreshold: Number(rules.highValueThreshold || 0),
        hsPrefixesMedium: typeof rules.hsPrefixesMedium === 'string'
          ? rules.hsPrefixesMedium.split(',').map((s: string) => s.trim()).filter(Boolean)
          : rules.hsPrefixesMedium,
      };

      const resp = await api.put('/customs/risk-rules', payload);
      if (resp.data && resp.data.success) {
        setMessage('Risk rules updated successfully');
        setRules(resp.data.data);
      } else {
        setMessage('Failed to update rules');
      }
    } catch (err) {
      console.error('Save failed:', err);
      setMessage('Error saving rules');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  return (
    <Box sx={{ p: 2, maxWidth: 720 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Risk Rules Manager</Typography>

      {message && <Alert severity="info" sx={{ mb: 2 }}>{message}</Alert>}

      <TextField
        label="High value threshold (USD)"
        type="number"
        fullWidth
        value={rules.highValueThreshold}
        onChange={(e) => setRules({ ...rules, highValueThreshold: e.target.value })}
        sx={{ mb: 2 }}
      />

      <TextField
        label="HS prefixes (comma-separated)"
        fullWidth
        value={Array.isArray(rules.hsPrefixesMedium) ? rules.hsPrefixesMedium.join(',') : rules.hsPrefixesMedium}
        onChange={(e) => setRules({ ...rules, hsPrefixesMedium: e.target.value })}
        helperText="Prefixes that map to MEDIUM risk, e.g., 07,08,09"
        sx={{ mb: 2 }}
      />

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="contained" onClick={handleSave} disabled={loading}>Save</Button>
        <Button variant="outlined" onClick={() => { setRules({ highValueThreshold: 50000, hsPrefixesMedium: ['07','08','09'] }); }}>Reset</Button>
      </Box>
    </Box>
  );
};

export default RiskRulesManager;
