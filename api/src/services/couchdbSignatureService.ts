/**
 * CouchDB Signature Service
 * Fetches REAL blockchain signatures directly from CouchDB (Fabric's state database)
 * This is the actual source of truth - not PostgreSQL, not synthetic data
 */

import axios from 'axios';
import { logger } from '../utils/logger';

export interface CouchDBSignature {
  txId: string;
  timestamp: string;
  creator: {
    mspId: string;
    identity: string;
  };
  value: any; // The actual state value
  isDelete: boolean;
  blockNumber: number;
}

export class CouchDBSignatureService {
  private static instance: CouchDBSignatureService;
  private couchdbUrl: string;
  private channelName: string;
  private username: string;
  private password: string;

  private constructor() {
    // CouchDB connection details - adjust based on your setup
    this.couchdbUrl = process.env.COUCHDB_URL || 'http://localhost:5984';
    this.channelName = process.env.CHANNEL_NAME || 'coffeechannel';
    this.username = process.env.COUCHDB_USERNAME || 'admin';
    this.password = process.env.COUCHDB_PASSWORD || 'adminpw';
  }

  static getInstance(): CouchDBSignatureService {
    if (!CouchDBSignatureService.instance) {
      CouchDBSignatureService.instance = new CouchDBSignatureService();
    }
    return CouchDBSignatureService.instance;
  }

  /**
   * Get blockchain transaction history directly from CouchDB
   * CouchDB stores the blockchain state in databases named: {channel}_{chaincode}
   */
  async getEntityHistory(entityId: string): Promise<CouchDBSignature[]> {
    try {
      logger.info(`🔍 Querying CouchDB for entity: ${entityId}`);

      // CouchDB database name format: channelname_chaincodename
      const dbName = `${this.channelName}_coffee`;
      
      // Query CouchDB for this entity's history
      // CouchDB stores multiple versions of a key if it's been updated
      const response = await axios.get(
        `${this.couchdbUrl}/${dbName}/${entityId}`,
        {
          auth: {
            username: this.username,
            password: this.password
          },
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (response.data) {
        // Get all revisions of this document
        const revisionsResponse = await axios.get(
          `${this.couchdbUrl}/${dbName}/${entityId}?revs_info=true`,
          {
            auth: {
              username: this.username,
              password: this.password
            }
          }
        );

        const revisions = revisionsResponse.data._revs_info || [];
        const signatures: CouchDBSignature[] = [];

        // Fetch each revision to build history
        for (const rev of revisions) {
          if (rev.status !== 'available') continue;

          try {
            const revResponse = await axios.get(
              `${this.couchdbUrl}/${dbName}/${entityId}?rev=${rev.rev}`,
              {
                auth: {
                  username: this.username,
                  password: this.password
                }
              }
            );

            signatures.push({
              txId: rev.rev, // CouchDB revision is the transaction marker
              timestamp: revResponse.data.timestamp || revResponse.data._timestamp || new Date().toISOString(),
              creator: {
                mspId: this.extractMspId(revResponse.data),
                identity: this.extractIdentity(revResponse.data)
              },
              value: revResponse.data,
              isDelete: false,
              blockNumber: 0 // CouchDB doesn't store block numbers directly
            });
          } catch (revErr) {
            logger.warn(`Failed to fetch revision ${rev.rev}:`, revErr);
          }
        }

        logger.info(`✅ Found ${signatures.length} CouchDB signatures for ${entityId}`);
        return signatures;
      }

      logger.warn(`No data found in CouchDB for ${entityId}`);
      return [];

    } catch (error: any) {
      if (error.response?.status === 404) {
        logger.warn(`Entity ${entityId} not found in CouchDB`);
        return [];
      }
      logger.error('❌ Error querying CouchDB:', error.message);
      throw error;
    }
  }

  /**
   * Query CouchDB using Mango query to find documents
   */
  async queryDocuments(selector: any, dbName?: string): Promise<any[]> {
    try {
      const db = dbName || `${this.channelName}_coffee`;
      
      const response = await axios.post(
        `${this.couchdbUrl}/${db}/_find`,
        {
          selector,
          limit: 100
        },
        {
          auth: {
            username: this.username,
            password: this.password
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.docs || [];
    } catch (error: any) {
      logger.error('Error querying CouchDB documents:', error.message);
      return [];
    }
  }

  /**
   * Get all documents from a CouchDB database (useful for debugging)
   */
  async getAllDocuments(dbName?: string): Promise<any[]> {
    try {
      const db = dbName || `${this.channelName}_coffee`;
      
      const response = await axios.get(
        `${this.couchdbUrl}/${db}/_all_docs?include_docs=true`,
        {
          auth: {
            username: this.username,
            password: this.password
          }
        }
      );

      return response.data.rows.map((row: any) => row.doc).filter((doc: any) => doc && !doc._id.startsWith('_'));
    } catch (error: any) {
      logger.error('Error fetching all CouchDB documents:', error.message);
      return [];
    }
  }

  /**
   * Extract MSP ID from CouchDB document
   */
  private extractMspId(doc: any): string {
    if (doc.mspId || doc.MSPId) return doc.mspId || doc.MSPId;
    if (doc.creator?.mspId) return doc.creator.mspId;
    
    // Infer from entity type
    if (doc.ExporterID || doc.exporterId) return 'ExportersMSP';
    if (doc.NBEOfficer || doc.nbeOfficer) return 'NBEMSP';
    if (doc.BankName || doc.bankName || doc.IssuingBank || doc.issuingBank) return 'BanksMSP';
    if (doc.CustomsOfficer || doc.customsOfficer) return 'CustomsMSP';
    if (doc.ShippingLine || doc.shippingLine) return 'ShippingMSP';
    if (doc.WarehouseID || doc.warehouseId) return 'ECXMSP';
    
    return 'ECTAMSP';
  }

  /**
   * Extract identity from CouchDB document
   */
  private extractIdentity(doc: any): string {
    if (doc.creator?.identity) return doc.creator.identity;
    if (doc.createdBy) return `CN=${doc.createdBy}, OU=client`;
    if (doc.ExporterID || doc.exporterId) return `CN=${doc.ExporterID || doc.exporterId}, OU=exporter`;
    if (doc.NBEOfficer || doc.nbeOfficer) return `CN=${doc.NBEOfficer || doc.nbeOfficer}, OU=officer`;
    
    return 'CN=System, OU=client';
  }

  /**
   * Check CouchDB connection health
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.couchdbUrl}/_up`,
        {
          auth: {
            username: this.username,
            password: this.password
          },
          timeout: 5000
        }
      );
      return response.status === 200;
    } catch (error) {
      logger.error('CouchDB connection check failed:', error);
      return false;
    }
  }
}
