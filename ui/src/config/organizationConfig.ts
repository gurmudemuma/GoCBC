// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Organization-Specific Configuration - Dropdowns, Lists, and Business Rules

/**
 * ECTA - Ethiopian Coffee & Tea Authority
 * Responsible for: Quality control, export permits, phytosanitary certificates, exporter licensing
 */
export const ECTA_CONFIG = {
  roles: [
    { value: 'ECTA', label: 'ECTA Portal Administrator', description: 'Full access to ECTA portal and user management' },
    { value: 'Quality Inspector', label: 'Quality Inspector', description: 'Conducts coffee quality inspections' },
    { value: 'Lab Analyst', label: 'Lab Analyst', description: 'Laboratory testing and analysis' },
    { value: 'Phytosanitary Officer', label: 'Phytosanitary Officer', description: 'Issues phytosanitary certificates' },
    { value: 'License Officer', label: 'License Officer', description: 'Manages exporter licenses' },
    { value: 'Permit Officer', label: 'Permit Officer', description: 'Issues export permits' },
    { value: 'ECTA Officer', label: 'ECTA Officer', description: 'General ECTA operations' },
  ],
  
  coffeeGrades: [
    { value: 'Grade 1', label: 'Grade 1', points: '≤3 defects' },
    { value: 'Grade 2', label: 'Grade 2', points: '4-12 defects' },
    { value: 'Grade 3', label: 'Grade 3', points: '13-25 defects' },
    { value: 'Grade 4', label: 'Grade 4', points: '26-45 defects' },
    { value: 'Grade 5', label: 'Grade 5', points: '46-86 defects' },
    { value: 'UG', label: 'Under Grade', points: '>86 defects' },
  ],
  
  processingMethods: [
    { value: 'Washed', label: 'Washed (Wet Processed)' },
    { value: 'Natural', label: 'Natural (Dry Processed)' },
    { value: 'Honey', label: 'Honey Processed' },
    { value: 'Semi-Washed', label: 'Semi-Washed' },
  ],
  
  coffeeOrigins: [
    { value: 'Yirgacheffe', label: 'Yirgacheffe', region: 'SNNPR' },
    { value: 'Sidama', label: 'Sidama', region: 'Sidama' },
    { value: 'Guji', label: 'Guji', region: 'Oromia' },
    { value: 'Harar', label: 'Harar', region: 'Harari' },
    { value: 'Limu', label: 'Limu', region: 'Oromia' },
    { value: 'Jimma', label: 'Jimma', region: 'Oromia' },
    { value: 'Lekempti', label: 'Lekempti', region: 'Oromia' },
    { value: 'Nekemte', label: 'Nekemte', region: 'Oromia' },
    { value: 'Bebeka', label: 'Bebeka', region: 'SNNPR' },
  ],
  
  certificationTypes: [
    { value: 'Organic', label: 'Organic Certification' },
    { value: 'Fair Trade', label: 'Fair Trade Certification' },
    { value: 'Rainforest Alliance', label: 'Rainforest Alliance' },
    { value: 'UTZ', label: 'UTZ Certified' },
    { value: 'C.A.F.E. Practices', label: 'Starbucks C.A.F.E. Practices' },
  ],
  
  inspectionStatuses: [
    { value: 'SCHEDULED', label: 'Scheduled', color: 'info' },
    { value: 'IN_PROGRESS', label: 'In Progress', color: 'warning' },
    { value: 'PASSED', label: 'Passed', color: 'success' },
    { value: 'FAILED', label: 'Failed', color: 'error' },
    { value: 'RETEST', label: 'Retest Required', color: 'warning' },
  ],
};

/**
 * ECX - Ethiopian Commodity Exchange
 * Responsible for: Trading platform, warehouse management, grading, lot assignment
 */
