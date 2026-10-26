// Blockchain Transaction ID Chip Component
// Displays blockchain TX ID with copy functionality

import React, { useState } from 'react';
import { Chip, Tooltip, Snackbar, Alert } from '@mui/material';
import { ContentCopy, Link as LinkIcon } from '@mui/icons-material';

interface BlockchainTxChipProps {
  txId: string;
  short?: boolean;
  copyable?: boolean;
  linkable?: boolean;
  size?: 'small' | 'medium';
  onLinkClick?: (txId: string) => void;
}

const BlockchainTxChip: React.FC<BlockchainTxChipProps> = ({
  txId,
  short = true,
  copyable = true,
  linkable = false,
  size = 'small',
  onLinkClick,
}) => {
  const [copied, setCopied] = useState(false);

  const displayTxId = short && txId.length > 16 
    ? `${txId.substring(0, 8)}...${txId.substring(txId.length - 6)}`
    : txId;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(txId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy TX ID:', err);
    }
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onLinkClick) {
      onLinkClick(txId);
    }
  };

  return (
    <>
      <Tooltip 
        title={
          <>
            <div style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
              {txId}
            </div>
            <div style={{ marginTop: 4, fontSize: '0.7rem', fontStyle: 'italic' }}>
              {copyable && 'Click to copy'} 
              {copyable && linkable && ' | '}
              {linkable && 'Right icon to view on explorer'}
            </div>
          </>
        }
        arrow
      >
        <Chip
          label={`TX: ${displayTxId}`}
          size={size}
          onClick={copyable ? handleCopy : undefined}
          onDelete={linkable ? handleLinkClick : undefined}
          deleteIcon={linkable ? <LinkIcon fontSize="small" /> : undefined}
          sx={{
            fontFamily: 'monospace',
            fontSize: size === 'small' ? '0.7rem' : '0.75rem',
            bgcolor: 'rgba(33, 150, 243, 0.1)',
            border: '1px solid #2196f3',
            color: '#1565c0',
            fontWeight: 600,
            cursor: copyable ? 'pointer' : 'default',
            '&:hover': copyable ? {
              bgcolor: '#2196f3',
              color: 'white',
            } : {},
            '& .MuiChip-deleteIcon': {
              color: '#1565c0',
              '&:hover': {
                color: '#0d47a1',
              },
            },
          }}
          icon={copyable ? <ContentCopy sx={{ fontSize: '0.9rem' }} /> : undefined}
        />
      </Tooltip>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          Transaction ID copied to clipboard!
        </Alert>
      </Snackbar>
    </>
  );
};

export default BlockchainTxChip;
