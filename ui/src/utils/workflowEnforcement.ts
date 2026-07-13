/**
 * Ethiopian Coffee Export Consortium Blockchain System (CECBS)
 * Workflow Sequence Enforcement Utilities
 * 
 * Ensures that workflow steps can only be executed in the proper sequence
 * with all prerequisites met.
 */

// Shipment status constants
export const SHIPMENT_STATUS = {
  CREATED: 'CREATED',
  QUALITY_APPROVED: 'QUALITY_APPROVED',
  PERMIT_ISSUED: 'PERMIT_ISSUED',
  CUSTOMS_CLEARED: 'CUSTOMS_CLEARED',
  BOOKED: 'BOOKED',
  LOADED: 'LOADED',
  DEPARTED: 'DEPARTED',
  IN_TRANSIT: 'IN_TRANSIT',
  ARRIVED: 'ARRIVED',
  DELIVERED: 'DELIVERED',
} as const;

// Contract status constants
export const CONTRACT_STATUS = {
  REGISTERED: 'REGISTERED',
  PENDING: 'PENDING',
  NBE_APPROVED: 'NBE_APPROVED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  ACTIVE: 'ACTIVE',
} as const;

// LC status constants
export const LC_STATUS = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  ISSUED: 'ISSUED',
  UTILIZED: 'UTILIZED',
  EXPIRED: 'EXPIRED',
} as const;

// Payment status constants
export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  DOCUMENTS_SUBMITTED: 'DOCUMENTS_SUBMITTED',
  VERIFIED: 'VERIFIED',
  SWIFT_INITIATED: 'SWIFT_INITIATED',
  SWIFT_RECEIVED: 'SWIFT_RECEIVED',
  SETTLED: 'SETTLED',
} as const;

// Exporter license status
export const LICENSE_STATUS = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED',
} as const;

/**
 * Check if exporter can create a new contract
 */
export const canCreateContract = (licenseStatus: string, licenseExpiry: string): {
  allowed: boolean;
  reason?: string;
} => {
  // Check license status
  if (licenseStatus === LICENSE_STATUS.SUSPENDED) {
    return {
      allowed: false,
      reason: 'Your ECTA license is suspended. Contact ECTA to resolve compliance issues before creating contracts.',
    };
  }

  if (licenseStatus === LICENSE_STATUS.REVOKED) {
    return {
      allowed: false,
      reason: 'Your ECTA license has been revoked. You cannot create new contracts.',
    };
  }

  // Check license expiry
  if (licenseExpiry) {
    const expiryDate = new Date(licenseExpiry);
    const today = new Date();
    if (expiryDate < today) {
      return {
        allowed: false,
        reason: 'Your ECTA license has expired. Please renew your license before creating contracts.',
      };
    }
  }

  return { allowed: true };
};

/**
 * Check if LC can be requested for a contract
 */
export const canRequestLC = (contractStatus: string): {
  allowed: boolean;
  reason?: string;
} => {
  if (contractStatus !== CONTRACT_STATUS.NBE_APPROVED && contractStatus !== CONTRACT_STATUS.APPROVED) {
    return {
      allowed: false,
      reason: 'Contract must be NBE-approved before requesting Letter of Credit. Current status: ' + contractStatus,
    };
  }

  return { allowed: true };
};

/**
 * Check if shipment can be created
 * CORRECTED: LC is not mandatory for shipment creation in real world.
 * Exporter can buy coffee and prepare shipment before LC is issued.
 * LC is needed for PAYMENT, not for quality inspection.
 */
