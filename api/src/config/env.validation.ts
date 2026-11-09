// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Environment validation — runs at startup, before the server listens.
//
// This file was missing on the `features` branch even though
// `api/src/server.ts` imported it, so the API could not start from a
// clean checkout. It now exists and is the single place that decides
// whether the process may start.
//
// Security rule: there is NO fallback JWT secret anywhere in the
// codebase any more. A deployment without a strong JWT_SECRET must
// fail loudly at startup instead of silently signing tokens with a
// value anyone can read in the public repository.

import { logger } from '../utils/logger';

export interface EnvironmentConfig {
  nodeEnv: string;
  jwtSecret: string;
  jwtExpiry: string;
  fabricRequired: boolean;
  fabricMinOrdererConsenters: number;
  databaseUrl: string;
}

// Values that have appeared in the public repository or in example
// files. Any of them as JWT_SECRET is equivalent to no secret at all.
const KNOWN_WEAK_SECRETS = new Set([
  'cecbs-secret-key',
  'your-secret-key-change-in-production',
  'change-me',
  'changeme',
  'secret',
  'test-secret',
  'your-secret-key',
  'jwt-secret',
]);

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error(
      'JWT_SECRET is not set. Generate one with `openssl rand -base64 48` and set it in the environment. ' +
        'The server refuses to start without it — there is no default secret.'
    );
  }
  if (KNOWN_WEAK_SECRETS.has(secret)) {
    throw new Error(
      'JWT_SECRET uses a value published in the repository. It must be replaced with a fresh random secret. ' +
        'Any token ever signed with the published value must be treated as compromised.'
    );
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long.');
  }
  return secret;
}

export function getJwtExpiry(): string {
  // Honour the configured value; default to 8h (previously the code
  // hard-coded 24h and ignored JWT_EXPIRY entirely).
  return process.env.JWT_EXPIRY || '8h';
}

export function validateEnvironment(): EnvironmentConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Fail fast on a missing/weak JWT secret — this is the gate that
  // makes the forgeable-token finding impossible to deploy by accident.
  const jwtSecret = getJwtSecret();
  const jwtExpiry = getJwtExpiry();

  const fabricRequired = process.env.FABRIC_REQUIRED === 'true';

  const minConsentersRaw = process.env.FABRIC_MIN_ORDERER_CONSENTERS;
  const fabricMinOrdererConsenters = minConsentersRaw
    ? parseInt(minConsentersRaw, 10)
    : 1;
  if (!Number.isInteger(fabricMinOrdererConsenters) || fabricMinOrdererConsenters < 1) {
    throw new Error(
      'FABRIC_MIN_ORDERER_CONSENTERS must be a positive integer.'
    );
  }

  const databaseUrl =
    process.env.DATABASE_URL ||
    'postgresql://cecbs:cecbs123@localhost:5432/cecbs';

  logger.info(
    `Environment validated (NODE_ENV=${nodeEnv}, JWT_EXPIRY=${jwtExpiry}, ` +
      `FABRIC_REQUIRED=${fabricRequired}, FABRIC_MIN_ORDERER_CONSENTERS=${fabricMinOrdererConsenters})`
  );

  return {
    nodeEnv,
    jwtSecret,
    jwtExpiry,
    fabricRequired,
    fabricMinOrdererConsenters,
    databaseUrl,
  };
}