export const ECX_CONFIG = {
  roles: [
    { value: 'ECX', label: 'ECX Portal Administrator', description: 'Full access to ECX portal and user management' },
    { value: 'Grading Officer', label: 'Grading Officer', description: 'Grades coffee lots' },
    { value: 'Warehouse Officer', label: 'Warehouse Officer', description: 'Warehouse management' },
    { value: 'Registration Officer', label: 'Registration Officer', description: 'Contract registration' },
    { value: 'Release Officer', label: 'Release Officer', description: 'Authorizes lot releases' },
    { value: 'ECX Officer', label: 'ECX Officer', description: 'General ECX operations' },
  ],
  
  warehouses: [
    { value: 'WH-ADDIS-01', label: 'Addis Ababa Warehouse 1', capacity: 5000, location: 'Addis Ababa' },
    { value: 'WH-ADDIS-02', label: 'Addis Ababa Warehouse 2', capacity: 3000, location: 'Addis Ababa' },
    { value: 'WH-DIREDAWA', label: 'Dire Dawa Warehouse', capacity: 2000, location: 'Dire Dawa' },
    { value: 'WH-HAWASSA', label: 'Hawassa Warehouse', capacity: 2500, location: 'Hawassa' },
    { value: 'WH-JIMMA', label: 'Jimma Warehouse', capacity: 1500, location: 'Jimma' },
  ],
  
  lotStatuses: [
    { value: 'WAREHOUSED', label: 'Warehoused', color: 'default', description: 'Received at warehouse' },
    { value: 'GRADED', label: 'Graded', color: 'info', description: 'Quality grade assigned' },
    { value: 'ASSIGNED', label: 'Assigned to Contract', color: 'primary', description: 'Linked to sale' },
    { value: 'RELEASED', label: 'Released', color: 'success', description: 'Released to exporter' },
    { value: 'REJECTED', label: 'Rejected', color: 'error', description: 'Failed quality standards' },
  ],
  
  harvestSeasons: [
    { value: '2024/2025', label: '2024/2025 Season' },
    { value: '2025/2026', label: '2025/2026 Season' },
    { value: '2026/2027', label: '2026/2027 Season' },
  ],
};

/**
 * NBE - National Bank of Ethiopia
 * Responsible for: Foreign exchange allocation, compliance verification, payment monitoring
 */
export const NBE_CONFIG = {
  roles: [
    { value: 'NBE', label: 'NBE Portal Administrator', description: 'Full access to NBE portal and user management' },
    { value: 'NBE Officer', label: 'NBE Officer', description: 'General NBE operations' },
    { value: 'Forex Officer', label: 'Forex Officer', description: 'Foreign exchange allocation' },
    { value: 'Screening Officer', label: 'Screening Officer', description: 'Franco Valuta screening' },
    { value: 'Compliance Officer', label: 'Compliance Officer', description: 'Regulatory compliance' },
    { value: 'Exchange Rate Officer', label: 'Exchange Rate Officer', description: 'Exchange rate management' },
    { value: 'Settlement Officer', label: 'Settlement Officer', description: 'Payment settlement' },
  ],
  
  forexStatuses: [
    { value: 'REQUESTED', label: 'Requested', color: 'default' },
    { value: 'UNDER_REVIEW', label: 'Under Review', color: 'info' },
    { value: 'ALLOCATED', label: 'Allocated', color: 'success' },
    { value: 'UTILIZED', label: 'Utilized', color: 'primary' },
    { value: 'EXPIRED', label: 'Expired', color: 'error' },
    { value: 'REJECTED', label: 'Rejected', color: 'error' },
  ],
  
  currencies: [
    { value: 'USD', label: 'US Dollar (USD)', symbol: '$' },
    { value: 'EUR', label: 'Euro (EUR)', symbol: '€' },
    { value: 'GBP', label: 'British Pound (GBP)', symbol: '£' },
    { value: 'ETB', label: 'Ethiopian Birr (ETB)', symbol: 'Br' },
  ],
  
  retentionRates: [
    { value: 0, label: '0% (Full Retention)', description: 'Keep all forex earnings' },
    { value: 10, label: '10%', description: '10% surrendered to NBE' },
    { value: 20, label: '20%', description: '20% surrendered to NBE' },
    { value: 30, label: '30%', description: '30% surrendered to NBE' },
  ],
  
  complianceTypes: [
    { value: 'FRANCO_VALUTA', label: 'Franco Valuta (90% Policy)' },
    { value: 'MINIMUM_PRICE', label: 'Minimum Price Compliance' },
    { value: 'EXCHANGE_RATE', label: 'Exchange Rate Compliance' },
    { value: 'REPATRIATION', label: 'Forex Repatriation' },
  ],
};

