/**
 * Data Enrichment Service
 * Enriches blockchain data with PostgreSQL relational data across the system
 */

import { DatabaseService } from './databaseService';
import logger from '../utils/logger';

export class DataEnrichmentService {
  private static instance: DataEnrichmentService;
  private dbService: DatabaseService;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
  }

  public static getInstance(): DataEnrichmentService {
    if (!DataEnrichmentService.instance) {
      DataEnrichmentService.instance = new DataEnrichmentService();
    }
    return DataEnrichmentService.instance;
  }

  /**
   * Enrich contracts with buyer names from PostgreSQL
   */
  async enrichContracts(contracts: any[]): Promise<any[]> {
    if (!contracts || contracts.length === 0) return contracts;

    try {
      const buyerData = await this.dbService.all(`
        SELECT c.contract_id, c.buyer_id AS buyer_name, c.buyer_country
        FROM contracts c
        WHERE c.buyer_id IS NOT NULL OR c.buyer_country IS NOT NULL
      `);

      const buyerMap = new Map(buyerData.map((b: any) => [b.contract_id, b]));

      return contracts.map(contract => {
        const contractId = contract.contractId || contract.ContractID || contract.contract_id;
        const buyer = buyerMap.get(contractId);

        if (buyer) {
          return {
            ...contract,
            buyerName: contract.buyerName || contract.BuyerName || buyer.buyer_name,
            BuyerName: contract.BuyerName || contract.buyerName || buyer.buyer_name,
            buyerCountry: buyer.buyer_country || contract.buyerCountry,
            BuyerCountry: buyer.buyer_country || contract.BuyerCountry,
          };
        }
        return contract;
      });
    } catch (error) {
      logger.warn('[ENRICHMENT] Could not enrich contracts with buyer data:', error);
      return contracts;
    }
  }

  /**
   * Enrich LCs with buyer names from contracts/buyers
   */
  async enrichLCs(lcs: any[]): Promise<any[]> {
    if (!lcs || lcs.length === 0) return lcs;

    try {
      const buyerData = await this.dbService.all(`
        SELECT 
          lc.lc_id,
          c.buyer_id,
          c.buyer_id AS buyer_name,
          c.buyer_country,
          c.buyer_bank
        FROM letters_of_credit lc
        LEFT JOIN contracts c ON lc.contract_id = c.contract_id
      `);

      const buyerMap = new Map(buyerData.map((b: any) => [b.lc_id, b]));

      return lcs.map(lc => {
        const lcId = lc.lcId || lc.LCID || lc.lc_id;
        const buyer = buyerMap.get(lcId);

        if (buyer) {
          return {
            ...lc,
            buyerId: buyer.buyer_id || lc.buyerId,
            buyerName: lc.buyerName || lc.BuyerName || buyer.buyer_name,
            BuyerName: lc.BuyerName || lc.buyerName || buyer.buyer_name,
            buyerCountry: buyer.buyer_country || lc.buyerCountry,
            BuyerCountry: buyer.buyer_country || lc.BuyerCountry,
            buyerBank: buyer.buyer_bank || lc.buyerBank,
          };
        }
        return lc;
      });
    } catch (error) {
      logger.warn('[ENRICHMENT] Could not enrich LCs with buyer data:', error);
      return lcs;
    }
  }

  /**
   * Enrich shipments with contract and buyer data
   */
  async enrichShipments(shipments: any[]): Promise<any[]> {
    if (!shipments || shipments.length === 0) return shipments;

    try {
      const enrichmentData = await this.dbService.all(`
        SELECT 
          s.shipment_id,
          c.contract_id,
          c.buyer_id AS buyer_name,
          c.buyer_country
        FROM shipments s
        LEFT JOIN contracts c ON s.contract_id = c.contract_id
      `);

      const dataMap = new Map(enrichmentData.map((d: any) => [d.shipment_id, d]));

      return shipments.map(shipment => {
        const shipmentId = shipment.shipmentID || shipment.shipmentId || shipment.shipment_id;
        const data = dataMap.get(shipmentId);

        if (data) {
          return {
            ...shipment,
            buyerName: shipment.buyerName || shipment.BuyerName || data.buyer_name,
            buyerCountry: shipment.buyerCountry || shipment.BuyerCountry || data.buyer_country,
          };
        }
        return shipment;
      });
    } catch (error) {
      logger.warn('[ENRICHMENT] Could not enrich shipments with buyer data:', error);
      return shipments;
    }
  }

  /**
   * Enrich forex allocations with LC and contract buyer data
   * Includes fallback logic for missing contracts
   */
  async enrichForexAllocations(forexAllocations: any[]): Promise<any[]> {
    if (!forexAllocations || forexAllocations.length === 0) return forexAllocations;

    try {
      // Primary enrichment: Join forex → LC → contract
      const enrichmentData = await this.dbService.all(`
        SELECT 
          fa.allocation_id as forex_id,
          fa.lc_number,
          lc.contract_id,
          lc.exporter_id,
          c.buyer_id AS buyer_name,
          c.buyer_country
        FROM forex_allocations fa
        LEFT JOIN letters_of_credit lc
          ON fa.lc_number = lc.lc_id OR fa.lc_number = lc.lc_number
        LEFT JOIN contracts c ON lc.contract_id = c.contract_id
      `);

      const dataMap = new Map(enrichmentData.map((d: any) => [d.forex_id, d]));

      // Log missing contracts for debugging
      const missingContracts = enrichmentData.filter(d => d.contract_id && !d.buyer_name);
      if (missingContracts.length > 0) {
        logger.warn(`[ENRICHMENT] ${missingContracts.length} forex allocations have contracts not found in contracts table`);
        missingContracts.forEach(d => {
          logger.debug(`[ENRICHMENT] Missing contract: ${d.contract_id} for forex ${d.forex_id}`);
        });
      }

      return forexAllocations.map(forex => {
        const forexId = forex.forexId || forex.ForexID || forex.forex_id;
        const data = dataMap.get(forexId);

        if (data && data.buyer_name) {
          // Successfully enriched with buyer data
          return {
            ...forex,
            lcId: data.lc_number || forex.lcId,
            buyerName: forex.buyerName || forex.BuyerName || data.buyer_name,
            BuyerName: forex.BuyerName || forex.buyerName || data.buyer_name,
            buyerCountry: data.buyer_country || forex.buyerCountry,
          };
        }
        // Return original forex if no enrichment data found
        return forex;
      });
    } catch (error) {
      logger.warn('[ENRICHMENT] Could not enrich forex with buyer data:', error);
      return forexAllocations;
    }
  }

  /**
   * Generic enrichment for any data type
   */
  async enrichData(dataType: 'contracts' | 'lcs' | 'shipments' | 'forex', data: any[]): Promise<any[]> {
    switch (dataType) {
      case 'contracts':
        return this.enrichContracts(data);
      case 'lcs':
        return this.enrichLCs(data);
      case 'shipments':
        return this.enrichShipments(data);
      case 'forex':
        return this.enrichForexAllocations(data);
      default:
        return data;
    }
  }
}

export default DataEnrichmentService.getInstance();
