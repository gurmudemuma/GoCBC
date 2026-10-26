// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Bank Lists - Ethiopian and International Banks

export interface Bank {
  id: string;
  name: string;
  country: string;
  type: 'ethiopian' | 'international';
  swiftCode?: string;
  category?: string;
}

// Ethiopian Banks
export const ETHIOPIAN_BANKS: Bank[] = [
  {
    id: 'cbe',
    name: 'Commercial Bank of Ethiopia',
    country: 'Ethiopia',
    type: 'ethiopian',
    swiftCode: 'CBETETAA',
    category: 'government',
  },
  {
    id: 'boa',
    name: 'Bank of Abyssinia',
    country: 'Ethiopia',
    type: 'ethiopian',
    swiftCode: 'ABYSETAA',
    category: 'private',
  },
  {
    id: 'dashen',
    name: 'Dashen Bank',
    country: 'Ethiopia',
    type: 'ethiopian',
    swiftCode: 'DASHETAA',
    category: 'private',
  },
  {
    id: 'awash',
    name: 'Awash International Bank',
    country: 'Ethiopia',
    type: 'ethiopian',
    swiftCode: 'AWINETAA',
    category: 'private',
  },
  {
    id: 'wegagen',
    name: 'Wegagen Bank',
    country: 'Ethiopia',
    type: 'ethiopian',
    swiftCode: 'WEGAETAA',
    category: 'private',
  },
  {
    id: 'united',
    name: 'United Bank',
    country: 'Ethiopia',
    type: 'ethiopian',
    swiftCode: 'UNTDETAA',
    category: 'private',
  },
  {
    id: 'nib',
    name: 'Nib International Bank',
    country: 'Ethiopia',
    type: 'ethiopian',
    swiftCode: 'NIIBETAA',
    category: 'private',
  },
  {
    id: 'cooperative',
    name: 'Cooperative Bank of Oromia',
    country: 'Ethiopia',
    type: 'ethiopian',
    swiftCode: 'CBORETAA',
    category: 'cooperative',
  },
  {
    id: 'lion',
    name: 'Lion International Bank',
    country: 'Ethiopia',
    type: 'ethiopian',
    swiftCode: 'LIBSETAA',
    category: 'private',
  },
  {
    id: 'zemen',
    name: 'Zemen Bank',
    country: 'Ethiopia',
    type: 'ethiopian',
    swiftCode: 'ZEMEETAA',
    category: 'private',
  },
  {
    id: 'bunna',
    name: 'Bunna International Bank',
    country: 'Ethiopia',
    type: 'ethiopian',
    swiftCode: 'BUINETAA',
    category: 'private',
  },
  {
    id: 'berhan',
    name: 'Berhan International Bank',
    country: 'Ethiopia',
    type: 'ethiopian',
    swiftCode: 'BIIBETAA',
    category: 'private',
  },
  {
    id: 'abay',
    name: 'Abay Bank',
    country: 'Ethiopia',
    type: 'ethiopian',
    swiftCode: 'ABAYETAA',
    category: 'private',
  },
  {
    id: 'addis',
    name: 'Addis International Bank',
    country: 'Ethiopia',
    type: 'ethiopian',
    swiftCode: 'AIBSETAA',
    category: 'private',
  },
  {
    id: 'enat',
    name: 'Enat Bank',
    country: 'Ethiopia',
    type: 'ethiopian',
    swiftCode: 'ENATETAA',
    category: 'private',
  },
];

