/**
 * Direct CouchDB Query Service
 * Queries blockchain state database directly without Fabric SDK timeout issues
 */

import axios from 'axios';
import logger from '../utils/logger';

const COUCHDB_URL = process.env.COUCHDB_URL || 'http://localhost:5984';
const COUCHDB_USERNAME = process.env.COUCHDB_USERNAME || 'admin';
const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD || 'adminpw';
const CHANNEL_NAME = process.env.FABRIC_CHANNEL || 'coffeechannel';
const CHAINCODE_NAME = process.env.FABRIC_CHAINCODE || 'coffee';
const DB_NAME = `${CHANNEL_NAME}_${CHAINCODE_NAME}`;

// Extract credentials from URL if present, otherwise use env variables
function getCouchDBAuth(url: string, username?: string, password?: string): { baseUrl: string; auth?: { username: string; password: string } } {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.username && parsedUrl.password) {
      const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
      return {
        baseUrl,
        auth: {
          username: parsedUrl.username,
          password: parsedUrl.password
        }
      };
    }
    // Use separate username/password if provided
    if (username && password) {
      return {
        baseUrl: url,
        auth: { username, password }
      };
    }
    return { baseUrl: url };
  } catch {
    return { baseUrl: url };
  }
}

export class CouchDBDirectService {
  private baseUrl: string;
  private dbName: string;
  private auth?: { username: string; password: string };

  constructor() {
    const { baseUrl, auth } = getCouchDBAuth(COUCHDB_URL, COUCHDB_USERNAME, COUCHDB_PASSWORD);
    this.baseUrl = baseUrl;
    this.dbName = DB_NAME;
    this.auth = auth;
    logger.info(`[CouchDB] Initialized: ${this.baseUrl}/${this.dbName}, auth: ${auth ? 'YES' : 'NO'}`);
  }

  /**
   * Query all LCs directly from CouchDB (instant, no Fabric SDK timeout)
   */
  async queryAllLCs(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.dbName}/_all_docs`,
        {
          params: {
            startkey: '"LC_"',
            endkey: '"LC_\ufff0"',
            include_docs: true,
            limit: 1000
          },
          auth: this.auth,
          timeout: 5000
        }
      );

      if (!response.data || !response.data.rows) {
        logger.warn('[CouchDB] No LC documents found');
        return [];
      }

      const lcs = response.data.rows
        .filter((row: any) => row.doc && !row.doc._id.startsWith('_'))
        .map((row: any) => {
          const doc = row.doc;
          delete doc._id;
          delete doc._rev;
          delete doc['~version'];
          return doc;
        });

      logger.info(`[CouchDB] ✅ Fetched ${lcs.length} LCs directly`);
      return lcs;

    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || String(error);
      logger.error('[CouchDB] Failed to query LCs:', errorMsg);
      if (error.response) {
        logger.error('[CouchDB] Response status:', error.response.status);
        logger.error('[CouchDB] Response data:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Query all shipments directly from CouchDB
   */
  async queryAllShipments(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.dbName}/_all_docs`,
        {
          params: {
            startkey: '"SHIPMENT_"',
            endkey: '"SHIPMENT_\ufff0"',
            include_docs: true,
            limit: 1000
          },
          auth: this.auth,
          timeout: 5000
        }
      );

      if (!response.data || !response.data.rows) {
        return [];
      }

      const shipments = response.data.rows
        .filter((row: any) => row.doc && !row.doc._id.startsWith('_'))
        .map((row: any) => {
          const doc = row.doc;
          delete doc._id;
          delete doc._rev;
          delete doc['~version'];
          return doc;
        });

      logger.info(`[CouchDB] ✅ Fetched ${shipments.length} shipments directly`);
      return shipments;

    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || String(error);
      logger.error('[CouchDB] Failed to query shipments:', errorMsg);
      throw error;
    }
  }

  /**
   * Query all SWIFT messages directly from CouchDB
   */
  async queryAllSWIFTMessages(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.dbName}/_all_docs`,
        {
          params: {
            startkey: '"SWIFT_"',
            endkey: '"SWIFT_\ufff0"',
            include_docs: true,
            limit: 1000
          },
          auth: this.auth,
          timeout: 5000
        }
      );

      if (!response.data || !response.data.rows) {
        return [];
      }

      const messages = response.data.rows
        .filter((row: any) => row.doc && !row.doc._id.startsWith('_'))
        .map((row: any) => {
          const doc = row.doc;
          delete doc._id;
          delete doc._rev;
          delete doc['~version'];
          return doc;
        });

      logger.info(`[CouchDB] ✅ Fetched ${messages.length} SWIFT messages directly`);
      return messages;

    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || String(error);
      logger.error('[CouchDB] Failed to query SWIFT messages:', errorMsg);
      throw error;
    }
  }

  /**
   * Query payments by payment method directly from CouchDB
   */
  async queryPaymentsByMethod(method: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.dbName}/_all_docs`,
        {
          params: {
            startkey: '"PAYMENT_"',
            endkey: '"PAYMENT_\ufff0"',
            include_docs: true,
            limit: 1000
          },
          auth: this.auth,
          timeout: 5000
        }
      );

      if (!response.data || !response.data.rows) {
        return [];
      }

      const payments = response.data.rows
        .filter((row: any) => {
          if (!row.doc || row.doc._id.startsWith('_')) return false;
          // Filter by payment method
          return row.doc.paymentMethod === method || row.doc.payment_method === method;
        })
        .map((row: any) => {
          const doc = row.doc;
          delete doc._id;
          delete doc._rev;
          delete doc['~version'];
          return doc;
        });

      logger.info(`[CouchDB] ✅ Fetched ${payments.length} payments for method ${method} directly`);
      return payments;

    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || String(error);
      logger.error(`[CouchDB] Failed to query payments for method ${method}:`, errorMsg);
      throw error;
    }
  }

  /**
   * Query outstanding consignments directly from CouchDB
   */
  async queryOutstandingConsignments(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.dbName}/_all_docs`,
        {
          params: {
            startkey: '"CONSIGNMENT_"',
            endkey: '"CONSIGNMENT_\ufff0"',
            include_docs: true,
            limit: 1000
          },
          auth: this.auth,
          timeout: 5000
        }
      );

      if (!response.data || !response.data.rows) {
        return [];
      }

      const consignments = response.data.rows
        .filter((row: any) => {
          if (!row.doc || row.doc._id.startsWith('_')) return false;
          // Filter for outstanding (not fully paid/settled)
          return row.doc.status !== 'SETTLED' && row.doc.status !== 'PAID';
        })
        .map((row: any) => {
          const doc = row.doc;
          delete doc._id;
          delete doc._rev;
          delete doc['~version'];
          return doc;
        });

      logger.info(`[CouchDB] ✅ Fetched ${consignments.length} outstanding consignments directly`);
      return consignments;

    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || String(error);
      logger.error('[CouchDB] Failed to query outstanding consignments:', errorMsg);
      throw error;
    }
  }
}

export default new CouchDBDirectService();
