// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Environment Variable Validation

import { logger } from '../utils/logger';

export interface EnvironmentConfig {
  // Server
  port: number;
  nodeEnv: string;
  
  // Security
  jwtSecret: string;
  jwtExpiresIn: string;
  documentEncryptionKey: string;
  
  // Database
  databasePath: string;
  
  // Fabric
  fabricEnabled: boolean;
  fabricRequired: boolean;
  fabricMspId: string;
  fabricWalletPath: string;
  fabricChannelName: string;
  fabricChaincodeName: string;
  fabricAsLocalhost: boolean;
  
  // IPFS
  useIpfs: boolean;
  ipfsHost: string;
  ipfsPort: number;
  ipfsProtocol: string;
  ipfsGateway: string;
}

interface EnvValidationRule {
  name: string;
  required: boolean;
  default?: string;
  validate?: (value: string) => boolean;
  errorMessage?: string;
}

const ENV_RULES: EnvValidationRule[] = [
  // Server Configuration
  {
    name: 'PORT',
    required: false,
    default: '3001',
    validate: (v) => !isNaN(parseInt(v)) && parseInt(v) > 0 && parseInt(v) < 65536,
    errorMessage: 'PORT must be a valid port number (1-65535)',
  },
  {
    name: 'NODE_ENV',
    required: false,
    default: 'development',
    validate: (v) => ['development', 'production', 'test'].includes(v),
    errorMessage: 'NODE_ENV must be one of: development, production, test',
  },
  
  // Security
  {
    name: 'JWT_SECRET',
    required: true,
    validate: (v) => v.length >= 32,
    errorMessage: 'JWT_SECRET must be at least 32 characters for security',
  },
  {
    name: 'JWT_EXPIRES_IN',
    required: false,
    default: '24h',
  },
  {
    name: 'DOCUMENT_ENCRYPTION_KEY',
    required: true,
    validate: (v) => v.length >= 32,
    errorMessage: 'DOCUMENT_ENCRYPTION_KEY must be at least 32 characters',
  },
  
  // Database
  {
    name: 'DATABASE_PATH',
    required: false,
    default: './cecbs.db',
  },
  
  // Fabric
  {
    name: 'FABRIC_ENABLED',
    required: false,
    default: 'true',
    validate: (v) => v === 'true' || v === 'false',
    errorMessage: 'FABRIC_ENABLED must be "true" or "false"',
  },
  {
    name: 'FABRIC_REQUIRED',
    required: false,
    default: 'false',
    validate: (v) => v === 'true' || v === 'false',
    errorMessage: 'FABRIC_REQUIRED must be "true" or "false"',
  },
  {
    name: 'FABRIC_MSP_ID',
    required: false,
    default: 'ECTAMSP',
  },
  {
    name: 'FABRIC_WALLET_PATH',
    required: false,
    default: './wallet',
  },
  {
    name: 'FABRIC_CHANNEL_NAME',
    required: false,
    default: 'coffeechannel',
  },
  {
    name: 'FABRIC_CHAINCODE_NAME',
    required: false,
    default: 'coffee',
  },
  {
    name: 'FABRIC_AS_LOCALHOST',
    required: false,
    default: 'true',
    validate: (v) => v === 'true' || v === 'false',
    errorMessage: 'FABRIC_AS_LOCALHOST must be "true" or "false"',
  },
  
  // IPFS
  {
    name: 'USE_IPFS',
    required: false,
    default: 'false',
    validate: (v) => v === 'true' || v === 'false',
    errorMessage: 'USE_IPFS must be "true" or "false"',
  },
  {
    name: 'IPFS_HOST',
    required: false,
    default: 'localhost',
  },
  {
    name: 'IPFS_PORT',
    required: false,
    default: '5001',
    validate: (v) => !isNaN(parseInt(v)) && parseInt(v) > 0 && parseInt(v) < 65536,
    errorMessage: 'IPFS_PORT must be a valid port number',
  },
  {
    name: 'IPFS_PROTOCOL',
    required: false,
    default: 'http',
    validate: (v) => v === 'http' || v === 'https',
    errorMessage: 'IPFS_PROTOCOL must be "http" or "https"',
  },
  {
    name: 'IPFS_GATEWAY',
    required: false,
    default: 'http://localhost:8080/ipfs/',
  },
];

