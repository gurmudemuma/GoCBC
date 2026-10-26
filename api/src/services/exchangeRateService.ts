// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Exchange Rate Service - Dynamic NBE Official Rates

import { FabricService } from './fabricService';
import { DatabaseService } from './databaseService';
import { logger } from '../utils/logger';

export interface ExchangeRate {
  rateId: string;
  currency: string;
  buyingRate: number;
  sellingRate: number;
  midRate: number;
  setBy: string;
  setByMsp: string;
  effectiveDate: string;
  isActive: boolean;
  source: string; // 'NBE_OFFICIAL' | 'MANUAL' | 'SYSTEM'
  createdAt: string;
}

export class ExchangeRateService {
  private static instance: ExchangeRateService;
  private fabricService: FabricService;
  private db: DatabaseService;
  
  // Current NBE official rates (October 2026)
  // Source: NBE official bulletin and market rates
  private readonly DEFAULT_RATES = {
    USD: { buying: 159.50, selling: 162.50, mid: 161.00 },
    EUR: { buying: 172.00, selling: 175.00, mid: 173.50 },
    GBP: { buying: 197.00, selling: 201.00, mid: 199.00 },
    JPY: { buying: 1.08, selling: 1.12, mid: 1.10 },
    CNY: { buying: 22.50, selling: 23.00, mid: 22.75 },
  };

  private constructor() {
    this.fabricService = FabricService.getInstance();
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): ExchangeRateService {
    if (!ExchangeRateService.instance) {
      ExchangeRateService.instance = new ExchangeRateService();
    }
    return ExchangeRateService.instance;
  }

  /** Get the active NBE exchange rate recorded on the Fabric ledger. */
  async getCurrentRate(currency: string = 'USD'): Promise<number> {
    try {
      const result = await this.fabricService.queryChaincode('QueryExchangeRate', [currency]);

      if (!result.success || !result.data) {
        throw new Error(result.error || `No active NBE exchange rate is recorded for ${currency}`);
      }

      const rate = result.data as any;
      const isActive = rate.isActive ?? rate.IsActive;
      const midRate = Number(rate.midRate ?? rate.MidRate);
      if (isActive !== true && String(isActive).toLowerCase() !== 'true') {
        throw new Error(`No active NBE exchange rate is recorded for ${currency}`);
      }
      if (!Number.isFinite(midRate) || midRate <= 0) {
        throw new Error(`The active NBE exchange rate for ${currency} is invalid`);
      }

      logger.info(`[EXCHANGE] Using ledger rate for ${currency}: ${midRate} ETB`);
      return midRate;
    } catch (error: any) {
      logger.error(`[EXCHANGE] Error getting rate for ${currency}:`, error);
      throw error;
    }
  }

  /**
   * Get all current exchange rates
   */
  async getAllCurrentRates(): Promise<ExchangeRate[]> {
    try {
      const result = await this.fabricService.queryChaincode('QueryAllExchangeRates', []);
      
      if (result.success && Array.isArray(result.data)) {
        return result.data.filter((rate: any) => {
          const isActive = rate.isActive ?? rate.IsActive;
          return isActive === true || String(isActive).toLowerCase() === 'true';
        });
      }

      throw new Error(result.error || 'Unable to query exchange rates from the Fabric ledger');
    } catch (error: any) {
      logger.error('[EXCHANGE] Error getting all rates:', error);
      throw error;
    }
  }

  /**
   * Set new exchange rate (NBE only)
   */
  async setRate(
    currency: string,
    buyingRate: number,
    sellingRate: number,
    setBy: string,
    source: string = 'NBE_OFFICIAL'
  ): Promise<{ success: boolean; data?: ExchangeRate; error?: string }> {
    try {
      const rateId = `RATE${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const midRate = (buyingRate + sellingRate) / 2;
      
      const result = await this.fabricService.invokeChaincode('SetExchangeRate', [
        rateId,
        currency,
        buyingRate.toString(),
        sellingRate.toString(),
        setBy
      ]);
      
      if (result.success) {
        logger.info(`✅ Exchange rate set: ${currency} = ${buyingRate}/${sellingRate} ETB (mid: ${midRate})`);
        
        return {
          success: true,
          data: {
            rateId,
            currency,
            buyingRate,
            sellingRate,
            midRate,
            setBy,
            setByMsp: 'NBEMSP',
            effectiveDate: new Date().toISOString(),
            isActive: true,
            source,
            createdAt: new Date().toISOString()
          }
        };
      }
      
      return { success: false, error: result.error || 'Failed to set rate' };
    } catch (error: any) {
      logger.error('[EXCHANGE] Error setting rate:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Initialize default rates in blockchain (first-time setup)
   */
  async initializeDefaultRates(setBy: string = 'NBE System'): Promise<void> {
    try {
      logger.info('[EXCHANGE] Initializing default NBE rates...');
      
      const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY'];
      
      for (const currency of currencies) {
        const rates = this.DEFAULT_RATES[currency as keyof typeof this.DEFAULT_RATES];
        if (rates) {
          await this.setRate(currency, rates.buying, rates.selling, setBy, 'SYSTEM');
          logger.info(`✅ Initialized ${currency} rate: ${rates.mid} ETB`);
        }
      }
      
      logger.info('✅ All default rates initialized');
    } catch (error: any) {
      logger.error('[EXCHANGE] Error initializing rates:', error);
      throw error;
    }
  }

  /**
   * Update all rates to latest NBE official rates
   * This should be called daily or when NBE publishes new rates
   */
  async updateToLatestRates(setBy: string, rates: {
    [currency: string]: { buying: number; selling: number }
  }): Promise<void> {
    try {
      logger.info('[EXCHANGE] Updating to latest NBE rates...');
      
      for (const [currency, rate] of Object.entries(rates)) {
        await this.setRate(currency, rate.buying, rate.selling, setBy, 'NBE_OFFICIAL');
      }
      
      logger.info('✅ All rates updated to latest NBE official rates');
    } catch (error: any) {
      logger.error('[EXCHANGE] Error updating rates:', error);
      throw error;
    }
  }

  /**
   * Get exchange rate history for a currency
   */
  async getRateHistory(currency: string): Promise<ExchangeRate[]> {
    try {
      const result = await this.fabricService.queryChaincode('QueryExchangeRateHistory', [currency]);
      
      if (result.success && Array.isArray(result.data)) {
        return result.data;
      }
      
      return [];
    } catch (error: any) {
      logger.error(`[EXCHANGE] Error getting rate history for ${currency}:`, error);
      return [];
    }
  }
}

// Export singleton instance
export const exchangeRateService = ExchangeRateService.getInstance();
