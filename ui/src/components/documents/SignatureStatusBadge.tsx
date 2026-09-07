/**
 * SignatureStatusBadge Component
 * Visual indicator showing document signature status
 */

import React, { useEffect, useState } from 'react';
import { Chip, Tooltip, Box, CircularProgress } from '@mui/material';
import {
  VerifiedUser as SignedIcon,
  Block as UnsignedIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface SignatureStatusBadgeProps {
  documentId: string;
  size?: 'small' | 'medium';
  showDetails?: boolean;
}

interface SignatureInfo {
  isSigned: boolean;
  signatureCount: number;
  latestSignature?: {
    signer_id: string;
    signer_org: string;
    signature_type: string;
    signed_at: string;
  };
}

const SignatureStatusBadge: React.FC<SignatureStatusBadgeProps> = ({
  documentId,
  size = 'small',
  showDetails = true,
}) => {
  const [loading, setLoading] = useState(true);
  const [signatureInfo, setSignatureInfo] = useState<SignatureInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSignatureStatus();
  }, [documentId]);

  const fetchSignatureStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const response = await axios.get(
        `http://localhost:3001/api/v1/documents/${documentId}/signatures`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data?.success) {
        const signatures = response.data.data?.signatures || [];
        const isSigned = signatures.length > 0;
        const latestSignature = isSigned ? signatures[signatures.length - 1] : undefined;

        setSignatureInfo({
          isSigned,
          signatureCount: signatures.length,
          latestSignature,
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch signature status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Chip
        icon={<CircularProgress size={16} />}
        label="Checking..."
        size={size}
        variant="outlined"
      />
    );
  }

  if (error || !signatureInfo) {
    return (
      <Tooltip title={error || 'Unknown status'}>
        <Chip
          icon={<InfoIcon />}
          label="Unknown"
          size={size}
          color="default"
          variant="outlined"
        />
      </Tooltip>
    );
  }

  if (!signatureInfo.isSigned) {
    return (
      <Tooltip title="Document has not been digitally signed">
        <Chip
          icon={<UnsignedIcon />}
          label="Unsigned"
          size={size}
          color="warning"
          variant="outlined"
        />
      </Tooltip>
    );
  }

  // Document is signed
  const { signatureCount, latestSignature } = signatureInfo;
  
  const tooltipContent = showDetails && latestSignature ? (
    <Box>
      <div><strong>Digitally Signed</strong></div>
      <div>Signatures: {signatureCount}</div>
      <div>Last signed by: {latestSignature.signer_id}</div>
      <div>Organization: {latestSignature.signer_org}</div>
      <div>Type: {latestSignature.signature_type}</div>
      <div>Date: {new Date(latestSignature.signed_at).toLocaleString()}</div>
    </Box>
  ) : (
    `Document has ${signatureCount} digital signature${signatureCount > 1 ? 's' : ''}`
  );

  return (
    <Tooltip title={tooltipContent}>
      <Chip
        icon={<SignedIcon />}
        label={`Signed (${signatureCount})`}
        size={size}
        color="success"
        variant="filled"
      />
    </Tooltip>
  );
};

export default SignatureStatusBadge;
