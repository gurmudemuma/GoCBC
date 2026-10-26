/**
 * Payment Status Badge Component
 * Shows payment status with method-appropriate progression
 * Added: June 26, 2026 - Payment Method Differentiation
 */

import React from 'react';
import { Chip, Tooltip, Box } from '@mui/material';
import {
  HourglassEmpty as PendingIcon,
  Description as DocumentIcon,
  VerifiedUser as VerifiedIcon,
  LocalShipping as ShippingIcon,
  Payment as PaymentIcon,
  CheckCircle as CompletedIcon,
  Warning as WarningIcon,
  Cancel as CancelledIcon,
} from '@mui/icons-material';

export type PaymentMethodType = 'LC' | 'CAD' | 'TT_ADVANCE' | 'TT_POST' | 'ADVANCE';

// Payment status type for all methods
export type PaymentStatus = 
  // Common statuses
  | 'PENDING'
  | 'SETTLED'
  | 'REJECTED'
  // LC statuses
  | 'DOCUMENTS_SUBMITTED'
  | 'UNDER_VERIFICATION'
  | 'VERIFICATION_PASSED'
  | 'VERIFICATION_FAILED'
  | 'PAYMENT_AUTHORIZED'
  | 'SWIFT_INITIATED'
  | 'SWIFT_RECEIVED'
  | 'DOCUMENTS_RELEASED'
  // CAD statuses
  | 'GOODS_SHIPPED'
  | 'DOCUMENTS_SENT_TO_BANK'
  | 'DOCUMENTS_FORWARDED'
  | 'BUYER_NOTIFIED'
  | 'PAYMENT_RECEIVED'
  // TT_ADVANCE / ADVANCE statuses
  | 'ADVANCE_REQUESTED'
  | 'ADVANCE_RECEIVED'
  | 'BALANCE_REQUESTED'
  | 'BALANCE_RECEIVED'
  | 'PROFORMA_ISSUED'
  | 'CONTRACT_REGISTERED'
  | 'COFFEE_SOURCING'
  | 'QUALITY_INSPECTION'
  // TT_POST statuses
  | 'DOCUMENTS_SENT_DIRECTLY'
  | 'PAYMENT_AWAITED';

interface StatusConfig {
  label: string;
  color: 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  icon: React.ReactElement;
  description: string;
}

