// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Database Service - SQLite Wrapper

import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import { logger } from '../utils/logger';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: sqlite3.Database | null = null;

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
    return this.db !== null;
  }

  private connect(): void {
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
        permissions TEXT DEFAULT '[]',
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'inactive')),
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
        comments TEXT,
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

    this.db.serialize(() => {
      this.db!.run(usersTableSQL, (err) => {
        if (err) {
          logger.error('Failed to create users table:', err);
        } else {
          logger.info('✅ Users table ready');
          this.createIndexes();
          this.seedDefaultUsers();
        }
      });

      this.db!.run(applicationsTableSQL, (err) => {
        if (err) {
          logger.error('Failed to create applications table:', err);
        } else {
          logger.info('✅ Exporter applications table ready');
        }
      });

      this.db!.run(auditLogTableSQL, (err) => {
        if (err) {
          logger.error('Failed to create audit_log table:', err);
        } else {
          logger.info('✅ Audit log table ready');
        }
      });

      this.db!.run(sessionsTableSQL, (err) => {
        if (err) {
          logger.error('Failed to create sessions table:', err);
        } else {
          logger.info('✅ Sessions table ready');
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
    ];

    indexes.forEach((indexSQL) => {
      this.db!.run(indexSQL, (err) => {
        if (err) {
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
          username: 'ecta_admin',
          email: 'admin@ecta.gov.et',
          password: hash,
          fullName: 'ECTA Administrator',
          role: 'ECTA',
          organization: 'Ethiopian Coffee & Tea Authority',
          permissions: JSON.stringify(['exporter.view', 'exporter.create', 'exporter.update', 'quality.manage']),
        },
        {
          username: 'ecx_admin',
          email: 'admin@ecx.et',
          password: hash,
          fullName: 'ECX Administrator',
          role: 'ECX',
          organization: 'Ethiopian Commodity Exchange',
          permissions: JSON.stringify(['lot.view', 'lot.create', 'lot.trade', 'market.manage']),
        },
        {
          username: 'nbe_admin',
          email: 'admin@nbe.gov.et',
          password: hash,
          fullName: 'NBE Administrator',
          role: 'NBE',
          organization: 'National Bank of Ethiopia',
          permissions: JSON.stringify(['contract.view', 'contract.approve', 'forex.allocate', 'forex.manage']),
        },
        {
          username: 'bank_admin',
          email: 'admin@cbe.com.et',
          password: hash,
          fullName: 'Bank Administrator',
          role: 'BANKS',
          organization: 'Commercial Bank of Ethiopia',
          permissions: JSON.stringify(['permit.view', 'permit.approve', 'payment.process']),
        },
        {
          username: 'customs_admin',
          email: 'admin@customs.gov.et',
          password: hash,
          fullName: 'Customs Administrator',
          role: 'CUSTOMS',
          organization: 'Ethiopian Customs Commission',
          permissions: JSON.stringify(['declaration.view', 'declaration.clear', 'inspection.schedule', 'eudr.verify']),
        },
        {
          username: 'shipping_admin',
          email: 'admin@shipping.et',
          password: hash,
          fullName: 'Shipping Administrator',
          role: 'SHIPPING',
          organization: 'Ethiopian Shipping Lines',
          permissions: JSON.stringify(['shipment.view', 'shipment.track', 'shipment.update', 'logistics.manage']),
        },
        {
          username: 'ethiopianpremium',
          email: 'info@ethiopianpremium.com',
          password: hash,
          fullName: 'Ethiopian Premium Coffee Exporters PLC',
          role: 'EXPORTER',
          organization: 'Ethiopian Premium Coffee Exporters PLC',
          exporterId: 'EXP2026001',
          ectaLicense: 'ECTA-LIC-2026-001',
          permissions: JSON.stringify([
            'contract.create', 'contract.view', 'shipment.view', 'shipment.create',
            'payment.view', 'document.upload', 'document.view', 'report.generate',
          ]),
        },
        {
          username: 'testexporter',
          email: 'test@testexporter.com',
          password: hash,
          fullName: 'Test Coffee Exporters Ltd',
          role: 'EXPORTER',
          organization: 'Test Coffee Exporters Ltd',
          exporterId: 'EXP2026002',
          ectaLicense: 'ECTA-LIC-2026-002',
          permissions: JSON.stringify([
            'contract.create', 'contract.view', 'shipment.view', 'shipment.create',
            'payment.view', 'document.upload', 'document.view', 'report.generate',
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