/**
 * BANKS - Commercial Banks
 * Responsible for: Letter of credit issuance, payment processing, advance payments, collections
 */
export const BANKS_CONFIG = {
  roles: [
    { value: 'BANKS', label: 'Banks Portal Administrator', description: 'Full access to Banks portal and user management' },
    { value: 'Bank Officer', label: 'Bank Officer', description: 'General banking operations' },
    { value: 'Branch Manager', label: 'Branch Manager', description: 'Branch management' },
    { value: 'Trade Finance Officer', label: 'Trade Finance Officer', description: 'Trade finance specialist' },
    { value: 'Credit Analyst', label: 'Credit Analyst', description: 'Credit risk analysis' },
    { value: 'Forex Officer', label: 'Forex Officer', description: 'Foreign exchange desk' },
    { value: 'Compliance Officer', label: 'Compliance Officer', description: 'Bank compliance' },
    { value: 'LC Officer', label: 'LC Officer', description: 'Letter of Credit specialist' },
  ],
  
  bankNames: [
    { value: 'Commercial Bank of Ethiopia', label: 'Commercial Bank of Ethiopia (CBE)', code: 'CBE' },
    { value: 'Awash International Bank', label: 'Awash International Bank', code: 'AIB' },
    { value: 'Dashen Bank', label: 'Dashen Bank S.C.', code: 'DSH' },
    { value: 'Bank of Abyssinia', label: 'Bank of Abyssinia', code: 'BOA' },
    { value: 'Wegagen Bank', label: 'Wegagen Bank S.C.', code: 'WGB' },
    { value: 'United Bank', label: 'United Bank S.C.', code: 'UNB' },
    { value: 'Nib International Bank', label: 'Nib International Bank', code: 'NIB' },
    { value: 'Cooperative Bank of Oromia', label: 'Cooperative Bank of Oromia', code: 'CBO' },
  ],
  
  lcTypes: [
    { value: 'SIGHT', label: 'Sight LC', description: 'Payment on presentation' },
    { value: 'USANCE', label: 'Usance LC', description: 'Deferred payment' },
    { value: 'TRANSFERABLE', label: 'Transferable LC', description: 'Can be transferred' },
    { value: 'CONFIRMED', label: 'Confirmed LC', description: 'Bank confirmed' },
    { value: 'REVOLVING', label: 'Revolving LC', description: 'Multiple shipments' },
  ],
  
  lcStatuses: [
    { value: 'REQUESTED', label: 'Requested', color: 'default' },
    { value: 'UNDER_REVIEW', label: 'Under Review', color: 'info' },
    { value: 'APPROVED', label: 'Approved', color: 'primary' },
    { value: 'ISSUED', label: 'Issued', color: 'success' },
    { value: 'AMENDED', label: 'Amended', color: 'warning' },
    { value: 'UTILIZED', label: 'Utilized', color: 'success' },
    { value: 'EXPIRED', label: 'Expired', color: 'error' },
    { value: 'REJECTED', label: 'Rejected', color: 'error' },
  ],
  
  paymentTerms: [
    { value: 'AT_SIGHT', label: 'At Sight' },
    { value: '30_DAYS', label: '30 Days' },
    { value: '60_DAYS', label: '60 Days' },
    { value: '90_DAYS', label: '90 Days' },
    { value: '120_DAYS', label: '120 Days' },
  ],
};

/**
 * CUSTOMS - Ethiopian Customs Commission
 * Responsible for: Declaration processing, inspection, clearance, duty assessment
 */