export const canCreateShipment = (
  contractStatus: string,
  licenseStatus?: string
): {
  allowed: boolean;
  reason?: string;
  warning?: string;
} => {
  // Check license
  if (licenseStatus === LICENSE_STATUS.SUSPENDED) {
    return {
      allowed: false,
      reason: 'Cannot create shipment. Your license is suspended.',
    };
  }

  // Check contract approval
  if (contractStatus !== CONTRACT_STATUS.NBE_APPROVED && contractStatus !== CONTRACT_STATUS.APPROVED) {
    return {
      allowed: false,
      reason: 'Contract must be NBE-approved before creating shipment. Current status: ' + contractStatus,
    };
  }

  // LC is not mandatory - can proceed without it
  // In real world: exporter buys coffee from ECX, gets it inspected, THEN LC comes for payment
  return { 
    allowed: true,
    warning: 'Ensure Letter of Credit is issued before shipping to guarantee payment.'
  };
};

/**
 * Check if quality inspection can be performed
 */
export const canInspectShipment = (shipmentStatus: string): {
  allowed: boolean;
  reason?: string;
} => {
  if (shipmentStatus !== SHIPMENT_STATUS.CREATED) {
    return {
      allowed: false,
      reason: 'Quality inspection can only be performed on newly created shipments. Current status: ' + shipmentStatus,
    };
  }

  return { allowed: true };
};

/**
 * Check if export permit can be issued
 */
export const canIssueExportPermit = (shipmentStatus: string): {
  allowed: boolean;
  reason?: string;
} => {
  if (shipmentStatus !== SHIPMENT_STATUS.QUALITY_APPROVED) {
    return {
      allowed: false,
      reason: 'Export permit can only be issued after quality approval. Current status: ' + shipmentStatus,
    };
  }

  return { allowed: true };
};

/**
 * Check if customs clearance can be processed
 */
export const canClearCustoms = (shipmentStatus: string): {
  allowed: boolean;
  reason?: string;
} => {
  if (shipmentStatus !== SHIPMENT_STATUS.PERMIT_ISSUED) {
    return {
      allowed: false,
      reason: 'Customs clearance requires an export permit. Current status: ' + shipmentStatus,
    };
  }

  return { allowed: true };
};

/**
 * Check if shipment can be loaded
 */
export const canLoadShipment = (shipmentStatus: string): {
  allowed: boolean;
  reason?: string;
} => {
  if (shipmentStatus !== SHIPMENT_STATUS.CUSTOMS_CLEARED) {
    return {
      allowed: false,
      reason: 'Shipment must be customs cleared before loading. Current status: ' + shipmentStatus,
    };
  }

  return { allowed: true };
};

/**
 * ⚠️ CRITICAL: Check if payment documents can be submitted
 * This is the most important validation in the entire workflow
 */
export const canSubmitPaymentDocuments = (
  shipmentStatus: string,
  lcExpiryDate?: string,
  shipmentDate?: string
): {
  allowed: boolean;
  reason?: string;
  warning?: string;
} => {
  // Must have departed
  if (shipmentStatus !== SHIPMENT_STATUS.DEPARTED && shipmentStatus !== SHIPMENT_STATUS.IN_TRANSIT) {
    return {
      allowed: false,
      reason: `Cannot submit payment documents yet. Shipment must depart from port first.\n\nCurrent Status: ${shipmentStatus}\nRequired Status: DEPARTED or IN_TRANSIT\n\nWait for:\n• Shipment loaded on vessel\n• Vessel departed from port\n• Bill of Lading issued`,
    };
  }

  // Check LC expiry
  if (lcExpiryDate) {
    const expiry = new Date(lcExpiryDate);
    const today = new Date();
    
    if (expiry < today) {
      return {
        allowed: false,
        reason: `Cannot submit payment documents. Letter of Credit has expired on ${expiry.toLocaleDateString()}.\n\nYou must:\n• Contact buyer to extend LC\n• Obtain buyer's authorization for late presentation\n• Work with bank to resolve payment`,
      };
    }

    // Warning if expiring soon (within 7 days)
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 7) {
      return {
        allowed: true,
        warning: `⚠️ URGENT: LC expires in ${daysUntilExpiry} day(s)!\n\nSubmit documents immediately to avoid:\n• Payment rejection\n• Late presentation fees\n• Additional buyer authorization required`,
      };
    }
  }

  // Check presentation period (21 days from shipment date)
  if (shipmentDate) {
    const shipDate = new Date(shipmentDate);
    const today = new Date();
    const daysSinceShipment = Math.ceil((today.getTime() - shipDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceShipment > 21) {
      return {
        allowed: false,
        reason: `Cannot submit payment documents. Presentation period has expired.\n\nShipment Date: ${shipDate.toLocaleDateString()}\nPresentation Deadline: ${new Date(shipDate.getTime() + 21 * 24 * 60 * 60 * 1000).toLocaleDateString()}\nDays Since Shipment: ${daysSinceShipment} days\n\nStandard LC terms require presentation within 21 days of shipment.\n\nContact your bank immediately for options.`,
      };
    }

    // Warning if approaching deadline (within 5 days)
    const daysRemaining = 21 - daysSinceShipment;
    if (daysRemaining <= 5) {
      return {
        allowed: true,
        warning: `⚠️ URGENT: Only ${daysRemaining} day(s) left to submit documents!\n\nPresentation Deadline: ${new Date(shipDate.getTime() + 21 * 24 * 60 * 60 * 1000).toLocaleDateString()}\n\nSubmit immediately to avoid late presentation issues.`,
      };
    }
  }

  return { allowed: true };
};

