/**
 * API Client for GoCBC Testing
 * Provides authenticated HTTP requests to test all portal endpoints
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface TestUser {
  username: string;
  password: string;
  role: string;
  token?: string;
}

export class GoCBCApiClient {
  private client: AxiosInstance;
  private token: string | null = null;
  public baseURL: string;

  constructor(baseURL: string = 'http://localhost:3001/api/v1') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to inject token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  /**
   * Login and store authentication token
   */
  async login(username: string, password: string): Promise<any> {
    try {
      const response = await this.client.post('/auth/login', {
        username,
        password,
      });
      
      if (response.data.token) {
        this.token = response.data.token;
      }
      
      return response.data;
    } catch (error: any) {
      throw new Error(`Login failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Register a new user
   */
  async register(userData: {
    username: string;
    password: string;
    email: string;
    role: string;
    fullName: string;
  }): Promise<any> {
    const response = await this.client.post('/auth/register', userData);
    return response.data;
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<any> {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  /**
   * Generic GET request
   */
  async get(endpoint: string, params?: any): Promise<any> {
    const response = await this.client.get(endpoint, { params });
    return response.data;
  }

  /**
   * Generic POST request
   */
  async post(endpoint: string, data: any): Promise<any> {
    const response = await this.client.post(endpoint, data);
    return response.data;
  }

  /**
   * Generic PUT request
   */
  async put(endpoint: string, data: any): Promise<any> {
    const response = await this.client.put(endpoint, data);
    return response.data;
  }

  /**
   * Generic DELETE request
   */
  async delete(endpoint: string): Promise<any> {
    const response = await this.client.delete(endpoint);
    return response.data;
  }

  /**
   * Set authentication token manually
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Clear authentication token
   */
  clearToken(): void {
    this.token = null;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

/**
 * Portal-specific API methods
 */
export class ExporterAPI extends GoCBCApiClient {
  async getProfile(): Promise<any> {
    return this.get('/exporters/profile');
  }

  async createContract(contractData: any): Promise<any> {
    return this.post('/contracts', contractData);
  }

  async getContracts(): Promise<any> {
    return this.get('/contracts');
  }

  async getContract(contractId: string): Promise<any> {
    return this.get(`/contracts/${contractId}`);
  }

  async requestForex(forexData: any): Promise<any> {
    return this.post('/forex/request', forexData);
  }

  async getForexStatus(): Promise<any> {
    return this.get('/forex');
  }

  async requestLC(lcData: any): Promise<any> {
    return this.post('/banking/lc/request', lcData);
  }

  async createShipment(shipmentData: any): Promise<any> {
    return this.post('/shipments', shipmentData);
  }

  async getShipments(): Promise<any> {
    return this.get('/shipments');
  }

  async submitCustomsDeclaration(declarationData: any): Promise<any> {
    return this.post('/customs/declarations', declarationData);
  }
}

export class ECTAAPI extends GoCBCApiClient {
  async getApplications(): Promise<any> {
    return this.get('/ecta/applications');
  }

  async approveApplication(applicationId: string, approvalData: any): Promise<any> {
    return this.post(`/ecta/applications/${applicationId}/approve`, approvalData);
  }

  async rejectApplication(applicationId: string, reason: string): Promise<any> {
    return this.post(`/ecta/applications/${applicationId}/reject`, { reason });
  }

  async getExporters(): Promise<any> {
    return this.get('/ecta/exporters');
  }

  async getContracts(): Promise<any> {
    return this.get('/ecta/contracts');
  }

  async approveContract(contractId: string): Promise<any> {
    return this.post(`/ecta/contracts/${contractId}/approve`);
  }

  async getShipments(): Promise<any> {
    return this.get('/ecta/shipments');
  }

  async scheduleInspection(inspectionData: any): Promise<any> {
    return this.post('/ecta/inspections/schedule', inspectionData);
  }

  async conductInspection(inspectionId: string, results: any): Promise<any> {
    return this.post(`/ecta/inspections/${inspectionId}/conduct`, results);
  }

  async approveInspection(inspectionId: string): Promise<any> {
    return this.post(`/ecta/inspections/${inspectionId}/approve`);
  }
}

export class BanksAPI extends GoCBCApiClient {
  async getLCRequests(): Promise<any> {
    return this.get('/banking/lc');
  }

  async approveLC(lcId: string): Promise<any> {
    return this.post(`/banking/lc/${lcId}/approve`);
  }

  async issueLC(lcId: string, terms: string): Promise<any> {
    return this.post(`/banking/lc/${lcId}/issue`, { terms });
  }

  async getForexAllocations(): Promise<any> {
    return this.get('/banking/forex');
  }

  async allocateForex(forexData: any): Promise<any> {
    return this.post('/banking/forex/allocate', forexData);
  }

  async examineDocuments(lcId: string, examination: any): Promise<any> {
    return this.post(`/banking/lc/${lcId}/examine`, examination);
  }

  async releasePayment(lcId: string, paymentData: any): Promise<any> {
    return this.post(`/banking/lc/${lcId}/release-payment`, paymentData);
  }

  async settleLC(lcId: string): Promise<any> {
    return this.post(`/banking/lc/${lcId}/settle`);
  }

  async getSWIFTMessages(): Promise<any> {
    return this.get('/banking/swift');
  }
}

export class NBEAPI extends GoCBCApiClient {
  async getContracts(): Promise<any> {
    return this.get('/nbe/contracts');
  }

  async registerContract(contractData: any): Promise<any> {
    return this.post('/nbe/contracts/register', contractData);
  }

  async approveContract(contractId: string, approvalData: any): Promise<any> {
    return this.post(`/nbe/contracts/${contractId}/approve`, approvalData);
  }

  async getForexAllocations(): Promise<any> {
    return this.get('/nbe/forex');
  }

  async allocateForex(forexId: string, allocationData: any): Promise<any> {
    return this.post(`/nbe/forex/${forexId}/allocate`, allocationData);
  }

  async getExchangeRates(): Promise<any> {
    return this.get('/nbe/exchange-rates');
  }

  async setExchangeRate(rateData: any): Promise<any> {
    return this.post('/nbe/exchange-rates', rateData);
  }

  async getSWIFTMessages(): Promise<any> {
    return this.get('/nbe/swift');
  }

  async verifyRepatriation(shipmentId: string): Promise<any> {
    return this.post(`/nbe/repatriation/${shipmentId}/verify`);
  }
}

export class CustomsAPI extends GoCBCApiClient {
  async getDeclarations(): Promise<any> {
    return this.get('/customs/declarations');
  }

  async scheduleInspection(declarationId: string, inspectionData: any): Promise<any> {
    return this.post(`/customs/declarations/${declarationId}/schedule-inspection`, inspectionData);
  }

  async completeInspection(declarationId: string, results: any): Promise<any> {
    return this.post(`/customs/declarations/${declarationId}/complete-inspection`, results);
  }

  async clearDeclaration(declarationId: string, clearanceData: any): Promise<any> {
    return this.post(`/customs/declarations/${declarationId}/clear`, clearanceData);
  }

  async rejectDeclaration(declarationId: string, rejectionData: any): Promise<any> {
    return this.post(`/customs/declarations/${declarationId}/reject`, rejectionData);
  }
}

export class ShippingAPI extends GoCBCApiClient {
  async getShipments(): Promise<any> {
    return this.get('/shipping/shipments');
  }

  async updateShipmentStatus(shipmentId: string, statusData: any): Promise<any> {
    return this.post(`/shipping/shipments/${shipmentId}/update-status`, statusData);
  }

  async createBillOfLading(bolData: any): Promise<any> {
    return this.post('/shipping/bill-of-lading', bolData);
  }

  async confirmDeparture(shipmentId: string, departureData: any): Promise<any> {
    return this.post(`/shipping/shipments/${shipmentId}/confirm-departure`, departureData);
  }

  async confirmDelivery(shipmentId: string, deliveryData: any): Promise<any> {
    return this.post(`/shipping/shipments/${shipmentId}/confirm-delivery`, deliveryData);
  }
}

export class ECXAPI extends GoCBCApiClient {
  async getCoffeeLots(): Promise<any> {
    return this.get('/ecx/lots');
  }

  async registerIntake(intakeData: any): Promise<any> {
    return this.post('/ecx/lots/intake', intakeData);
  }

  async gradeLot(lotId: string, gradingData: any): Promise<any> {
    return this.post(`/ecx/lots/${lotId}/grade`, gradingData);
  }

  async assignToContract(lotId: string, contractId: string, price: number): Promise<any> {
    return this.post(`/ecx/lots/${lotId}/assign`, { contractId, pricePerKg: price });
  }

  async releaseLot(lotId: string, releaseData: any): Promise<any> {
    return this.post(`/ecx/lots/${lotId}/release`, releaseData);
  }

  async getMarketPrices(): Promise<any> {
    return this.get('/ecx/prices');
  }
}
