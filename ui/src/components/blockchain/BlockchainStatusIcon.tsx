// Blockchain Status Icon Component
// Shows blockchain verification status with icon + tooltip

import React, { useState } from 'react';
import { Tooltip, IconButton, Box, Typography, Chip } from '@mui/material';
import {
  CheckCircle,
  Schedule,
  Error,
  Sync,
  VerifiedUser,
  Warning,
} from '@mui/icons-material';

export type BlockchainStatus = 
  | 'VERIFIED' 
  | 'PENDING' 
  | 'SYNCING' 
  | 'MISMATCH' 
  | 'NO_TX' 
  | 'UNAVAILABLE';

interface BlockchainStatusIconProps {
  status: BlockchainStatus;
  txId?: string;
  entityType?: string;
  entityId?: string;
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const BlockchainStatusIcon: React.FC<BlockchainStatusIconProps> = ({
  status,
  txId,
  entityType,
  entityId,
  onClick,
  size = 'small',
  showLabel = false,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'VERIFIED':
        return {
          icon: <CheckCircle fontSize={size} />,
          color: '#4caf50',
          label: 'Blockchain Verified',
          tooltip: 'Cryptographically verified on blockchain',
          bgColor: 'rgba(76, 175, 80, 0.1)',
        };
      case 'PENDING':
        return {
          icon: <Schedule fontSize={size} />,
          color: '#ff9800',
          label: 'Pending Verification',
          tooltip: 'Awaiting blockchain confirmation (30-60s)',
          bgColor: 'rgba(255, 152, 0, 0.1)',
        };
      case 'SYNCING':
        return {
          icon: <Sync fontSize={size} className="rotating-icon" />,
          color: '#2196f3',
          label: 'Syncing',
          tooltip: 'Syncing with blockchain network...',
          bgColor: 'rgba(33, 150, 243, 0.1)',
        };
      case 'MISMATCH':
        return {
          icon: <Error fontSize={size} />,
          color: '#f44336',
          label: 'Verification Failed',
          tooltip: 'TAMPERING DETECTED - Signature mismatch!',
          bgColor: 'rgba(244, 67, 54, 0.1)',
        };
      case 'NO_TX':
        return {
          icon: <Warning fontSize={size} />,
          color: '#ff9800',
          label: 'No Blockchain TX',
          tooltip: 'No blockchain transaction recorded yet',
          bgColor: 'rgba(255, 152, 0, 0.1)',
        };
      case 'UNAVAILABLE':
        return {
          icon: <Warning fontSize={size} />,
          color: '#9e9e9e',
          label: 'Unavailable',
          tooltip: 'Blockchain network unavailable',
          bgColor: 'rgba(158, 158, 158, 0.1)',
        };
      default:
        return {
          icon: <Schedule fontSize={size} />,
          color: '#9e9e9e',
          label: 'Unknown',
          tooltip: 'Status unknown',
          bgColor: 'rgba(158, 158, 158, 0.1)',
        };
    }
  };

  const config = getStatusConfig();

  if (showLabel) {
    return (
      <Tooltip title={config.tooltip} arrow>
        <Chip
          icon={config.icon}
          label={config.label}
          size="small"
          onClick={onClick}
          sx={{
            bgcolor: config.bgColor,
            color: config.color,
            border: `1px solid ${config.color}`,
            fontWeight: 600,
            fontSize: '0.75rem',
            cursor: onClick ? 'pointer' : 'default',
            '& .MuiChip-icon': {
              color: config.color,
            },
            '&:hover': onClick ? {
              bgcolor: config.color,
              color: 'white',
              '& .MuiChip-icon': {
                color: 'white',
              },
            } : {},
          }}
        />
      </Tooltip>
    );
  }

  return (
    <Tooltip 
      title={
        <Box>
          <Typography variant="caption" fontWeight={600}>
            {config.label}
          </Typography>
          {txId && (
            <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
              TX: {txId.substring(0, 16)}...
            </Typography>
          )}
          {entityType && entityId && (
            <Typography variant="caption" display="block" sx={{ fontSize: '0.7rem' }}>
              {entityType}: {entityId}
            </Typography>
          )}
          <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
            {config.tooltip}
          </Typography>
        </Box>
      }
      arrow
    >
      <IconButton 
        size={size}
        onClick={onClick}
        sx={{ 
          color: config.color,
          '&:hover': {
            bgcolor: config.bgColor,
          },
        }}
      >
        {config.icon}
      </IconButton>
    </Tooltip>
  );
};

export default BlockchainStatusIcon;

// CSS for rotating sync icon (client-side only)
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .rotating-icon {
      animation: rotate 2s linear infinite;
    }
  `;
  document.head.appendChild(style);
}
