/**
 * Blockchain Badge Component (Restored)
 * Simple blockchain verification badge
 */

import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { Verified } from '@mui/icons-material';

interface BlockchainBadgeProps {
  entityId?: string;
  entityType?: string;
  chaincode?: string;
  channel?: string;
  compact?: boolean;
  txId?: string;
  verified?: boolean;
}

const BlockchainBadge: React.FC<BlockchainBadgeProps> = ({
  entityId,
  entityType,
  chaincode = 'coffee',
  channel = 'coffeechannel',
  compact = false,
  txId,
  verified = false
}) => {
  if (!verified && !txId) {
    return null;
  }

  const tooltipText = verified
    ? `Fabric transaction verified\nEntity: ${entityType || 'Unknown'}\nID: ${entityId || 'Unknown'}\nChaincode: ${chaincode}\nChannel: ${channel}${txId ? `\nTX: ${txId}` : ''}`
    : `Transaction ID present; block validation has not been checked here.\nTX: ${txId}`;

  return (
    <Tooltip title={<div style={{ whiteSpace: 'pre-line' }}>{tooltipText}</div>}>
      <Chip
        icon={<Verified />}
        label={verified ? (compact ? "✓" : "Ledger Verified") : (compact ? "⛓️" : "Transaction Recorded")}
        size="small"
        color={verified ? "success" : "info"}
        variant="outlined"
        sx={{
          fontWeight: 600,
          borderWidth: 2,
          '& .MuiChip-icon': {
            color: verified ? '#2e7d32' : '#1976d2'
          }
        }}
      />
    </Tooltip>
  );
};

export default BlockchainBadge;
