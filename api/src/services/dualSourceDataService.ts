// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Dual Source Data Service - Fetch from BOTH CouchDB and PostgreSQL

import { FabricService } from './fabricService';
import { DatabaseService } from './databaseService';
import { logger } from '../utils/logger';

export interface DataSourceStats {
  couchdbCount: number;
  postgresCount: number;
  totalCount: number;
  source: 'couchdb' | 'postgres' | 'both';
  mergedData: any[];
}

export class DualSourceDataService {
  private static instance: DualSourceDataService;
  private fabricService: FabricService;
  private dbService: DatabaseService;

  private constructor() {
    this.fabricService = FabricService.getInstance();
    this.dbService = DatabaseService.getInstance();
  }

  public static getInstance(): DualSourceDataService {
    if (!DualSourceDataService.instance) {
      DualSourceDataService.instance = new DualSourceDataService();
    }
    return DualSourceDataService.instance;
  }

  /**
   * Fetch Letters of Credit from BOTH CouchDB and PostgreSQL
   */
  public async getLettersOfCredit(): Promise<DataSourceStats> {
    const couchdbData: any[] = [];
    const postgresData: any[] = [];

    // 1. Fetch from CouchDB (blockchain state)
    try {
      const result = await this.fabricService.queryChaincode('QueryAllLCs', []);
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          couchdbData.push(...result.data);
        } else {
          couchdbData.push(result.data);
        }
      }
      logger.info(`[DUAL-SOURCE] CouchDB LCs: ${couchdbData.length}`);
    } catch (error) {
      logger.warn('[DUAL-SOURCE] Failed to fetch LCs from CouchDB:', error);
    }

    // 2. Fetch from PostgreSQL (application database)
    try {
      const rows = await this.dbService.all(`
        SELECT * FROM letters_of_credit 
        ORDER BY created_at DESC
      `);
      postgresData.push(...rows);
      logger.info(`[DUAL-SOURCE] PostgreSQL LCs: ${postgresData.length}`);
    } catch (error) {
      logger.warn('[DUAL-SOURCE] Failed to fetch LCs from PostgreSQL:', error);
    }

    // 3. Merge and deduplicate
    const merged = this.mergeByKey(couchdbData, postgresData, 'lcID', 'lc_id');

    return {
      couchdbCount: couchdbData.length,
      postgresCount: postgresData.length,
      totalCount: merged.length,
      source: couchdbData.length > 0 && postgresData.length > 0 ? 'both' : 
              couchdbData.length > 0 ? 'couchdb' : 'postgres',
      mergedData: merged
    };
  }

  /**
   * Fetch Advance Payments from BOTH sources
   */
  public async getAdvancePayments(): Promise<DataSourceStats> {
    const couchdbData: any[] = [];
    const postgresData: any[] = [];

    // 1. Fetch from CouchDB
    try {
      const result = await this.fabricService.queryChaincode('QueryAllAdvancePayments', []);
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          couchdbData.push(...result.data);
        } else {
          couchdbData.push(result.data);
        }
      }
      logger.info(`[DUAL-SOURCE] CouchDB Advance Payments: ${couchdbData.length}`);
    } catch (error) {
      logger.warn('[DUAL-SOURCE] Failed to fetch advance payments from CouchDB:', error);
    }

    // 2. Fetch from PostgreSQL
    try {
      const rows = await this.dbService.all(`
        SELECT * FROM advance_payments 
        ORDER BY created_at DESC
      `);
      postgresData.push(...rows);
      logger.info(`[DUAL-SOURCE] PostgreSQL Advance Payments: ${postgresData.length}`);
    } catch (error) {
      logger.warn('[DUAL-SOURCE] Failed to fetch advance payments from PostgreSQL:', error);
    }

    // 3. Merge and deduplicate
    const merged = this.mergeByKey(couchdbData, postgresData, 'paymentID', 'payment_id');

    return {
      couchdbCount: couchdbData.length,
      postgresCount: postgresData.length,
      totalCount: merged.length,
      source: couchdbData.length > 0 && postgresData.length > 0 ? 'both' : 
              couchdbData.length > 0 ? 'couchdb' : 'postgres',
      mergedData: merged
    };
  }

  /**
   * Fetch Consignment Payments from BOTH sources
   */
  public async getConsignmentPayments(): Promise<DataSourceStats> {
    const couchdbData: any[] = [];
    const postgresData: any[] = [];

    // 1. Fetch from CouchDB
    try {
      const result = await this.fabricService.queryChaincode('QueryAllConsignments', []);
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          couchdbData.push(...result.data);
        } else {
          couchdbData.push(result.data);
        }
      }
      logger.info(`[DUAL-SOURCE] CouchDB Consignments: ${couchdbData.length}`);
    } catch (error) {
      logger.warn('[DUAL-SOURCE] Failed to fetch consignments from CouchDB:', error);
    }

    // 2. Fetch from PostgreSQL
    try {
      const rows = await this.dbService.all(`
        SELECT * FROM consignment_payments 
        WHERE status = 'OUTSTANDING'
        ORDER BY created_at DESC
      `);
      postgresData.push(...rows);
      logger.info(`[DUAL-SOURCE] PostgreSQL Consignments: ${postgresData.length}`);
    } catch (error) {
      logger.warn('[DUAL-SOURCE] Failed to fetch consignments from PostgreSQL:', error);
    }

    // 3. Merge and deduplicate
    const merged = this.mergeByKey(couchdbData, postgresData, 'consignmentID', 'consignment_id');

    return {
      couchdbCount: couchdbData.length,
      postgresCount: postgresData.length,
      totalCount: merged.length,
      source: couchdbData.length > 0 && postgresData.length > 0 ? 'both' : 
              couchdbData.length > 0 ? 'couchdb' : 'postgres',
      mergedData: merged
    };
  }

  /**
   * Fetch Documentary Collections (CAD) from BOTH sources
   */
  public async getDocumentaryCollections(): Promise<DataSourceStats> {
    const couchdbData: any[] = [];
    const postgresData: any[] = [];

    // 1. Fetch from CouchDB
    try {
      const result = await this.fabricService.queryChaincode('QueryAllCollections', []);
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          couchdbData.push(...result.data);
        } else {
          couchdbData.push(result.data);
        }
      }
      logger.info(`[DUAL-SOURCE] CouchDB Documentary Collections: ${couchdbData.length}`);
    } catch (error) {
      logger.warn('[DUAL-SOURCE] Failed to fetch collections from CouchDB:', error);
    }

    // 2. Fetch from PostgreSQL
    try {
      const rows = await this.dbService.all(`
        SELECT * FROM documentary_collections 
        ORDER BY created_at DESC
      `);
      postgresData.push(...rows);
      logger.info(`[DUAL-SOURCE] PostgreSQL Documentary Collections: ${postgresData.length}`);
    } catch (error) {
      logger.warn('[DUAL-SOURCE] Failed to fetch collections from PostgreSQL:', error);
    }

    // 3. Merge and deduplicate
    const merged = this.mergeByKey(couchdbData, postgresData, 'collectionID', 'collection_id');

    return {
      couchdbCount: couchdbData.length,
      postgresCount: postgresData.length,
      totalCount: merged.length,
      source: couchdbData.length > 0 && postgresData.length > 0 ? 'both' : 
              couchdbData.length > 0 ? 'couchdb' : 'postgres',
      mergedData: merged
    };
  }

  /**
   * Fetch Contracts from BOTH sources
   */
  public async getContracts(): Promise<DataSourceStats> {
    const couchdbData: any[] = [];
    const postgresData: any[] = [];

    try {
      const result = await this.fabricService.queryChaincode('QueryAllContracts', []);
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          couchdbData.push(...result.data);
        } else {
          couchdbData.push(result.data);
        }
      }
    } catch (error) {
      logger.warn('[DUAL-SOURCE] Failed to fetch contracts from CouchDB:', error);
    }

    try {
      const rows = await this.dbService.all(`SELECT * FROM sales_contracts ORDER BY created_at DESC`);
      postgresData.push(...rows);
    } catch (error) {
      logger.warn('[DUAL-SOURCE] Failed to fetch contracts from PostgreSQL:', error);
    }

    const merged = this.mergeByKey(couchdbData, postgresData, 'contractID', 'contract_id');
    return {
      couchdbCount: couchdbData.length,
      postgresCount: postgresData.length,
      totalCount: merged.length,
      source: couchdbData.length > 0 && postgresData.length > 0 ? 'both' : 
              couchdbData.length > 0 ? 'couchdb' : 'postgres',
      mergedData: merged
    };
  }

  /**
   * Fetch Shipments from BOTH sources
   */
  public async getShipments(): Promise<DataSourceStats> {
    const couchdbData: any[] = [];
    const postgresData: any[] = [];

    // Use CouchDB direct query (instant, no Fabric SDK timeout)
    const couchDBDirectService = require('./couchDBDirectService').default;
    
    try {
      const shipments = await couchDBDirectService.queryAllShipments();
      couchdbData.push(...shipments);
      logger.info(`[DUAL-SOURCE] ✅ Fetched ${shipments.length} shipments from blockchain (CouchDB direct)`);
    } catch (error) {
      logger.warn('[DUAL-SOURCE] Failed to fetch shipments from CouchDB:', error);
    }

    try {
      const rows = await this.dbService.all(`SELECT * FROM shipments ORDER BY created_at DESC`);
      postgresData.push(...rows);
    } catch (error) {
      logger.warn('[DUAL-SOURCE] Failed to fetch shipments from PostgreSQL:', error);
    }

    const merged = this.mergeByKey(couchdbData, postgresData, 'shipmentID', 'shipment_id');
    return {
      couchdbCount: couchdbData.length,
      postgresCount: postgresData.length,
      totalCount: merged.length,
      source: couchdbData.length > 0 && postgresData.length > 0 ? 'both' : 
              couchdbData.length > 0 ? 'couchdb' : 'postgres',
      mergedData: merged
    };
  }

  /**
   * Fetch Forex Allocations from BOTH sources
   */
  public async getForexAllocations(): Promise<DataSourceStats> {
    const couchdbData: any[] = [];
    const postgresData: any[] = [];

    try {
      const result = await this.fabricService.queryChaincode('QueryAllForex', []);
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          couchdbData.push(...result.data);
        } else {
          couchdbData.push(result.data);
        }
      }
    } catch (error) {
      logger.warn('[DUAL-SOURCE] Failed to fetch forex from CouchDB:', error);
    }

    try {
      const rows = await this.dbService.all(`SELECT * FROM forex_allocations ORDER BY created_at DESC`);
      postgresData.push(...rows);
    } catch (error) {
      logger.warn('[DUAL-SOURCE] Failed to fetch forex from PostgreSQL:', error);
    }

    const merged = this.mergeByKey(couchdbData, postgresData, 'forexID', 'forex_id');
    return {
      couchdbCount: couchdbData.length,
      postgresCount: postgresData.length,
      totalCount: merged.length,
      source: couchdbData.length > 0 && postgresData.length > 0 ? 'both' : 
              couchdbData.length > 0 ? 'couchdb' : 'postgres',
      mergedData: merged
    };
  }

  /**
   * Fetch Customs Declarations from BOTH sources
   */
  public async getCustomsDeclarations(): Promise<DataSourceStats> {
    const couchdbData: any[] = [];
    const postgresData: any[] = [];

    try {
      const result = await this.fabricService.queryChaincode('QueryAllCustomsDeclarations', []);
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          couchdbData.push(...result.data);
        } else {
          couchdbData.push(result.data);
        }
      }
    } catch (error) {
      logger.warn('[DUAL-SOURCE] Failed to fetch customs declarations from CouchDB:', error);
    }

    try {
      const rows = await this.dbService.all(`SELECT * FROM customs_declarations ORDER BY created_at DESC`);
      postgresData.push(...rows);
    } catch (error) {
      logger.warn('[DUAL-SOURCE] Failed to fetch customs declarations from PostgreSQL:', error);
    }

    const merged = this.mergeByKey(couchdbData, postgresData, 'declarationID', 'declaration_id');
    return {
      couchdbCount: couchdbData.length,
      postgresCount: postgresData.length,
      totalCount: merged.length,
      source: couchdbData.length > 0 && postgresData.length > 0 ? 'both' : 
              couchdbData.length > 0 ? 'couchdb' : 'postgres',
      mergedData: merged
    };
  }

  /**
   * Fetch ECX Lots from BOTH sources
   */
  public async getECXLots(): Promise<DataSourceStats> {
    const couchdbData: any[] = [];
    const postgresData: any[] = [];

    try {
      const result = await this.fabricService.queryChaincode('QueryAllECXLots', []);
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          couchdbData.push(...result.data);
        } else {
          couchdbData.push(result.data);
        }
      }
    } catch (error) {
      logger.warn('[DUAL-SOURCE] Failed to fetch ECX lots from CouchDB:', error);
    }

    try {
      const rows = await this.dbService.all(`SELECT * FROM ecx_lots ORDER BY created_at DESC`);
      postgresData.push(...rows);
    } catch (error) {
      logger.warn('[DUAL-SOURCE] Failed to fetch ECX lots from PostgreSQL:', error);
    }

    const merged = this.mergeByKey(couchdbData, postgresData, 'lotNumber', 'lot_number');
    return {
      couchdbCount: couchdbData.length,
      postgresCount: postgresData.length,
      totalCount: merged.length,
      source: couchdbData.length > 0 && postgresData.length > 0 ? 'both' : 
              couchdbData.length > 0 ? 'couchdb' : 'postgres',
      mergedData: merged
    };
  }

  /**
   * Fetch Exporters from BOTH sources
   */
  public async getExporters(): Promise<DataSourceStats> {
    const couchdbData: any[] = [];
    const postgresData: any[] = [];

    try {
      const result = await this.fabricService.queryChaincode('QueryAllExporters', []);
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          couchdbData.push(...result.data);
        } else {
          couchdbData.push(result.data);
        }
      }
    } catch (error) {
      logger.warn('[DUAL-SOURCE] Failed to fetch exporters from CouchDB:', error);
    }

    try {
      const rows = await this.dbService.all(`SELECT * FROM exporters ORDER BY created_at DESC`);
      postgresData.push(...rows);
    } catch (error) {
      logger.warn('[DUAL-SOURCE] Failed to fetch exporters from PostgreSQL:', error);
    }

    const merged = this.mergeByKey(couchdbData, postgresData, 'exporterID', 'exporter_id');
    return {
      couchdbCount: couchdbData.length,
      postgresCount: postgresData.length,
      totalCount: merged.length,
      source: couchdbData.length > 0 && postgresData.length > 0 ? 'both' : 
              couchdbData.length > 0 ? 'couchdb' : 'postgres',
      mergedData: merged
    };
  }

  /**
   * Get Bank Portal Statistics from BOTH sources
   */
  public async getBankPortalStats(): Promise<{
    lc: DataSourceStats;
    documentaryCollection: DataSourceStats;
    advancePayment: DataSourceStats;
    consignment: DataSourceStats;
  }> {
    const [lc, documentaryCollection, advancePayment, consignment] = await Promise.all([
      this.getLettersOfCredit(),
      this.getDocumentaryCollections(),
      this.getAdvancePayments(),
      this.getConsignmentPayments()
    ]);

    logger.info('[DUAL-SOURCE] Bank Portal Stats:', {
      lc: { couchdb: lc.couchdbCount, postgres: lc.postgresCount, total: lc.totalCount },
      documentaryCollection: { couchdb: documentaryCollection.couchdbCount, postgres: documentaryCollection.postgresCount, total: documentaryCollection.totalCount },
      advancePayment: { couchdb: advancePayment.couchdbCount, postgres: advancePayment.postgresCount, total: advancePayment.totalCount },
      consignment: { couchdb: consignment.couchdbCount, postgres: consignment.postgresCount, total: consignment.totalCount }
    });

    return { lc, documentaryCollection, advancePayment, consignment };
  }

  /**
   * Get Exporter Portal Statistics from BOTH sources
   */
  public async getExporterPortalStats(): Promise<{
    contracts: DataSourceStats;
    shipments: DataSourceStats;
    lc: DataSourceStats;
    forex: DataSourceStats;
  }> {
    const [contracts, shipments, lc, forex] = await Promise.all([
      this.getContracts(),
      this.getShipments(),
      this.getLettersOfCredit(),
      this.getForexAllocations()
    ]);

    return { contracts, shipments, lc, forex };
  }

  /**
   * Get NBE Portal Statistics from BOTH sources
   */
  public async getNBEPortalStats(): Promise<{
    forex: DataSourceStats;
    lc: DataSourceStats;
    contracts: DataSourceStats;
  }> {
    const [forex, lc, contracts] = await Promise.all([
      this.getForexAllocations(),
      this.getLettersOfCredit(),
      this.getContracts()
    ]);

    return { forex, lc, contracts };
  }

  /**
   * Get Customs Portal Statistics from BOTH sources
   */
  public async getCustomsPortalStats(): Promise<{
    declarations: DataSourceStats;
    shipments: DataSourceStats;
  }> {
    const [declarations, shipments] = await Promise.all([
      this.getCustomsDeclarations(),
      this.getShipments()
    ]);

    return { declarations, shipments };
  }

  /**
   * Get ECX Portal Statistics from BOTH sources
   */
  public async getECXPortalStats(): Promise<{
    lots: DataSourceStats;
    contracts: DataSourceStats;
  }> {
    const [lots, contracts] = await Promise.all([
      this.getECXLots(),
      this.getContracts()
    ]);

    return { lots, contracts };
  }

  /**
   * Get ECTA Portal Statistics from BOTH sources
   */
  public async getECTAPortalStats(): Promise<{
    exporters: DataSourceStats;
    contracts: DataSourceStats;
    shipments: DataSourceStats;
    ecxLots: DataSourceStats;
  }> {
    const [exporters, contracts, shipments, ecxLots] = await Promise.all([
      this.getExporters(),
      this.getContracts(),
      this.getShipments(),
      this.getECXLots()
    ]);

    return { exporters, contracts, shipments, ecxLots };
  }

  /**
   * Get Shipping Portal Statistics from BOTH sources
   */
  public async getShippingPortalStats(): Promise<{
    shipments: DataSourceStats;
  }> {
    const shipments = await this.getShipments();
    return { shipments };
  }

  /**
   * Merge two arrays by key, preferring CouchDB data (blockchain source of truth)
   * Deduplicates by matching CouchDB key with PostgreSQL key
   */
  private mergeByKey(
    couchdbArray: any[], 
    postgresArray: any[], 
    couchdbKey: string, 
    postgresKey: string
  ): any[] {
    const merged = new Map<string, any>();

    // First, add all CouchDB records (blockchain is source of truth)
    for (const item of couchdbArray) {
      const key = item[couchdbKey] || item.Key || item.key;
      if (key) {
        merged.set(key, { ...item, _source: 'couchdb' });
      }
    }

    // Then, add PostgreSQL records if not already in CouchDB
    for (const item of postgresArray) {
      const key = item[postgresKey] || item[couchdbKey];
      if (key && !merged.has(key)) {
        // Convert snake_case to camelCase for consistency
        const normalized = this.normalizeKeys(item);
        merged.set(key, { ...normalized, _source: 'postgres' });
      } else if (key && merged.has(key)) {
        // Merge postgres data into existing couchdb record
        const existing = merged.get(key);
        merged.set(key, { ...existing, ...this.normalizeKeys(item), _source: 'both' });
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Convert snake_case to camelCase
   */
  private normalizeKeys(obj: any): any {
    const normalized: any = {};
    for (const key in obj) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      normalized[camelKey] = obj[key];
    }
    return normalized;
  }
}

export default DualSourceDataService;
