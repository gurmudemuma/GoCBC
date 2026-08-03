// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Blockchain Identity Management Panel Component

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Grid,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
} from '@mui/material';
import {
  VpnKey,
  CardMembership,
  Fingerprint,
  Warning,
  CheckCircle,
  Block,
  Refresh,
  History,
  VerifiedUser,
  Person,
  Business,
} from '@mui/icons-material';
import api from '@/utils/api';

interface BlockchainIdentity {
  userId: number;
  username: string;
  mspId: string;
  enrollmentId: string;
  certificateHash: string;
  createdAt: string;
  expiresAt: string;
  status: 'active' | 'suspended' | 'revoked' | 'expired';
  revokedAt?: string;
}

interface BlockchainIdentityPanelProps {
  userId: number;
  username: string;
  role: string;
  organization: string;
}

const BlockchainIdentityPanel: React.FC<BlockchainIdentityPanelProps> = ({
  userId,
  username,
  role,
  organization,
}) => {
  const [identity, setIdentity] = useState<BlockchainIdentity | null>(null);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');

  useEffect(() => {
    loadIdentity();
  }, [userId]);

  const loadIdentity = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/crypto-users/${userId}/identity`);
      if (response.data.success) {
        setIdentity(response.data.data);
      }
    } catch (err: any) {
      if (err.response?.status !== 404) {
        setError('Failed to load blockchain identity');
      }
      setIdentity(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    setError('');
    try {
      const response = await api.post('/crypto-users/enroll', {
        userId,
        username,
        role,
        organization,
      });

      if (response.data.success) {
        setSuccess('Blockchain identity enrolled successfully!');
        loadIdentity();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to enroll blockchain identity');
    } finally {
      setEnrolling(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeReason.trim()) {
      setError('Please provide a reason for revocation');
      return;
    }

    setRevoking(true);
    setError('');
    try {
      const response = await api.post(`/crypto-users/${userId}/revoke`, {
        reason: revokeReason,
      });

      if (response.data.success) {
        setSuccess('Blockchain identity revoked successfully!');
        setRevokeDialogOpen(false);
        setRevokeReason('');
        loadIdentity();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to revoke blockchain identity');
    } finally {
      setRevoking(false);
    }
  };

  const handleRenew = async () => {
    setRenewing(true);
    setError('');
    try {
      const response = await api.post(`/crypto-users/${userId}/renew-certificate`, {
        validityDays: 365,
      });

      if (response.data.success) {
        setSuccess('Certificate renewed successfully!');
        setRenewDialogOpen(false);
        loadIdentity();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to renew certificate');
    } finally {
      setRenewing(false);
    }
  };

  const getDaysUntilExpiry = () => {
    if (!identity) return null;
    const now = new Date();
    const expiry = new Date(identity.expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'suspended': return 'warning';
      case 'revoked': return 'error';
      case 'expired': return 'default';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <VerifiedUser color="primary" />
            <Typography variant="h6">Blockchain Identity</Typography>
          </Box>
          <IconButton onClick={loadIdentity} size="small">
            <Refresh />
          </IconButton>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {!identity ? (
          <Box textAlign="center" py={3}>
            <Typography variant="body2" color="text.secondary" mb={2}>
              No blockchain identity enrolled yet
            </Typography>
            <Button
              variant="contained"
              startIcon={<VpnKey />}
              onClick={handleEnroll}
              disabled={enrolling}
            >
              {enrolling ? 'Enrolling...' : 'Enroll Blockchain Identity'}
            </Button>
          </Box>
        ) : (
          <>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <Person />
                    </ListItemIcon>
                    <ListItemText
                      primary="Username"
                      secondary={identity.username}
                    />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <Business />
                    </ListItemIcon>
                    <ListItemText
                      primary="MSP ID"
                      secondary={identity.mspId}
                    />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <CardMembership />
                    </ListItemIcon>
                    <ListItemText
                      primary="Enrollment ID"
                      secondary={identity.enrollmentId}
                    />
                  </ListItem>
                </List>
              </Grid>

              <Grid item xs={12} md={6}>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <Fingerprint />
                    </ListItemIcon>
                    <ListItemText
                      primary="Certificate Hash"
                      secondary={`${identity.certificateHash.substring(0, 16)}...`}
                    />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <History />
                    </ListItemIcon>
                    <ListItemText
                      primary="Created"
                      secondary={new Date(identity.createdAt).toLocaleString()}
                    />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <Warning />
                    </ListItemIcon>
                    <ListItemText
                      primary="Expires"
                      secondary={
                        <>
                          {new Date(identity.expiresAt).toLocaleString()}
                          {getDaysUntilExpiry() !== null && (
                            <Chip
                              label={`${getDaysUntilExpiry()} days`}
                              size="small"
                              color={getDaysUntilExpiry()! < 30 ? 'warning' : 'default'}
                              sx={{ ml: 1 }}
                            />
                          )}
                        </>
                      }
                    />
                  </ListItem>
                </List>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Chip
                label={identity.status.toUpperCase()}
                color={getStatusColor(identity.status)}
                icon={identity.status === 'active' ? <CheckCircle /> : <Block />}
              />

              <Box display="flex" gap={1}>
                {identity.status === 'active' && (
                  <>
                    <Tooltip title="Renew Certificate">
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Refresh />}
                        onClick={() => setRenewDialogOpen(true)}
                      >
                        Renew
                      </Button>
                    </Tooltip>

                    <Tooltip title="Revoke Identity">
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<Block />}
                        onClick={() => setRevokeDialogOpen(true)}
                      >
                        Revoke
                      </Button>
                    </Tooltip>
                  </>
                )}

                {identity.status === 'revoked' && identity.revokedAt && (
                  <Typography variant="caption" color="error">
                    Revoked: {new Date(identity.revokedAt).toLocaleString()}
                  </Typography>
                )}
              </Box>
            </Box>
          </>
        )}
      </CardContent>

      {/* Revoke Dialog */}
      <Dialog open={revokeDialogOpen} onClose={() => setRevokeDialogOpen(false)}>
        <DialogTitle>Revoke Blockchain Identity</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            This will permanently revoke the user's blockchain identity. They will not be able to sign transactions.
          </Typography>
          <TextField
            fullWidth
            label="Reason for Revocation"
            multiline
            rows={3}
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleRevoke}
            color="error"
            variant="contained"
            disabled={revoking || !revokeReason.trim()}
          >
            {revoking ? 'Revoking...' : 'Revoke Identity'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Renew Dialog */}
      <Dialog open={renewDialogOpen} onClose={() => setRenewDialogOpen(false)}>
        <DialogTitle>Renew Certificate</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will issue a new certificate valid for 365 days.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenewDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleRenew}
            color="primary"
            variant="contained"
            disabled={renewing}
          >
            {renewing ? 'Renewing...' : 'Renew Certificate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default BlockchainIdentityPanel;
