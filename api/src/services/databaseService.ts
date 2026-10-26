// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Database Service - PostgreSQL Only

import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from '../utils/logger';

export class DatabaseService {
  private static instance: DatabaseService;
  private pgPool: Pool | null = null;

  private constructor() {
    // Connect asynchronously - don't block constructor
    this.connect().catch(err => {
      logger.error('Failed to initialize database connection:', err);
    });
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public isConnected(): boolean {
    return this.pgPool !== null;
  }

  private async connect(): Promise<void> {
    const connectionString = process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs';
    
    this.pgPool = new Pool({
      connectionString,
      // ✅ CRITICAL: Add connection timeout to prevent 5-10 minute waits
      connectionTimeoutMillis: 5000,  // Fail fast after 5 seconds if DB not available
      idleTimeoutMillis: 30000,       // Close idle connections after 30 seconds
      max: 20,                        // Maximum 20 connections in pool
      statement_timeout: 30000,       // Queries must complete within 30 seconds
      query_timeout: 30000,           // Query timeout (same as statement_timeout)
    });
    
    this.pgPool.on('connect', () => {
      logger.info(`✅ PostgreSQL connected`);
    });
    
    this.pgPool.on('error', (err) => {
      logger.error('PostgreSQL pool error:', err);
    });

    // ✅ Test connection immediately - fail fast if PostgreSQL not available
    try {
      await this.pgPool.query('SELECT 1');
      logger.info('✅ PostgreSQL connection test successful');
    } catch (error: any) {
      logger.error('❌ PostgreSQL connection test FAILED:', error.message);
      logger.error('⚠️ Database queries will fail. Please ensure PostgreSQL is running.');
      // Don't throw - allow app to start but queries will fail gracefully
    }
  }

  /**
   * Execute a query with parameters
   */
  public async query(text: string, params?: any[]): Promise<QueryResult> {
    if (!this.pgPool) {
      throw new Error('Database not connected');
    }
    
    try {
      // Add explicit timeout to query execution
      const result = await Promise.race([
        this.pgPool.query(text, params),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout after 30 seconds')), 30000)
        )
      ]);
      return result;
    } catch (error: any) {
      logger.error('Query error:', { text, params, error: error.message });
      throw error;
    }
  }

  /**
   * Execute a query and return rows
   */
  public async all(sql: string, params: any[] = []): Promise<any[]> {
    const result = await this.query(sql, params);
    return result.rows;
  }

  /**
   * Execute a query and return a single row
   */
  public async get(sql: string, params: any[] = []): Promise<any | undefined> {
    const result = await this.query(sql, params);
    return result.rows[0];
  }

  /**
   * Execute an INSERT/UPDATE/DELETE query
   */
  public async run(sql: string, params: any[] = []): Promise<QueryResult> {
    return await this.query(sql, params);
  }

  /**
   * Get a client from the pool for transactions
   */
  public async getClient(): Promise<PoolClient> {
    if (!this.pgPool) {
      throw new Error('Database not connected');
    }
    return await this.pgPool.connect();
  }

  /**
   * Execute a transaction
   */
  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close the database connection
   */
  public async close(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end();
      this.pgPool = null;
      logger.info('Database connection closed');
    }
  }
}

export default DatabaseService;
