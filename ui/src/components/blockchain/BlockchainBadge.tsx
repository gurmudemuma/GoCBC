/**
 * BlockchainBadge - Shows visual proof that data comes from blockchain
 * Displays prominently at top of any blockchain-backed record
 * NOW WITH REAL VERIFICATION: Only shows if entity actually exists on blockchain
 */

import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Chip, Stack, Tooltip, CircularProgress, Alert } from '@mui/material';
import {
  VerifiedUser as BlockchainIcon,
  Link as ChainIcon,
  Security as SecurityIcon,
  Schedule as TimeIcon,
  HourglassEmpty as PendingIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface BlockchainBadgeProps {
  entityId: string;
  entityType: string;
  chaincode?: string;
  channel?: string;
  timestamp?: string;
  compact?: boolean;
}

export const BlockchainBadge: React.FC<BlockchainBadgeProps> = ({
  entityId,
  entityType,
  chaincode = 'coffee',
  channel = 'coffeechannel',
  timestamp,
  compact = false
}) => {
  const [loading, setLoading] = useState(true);
  const [onBlockchain, setOnBlockchain] = useState(false);
  const [blockchainData, setBlockchainData] = useState<any>(null);
  
  // Check if entity actually exists on blockchain
  useEffect(() => {
    const checkBlockchain = async () => {
      // Quick check: if entity ID has _PENDING, _REQUESTED, _DRAFT suffix, it's not on blockchain yet
      if (entityId.includes('_PENDING') || entityId.includes('_REQUESTED') || entityId.includes('_DRAFT')) {
        setOnBlockchain(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(
          `http://localhost:3001/api/v1/blockchain-signatures/entity/${entityType}/${entityId}`
        );

        if (response.data.success && response.data.data.transactions && response.data.data.transactions.length > 0) {
          setOnBlockchain(true);
          setBlockchainData(response.data.data);
        } else {
          setOnBlockchain(false);
        }
      } catch (error) {
        console.warn('Failed to verify blockchain status:', error);
        setOnBlockchain(false);
      } finally {
        setLoading(false);
      }
    };

    if (entityId) {
      checkBlockchain();
    }
  }, [entityId, entityType]);

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, p: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="caption" color="text.secondary">
          Verifying blockchain status...
        </Typography>
      </Box>
    );
  }

  // NOT on blockchain - show pending message
  if (!onBlockchain) {
    return (
      <Alert severity="warning" icon={<PendingIcon />} sx={{ mb: 2 }}>
        <Typography variant="body2" fontWeight={600}>
          ⏳ Pending Blockchain Registration
        </Typography>
        <Typography variant="caption">
          This entity has not been recorded on the blockchain yet. Blockchain registration occurs when the entity is approved/processed.
        </Typography>
      </Alert>
    );
  }

  // ON BLOCKCHAIN - show verification badge
  // ON BLOCKCHAIN - show verification badge
  const actualTimestamp = blockchainData?.summary?.latestTx?.timestamp || timestamp;
  
  if (compact) {
    return (
      <Chip
        icon={<BlockchainIcon />}
        label="Blockchain Verified"
        color="success"
        size="small"
        sx={{
          fontWeight: 600,
          '& .MuiChip-icon': { color: 'success.main' }
        }}
      />
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 2,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: '2px solid',
        borderColor: 'success.main',
      }}
    >
      <Stack spacing={1.5}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BlockchainIcon sx={{ fontSize: 28 }} />
          <Typography variant="h6" fontWeight={700}>
            ⛓️ BLOCKCHAIN VERIFIED
          </Typography>
        </Box>

        {/* Entity Info */}
        <Box>
          <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>
            This record is stored on Hyperledger Fabric blockchain
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip
              icon={<SecurityIcon />}
              label={`ID: ${entityId}`}
              size="small"
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                fontFamily: 'monospace',
                fontSize: '0.75rem'
              }}
            />
            <Chip
              icon={<ChainIcon />}
              label={`Chaincode: ${chaincode}`}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
            />
            <Chip
              icon={<ChainIcon />}
              label={`Channel: ${channel}`}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
            />
            {actualTimestamp && (
              <Chip
                icon={<TimeIcon />}
                label={new Date(actualTimestamp).toLocaleString()}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
            )}
          </Stack>
        </Box>

        {/* Blockchain Properties */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', fontSize: '0.85rem' }}>
          <Tooltip title="Data cannot be altered once recorded">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              ✓ <strong>Immutable</strong>
            </Box>
          </Tooltip>
          <Tooltip title="Shared across 6 consortium organizations">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              ✓ <strong>Distributed</strong>
            </Box>
          </Tooltip>
          <Tooltip title="All actions cryptographically signed with X.509 certificates">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              ✓ <strong>Cryptographically Signed</strong>
            </Box>
          </Tooltip>
          <Tooltip title="Verified by multiple peer nodes before commitment">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              ✓ <strong>Consensus Validated</strong>
            </Box>
          </Tooltip>
        </Box>

        {/* Network Info */}
        <Typography variant="caption" sx={{ opacity: 0.8, fontStyle: 'italic' }}>
          CECBS Consortium Network: ECTA • NBE • Banks • Customs • ECX • Shipping
        </Typography>
        
        {/* Blockchain transaction count */}
        {blockchainData?.summary && (
          <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600 }}>
            {blockchainData.summary.total} blockchain transaction{blockchainData.summary.total !== 1 ? 's' : ''} • 
            {blockchainData.summary.verified} verified • 
            {blockchainData.summary.organizations?.length || 0} organization{blockchainData.summary.organizations?.length !== 1 ? 's' : ''}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
};

export default BlockchainBadge;
