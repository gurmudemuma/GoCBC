/**
 * EntityBlockchainVerification - Universal blockchain signature viewer
 * Handles both document signatures AND entity-level blockchain transactions
 * Supports: FOREX_ALLOCATION, PAYMENT, CUSTOMS_DECLARATION, SHIPMENT, CONTRACT, LETTER_OF_CREDIT, etc.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  Table,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  VerifiedUser as VerifiedIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Gavel as GavelIcon,
  AccountBalance as BankIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface BlockchainSignature {
  txId: string;
  timestamp: string;
  creator: {
    mspId: string;
    identity: string;
  };
  chaincodeName: string;
  chaincodeFunction: string;
  args: string[];
  endorsers: Array<{
    mspId: string;
    endpoint: string;
  }>;
  validationCode: string;
  blockNumber: number;
  blockHash: string;
}

interface VerificationSummary {
  total: number;
  verified: number;
  pending: number;
  uniqueSigners: number;
  organizations: string[];
  latestSignature: BlockchainSignature | null;
}

interface Props {
  entityType: string;
  entityId: string;
}

const EntityBlockchainVerification: React.FC<Props> = ({ entityType, entityId }) => {
  const [loading, setLoading] = useState(false);
  const [signatures, setSignatures] = useState<BlockchainSignature[]>([]);
  const [summary, setSummary] = useState<VerificationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBlockchainVerification = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      
      // Fetch blockchain signatures for this entity
      const response = await axios.get(
        `http://localhost:3001/api/v1/blockchain-signatures/entity/${entityType}/${entityId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        const txs = response.data.data.transactions || [];
        const sum = response.data.data.summary || {
          total: 0,
          verified: 0,
          organizations: [],
          latestTx: null
        };
        
        setSignatures(txs);
        setSummary({
          total: sum.total,
          verified: sum.verified,
          pending: 0,
          uniqueSigners: sum.organizations.length,
          organizations: sum.organizations,
          latestSignature: sum.latestTx
        });
      } else {
        setError('Failed to load blockchain signatures');
      }

    } catch (err: any) {
      console.error('Error loading blockchain signatures:', err);
      if (err.response?.status === 404) {
        // No signatures found - not an error, just empty
        setSignatures([]);
        setSummary({
          total: 0,
          verified: 0,
          pending: 0,
          uniqueSigners: 0,
          organizations: [],
          latestSignature: null
        });
      } else {
        setError(err.response?.data?.error?.message || 'Failed to load blockchain signatures');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entityType && entityId) {
      loadBlockchainVerification();
    }
  }, [entityType, entityId]);

  const getActionIcon = (func: string) => {
    if (func.includes('Request')) return <InfoIcon color="info" />;
    if (func.includes('Allocate') || func.includes('Approve') || func.includes('Issue')) return <GavelIcon color="success" />;
    if (func.includes('Verify')) return <VerifiedIcon color="primary" />;
    return <InfoIcon />;
  };

  const getActionColor = (func: string) => {
    if (func.includes('Request')) return 'info';
    if (func.includes('Allocate') || func.includes('Approve') || func.includes('Issue')) return 'success';
    if (func.includes('Verify')) return 'primary';
    return 'default';
  };

  if (loading && signatures.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading blockchain verification...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
        <IconButton size="small" onClick={loadBlockchainVerification} sx={{ ml: 2 }}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Alert>
    );
  }

  if (signatures.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No blockchain signatures found for this {entityType.toLowerCase().replace(/_/g, ' ')}.
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      {/* Summary Card */}
      <Card sx={{ mb: 2, backgroundColor: '#f5f5f5' }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h6" gutterBottom>
                🔐 Blockchain Transaction Verification
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All transactions cryptographically signed and recorded on blockchain
              </Typography>
            </Box>
            <Tooltip title="Refresh verification">
              <IconButton onClick={loadBlockchainVerification} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          {summary && (
            <Stack direction="row" spacing={2} sx={{ mt: 2 }} flexWrap="wrap">
              <Chip
                icon={<VerifiedIcon />}
                label={`${summary.verified} Blockchain TX`}
                color="success"
                variant="filled"
              />
              {summary.pending > 0 && (
                <Chip
                  icon={<WarningIcon />}
                  label={`${summary.pending} Pending`}
                  color="warning"
                  variant="outlined"
                />
              )}
              <Chip
                label={`${summary.uniqueSigners} Signers`}
                variant="outlined"
              />
              <Chip
                label={`${summary.organizations.length} Organizations`}
                variant="outlined"
              />
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Signature Details */}
      {signatures.map((sig, index) => (
        <Accordion key={sig.txId} defaultExpanded={index === signatures.length - 1}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
              {getActionIcon(sig.chaincodeFunction)}
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {sig.creator.identity} @ {sig.creator.mspId}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {sig.chaincodeFunction} • Block #{sig.blockNumber} • {new Date(sig.timestamp).toLocaleString()}
                </Typography>
              </Box>
              <Chip
                label={sig.validationCode === 'VALID' ? 'VERIFIED' : 'PENDING'}
                color={sig.validationCode === 'VALID' ? 'success' : 'warning'}
                size="small"
                variant="filled"
              />
            </Stack>
          </AccordionSummary>

          <AccordionDetails>
            <Stack spacing={2}>
              {/* Blockchain Status */}
              <Alert severity={sig.validationCode === 'VALID' ? 'success' : 'info'}>
                <Typography variant="body2">
                  <strong>Blockchain Status:</strong> Transaction validated and committed to block #{sig.blockNumber}
                </Typography>
              </Alert>

              {/* Transaction ID */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  📜 Transaction ID (TxID)
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    backgroundColor: '#f5f5f5',
                    p: 1,
                    borderRadius: 1,
                    wordBreak: 'break-all',
                  }}
                >
                  {sig.txId}
                </Typography>
              </Box>

              {/* Block Information */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  🔗 Block Information
                </Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell variant="head" sx={{ fontWeight: 'bold', width: '200px' }}>
                        Block Number
                      </TableCell>
                      <TableCell>#{sig.blockNumber}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell variant="head" sx={{ fontWeight: 'bold' }}>
                        Block Hash
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                        {sig.blockHash || 'N/A'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell variant="head" sx={{ fontWeight: 'bold' }}>
                        Validation Code
                      </TableCell>
                      <TableCell>
                        <Chip label={sig.validationCode} color="success" size="small" />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>

              {/* Creator/Signer Information */}
              <Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  🔑 Transaction Creator (X.509 Certificate)
                </Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell variant="head" sx={{ fontWeight: 'bold', width: '200px' }}>
                        Identity (DN)
                      </TableCell>
                      <TableCell>{sig.creator.identity}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell variant="head" sx={{ fontWeight: 'bold' }}>
                        MSP ID
                      </TableCell>
                      <TableCell>{sig.creator.mspId}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>

              {/* Chaincode Execution */}
              <Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  ⚙️ Chaincode Execution
                </Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell variant="head" sx={{ fontWeight: 'bold', width: '200px' }}>
                        Chaincode
                      </TableCell>
                      <TableCell>{sig.chaincodeName}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell variant="head" sx={{ fontWeight: 'bold' }}>
                        Function
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={sig.chaincodeFunction} 
                          color={getActionColor(sig.chaincodeFunction) as any} 
                          size="small" 
                        />
                      </TableCell>
                    </TableRow>
                    {sig.args && sig.args.length > 0 && (
                      <TableRow>
                        <TableCell variant="head" sx={{ fontWeight: 'bold' }}>
                          Arguments
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              backgroundColor: '#f5f5f5',
                              p: 1,
                              borderRadius: 1,
                            }}
                          >
                            [{sig.args.join(', ')}]
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>

              {/* Endorsers */}
              {sig.endorsers && sig.endorsers.length > 0 && (
                <Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    ✅ Transaction Endorsers
                  </Typography>
                  {sig.endorsers.map((endorser, idx) => (
                    <Chip
                      key={idx}
                      label={`${endorser.mspId} @ ${endorser.endpoint}`}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
              )}

              {/* Timestamp */}
              <Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  🕐 Blockchain Timestamp: {new Date(sig.timestamp).toLocaleString()}
                </Typography>
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default EntityBlockchainVerification;