// International Banks by Region
export const INTERNATIONAL_BANKS: Bank[] = [
  // United States
  {
    id: 'jpmorgan',
    name: 'JPMorgan Chase Bank',
    country: 'United States',
    type: 'international',
    swiftCode: 'CHASUS33',
    category: 'us',
  },
  {
    id: 'bofa',
    name: 'Bank of America',
    country: 'United States',
    type: 'international',
    swiftCode: 'BOFAUS3N',
    category: 'us',
  },
  {
    id: 'citi',
    name: 'Citibank N.A.',
    country: 'United States',
    type: 'international',
    swiftCode: 'CITIUS33',
    category: 'us',
  },
  {
    id: 'wells',
    name: 'Wells Fargo Bank',
    country: 'United States',
    type: 'international',
    swiftCode: 'WFBIUS6S',
    category: 'us',
  },
  
  // United Kingdom
  {
    id: 'hsbc',
    name: 'HSBC Bank PLC',
    country: 'United Kingdom',
    type: 'international',
    swiftCode: 'HSBCGB2L',
    category: 'uk',
  },
  {
    id: 'barclays',
    name: 'Barclays Bank PLC',
    country: 'United Kingdom',
    type: 'international',
    swiftCode: 'BARCGB22',
    category: 'uk',
  },
  {
    id: 'standard',
    name: 'Standard Chartered Bank',
    country: 'United Kingdom',
    type: 'international',
    swiftCode: 'SCBLGB2L',
    category: 'uk',
  },
  
  // Germany
  {
    id: 'deutsche',
    name: 'Deutsche Bank AG',
    country: 'Germany',
    type: 'international',
    swiftCode: 'DEUTDEFF',
    category: 'eu',
  },
  {
    id: 'commerzbank',
    name: 'Commerzbank AG',
    country: 'Germany',
    type: 'international',
    swiftCode: 'COBADEFF',
    category: 'eu',
  },
  
  // France
  {
    id: 'bnp',
    name: 'BNP Paribas',
    country: 'France',
    type: 'international',
    swiftCode: 'BNPAFRPP',
    category: 'eu',
  },
  {
    id: 'societe',
    name: 'Société Générale',
    country: 'France',
    type: 'international',
    swiftCode: 'SOGEFRPP',
    category: 'eu',
  },
  
  // Netherlands
  {
    id: 'ing',
    name: 'ING Bank N.V.',
    country: 'Netherlands',
    type: 'international',
    swiftCode: 'INGBNL2A',
    category: 'eu',
  },
  {
    id: 'rabobank',
    name: 'Rabobank',
    country: 'Netherlands',
    type: 'international',
    swiftCode: 'RABONL2U',
    category: 'eu',
  },
  
  // Switzerland
  {
    id: 'ubs',
    name: 'UBS Switzerland AG',
    country: 'Switzerland',
    type: 'international',
    swiftCode: 'UBSWCHZH',
    category: 'eu',
  },
  {
    id: 'credit_suisse',
    name: 'Credit Suisse AG',
    country: 'Switzerland',
    type: 'international',
    swiftCode: 'CRESCHZZ',
    category: 'eu',
  },
  
  // China
  {
    id: 'icbc',
    name: 'Industrial and Commercial Bank of China',
    country: 'China',
    type: 'international',
    swiftCode: 'ICBKCNBJ',
    category: 'asia',
  },
  {
    id: 'boc',
    name: 'Bank of China',
    country: 'China',
    type: 'international',
    swiftCode: 'BKCHCNBJ',
    category: 'asia',
  },
  
  // Japan
  {
    id: 'mufg',
    name: 'MUFG Bank Ltd',
    country: 'Japan',
    type: 'international',
    swiftCode: 'BOTKJPJT',
    category: 'asia',
  },
  {
    id: 'mizuho',
    name: 'Mizuho Bank Ltd',
    country: 'Japan',
    type: 'international',
    swiftCode: 'MHCBJPJT',
    category: 'asia',
  },
  
  // Singapore
  {
    id: 'dbs',
    name: 'DBS Bank Ltd',
    country: 'Singapore',
    type: 'international',
    swiftCode: 'DBSSSGSG',
    category: 'asia',
  },
  {
    id: 'ocbc',
    name: 'Oversea-Chinese Banking Corporation',
    country: 'Singapore',
    type: 'international',
    swiftCode: 'OCBCSGSG',
    category: 'asia',
  },
  
  // UAE
  {
    id: 'emirates',
    name: 'Emirates NBD',
    country: 'United Arab Emirates',
    type: 'international',
    swiftCode: 'EBILAEAD',
    category: 'middle_east',
  },
  {
    id: 'first_abu_dhabi',
    name: 'First Abu Dhabi Bank',
    country: 'United Arab Emirates',
    type: 'international',
    swiftCode: 'NBADAEAA',
    category: 'middle_east',
  },
  
  // South Africa
  {
    id: 'standard_sa',
    name: 'Standard Bank of South Africa',
    country: 'South Africa',
    type: 'international',
    swiftCode: 'SBZAZAJJ',
    category: 'africa',
  },
  {
    id: 'absa',
    name: 'ABSA Bank Limited',
    country: 'South Africa',
    type: 'international',
    swiftCode: 'ABSAZAJJ',
    category: 'africa',
  },
  
  // Kenya
  {
    id: 'kcb',
    name: 'Kenya Commercial Bank',
    country: 'Kenya',
    type: 'international',
    swiftCode: 'KCBLKENX',
    category: 'africa',
  },
  {
    id: 'equity',
    name: 'Equity Bank Kenya',
    country: 'Kenya',
    type: 'international',
    swiftCode: 'EQBLKENA',
    category: 'africa',
  },
];

// Combined list
export const ALL_BANKS: Bank[] = [...ETHIOPIAN_BANKS, ...INTERNATIONAL_BANKS];

// Helper functions
export const getEthiopianBanks = () => ETHIOPIAN_BANKS;

export const getInternationalBanks = () => INTERNATIONAL_BANKS;

export const getBanksByCountry = (country: string) => 
  ALL_BANKS.filter(bank => bank.country === country);

export const getBankById = (id: string) => 
  ALL_BANKS.find(bank => bank.id === id);

export const getBankByName = (name: string) => 
  ALL_BANKS.find(bank => bank.name === name);

// Group banks by region for dropdown
export const BANK_GROUPS = {
  ethiopian: {
    label: 'Ethiopian Banks',
    banks: ETHIOPIAN_BANKS,
  },
  us: {
    label: 'United States',
    banks: INTERNATIONAL_BANKS.filter(b => b.category === 'us'),
  },
  uk: {
    label: 'United Kingdom',
    banks: INTERNATIONAL_BANKS.filter(b => b.category === 'uk'),
  },
  eu: {
    label: 'Europe',
    banks: INTERNATIONAL_BANKS.filter(b => b.category === 'eu'),
  },
  asia: {
    label: 'Asia',
    banks: INTERNATIONAL_BANKS.filter(b => b.category === 'asia'),
  },
  middle_east: {
    label: 'Middle East',
    banks: INTERNATIONAL_BANKS.filter(b => b.category === 'middle_east'),
  },
  africa: {
    label: 'Africa',
    banks: INTERNATIONAL_BANKS.filter(b => b.category === 'africa'),
  },
};
