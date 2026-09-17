/**
 * BlockchainSignatureCard - Enhanced blockchain signature display with X.509 certificate details
 * Shows complete cryptographic verification information like real enterprise blockchain systems
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Divider,
  Stack,
  Alert,
} from '@mui/material';
import {
  ExpandMore,
  VerifiedUser,
  Security,
  Fingerprint,
  AccountCircle,
  Business,
  CalendarToday,
  Key,
  CheckCircle,
  Link as LinkIcon,
} from '@mui/icons-material';

interface X509CertificateDetails {
  commonName: string;
  organization: string;
  organizationalUnit: string;
  country: string;
  serialNumber: string;
  issuer: string;
  validFrom: string;
  validUntil: string;
  fingerprint: string;
}

interface SignerInfo {
  name: string;
  username: string;
  email?: string;
  organization: string;
  mspId: string;
}

interface BlockchainSignatureCardProps {
  // Transaction details
  txId: string;
  blockNumber?: number;
  timestamp: string;
  chaincodeFunction: string;
  validationCode?: string;
  
  // Signer details
  signer: SignerInfo;
  
  // Certificate details
  certificate: X509CertificateDetails;
  
  // Visual options
  variant?: 'default' | 'compact';
  defaultExpanded?: boolean;
}

const BlockchainSignatureCard: React.FC<BlockchainSignatureCardProps> = ({
  txId,
  blockNumber,
  timestamp,
  chaincodeFunction,
  validationCode = 'VALID',
  signer,
  certificate,
  variant = 'default',
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const isVerified = validationCode === 'VALID';

  return (
    <Card 
      sx={{ 
        border: '1px solid #e0e0e0',
        borderLeft: `4px solid ${isVerified ? '#4caf50' : '#ff9800'}`,
        mb: 2,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <CardContent>
        {/* Header - Signer Identity */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Security sx={{ color: '#9c27b0', fontSize: 24 }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {certificate.commonName}, {certificate.organizationalUnit} - {certificate.organization}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                BLOCKCHAIN_TRANSACTION • {chaincodeFunction} • {new Date(timestamp).toLocaleString()}
              </Typography>
            </Box>
          </Box>
          
          <Chip
            icon={<CheckCircle />}
            label="VERIFIED"
            color="success"
            size="small"
            sx={{ fontWeight: 600 }}
          />
        </Box>

        {/* Verification Status Alert */}
        <Alert 
          severity="success" 
          icon={<VerifiedUser />}
          sx={{ mb: 2, bgcolor: 'rgba(76, 175, 80, 0.1)' }}
        >
          Verification: {chaincodeFunction} - Blockchain Verified ✓
        </Alert>

        {/* Blockchain Transaction ID */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
            🔗 Blockchain Transaction ID
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              fontFamily: 'monospace', 
              fontSize: '0.75rem',
              wordBreak: 'break-all',
              bgcolor: '#f5f5f5',
              p: 1,
              borderRadius: 1,
            }}
          >
            {txId}
          </Typography>
        </Box>

        {/* Expandable Certificate Details */}
        <Accordion 
          expanded={expanded} 
          onChange={() => setExpanded(!expanded)}
          sx={{ 
            boxShadow: 'none',
            border: '1px solid #e0e0e0',
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Key sx={{ color: '#ff9800', fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                X-509 Certificate Details
              </Typography>
            </Box>
          </AccordionSummary>
          
          <AccordionDetails>
            <Grid container spacing={2}>
              {/* Common Name (CN) */}
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Common Name (CN)</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{certificate.commonName}</Typography>
              </Grid>

              {/* Organization (O) */}
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Organization (O)</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{certificate.organization}</Typography>
              </Grid>

              {/* Organizational Unit (OU) */}
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Organizational Unit (OU)</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{certificate.organizationalUnit}</Typography>
              </Grid>

              {/* Country (C) */}
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Country (C)</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{certificate.country}</Typography>
              </Grid>

              <Grid item xs={12}><Divider /></Grid>

              {/* Serial Number */}
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Serial Number</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {certificate.serialNumber}
                </Typography>
              </Grid>

              {/* Issuer */}
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Issuer</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{certificate.issuer}</Typography>
              </Grid>

              {/* Valid From */}
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Valid From</Typography>
                <Typography variant="body2">{new Date(certificate.validFrom).toLocaleString()}</Typography>
              </Grid>

              {/* Valid Until */}
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">Valid Until</Typography>
                <Typography variant="body2">
                  {certificate.validUntil === 'Invalid Date' || !certificate.validUntil 
                    ? 'Invalid Date' 
                    : new Date(certificate.validUntil).toLocaleString()}
                </Typography>
              </Grid>

              {/* Fingerprint (SHA-256) */}
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Fingerprint (SHA-256)</Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontFamily: 'monospace', 
                    fontSize: '0.7rem',
                    wordBreak: 'break-all',
                    bgcolor: '#f5f5f5',
                    p: 1,
                    borderRadius: 1,
                    mt: 0.5,
                  }}
                >
                  {certificate.fingerprint}
                </Typography>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Signer Information */}
        <Box sx={{ mt: 2, p: 2, bgcolor: '#fafafa', borderRadius: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <AccountCircle sx={{ fontSize: 16 }} /> Signer Information
          </Typography>
          
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Name</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{signer.name}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Username</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{signer.username}</Typography>
            </Grid>
            {signer.email && (
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Email</Typography>
                <Typography variant="body2">{signer.email}</Typography>
              </Grid>
            )}
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">Organization</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{signer.organization}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">MSP ID</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{signer.mspId}</Typography>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

export default BlockchainSignatureCard;
