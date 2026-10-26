// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// International Coffee Buyers Registry

export interface Buyer {
  id: string;
  name: string;
  country: string;
  type: 'roaster' | 'distributor' | 'retailer' | 'trader';
  region?: string;
}

// International Coffee Buyers by Region
export const INTERNATIONAL_BUYERS: Buyer[] = [
  // United States
  {
    id: 'BUYER001',
    name: 'Starbucks Corporation',
    country: 'USA',
    type: 'roaster',
    region: 'north_america',
  },
  {
    id: 'BUYER-US-001',
    name: 'Starbucks Corporation',
    country: 'United States',
    type: 'roaster',
    region: 'north_america',
  },
  {
    id: 'BUYER-US-002',
    name: 'Peet\'s Coffee',
    country: 'United States',
    type: 'roaster',
    region: 'north_america',
  },
  {
    id: 'BUYER-US-003',
    name: 'Blue Bottle Coffee',
    country: 'United States',
    type: 'roaster',
    region: 'north_america',
  },
  {
    id: 'BUYER-US-004',
    name: 'Intelligentsia Coffee',
    country: 'United States',
    type: 'roaster',
    region: 'north_america',
  },
  {
    id: 'BUYER-US-005',
    name: 'Counter Culture Coffee',
    country: 'United States',
    type: 'roaster',
    region: 'north_america',
  },
  
  // United Kingdom
  {
    id: 'BUYER-UK-001',
    name: 'Costa Coffee',
    country: 'United Kingdom',
    type: 'roaster',
    region: 'europe',
  },
  {
    id: 'BUYER-UK-002',
    name: 'Caffè Nero',
    country: 'United Kingdom',
    type: 'roaster',
    region: 'europe',
  },
  {
    id: 'BUYER-UK-003',
    name: 'Pret A Manger',
    country: 'United Kingdom',
    type: 'retailer',
    region: 'europe',
  },
  
  // Germany
  {
    id: 'BUYER-DE-001',
    name: 'Tchibo GmbH',
    country: 'Germany',
    type: 'roaster',
    region: 'europe',
  },
  {
    id: 'BUYER-DE-002',
    name: 'Dallmayr',
    country: 'Germany',
    type: 'roaster',
    region: 'europe',
  },
  {
    id: 'BUYER-DE-003',
    name: 'Melitta',
    country: 'Germany',
    type: 'roaster',
    region: 'europe',
  },
  
  // Italy
  {
    id: 'BUYER-IT-001',
    name: 'Lavazza S.p.A.',
    country: 'Italy',
    type: 'roaster',
    region: 'europe',
  },
  {
    id: 'BUYER-IT-002',
    name: 'Illy Caffè',
    country: 'Italy',
    type: 'roaster',
    region: 'europe',
  },
  {
    id: 'BUYER-IT-003',
    name: 'Segafredo Zanetti',
    country: 'Italy',
    type: 'roaster',
    region: 'europe',
  },
  
  // Switzerland
  {
    id: 'BUYER-CH-001',
    name: 'Nestlé Nespresso SA',
    country: 'Switzerland',
    type: 'roaster',
    region: 'europe',
  },
  
  // Netherlands
  {
    id: 'BUYER-NL-001',
    name: 'Jacobs Douwe Egberts',
    country: 'Netherlands',
    type: 'roaster',
    region: 'europe',
  },
  
  // Japan
  {
    id: 'BUYER-JP-001',
    name: 'UCC Ueshima Coffee Co.',
    country: 'Japan',
    type: 'roaster',
    region: 'asia',
  },
  {
    id: 'BUYER-JP-002',
    name: 'Key Coffee Inc.',
    country: 'Japan',
    type: 'roaster',
    region: 'asia',
  },
  {
    id: 'BUYER-JP-003',
    name: 'Doutor Coffee Co.',
    country: 'Japan',
    type: 'roaster',
    region: 'asia',
  },
  
  // South Korea
  {
    id: 'BUYER-KR-001',
    name: 'Coffee Bay',
    country: 'South Korea',
    type: 'roaster',
    region: 'asia',
  },
  {
    id: 'BUYER-KR-002',
    name: 'Hollys Coffee',
    country: 'South Korea',
    type: 'roaster',
    region: 'asia',
  },
  
  // China
  {
    id: 'BUYER-CN-001',
    name: 'Luckin Coffee',
    country: 'China',
    type: 'roaster',
    region: 'asia',
  },
  
  // Australia
  {
    id: 'BUYER-AU-001',
    name: 'Merlo Coffee',
    country: 'Australia',
    type: 'roaster',
    region: 'oceania',
  },
  {
    id: 'BUYER-AU-002',
    name: 'Vittoria Coffee',
    country: 'Australia',
    type: 'roaster',
    region: 'oceania',
  },
  
  // Canada
  {
    id: 'BUYER-CA-001',
    name: 'Tim Hortons',
    country: 'Canada',
    type: 'roaster',
    region: 'north_america',
  },
  
  // France
  {
    id: 'BUYER-FR-001',
    name: 'Carte Noire',
    country: 'France',
    type: 'roaster',
    region: 'europe',
  },
  
  // Sweden
  {
    id: 'BUYER-SE-001',
    name: 'Löfbergs',
    country: 'Sweden',
    type: 'roaster',
    region: 'europe',
  },
  
  // Norway
  {
    id: 'BUYER-NO-001',
    name: 'Friele',
    country: 'Norway',
    type: 'roaster',
    region: 'europe',
  },
  
  // Belgium
  {
    id: 'JOB_BEL',
    name: 'Belgian Coffee Traders N.V.',
    country: 'Belgium',
    type: 'trader',
    region: 'europe',
  },
  {
    id: 'BUYER-BE-001',
    name: 'Belgian Coffee Traders N.V.',
    country: 'Belgium',
    type: 'trader',
    region: 'europe',
  },
  
  // Spain
  {
    id: 'BUYER-ES-001',
    name: 'Cafés Novell',
    country: 'Spain',
    type: 'roaster',
    region: 'europe',
  },
  
  // Generic test buyers
  {
    id: 'B1',
    name: 'International Coffee Importers Inc.',
    country: 'USA',
    type: 'distributor',
    region: 'north_america',
  },
];

// Helper functions
export const getBuyerById = (id: string): Buyer | undefined => {
  return INTERNATIONAL_BUYERS.find(buyer => buyer.id === id);
};

export const getBuyerNameById = (id: string): string => {
  const buyer = getBuyerById(id);
  return buyer ? buyer.name : id; // Fallback to ID if not found
};

export const getBuyersByCountry = (country: string): Buyer[] => {
  return INTERNATIONAL_BUYERS.filter(buyer => buyer.country === country);
};

export const getBuyersByRegion = (region: string): Buyer[] => {
  return INTERNATIONAL_BUYERS.filter(buyer => buyer.region === region);
};

export const getAllBuyers = (): Buyer[] => {
  return INTERNATIONAL_BUYERS;
};

// Group buyers by region for dropdown
export const BUYER_GROUPS = {
  north_america: {
    label: 'North America',
    buyers: INTERNATIONAL_BUYERS.filter(b => b.region === 'north_america'),
  },
  europe: {
    label: 'Europe',
    buyers: INTERNATIONAL_BUYERS.filter(b => b.region === 'europe'),
  },
  asia: {
    label: 'Asia',
    buyers: INTERNATIONAL_BUYERS.filter(b => b.region === 'asia'),
  },
  oceania: {
    label: 'Oceania',
    buyers: INTERNATIONAL_BUYERS.filter(b => b.region === 'oceania'),
  },
};
