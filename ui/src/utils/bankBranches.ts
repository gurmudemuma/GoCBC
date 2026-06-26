// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Bank Branches - Ethiopian Bank Branches for LC Processing

export interface BankBranch {
  id: string;
  bankId: string;
  bankName: string;
  branchName: string;
  branchCode: string;
  city: string;
  address: string;
  phone?: string;
  email?: string;
  managerName?: string;
  isLcProcessing: boolean; // Can process Letter of Credit
  isMainBranch: boolean;
}

// Commercial Bank of Ethiopia (CBE) Branches
const CBE_BRANCHES: BankBranch[] = [
  {
    id: 'cbe-main',
    bankId: 'cbe',
    bankName: 'Commercial Bank of Ethiopia',
    branchName: 'Main Branch',
    branchCode: 'CBE-001',
    city: 'Addis Ababa',
    address: 'Ras Desta Damtew Street, Addis Ababa',
    phone: '+251-11-551-5000',
    email: 'info@combanketh.et',
    isLcProcessing: true,
    isMainBranch: true,
  },
  {
    id: 'cbe-bole',
    bankId: 'cbe',
    bankName: 'Commercial Bank of Ethiopia',
    branchName: 'Bole Branch',
    branchCode: 'CBE-002',
    city: 'Addis Ababa',
    address: 'Bole Road, Addis Ababa',
    phone: '+251-11-662-0000',
    isLcProcessing: true,
    isMainBranch: false,
  },
  {
    id: 'cbe-merkato',
    bankId: 'cbe',
    bankName: 'Commercial Bank of Ethiopia',
    branchName: 'Merkato Branch',
    branchCode: 'CBE-003',
    city: 'Addis Ababa',
    address: 'Merkato, Addis Ababa',
    phone: '+251-11-557-4000',
    isLcProcessing: true,
    isMainBranch: false,
  },
  {
    id: 'cbe-piazza',
    bankId: 'cbe',
    bankName: 'Commercial Bank of Ethiopia',
    branchName: 'Piazza Branch',
    branchCode: 'CBE-004',
    city: 'Addis Ababa',
    address: 'Piazza, Addis Ababa',
    isLcProcessing: true,
    isMainBranch: false,
  },
  {
    id: 'cbe-megenagna',
    bankId: 'cbe',
    bankName: 'Commercial Bank of Ethiopia',
    branchName: 'Megenagna Branch',
    branchCode: 'CBE-005',
    city: 'Addis Ababa',
    address: 'Megenagna, Addis Ababa',
    isLcProcessing: true,
    isMainBranch: false,
  },
  {
    id: 'cbe-dire-dawa',
    bankId: 'cbe',
    bankName: 'Commercial Bank of Ethiopia',
    branchName: 'Dire Dawa Branch',
    branchCode: 'CBE-101',
    city: 'Dire Dawa',
    address: 'Kezira, Dire Dawa',
    isLcProcessing: true,
    isMainBranch: false,
  },
  {
    id: 'cbe-hawassa',
    bankId: 'cbe',
    bankName: 'Commercial Bank of Ethiopia',
    branchName: 'Hawassa Branch',
    branchCode: 'CBE-201',
    city: 'Hawassa',
    address: 'Hawassa City Center',
    isLcProcessing: true,
    isMainBranch: false,
  },
  {
    id: 'cbe-jimma',
    bankId: 'cbe',
    bankName: 'Commercial Bank of Ethiopia',
    branchName: 'Jimma Branch',
    branchCode: 'CBE-301',
    city: 'Jimma',
    address: 'Jimma City',
    isLcProcessing: true,
    isMainBranch: false,
  },
];

// Dashen Bank Branches
const DASHEN_BRANCHES: BankBranch[] = [
  {
    id: 'dashen-main',
    bankId: 'dashen',
    bankName: 'Dashen Bank',
    branchName: 'Head Office',
    branchCode: 'DSH-001',
    city: 'Addis Ababa',
    address: 'Dembel City Center, Addis Ababa',
    phone: '+251-11-465-2005',
    email: 'info@dashenbanksc.com',
    isLcProcessing: true,
    isMainBranch: true,
  },
  {
    id: 'dashen-bole',
    bankId: 'dashen',
    bankName: 'Dashen Bank',
    branchName: 'Bole Branch',
    branchCode: 'DSH-002',
    city: 'Addis Ababa',
    address: 'Bole Millennium, Addis Ababa',
    isLcProcessing: true,
    isMainBranch: false,
  },
  {
    id: 'dashen-mexico',
    bankId: 'dashen',
    bankName: 'Dashen Bank',
    branchName: 'Mexico Branch',
    branchCode: 'DSH-003',
    city: 'Addis Ababa',
    address: 'Mexico Square, Addis Ababa',
    isLcProcessing: true,
    isMainBranch: false,
  },
];

