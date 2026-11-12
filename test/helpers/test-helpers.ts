/**
 * Test Helper Functions
 * Utilities for workflow testing
 */

import { GoCBCApiClient } from './api-client';

export interface TestResult {
  passed: boolean;
  message: string;
  data?: any;
  error?: any;
}

export class TestLogger {
  private testName: string;
  private results: TestResult[] = [];
  private startTime: Date;

  constructor(testName: string) {
    this.testName = testName;
    this.startTime = new Date();
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🧪 Starting Test: ${testName}`);
    console.log(`⏰ Time: ${this.startTime.toISOString()}`);
    console.log('='.repeat(80));
  }

  step(message: string): void {
    console.log(`\n📍 ${message}`);
  }

  success(message: string, data?: any): void {
    console.log(`  ✅ ${message}`);
    this.results.push({ passed: true, message, data });
  }

  fail(message: string, error?: any): void {
    console.log(`  ❌ ${message}`);
    if (error) {
      console.log(`     Error: ${error.message || error}`);
    }
    this.results.push({ passed: false, message, error });
  }

  info(message: string): void {
    console.log(`  ℹ️  ${message}`);
  }

  warn(message: string): void {
    console.log(`  ⚠️  ${message}`);
  }

  data(label: string, value: any): void {
    console.log(`  📊 ${label}:`, JSON.stringify(value, null, 2));
  }

  summary(): { passed: number; failed: number; total: number; duration: number } {
    const endTime = new Date();
    const duration = endTime.getTime() - this.startTime.getTime();
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 Test Summary: ${this.testName}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`  ✅ Passed: ${passed}/${total}`);
    console.log(`  ❌ Failed: ${failed}/${total}`);
    console.log(`  ⏱️  Duration: ${duration}ms`);
    console.log(`  📈 Success Rate: ${((passed / total) * 100).toFixed(2)}%`);
    console.log('='.repeat(80));

    return { passed, failed, total, duration };
  }
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateTestId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}-${timestamp}-${random}`;
}

export function validateStatus(actual: string, expected: string): boolean {
  return actual.toUpperCase() === expected.toUpperCase();
}

export function validateStatusTransition(
  from: string,
  to: string,
  validTransitions: Record<string, string[]>
): boolean {
  const normalizedFrom = from.toUpperCase();
  const normalizedTo = to.toUpperCase();
  
  if (!validTransitions[normalizedFrom]) {
    return false;
  }
  
  return validTransitions[normalizedFrom].includes(normalizedTo);
}

export async function waitForStatus(
  checkFn: () => Promise<string>,
  expectedStatus: string,
  maxAttempts: number = 10,
  delayMs: number = 2000
): Promise<{ success: boolean; currentStatus: string; attempts: number }> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const currentStatus = await checkFn();
    
    if (validateStatus(currentStatus, expectedStatus)) {
      return { success: true, currentStatus, attempts: attempt };
    }
    
    if (attempt < maxAttempts) {
      await sleep(delayMs);
    }
  }
  
  const finalStatus = await checkFn();
  return { success: false, currentStatus: finalStatus, attempts: maxAttempts };
}

export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await sleep(delayMs);
      }
    }
  }
  
  throw lastError;
}

export class StatusValidator {
  private validTransitions: Record<string, string[]>;

  constructor(validTransitions: Record<string, string[]>) {
    this.validTransitions = validTransitions;
  }

  validate(from: string, to: string): boolean {
    return validateStatusTransition(from, to, this.validTransitions);
  }

  getValidNextStatuses(from: string): string[] {
    return this.validTransitions[from.toUpperCase()] || [];
  }
}

/**
 * Status transition validators for each workflow
 */
export const ContractStatusValidator = new StatusValidator({
  'DRAFT': ['REGISTERED'],
  'REGISTERED': ['APPROVED', 'NBE_APPROVED', 'REJECTED'],
  'APPROVED': ['ACTIVE', 'NBE_APPROVED'],
  'NBE_APPROVED': ['ACTIVE'],
  'ACTIVE': ['COMPLETED', 'CANCELLED'],
});

export const ForexStatusValidator = new StatusValidator({
  'REQUESTED': ['ALLOCATED', 'REJECTED'],
  'ALLOCATED': ['UTILIZED'],
  'UTILIZED': ['REPATRIATED'],
});

export const LCStatusValidator = new StatusValidator({
  'REQUESTED': ['APPROVED', 'REJECTED'],
  'APPROVED': ['ISSUED'],
  'ISSUED': ['DOCUMENTS_PRESENTED', 'ACTIVE', 'UTILIZED'],
  'DOCUMENTS_PRESENTED': ['DOCUMENTS_EXAMINED'],
  'DOCUMENTS_EXAMINED': ['PAYMENT_RELEASED', 'DISCREPANT'],
  'DISCREPANT': ['DOCUMENTS_EXAMINED', 'REJECTED'],
  'PAYMENT_RELEASED': ['SETTLED'],
});