/**
 * Check if payment documents can be verified by bank
 */
export const canVerifyPaymentDocuments = (paymentStatus: string, lcExpiry?: string): {
  allowed: boolean;
  reason?: string;
} => {
  if (paymentStatus !== PAYMENT_STATUS.DOCUMENTS_SUBMITTED) {
    return {
      allowed: false,
      reason: 'Documents must be submitted before verification. Current status: ' + paymentStatus,
    };
  }

  // Check LC expiry
  if (lcExpiry) {
    const expiryDate = new Date(lcExpiry);
    const today = new Date();
    if (expiryDate < today) {
      return {
        allowed: false,
        reason: 'Cannot verify documents. LC has expired on ' + expiryDate.toLocaleDateString(),
      };
    }
  }

  return { allowed: true };
};

/**
 * Check if SWIFT payment can be initiated
 */
export const canInitiateSWIFT = (paymentStatus: string): {
  allowed: boolean;
  reason?: string;
} => {
  if (paymentStatus !== PAYMENT_STATUS.VERIFIED) {
    return {
      allowed: false,
      reason: 'Payment documents must be verified before initiating SWIFT transfer. Current status: ' + paymentStatus,
    };
  }

  return { allowed: true };
};

/**
 * Check if payment can be settled
 */
export const canSettlePayment = (paymentStatus: string): {
  allowed: boolean;
  reason?: string;
} => {
  if (paymentStatus !== PAYMENT_STATUS.SWIFT_RECEIVED) {
    return {
      allowed: false,
      reason: 'SWIFT message must be received before settling payment. Current status: ' + paymentStatus,
    };
  }

  return { allowed: true };
};

/**
 * Get user-friendly status message for current workflow stage
 */
