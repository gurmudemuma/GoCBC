/**
 * Direct CouchDB Blockchain Query Service
 * 
 * Queries Hyperledger Fabric state database (CouchDB) directly
 * Bypasses API layer for pure blockchain data access
 * 
 * CouchDB Ports (Hyperledger Fabric State DB):
 * - peer0.ecta:   5984
 * - peer0.ecx:    6984
 * - peer0.banks:  7984
 * - peer0.nbe:    8984
 * - peer0.customs: 9984
 * - peer0.shipping: 10984
 */

const COUCHDB_CONFIG = {
  host: 'localhost',
  port: 5984, // peer0.ecta CouchDB
  database: 'coffeechannel_coffee', // Chaincode state database
  username: 'admin',
  password: 'adminpw'
};

// 🔇 Logging Control - Set to true to enable verbose logs
const DEV_LOGGING = false;
const devLog = (...args: any[]) => {
  if (DEV_LOGGING) console.log(...args);
};

interface ForexAllocation {
  forexId: string;
  contractId: string;
  exporterId: string;
  lcId: string;
  requestedAmount: number;
  allocatedAmount: number;
  currency: string;
  exchangeRate: number;
  retentionRate: number;
  status: 'REQUESTED' | 'CONFIRMED' | 'ALLOCATED' | 'UTILIZED';
  requestDate: string;
  allocationDate?: string;
  expiryDate?: string;
  nbeOfficer?: string;
  nbeApprovalRef?: string;
  verifiedBy?: string;
  verifiedByMsp?: string;
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

interface LetterOfCredit {
  lcId: string;
  contractId: string;
  exporterId: string;
  buyerId: string;
  amount: number;
  currency: string;
  status: string;
  issueDate?: string;
  expiryDate?: string;
  issuingBank?: string;
  advisingBank?: string;
  terms?: string;
  approvedBy?: string;
  approvedByMsp?: string;
  issuedBy?: string;
  issuedByMsp?: string;
  createdAt: string;
  updatedAt: string;
}

interface CouchDBRow {
  id: string;
  key: string;
  value: { rev: string };
  doc: any;
}

interface CouchDBResponse {
  total_rows: number;
  offset: number;
  rows: CouchDBRow[];
}

class CouchDBService {
  private baseUrl: string;
  private auth: string;

  constructor() {
    const { host, port, username, password } = COUCHDB_CONFIG;
    this.baseUrl = `http://${host}:${port}`;
    this.auth = btoa(`${username}:${password}`);
  }

  /**
   * Generic CouchDB query (exposed for direct queries)
   */
  async query(path: string): Promise<any> {
    return this._query(path);
  }