export const CUSTOMS_CONFIG = {
  roles: [
    { value: 'CUSTOMS', label: 'Customs Portal Administrator', description: 'Full access to Customs portal and user management' },
    { value: 'Customs Officer', label: 'Customs Officer', description: 'General customs operations' },
    { value: 'Inspection Officer', label: 'Inspection Officer', description: 'Physical inspections' },
    { value: 'Clearance Officer', label: 'Clearance Officer', description: 'Clearance processing' },
    { value: 'Risk Analyst', label: 'Risk Analyst', description: 'Risk assessment' },
    { value: 'ASYCUDA Officer', label: 'ASYCUDA Officer', description: 'ASYCUDA system operator' },
    { value: 'Duty Assessment Officer', label: 'Duty Assessment Officer', description: 'Duty calculation' },
  ],
  
  declarationTypes: [
    { value: 'STANDARD', label: 'Standard Declaration', description: 'Normal export procedure' },
    { value: 'SIMPLIFIED', label: 'Simplified Declaration', description: 'Expedited processing' },
    { value: 'EUDR_ENHANCED', label: 'EUDR Enhanced', description: 'EU Deforestation Regulation' },
  ],
  
  declarationStatuses: [
    { value: 'SUBMITTED', label: 'Submitted', color: 'default' },
    { value: 'UNDER_REVIEW', label: 'Under Review', color: 'info' },
    { value: 'UNDER_INSPECTION', label: 'Under Inspection', color: 'warning' },
    { value: 'CLEARED', label: 'Cleared', color: 'success' },
    { value: 'HELD', label: 'Held', color: 'error' },
    { value: 'REJECTED', label: 'Rejected', color: 'error' },
  ],
  
  hsCodes: [
    { value: '0901.11', label: '0901.11 - Coffee, not roasted, not decaffeinated' },
    { value: '0901.12', label: '0901.12 - Coffee, not roasted, decaffeinated' },
    { value: '0901.21', label: '0901.21 - Coffee, roasted, not decaffeinated' },
    { value: '0901.22', label: '0901.22 - Coffee, roasted, decaffeinated' },
  ],
  
  inspectionTypes: [
    { value: 'DOCUMENTARY', label: 'Documentary Check', description: 'Document verification only' },
    { value: 'PHYSICAL', label: 'Physical Inspection', description: 'Physical cargo inspection' },
    { value: 'FULL', label: 'Full Inspection', description: 'Complete examination' },
    { value: 'RANDOM', label: 'Random Sampling', description: 'Random sample check' },
  ],
  
  exitPoints: [
    { value: 'Djibouti Port', label: 'Djibouti Port (Sea)', type: 'SEA' },
    { value: 'Berbera Port', label: 'Berbera Port (Sea)', type: 'SEA' },
    { value: 'Addis Ababa Airport', label: 'Addis Ababa Bole International Airport', type: 'AIR' },
    { value: 'Mombasa Port', label: 'Mombasa Port (via Kenya)', type: 'SEA' },
  ],
};

/**
 * SHIPPING - Logistics & Shipping Companies
 * Responsible for: Shipment creation, tracking, transport documentation, container management
 */