// Awash Bank Branches
const AWASH_BRANCHES: BankBranch[] = [
  {
    id: 'awash-main',
    bankId: 'awash',
    bankName: 'Awash International Bank',
    branchName: 'Head Office',
    branchCode: 'AIB-001',
    city: 'Addis Ababa',
    address: 'Arat Kilo, Addis Ababa',
    phone: '+251-11-166-1100',
    email: 'info@awashbank.com',
    isLcProcessing: true,
    isMainBranch: true,
  },
  {
    id: 'awash-bole',
    bankId: 'awash',
    bankName: 'Awash International Bank',
    branchName: 'Bole Branch',
    branchCode: 'AIB-002',
    city: 'Addis Ababa',
    address: 'Bole, Addis Ababa',
    isLcProcessing: true,
    isMainBranch: false,
  },
];

// Bank of Abyssinia Branches
const BOA_BRANCHES: BankBranch[] = [
  {
    id: 'boa-main',
    bankId: 'boa',
    bankName: 'Bank of Abyssinia',
    branchName: 'Head Office',
    branchCode: 'BOA-001',
    city: 'Addis Ababa',
    address: 'Ras Abebe Aregay Street, Addis Ababa',
    phone: '+251-11-551-1088',
    email: 'boa@bankofabyssinia.com',
    isLcProcessing: true,
    isMainBranch: true,
  },
  {
    id: 'boa-bole',
    bankId: 'boa',
    bankName: 'Bank of Abyssinia',
    branchName: 'Bole Branch',
    branchCode: 'BOA-002',
    city: 'Addis Ababa',
    address: 'Bole Medhanialem, Addis Ababa',
    isLcProcessing: true,
    isMainBranch: false,
  },
];

// Wegagen Bank Branches
const WEGAGEN_BRANCHES: BankBranch[] = [
  {
    id: 'wegagen-main',
    bankId: 'wegagen',
    bankName: 'Wegagen Bank',
    branchName: 'Head Office',
    branchCode: 'WEG-001',
    city: 'Addis Ababa',
    address: 'Arada Subcity, Addis Ababa',
    phone: '+251-11-156-7070',
    email: 'info@wegagen.com',
    isLcProcessing: true,
    isMainBranch: true,
  },
  {
    id: 'wegagen-bole',
    bankId: 'wegagen',
    bankName: 'Wegagen Bank',
    branchName: 'Bole Branch',
    branchCode: 'WEG-002',
    city: 'Addis Ababa',
    address: 'Bole, Addis Ababa',
    isLcProcessing: true,
    isMainBranch: false,
  },
];

// United Bank Branches
const UNITED_BRANCHES: BankBranch[] = [
  {
    id: 'united-main',
    bankId: 'united',
    bankName: 'United Bank',
    branchName: 'Head Office',
    branchCode: 'UNB-001',
    city: 'Addis Ababa',
    address: 'Mexico Square, Addis Ababa',
    phone: '+251-11-551-1477',
    email: 'info@unitedbank.com.et',
    isLcProcessing: true,
    isMainBranch: true,
  },
];

// Nib International Bank Branches
const NIB_BRANCHES: BankBranch[] = [
  {
    id: 'nib-main',
    bankId: 'nib',
    bankName: 'Nib International Bank',
    branchName: 'Head Office',
    branchCode: 'NIB-001',
    city: 'Addis Ababa',
    address: 'Ras Desta Damtew Avenue, Addis Ababa',
    phone: '+251-11-552-2600',
    email: 'info@nibbanksc.com',
    isLcProcessing: true,
    isMainBranch: true,
  },
];

// Cooperative Bank of Oromia Branches
const COOP_BRANCHES: BankBranch[] = [
  {
    id: 'coop-main',
    bankId: 'cooperative',
    bankName: 'Cooperative Bank of Oromia',
    branchName: 'Head Office',
    branchCode: 'CBO-001',
    city: 'Addis Ababa',
    address: 'Ras Desta Damtew, Addis Ababa',
    phone: '+251-11-551-5013',
    email: 'info@coopbankoromia.com.et',
    isLcProcessing: true,
    isMainBranch: true,
  },
];

// Lion International Bank Branches
const LION_BRANCHES: BankBranch[] = [
  {
    id: 'lion-main',
    bankId: 'lion',
    bankName: 'Lion International Bank',
    branchName: 'Head Office',
    branchCode: 'LIB-001',
    city: 'Addis Ababa',
    address: 'Arat Kilo, Addis Ababa',
    phone: '+251-11-551-3200',
    email: 'info@anbesabank.com',
    isLcProcessing: true,
    isMainBranch: true,
  },
];

// Zemen Bank Branches
const ZEMEN_BRANCHES: BankBranch[] = [
  {
    id: 'zemen-main',
    bankId: 'zemen',
    bankName: 'Zemen Bank',
    branchName: 'Head Office',
    branchCode: 'ZEM-001',
    city: 'Addis Ababa',
    address: 'Bole, Addis Ababa',
    phone: '+251-11-126-2730',
    email: 'info@zemenbank.com',
    isLcProcessing: true,
    isMainBranch: true,
  },
];