export class EnvironmentValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * Validates all environment variables and returns configuration
   * @throws Error if required variables are missing or invalid
   */
  public validate(): EnvironmentConfig {
    this.errors = [];
    this.warnings = [];

    // Check production-specific requirements
    if (process.env.NODE_ENV === 'production') {
      this.validateProduction();
    }

    // Validate each environment variable
    ENV_RULES.forEach(rule => {
      this.validateRule(rule);
    });

    // If there are errors, throw
    if (this.errors.length > 0) {
      const errorMessage = [
        '❌ Environment variable validation failed:',
        ...this.errors.map(err => `  - ${err}`),
        '',
        'Please check your .env file and ensure all required variables are set correctly.',
      ].join('\n');
      
      throw new Error(errorMessage);
    }

    // Log warnings if any
    if (this.warnings.length > 0) {
      logger.warn('⚠️  Environment variable warnings:');
      this.warnings.forEach(warn => logger.warn(`  - ${warn}`));
    }

    // Return validated configuration
    return this.buildConfig();
  }

  private validateRule(rule: EnvValidationRule): void {
    const value = process.env[rule.name];

    // Check if required variable is missing
    if (rule.required && !value) {
      this.errors.push(`${rule.name} is required but not set`);
      return;
    }

    // Use default if not set
    if (!value && rule.default) {
      process.env[rule.name] = rule.default;
      return;
    }

    // Validate value if validator function provided
    if (value && rule.validate && !rule.validate(value)) {
      this.errors.push(rule.errorMessage || `${rule.name} has invalid value: ${value}`);
    }
  }

  private validateProduction(): void {
    // Check for default/weak secrets in production
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && (
      jwtSecret === 'cecbs-secret-key' ||
      jwtSecret === 'secret' ||
      jwtSecret === 'changeme' ||
      jwtSecret.length < 32
    )) {
      this.errors.push(
        'JWT_SECRET must be a strong secret (32+ characters) in production. ' +
        'Do not use default values like "cecbs-secret-key"'
      );
    }

    const encryptionKey = process.env.DOCUMENT_ENCRYPTION_KEY;
    if (encryptionKey && (
      encryptionKey.includes('change_in_production') ||
      encryptionKey.length < 32
    )) {
      this.errors.push(
        'DOCUMENT_ENCRYPTION_KEY must be a strong key (32+ characters) in production. ' +
        'Do not use example keys that contain "change_in_production"'
      );
    }

    // Warn about localhost in production
    if (process.env.FABRIC_AS_LOCALHOST === 'true') {
      this.warnings.push(
        'FABRIC_AS_LOCALHOST is set to true in production. ' +
        'This should typically be false for production deployments.'
      );
    }

    // Check IPFS configuration in production
    if (process.env.USE_IPFS === 'true' && process.env.IPFS_HOST === 'localhost') {
      this.warnings.push(
        'IPFS_HOST is set to localhost in production. ' +
        'Ensure IPFS daemon is accessible from the production environment.'
      );
    }
  }

  private buildConfig(): EnvironmentConfig {
    return {
      // Server
      port: parseInt(process.env.PORT || '3001'),
      nodeEnv: process.env.NODE_ENV || 'development',
      
      // Security
      jwtSecret: process.env.JWT_SECRET!,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
      documentEncryptionKey: process.env.DOCUMENT_ENCRYPTION_KEY!,
      
      // Database
      databasePath: process.env.DATABASE_PATH || './cecbs.db',
      
      // Fabric
      fabricEnabled: process.env.FABRIC_ENABLED === 'true',
      fabricRequired: process.env.FABRIC_REQUIRED === 'true',
      fabricMspId: process.env.FABRIC_MSP_ID || 'ECTAMSP',
      fabricWalletPath: process.env.FABRIC_WALLET_PATH || './wallet',
      fabricChannelName: process.env.FABRIC_CHANNEL_NAME || 'coffeechannel',
      fabricChaincodeName: process.env.FABRIC_CHAINCODE_NAME || 'coffee',
      fabricAsLocalhost: process.env.FABRIC_AS_LOCALHOST !== 'false',
      
      // IPFS
      useIpfs: process.env.USE_IPFS === 'true',
      ipfsHost: process.env.IPFS_HOST || 'localhost',
      ipfsPort: parseInt(process.env.IPFS_PORT || '5001'),
      ipfsProtocol: process.env.IPFS_PROTOCOL || 'http',
      ipfsGateway: process.env.IPFS_GATEWAY || 'http://localhost:8080/ipfs/',
    };
  }

  /**
   * Logs the current environment configuration (sanitized)
   */
  public static logConfiguration(config: EnvironmentConfig): void {
    logger.info('📋 Environment Configuration:');
    logger.info(`  Node Environment: ${config.nodeEnv}`);
    logger.info(`  Port: ${config.port}`);
    logger.info(`  Database: ${config.databasePath}`);
    logger.info(`  Fabric Enabled: ${config.fabricEnabled}`);
    if (config.fabricEnabled) {
      logger.info(`  Fabric MSP: ${config.fabricMspId}`);
      logger.info(`  Fabric Channel: ${config.fabricChannelName}`);
      logger.info(`  Fabric Chaincode: ${config.fabricChaincodeName}`);
    }
    logger.info(`  IPFS Enabled: ${config.useIpfs}`);
    if (config.useIpfs) {
      logger.info(`  IPFS Host: ${config.ipfsHost}:${config.ipfsPort}`);
    }
    
    // Security info (sanitized)
    logger.info(`  JWT Secret: ${config.jwtSecret.substring(0, 8)}... (${config.jwtSecret.length} chars)`);
    logger.info(`  Encryption Key: ${config.documentEncryptionKey.substring(0, 8)}... (${config.documentEncryptionKey.length} chars)`);
  }
}

/**
 * Validates environment variables and returns configuration
 * Call this at application startup
 */
export function validateEnvironment(): EnvironmentConfig {
  const validator = new EnvironmentValidator();
  const config = validator.validate();
  EnvironmentValidator.logConfiguration(config);
  return config;
}