const STATUS_CONFIG: Record<PaymentStatus, StatusConfig> = {
  // Common
  PENDING: {
    label: 'Pending',
    color: 'default',
    icon: <PendingIcon />,
    description: 'Payment initiated, awaiting next step',
  },
  SETTLED: {
    label: 'Settled',
    color: 'success',
    icon: <CompletedIcon />,
    description: 'Payment completed and settled',
  },
  REJECTED: {
    label: 'Rejected',
    color: 'error',
    icon: <CancelledIcon />,
    description: 'Payment rejected',
  },
  
  // LC Statuses
  DOCUMENTS_SUBMITTED: {
    label: 'Docs Submitted',
    color: 'info',
    icon: <DocumentIcon />,
    description: 'Documents submitted to bank for verification',
  },
  UNDER_VERIFICATION: {
    label: 'Verifying',
    color: 'warning',
    icon: <VerifiedIcon />,
    description: 'Bank verifying documents against LC terms (UCP 600)',
  },
  VERIFICATION_PASSED: {
    label: 'Verified ✓',
    color: 'success',
    icon: <VerifiedIcon />,
    description: 'Documents verified, payment authorized',
  },
  VERIFICATION_FAILED: {
    label: 'Verification Failed',
    color: 'error',
    icon: <WarningIcon />,
    description: 'Documents do not comply with LC terms',
  },
  PAYMENT_AUTHORIZED: {
    label: 'Authorized',
    color: 'primary',
    icon: <PaymentIcon />,
    description: 'Payment authorized by issuing bank',
  },
  SWIFT_INITIATED: {
    label: 'SWIFT Initiated',
    color: 'info',
    icon: <PaymentIcon />,
    description: 'SWIFT payment message sent (2-5 business days)',
  },
  SWIFT_RECEIVED: {
    label: 'SWIFT Received',
    color: 'primary',
    icon: <PaymentIcon />,
    description: 'SWIFT payment received by Ethiopian bank',
  },
  DOCUMENTS_RELEASED: {
    label: 'Docs Released',
    color: 'success',
    icon: <DocumentIcon />,
    description: 'Documents released to buyer',
  },
  
  // CAD Statuses
  GOODS_SHIPPED: {
    label: 'Goods Shipped',
    color: 'info',
    icon: <ShippingIcon />,
    description: 'Goods shipped, documents being prepared',
  },
  DOCUMENTS_SENT_TO_BANK: {
    label: 'Docs to Bank',
    color: 'info',
    icon: <DocumentIcon />,
    description: 'Documents sent to exporter bank',
  },
  DOCUMENTS_FORWARDED: {
    label: 'Docs Forwarded',
    color: 'info',
    icon: <DocumentIcon />,
    description: 'Documents forwarded to buyer bank',
  },
  BUYER_NOTIFIED: {
    label: 'Buyer Notified ⏳',
    color: 'warning',
    icon: <WarningIcon />,
    description: 'Buyer notified: Pay to receive documents',
  },
  PAYMENT_RECEIVED: {
    label: 'Payment Received ✓',
    color: 'success',
    icon: <PaymentIcon />,
    description: 'Payment received from buyer',
  },
  
  // TT_ADVANCE / ADVANCE Statuses
  ADVANCE_REQUESTED: {
    label: 'Advance Requested',
    color: 'info',
    icon: <PaymentIcon />,
    description: 'Advance payment requested from buyer',
  },
  ADVANCE_RECEIVED: {
    label: 'Advance Received ✓',
    color: 'success',
    icon: <PaymentIcon />,
    description: 'Advance payment received, can proceed with shipment',
  },
  BALANCE_REQUESTED: {
    label: 'Balance Requested',
    color: 'info',
    icon: <PaymentIcon />,
    description: 'Balance payment requested',
  },
  BALANCE_RECEIVED: {
    label: 'Balance Received ✓',
    color: 'success',
    icon: <PaymentIcon />,
    description: 'Balance payment received, payment complete',
  },
  PROFORMA_ISSUED: {
    label: 'Proforma Issued',
    color: 'info',
    icon: <DocumentIcon />,
    description: 'Proforma invoice issued to buyer',
  },
  CONTRACT_REGISTERED: {
    label: 'Contract Registered',
    color: 'primary',
    icon: <DocumentIcon />,
    description: 'Contract registered after advance payment',
  },
  COFFEE_SOURCING: {
    label: 'Coffee Sourcing',
    color: 'info',
    icon: <ShippingIcon />,
    description: 'Sourcing coffee with advance payment',
  },
  QUALITY_INSPECTION: {
    label: 'Quality Inspection',
    color: 'info',
    icon: <VerifiedIcon />,
    description: 'ECTA quality inspection in progress',
  },
  
  // TT_POST Statuses
  DOCUMENTS_SENT_DIRECTLY: {
    label: 'Docs Sent',
    color: 'info',
    icon: <DocumentIcon />,
    description: 'Documents sent directly to buyer',
  },
  PAYMENT_AWAITED: {
    label: 'Awaiting Payment ⏳',
    color: 'warning',
    icon: <WarningIcon />,
    description: 'Awaiting payment from buyer after delivery',
  },
};

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  paymentMethod?: PaymentMethodType;
  showIcon?: boolean;
  size?: 'small' | 'medium';
}

