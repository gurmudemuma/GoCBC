/**
 * BlockchainSignatureVerification - Displays blockchain-verified signatures with X.509 certificate details
 * Shows real cryptographic proof from blockchain, not just database claims
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  Divider,
  Table,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  VerifiedUser as VerifiedIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface BlockchainSignature {
  signature_id: string;
  document_id: string;
  signer_id: number;
  signer_org: string;
  signature_type: string;
  username: string;
  full_name: string;
  email: string;
  org_name: string;
  blockchain_tx_id: string;
  signed_at: string;
  blockchainVerified: boolean;
  verificationStatus: string;
  verificationMessage?: string;
  certificateDetails?: {
    commonName: string;
    organization: string;
    organizationalUnit: string;
    country: string;
    serialNumber: string;
    issuer: string;
    validFrom: string;
    validUntil: string;
    fingerprint: string;
  };
  signerInfo?: {
    name: string;
    username: string;
    email: string;
    organization: string;
    mspId: string;
  };
  endorsers?: Array<{
    mspId: string;
    endpoint: string;
    identity: string;
    certificateDetails?: any;
    signerInfo?: any;
  }>;
  endorsementNote?: string;
  blockchainData?: any;
  transactionId?: string;
  documentFileName?: string;
  documentType?: string;
  signatureSource?: string;
}

interface VerificationSummary {
  total: number;
  verified: number;
  unverified?: number;
  failed: number;
  pending: number;
  unavailable?: number;
}

interface Props {
  entityType: string;
  entityId: string;
}

const BlockchainSignatureVerification: React.FC<Props> = ({ entityType, entityId }) => {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [signatures, setSignatures] = useState<BlockchainSignature[]>([]);
  const [summary, setSummary] = useState<VerificationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBlockchainVerification = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      
      // STEP 1: Fetch document signatures from PostgreSQL
      const docsResponse = await axios.get(
        `http://localhost:3001/api/v1/documents/entity/${entityType}/${entityId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const docs = docsResponse.data.success && docsResponse.data.data ? docsResponse.data.data : [];
      setDocuments(docs);

      // Verify signatures for each document
      const documentSignatures: BlockchainSignature[] = [];
      for (const doc of docs) {
        try {
          const response = await axios.get(
            `http://localhost:3001/api/v1/documents/${doc.document_id}/verify-signatures`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (response.data.success && response.data.data.signatures) {
            documentSignatures.push(...response.data.data.signatures.map((sig: any) => ({
              ...sig,
              documentFileName: doc.file_name,
              documentType: doc.document_type,
              signatureSource: 'DOCUMENT_UPLOAD'
            })));
          }
        } catch (docErr) {
          console.warn(`Failed to verify signatures for ${doc.document_id}:`, docErr);
        }
      }

      // STEP 2: Fetch entity transaction signatures from blockchain
      const entitySignatures: BlockchainSignature[] = [];
      try {
        const entitySigResponse = await axios.get(
          `http://localhost:3001/api/v1/blockchain-signatures/entity/${entityType}/${entityId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (entitySigResponse.data.success && entitySigResponse.data.data.transactions) {
          for (const tx of entitySigResponse.data.data.transactions) {
            const identity = tx.creator?.identity || 'Unknown identity';
            const hasVerifiedEndorsements = Array.isArray(tx.endorsers) && tx.endorsers.length > 0 &&
              tx.endorsers.every((endorser: any) => endorser.signatureValid === true);
            const isLedgerVerified = tx.source !== 'POSTGRESQL' && tx.validationCode === 'VALID' &&
              tx.creator?.signatureValid === true && hasVerifiedEndorsements;
            entitySignatures.push({
              signature_id: tx.txId,
              document_id: entityId,
              signer_id: 0,
              signer_org: tx.creator.mspId,
              signature_type: 'BLOCKCHAIN_TRANSACTION',
              username: tx.signerInfo?.username || identity.split('CN=')[1]?.split(',')[0] || 'Unknown',
              full_name: tx.signerInfo?.name || identity,
              email: tx.signerInfo?.email || '',
              org_name: tx.signerInfo?.organization || tx.creator.mspId,
              blockchain_tx_id: tx.txId,
              signed_at: tx.timestamp,
              blockchainVerified: isLedgerVerified,
              verificationStatus: isLedgerVerified ? 'VERIFIED' : tx.source === 'POSTGRESQL' ? 'UNVERIFIED' : 'UNVERIFIED',
              verificationMessage: tx.source === 'POSTGRESQL'
                ? 'Application signature record; ledger validation was not confirmed.'
                : `${tx.chaincodeFunction} - Block #${tx.blockNumber}; endorsement certificates are shown with their verification result.`,
              certificateDetails: tx.certificateDetails,
              signerInfo: tx.signerInfo || {
                name: identity,
                username: identity.split('CN=')[1]?.split(',')[0] || 'Unknown',
                email: '',
                organization: tx.creator.mspId,
                mspId: tx.creator.mspId
              },
              endorsers: tx.endorsers || [],
              endorsementNote: tx.endorsementNote,
              blockchainData: tx,
              transactionId: tx.txId,
              documentFileName: `${tx.chaincodeFunction}`,
              documentType: entityType,
              signatureSource: tx.source === 'POSTGRESQL' ? 'APPLICATION_SIGNATURE' : 'BLOCKCHAIN_TRANSACTION'
            });
          }
        }
      } catch (entityErr: any) {
        console.warn(`Failed to fetch entity blockchain transactions:`, entityErr);
      }

      // STEP 3: Combine both sources
      const allSignatures = [...entitySignatures, ...documentSignatures];
      setSignatures(allSignatures);

      // Calculate summary
      const summaryData = {
        total: allSignatures.length,
        verified: allSignatures.filter(r => r.blockchainVerified).length,
        unverified: allSignatures.filter(r => r.verificationStatus === 'UNVERIFIED').length,
        failed: allSignatures.filter(r => r.verificationStatus === 'MISMATCH' || r.verificationStatus === 'NOT_FOUND_ON_BLOCKCHAIN').length,
        pending: allSignatures.filter(r => r.verificationStatus === 'NO_BLOCKCHAIN_TX').length,
        unavailable: allSignatures.filter(r => r.verificationStatus === 'BLOCKCHAIN_UNAVAILABLE').length
      };
      setSummary(summaryData);

    } catch (err: any) {
      console.error('Error verifying blockchain signatures:', err);
      setError(err.response?.data?.error?.message || 'Failed to verify signatures on blockchain');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entityType && entityId) {
      loadBlockchainVerification();
    }
  }, [entityType, entityId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'success';
      case 'MISMATCH':
      case 'VERIFICATION_ERROR':
      case 'NOT_FOUND_ON_BLOCKCHAIN':
        return 'error';
      case 'NO_BLOCKCHAIN_TX':
        return 'warning';
      case 'BLOCKCHAIN_UNAVAILABLE':
        return 'default';
      default:
        return 'info';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <VerifiedIcon color="success" />;
      case 'MISMATCH':
      case 'NOT_FOUND_ON_BLOCKCHAIN':
        return <ErrorIcon color="error" />;
      case 'NO_BLOCKCHAIN_TX':
      case 'BLOCKCHAIN_UNAVAILABLE':
        return <WarningIcon color="warning" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  if (loading && signatures.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Verifying signatures on blockchain...</Typography>
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
    // Check if this is a REQUESTED status entity that hasn't been processed yet
    const isPending = entityId.includes('_PENDING') || entityId.includes('_REQUESTED');
    
    return (
      <Alert severity={isPending ? "warning" : "info"} sx={{ mb: 2 }}>
        <Typography variant="body2" fontWeight="bold" gutterBottom>
          {isPending ? '⏳ Pending Blockchain Registration' : 'No Blockchain Signatures Found'}
        </Typography>
        <Typography variant="body2">
          {isPending 
            ? 'This transaction is pending approval and has not been recorded on the blockchain yet. Once approved and processed, cryptographic signatures will be generated and stored immutably on the Hyperledger Fabric ledger.'
            : 'No blockchain transaction signatures found for this entity. This may indicate the entity exists only in the database and has not been written to the blockchain, or the blockchain query returned no results.'}
        </Typography>
        {!isPending && (
          <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
            💡 Tip: Only approved and processed transactions are recorded on the blockchain with cryptographic signatures.
          </Typography>
        )}
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
                🔐 Blockchain Signature Verification
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ledger sourced entries are checked against Fabric history; application signature records are labeled separately.
              </Typography>
            </Box>
            <Tooltip title="Refresh verification">
              <IconButton onClick={loadBlockchainVerification} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          {summary && (
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Chip
                icon={<VerifiedIcon />}
                label={`${summary.verified} Verified`}
                color="success"
                variant="filled"
              />
              {(summary.unverified || 0) > 0 && (
                <Chip
                  icon={<InfoIcon />}
                  label={`${summary.unverified} Unverified`}
                  color="info"
                  variant="outlined"
                />
              )}
              {summary.failed > 0 && (
                <Chip
                  icon={<ErrorIcon />}
                  label={`${summary.failed} Failed`}
                  color="error"
                  variant="filled"
                />
              )}
              {summary.pending > 0 && (
                <Chip
                  icon={<WarningIcon />}
                  label={`${summary.pending} Pending`}
                  color="warning"
                  variant="outlined"
                />
              )}
              {(summary.unavailable || 0) > 0 && (
                <Chip
                  label={`${summary.unavailable} Unavailable`}
                  color="default"
                  variant="outlined"
                />
              )}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Signature Details */}
      {signatures.map((sig, index) => (
        <Accordion key={sig.signature_id} defaultExpanded={index === 0}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
              {getStatusIcon(sig.verificationStatus)}
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {sig.full_name || sig.username} - {sig.org_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {sig.signature_type} • {(sig as any).documentFileName || (sig as any).documentType} • {new Date(sig.signed_at).toLocaleString()}
                </Typography>
              </Box>
              <Chip
                label={sig.verificationStatus.replace(/_/g, ' ')}
                color={getStatusColor(sig.verificationStatus) as any}
                size="small"
                variant={sig.blockchainVerified ? 'filled' : 'outlined'}
              />
            </Stack>
          </AccordionSummary>

          <AccordionDetails>
            <Stack spacing={2}>
              {/* Verification Status */}
              <Alert severity={sig.blockchainVerified ? 'success' : sig.verificationStatus === 'UNVERIFIED' ? 'info' : 'warning'}>
                <Typography variant="body2">
                  <strong>Verification:</strong> {sig.verificationMessage}
                </Typography>
              </Alert>

              {/* Blockchain Transaction */}
              {sig.blockchain_tx_id && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    📜 Blockchain Transaction ID
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
                    {sig.blockchain_tx_id}
                  </Typography>
                </Box>
              )}

              {/* Certificate Details */}
              {sig.certificateDetails && (
                <Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    🔑 X.509 Certificate Details
                  </Typography>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell variant="head" sx={{ fontWeight: 'bold', width: '200px' }}>
                          Common Name (CN)
                        </TableCell>
                        <TableCell>{sig.certificateDetails.commonName}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell variant="head" sx={{ fontWeight: 'bold' }}>
                          Organization (O)
                        </TableCell>
                        <TableCell>{sig.certificateDetails.organization}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell variant="head" sx={{ fontWeight: 'bold' }}>
                          Organizational Unit (OU)
                        </TableCell>
                        <TableCell>{sig.certificateDetails.organizationalUnit}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell variant="head" sx={{ fontWeight: 'bold' }}>
                          Country (C)
                        </TableCell>
                        <TableCell>{sig.certificateDetails.country}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell variant="head" sx={{ fontWeight: 'bold' }}>
                          Serial Number
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {sig.certificateDetails.serialNumber}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell variant="head" sx={{ fontWeight: 'bold' }}>
                          Issuer
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          {sig.certificateDetails.issuer}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell variant="head" sx={{ fontWeight: 'bold' }}>
                          Valid From
                        </TableCell>
                        <TableCell>
                          {new Date(sig.certificateDetails.validFrom).toLocaleString()}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell variant="head" sx={{ fontWeight: 'bold' }}>
                          Valid Until
                        </TableCell>
                        <TableCell>
                          {new Date(sig.certificateDetails.validUntil).toLocaleString()}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell variant="head" sx={{ fontWeight: 'bold' }}>
                          Fingerprint (SHA-256)
                        </TableCell>
                        <TableCell
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            wordBreak: 'break-all',
                          }}
                        >
                          {sig.certificateDetails.fingerprint}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Box>
              )}

              {/* Signer Information */}
              <Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  👤 Signer Information
                </Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell variant="head" sx={{ fontWeight: 'bold', width: '200px' }}>
                        Name
                      </TableCell>
                      <TableCell>{sig.full_name}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell variant="head" sx={{ fontWeight: 'bold' }}>
                        Username
                      </TableCell>
                      <TableCell>{sig.username}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell variant="head" sx={{ fontWeight: 'bold' }}>
                        Email
                      </TableCell>
                      <TableCell>{sig.email}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell variant="head" sx={{ fontWeight: 'bold' }}>
                        Organization
                      </TableCell>
                      <TableCell>{sig.org_name}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell variant="head" sx={{ fontWeight: 'bold' }}>
                        MSP ID
                      </TableCell>
                      <TableCell>{sig.signer_org}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>

              {/* Consortium endorsements reported by the ledger source */}
              {sig.endorsers && sig.endorsers.length > 0 ? (
                <Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    🏛️ Recorded Peer Endorsements ({sig.endorsers.length})
                  </Typography>
                  <Alert severity={sig.blockchainVerified ? 'success' : 'info'} sx={{ mb: 2, fontSize: '0.85rem' }}>
                    {sig.blockchainVerified
                      ? 'Fabric marked this ledger transaction valid under the active endorsement policy. The peer identities shown are the endorsement data available in this record.'
                      : 'Peer identities are listed in this record, but this entry has not been verified as a valid ledger transaction.'}
                  </Alert>
                  
                  {sig.endorsers.map((endorser: any, idx: number) => (
                    <Accordion key={idx} sx={{ mb: 1, backgroundColor: '#fafafa' }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <VerifiedIcon color="success" fontSize="small" />
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {endorser.mspId}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Peer: {endorser.certificateDetails?.commonName || 'N/A'}
                            </Typography>
                          </Box>
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails>
                        {endorser.certificateDetails && (
                          <Table size="small">
                            <TableBody>
                              <TableRow>
                                <TableCell variant="head" sx={{ fontWeight: 'bold', width: '180px', fontSize: '0.85rem' }}>
                                  Common Name (CN)
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.85rem' }}>{endorser.certificateDetails.commonName}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell variant="head" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                                  Organization (O)
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.85rem' }}>{endorser.certificateDetails.organization}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell variant="head" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                                  Organizational Unit (OU)
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.85rem' }}>{endorser.certificateDetails.organizationalUnit}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell variant="head" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                                  Issuer CA
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.85rem' }}>{endorser.certificateDetails.issuer}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell variant="head" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                                  Peer Endpoint
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{endorser.endpoint}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              ) : (
                <Box>
                  <Divider sx={{ my: 2 }} />
                  <Alert severity={sig.blockchainVerified ? 'info' : 'warning'} sx={{ fontSize: '0.85rem' }}>
                    {sig.endorsementNote || (sig.blockchainVerified
                      ? 'Fabric marked this ledger transaction valid under the active channel and chaincode policy. This history response does not include the endorsing peer identities.'
                      : 'No peer endorsement evidence is available for this entry.')}
                  </Alert>
                </Box>
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default BlockchainSignatureVerification;
