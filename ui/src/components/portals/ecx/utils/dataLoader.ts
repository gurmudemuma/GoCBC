// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// ECX Portal - Data Loader
// Handles data loading and transformation for ECX Portal

export interface CoffeeLot {
  lotId: string;
  ecxLotNumber: string;
  exporterId: string;
  exporterName?: string;
  warehouseId: string;
  origin: string;
  subRegion?: string;
  quantity: number;
  bags?: number;
  processingMethod: string;
  harvestSeason: string;
  grade: string;
  qualityScore?: number;
  moistureContent?: number;
  defectCount?: number;
  pricePerKg?: number;
  contractId?: string;
  status: 'WAREHOUSED' | 'GRADED' | 'ASSIGNED' | 'RELEASED' | 'REJECTED';
  warehouseReceiptDate: string;
  gradingDate?: string;
  assignmentDate?: string;
  releaseDate?: string;
  rejectionReason?: string;
}

export interface ECXStats {
  warehoused: number;
  graded: number;
  assigned: number;
  released: number;
  total: number;
  avgQualityScore: number;
  totalWeight: number;
  grade1Count: number;
}

/**
 * Load all ECX portal data
 */
export const loadECXData = async () => {
  try {
    // Dynamically import api to avoid circular dependencies
    const { default: api } = await import('@/utils/api');
    
    const lotsRes = await api.get('/ecx/lots');
    const lots: CoffeeLot[] = lotsRes.data?.success 
      ? (lotsRes.data.data || []).map((lot: any) => ({
          lotId: lot.lotId || lot.lot_id || '',
          ecxLotNumber: lot.ecxLotNumber || lot.ecx_lot_number || '',
          exporterId: lot.exporterId || lot.exporter_id || '',
          exporterName: lot.exporterName || lot.exporter_name,
          warehouseId: lot.warehouseId || lot.warehouse_id || '',
          origin: lot.origin || '',
          subRegion: lot.subRegion || lot.sub_region,
          quantity: parseFloat(lot.quantity || 0),
          bags: parseInt(lot.bags || 0),
          processingMethod: lot.processingMethod || lot.processing_method || '',
          harvestSeason: lot.harvestSeason || lot.harvest_season || '',
          grade: lot.grade || '',
          qualityScore: lot.qualityScore || lot.quality_score,
          moistureContent: lot.moistureContent || lot.moisture_content,
          defectCount: lot.defectCount || lot.defect_count,
          pricePerKg: lot.pricePerKg || lot.price_per_kg,
          contractId: lot.contractId || lot.contract_id,
          status: lot.status || 'WAREHOUSED',
          warehouseReceiptDate: lot.warehouseReceiptDate || lot.warehouse_receipt_date || new Date().toISOString(),
          gradingDate: lot.gradingDate || lot.grading_date,
          assignmentDate: lot.assignmentDate || lot.assignment_date,
          releaseDate: lot.releaseDate || lot.release_date,
          rejectionReason: lot.rejectionReason || lot.rejection_reason,
        }))
      : [];

    return {
      lots,
      priceHistory: [], // TODO: Add when endpoint is available
      users: [], // TODO: Add when needed
    };
  } catch (error) {
    console.error('[ECX] Failed to load data:', error);
    return {
      lots: [],
      priceHistory: [],
      users: [],
    };
  }
};

/**
 * Calculate ECX KPI statistics
 */
export const calculateECXStats = (data: { lots: CoffeeLot[]; priceHistory: any[]; users: any[] }) => {
  const { lots } = data;
  
  // Calculate grade 1 & 2 count
  const grade1Count = lots.filter(lot => 
    lot.grade === 'Grade 1' || lot.grade === 'Grade 2'
  ).length;

  const warehoused = lots.filter(l => l.status === 'WAREHOUSED').length;
  const graded = lots.filter(l => l.status === 'GRADED').length;
  const assigned = lots.filter(l => l.status === 'ASSIGNED').length;
  const released = lots.filter(l => l.status === 'RELEASED').length;

  // Calculate average quality score
  const lotsWithScore = lots.filter(l => l.qualityScore);
  const avgQualityScore = lotsWithScore.length > 0
    ? lotsWithScore.reduce((sum, l) => sum + (l.qualityScore || 0), 0) / lotsWithScore.length
    : 0;

  return {
    lotManagement: {
      warehoused,
      graded,
      assigned,
      released,
    },
    marketPrices: {
      // TODO: Add when price data is available
    },
    gradingStandards: {
      // Static data
    },
    userManagement: {
      totalUsers: data.users.length,
      activeUsers: data.users.filter((u: any) => u.status === 'ACTIVE').length,
      admins: data.users.filter((u: any) => u.role?.includes('Admin')).length,
      inactiveUsers: data.users.filter((u: any) => u.status === 'INACTIVE').length,
    },
  };
};

/**
 * Generate ECX lot number
 */
export const generateLotNumber = (origin: string): string => {
  const code = origin.substring(0, 3).toUpperCase();
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `ECX-${code}-${year}-${seq}`;
};

/**
 * Get status color
 */
export const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
    WAREHOUSED: 'info',
    GRADED: 'primary',
    ASSIGNED: 'warning',
    RELEASED: 'success',
    REJECTED: 'error',
  };
  return statusColors[status] || 'default';
};

/**
 * Get grade color
 */
export const getGradeColor = (grade: string): 'default' | 'success' | 'primary' | 'warning' => {
  if (grade === 'Grade 1') return 'success';
  if (grade === 'Grade 2') return 'primary';
  if (grade === 'Grade 3') return 'warning';
  return 'default';
};

export default {
  loadECXData,
  calculateECXStats,
  generateLotNumber,
  getStatusColor,
  getGradeColor,
};