export const SHIPPING_CONFIG = {
  roles: [
    { value: 'SHIPPING', label: 'Shipping Portal Administrator', description: 'Full access to Shipping portal and user management' },
    { value: 'Logistics Officer', label: 'Logistics Officer', description: 'Logistics coordination' },
    { value: 'Documentation Officer', label: 'Documentation Officer', description: 'Shipping documentation' },
    { value: 'Operations Manager', label: 'Operations Manager', description: 'Operations management' },
    { value: 'Shipping Coordinator', label: 'Shipping Coordinator', description: 'Shipment coordination' },
    { value: 'Freight Forwarder', label: 'Freight Forwarder', description: 'Freight forwarding' },
  ],
  
  transportModes: [
    { value: 'SEA', label: 'Sea Freight', icon: 'DirectionsBoat' },
    { value: 'AIR', label: 'Air Freight', icon: 'FlightTakeoff' },
    { value: 'LAND', label: 'Land Transport', icon: 'LocalShipping' },
  ],
  
  shippingLines: [
    // Sea freight carriers
    { value: 'Maersk', label: 'Maersk Line', type: 'SEA' },
    { value: 'MSC', label: 'Mediterranean Shipping Company (MSC)', type: 'SEA' },
    { value: 'CMA CGM', label: 'CMA CGM', type: 'SEA' },
    { value: 'Hapag-Lloyd', label: 'Hapag-Lloyd', type: 'SEA' },
    { value: 'COSCO', label: 'COSCO Shipping', type: 'SEA' },
    // Air freight carriers
    { value: 'Ethiopian Airlines Cargo', label: 'Ethiopian Airlines Cargo', type: 'AIR' },
    { value: 'Emirates SkyCargo', label: 'Emirates SkyCargo', type: 'AIR' },
    { value: 'Turkish Cargo', label: 'Turkish Cargo', type: 'AIR' },
    { value: 'Qatar Airways Cargo', label: 'Qatar Airways Cargo', type: 'AIR' },
  ],
  
  containerTypes: [
    { value: 'DRY', label: '20ft Dry Container', capacity: '33 CBM' },
    { value: 'DRY_40', label: '40ft Dry Container', capacity: '67 CBM' },
    { value: 'REEFER', label: '20ft Reefer (Temperature Controlled)', capacity: '28 CBM' },
    { value: 'REEFER_40', label: '40ft Reefer', capacity: '60 CBM' },
    { value: 'OPEN_TOP', label: 'Open Top Container', capacity: 'Varies' },
  ],
  
  shipmentStatuses: [
    { value: 'CUSTOMS_CLEARED', label: 'Customs Cleared', color: 'default', step: 1 },
    { value: 'LAND_TRANSPORT', label: 'Land Transport to Port', color: 'info', step: 2 },
    { value: 'PORT_ARRIVED', label: 'Arrived at Port/Airport', color: 'info', step: 3 },
    { value: 'CONTAINER_STUFFED', label: 'Container Stuffed', color: 'primary', step: 4 },
    { value: 'VESSEL_LOADED', label: 'Loaded on Vessel/Aircraft', color: 'primary', step: 5 },
    { value: 'DEPARTED', label: 'Departed', color: 'warning', step: 6 },
    { value: 'IN_TRANSIT', label: 'In Transit', color: 'warning', step: 7 },
    { value: 'DESTINATION_ARRIVED', label: 'Arrived at Destination', color: 'success', step: 8 },
    { value: 'DELIVERED', label: 'Delivered', color: 'success', step: 9 },
  ],
  
  ports: [
    { value: 'Djibouti', label: 'Port of Djibouti', country: 'Djibouti', type: 'SEA' },
    { value: 'Berbera', label: 'Port of Berbera', country: 'Somaliland', type: 'SEA' },
    { value: 'Mombasa', label: 'Port of Mombasa', country: 'Kenya', type: 'SEA' },
    { value: 'Addis Ababa', label: 'Addis Ababa Bole Airport', country: 'Ethiopia', type: 'AIR' },
  ],
};

/**
 * EXPORTER - Coffee Exporters
 * Responsible for: Contract creation, document submission, tracking own shipments
 */
