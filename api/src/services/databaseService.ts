// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Database Service - SQLite Wrapper

import * as sqlite3 from 'sqlite3';
import { Pool } from 'pg';
import * as path from 'path';
import { logger } from '../utils/logger';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: sqlite3.Database | null = null;
  private pgPool: Pool | null = null;
  private usePg: boolean = false;

  private constructor() {
    this.usePg = !!process.env.DATABASE_URL;
    this.connect();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public isConnected(): boolean {
    return this.usePg ? this.pgPool !== null : this.db !== null;
  }

  private connect(): void {
    if (this.usePg) {
      this.pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
      this.pgPool.connect((err) => {
        if (err) {
          logger.error('Failed to connect to PostgreSQL:', err);
        } else {
          logger.info(`✅ PostgreSQL connected`);
          this.initializeTables();
        }
      });
      return;
    }

    try {
      const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'cecbs.db');
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          logger.error('Failed to connect to database:', err);
        } else {
          logger.info(`✅ Database connected: ${dbPath}`);
          this.initializeTables();
        }
      });
    } catch (error) {
      logger.error('Database connection error:', error);
    }
  }

  // Helper to translate queries from SQLite to Postgres
  private translateQuery(sql: string): string {
    if (!this.usePg) return sql;
    
    // Replace datetime('now') with CURRENT_TIMESTAMP
    let translated = sql.replace(/datetime\('now'\)/g, 'CURRENT_TIMESTAMP');
    
    // Convert ? parameters to $1, $2, etc.
    let paramIndex = 1;
    translated = translated.replace(/\?/g, () => `$${paramIndex++}`);
    
    // Convert AUTOINCREMENT to SERIAL for table creations
    translated = translated.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY');
    
    return translated;
  }

  private initializeTables(): void {
    if (!this.db) return;

    // Users table
    const usersTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('ECTA', 'ECX', 'NBE', 'BANKS', 'CUSTOMS', 'SHIPPING', 'EXPORTER', 'ADMIN')),
        organization TEXT NOT NULL,
        exporter_id TEXT,
        ecta_license TEXT,
        phone TEXT,
        bank_name TEXT,
        bank_account_number TEXT,
        bank_branch TEXT,
        bank_branch_code TEXT,
        permissions TEXT DEFAULT '[]',
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'inactive', 'rejected')),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_login TEXT,
        UNIQUE(username),
        UNIQUE(email)
      );
    `;

    // Exporter applications table (already exists in FabricService, ensure it's here too)
    const applicationsTableSQL = `
      CREATE TABLE IF NOT EXISTS exporter_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id TEXT UNIQUE NOT NULL,
        company_name TEXT NOT NULL,
        tin_number TEXT NOT NULL,
        business_license_number TEXT NOT NULL,
        registration_date TEXT,
        exporter_type TEXT DEFAULT 'private',
        capital_requirement TEXT NOT NULL,
        professional_taster TEXT NOT NULL,
        taster_certificate TEXT NOT NULL,
        laboratory_facility TEXT DEFAULT '',
        laboratory_certificate_number TEXT,
        contact_person TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        region TEXT,
        bank_name TEXT,
        bank_account_number TEXT,
        bank_branch_name TEXT,
        bank_branch_code TEXT,
        comments TEXT,
        documents TEXT DEFAULT '[]',
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
        submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
        approved_at TEXT,
        rejected_at TEXT,
        rejection_reason TEXT,
        exporter_id TEXT,
        ecta_license_number TEXT,
        license_expiry_date TEXT,
        reviewed_by TEXT
      );
    `;

    // Audit log table
    const auditLogTableSQL = `
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        resource_type TEXT,
        resource_id TEXT,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `;

    // Session table
    const sessionsTableSQL = `
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `;

    // Declaration risk assessment table
    const declarationRiskTableSQL = `
      CREATE TABLE IF NOT EXISTS declaration_risk (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        declaration_id TEXT NOT NULL,
        shipment_id TEXT,
        risk_level TEXT NOT NULL CHECK(risk_level IN ('LOW','MEDIUM','HIGH')),
        reason TEXT,
        assessed_by TEXT,
        assessed_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Local declarations table (drafts + metadata)
    const declarationsTableSQL = `
      CREATE TABLE IF NOT EXISTS declarations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        declaration_id TEXT UNIQUE NOT NULL,
        shipment_id TEXT NOT NULL,
        exporter_id TEXT,
        status TEXT DEFAULT 'DECLARATION_STARTED',
        hs_code TEXT,
        quantity REAL,
        value REAL,
        currency TEXT,
        destination TEXT,
        port_of_exit TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Declaration audit table for overrides and manual actions
    const declarationAuditTableSQL = `
      CREATE TABLE IF NOT EXISTS declaration_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        declaration_id TEXT NOT NULL,
        action TEXT NOT NULL,
        performed_by TEXT,
        details TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Documents table for document management workflow
    const documentsTableSQL = `
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id TEXT UNIQUE NOT NULL,
        document_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        storage_path TEXT NOT NULL,
        uploaded_by TEXT NOT NULL,
        uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'archived', 'deleted')),
        blockchain_hash TEXT,
        blockchain_tx_id TEXT,
        verification_status TEXT DEFAULT 'pending' CHECK(verification_status IN ('pending', 'verified', 'rejected')),
        verified_by TEXT,
        verified_at TEXT,
        expiry_date TEXT,
        version INTEGER DEFAULT 1,
        parent_document_id TEXT,
        metadata TEXT DEFAULT '{}',
        FOREIGN KEY (parent_document_id) REFERENCES documents(document_id)
      );
    `;

    this.run(usersTableSQL).then(() => {
        logger.info('✅ Users table ready');
        this.createIndexes();
        this.runMigrations();
        this.seedDefaultUsers();
    }).catch(err => logger.error('Failed to create users table:', err));

    this.run(applicationsTableSQL).then(() => logger.info('✅ Exporter applications table ready'))
        .catch(err => logger.error('Failed to create applications table:', err));

    this.run(auditLogTableSQL).then(() => logger.info('✅ Audit log table ready'))
        .catch(err => logger.error('Failed to create audit_log table:', err));

    this.run(sessionsTableSQL).then(() => logger.info('✅ Sessions table ready'))
        .catch(err => logger.error('Failed to create sessions table:', err));

    this.run(declarationRiskTableSQL).then(() => logger.info('✅ Declaration risk table ready'))
      .catch(err => logger.error('Failed to create declaration_risk table:', err));
    this.run(declarationsTableSQL).then(() => logger.info('✅ Declarations table ready'))
      .catch(err => logger.error('Failed to create declarations table:', err));
    this.run(declarationAuditTableSQL).then(() => logger.info('✅ Declaration audit table ready'))
      .catch(err => logger.error('Failed to create declaration_audit table:', err));
    this.run(documentsTableSQL).then(() => logger.info('✅ Documents table ready'))
      .catch(err => logger.error('Failed to create documents table:', err));
  }

  private runMigrations(): void {
    if (!this.db) return;

    // Add columns that may not exist in older DBs — safe to run every time (IF NOT EXISTS equivalent via error suppression)
    const migrations = [
      `ALTER TABLE users ADD COLUMN bank_account_number TEXT`,
      `ALTER TABLE exporter_applications ADD COLUMN bank_branch_name TEXT`,
      `ALTER TABLE exporter_applications ADD COLUMN bank_branch_code TEXT`,
      `ALTER TABLE exporter_applications ADD COLUMN documents TEXT DEFAULT '[]'`,
      `ALTER TABLE declaration_risk ADD COLUMN rule_hash TEXT`,
    ];

    migrations.forEach((sql) => {
      this.db!.run(sql, (err) => {
        // SQLITE_ERROR "duplicate column name" is expected when column already exists — ignore it
        if (err && !err.message.includes('duplicate column name')) {
          logger.error(`Migration failed: ${err.message}`);
        }
      });
    });
  }

  private createIndexes(): void {
    if (!this.db) return;

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)',
      'CREATE INDEX IF NOT EXISTS idx_users_exporter_id ON users(exporter_id)',
      'CREATE INDEX IF NOT EXISTS idx_applications_status ON exporter_applications(status)',
      'CREATE INDEX IF NOT EXISTS idx_applications_email ON exporter_applications(email)',
      'CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_log(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_declaration_risk_declaration_id ON declaration_risk(declaration_id)',
      'CREATE INDEX IF NOT EXISTS idx_declaration_risk_assessed_at ON declaration_risk(assessed_at)',
      'CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type)',
      'CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)',
      'CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by)',
      'CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at)',
      'CREATE INDEX IF NOT EXISTS idx_documents_verification ON documents(verification_status)'
    ];

    indexes.forEach((indexSQL) => {
      this.run(indexSQL).catch(err => {
        if (!err.message.includes('already exists')) {
          logger.error('Failed to create index:', err);
        }
      });
    });
  }

  private async seedDefaultUsers(): Promise<void> {
    try {
      // Check if users exist
      const count = await this.get('SELECT COUNT(*) as count FROM users', []);
      
      if (count.count > 0) {
        logger.info('Users already exist, skipping seed');
        return;
      }

      logger.info('Seeding default users...');

      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash('password123', 10);

      const defaultUsers = [
        {
          username: 'admin',
          email: 'admin@cecbs.et',
          password: hash,
          fullName: 'System Administrator',
          role: 'ADMIN',
          organization: 'Admin',
          permissions: JSON.stringify(['admin:system', 'users:manage-all', 'blockchain:enroll', 'analytics:view-all', 'settings:manage']),
        },
        {
          username: 'ecta_admin',
          email: 'admin@ecta.gov.et',
          password: hash,
          fullName: 'ECTA Administrator',
          role: 'ECTA',
          organization: 'ECTA',
          permissions: JSON.stringify(['users:create-org', 'users:read-org', 'quality:manage', 'permits:manage']),
        },
        {
          username: 'ecx_admin',
          email: 'admin@ecx.et',
          password: hash,
          fullName: 'ECX Administrator',
          role: 'ECX',
          organization: 'ECX',
          permissions: JSON.stringify(['users:create-org', 'users:read-org', 'contracts:manage', 'grading:manage']),
        },
        {
          username: 'nbe_admin',
          email: 'admin@nbe.gov.et',
          password: hash,
          fullName: 'NBE Administrator',
          role: 'NBE',
          organization: 'NBE',
          permissions: JSON.stringify(['users:create-org', 'users:read-org', 'forex:manage', 'forex:allocate']),
        },
        {
          username: 'bank_admin',
          email: 'admin@cbe.com.et',
          password: hash,
          fullName: 'Bank Administrator',
          role: 'BANKS',
          organization: 'Banks',
          permissions: JSON.stringify(['users:create-org', 'users:read-org', 'lc:issue', 'payments:process']),
        },
        {
          username: 'customs_admin',
          email: 'admin@customs.gov.et',
          password: hash,
          fullName: 'Customs Administrator',
          role: 'CUSTOMS',
          organization: 'Customs',
          permissions: JSON.stringify(['users:create-org', 'users:read-org', 'customs:declare', 'customs:clear']),
        },
        {
          username: 'shipping_admin',
          email: 'admin@shipping.et',
          password: hash,
          fullName: 'Shipping Administrator',
          role: 'SHIPPING',
          organization: 'Shipping',
          permissions: JSON.stringify(['users:create-org', 'users:read-org', 'shipments:create', 'shipments:track']),
        },
        {
          username: 'ethiopianpremium',
          email: 'info@ethiopianpremium.com',
          password: hash,
          fullName: 'Ethiopian Premium Coffee Exporters PLC',
          role: 'EXPORTER',
          organization: 'Exporters',
          exporterId: 'EXP2026001',
          ectaLicense: 'ECTA-LIC-2026-001',
          permissions: JSON.stringify([
            'contracts:create', 'contracts:view-own', 'shipments:view-own', 'shipments:create-own',
            'payments:view-own', 'documents:upload-own', 'documents:view-own',
          ]),
        },
        {
          username: 'testexporter',
          email: 'test@testexporter.com',
          password: hash,
          fullName: 'Test Coffee Exporters Ltd',
          role: 'EXPORTER',
          organization: 'Exporters',
          exporterId: 'EXP2026002',
          ectaLicense: 'ECTA-LIC-2026-002',
          permissions: JSON.stringify([
            'contracts:create', 'contracts:view-own', 'shipments:view-own', 'shipments:create-own',
            'payments:view-own', 'documents:upload-own', 'documents:view-own',
          ]),
        },
      ];

      for (const user of defaultUsers) {
        await this.run(
          `INSERT INTO users (
            username, email, password_hash, full_name, role, organization,
            exporter_id, ecta_license, permissions, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
          [
            user.username,
            user.email,
            user.password,
            user.fullName,
            user.role,
            user.organization,
            (user as any).exporterId || null,
            (user as any).ectaLicense || null,
            user.permissions,
          ]
        );
      }

      logger.info('✅ Default users seeded successfully');

    } catch (error) {
      logger.error('Failed to seed default users:', error);
    }
  }

  // Promisified database operations
  public async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    const translatedSql = this.translateQuery(sql);

    if (this.usePg && this.pgPool) {
      let queryToRun = translatedSql;
      const isInsert = queryToRun.trim().toUpperCase().startsWith('INSERT');
      if (isInsert && !queryToRun.toUpperCase().includes('RETURNING ID')) {
          queryToRun = queryToRun + ' RETURNING id';
      }
      
      const res = await this.pgPool.query(queryToRun, params);
      const lastID = (isInsert && res.rows.length > 0) ? res.rows[0].id : 0;
      return { lastID, changes: res.rowCount || 0 };
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.run(sql, params, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  public async get(sql: string, params: any[] = []): Promise<any> {
    const translatedSql = this.translateQuery(sql);

    if (this.usePg && this.pgPool) {
      const res = await this.pgPool.query(translatedSql, params);
      return res.rows[0] || null;
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  public async all(sql: string, params: any[] = []): Promise<any[]> {
    const translatedSql = this.translateQuery(sql);

    if (this.usePg && this.pgPool) {
      const res = await this.pgPool.query(translatedSql, params);
      return res.rows || [];
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  public async exec(sql: string): Promise<void> {
    const translatedSql = this.translateQuery(sql);

    if (this.usePg && this.pgPool) {
      await this.pgPool.query(translatedSql);
      return;
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.exec(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public close(): void {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          logger.error('Error closing database:', err);
        } else {
          logger.info('Database connection closed');
        }
      });
    }
  }

  public async disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            logger.error('Error closing database:', err);
            reject(err);
          } else {
            logger.info('Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  // Audit logging
  public async logAudit(
    userId: number,
    action: string,
    resourceType: string,
    resourceId: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await this.run(
        `INSERT INTO audit_log (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          action,
          resourceType,
          resourceId,
          details ? JSON.stringify(details) : null,
          ipAddress || null,
          userAgent || null,
        ]
      );
    } catch (error) {
      logger.error('Failed to log audit:', error);
    }
  }

  // Session management
  public async createSession(userId: number, token: string, expiresAt: string): Promise<void> {
    await this.run(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expiresAt]
    );
  }

  public async getSession(token: string): Promise<any> {
    return await this.get(
      'SELECT * FROM sessions WHERE token = ? AND datetime(expires_at) > datetime("now")',
      [token]
    );
  }

  public async deleteSession(token: string): Promise<void> {
    await this.run('DELETE FROM sessions WHERE token = ?', [token]);
  }

  public async cleanExpiredSessions(): Promise<void> {
    await this.run('DELETE FROM sessions WHERE datetime(expires_at) <= datetime("now")', []);
  }
}

export default DatabaseService;