  /**
   * Private query method
   */
  private async _query(path: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`CouchDB error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[CouchDB] Query failed:', error);
      throw error;
    }
  }

  /**
   * Get all forex allocations directly from blockchain state
   */
  async getAllForex(): Promise<ForexAllocation[]> {
    devLog('[CouchDB] 🔗 Querying forex DIRECTLY from Hyperledger Fabric state database...');
    
    try {
      const path = `/${COUCHDB_CONFIG.database}/_all_docs?startkey="FOREX_"&endkey="FOREX_\ufff0"&include_docs=true`;
      const response: CouchDBResponse = await this._query(path);

      devLog(`[CouchDB] ✅ Found ${response.rows.length} forex allocations on blockchain`);

      const forexList = response.rows
        .map(row => row.doc)
        .filter(doc => doc && !doc._id.startsWith('_design'))
        .map(doc => this.normalizeForex(doc));

      return forexList;
    } catch (error) {
      console.error('[CouchDB] Failed to query forex:', error);
      return [];
    }
  }

  /**
   * Get single forex allocation by ID
   */
  async getForexById(forexId: string): Promise<ForexAllocation | null> {
    devLog(`[CouchDB] 🔗 Querying forex ${forexId} from blockchain...`);
    
    try {
      const docId = forexId.startsWith('FOREX_') ? forexId : `FOREX_${forexId}`;
      const path = `/${COUCHDB_CONFIG.database}/${docId}`;
      const doc = await this._query(path);

      devLog(`[CouchDB] ✅ Found forex ${forexId} on blockchain`);
      return this.normalizeForex(doc);
    } catch (error) {
      console.error(`[CouchDB] Forex ${forexId} not found:`, error);
      return null;
    }
  }

  /**
   * Get all LCs directly from blockchain state
   */
  async getAllLCs(): Promise<LetterOfCredit[]> {
    devLog('[CouchDB] 🔗 Querying LCs DIRECTLY from Hyperledger Fabric state database...');
    
    try {
      const path = `/${COUCHDB_CONFIG.database}/_all_docs?startkey="LC_"&endkey="LC_\ufff0"&include_docs=true`;
      const response: CouchDBResponse = await this._query(path);

      devLog(`[CouchDB] ✅ Found ${response.rows.length} LCs on blockchain`);

      const lcList = response.rows
        .map(row => row.doc)
        .filter(doc => doc && !doc._id.startsWith('_design'))
        .map(doc => this.normalizeLC(doc));

      return lcList;
    } catch (error) {
      console.error('[CouchDB] Failed to query LCs:', error);
      return [];
    }
  }

  /**
   * Get forex allocations by status
   */
  async getForexByStatus(status: string): Promise<ForexAllocation[]> {
    const allForex = await this.getAllForex();
    return allForex.filter(fx => fx.status === status);
  }

  /**
   * Get forex allocations by exporter
   */
  async getForexByExporter(exporterId: string): Promise<ForexAllocation[]> {
    const allForex = await this.getAllForex();
    return allForex.filter(fx => fx.exporterId === exporterId);
  }

  /**
   * Normalize CouchDB document to ForexAllocation
   */
  private normalizeForex(doc: any): ForexAllocation {
    return {
      forexId: doc.forexId || doc._id?.replace('FOREX_', '') || '',
      contractId: doc.contractId || '',
      exporterId: doc.exporterId || '',
      lcId: doc.lcId || '',
      requestedAmount: doc.requestedAmount || 0,
      allocatedAmount: doc.allocatedAmount || 0,
      currency: doc.currency || 'USD',
      exchangeRate: doc.exchangeRate || doc.officialRate || 0,
      retentionRate: doc.retentionRate || doc.retentionPercentage || 0,
      status: doc.status || 'REQUESTED',
      requestDate: doc.requestDate || doc.createdAt || '',
      allocationDate: doc.allocationDate || undefined,
      expiryDate: doc.expiryDate || undefined,
      nbeOfficer: doc.nbeOfficer || undefined,
      nbeApprovalRef: doc.nbeApprovalRef || undefined,
      verifiedBy: doc.verifiedBy || undefined,
      verifiedByMsp: doc.verifiedByMsp || undefined,
      comments: doc.comments || undefined,
      createdAt: doc.createdAt || '',
      updatedAt: doc.updatedAt || ''
    };
  }

  /**
   * Normalize CouchDB document to LetterOfCredit
   */
  private normalizeLC(doc: any): LetterOfCredit {
    return {
      lcId: doc.lcId || doc.LCID || doc._id?.replace('LC_', '') || '',
      contractId: doc.contractId || doc.ContractID || '',
      exporterId: doc.exporterId || doc.ExporterID || '',
      buyerId: doc.buyerId || doc.BuyerID || '',
      amount: doc.amount || 0,
      currency: doc.currency || 'USD',
      status: doc.status || 'REQUESTED',
      issueDate: doc.issueDate || doc.IssueDate || undefined,
      expiryDate: doc.expiryDate || doc.ExpiryDate || undefined,
      issuingBank: doc.issuingBank || doc.IssuingBank || undefined,
      advisingBank: doc.advisingBank || doc.AdvisingBank || undefined,
      terms: doc.terms || undefined,
      approvedBy: doc.approvedBy || undefined,
      approvedByMsp: doc.approvedByMsp || undefined,
      issuedBy: doc.issuedBy || undefined,
      issuedByMsp: doc.issuedByMsp || undefined,
      createdAt: doc.createdAt || '',
      updatedAt: doc.updatedAt || ''
    };
  }

  /**
   * Test CouchDB connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this._query('/_up');
      devLog('[CouchDB] ✅ Connection successful');
      return true;
    } catch (error) {
      console.error('[CouchDB] ❌ Connection failed:', error);
      return false;
    }
  }

  /**
   * Get database info
   */
  async getDatabaseInfo(): Promise<any> {
    try {
      return await this._query(`/${COUCHDB_CONFIG.database}`);
    } catch (error) {
      console.error('[CouchDB] Failed to get database info:', error);
      return null;
    }
  }

  /**
   * Get audit trail for an entity from blockchain
   */
  async getAuditTrail(entityType: string, entityId: string): Promise<any[]> {
    devLog(`[CouchDB] 🔗 Querying audit trail for ${entityType}_${entityId} from blockchain...`);
    
    try {
      // Clean up entityId - remove prefix if already present
      const cleanId = entityId.replace(/^(LC_|FOREX_)/, '');
      
      // Query all audit records for this entity
      // Note: Audit keys are stored as AUDIT_{TYPE}_{ID}_{TXHASH}
      const prefix = `AUDIT_${entityType}_${cleanId}`;
      const path = `/${COUCHDB_CONFIG.database}/_all_docs?startkey="${prefix}"&endkey="${prefix}\ufff0"&include_docs=true`;
      const response: CouchDBResponse = await this._query(path);

      devLog(`[CouchDB] ✅ Found ${response.rows.length} audit records on blockchain for ${prefix}`);

      const auditRecords = response.rows
        .map(row => row.doc)
        .filter(doc => doc && !doc._id.startsWith('_design'))
        .sort((a, b) => new Date(a.timestamp || a.createdAt).getTime() - new Date(b.timestamp || b.createdAt).getTime());

      return auditRecords;
    } catch (error) {
      console.error(`[CouchDB] Failed to query audit trail:`, error);
      return [];
    }
  }
}

// Singleton instance
export const couchDBService = new CouchDBService();

// Export types
export type { ForexAllocation, LetterOfCredit };
