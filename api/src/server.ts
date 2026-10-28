// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// REST API Gateway Server

// Load environment variables FIRST - before any other imports that may read process.env
import dotenv from 'dotenv';
dotenv.config();

// Validate environment variables immediately after loading
import { validateEnvironment, EnvironmentConfig } from './config/env.validation';
import { logger } from './utils/logger';

let envConfig: EnvironmentConfig;
try {
  envConfig = validateEnvironment();
  logger.info('✅ Environment variables validated successfully');
} catch (error) {
  logger.error('❌ Environment validation failed:', error);
  logger.error('Please check your .env file and ensure all required variables are set correctly.');
  process.exit(1);
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import 'reflect-metadata';

import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { auditMiddleware as auditCaptureMiddleware } from './middleware/auditMiddleware';
import { FabricService } from './services/fabricService';
import EmailService from './services/emailService';
import { DatabaseService } from './services/databaseService';
import { WebSocketService } from './services/websocketService';
import { blockchainSyncService } from './services/blockchainSyncService';

// Import routes
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import cryptoUsersRoutes from './routes/crypto-users';
import exporterRoutes from './routes/exporters';
import contractRoutes from './routes/contracts';
import shipmentRoutes from './routes/shipments';
import analyticsRoutes from './routes/analytics';
import blockchainRoutes from './routes/blockchain';
import blockchainSyncRoutes from './routes/blockchain-sync';
import monitoringRoutes from './routes/monitoring';
import cacheRoutes from './routes/cache';
import fileRoutes from './routes/files';
import bankingRoutes from './routes/banking';
import qualityRoutes from './routes/quality';
import customsRoutes from './routes/customs';
import documentsRoutes from './routes/documents';
import paymentsRoutes from './routes/payments';
import auditRoutes from './routes/audit';
import traceabilityRoutes from './routes/traceability';
import forexRoutes from './routes/forex';
import ecxRoutes from './routes/ecx';
import permitsRoutes from './routes/permits';
import phytosanitaryRoutes from './routes/phytosanitary';
import insuranceRoutes from './routes/insurance';
import landTransportRoutes from './routes/land-transport';
import retentionRoutes from './routes/retention';
import lcAmendmentsRoutes from './routes/lc-amendments';
import swiftRoutes from './routes/swift';
import eudrRoutes from './routes/eudr';
import courierRoutes from './routes/courier';
import statusRoutes from './routes/status';
import notificationsRoutes from './routes/notifications';
import postDeliveryWorkflowRoutes from './routes/postDeliveryWorkflow';
import blockchainSignaturesRoutes from './routes/blockchain-signatures';
import statsRoutes from './routes/stats'; // Dual-source statistics (CouchDB + PostgreSQL)
import repatriationRoutes from './routes/repatriation'; // Export proceeds repatriation (NBE compliance)
import exchangeRatesRoutes from './routes/exchange-rates'; // Dynamic exchange rates management
import inspectionRoutes from './routes/inspection'; // Pre-shipment inspection (SGS/Intertek)
import bordercrossingRoutes from './routes/bordercrossing'; // Border crossing documentation
import portalsRoutes from './routes/portals'; // Unified portal dashboards

// Load environment variables
dotenv.config();

class CECBSServer {
  private app: express.Application;
  private server: any;
  private wsServer!: WebSocketServer;
  private fabricService: FabricService;
  private databaseService: DatabaseService;
  // private wsService!: WebSocketService; // Not used yet

  constructor() {
    this.app = express();
    this.fabricService = FabricService.getInstance();
    this.databaseService = DatabaseService.getInstance();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSwagger();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Keep each request's Fabric MSP selection isolated from concurrent portal requests.
    this.app.use((_req, _res, next) => this.fabricService.runWithRequestContext(next));

    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          frameSrc: ["'self'"], // Allow iframes from same origin
        },
      },
      frameguard: {
        action: 'sameorigin' // Allow same-origin framing (for document preview)
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()) || [
        'http://localhost:3000',
        'http://localhost:3003',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Blockchain operations rate limiting (more restrictive)
    const blockchainLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 100, // Limit each IP to 100 blockchain operations per hour
      message: 'Too many blockchain operations, please try again later.',
    });
    this.app.use('/api/v1/blockchain/', blockchainLimiter);

    // General middleware
    this.app.use(compression());
    this.app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
    
    // JSON and URL-encoded parsers - skip for multipart file upload routes only
    this.app.use((req, res, next) => {
      // Only skip for actual multipart file uploads, not JSON document endpoints
      if (req.path === '/api/v1/files/upload' && req.headers['content-type']?.includes('multipart')) {
        return next(); // Skip JSON parsing for multipart file uploads
      }
      express.json({ limit: '10mb' })(req, res, next);
    });
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        services: {
          database: this.databaseService.isConnected(),
          blockchain: this.fabricService.isConnected(),
          email: EmailService.getInstance().getStatus(),
        },
      });
    });

    // Readiness is stricter than liveness: portal writes are only enabled when
    // the database, Fabric ledger, and committed Raft configuration are available.
    // Development may require one local consenter; production requires the
    // configured fault-tolerant consortium minimum.
    this.app.get('/ready', async (_req, res) => {
      const [blockchain, ordererConfiguration] = await Promise.all([
        this.fabricService.checkLedgerConnectivity(),
        this.fabricService.getOrdererConfigurationReadiness(envConfig.fabricMinOrdererConsenters),
      ]);
      const services = {
        database: this.databaseService.isConnected(),
        blockchain,
        ordererConfiguration,
      };
      const ready = services.database && services.blockchain && services.ordererConfiguration.ready;
      res.status(ready ? 200 : 503).json({
        status: ready ? 'ready' : 'not_ready',
        timestamp: new Date().toISOString(),
        services,
      });
    });

    // Favicon endpoint - prevent 404 errors
    this.app.get('/favicon.ico', (_req, res) => {
      res.status(204).end(); // No content
    });
  }

  private setupRoutes(): void {
    const apiV1 = express.Router();

    // Apply audit capture middleware to all API routes
    apiV1.use(auditCaptureMiddleware);

    // Public routes (no authentication required)
    apiV1.use('/auth', authRoutes);
    
    // Exporters routes - mixed public and protected
    // Public: POST /exporters/applications (submit application)
    // Protected: All other exporter routes
    apiV1.use('/exporters', exporterRoutes);
    
    // Protected routes (authentication required)
    apiV1.use('/users', authMiddleware, usersRoutes); // User management routes
    apiV1.use('/crypto-users', authMiddleware, cryptoUsersRoutes); // Cryptographic user management
    apiV1.use('/contracts', authMiddleware, contractRoutes);
    apiV1.use('/banking', authMiddleware, bankingRoutes);
    apiV1.use('/shipments', authMiddleware, shipmentRoutes);
    apiV1.use('/analytics', authMiddleware, analyticsRoutes);
    apiV1.use('/blockchain', authMiddleware, blockchainRoutes);
    apiV1.use('/files', authMiddleware, fileRoutes);
    
    // V1.4 New routes
    apiV1.use('/banking', authMiddleware, bankingRoutes);
    apiV1.use('/forex', authMiddleware, forexRoutes);
    apiV1.use('/customs', authMiddleware, customsRoutes);
    apiV1.use('/ecx', authMiddleware, ecxRoutes);
    apiV1.use('/quality', authMiddleware, qualityRoutes);
    
    // V1.5 CBE Payment Methods
    apiV1.use('/permits', authMiddleware, permitsRoutes);

    // V2.0 Cryptographic Audit Trail & Complete Traceability
    apiV1.use('/audit', authMiddleware, auditRoutes);
    apiV1.use('/traceability', authMiddleware, traceabilityRoutes);

    // V2.1 Gap Closures - Phytosanitary & Insurance Certificates
    apiV1.use('/phytosanitary', authMiddleware, phytosanitaryRoutes);
    apiV1.use('/insurance', authMiddleware, insuranceRoutes);

    // V2.2 Payment Settlement & Verification
    apiV1.use('/payments', authMiddleware, paymentsRoutes);

    // V2.3 Document Storage (Off-chain with IPFS)
    // Note: authMiddleware NOT applied here - individual routes handle auth
    // /upload-registration is public for exporter registration
    apiV1.use('/documents', documentsRoutes);

    // V2.4 Real-World Workflow Alignment
    apiV1.use('/land-transport', authMiddleware, landTransportRoutes); // Land transport tracking
    apiV1.use('/retention', authMiddleware, retentionRoutes); // NBE retention policy (FIXED: was /forex, conflicted with main forex routes)
    apiV1.use('/lc', authMiddleware, lcAmendmentsRoutes); // LC amendments & discrepancies

    // V2.5 SWIFT Message Management
    apiV1.use('/swift', authMiddleware, swiftRoutes); // SWIFT message operations

    // V2.6 Workflow Completion - EUDR & Courier Tracking
    apiV1.use('/eudr', authMiddleware, eudrRoutes); // EUDR compliance tracking
    apiV1.use('/courier', authMiddleware, courierRoutes); // Document courier tracking

    // V2.7 Status Management System
    apiV1.use('/status', authMiddleware, statusRoutes); // Unified status management

    // V3.0 Notifications & Multi-channel Communication
    apiV1.use('/notifications', authMiddleware, notificationsRoutes); // Notifications, SMS, Webhooks

    // V3.1 Post-Delivery Workflow Management
    apiV1.use('/post-delivery', authMiddleware, postDeliveryWorkflowRoutes); // Payment, Forex, LC, Audit, Closure

    // V3.2 Blockchain Signatures - Cryptographic proof for all entities (public endpoint)
    apiV1.use('/blockchain-signatures', blockchainSignaturesRoutes); // Entity-level blockchain signatures - public transparency

    // V3.3 Blockchain Sync Management
    apiV1.use('/blockchain-sync', authMiddleware, blockchainSyncRoutes); // Blockchain sync management (Admin only)
    apiV1.use('/monitoring', authMiddleware, monitoringRoutes); // System monitoring dashboard (Admin only)
    apiV1.use('/cache', authMiddleware, cacheRoutes); // Cache management (Admin only)

    // V3.3 Dual-Source Statistics - Fetch from BOTH CouchDB and PostgreSQL
    apiV1.use('/stats', authMiddleware, statsRoutes); // Bank portal stats from both blockchain and database

    // V3.4 HIGH Priority Features - Missing Workflow Steps (October 2026)
    apiV1.use('/repatriation', authMiddleware, repatriationRoutes); // Export proceeds repatriation (NBE 40% retention)
    apiV1.use('/exchange-rates', authMiddleware, exchangeRatesRoutes); // Dynamic exchange rates management
    apiV1.use('/inspection', authMiddleware, inspectionRoutes); // Pre-shipment inspection (SGS/Intertek)
    apiV1.use('/bordercrossing', authMiddleware, bordercrossingRoutes); // Border crossing documentation
    
    // V4.0 Unified Portal Dashboards (January 2027)
    apiV1.use('/portals', authMiddleware, portalsRoutes); // Single endpoint per portal dashboard
    
    // Note: LC discrepancy handling added to /banking routes above

    this.app.use('/api/v1', apiV1);

    // Root endpoint
    this.app.get('/', (_req, res) => {
      res.json({
        name: 'CECBS API Gateway',
        description: 'Ethiopian Coffee Export Consortium Blockchain System',
        version: process.env.npm_package_version || '1.4.0',
        documentation: '/api-docs',
        health: '/health',
      });
    });
  }

  private setupSwagger(): void {
    const options = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'CECBS API',
          version: '1.0.0',
          description: 'Ethiopian Coffee Export Consortium Blockchain System API',
          contact: {
            name: 'CECBS Support',
            email: 'support@cecbs.et',
          },
        },
        servers: [
          {
            url: process.env.API_BASE_URL || 'http://localhost:3001/api/v1',
            description: 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
      apis: ['./src/routes/*.ts', './src/models/*.ts'],
    };

    const specs = swaggerJsdoc(options);
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'CECBS API Documentation',
    }));
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.originalUrl} not found`,
        },
        timestamp: new Date().toISOString(),
      });
    });

    // Global error handler
    this.app.use(errorHandler);
  }

  private setupWebSocket(): void {
    this.wsServer = new WebSocketServer({ server: this.server });
    new WebSocketService(this.wsServer);
    
    logger.info('WebSocket server initialized');
  }

  public async start(): Promise<void> {
    try {
      // Run database migrations first
      try {
        const { runMigrations } = await import('./utils/runMigrations');
        await runMigrations();
      } catch (error) {
        logger.error('Migration error:', error);
        // A live API with an outdated schema produces partial portal failures.
        // Refuse startup until required database migrations have succeeded.
        throw error;
      }

      // Initialize services
      try {
        await this.fabricService.connect();
      } catch (error) {
        if (envConfig.nodeEnv === 'production' || envConfig.fabricRequired) {
          throw error;
        }
        logger.warn('Continuing server startup without Fabric connectivity');
      }

      const port = process.env.PORT || 3001;
      
      this.server = createServer(this.app);
      this.setupWebSocket();

      this.server.listen(port, '0.0.0.0', () => {
        logger.info(`🚀 CECBS API Gateway started on port ${port}`);
        logger.info(`📚 API Documentation: http://localhost:${port}/api-docs`);
        logger.info(`🏥 Health Check: http://localhost:${port}/health`);
        logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
        
        // Start blockchain sync service
        blockchainSyncService.start();
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async shutdown(): Promise<void> {
    logger.info('Shutting down server...');
    
    // Stop blockchain sync service
    blockchainSyncService.stop();
    
    if (this.server) {
      this.server.close();
    }
    
    if (this.wsServer) {
      this.wsServer.close();
    }

    await this.fabricService.disconnect();
    await this.databaseService.close();
    
    logger.info('Server shutdown complete');
    process.exit(0);
  }
}

// Start the server
const server = new CECBSServer();
server.start().catch((error) => {
  logger.error('Failed to start CECBS API Gateway:', error);
  process.exit(1);
});

export default CECBSServer;
