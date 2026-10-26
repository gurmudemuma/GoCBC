// SWIFT API Service
// Centralized API calls for SWIFT message management

import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1';

class SWIFTApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to all requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle response errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('token');
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // ==================== MESSAGE CRUD ====================

  async getAllMessages(params?: {
    startDate?: string;
    endDate?: string;
    messageType?: string;
    status?: string;
    lcId?: string;
    paymentId?: string;
    limit?: number;
  }) {
    const response = await this.api.get('/swift/messages', { params });
    return response.data;
  }

  async getMessageById(messageId: string) {
    const response = await this.api.get(`/swift/messages/${messageId}`);
    return response.data;
  }

  async getMessagesByLC(lcId: string) {
    const response = await this.api.get('/swift/messages', {
      params: { lcId },
    });
    return response.data;
  }

  async getMessagesByPayment(paymentId: string) {
    const response = await this.api.get('/swift/messages', {
      params: { paymentId },
    });
    return response.data;
  }

  async getMessagesBySender(senderBic: string) {
    const response = await this.api.get('/swift/messages/sender', {
      params: { senderBIC: senderBic },
    });
    return response.data;
  }

  async getMessagesByReceiver(receiverBic: string) {
    const response = await this.api.get('/swift/messages/receiver', {
      params: { receiverBIC: receiverBic },
    });
    return response.data;
  }

  // ==================== MESSAGE CREATION ====================

  async createMessage(data: any) {
    const response = await this.api.post('/swift/messages', data);
    return response.data;
  }

  async createMT700(data: {
    messageID: string;
    lcID: string;
    swiftReference: string;
    senderBIC: string;
    receiverBIC: string;
    applicant: string;
    beneficiary: string;
    amount: string;
    currency: string;
    expiryDate: string;
    loadingPort?: string;
    dischargePort?: string;
    latestShipDate?: string;
  }) {
    const response = await this.api.post('/swift/messages/mt700', data);
    return response.data;
  }

  async createMT103(data: {
    messageID: string;
    paymentID?: string;
    swiftReference: string;
    senderBIC: string;
    receiverBIC: string;
    orderingCustomer: string;
    beneficiary: string;
    beneficiaryAccount: string;
    amount: string;
    currency: string;
    valueDate: string;
    remittanceInfo: string;
    chargeCode?: string;
  }) {
    const response = await this.api.post('/swift/messages/mt103', data);
    return response.data;
  }

  async createMT750(data: {
    messageID: string;
    lcID: string;
    swiftReference: string;
    senderBIC: string;
    receiverBIC: string;
    discrepancyDetails: string;
    discrepancyList?: string[];
  }) {
    const response = await this.api.post('/swift/messages/mt750', data);
    return response.data;
  }

  async createMT752(data: {
    messageID: string;
    lcID: string;
    swiftReference: string;
    senderBIC: string;
    receiverBIC: string;
    amount: string;
    currency: string;
  }) {
    const response = await this.api.post('/swift/messages/mt752', data);
    return response.data;
  }

  // ==================== WORKFLOW OPERATIONS ====================

  async approveMessage(messageId: string, data?: { approvedBy?: string }) {
    const response = await this.api.post(`/swift/messages/${messageId}/approve`, data);
    return response.data;
  }

  async sendMessage(messageId: string, data?: { sentBy?: string }) {
    const response = await this.api.post(`/swift/messages/${messageId}/send`, data);
    return response.data;
  }

  async receiveMessage(messageId: string, data: { receivedBy: string }) {
    const response = await this.api.post(`/swift/messages/${messageId}/receive`, data);
    return response.data;
  }

  async processMessage(messageId: string) {
    const response = await this.api.post(`/swift/messages/${messageId}/process`);
    return response.data;
  }

  async settleMessage(messageId: string) {
    const response = await this.api.post(`/swift/messages/${messageId}/settle`);
    return response.data;
  }

  async rejectMessage(messageId: string, data: { reason: string }) {
    const response = await this.api.post(`/swift/messages/${messageId}/reject`, data);
    return response.data;
  }

  // ==================== STATISTICS & REPORTING ====================

  async getStatistics(params?: { startDate?: string; endDate?: string }) {
    const response = await this.api.get('/swift/statistics', { params });
    return response.data;
  }

  async getMessagesByType(messageType: string) {
    const response = await this.api.get('/swift/messages/type', {
      params: { messageType },
    });
    return response.data;
  }

  async getMessagesByStatus(status: string) {
    const response = await this.api.get('/swift/messages/status', {
      params: { status },
    });
    return response.data;
  }

  // ==================== NBE OPERATIONS ====================

  async nbeApproveMessage(messageId: string, data: {
    approvedBy: string;
    amlCheck: string;
    sanctionScreening: string;
    comments?: string;
  }) {
    const response = await this.api.post(`/swift/messages/${messageId}/nbe-approve`, data);
    return response.data;
  }

  async getHighValueTransactions(threshold: number = 1000000) {
    const response = await this.api.get('/swift/messages', {
      params: { 
        status: 'PENDING_APPROVAL',
        minAmount: threshold,
      },
    });
    return response.data;
  }

  // ==================== QUERY OPERATIONS ====================

  async searchMessages(query: {
    searchTerm?: string;
    messageType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
    senderBic?: string;
    receiverBic?: string;
    lcId?: string;
    paymentId?: string;
  }) {
    const response = await this.api.get('/swift/messages/search', {
      params: query,
    });
    return response.data;
  }
}

// Export singleton instance
const swiftApi = new SWIFTApiService();
export default swiftApi;
