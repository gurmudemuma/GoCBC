// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Database Service - PostgreSQL Only

import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from '../utils/logger';

export class DatabaseService {
  private static instance: DatabaseService;
  private pgPool: Pool | null = null;

  private constructor() {
    this.connect();
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

  private connect(): void {
    const connectionString = process.env.DATABASE_URL || 'postgresql://cecbs:cecbs123@localhost:5432/cecbs';
    
    this.pgPool = new Pool({ connectionString });
    
    this.pgPool.on('connect', () => {
      logger.info(`✅ PostgreSQL connected`);
    });
    
    this.pgPool.on('error', (err) => {
      logger.error('PostgreSQL pool error:', err);
    });
  }

  /**
   * Execute a query with parameters
   */
  public async query(text: string, params?: any[]): Promise<QueryResult> {
    if (!this.pgPool) {
      throw new Error('Database not connected');
    }
    
    try {
      const result = await this.pgPool.query(text, params);
      return result;
    } catch (error) {
      logger.error('Query error:', { text, params, error });
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