export const getWorkflowStageMessage = (
  shipmentStatus: string,
  paymentStatus?: string
): string => {
  if (paymentStatus) {
    switch (paymentStatus) {
      case PAYMENT_STATUS.SETTLED:
        return '✅ Payment Complete - Export transaction finished successfully';
      case PAYMENT_STATUS.SWIFT_RECEIVED:
        return '💰 SWIFT Received - Bank is processing settlement';
      case PAYMENT_STATUS.SWIFT_INITIATED:
        return '📤 SWIFT Initiated - Payment in transit (2-5 business days)';
      case PAYMENT_STATUS.VERIFIED:
        return '✓ Documents Verified - Awaiting SWIFT payment from buyer\'s bank';
      case PAYMENT_STATUS.DOCUMENTS_SUBMITTED:
        return '📄 Documents Submitted - Bank is reviewing (5-7 business days)';
      case PAYMENT_STATUS.PENDING:
        return '⏳ Payment Pending - Submit documents after shipment departs';
    }
  }

  switch (shipmentStatus) {
    case SHIPMENT_STATUS.DELIVERED:
      return '✅ Delivered - Coffee received by buyer';
    case SHIPMENT_STATUS.ARRIVED:
      return '🏁 Arrived - Coffee at destination port';
    case SHIPMENT_STATUS.IN_TRANSIT:
      return '🚢 In Transit - Coffee en route to buyer';
    case SHIPMENT_STATUS.DEPARTED:
      return '⚓ Departed - Vessel left port. TIME TO SUBMIT PAYMENT DOCUMENTS!';
    case SHIPMENT_STATUS.LOADED:
      return '📦 Loaded - Coffee loaded on vessel, awaiting departure';
    case SHIPMENT_STATUS.BOOKED:
      return '📋 Booked - Container and vessel assigned';
    case SHIPMENT_STATUS.CUSTOMS_CLEARED:
      return '✓ Customs Cleared - Ready for shipment loading';
    case SHIPMENT_STATUS.PERMIT_ISSUED:
      return '✓ Permit Issued - Awaiting customs clearance';
    case SHIPMENT_STATUS.QUALITY_APPROVED:
      return '✓ Quality Approved - Awaiting export permit from ECTA';
    case SHIPMENT_STATUS.CREATED:
      return '📝 Created - Awaiting ECTA quality inspection';
    default:
      return 'Unknown status';
  }
};

/**
 * Calculate days remaining for critical deadlines
 */
export const getDeadlineInfo = (
  lcExpiryDate?: string,
  shipmentDate?: string
): {
  lcDaysRemaining?: number;
  lcExpired?: boolean;
  presentationDaysRemaining?: number;
  presentationExpired?: boolean;
  urgentAction?: boolean;
} => {
  const today = new Date();
  const result: any = {};

  if (lcExpiryDate) {
    const expiry = new Date(lcExpiryDate);
    result.lcDaysRemaining = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    result.lcExpired = result.lcDaysRemaining < 0;
    result.urgentAction = result.lcDaysRemaining > 0 && result.lcDaysRemaining <= 7;
  }

  if (shipmentDate) {
    const shipDate = new Date(shipmentDate);
    const daysSinceShipment = Math.ceil((today.getTime() - shipDate.getTime()) / (1000 * 60 * 60 * 24));
    result.presentationDaysRemaining = 21 - daysSinceShipment;
    result.presentationExpired = result.presentationDaysRemaining < 0;
    result.urgentAction = result.urgentAction || (result.presentationDaysRemaining > 0 && result.presentationDaysRemaining <= 5);
  }

  return result;
};

/**
 * Get required documents for current workflow stage
 */
export const getRequiredDocuments = (stage: 'registration' | 'contract' | 'shipment' | 'customs' | 'payment'): string[] => {
  switch (stage) {
    case 'registration':
      return [
        'Business License',
        'TIN Certificate',
        'Professional Taster Certificate',
        'Laboratory Facility Documents or Contract',
        'Capital Evidence (Bank Statement)',
        'Company Registration Certificate',
      ];
    
    case 'contract':
      return [
        'Sales Contract with Buyer (Signed)',
        'Buyer\'s Bank Details',
        'Pro Forma Invoice',
      ];
    
    case 'shipment':
      return [
        'ECX Purchase Receipt (if applicable)',
        'Warehouse Receipt',
        'ICO Certificate of Origin',
      ];
    
    case 'customs':
      return [
        'ECTA Export Permit',
        'Quality Certificate',
        'Sales Contract',
        'Commercial Invoice',
        'Packing List',
        'Certificate of Origin (ICO)',
        'Phytosanitary Certificate',
        'EUDR Due Diligence Statement (if EU)',
      ];
    
    case 'payment':
      return [
        '✅ Bill of Lading (B/L) - CRITICAL',
        '✅ Commercial Invoice',
        '✅ Certificate of Origin (ICO)',
        '✅ Quality Certificates (ECTA)',
        '✅ Phytosanitary Certificate',
        '✅ Packing List',
        '✅ Insurance Certificate (if required)',
        '✅ ECTA Export Permit',
        '✅ Customs Declaration',
        '✅ EUDR Statement (if EU destination)',
      ];
    
    default:
      return [];
  }
};