export const EXPORTER_CONFIG = {
  contractStatuses: [
    { value: 'DRAFT', label: 'Draft', color: 'default', description: 'Being prepared' },
    { value: 'REGISTERED', label: 'Registered with NBE', color: 'info', description: 'NBE registration complete' },
    { value: 'NBE_APPROVED', label: 'NBE Approved', color: 'primary', description: 'Approved by NBE' },
    { value: 'ACTIVE', label: 'Active', color: 'success', description: 'Contract active' },
    { value: 'COMPLETED', label: 'Completed', color: 'success', description: 'Fully executed' },
    { value: 'CANCELLED', label: 'Cancelled', color: 'error', description: 'Contract cancelled' },
  ],
  
  documentTypes: [
    { value: 'COMMERCIAL_INVOICE', label: 'Commercial Invoice', required: true },
    { value: 'PACKING_LIST', label: 'Packing List', required: true },
    { value: 'CERTIFICATE_OF_ORIGIN', label: 'Certificate of Origin', required: true },
    { value: 'QUALITY_CERTIFICATE', label: 'Quality Certificate (ECTA)', required: true },
    { value: 'PHYTOSANITARY', label: 'Phytosanitary Certificate', required: true },
    { value: 'EXPORT_PERMIT', label: 'Export Permit', required: true },
    { value: 'FUMIGATION', label: 'Fumigation Certificate', required: false },
    { value: 'ICO_CERTIFICATE', label: 'ICO Certificate of Origin', required: false },
    { value: 'WEIGHT_NOTE', label: 'Weight Note', required: false },
  ],
  
  buyerCountries: [
    { value: 'United States', label: 'United States', region: 'North America' },
    { value: 'Germany', label: 'Germany', region: 'Europe' },
    { value: 'Belgium', label: 'Belgium', region: 'Europe' },
    { value: 'Italy', label: 'Italy', region: 'Europe' },
    { value: 'Japan', label: 'Japan', region: 'Asia' },
    { value: 'Saudi Arabia', label: 'Saudi Arabia', region: 'Middle East' },
    { value: 'South Korea', label: 'South Korea', region: 'Asia' },
    { value: 'France', label: 'France', region: 'Europe' },
    { value: 'Netherlands', label: 'Netherlands', region: 'Europe' },
    { value: 'United Kingdom', label: 'United Kingdom', region: 'Europe' },
  ],
};

/**
 * ADMIN - Super Administrator
 * Full system access across all organizations
 */
export const ADMIN_CONFIG = {
  allRoles: [
    // ADMIN roles
    { value: 'ADMIN', label: 'Super Administrator', organization: 'ADMIN' },
    
    // ECTA roles
    ...ECTA_CONFIG.roles.map(r => ({ ...r, organization: 'ECTA' })),
    
    // ECX roles
    ...ECX_CONFIG.roles.map(r => ({ ...r, organization: 'ECX' })),
    
    // NBE roles
    ...NBE_CONFIG.roles.map(r => ({ ...r, organization: 'NBE' })),
    
    // Banks roles
    ...BANKS_CONFIG.roles.map(r => ({ ...r, organization: 'BANKS' })),
    
    // Customs roles
    ...CUSTOMS_CONFIG.roles.map(r => ({ ...r, organization: 'CUSTOMS' })),
    
    // Shipping roles
    ...SHIPPING_CONFIG.roles.map(r => ({ ...r, organization: 'SHIPPING' })),
  ],
  
  organizations: [
    { value: 'ADMIN', label: 'System Administration', color: '#1976d2' },
    { value: 'ECTA', label: 'Ethiopian Coffee & Tea Authority', color: '#1976d2' },
    { value: 'ECX', label: 'Ethiopian Commodity Exchange', color: '#388e3c' },
    { value: 'NBE', label: 'National Bank of Ethiopia', color: '#d32f2f' },
    { value: 'BANKS', label: 'Commercial Banks', color: '#f57c00' },
    { value: 'CUSTOMS', label: 'Ethiopian Customs', color: '#7b1fa2' },
    { value: 'SHIPPING', label: 'Shipping & Logistics', color: '#0097a7' },
    { value: 'EXPORTER', label: 'Coffee Exporters', color: '#689f38' },
  ],
};