export const ShipmentStatusValidator = new StatusValidator({
  'CREATED': ['REGISTERED'],
  'REGISTERED': ['QUALITY_INSPECTED', 'CUSTOMS_CLEARED'],
  'QUALITY_INSPECTED': ['CUSTOMS_CLEARED'],
  'CUSTOMS_CLEARED': ['LAND_TRANSPORT'],
  'LAND_TRANSPORT': ['PORT_ARRIVED'],
  'PORT_ARRIVED': ['CONTAINER_STUFFED'],
  'CONTAINER_STUFFED': ['VESSEL_LOADED'],
  'VESSEL_LOADED': ['DEPARTED'],
  'DEPARTED': ['IN_TRANSIT'],
  'IN_TRANSIT': ['DESTINATION_ARRIVED'],
  'DESTINATION_ARRIVED': ['DELIVERED'],
});

export const CustomsStatusValidator = new StatusValidator({
  'DRAFT': ['SUBMITTED'],
  'SUBMITTED': ['INSPECTING'],
  'INSPECTING': ['UNDER_REVIEW'],
  'UNDER_REVIEW': ['CLEARED', 'REJECTED'],
  'CLEARED': ['BORDER_CROSSED'],
});

export const InspectionStatusValidator = new StatusValidator({
  'PENDING': ['SCHEDULED'],
  'SCHEDULED': ['INSPECTING', 'UNDER_REVIEW'],
  'INSPECTING': ['UNDER_REVIEW'],
  'UNDER_REVIEW': ['APPROVED', 'REJECTED'],
});

export const ECXLotStatusValidator = new StatusValidator({
  'WAREHOUSED': ['GRADED'],
  'GRADED': ['ASSIGNED'],
  'ASSIGNED': ['RELEASED'],
});

/**
 * Test data generators
 */
export function generateContractData(exporterId: string): any {
  const contractId = generateTestId('CONTRACT');
  
  return {
    contractId,
    exporterId,
    buyerName: 'Test Coffee Importers GmbH',
    buyerCompany: 'European Coffee Trading Ltd',
    buyerCountry: 'Germany',
    buyerEmail: 'buyer@testcoffee.de',
    buyerPhone: '+49-30-12345678',
    buyerBank: 'Deutsche Bank AG',
    exporterBank: 'Commercial Bank of Ethiopia',
    coffeeType: 'Yirgacheffe Washed',
    quantity: 10000,
    pricePerKg: 8.50,
    currency: 'USD',
    totalValue: 85000,
    incoterm: 'FOB',
    paymentMethod: 'LC',
    paymentTerms: 'Letter of Credit',
    portOfLoading: 'Djibouti',
    portOfDestination: 'Hamburg',
    deliveryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    eudrRequired: true,
    organicCertified: false,
    fairTradeCertified: false,
    specialInstructions: 'Handle with care. Temperature controlled shipping required.',
  };
}

export function generateForexRequestData(contractId: string, amount: number): any {
  return {
    contractId,
    requestedAmount: amount * 0.6, // 60% minimum retention
    currency: 'USD',
    purpose: 'Export payment for coffee',
    expectedUtilizationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  };
}

export function generateLCRequestData(contractId: string, exporterId: string): any {
  return {
    contractId,
    exporterId,
    issuingBank: 'Deutsche Bank AG',
    advisingBank: 'Commercial Bank of Ethiopia',
    beneficiary: exporterId,
    lcType: 'Irrevocable',
    terms: 'Payment against shipping documents as per UCP 600',
    expiryDays: 90,
  };
}

export function generateShipmentData(contractId: string, exporterId: string): any {
  const shipmentId = generateTestId('SHIP');
  
  return {
    shipmentId,
    contractId,
    exporterId,
    quantity: 10000,
    transportMode: 'SEA',
    expectedDepartureDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    portOfLoading: 'Djibouti',
    portOfDischarge: 'Hamburg',
  };
}

export function generateCustomsDeclarationData(shipmentId: string, exporterId: string): any {
  const declarationId = generateTestId('DECL');
  
  return {
    declarationId,
    shipmentId,
    exporterId,
    declarationType: 'EXPORT',
    customsValue: 85000,
    currency: 'USD',
    hsCode: '0901.11',
    hsDescription: 'Coffee, not roasted, not decaffeinated',
    transportMode: 'SEA',
    portOfExit: 'DJIBOUTI',
    destinationCountry: 'Germany',
    eudrCompliant: true,
  };
}

export function generateECXIntakeData(exporterId: string): any {
  return {
    exporterId,
    exporterName: 'Test Exporter Company',
    origin: 'Yirgacheffe',
    subRegion: 'Kochere',
    quantity: 10000,
    bags: 167, // 10000kg / 60kg per bag
    harvestSeason: '2025/2026',
    processingMethod: 'Washed',
    warehouseId: 'WH-ADDIS-01',
  };
}

export function generateGradingData(): any {
  return {
    moistureContent: 11.5,
    defectCount: 2,
    qualityScore: 85,
    grade: 'Grade 1',
    gradingOfficer: 'Ato Mulugeta Girma',
    remarks: 'Excellent quality, clean cup with floral notes',
  };
}