// ============================================================================
// PAYMENT METHOD WORKFLOW ENFORCEMENT
// Added: July 2026 - Payment method differentiation
// ============================================================================

export type PaymentMethod = 'LC' | 'CAD' | 'TT_ADVANCE' | 'TT_POST' | 'ADVANCE';

export const PAYMENT_METHODS = {
  LC: 'LC',
  CAD: 'CAD',
  TT_ADVANCE: 'TT_ADVANCE',
  TT_POST: 'TT_POST',
  ADVANCE: 'ADVANCE',
} as const;

/**
 * Check if LC is required for this payment method
 */
export const isLCRequired = (paymentMethod: PaymentMethod): boolean => {
  return paymentMethod === PAYMENT_METHODS.LC;
};

/**
 * Check if advance payment is required before shipment
 */
export const isAdvanceRequired = (paymentMethod: PaymentMethod): boolean => {
  return paymentMethod === PAYMENT_METHODS.TT_ADVANCE || paymentMethod === PAYMENT_METHODS.ADVANCE;
};

/**
 * Check if documents go through banks
 */
export const documentsViaBanks = (paymentMethod: PaymentMethod): boolean => {
  return paymentMethod === PAYMENT_METHODS.LC || paymentMethod === PAYMENT_METHODS.CAD;
};

/**
 * Get payment method workflow description
 */