const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({
  status,
  paymentMethod,
  showIcon = true,
  size = 'medium',
}) => {
  const config = STATUS_CONFIG[status] || {
    label: status,
    color: 'default' as const,
    icon: <PendingIcon />,
    description: status,
  };

  return (
    <Tooltip title={config.description} arrow>
      <Chip
        label={config.label}
        color={config.color}
        icon={showIcon ? config.icon : undefined}
        size={size}
        sx={{
          fontWeight: 500,
          '& .MuiChip-icon': {
            fontSize: size === 'small' ? 16 : 20,
          },
        }}
      />
    </Tooltip>
  );
};

/**
 * Payment Status Timeline Component
 * Shows the progression of statuses for a payment method
 */
interface PaymentStatusTimelineProps {
  paymentMethod: PaymentMethodType;
  currentStatus: PaymentStatus;
  compact?: boolean;
}

export const PaymentStatusTimeline: React.FC<PaymentStatusTimelineProps> = ({
  paymentMethod,
  currentStatus,
  compact = false,
}) => {
  const getStatusFlow = (method: PaymentMethodType): PaymentStatus[] => {
    switch (method) {
      case 'LC':
        return [
          'PENDING',
          'DOCUMENTS_SUBMITTED',
          'UNDER_VERIFICATION',
          'VERIFICATION_PASSED',
          'PAYMENT_AUTHORIZED',
          'SWIFT_INITIATED',
          'SWIFT_RECEIVED',
          'SETTLED',
          'DOCUMENTS_RELEASED',
        ];
      case 'CAD':
        return [
          'PENDING',
          'GOODS_SHIPPED',
          'DOCUMENTS_SENT_TO_BANK',
          'DOCUMENTS_FORWARDED',
          'BUYER_NOTIFIED',
          'PAYMENT_RECEIVED',
          'DOCUMENTS_RELEASED',
          'SETTLED',
        ];
      case 'TT_ADVANCE':
        return [
          'PENDING',
          'ADVANCE_REQUESTED',
          'ADVANCE_RECEIVED',
          'GOODS_SHIPPED',
          'BALANCE_REQUESTED',
          'BALANCE_RECEIVED',
          'SETTLED',
        ];
      case 'TT_POST':
        return [
          'PENDING',
          'GOODS_SHIPPED',
          'DOCUMENTS_SENT_DIRECTLY',
          'PAYMENT_AWAITED',
          'PAYMENT_RECEIVED',
          'SETTLED',
        ];
      case 'ADVANCE':
        return [
          'PENDING',
          'PROFORMA_ISSUED',
          'ADVANCE_RECEIVED',
          'CONTRACT_REGISTERED',
          'COFFEE_SOURCING',
          'QUALITY_INSPECTION',
          'GOODS_SHIPPED',
          'BALANCE_REQUESTED',
          'BALANCE_RECEIVED',
          'SETTLED',
        ];
      default:
        return ['PENDING', 'SETTLED'];
    }
  };

  const statusFlow = getStatusFlow(paymentMethod);
  const currentIndex = statusFlow.indexOf(currentStatus);

  if (compact) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {statusFlow.map((status, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          
          return (
            <React.Fragment key={status}>
              <PaymentStatusBadge
                status={status}
                paymentMethod={paymentMethod}
                showIcon={isCurrent}
                size="small"
              />
              {index < statusFlow.length - 1 && (
                <Box
                  sx={{
                    width: 20,
                    height: 2,
                    bgcolor: isPast ? 'success.main' : isFuture ? 'grey.300' : 'primary.main',
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {statusFlow.map((status, index) => {
        const isPast = index < currentIndex;
        const isCurrent = index === currentIndex;
        
        return (
          <Box
            key={status}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              opacity: isPast ? 0.6 : 1,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: isPast ? 'success.main' : isCurrent ? 'primary.main' : 'grey.300',
              }}
            />
            <PaymentStatusBadge
              status={status}
              paymentMethod={paymentMethod}
              showIcon={isCurrent}
            />
          </Box>
        );
      })}
    </Box>
  );
};

export default PaymentStatusBadge;
