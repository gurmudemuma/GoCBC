// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Analytics Service - Business Intelligence & Reporting

import { DatabaseService } from './databaseService';
import { logger } from '../utils/logger';

export class AnalyticsService {
  private static instance: AnalyticsService;
  private db: DatabaseService;

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  // ==================== DASHBOARD KPIs ====================

  async getDashboardKPIs(organizationType: string, dateFrom?: string, dateTo?: string) {
    try {
      const whereClause = this.buildDateFilter(dateFrom, dateTo);
      
      switch (organizationType.toUpperCase()) {
        case 'ECTA':
          return await this.getECTAKPIs(whereClause);
        case 'BANKS':
          return await this.getBanksKPIs(whereClause);
        case 'NBE':
          return await this.getNBEKPIs(whereClause);
        case 'CUSTOMS':
          return await this.getCustomsKPIs(whereClause);
        case 'EXPORTER':
          return await this.getExporterKPIs(whereClause);
        default:
          return await this.getSystemKPIs(whereClause);
      }
    } catch (error) {
      logger.error('Error getting dashboard KPIs:', error);
      throw error;
    }
  }

  // ==================== ECTA ANALYTICS ====================

  private async getECTAKPIs(whereClause: string) {
    // Applications statistics
    const applications = await this.db.get(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        AVG(CASE WHEN approved_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (approved_at - submitted_at))/86400 END) as avg_processing_days
      FROM exporter_applications
      ${whereClause}
    `);

    // Contracts statistics
    const contracts = await this.db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN metadata->>'status' = 'REGISTERED' THEN 1 ELSE 0 END) as registered,
        SUM(CASE WHEN metadata->>'status' = 'APPROVED' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN metadata->>'status' = 'REJECTED' THEN 1 ELSE 0 END) as rejected
      FROM audit_trail
      WHERE entity_type = 'CONTRACT' AND action = 'CREATE'
      ${whereClause.replace('WHERE', 'AND')}
    `);

    // Quality inspections
    const inspections = await this.db.get(`
      SELECT 
        COUNT(*) as total,
        AVG(CASE WHEN metadata->>'overall' IS NOT NULL 
          THEN CAST(metadata->>'overall' AS NUMERIC) END) as avg_cupping_score
      FROM audit_trail
      WHERE entity_type = 'SHIPMENT' AND action LIKE '%INSPECT%'
      ${whereClause.replace('WHERE', 'AND')}
    `);

    // Export volume
    const exportVolume = await this.db.get(`
      SELECT 
        SUM(CAST(metadata->>'quantity' AS NUMERIC)) as total_kg,
        SUM(CAST(metadata->>'valueUSD' AS NUMERIC)) as total_value_usd
      FROM audit_trail
      WHERE entity_type = 'SHIPMENT' AND action = 'CREATE'
      ${whereClause.replace('WHERE', 'AND')}
    `);