export const getPaymentMethodWorkflow = (paymentMethod: PaymentMethod): {
  name: string;
  description: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'LOWEST';
  requiresLC: boolean;
  requiresAdvance: boolean;
  bankInvolvement: 'GUARANTEED' | 'FACILITATOR' | 'NONE';
  workflowSteps: string[];
} => {
  switch (paymentMethod) {
    case PAYMENT_METHODS.LC:
      return {
        name: 'Letter of Credit (LC)',
        description: 'Bank-guaranteed payment with UCP 600 compliance',
        riskLevel: 'LOW',
        requiresLC: true,
        requiresAdvance: false,
        bankInvolvement: 'GUARANTEED',
        workflowSteps: [
          '1. Contract NBE Approval',
          '2. Forex Request & Allocation',
          '3. LC Request → Approval → Issuance',
          '4. Shipment & Quality Inspection',
          '5. Customs Clearance',
          '6. Goods Shipped → Documents to Bank',
          '7. Bank Verifies Documents',
          '8. SWIFT Payment Initiated',
          '9. Payment Settlement & Forex Utilization',
        ],
      };

    case PAYMENT_METHODS.CAD:
      return {
        name: 'Cash Against Documents (CAD)',
        description: 'Payment through banks without guarantee (URC 522)',
        riskLevel: 'MEDIUM',
        requiresLC: false,
        requiresAdvance: false,
        bankInvolvement: 'FACILITATOR',
        workflowSteps: [
          '1. Contract NBE Approval',
          '2. Forex Request & Allocation',
          '3. Shipment & Quality Inspection',
          '4. Customs Clearance',
          '5. Goods Shipped → Documents to Exporter Bank',
          '6. Exporter Bank Forwards to Buyer Bank',
          '7. Buyer Notified → Payment Required',
          '8. Payment Received → Documents Released',
          '9. Settlement & Forex Utilization',
        ],
      };

    case PAYMENT_METHODS.TT_ADVANCE:
      return {
        name: 'Telegraphic Transfer - Advance',
        description: 'Partial payment before shipment via wire transfer',
        riskLevel: 'LOW',
        requiresLC: false,
        requiresAdvance: true,
        bankInvolvement: 'NONE',
        workflowSteps: [
          '1. Contract NBE Approval',
          '2. Advance Payment Requested (30-50%)',
          '3. Advance Received → Forex Request',
          '4. Forex Allocation',
          '5. Shipment & Quality Inspection',
          '6. Customs Clearance',
          '7. Goods Shipped → Documents Sent Directly',
          '8. Balance Payment Received',
          '9. Settlement & Forex Utilization',
        ],
      };

    case PAYMENT_METHODS.TT_POST:
      return {
        name: 'Telegraphic Transfer - Post-Shipment',
        description: 'Payment after shipment via wire transfer',
        riskLevel: 'HIGH',
        requiresLC: false,
        requiresAdvance: false,
        bankInvolvement: 'NONE',
        workflowSteps: [
          '1. Contract NBE Approval',
          '2. Forex Request & Allocation',
          '3. Shipment & Quality Inspection',
          '4. Customs Clearance',
          '5. Goods Shipped → Documents Sent Directly',
          '6. Await Payment from Buyer',
          '7. Payment Received via SWIFT',
          '8. Settlement & Forex Utilization',
        ],
      };

    case PAYMENT_METHODS.ADVANCE:
      return {
        name: 'Advance Payment (Pre-Production)',
        description: 'Payment before production starts',
        riskLevel: 'LOWEST',
        requiresLC: false,
        requiresAdvance: true,
        bankInvolvement: 'NONE',
        workflowSteps: [
          '1. Proforma Invoice Issued',
          '2. Advance Payment Received (40-100%)',
          '3. Contract Registration',
          '4. Contract NBE Approval',
          '5. Forex Request & Allocation',
          '6. Coffee Sourcing from Farmers',
          '7. Quality Inspection at Warehouse',
          '8. Shipment & Customs Clearance',
          '9. Goods Shipped → Balance Payment (if any)',
          '10. Settlement & Forex Utilization',
        ],
      };

    default:
      return {
        name: 'Unknown',
        description: 'Unknown payment method',
        riskLevel: 'HIGH',
        requiresLC: false,
        requiresAdvance: false,
        bankInvolvement: 'NONE',
        workflowSteps: [],
      };
  }
};

/**
 * Check if LC request is allowed for this payment method
 */
export const canRequestLCForPaymentMethod = (
  paymentMethod: PaymentMethod,
  contractStatus: string
): {
  allowed: boolean;
  reason?: string;
} => {
  // Only LC payment method requires LC
  if (!isLCRequired(paymentMethod)) {
    return {
      allowed: false,
      reason: `LC not required for ${paymentMethod} payment method. This contract uses direct payment without bank guarantee.`,
    };
  }

  // Standard LC validation
  return canRequestLC(contractStatus);
};

/**
 * Check if shipment can be created based on payment method requirements
 */
export const canCreateShipmentForPaymentMethod = (
  paymentMethod: PaymentMethod,
  contractStatus: string,
  advancePaymentReceived: boolean,
  lcStatus?: string,
  licenseStatus?: string
): {
  allowed: boolean;
  reason?: string;
  warning?: string;
} => {
  // Check basic contract approval
  if (contractStatus !== CONTRACT_STATUS.NBE_APPROVED && contractStatus !== CONTRACT_STATUS.APPROVED) {
    return {
      allowed: false,
      reason: 'Contract must be NBE-approved before creating shipment. Current status: ' + contractStatus,
    };
  }

  // Check license
  if (licenseStatus === LICENSE_STATUS.SUSPENDED) {
    return {
      allowed: false,
      reason: 'Cannot create shipment. Your license is suspended.',
    };
  }

  // TT_ADVANCE and ADVANCE require advance payment first
  if (isAdvanceRequired(paymentMethod) && !advancePaymentReceived) {
    return {
      allowed: false,
      reason: `${paymentMethod} payment method requires advance payment before shipment. Wait for buyer to send advance payment (30-50% of contract value).`,
    };
  }

  // LC method - recommend LC but don't block (exporter might source coffee first)
  if (isLCRequired(paymentMethod) && (!lcStatus || lcStatus === LC_STATUS.REQUESTED)) {
    return {
      allowed: true,
      warning: 'LC not yet issued. Ensure LC is issued before shipping to guarantee payment.',
    };
  }

  return { allowed: true };
};

