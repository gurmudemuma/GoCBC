/**
 * Blockchain Cache Service
 * 
 * Implements in-memory caching for blockchain queries to avoid
 * repeated slow blockchain reads (20-30s timeouts).
 * 
 * Features:
 * - LRU (Least Recently Used) cache with configurable TTL
 * - Automatic cache invalidation on writes
 * - Cache warming for frequently accessed data
 * - Metrics for cache hit/miss rates
 */

import { logger } from '../utils/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

class BlockchainCacheService {
  private cache: Map<string, CacheEntry<any>>;
  private readonly DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes default
  private readonly MAX_CACHE_SIZE = 1000; // Maximum 1000 entries
  
  // Statistics
  private hits = 0;
  private misses = 0;

  constructor() {
    this.cache = new Map();
    
    // Cleanup expired entries every minute
    setInterval(() => this.cleanupExpired(), 60000);
  }

  /**
   * Get data from cache or fetch from blockchain
   * @param key Cache key
   * @param fetchFn Function to fetch from blockchain if cache miss
   * @param ttlMs Time to live in milliseconds (default 5 minutes)
   */
  async get<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlMs: number = this.DEFAULT_TTL_MS
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get(key);
    
    if (cached && Date.now() < cached.expiresAt) {
      this.hits++;
      logger.debug(`✅ Cache HIT: ${key}`);
      return cached.data as T;
    }

    // Cache miss - fetch from blockchain
    this.misses++;
    logger.debug(`❌ Cache MISS: ${key} - fetching from blockchain`);
    
    try {
      const data = await fetchFn();
      
      // Store in cache
      this.set(key, data, ttlMs);
      
      return data;
    } catch (error: any) {
      logger.error(`Failed to fetch data for cache key ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, ttlMs: number = this.DEFAULT_TTL_MS): void {
    // Enforce max cache size (LRU eviction)
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
        logger.debug(`🗑️ Cache evicted (LRU): ${firstKey}`);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    });
    
    logger.debug(`💾 Cache SET: ${key} (TTL: ${ttlMs}ms)`);
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug(`🗑️ Cache invalidated: ${key}`);
    }
  }

  /**
   * Invalidate all cache entries matching a pattern
   * @param pattern Regex pattern or string prefix
   */
  invalidatePattern(pattern: string | RegExp): number {
    let count = 0;
    const regex = typeof pattern === 'string' ? new RegExp(`^${pattern}`) : pattern;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    if (count > 0) {
      logger.debug(`🗑️ Cache invalidated ${count} entries matching pattern: ${pattern}`);
    }
    
    return count;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    logger.info(`🗑️ Cache cleared (${size} entries removed)`);
  }

  /**
   * Remove expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      logger.debug(`🧹 Cleaned up ${removed} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
    };
  }

  /**
   * Pre-warm cache with frequently accessed data
   * Should be called on server startup
   */
  async warmCache(warmFunctions: Array<{ key: string; fn: () => Promise<any>; ttl?: number }>): Promise<void> {
    logger.info('🔥 Warming blockchain cache...');
    
    let warmed = 0;
    let failed = 0;
    
    for (const { key, fn, ttl } of warmFunctions) {
      try {
        const data = await fn();
        this.set(key, data, ttl);
        warmed++;
      } catch (error: any) {
        logger.warn(`Failed to warm cache for ${key}: ${error.message}`);
        failed++;
      }
    }
    
    logger.info(`✅ Cache warming complete: ${warmed} succeeded, ${failed} failed`);
  }
}

// Export singleton instance
export const blockchainCache = new BlockchainCacheService();

/**
 * Cache key builders for consistency
 */
export const CacheKeys = {
  contract: (contractId: string) => `contract:${contractId}`,
  contractHistory: (contractId: string) => `contract:${contractId}:history`,
  shipment: (shipmentId: string) => `shipment:${shipmentId}`,
  shipmentHistory: (shipmentId: string) => `shipment:${shipmentId}:history`,
  contractsByExporter: (exporterId: string) => `contracts:exporter:${exporterId}`,
  shipmentsByContract: (contractId: string) => `shipments:contract:${contractId}`,
  allContracts: () => `contracts:all`,
  allShipments: () => `shipments:all`,
};

/**
 * Cache invalidation helpers
 */
export const CacheInvalidation = {
  /** Invalidate contract and related caches */
  contract: (contractId: string, exporterId?: string) => {
    blockchainCache.invalidate(CacheKeys.contract(contractId));
    blockchainCache.invalidate(CacheKeys.contractHistory(contractId));
    blockchainCache.invalidate(CacheKeys.allContracts());
    if (exporterId) {
      blockchainCache.invalidate(CacheKeys.contractsByExporter(exporterId));
    }
  },
  
  /** Invalidate shipment and related caches */
  shipment: (shipmentId: string, contractId?: string) => {
    blockchainCache.invalidate(CacheKeys.shipment(shipmentId));
    blockchainCache.invalidate(CacheKeys.shipmentHistory(shipmentId));
    blockchainCache.invalidate(CacheKeys.allShipments());
    if (contractId) {
      blockchainCache.invalidate(CacheKeys.shipmentsByContract(contractId));
    }
  },
  
  /** Invalidate all caches for an exporter */
  exporter: (exporterId: string) => {
    blockchainCache.invalidatePattern(`contracts:exporter:${exporterId}`);
    blockchainCache.invalidate(CacheKeys.allContracts());
  },
};
