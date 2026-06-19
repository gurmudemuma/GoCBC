// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// REST API Gateway Server

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
import dotenv from 'dotenv';
import 'reflect-metadata';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { FabricService } from './services/fabricService';
import { DatabaseService } from './services/databaseService';
import { WebSocketService } from './services/websocketService';

// Import routes
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import exporterRoutes from './routes/exporters';
import contractRoutes from './routes/contracts';
import shipmentRoutes from './routes/shipments';
import analyticsRoutes from './routes/analytics';
import blockchainRoutes from './routes/blockchain';
import fileRoutes from './routes/files';
import bankingRoutes from './routes/banking';
import forexRoutes from './routes/forex';
import customsRoutes from './routes/customs';
import ecxRoutes from './routes/ecx';
import qualityRoutes from './routes/quality';

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
    this.fabricService = new FabricService();
    this.databaseService = DatabaseService.getInstance();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSwagger();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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
    this.app.use(express.json({ limit: '10mb' }));
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
        },
      });
    });
  }

  private setupRoutes(): void {
    const apiV1 = express.Router();

    // Public routes (no authentication required)
    apiV1.use('/auth', authRoutes);
    
    // Exporters routes - mixed public and protected
    // Public: POST /exporters/applications (submit application)
    // Protected: All other exporter routes
    apiV1.use('/exporters', exporterRoutes);
    
    // Protected routes (authentication required)
    apiV1.use('/users', authMiddleware, usersRoutes); // User management routes
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
    this.wsService = new WebSocketService(this.wsServer);
    
    logger.info('WebSocket server initialized');
  }

  public async start(): Promise<void> {
    try {
      // Initialize services
      await this.fabricService.connect();

      const port = process.env.PORT || 3001;
      
      this.server = createServer(this.app);
      this.setupWebSocket();

      this.server.listen(port, () => {
        logger.info(`🚀 CECBS API Gateway started on port ${port}`);
        logger.info(`📚 API Documentation: http://localhost:${port}/api-docs`);
        logger.info(`🏥 Health Check: http://localhost:${port}/health`);
        logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
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
    
    if (this.server) {
      this.server.close();
    }
    
    if (this.wsServer) {
      this.wsServer.close();
    }

    await this.fabricService.disconnect();
    await this.databaseService.disconnect();
    
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