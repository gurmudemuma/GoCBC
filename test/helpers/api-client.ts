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
   * Login and store authentication token.
   * NOTE: POST /auth/login returns { success, data: { token, user } }
   * (auth.ts:234), so the token lives at response.data.data.token.
   */
  async login(username: string, password: string): Promise<any> {
    try {
      const response = await this.client.post('/auth/login', {
        username,
        password,
      });

      if (response.data?.data?.token) {
        this.token = response.data.data.token;
      }

      return response.data;
    } catch (error: any) {
      throw new Error(`Login failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Register a new user.
   * NOTE: there is no POST /auth/register route (auth.ts has only
   * login/logout/validate/refresh/applicant/*). User creation is
   * POST /users (users.ts:269) and requires an authenticated caller whose
   * role can manage users (ADMIN, ECTA, ECX, NBE, BANKS, CUSTOMS, SHIPPING)
   * — call setToken() with such a token first. EXPORTER users also need
   * an exporterId (users.ts:13).
   */
  async register(userData: {
    username: string;
    password: string;
    email: string;
    role: string;
    fullName: string;
    organization?: string;
    exporterId?: string;
  }): Promise<any> {
    const response = await this.client.post('/users', {
      ...userData,
      organization: userData.organization || userData.role,
    });
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
   * (data is optional — several POST routes take an empty body)
   */
  async post(endpoint: string, data?: any): Promise<any> {
    const response = await this.client.post(endpoint, data);
    return response.data;
  }

  /**
   * Generic PUT request
   */
  async put(endpoint: string, data?: any): Promise<any> {
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
   * Health check.
   * NOTE: GET /health lives at the app root (server.ts:187), NOT under
   * /api/v1, so this calls the server root, not this.baseURL + '/health'.
   */
  async healthCheck(): Promise<any> {
    const response = await axios.get(
      `${this.baseURL.replace(/\/api\/v1$/, '')}/health`
    );
    return response.data;
  }
}

/**
 * Portal-specific API methods
 */
export class ExporterAPI extends GoCBCApiClient {
  async getProfile(): Promise<any> {
    // Was /exporters/profile (does not exist). Real route:
    // GET /exporters/me/profile (exporters.ts:1146).
    return this.get('/exporters/me/profile');
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
    // Was POST /customs/declarations (does not exist). Real route:
    // POST /customs/declaration/submit (customs.ts:676).
    return this.post('/customs/declaration/submit', declarationData);
  }
}

export class ECTAAPI extends GoCBCApiClient {
  // NOTE: there is no /ecta/* mount in server.ts — the old /ecta/* paths
  // below never existed. Each method now calls the real domain route.
  async getApplications(): Promise<any> {
    return this.get('/exporters/exporter-applications');
  }

  async approveApplication(applicationId: string, approvalData: any): Promise<any> {
    return this.post(`/exporters/exporter-applications/${applicationId}/approve`, approvalData);
  }

  async rejectApplication(applicationId: string, reason: string): Promise<any> {
    return this.post(`/exporters/exporter-applications/${applicationId}/reject`, { reason });
  }

  async getExporters(): Promise<any> {
    return this.get('/exporters');
  }

  async getContracts(): Promise<any> {
    return this.get('/contracts');
  }

  async approveContract(contractId: string): Promise<any> {
    return this.post(`/contracts/${contractId}/approve`);
  }

  async getShipments(): Promise<any> {
    return this.get('/shipments');
  }

  async scheduleInspection(inspectionData: any): Promise<any> {
    // Was POST /ecta/inspections/schedule (does not exist). The real
    // create-request route is POST /quality/inspections (quality.ts:364).
    return this.post('/quality/inspections', inspectionData);
  }

  async conductInspection(inspectionId: string, results: any): Promise<any> {
    // Was POST /ecta/inspections/:id/conduct (does not exist). Real route:
    // POST /quality/inspections/:id/perform (quality.ts:512).
    return this.post(`/quality/inspections/${inspectionId}/perform`, results);
  }

  async approveInspection(inspectionId: string): Promise<any> {
    // Was POST /ecta/inspections/:id/approve (does not exist). Real route:
    // POST /quality/inspections/:id/approve (quality.ts:746).
    return this.post(`/quality/inspections/${inspectionId}/approve`);
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
    // Was GET /banking/forex (does not exist). Real route:
    // GET /forex (forex.ts:122).
    return this.get('/forex');
  }

  async allocateForex(forexData: any): Promise<any> {
    // Was POST /banking/forex/allocate (does not exist). Real route:
    // POST /forex/allocate (forex.ts:793) — forexId + lcId in the body.
    return this.post('/forex/allocate', forexData);
  }

  async examineDocuments(lcId: string, examination: any): Promise<any> {
    // Was POST /banking/lc/:id/examine — that path exists as a redirect
    // shim (banking.ts:3790), but the canonical route is
    // POST /banking/lc/:id/examine-documents (banking.ts:3268).
    return this.post(`/banking/lc/${lcId}/examine-documents`, examination);
  }

  async releasePayment(lcId: string, paymentData: any): Promise<any> {
    return this.post(`/banking/lc/${lcId}/release-payment`, paymentData);
  }

  async settleLC(lcId: string, settleData: any = {}): Promise<any> {
    // Was POST /banking/lc/:id/settle (does not exist). Settlement is
    // per-payment: POST /banking/payment/:paymentID/settle (banking.ts:2588).
    // Look the payment up by LC first (GET /payments returns lcId per row,
    // payments.ts:1007), then settle it. Defaults mirror the NBE policy
    // (40% retention) and the CBE test values used by the shell suites.
    const payments = await this.get('/payments');
    const list = Array.isArray(payments) ? payments : payments?.data || [];
    const payment = list.find((p: any) => (p.lcId || p.lc_id) === lcId);
    if (!payment) {
      throw new Error(`settleLC: no payment found for LC ${lcId} — run the payment flow first`);
    }
    const paymentId = payment.paymentId || payment.payment_id || payment.id;
    return this.post(`/banking/payment/${paymentId}/settle`, {
      exchangeRate: 57.5,
      retentionRate: 40,
      payingBank: 'Commercial Bank of Ethiopia',
      payingBankBIC: 'CBETETAA',
      swiftReference: `SWIFT-${Date.now()}`,
      ...settleData,
    });
  }

  async getSWIFTMessages(): Promise<any> {
    // Was GET /banking/swift (does not exist). Real route:
    // GET /swift/messages (swift.ts:972).
    return this.get('/swift/messages');
  }
}

export class NBEAPI extends GoCBCApiClient {
  // NOTE: there is no /nbe/contracts or /nbe/forex or /nbe/exchange-rates
  // or /nbe/swift route — the old /nbe/* paths below never existed (the
  // /nbe mount, server.ts:255, only serves forex approval/repatriation,
  // lc-monitoring, retention accounts, waivers, compliance-tracking).
  // Each method now calls the real domain route.
  async getContracts(): Promise<any> {
    return this.get('/contracts');
  }

  // REMOVED (removed-unverifiable): registerContract() called
  // POST /nbe/contracts/register, which has no equivalent — contracts are
  // created via POST /contracts and NBE never registers them. No caller
  // in test/ used this method.

  async approveContract(contractId: string, approvalData: any): Promise<any> {
    // Was POST /nbe/contracts/:id/approve (does not exist). Real route:
    // POST /contracts/:id/nbe-approve (contracts.ts:1823).
    return this.post(`/contracts/${contractId}/nbe-approve`, approvalData);
  }

  async getForexAllocations(): Promise<any> {
    // Was GET /nbe/forex (does not exist). Real route: GET /forex.
    return this.get('/forex');
  }

  async allocateForex(forexId: string, allocationData: any): Promise<any> {
    // Was POST /nbe/forex/:id/allocate (does not exist). Real route:
    // POST /forex/:forexId/allocate (forex.ts:865).
    return this.post(`/forex/${forexId}/allocate`, allocationData);
  }

  async getExchangeRates(): Promise<any> {
    // Was GET /nbe/exchange-rates (does not exist). Real route:
    // GET /forex/rates (forex.ts:209).
    return this.get('/forex/rates');
  }

  async setExchangeRate(rateData: any): Promise<any> {
    // Was POST /nbe/exchange-rates (does not exist). Real route:
    // POST /forex/rates (forex.ts:487) — body { currency, buyingRate,
    // sellingRate }.
    return this.post('/forex/rates', rateData);
  }

  async getSWIFTMessages(): Promise<any> {
    // Was GET /nbe/swift (does not exist). Real route:
    // GET /swift/messages (swift.ts:972).
    return this.get('/swift/messages');
  }

  async verifyRepatriation(recordId: string): Promise<any> {
    // Was POST /nbe/repatriation/:id/verify (does not exist). Real route:
    // POST /repatriation/:id/verify (repatriation.ts:306) — the id is the
    // repatriation record id, not a shipment id (parameter renamed).
    return this.post(`/repatriation/${recordId}/verify`);
  }
}

export class CustomsAPI extends GoCBCApiClient {
  async getDeclarations(): Promise<any> {
    return this.get('/customs/declarations');
  }

  async scheduleInspection(declarationId: string, inspectionData: any): Promise<any> {
    // LEFTOVER — semantic mismatch, kept so test/workflows/05-all-portals.test.ts
    // still compiles (it calls this method expecting SUBMITTED → INSPECTING).
    // The server has NO schedule-inspection endpoint. The closest real
    // action is POST /customs/declaration/:id/inspect (customs.ts:1820),
    // which STARTS the inspection (moves the declaration to inspecting);
    // the scheduling fields (date/time/inspector) are not stored by it.
    return this.post(`/customs/declaration/${declarationId}/inspect`, inspectionData);
  }

  async completeInspection(declarationId: string, results: any): Promise<any> {
    // Was POST /customs/declarations/:id/complete-inspection (plural path
    // does not exist). Real route: POST /customs/declaration/:id/complete-inspection
    // (customs.ts:1837).
    return this.post(`/customs/declaration/${declarationId}/complete-inspection`, results);
  }

  async clearDeclaration(declarationId: string, clearanceData: any): Promise<any> {
    // Was POST /customs/declarations/:id/clear (plural path does not exist).
    // Real route: POST /customs/declaration/:id/clear (customs.ts:2022).
    return this.post(`/customs/declaration/${declarationId}/clear`, clearanceData);
  }

  async rejectDeclaration(declarationId: string, rejectionData: any): Promise<any> {
    // Was POST /customs/declarations/:id/reject (plural path does not exist).
    // Real route: POST /customs/declaration/:id/reject (customs.ts:1939).
    return this.post(`/customs/declaration/${declarationId}/reject`, rejectionData);
  }
}

export class ShippingAPI extends GoCBCApiClient {
  async getShipments(): Promise<any> {
    return this.get('/shipping/shipments');
  }

  async updateShipmentStatus(shipmentId: string, statusData: any): Promise<any> {
    // Was POST /shipping/shipments/:id/update-status (does not exist).
    // Real route: PUT /shipments/:id/status (shipments.ts:1124),
    // body { status, ... }.
    return this.put(`/shipments/${shipmentId}/status`, statusData);
  }

  async createBillOfLading(bookingId: string, bolData: any): Promise<any> {
    // Was POST /shipping/bill-of-lading (does not exist). Real route:
    // POST /shipping/bookings/:bookingId/bill-of-lading/issue (shipping.ts:812)
    // — body { blNumber, blType, shipper, consignee, ... }. Signature
    // changed: first argument is now the booking id (no callers in test/).
    return this.post(`/shipping/bookings/${bookingId}/bill-of-lading/issue`, bolData);
  }

  async confirmDeparture(bookingId: string, departureData: any): Promise<any> {
    // Was POST /shipping/shipments/:id/confirm-departure (does not exist).
    // Real route: POST /shipping/bookings/:bookingId/depart (shipping.ts:607).
    // Signature changed: first argument is now the booking id (no callers).
    return this.post(`/shipping/bookings/${bookingId}/depart`, departureData);
  }

  async confirmDelivery(bookingId: string, deliveryData: any): Promise<any> {
    // Was POST /shipping/shipments/:id/confirm-delivery (does not exist).
    // Real route: POST /shipping/bookings/:bookingId/deliver (shipping.ts:741).
    // Signature changed: first argument is now the booking id (no callers).
    return this.post(`/shipping/bookings/${bookingId}/deliver`, deliveryData);
  }
}

export class ECXAPI extends GoCBCApiClient {
  async getCoffeeLots(): Promise<any> {
    return this.get('/ecx/lots');
  }

  async registerIntake(intakeData: any): Promise<any> {
    // Was POST /ecx/lots/intake (does not exist). Real route:
    // POST /ecx/lots (ecx.ts:274) — the intake endpoint itself.
    return this.post('/ecx/lots', intakeData);
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
    // Was GET /ecx/prices (does not exist). Real route:
    // GET /ecx/market (ecx.ts:81).
    return this.get('/ecx/market');
  }
}
