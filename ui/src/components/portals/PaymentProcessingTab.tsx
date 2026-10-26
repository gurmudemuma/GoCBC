// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Payment Processing Tab - DEPRECATED
// This component has been replaced by UnifiedPaymentWorkflow

import React from 'react';

interface PaymentProcessingTabProps {
  contracts: any[];
  documentaryCollections: any[];
  advancePayments: any[];
  consignments: any[];
  pendingDocuments: any[];
  letterOfCredits: any[];
  onOpenDialog: (type: string, contract?: any) => void;
  onVerifyDocuments: (payment: any) => void;
  onViewDetails: (payment: any) => void;
}

/**
 * @deprecated This component has been replaced by UnifiedPaymentWorkflow.
 * It is kept only for backwards compatibility and returns null.
 */
export const PaymentProcessingTab: React.FC<PaymentProcessingTabProps> = () => {
  return null;
};
