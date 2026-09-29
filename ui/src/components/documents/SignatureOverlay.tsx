/**
 * SignatureOverlay Component
 * Displays visual signature badges on document viewer
 * Shows blockchain-backed digital signatures with verification details
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  Tooltip,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  VerifiedUser as VerifiedIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Link as LinkIcon,
} from '@mui/icons-material';

interface Signature {
  signature_id: string;
  signer_id: string;
  signer_org: string;
  signature_type: string;
  signed_at: string;
  blockchain_tx_id?: string;
  certificate_id?: string;
  remarks?: string;
}

interface SignatureOverlayProps {
  signatures: Signature[];
  documentName?: string;
}

export const SignatureOverlay: React.FC<SignatureOverlayProps> = ({
  signatures,
  documentName,
}) => {
  const [expanded, setExpanded] = React.useState<{ [key: string]: boolean }>({});

  if (!signatures || signatures.length === 0) {
    return null;
  }

  const toggleExpand = (sigId: string) => {
    setExpanded(prev => ({ ...prev, [sigId]: !prev[sigId] }));
  };

  const getSignatureColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'APPROVE':
        return {
          bg: 'rgba(76, 175, 80, 0.95)',
          border: '#4CAF50',
          icon: '#2E7D32',
          text: '#FFFFFF',
        };
      case 'VERIFY':
        return {
          bg: 'rgba(33, 150, 243, 0.95)',
          border: '#2196F3',
          icon: '#1565C0',
          text: '#FFFFFF',
        };
      case 'UPLOAD':
        return {
          bg: 'rgba(158, 158, 158, 0.95)',
          border: '#9E9E9E',
          icon: '#616161',
          text: '#FFFFFF',
        };
      case 'REJECT':
        return {
          bg: 'rgba(244, 67, 54, 0.95)',
          border: '#F44336',
          icon: '#C62828',
          text: '#FFFFFF',
        };
      default:
        return {
          bg: 'rgba(158, 158, 158, 0.95)',
          border: '#9E9E9E',
          icon: '#616161',
          text: '#FFFFFF',
        };
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSignatureLabel = (type: string) => {
    switch (type.toUpperCase()) {
      case 'APPROVE':
        return 'APPROVED';
      case 'VERIFY':
        return 'VERIFIED';
      case 'UPLOAD':
        return 'UPLOADED';
      case 'REJECT':
        return 'REJECTED';
      default:
        return 'SIGNED';
    }
  };

  return (
    <>
      {/* Diagonal "SIGNED" Watermark - Prominent Visual Indicator */}
      {signatures.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-45deg)',
            zIndex: 999,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '6rem', sm: '8rem', md: '10rem' },
              fontWeight: 900,
              color: 'rgba(76, 175, 80, 0.15)',
              textTransform: 'uppercase',
              letterSpacing: 8,
              textShadow: '0 0 30px rgba(76, 175, 80, 0.3)',
              WebkitTextStroke: '2px rgba(76, 175, 80, 0.3)',
            }}
          >
            SIGNED
          </Typography>
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              bottom: -20,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'rgba(76, 175, 80, 0.4)',
              fontSize: '1.2rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            Blockchain Verified
          </Typography>
        </Box>
      )}

      {/* Signature Badges - Bottom Right */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          zIndex: 1000,
          maxWidth: '350px',
          pointerEvents: 'auto',
        }}
      >
        <Stack spacing={1}>
          {signatures.map((sig, index) => {
          const colors = getSignatureColor(sig.signature_type);
          const isExpanded = expanded[sig.signature_id];

          return (
            <Paper
              key={sig.signature_id}
              elevation={8}
              sx={{
                background: colors.bg,
                border: `2px solid ${colors.border}`,
                borderRadius: 2,
                overflow: 'hidden',
                backdropFilter: 'blur(10px)',
              }}
            >
              {/* Main Signature Badge */}
              <Box sx={{ p: 1.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  {/* Icon */}
                  <Box
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '50%',
                      p: 0.75,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckIcon sx={{ fontSize: 24, color: colors.text }} />
                  </Box>

                  {/* Signature Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography
                        variant="caption"
                        sx={{
                          color: colors.text,
                          fontWeight: 700,
                          letterSpacing: 1,
                          textTransform: 'uppercase',
                        }}
                      >
                        {getSignatureLabel(sig.signature_type)}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => toggleExpand(sig.signature_id)}
                        sx={{
                          color: colors.text,
                          padding: 0.5,
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s',
                        }}
                      >
                        <ExpandMoreIcon fontSize="small" />
                      </IconButton>
                    </Stack>

                    <Typography
                      variant="body2"
                      sx={{
                        color: colors.text,
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        mt: 0.5,
                      }}
                    >
                      {sig.signer_id}
                    </Typography>

                    <Typography
                      variant="caption"
                      sx={{
                        color: colors.text,
                        opacity: 0.9,
                        display: 'block',
                      }}
                    >
                      {sig.signer_org}
                    </Typography>

                    <Typography
                      variant="caption"
                      sx={{
                        color: colors.text,
                        opacity: 0.85,
                        display: 'block',
                        mt: 0.5,
                        fontSize: '0.7rem',
                      }}
                    >
                      {formatDate(sig.signed_at)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {/* Expanded Details */}
              <Collapse in={isExpanded}>
                <Box
                  sx={{
                    bgcolor: 'rgba(0, 0, 0, 0.2)',
                    p: 1.5,
                    borderTop: `1px solid rgba(255, 255, 255, 0.2)`,
                  }}
                >
                  <Stack spacing={1}>
                    {/* Blockchain TX */}
                    {sig.blockchain_tx_id && (
                      <Box>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <VerifiedIcon sx={{ fontSize: 14, color: colors.text }} />
                          <Typography
                            variant="caption"
                            sx={{ color: colors.text, fontWeight: 600 }}
                          >
                            Blockchain Verified
                          </Typography>
                        </Stack>
                        <Tooltip title="Transaction ID">
                          <Typography
                            variant="caption"
                            sx={{
                              color: colors.text,
                              opacity: 0.85,
                              display: 'block',
                              fontFamily: 'monospace',
                              fontSize: '0.65rem',
                              wordBreak: 'break-all',
                              mt: 0.5,
                            }}
                          >
                            {sig.blockchain_tx_id.substring(0, 32)}...
                          </Typography>
                        </Tooltip>
                      </Box>
                    )}

                    {/* Certificate ID */}
                    {sig.certificate_id && (
                      <Box>
                        <Typography
                          variant="caption"
                          sx={{ color: colors.text, fontWeight: 600 }}
                        >
                          Certificate: {sig.certificate_id}
                        </Typography>
                      </Box>
                    )}

                    {/* Remarks */}
                    {sig.remarks && (
                      <Box>
                        <Typography
                          variant="caption"
                          sx={{ color: colors.text, fontWeight: 600 }}
                        >
                          Remarks:
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: colors.text,
                            opacity: 0.9,
                            display: 'block',
                            fontStyle: 'italic',
                          }}
                        >
                          {sig.remarks}
                        </Typography>
                      </Box>
                    )}

                    {/* Signature ID */}
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: colors.text,
                          opacity: 0.7,
                          fontFamily: 'monospace',
                          fontSize: '0.6rem',
                        }}
                      >
                        ID: {sig.signature_id}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Collapse>
            </Paper>
          );
        })}

        {/* Document Name Badge */}
        {documentName && signatures.length > 0 && (
          <Paper
            elevation={4}
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              p: 1,
              borderRadius: 1,
              textAlign: 'center',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#333' }}>
              📄 {documentName}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: '#666' }}>
              {signatures.length} {signatures.length === 1 ? 'Signature' : 'Signatures'}
            </Typography>
          </Paper>
        )}
      </Stack>
    </Box>
    </>
  );
};

export default SignatureOverlay;