// Bunna International Bank Branches
const BUNNA_BRANCHES: BankBranch[] = [
  {
    id: 'bunna-main',
    bankId: 'bunna',
    bankName: 'Bunna International Bank',
    branchName: 'Head Office',
    branchCode: 'BUN-001',
    city: 'Addis Ababa',
    address: 'Bole, Addis Ababa',
    phone: '+251-11-618-0001',
    email: 'info@bunnabank.com',
    isLcProcessing: true,
    isMainBranch: true,
  },
];

// Berhan International Bank Branches
const BERHAN_BRANCHES: BankBranch[] = [
  {
    id: 'berhan-main',
    bankId: 'berhan',
    bankName: 'Berhan International Bank',
    branchName: 'Head Office',
    branchCode: 'BER-001',
    city: 'Addis Ababa',
    address: 'Bole, Addis Ababa',
    phone: '+251-11-551-8600',
    email: 'info@berhanbank.com',
    isLcProcessing: true,
    isMainBranch: true,
  },
];

// Abay Bank Branches
const ABAY_BRANCHES: BankBranch[] = [
  {
    id: 'abay-main',
    bankId: 'abay',
    bankName: 'Abay Bank',
    branchName: 'Head Office',
    branchCode: 'ABY-001',
    city: 'Addis Ababa',
    address: 'Kirkos Subcity, Addis Ababa',
    phone: '+251-11-811-8000',
    email: 'info@abaybank.com.et',
    isLcProcessing: true,
    isMainBranch: true,
  },
];

// Addis International Bank Branches
const ADDIS_BRANCHES: BankBranch[] = [
  {
    id: 'addis-main',
    bankId: 'addis',
    bankName: 'Addis International Bank',
    branchName: 'Head Office',
    branchCode: 'AIS-001',
    city: 'Addis Ababa',
    address: 'Kirkos, Addis Ababa',
    phone: '+251-11-551-3180',
    email: 'info@addisbanksc.com',
    isLcProcessing: true,
    isMainBranch: true,
  },
];

// Enat Bank Branches
const ENAT_BRANCHES: BankBranch[] = [
  {
    id: 'enat-main',
    bankId: 'enat',
    bankName: 'Enat Bank',
    branchName: 'Head Office',
    branchCode: 'ENA-001',
    city: 'Addis Ababa',
    address: 'Bole, Addis Ababa',
    phone: '+251-11-557-0000',
    email: 'info@enatbanksc.com',
    isLcProcessing: true,
    isMainBranch: true,
  },
];

// Combined branches by bank
export const BANK_BRANCHES: Record<string, BankBranch[]> = {
  cbe: CBE_BRANCHES,
  dashen: DASHEN_BRANCHES,
  awash: AWASH_BRANCHES,
  boa: BOA_BRANCHES,
  wegagen: WEGAGEN_BRANCHES,
  united: UNITED_BRANCHES,
  nib: NIB_BRANCHES,
  cooperative: COOP_BRANCHES,
  lion: LION_BRANCHES,
  zemen: ZEMEN_BRANCHES,
  bunna: BUNNA_BRANCHES,
  berhan: BERHAN_BRANCHES,
  abay: ABAY_BRANCHES,
  addis: ADDIS_BRANCHES,
  enat: ENAT_BRANCHES,
};

// All branches (flat list)
export const ALL_BRANCHES: BankBranch[] = Object.values(BANK_BRANCHES).flat();

// Helper functions
export const getBranchesByBankId = (bankId: string): BankBranch[] => {
  return BANK_BRANCHES[bankId] || [];
};

export const getBranchesByBankName = (bankName: string): BankBranch[] => {
  const bankId = Object.keys(BANK_BRANCHES).find(id => {
    const branches = BANK_BRANCHES[id];
    return branches.length > 0 && branches[0].bankName === bankName;
  });
  return bankId ? BANK_BRANCHES[bankId] : [];
};

export const getBranchById = (branchId: string): BankBranch | undefined => {
  return ALL_BRANCHES.find(branch => branch.id === branchId);
};

export const getBranchByCode = (branchCode: string): BankBranch | undefined => {
  return ALL_BRANCHES.find(branch => branch.branchCode === branchCode);
};

export const getLcProcessingBranches = (): BankBranch[] => {
  return ALL_BRANCHES.filter(branch => branch.isLcProcessing);
};

export const getMainBranches = (): BankBranch[] => {
  return ALL_BRANCHES.filter(branch => branch.isMainBranch);
};

export const getBranchesByCity = (city: string): BankBranch[] => {
  return ALL_BRANCHES.filter(branch => branch.city === city);
};

// Ethiopian cities with bank branches
export const ETHIOPIAN_CITIES = [
  'Addis Ababa',
  'Dire Dawa',
  'Hawassa',
  'Jimma',
  'Bahir Dar',
  'Gondar',
  'Mekelle',
  'Adama',
  'Bishoftu',
  'Dessie',
];
