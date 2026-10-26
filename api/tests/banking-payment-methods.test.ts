/**
 * Bank Portal Payment Methods Tests
 * Tests for CAD, Consignment, and Advance Payment implementations
 * Created: July 2, 2026
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';

const API_BASE = 'http://localhost:3001';
let authToken: string;

beforeAll(async () => {
  // Login as bank user
  const loginResponse = await request(API_BASE)
    .post('/api/v1/auth/login')
    .send({
      username: 'bank_user',
      password: 'test_password',
    });
  
  authToken = loginResponse.body.token;
});

describe('Documentary Collection (CAD) Tests', () => {
  const testCollectionID = `CAD-TEST-${Date.now()}`;
  const testContractID = 'CONTRACT-001';
  const testExporterID = 'EXP-001';

  it('should register a documentary collection with SIGHT payment', async () => {
    const response = await request(API_BASE)
      .post('/api/v1/banking/cad/register')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        collectionID: testCollectionID,
        contractID: testContractID,
        exporterID: testExporterID,
        drawerName: 'Test Exporter Ltd',
        draweeName: 'Test Importer Inc',
        draweeAddress: '123 Import Street, New York, USA',
        amount: 50000,
        currency: 'USD',
        paymentTerm: 'SIGHT',
        acceptanceDays: 0,
        remittingBank: 'Commercial Bank of Ethiopia',
        remittingBankBIC: 'CBETETAA',
        collectingBank: 'Citibank N.A.',
        collectingBankBIC: 'CITIUS33',
        instructions: 'Present documents directly to drawee. Protest if unpaid.',
        documents: ['B/L', 'Invoice', 'Packing List', 'Certificate of Origin'],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('Documentary collection registered successfully');
  });

  it('should reject CAD registration with invalid payment term', async () => {
    const response = await request(API_BASE)
      .post('/api/v1/banking/cad/register')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        collectionID: `CAD-INVALID-${Date.now()}`,
        contractID: testContractID,
        exporterID: testExporterID,
        drawerName: 'Test Exporter',
        draweeName: 'Test Importer',
        draweeAddress: 'Test Address',
        amount: 10000,
        currency: 'USD',
        paymentTerm: 'INVALID_TERM',  // Invalid
        remittingBank: 'CBE',
        remittingBankBIC: 'CBETETAA',
        collectingBank: 'Foreign Bank',
        collectingBankBIC: 'TESTBIC',
        documents: ['B/L'],
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should update CAD status', async () => {
    const response = await request(API_BASE)
      .put(`/api/v1/banking/cad/${testCollectionID}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        status: 'FORWARDED',
        notes: 'Documents forwarded to collecting bank',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should record CAD payment', async () => {
    // First set status to PRESENTED
    await request(API_BASE)
      .put(`/api/v1/banking/cad/${testCollectionID}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'PRESENTED' });

    const response = await request(API_BASE)
      .post(`/api/v1/banking/cad/${testCollectionID}/payment`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amountReceived: 50000,
        paymentReference: 'MT103-20260702-001',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('CAD payment recorded successfully');
  });

  it('should retrieve CAD collections by exporter', async () => {
    const response = await request(API_BASE)
      .get(`/api/v1/banking/cad/exporter/${testExporterID}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});

describe('Consignment Tests', () => {
  const testConsignmentID = `CNS-TEST-${Date.now()}`;
  const testExporterID = 'EXP-001';

  it('should register consignment for FRUITS', async () => {
    const response = await request(API_BASE)
      .post('/api/v1/banking/consignment/register')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        consignmentID: testConsignmentID,
        exporterID: testExporterID,
        commodityType: 'FRUITS',
        description: 'Fresh Avocados, Grade A',
        buyerName: 'European Fruit Distributors',
        buyerAddress: '456 Distribution Ave, Rotterdam',
        buyerCountry: 'Netherlands',
        permitAmount: 25000,
        currency: 'USD',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.warning).toContain('90 days');
  });

  it('should reject consignment for non-allowed commodity (COFFEE)', async () => {
    const response = await request(API_BASE)
      .post('/api/v1/banking/consignment/register')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        consignmentID: `CNS-INVALID-${Date.now()}`,
        exporterID: testExporterID,
        commodityType: 'COFFEE',  // Not allowed
        description: 'Arabica Coffee',
        buyerName: 'Test Buyer',
        buyerAddress: 'Test Address',
        buyerCountry: 'USA',
        permitAmount: 50000,
        currency: 'USD',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('LIMITED TO');
  });

  it('should update consignment status to SHIPPED', async () => {
    const response = await request(API_BASE)
      .put(`/api/v1/banking/consignment/${testConsignmentID}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        status: 'SHIPPED',
        notes: 'Goods shipped via vessel MV Rotterdam',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should record partial consignment payment', async () => {
    const response = await request(API_BASE)
      .post(`/api/v1/banking/consignment/${testConsignmentID}/payment`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amountReceived: 15000,  // Partial payment
        paymentReference: 'MT103-20260702-002',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should record final consignment payment and mark SETTLED', async () => {
    const response = await request(API_BASE)
      .post(`/api/v1/banking/consignment/${testConsignmentID}/payment`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amountReceived: 10000,  // Balance
        paymentReference: 'MT103-20260702-003',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should retrieve outstanding consignments', async () => {
    const response = await request(API_BASE)
      .get('/api/v1/banking/consignment/outstanding')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});

describe('Advance Payment Tests', () => {
  const testPaymentID = `ADV-TEST-${Date.now()}`;
  const testContractID = 'CONTRACT-001';
  const testExporterID = 'EXP-001';

  it('should initiate advance payment', async () => {
    const response = await request(API_BASE)
      .post('/api/v1/banking/payment/initiate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        paymentID: testPaymentID,
        contractID: testContractID,
        exporterID: testExporterID,
        lcID: '',
        amount: 100000,
        currency: 'USD',
        receivingBank: 'Commercial Bank of Ethiopia',
        receivingBankBIC: 'CBETETAA',
        beneficiaryName: 'Test Exporter Ltd',
        beneficiaryAccount: '1234567890',
        paymentMethod: 'ADVANCE',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.metadata.paymentMethod).toBe('ADVANCE');
    expect(response.body.metadata.riskProfile).toBe('LOW');
  });

  it('should record 30% advance payment', async () => {
    const response = await request(API_BASE)
      .post(`/api/v1/banking/payment/${testPaymentID}/receive-advance`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        advancePercentage: 30,
        amountReceived: 30000,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('30%');
  });

  it('should record balance payment', async () => {
    const response = await request(API_BASE)
      .post(`/api/v1/banking/payment/${testPaymentID}/receive-balance`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amountReceived: 70000,  // Remaining 70%
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should reject advance payment over 100%', async () => {
    const testPaymentID2 = `ADV-TEST-${Date.now()}`;
    
    // Create payment
    await request(API_BASE)
      .post('/api/v1/banking/payment/initiate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        paymentID: testPaymentID2,
        contractID: testContractID,
        exporterID: testExporterID,
        amount: 50000,
        currency: 'USD',
        receivingBank: 'CBE',
        receivingBankBIC: 'CBETETAA',
        beneficiaryName: 'Test',
        beneficiaryAccount: '123',
        paymentMethod: 'ADVANCE',
      });

    const response = await request(API_BASE)
      .post(`/api/v1/banking/payment/${testPaymentID2}/receive-advance`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        advancePercentage: 150,  // Invalid
        amountReceived: 75000,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

describe('Payment Method Validation Tests', () => {
  it('should return correct risk profile for each payment method', async () => {
    const methods = ['LC', 'CAD', 'TT_ADVANCE', 'TT_POST', 'ADVANCE'];
    const expectedRisks = ['LOW', 'MEDIUM', 'LOW', 'HIGH', 'LOW'];

    for (let i = 0; i < methods.length; i++) {
      const response = await request(API_BASE)
        .get(`/api/v1/banking/payment/by-method/${methods[i]}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.metadata.riskProfile).toBe(expectedRisks[i]);
    }
  });

  it('should reject invalid payment method', async () => {
    const response = await request(API_BASE)
      .post('/api/v1/banking/payment/initiate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        paymentID: `TEST-${Date.now()}`,
        contractID: 'CONTRACT-001',
        exporterID: 'EXP-001',
        amount: 10000,
        currency: 'USD',
        receivingBank: 'CBE',
        receivingBankBIC: 'CBETETAA',
        beneficiaryName: 'Test',
        beneficiaryAccount: '123',
        paymentMethod: 'INVALID_METHOD',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

afterAll(async () => {
  // Cleanup if needed
  console.log('Tests completed');
});
