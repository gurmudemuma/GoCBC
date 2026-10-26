// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Portal Data Loader Utility
// Provides consistent parallel data loading for all portals

import { apiFetch } from '@/config/api.config';

interface DataEndpoint {
  name: string;
  endpoint: string;
  transform?: (data: any) => any;
  fallback?: any;
}

interface LoadDataOptions {
  token: string;
  endpoints: DataEndpoint[];
  onProgress?: (loaded: number, total: number) => void;
  onError?: (endpointName: string, error: any) => void;
}

interface LoadDataResult {
  success: boolean;
  data: Record<string, any>;
  errors: Record<string, any>;
}

/**
 * Load data from multiple endpoints in parallel
 * Returns an object with endpoint names as keys and data as values
 */
export const loadPortalData = async ({
  token,
  endpoints,
  onProgress,
  onError,
}: LoadDataOptions): Promise<LoadDataResult> => {
  
  const result: LoadDataResult = {
    success: true,
    data: {},
    errors: {},
  };

  // Create promises for all endpoints
  const promises = endpoints.map(({ name, endpoint, transform, fallback }) => {
    return apiFetch(endpoint, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(response => {
        if (response.success) {
          const data = response.data || [];
          result.data[name] = transform ? transform(data) : data;
          
          // Report progress
          if (onProgress) {
            const loaded = Object.keys(result.data).length;
            onProgress(loaded, endpoints.length);
          }
          
          return { name, success: true };
        } else {
          throw new Error(response.error || 'Failed to load data');
        }
      })
      .catch(error => {
        console.warn(`[${name}] Failed to load:`, error);
        result.errors[name] = error;
        result.data[name] = fallback !== undefined ? fallback : [];
        result.success = false;
        
        // Report error
        if (onError) {
          onError(name, error);
        }
        
        return { name, success: false };
      });
  });

  // Wait for all promises to complete
  await Promise.all(promises);

  return result;
};

/**
 * Load data with retry logic
 */
export const loadPortalDataWithRetry = async (
  options: LoadDataOptions,
  maxRetries: number = 2,
  retryDelay: number = 1000
): Promise<LoadDataResult> => {
  let lastResult: LoadDataResult | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    lastResult = await loadPortalData(options);
    
    // If successful or last attempt, return result
    if (lastResult.success || attempt === maxRetries) {
      return lastResult;
    }
    
    // Wait before retry
    if (attempt < maxRetries) {
      console.log(`Retrying failed endpoints (attempt ${attempt + 2}/${maxRetries + 1})...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      // Retry only failed endpoints
      const failedEndpoints = options.endpoints.filter(
        ep => lastResult!.errors[ep.name]
      );
      options.endpoints = failedEndpoints;
    }
  }
  
  return lastResult!;
};

/**
 * Transform functions for common data types
 */
export const dataTransforms = {
  /**
   * Add computed fields to items
   */
  addComputedFields: (items: any[], computeFn: (item: any) => any) => {
    return items.map(item => ({
      ...item,
      ...computeFn(item),
    }));
  },

  /**
   * Filter items by status
   */
  filterByStatus: (items: any[], status: string) => {
    return items.filter(item => {
      const itemStatus = item.status || item.Status || '';
      return itemStatus === status;
    });
  },

  /**
   * Sort items by date (descending)
   */
  sortByDate: (items: any[], dateField: string = 'createdAt') => {
    return [...items].sort((a, b) => {
      const dateA = new Date(a[dateField] || 0).getTime();
      const dateB = new Date(b[dateField] || 0).getTime();
      return dateB - dateA;
    });
  },

  /**
   * Group items by field
   */
  groupBy: (items: any[], field: string) => {
    return items.reduce((acc, item) => {
      const key = item[field] || 'unknown';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, any[]>);
  },

  /**
   * Enrich items with data from another array
   */
  enrichWith: (items: any[], lookupItems: any[], itemKey: string, lookupKey: string, fields: string[]) => {
    const lookupMap = new Map(lookupItems.map(item => [item[lookupKey], item]));
    
    return items.map(item => {
      const lookupItem = lookupMap.get(item[itemKey]);
      if (!lookupItem) return item;
      
      const enrichedFields: any = {};
      fields.forEach(field => {
        enrichedFields[field] = lookupItem[field];
      });
      
      return { ...item, ...enrichedFields };
    });
  },
};

/**
 * Calculate KPI stats from data
 */
export const calculateKPIStats = (data: any[], config: {
  total?: boolean;
  countByStatus?: string[];
  sumField?: string;
  avgField?: string;
  customStats?: Record<string, (data: any[]) => number>;
}): Record<string, number> => {
  const stats: Record<string, number> = {};

  // Total count
  if (config.total) {
    stats.total = data.length;
  }

  // Count by status
  if (config.countByStatus) {
    config.countByStatus.forEach(status => {
      const count = data.filter(item => {
        const itemStatus = item.status || item.Status || '';
        return itemStatus === status;
      }).length;
      stats[status.toLowerCase()] = count;
    });
  }

  // Sum field
  if (config.sumField) {
    stats[`${config.sumField}Sum`] = data.reduce((sum, item) => {
      return sum + (parseFloat(item[config.sumField!]) || 0);
    }, 0);
  }

  // Average field
  if (config.avgField) {
    const values = data.map(item => parseFloat(item[config.avgField!]) || 0);
    const sum = values.reduce((a, b) => a + b, 0);
    stats[`${config.avgField}Avg`] = data.length > 0 ? sum / data.length : 0;
  }

  // Custom stats
  if (config.customStats) {
    Object.entries(config.customStats).forEach(([key, fn]) => {
      stats[key] = fn(data);
    });
  }

  return stats;
};

export default {
  loadPortalData,
  loadPortalDataWithRetry,
  dataTransforms,
  calculateKPIStats,
};