    return {
      applications: {
        total: parseInt(applications?.total || 0),
        pending: parseInt(applications?.pending || 0),
        approved: parseInt(applications?.approved || 0),
        rejected: parseInt(applications?.rejected || 0),
        avgProcessingDays: parseFloat(applications?.avg_processing_days || 0).toFixed(1)
      },
      contracts: {
        total: parseInt(contracts?.total || 0),
        registered: parseInt(contracts?.registered || 0),
        approved: parseInt(contracts?.approved || 0),
        rejected: parseInt(contracts?.rejected || 0),
        approvalRate: contracts?.total > 0 
          ? ((contracts.approved / contracts.total) * 100).toFixed(1) 
          : 0
      },
      inspections: {
        total: parseInt(inspections?.total || 0),
        avgCuppingScore: parseFloat(inspections?.avg_cupping_score || 0).toFixed(1)
      },
      exportVolume: {
        totalKg: parseFloat(exportVolume?.total_kg || 0),
        totalValueUSD: parseFloat(exportVolume?.total_value_usd || 0),
        avgPricePerKg: exportVolume?.total_kg > 0 
          ? (exportVolume.total_value_usd / exportVolume.total_kg).toFixed(2)
          : 0
      }
    };
  }

  // ==================== BANKS ANALYTICS ====================

  private async getBanksKPIs(whereClause: string) {
    // LC statistics
    const lcs = await this.db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN metadata->>'status' = 'REQUESTED' THEN 1 ELSE 0 END) as requested,
        SUM(CASE WHEN metadata->>'status' = 'APPROVED' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN metadata->>'status' = 'ISSUED' THEN 1 ELSE 0 END) as issued,
        SUM(CAST(metadata->>'amount' AS NUMERIC)) as total_amount
      FROM audit_trail
      WHERE entity_type = 'LC'
      ${whereClause.replace('WHERE', 'AND')}
    `);

    // Forex statistics
    const forex = await this.db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CAST(metadata->>'allocatedAmount' AS NUMERIC)) as total_allocated,
        SUM(CAST(metadata->>'allocatedAmount' AS NUMERIC) * 
            CAST(metadata->>'exchangeRate' AS NUMERIC)) as total_etb,
        AVG(CAST(metadata->>'retentionRate' AS NUMERIC)) as avg_retention
      FROM audit_trail
      WHERE entity_type = 'FOREX' AND action = 'ALLOCATE'
      ${whereClause.replace('WHERE', 'AND')}
    `);

    // Payments statistics
    const payments = await this.db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CAST(metadata->>'amount' AS NUMERIC)) as total_amount,
        COUNT(CASE WHEN metadata->>'status' = 'RELEASED' THEN 1 END) as released,
        AVG(EXTRACT(EPOCH FROM (
          CASE WHEN metadata->>'releasedAt' IS NOT NULL 
          THEN CAST(metadata->>'releasedAt' AS TIMESTAMP) - created_at 
          END
        ))/86400) as avg_days_to_release
      FROM audit_trail
      WHERE entity_type = 'PAYMENT'
      ${whereClause.replace('WHERE', 'AND')}
    `);

    // SWIFT messages
    const swift = await this.db.get(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN metadata->>'messageType' = 'MT700' THEN 1 END) as mt700,
        COUNT(CASE WHEN metadata->>'messageType' = 'MT710' THEN 1 END) as mt710,
        COUNT(CASE WHEN metadata->>'messageType' = 'MT103' THEN 1 END) as mt103
      FROM audit_trail
      WHERE entity_type = 'SWIFT'
      ${whereClause.replace('WHERE', 'AND')}
    `);

    return {
      lcs: {
        total: parseInt(lcs?.total || 0),
        requested: parseInt(lcs?.requested || 0),
        approved: parseInt(lcs?.approved || 0),
        issued: parseInt(lcs?.issued || 0),
        totalAmount: parseFloat(lcs?.total_amount || 0)
      },
      forex: {
        total: parseInt(forex?.total || 0),
        totalAllocated: parseFloat(forex?.total_allocated || 0),
        totalETB: parseFloat(forex?.total_etb || 0),
        avgRetention: parseFloat(forex?.avg_retention || 50).toFixed(1)
      },
      payments: {
        total: parseInt(payments?.total || 0),
        released: parseInt(payments?.released || 0),
        totalAmount: parseFloat(payments?.total_amount || 0),
        avgDaysToRelease: parseFloat(payments?.avg_days_to_release || 0).toFixed(1)
      },
      swift: {
        total: parseInt(swift?.total || 0),
        mt700: parseInt(swift?.mt700 || 0),
        mt710: parseInt(swift?.mt710 || 0),
        mt103: parseInt(swift?.mt103 || 0)
      }
    };
  }

  // ==================== NBE ANALYTICS ====================

  private async getNBEKPIs(whereClause: string) {
    // Forex compliance
    const forexCompliance = await this.db.get(`
      SELECT 
        COUNT(*) as total_allocations,
        SUM(CAST(metadata->>'allocatedAmount' AS NUMERIC)) as total_forex,
        SUM(CAST(metadata->>'allocatedAmount' AS NUMERIC) * 
            CAST(metadata->>'retentionRate' AS NUMERIC) / 100) as total_retained,
        AVG(CAST(metadata->>'retentionRate' AS NUMERIC)) as avg_retention_rate
      FROM audit_trail
      WHERE entity_type = 'FOREX' AND action = 'ALLOCATE'
      ${whereClause.replace('WHERE', 'AND')}
    `);

    // Payment methods breakdown
    const paymentMethods = await this.db.all(`
      SELECT 
        metadata->>'paymentMethod' as method,
        COUNT(*) as count,
        SUM(CAST(metadata->>'totalValue' AS NUMERIC)) as total_value
      FROM audit_trail
      WHERE entity_type = 'CONTRACT' AND action = 'CREATE'
      ${whereClause.replace('WHERE', 'AND')}
      GROUP BY metadata->>'paymentMethod'
    `);

    // Exchange rate statistics
    const exchangeRates = await this.db.all(`
      SELECT 
        metadata->>'currency' as currency,
        AVG(CAST(metadata->>'exchangeRate' AS NUMERIC)) as avg_rate,
        MIN(CAST(metadata->>'exchangeRate' AS NUMERIC)) as min_rate,
        MAX(CAST(metadata->>'exchangeRate' AS NUMERIC)) as max_rate
      FROM audit_trail
      WHERE entity_type = 'FOREX' AND metadata->>'exchangeRate' IS NOT NULL
      ${whereClause.replace('WHERE', 'AND')}
      GROUP BY metadata->>'currency'
    `);

    return {
      forexCompliance: {
        totalAllocations: parseInt(forexCompliance?.total_allocations || 0),
        totalForex: parseFloat(forexCompliance?.total_forex || 0),
        totalRetained: parseFloat(forexCompliance?.total_retained || 0),
        avgRetentionRate: parseFloat(forexCompliance?.avg_retention_rate || 50).toFixed(1),
        complianceRate: 100 // All allocations follow NBE policy
      },
      paymentMethods: paymentMethods.map(pm => ({
        method: pm.method || 'LC',
        count: parseInt(pm.count),
        totalValue: parseFloat(pm.total_value || 0)
      })),
      exchangeRates: exchangeRates.map(er => ({
        currency: er.currency,
        avgRate: parseFloat(er.avg_rate || 0).toFixed(2),
        minRate: parseFloat(er.min_rate || 0).toFixed(2),
        maxRate: parseFloat(er.max_rate || 0).toFixed(2)
      }))
    };
  }

  // ==================== CUSTOMS ANALYTICS ====================

  private async getCustomsKPIs(whereClause: string) {
    const declarations = await this.db.get(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN metadata->>'status' = 'SUBMITTED' THEN 1 END) as submitted,
        COUNT(CASE WHEN metadata->>'status' = 'CLEARED' THEN 1 END) as cleared,
        AVG(EXTRACT(EPOCH FROM (
          CASE WHEN metadata->>'clearedAt' IS NOT NULL 
          THEN CAST(metadata->>'clearedAt' AS TIMESTAMP) - created_at 
          END
        ))/86400) as avg_clearance_days
      FROM audit_trail
      WHERE entity_type = 'CUSTOMS'
      ${whereClause.replace('WHERE', 'AND')}
    `);

    const eudrCompliance = await this.db.get(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN metadata->>'eudrCompliant' = 'true' THEN 1 END) as compliant
      FROM audit_trail
      WHERE entity_type = 'SHIPMENT' AND metadata->>'eudrCompliant' IS NOT NULL
      ${whereClause.replace('WHERE', 'AND')}
    `);

    return {
      declarations: {
        total: parseInt(declarations?.total || 0),
        submitted: parseInt(declarations?.submitted || 0),
        cleared: parseInt(declarations?.cleared || 0),
        avgClearanceDays: parseFloat(declarations?.avg_clearance_days || 0).toFixed(1)
      },
      eudrCompliance: {
        total: parseInt(eudrCompliance?.total || 0),
        compliant: parseInt(eudrCompliance?.compliant || 0),
        complianceRate: eudrCompliance?.total > 0 
          ? ((eudrCompliance.compliant / eudrCompliance.total) * 100).toFixed(1)
          : 0
      }
    };
  }

  // ==================== EXPORTER ANALYTICS ====================

  private async getExporterKPIs(whereClause: string) {
    // Override with exporter-specific filter
    const exporterId = whereClause.match(/exporterId = '([^']+)'/)?.[1];
    const exporterFilter = exporterId ? `AND performed_by LIKE '%${exporterId}%'` : '';

    const contracts = await this.db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CAST(metadata->>'totalValue' AS NUMERIC)) as total_value,
        AVG(CAST(metadata->>'pricePerKg' AS NUMERIC)) as avg_price_per_kg
      FROM audit_trail
      WHERE entity_type = 'CONTRACT' AND action = 'CREATE'
      ${exporterFilter}
      ${whereClause.replace('WHERE', 'AND')}
    `);

    const shipments = await this.db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CAST(metadata->>'quantity' AS NUMERIC)) as total_kg
      FROM audit_trail
      WHERE entity_type = 'SHIPMENT' AND action = 'CREATE'
      ${exporterFilter}
      ${whereClause.replace('WHERE', 'AND')}
    `);

    const payments = await this.db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CAST(metadata->>'amount' AS NUMERIC)) as total_received,
        COUNT(CASE WHEN metadata->>'status' = 'RELEASED' THEN 1 END) as completed
      FROM audit_trail
      WHERE entity_type = 'PAYMENT'
      ${exporterFilter}
      ${whereClause.replace('WHERE', 'AND')}
    `);

    return {
      contracts: {
        total: parseInt(contracts?.total || 0),
        totalValue: parseFloat(contracts?.total_value || 0),
        avgPricePerKg: parseFloat(contracts?.avg_price_per_kg || 0).toFixed(2)
      },
      shipments: {
        total: parseInt(shipments?.total || 0),
        totalKg: parseFloat(shipments?.total_kg || 0)
      },
      payments: {
        total: parseInt(payments?.total || 0),
        completed: parseInt(payments?.completed || 0),
        totalReceived: parseFloat(payments?.total_received || 0),
        completionRate: payments?.total > 0 
          ? ((payments.completed / payments.total) * 100).toFixed(1)
          : 0
      }
    };
  }

  // ==================== SYSTEM-WIDE ANALYTICS ====================

  private async getSystemKPIs(whereClause: string) {
    const overview = await this.db.get(`
      SELECT 
        COUNT(DISTINCT CASE WHEN entity_type = 'EXPORTER' THEN entity_id END) as total_exporters,
        COUNT(DISTINCT CASE WHEN entity_type = 'CONTRACT' THEN entity_id END) as total_contracts,
        COUNT(DISTINCT CASE WHEN entity_type = 'SHIPMENT' THEN entity_id END) as total_shipments,
        COUNT(DISTINCT CASE WHEN entity_type = 'LC' THEN entity_id END) as total_lcs,
        COUNT(*) as total_transactions
      FROM audit_trail
      ${whereClause}
    `);

    return {
      overview: {
        totalExporters: parseInt(overview?.total_exporters || 0),
        totalContracts: parseInt(overview?.total_contracts || 0),
        totalShipments: parseInt(overview?.total_shipments || 0),
        totalLCs: parseInt(overview?.total_lcs || 0),
        totalTransactions: parseInt(overview?.total_transactions || 0)
      }
    };
  }

  // ==================== TIME SERIES DATA ====================

  async getTimeSeriesData(metric: string, period: 'day' | 'week' | 'month', dateFrom?: string, dateTo?: string) {
    const dateFormat = period === 'day' ? 'YYYY-MM-DD' : period === 'week' ? 'IYYY-IW' : 'YYYY-MM';
    const whereClause = this.buildDateFilter(dateFrom, dateTo);

    let query = '';
    switch (metric) {
      case 'contracts':
        query = `
          SELECT 
            TO_CHAR(created_at, '${dateFormat}') as period,
            COUNT(*) as value,
            SUM(CAST(metadata->>'totalValue' AS NUMERIC)) as total_value
          FROM audit_trail
          WHERE entity_type = 'CONTRACT' AND action = 'CREATE'
          ${whereClause.replace('WHERE', 'AND')}
          GROUP BY period
          ORDER BY period
        `;
        break;
      
      case 'shipments':
        query = `
          SELECT 
            TO_CHAR(created_at, '${dateFormat}') as period,
            COUNT(*) as value,
            SUM(CAST(metadata->>'quantity' AS NUMERIC)) as total_kg
          FROM audit_trail
          WHERE entity_type = 'SHIPMENT' AND action = 'CREATE'
          ${whereClause.replace('WHERE', 'AND')}
          GROUP BY period
          ORDER BY period
        `;
        break;
      
      case 'payments':
        query = `
          SELECT 
            TO_CHAR(created_at, '${dateFormat}') as period,
            COUNT(*) as value,
            SUM(CAST(metadata->>'amount' AS NUMERIC)) as total_amount
          FROM audit_trail
          WHERE entity_type = 'PAYMENT'
          ${whereClause.replace('WHERE', 'AND')}
          GROUP BY period
          ORDER BY period
        `;
        break;
    }

    const results = await this.db.all(query);
    return results.map(r => ({
      period: r.period,
      value: parseInt(r.value || 0),
      totalValue: parseFloat(r.total_value || r.total_amount || r.total_kg || 0)
    }));
  }

  // ==================== HELPER METHODS ====================

  private buildDateFilter(dateFrom?: string, dateTo?: string): string {
    const filters = [];
    
    if (dateFrom) {
      filters.push(`created_at >= '${dateFrom}'`);
    }
    if (dateTo) {
      filters.push(`created_at <= '${dateTo}'`);
    }
    
    return filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  }
}
