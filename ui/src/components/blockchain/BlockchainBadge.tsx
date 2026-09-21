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
  verified = true
}) => {
  if (!verified && !entityId) {
    return null;
  }

  const tooltipText = entityId 
    ? `Blockchain Verified\nEntity: ${entityType || 'Unknown'}\nID: ${entityId}\nChaincode: ${chaincode}\nChannel: ${channel}`
    : txId
    ? `Blockchain TX: ${txId.substring(0, 16)}...`
    : 'Blockchain Verified';

  return (
    <Tooltip title={<div style={{ whiteSpace: 'pre-line' }}>{tooltipText}</div>}>
      <Chip
        icon={<Verified />}
        label={compact ? "⛓️" : "Blockchain"}
        size="small"
        color="primary"
        variant="outlined"
        sx={{
          fontWeight: 600,
          borderWidth: 2,
          '& .MuiChip-icon': {
            color: '#1976d2'
          }
        }}
      />
    </Tooltip>
  );
};

export default BlockchainBadge;