/**
 * Get payment instructions based on payment method
 */
export const getPaymentInstructions = (
  paymentMethod: PaymentMethod,
  currentStage: 'contract' | 'forex' | 'lc' | 'shipment' | 'customs' | 'documents' | 'payment'
): string => {
  const instructions: Record<PaymentMethod, Record<string, string>> = {
    LC: {
      contract: '✓ Contract approved. Next: Request forex allocation from NBE.',
      forex: '✓ Forex allocated. Next: Request Letter of Credit from bank.',
      lc: '✓ LC issued by bank. Next: Source coffee and create shipment.',
      shipment: '✓ Shipment created. Next: Get quality inspection and customs clearance.',
      customs: '✓ Customs cleared. Next: Ship goods and submit documents to bank within 21 days.',
      documents: '⏳ Documents with bank for verification. Wait 5-7 business days.',
      payment: '💰 Payment processing via SWIFT. Funds arrive in 2-5 business days.',
    },
    CAD: {
      contract: '✓ Contract approved. Next: Request forex allocation from NBE.',
      forex: '✓ Forex allocated. Next: Source coffee and create shipment (no LC needed).',
      lc: 'N/A - CAD does not use Letter of Credit',
      shipment: '✓ Shipment created. Next: Get quality inspection and customs clearance.',
      customs: '✓ Customs cleared. Next: Ship goods and send documents to your bank.',
      documents: '📄 Bank forwards documents to buyer\'s bank. Buyer pays to receive documents.',
      payment: '💰 Payment received. Documents released to buyer for cargo pickup.',
    },
    TT_ADVANCE: {
      contract: '✓ Contract approved. Next: Request advance payment (30-50%) from buyer.',
      forex: '✓ Advance received. Request forex allocation from NBE.',
      lc: 'N/A - TT Advance uses direct wire transfer',
      shipment: '✓ Shipment created with advance payment. Next: Quality inspection and customs.',
      customs: '✓ Customs cleared. Next: Ship goods and send documents directly to buyer.',
      documents: '📄 Documents sent directly to buyer. No bank involvement.',
      payment: '💰 Awaiting balance payment (50-70%) from buyer after shipment.',
    },
    TT_POST: {
      contract: '✓ Contract approved. Next: Request forex allocation from NBE.',
      forex: '✓ Forex allocated. Next: Source coffee and create shipment.',
      lc: 'N/A - TT Post uses direct wire transfer after shipment',
      shipment: '✓ Shipment created. Next: Quality inspection and customs clearance.',
      customs: '✓ Customs cleared. Next: Ship goods and send documents to buyer.',
      documents: '📄 Documents sent directly to buyer. Awaiting payment confirmation.',
      payment: '⚠️ HIGH RISK: Payment depends entirely on buyer trust. No bank guarantee.',
    },
    ADVANCE: {
      contract: '⏳ Awaiting advance payment (40-100%) before contract registration.',
      forex: '✓ Advance received. Contract registered. Request forex allocation from NBE.',
      lc: 'N/A - Advance Payment method does not use LC',
      shipment: '✓ Coffee sourced and inspected. Next: Create shipment and customs clearance.',
      customs: '✓ Customs cleared. Next: Ship goods to buyer.',
      documents: '📄 Documents sent directly. Balance payment (if any) expected.',
      payment: '💰 Lowest risk method. Payment received before production started.',
    },
  };

  return instructions[paymentMethod]?.[currentStage] || 'Follow standard export procedure.';
};