// Helper function to get role options by organization
export const getRolesByOrganization = (organization: string) => {
  // Normalize organization name
  const normalizeOrg = (org: string): string => {
    if (!org) return '';
    const normalized = org.toUpperCase().replace(/MSP$/i, '').replace(/[^A-Z0-9]/g, '');
    
    // Handle various organization name formats
    if (normalized.includes('ECTA') || normalized.includes('COFFEEANDTEA') || normalized.includes('COFFEETEA')) {
      return 'ECTA';
    }
    if (normalized.includes('ECX') || normalized.includes('COMMODITY') || normalized.includes('EXCHANGE')) {
      return 'ECX';
    }
    if (normalized.includes('NBE') || normalized.includes('NATIONALBANK')) {
      return 'NBE';
    }
    if (normalized.includes('BANK') || normalized.includes('CBE') || normalized.includes('COMMERCIAL')) {
      return 'BANKS';
    }
    if (normalized.includes('CUSTOMS')) {
      return 'CUSTOMS';
    }
    if (normalized.includes('SHIPPING') || normalized.includes('LOGISTICS')) {
      return 'SHIPPING';
    }
    if (normalized.includes('EXPORTER')) {
      return 'EXPORTER';
    }
    if (normalized.includes('ADMIN')) {
      return 'ADMIN';
    }
    
    return normalized;
  };

  const orgKey = normalizeOrg(organization);
  
  switch (orgKey) {
    case 'ECTA':
      return ECTA_CONFIG.roles;
    case 'ECX':
      return ECX_CONFIG.roles;
    case 'NBE':
      return NBE_CONFIG.roles;
    case 'BANKS':
      return BANKS_CONFIG.roles;
    case 'CUSTOMS':
      return CUSTOMS_CONFIG.roles;
    case 'SHIPPING':
      return SHIPPING_CONFIG.roles;
    case 'ADMIN':
      return ADMIN_CONFIG.allRoles;
    default:
      // If no match, return empty array
      console.warn(`No roles found for organization: ${organization} (normalized to: ${orgKey})`);
      return [];
  }
};

// Helper function to get config by organization
export const getConfigByOrganization = (organization: string) => {
  // Normalize organization name
  const normalizeOrg = (org: string): string => {
    if (!org) return '';
    const normalized = org.toUpperCase().replace(/MSP$/i, '').replace(/[^A-Z0-9]/g, '');
    
    if (normalized.includes('ECTA') || normalized.includes('COFFEEANDTEA') || normalized.includes('COFFEETEA')) {
      return 'ECTA';
    }
    if (normalized.includes('ECX') || normalized.includes('COMMODITY') || normalized.includes('EXCHANGE')) {
      return 'ECX';
    }
    if (normalized.includes('NBE') || normalized.includes('NATIONALBANK')) {
      return 'NBE';
    }
    if (normalized.includes('BANK') || normalized.includes('CBE') || normalized.includes('COMMERCIAL')) {
      return 'BANKS';
    }
    if (normalized.includes('CUSTOMS')) {
      return 'CUSTOMS';
    }
    if (normalized.includes('SHIPPING') || normalized.includes('LOGISTICS')) {
      return 'SHIPPING';
    }
    if (normalized.includes('EXPORTER')) {
      return 'EXPORTER';
    }
    if (normalized.includes('ADMIN')) {
      return 'ADMIN';
    }
    
    return normalized;
  };

  const orgKey = normalizeOrg(organization);
  
  switch (orgKey) {
    case 'ECTA':
      return ECTA_CONFIG;
    case 'ECX':
      return ECX_CONFIG;
    case 'NBE':
      return NBE_CONFIG;
    case 'BANKS':
      return BANKS_CONFIG;
    case 'CUSTOMS':
      return CUSTOMS_CONFIG;
    case 'SHIPPING':
      return SHIPPING_CONFIG;
    case 'EXPORTER':
      return EXPORTER_CONFIG;
    case 'ADMIN':
      return ADMIN_CONFIG;
    default:
      return null;
  }
};

export default {
  ECTA_CONFIG,
  ECX_CONFIG,
  NBE_CONFIG,
  BANKS_CONFIG,
  CUSTOMS_CONFIG,
  SHIPPING_CONFIG,
  EXPORTER_CONFIG,
  ADMIN_CONFIG,
  getRolesByOrganization,
  getConfigByOrganization,
};
