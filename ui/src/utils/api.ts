// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// API Utility Functions

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  ApiResponse, 
  PaginatedResponse, 
  Exporter, 
  SalesContract, 
  CoffeeShipment, 
  TraceabilityData,
  DashboardStats,
  ExporterFormData,
  ContractFormData,
  ShipmentFormData
} from '@/types';

class CECBSApi {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.CECBS_API_URL || 'http://localhost:3001/api/v1',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Only redirect to login on 401 Unauthorized, not on 404
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken');
          // Only redirect if not already on login page
          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic HTTP methods
  async get(url: string, config?: any): Promise<AxiosResponse> {
    return this.client.get(url, config);
  }

  async post(url: string, data?: any, config?: any): Promise<AxiosResponse> {
    return this.client.post(url, data, config);
  }

  async put(url: string, data?: any, config?: any): Promise<AxiosResponse> {
    return this.client.put(url, data, config);
  }

  async delete(url: string, config?: any): Promise<AxiosResponse> {
    return this.client.delete(url, config);
  }

  // Authentication
  async login(username: string, password: string): Promise<ApiResponse<{ token: string; user: any }>> {
    const response = await this.client.post('/auth/login', { username, password });
    return response.data;
  }

  async logout(): Promise<ApiResponse<null>> {
    const response = await this.client.post('/auth/logout');
    localStorage.removeItem('authToken');
    return response.data;
  }

