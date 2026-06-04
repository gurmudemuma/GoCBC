// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// TypeScript Type Definitions

export interface Exporter {
  exporterId: string;
  companyName: string;
  ectaLicenseNumber: string;
  licenseStatus: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
  capitalRequirement: number;
  laboratoryCertified: boolean;
  professionalTaster: string;
  tasterCertificate: string;
  licenseExpiryDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesContract {
  contractId: string;
  nbeReferenceNumber: string;
  exporterId: string;
  buyerId: string;
  buyerCountry: string;
  coffeeType: string;
  quantity: number;
  pricePerKg: number;
  totalValue: number;
  currency: string;
  minimumPriceCompliant: boolean;
  eudrRequired: boolean;
  contractStatus: 'REGISTERED' | 'APPROVED' | 'REJECTED';
  registrationDate: string;
  approvalDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoffeeShipment {
  shipmentId: string;
  exporterId: string;
  buyerId: string;
  origin: string;
  quantity: number;
  grade: string;
  icoNumber: string;
  ecxLotNumber: string;
  status: 'CREATED' | 'QUALITY_CONTROL' | 'APPROVED' | 'SHIPPED' | 'DELIVERED';
  channel: string;
  forexRate: number;
  valueUsd: number;
  eudrCompliant: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TraceabilityData {
  shipment: CoffeeShipment;
  exporter: Exporter;
  contract?: SalesContract;
  traceabilityComplete: boolean;
  eudrCompliant: boolean;
  generatedAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  organization: 'ECTA' | 'ECX' | 'NBE' | 'Banks' | 'Customs' | 'Shipping';
  role: 'admin' | 'operator' | 'viewer';
  permissions: string[];
  lastLogin?: string;
  isActive: boolean;
  exporterId?: string;
  ectaLicense?: string;
}

export interface DashboardStats {
  totalExporters: number;
  activeContracts: number;
  shipmentsThisMonth: number;
  eudrComplianceRate: number;
  totalExportValue: number;
  topDestinations: Array<{
    country: string;
    percentage: number;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  timestamp: string;
  txId?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ChaincodeFunctionCall {
  function: string;
  args: string[];
}

export interface BlockchainTransaction {
  txId: string;
  timestamp: string;
  function: string;
  args: string[];
  status: 'VALID' | 'INVALID';
  endorsements: number;
}

// Form Types
export interface ExporterFormData {
  exporterId: string;
  companyName: string;
  ectaLicenseNumber: string;
  capitalRequirement: number;
  professionalTaster: string;
  tasterCertificate: string;
  licenseExpiryDate: string;
}

export interface ContractFormData {
  contractId: string;
  exporterId: string;
  buyerId: string;
  buyerCountry: string;
  coffeeType: string;
  quantity: number;
  pricePerKg: number;
  currency: string;
  eudrRequired: boolean;
}

export interface ShipmentFormData {
  shipmentId: string;
  exporterId: string;
  buyerId: string;
  origin: string;
  quantity: number;
  grade: string;
  icoNumber: string;
  ecxLotNumber: string;
  channel: string;
  forexRate: number;
  valueUsd: number;
  eudrCompliant: boolean;
}

// Filter Types
export interface ExporterFilters {
  status?: string;
  licenseExpiring?: boolean;
  laboratoryCertified?: boolean;
}

export interface ContractFilters {
  exporterId?: string;
  status?: string;
  eudrRequired?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface ShipmentFilters {
  exporterId?: string;
  status?: string;
  eudrCompliant?: boolean;
  dateFrom?: string;
  dateTo?: string;
  origin?: string;
}

// Navigation Types
export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  organization?: string[];
  permissions?: string[];
  children?: NavigationItem[];
}

// Theme Types
export interface ThemeConfig {
  mode: 'light' | 'dark';
  primaryColor: string;
  secondaryColor: string;
  organization: string;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'notification' | 'update' | 'status';
  data: any;
  timestamp: string;
}

// Export all types
export type {
  Exporter,
  SalesContract,
  CoffeeShipment,
  TraceabilityData,
  User,
  DashboardStats,
  ApiResponse,
  PaginatedResponse,
  ChaincodeFunctionCall,
  BlockchainTransaction,
  ExporterFormData,
  ContractFormData,
  ShipmentFormData,
  ExporterFilters,
  ContractFilters,
  ShipmentFilters,
  NavigationItem,
  ThemeConfig,
  Notification,
  WebSocketMessage,
};