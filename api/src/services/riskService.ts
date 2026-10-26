import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

export interface RiskRules {
  highValueThreshold: number;
  hsPrefixesMedium: string[];
  defaultRiskLevel?: string;
}

class RiskService {
  private static instance: RiskService;
  private rulesPath: string;
  private rules: RiskRules;

  private constructor() {
    this.rulesPath = process.env.RISK_RULES_PATH || path.join(__dirname, '..', 'config', 'riskRules.json');
    this.rules = { highValueThreshold: 50000, hsPrefixesMedium: ['07','08','09'], defaultRiskLevel: 'LOW' };
    this.loadRules();
  }

  public static getInstance(): RiskService {
    if (!RiskService.instance) {
      RiskService.instance = new RiskService();
    }
    return RiskService.instance;
  }

  public getRules(): RiskRules {
    return this.rules;
  }

  public setRules(newRules: Partial<RiskRules>) {
    this.rules = { ...this.rules, ...newRules };
    try {
      fs.writeFileSync(this.rulesPath, JSON.stringify(this.rules, null, 2), 'utf-8');
      logger.info('[RiskService] Rules updated and persisted');
    } catch (err) {
      logger.error('[RiskService] Failed to persist rules:', err);
    }
  }

  private loadRules() {
    try {
      if (fs.existsSync(this.rulesPath)) {
        const raw = fs.readFileSync(this.rulesPath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.rules = { ...this.rules, ...parsed };
        logger.info('[RiskService] Loaded rules from ' + this.rulesPath);
      } else {
        // Ensure directory exists
        const dir = path.dirname(this.rulesPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(this.rulesPath, JSON.stringify(this.rules, null, 2), 'utf-8');
        logger.info('[RiskService] Created default rules file at ' + this.rulesPath);
      }
    } catch (err) {
      logger.error('[RiskService] Error loading rules, using defaults:', err);
    }
  }
}

export default RiskService.getInstance();
