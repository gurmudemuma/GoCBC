/**
 * Blockchain Badge Component (Restored)
 * Display-only indicator: this component performs NO fetch and NO ledger
 * verification itself. `verified` is only ever a claim supplied by the
 * parent view (e.g. from a ledger-proof / signature-verification call);
 * when it is false the chip says so explicitly instead of implying the
 * transaction was verified.
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

  // This badge performs no fetch: a bare tx id proves nothing about ledger
  // validity, so it must never be labelled as verified.
  const tooltipText = verified
    ? `Ledger Verified (as reported by the parent view — this badge performs no fetch itself)\nEntity: ${entityType || 'Unknown'}\nID: ${entityId || 'Unknown'}\nChaincode: ${chaincode}\nChannel: ${channel}${txId ? `\nTX: ${txId}` : ''}`
    : `Display only — NOT VERIFIED. This badge performs no ledger check.\nA transaction ID is present, but block validation has not been checked here.\nTX: ${txId}`;

  return (
    <Tooltip title={<div style={{ whiteSpace: 'pre-line' }}>{tooltipText}</div>}>
      <Chip
        icon={<Verified />}
        label={verified ? (compact ? "✓" : "Ledger Verified") : (compact ? "Not Verified" : "Not Verified — Display Only")}
        size="small"
        color={verified ? "success" : "warning"}
        variant="outlined"
        sx={{
          fontWeight: 600,
          borderWidth: 2,
          '& .MuiChip-icon': {
            color: verified ? '#2e7d32' : '#ed6c02'
          }
        }}
      />
    </Tooltip>
  );
};

export default BlockchainBadge;