  // Exporter Management
  async getExporters(params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<PaginatedResponse<Exporter>> {
    const response = await this.client.get('/exporters', { params });
    return response.data;
  }

  async getExporter(exporterId: string): Promise<ApiResponse<Exporter>> {
    const response = await this.client.get(`/exporters/${exporterId}`);
    return response.data;
  }

  async createExporter(data: ExporterFormData): Promise<ApiResponse<Exporter>> {
    const response = await this.client.post('/exporters', data);
    return response.data;
  }

  async updateExporterLaboratory(exporterId: string, certified: boolean): Promise<ApiResponse<Exporter>> {
    const response = await this.client.put(`/exporters/${exporterId}/laboratory`, { certified });
    return response.data;
  }

  // Sales Contract Management
  async getContracts(params?: {
    limit?: number;
    offset?: number;
    exporterId?: string;
    status?: string;
    eudrRequired?: boolean;
  }): Promise<PaginatedResponse<SalesContract>> {
    const response = await this.client.get('/contracts', { params });
    return response.data;
  }

  async getContract(contractId: string): Promise<ApiResponse<SalesContract>> {
    const response = await this.client.get(`/contracts/${contractId}`);
    return response.data;
  }

  async createContract(data: ContractFormData): Promise<ApiResponse<SalesContract>> {
    const response = await this.client.post('/contracts', data);
    return response.data;
  }

  async approveContract(contractId: string): Promise<ApiResponse<SalesContract>> {
    const response = await this.client.post(`/contracts/${contractId}/approve`);
    return response.data;
  }

  // Shipment Management
  async getShipments(params?: {
    limit?: number;
    offset?: number;
    exporterId?: string;
    status?: string;
    eudrCompliant?: boolean;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<PaginatedResponse<CoffeeShipment>> {
    const response = await this.client.get('/shipments', { params });
    return response.data;
  }

  async getShipment(shipmentId: string): Promise<ApiResponse<CoffeeShipment>> {
    const response = await this.client.get(`/shipments/${shipmentId}`);
    return response.data;
  }

  async createShipment(data: ShipmentFormData): Promise<ApiResponse<CoffeeShipment>> {
    const response = await this.client.post('/shipments', data);
    return response.data;
  }

  async updateShipmentStatus(shipmentId: string, status: string): Promise<ApiResponse<CoffeeShipment>> {
    const response = await this.client.put(`/shipments/${shipmentId}/status`, { status });
    return response.data;
  }

  async getShipmentHistory(shipmentId: string): Promise<ApiResponse<any[]>> {
    const response = await this.client.get(`/shipments/${shipmentId}/history`);
    return response.data;
  }

  async getTraceability(shipmentId: string): Promise<ApiResponse<TraceabilityData>> {
    const response = await this.client.get(`/shipments/${shipmentId}/traceability`);
    return response.data;
  }

  // Analytics
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    const response = await this.client.get('/analytics/dashboard');
    return response.data;
  }

  async getExportStats(params: {
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ApiResponse<any[]>> {
    const response = await this.client.get('/analytics/exports', { params });
    return response.data;
  }

  async getComplianceStats(): Promise<ApiResponse<any>> {
    const response = await this.client.get('/analytics/compliance');
    return response.data;
  }

  async getQualityStats(): Promise<ApiResponse<any>> {
    const response = await this.client.get('/analytics/quality');
    return response.data;
  }

  // Advanced Queries
  async getShipmentsByExporter(exporterId: string): Promise<ApiResponse<CoffeeShipment[]>> {
    const response = await this.client.get(`/exporters/${exporterId}/shipments`);
    return response.data;
  }

  async getEUDRCompliantShipments(): Promise<ApiResponse<CoffeeShipment[]>> {
    const response = await this.client.get('/shipments/eudr-compliant');
    return response.data;
  }

  // Blockchain Operations
  async invokeChaincode(functionName: string, args: string[]): Promise<ApiResponse<any>> {
    const response = await this.client.post('/blockchain/invoke', {
      function: functionName,
      args,
    });
    return response.data;
  }

  async queryChaincode(functionName: string, args: string[]): Promise<ApiResponse<any>> {
    const response = await this.client.post('/blockchain/query', {
      function: functionName,
      args,
    });
    return response.data;
  }

  // File Upload
  async uploadFile(file: File, type: 'certificate' | 'document'): Promise<ApiResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await this.client.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Quality Inspection Operations
  async requestInspection(data: {
    inspectionID: string;
    shipmentID: string;
    contractID: string;
    exporterID: string;
  }): Promise<ApiResponse<any>> {
    const response = await this.client.post('/quality/inspections', data);
    return response.data;
  }

  async performInspection(inspectionID: string, data: any): Promise<ApiResponse<any>> {
    const response = await this.client.post(`/quality/inspections/${inspectionID}/perform`, data);
    return response.data;
  }

  async approveInspection(inspectionID: string, data: {
    approvedBy: string;
    certificateNo: string;
    exportPermitNo: string;
  }): Promise<ApiResponse<any>> {
    const response = await this.client.post(`/quality/inspections/${inspectionID}/approve`, data);
    return response.data;
  }

  async rejectInspection(inspectionID: string, data: {
    rejectedBy: string;
    rejectionReason: string;
  }): Promise<ApiResponse<any>> {
    const response = await this.client.post(`/quality/inspections/${inspectionID}/reject`, data);
    return response.data;
  }

  async getInspections(params?: {
    status?: string;
    exporterID?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<any>> {
    const response = await this.client.get('/quality/inspections', { params });
    return response.data;
  }

  async getInspection(inspectionID: string): Promise<ApiResponse<any>> {
    const response = await this.client.get(`/quality/inspections/${inspectionID}`);
    return response.data;
  }
}

// Create singleton instance
const api = new CECBSApi();

// Export utility functions
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getStatusColor = (status: string, organization?: string): string => {
  // For BANKS organization, use only Black, Golden, Purple
  if (organization === 'BANKS') {
    const cbeColors: Record<string, string> = {
      // Positive/Active states - Golden
      ACTIVE: '#FFD700',
      APPROVED: '#FFD700',
      DELIVERED: '#FFD700',
      COMPLETED: '#FFD700',
      SUCCESS: '#FFD700',
      
      // Pending/In-Progress states - Purple
      REGISTERED: '#9b30b7',
      CREATED: '#9b30b7',
      QUALITY_CONTROL: '#9b30b7',
      SHIPPED: '#9b30b7',
      PENDING: '#9b30b7',
      IN_PROGRESS: '#9b30b7',
      
      // Negative/Inactive states - Black
      SUSPENDED: '#000000',
      EXPIRED: '#000000',
      REJECTED: '#000000',
      CANCELLED: '#000000',
      FAILED: '#000000',
    };
    return cbeColors[status] || '#9b30b7'; // Default to purple
  }
  
  // For NBE organization, use Bronze tones
  if (organization === 'NBE') {
    const nbeColors: Record<string, string> = {
      // Positive/Active states - Light Bronze/Golden
      ACTIVE: '#C4A574',
      APPROVED: '#C4A574',
      DELIVERED: '#C4A574',
      COMPLETED: '#C4A574',
      SUCCESS: '#C4A574',
      
      // Pending/In-Progress states - Bronze
      REGISTERED: '#8B6F47',
      CREATED: '#8B6F47',
      QUALITY_CONTROL: '#8B6F47',
      SHIPPED: '#8B6F47',
      PENDING: '#8B6F47',
      IN_PROGRESS: '#8B6F47',
      
      // Negative/Inactive states - Dark Brown
      SUSPENDED: '#5C4A33',
      EXPIRED: '#5C4A33',
      REJECTED: '#5C4A33',
      CANCELLED: '#5C4A33',
      FAILED: '#5C4A33',
    };
    return nbeColors[status] || '#8B6F47'; // Default to bronze
  }
  
  // For other organizations, use standard semantic colors
  const colors: Record<string, string> = {
    ACTIVE: '#4caf50',
    SUSPENDED: '#ff9800',
    EXPIRED: '#f44336',
    REGISTERED: '#2196f3',
    APPROVED: '#4caf50',
    REJECTED: '#f44336',
    CREATED: '#2196f3',
    QUALITY_CONTROL: '#ff9800',
    SHIPPED: '#9c27b0',
    DELIVERED: '#4caf50',
  };
  return colors[status] || '#757575';
};

export const validateExporterId = (id: string): boolean => {
  return /^EXP\d{7}$/.test(id);
};

export const validateContractId = (id: string): boolean => {
  return /^CONTRACT\d{7}$/.test(id);
};

export const validateShipmentId = (id: string): boolean => {
  return /^SHIPMENT\d{7}$/.test(id);
};

export const generateQRData = (shipmentId: string): string => {
  return JSON.stringify({
    type: 'CECBS_SHIPMENT',
    shipmentId,
    url: `${window.location.origin}/shipments/${shipmentId}/track`,
    timestamp: new Date().toISOString(),
  });
};

// CBE Chart Colors - Only Black, Golden, Purple
export const getCBEChartColors = () => ({
  primary: '#9b30b7',    // Purple
  secondary: '#FFD700',  // Golden
  tertiary: '#000000',   // Black
  colors: ['#9b30b7', '#FFD700', '#000000'], // Array for multiple series
});

// NBE Chart Colors - Bronze tones
export const getNBEChartColors = () => ({
  primary: '#8B6F47',    // Bronze
  secondary: '#C4A574',  // Light Bronze/Golden
  tertiary: '#5C4A33',   // Dark Brown
  colors: ['#8B6F47', '#C4A574', '#5C4A33'], // Array for multiple series
});

// Get chart colors based on organization
export const getChartColors = (organization?: string) => {
  if (organization === 'BANKS') {
    return getCBEChartColors();
  }
  if (organization === 'NBE') {
    return getNBEChartColors();
  }
  // Default colors for other organizations
  return {
    primary: '#2196f3',
    secondary: '#4caf50',
    tertiary: '#ff9800',
    colors: ['#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#f44336'],
  };
};

export default api;