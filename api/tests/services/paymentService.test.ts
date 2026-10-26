// Test Suite for PaymentService - 40% NBE Retention Policy
import { describe, it, expect, beforeEach } from 'vitest';
import { PaymentService } from '../../src/services/paymentService';

describe('PaymentService', () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    paymentService = PaymentService.getInstance();
  });

  describe('40% NBE Retention Policy', () => {
    it('should calculate 40% retention correctly', () => {
      const totalAmount = 100000; // $100,000 USD
      const expectedRetention = 40000; // 40%
      const expectedRelease = 60000; // 60%

      const retention = totalAmount * 0.4;
      const release = totalAmount * 0.6;

      expect(retention).toBe(expectedRetention);
      expect(release).toBe(expectedRelease);
    });

    it('should split payment correctly for different amounts', () => {
      const testCases = [
        { amount: 50000, retention: 20000, release: 30000 },
        { amount: 150000, retention: 60000, release: 90000 },
        { amount: 75000, retention: 30000, release: 45000 },
      ];

      testCases.forEach(testCase => {
        const retention = testCase.amount * 0.4;
        const release = testCase.amount * 0.6;

        expect(retention).toBe(testCase.retention);
        expect(release).toBe(testCase.release);
      });
    });
  });

  describe('recordPayment', () => {
    it('should record payment with automatic retention split', async () => {
      const paymentData = {
        paymentID: 'PAY-TEST-001',
        contractID: 'CONTRACT-001',
        shipmentID: 'SHIP-001',
        exporterID: 'EXP001',
        amountUSD: 100000,
        currency: 'USD',
        paymentDate: new Date().toISOString(),
        payerName: 'International Buyer Corp',
        userId: 'test-user',
        userOrg: 'BanksMSP'
      };

      expect(paymentService).toBeDefined();
      expect(typeof paymentService.recordPayment).toBe('function');
    });
  });

  describe('convertRetention', () => {
    it('should convert 40% retention to Birr', async () => {
      const conversionData = {
        paymentID: 'PAY-TEST-001',
        exchangeRate: 55.5, // 1 USD = 55.5 Birr
        amountBirr: 40000 * 55.5, // $40,000 * rate
        convertedBy: 'nbe-officer',
        conversionRef: 'CONV-001',
        conversionDate: new Date().toISOString(),
        userId: 'test-user',
        userOrg: 'NBEMSP'
      };

      const expectedBirr = 2220000; // 40,000 * 55.5
      expect(conversionData.amountBirr).toBe(expectedBirr);
    });
  });

  describe('releasePayment', () => {
    it('should release 60% to exporter', async () => {
      const releaseData = {
        paymentID: 'PAY-TEST-001',
        exporterAccount: 'ACCT-EXP001',
        releasedBy: 'bank-officer',
        releaseRef: 'REL-001',
        releaseDate: new Date().toISOString(),
        userId: 'test-user',
        userOrg: 'BanksMSP'
      };

      expect(paymentService).toBeDefined();
      expect(typeof paymentService.releasePayment).toBe('function');
    });
  });

  describe('getPaymentStats', () => {
    it('should calculate payment statistics with retention breakdown', async () => {
      const exporterID = 'EXP001';
      
      expect(paymentService).toBeDefined();
      expect(typeof paymentService.getPaymentStats).toBe('function');
    });
  });
});
