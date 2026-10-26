/**
 * Payment Method Selector Component
 * CECBS - Ethiopian Coffee Export Consortium Blockchain System
 * 
 * Allows users to select payment method with risk indicators and metadata
 * Added: June 26, 2026 - Payment Method Differentiation
 */

import React from 'react';
import { Box, Card, CardContent, FormControl, FormControlLabel, Radio, RadioGroup, Typography, Chip, Grid } from '@mui/material';
import { 
  Shield as ShieldIcon, 
  Warning as WarningIcon, 
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  AccountBalance as BankIcon,
  Description as DocumentIcon,
  TrendingUp as RiskIcon
} from '@mui/icons-material';

export type PaymentMethodType = 'LC' | 'CAD' | 'TT_ADVANCE' | 'TT_POST' | 'ADVANCE';

interface PaymentMethodInfo {
  id: PaymentMethodType;
  name: string;
  description: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  bankGuarantee: boolean;
  cost: 'LOW' | 'MEDIUM' | 'HIGH';
  timeline: string;
  documentControl: 'BANK' | 'DIRECT';
  compliance: string[];
  prerequisites: string[];
  bestFor: string;
  warning?: string;
}

const PAYMENT_METHODS: PaymentMethodInfo[] = [
  {
    id: 'LC',
    name: 'Letter of Credit (LC)',
    description: 'Bank-guaranteed payment with UCP 600 compliance',
    riskLevel: 'LOW',
    bankGuarantee: true,
    cost: 'HIGH',
    timeline: '7-14 days',
    documentControl: 'BANK',
    compliance: ['UCP 600', 'NBE', 'SWIFT'],
    prerequisites: ['Issued LC Required', 'Bank Verification'],
    bestFor: 'First-time buyers, high-value contracts',
    warning: undefined,
  },
  {
    id: 'CAD',
    name: 'Cash Against Documents (CAD)',
    description: 'Documents released only after buyer payment',
    riskLevel: 'MEDIUM',
    bankGuarantee: false,
    cost: 'MEDIUM',
    timeline: '5-10 days',
    documentControl: 'BANK',
    compliance: ['URC 522', 'NBE'],
    prerequisites: ['Completed Shipment', 'Bill of Lading'],
    bestFor: 'Established relationships',
    warning: 'No bank guarantee - documents held until payment',
  },
  {
    id: 'TT_ADVANCE',
    name: 'Telegraphic Transfer - Advance',
    description: 'Payment received before shipment (30-100% upfront)',
    riskLevel: 'LOW',
    bankGuarantee: false,
    cost: 'LOW',
    timeline: '1-3 days',
    documentControl: 'DIRECT',
    compliance: ['NBE', 'SWIFT'],
    prerequisites: ['None'],
    bestFor: 'Trusted partners, immediate cash flow',
    warning: undefined,
  },
  {
    id: 'TT_POST',
    name: 'Telegraphic Transfer - Post-shipment',
    description: 'Payment after buyer receives goods',
    riskLevel: 'HIGH',
    bankGuarantee: false,
    cost: 'LOW',
    timeline: '7-30 days',
    documentControl: 'DIRECT',
    compliance: ['NBE'],
    prerequisites: ['Strong Buyer Trust'],
    bestFor: 'Long-term trusted partners only',
    warning: '⚠️ HIGHEST RISK - Ship before payment',
  },
  {
    id: 'ADVANCE',
    name: 'Advance Payment',
    description: 'Payment before production/sourcing (30-100%)',
    riskLevel: 'LOW',
    bankGuarantee: false,
    cost: 'LOW',
    timeline: 'Immediate',
    documentControl: 'DIRECT',
    compliance: ['NBE'],
    prerequisites: ['None'],
    bestFor: 'First orders, small amounts, working capital',
    warning: undefined,
  },
];

interface PaymentMethodSelectorProps {
  value: PaymentMethodType;
  onChange: (method: PaymentMethodType) => void;
  disabled?: boolean;
  showDetails?: boolean;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  showDetails = true,
}) => {
  const selectedMethod = PAYMENT_METHODS.find(m => m.id === value);

  const getRiskColor = (risk: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (risk) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'warning';
      case 'HIGH': return 'error';
    }
  };

  const getCostColor = (cost: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (cost) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'warning';
      case 'HIGH': return 'error';
    }
  };

  return (
    <Box>
      <FormControl component="fieldset" fullWidth disabled={disabled}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MoneyIcon />
          Select Payment Method
        </Typography>
        
        <RadioGroup
          value={value}
          onChange={(e) => onChange(e.target.value as PaymentMethodType)}
        >
          <Grid container spacing={2}>
            {PAYMENT_METHODS.map((method) => (
              <Grid item xs={12} key={method.id}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    border: value === method.id ? 2 : 1,
                    borderColor: value === method.id ? 'primary.main' : 'divider',
                    '&:hover': {
                      borderColor: disabled ? 'divider' : 'primary.main',
                      boxShadow: disabled ? 0 : 2,
                    },
                  }}
                  onClick={() => !disabled && onChange(method.id)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <FormControlLabel
                        value={method.id}
                        control={<Radio />}
                        label=""
                        sx={{ margin: 0 }}
                      />
                      
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {method.name}
                          </Typography>
                          
                          {method.bankGuarantee && (
                            <Chip 
                              icon={<ShieldIcon />} 
                              label="Bank Guaranteed" 
                              color="success" 
                              size="small" 
                            />
                          )}
                          
                          <Chip 
                            icon={<RiskIcon />}
                            label={`${method.riskLevel} Risk`} 
                            color={getRiskColor(method.riskLevel)} 
                            size="small" 
                          />
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {method.description}
                        </Typography>
                        
                        {method.warning && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, p: 1, bgcolor: 'warning.light', borderRadius: 1 }}>
                            <WarningIcon color="warning" fontSize="small" />
                            <Typography variant="caption" color="warning.dark">
                              {method.warning}
                            </Typography>
                          </Box>
                        )}
                        
                        <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <MoneyIcon fontSize="small" color="action" />
                            <Typography variant="caption" component="span">
                              Cost: 
                            </Typography>
                            <Chip label={method.cost} size="small" color={getCostColor(method.cost)} />
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <ScheduleIcon fontSize="small" color="action" />
                            <Typography variant="caption">
                              {method.timeline}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <DocumentIcon fontSize="small" color="action" />
                            <Typography variant="caption">
                              {method.documentControl === 'BANK' ? 'Bank Controls Docs' : 'Direct to Buyer'}
                            </Typography>
                          </Box>
                        </Box>
                        
                        {showDetails && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                              <strong>Best for:</strong> {method.bestFor}
                            </Typography>
                            
                            {method.prerequisites.length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                  <strong>Prerequisites:</strong> {method.prerequisites.join(', ')}
                                </Typography>
                              </Box>
                            )}
                            
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                <strong>Compliance:</strong> {method.compliance.join(', ')}
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </RadioGroup>
      </FormControl>
      
      {selectedMethod && showDetails && (
        <Card sx={{ mt: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Selected: {selectedMethod.name}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <RiskIcon sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="body2">Risk Level</Typography>
                  <Typography variant="h6">{selectedMethod.riskLevel}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <BankIcon sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="body2">Bank Guarantee</Typography>
                  <Typography variant="h6">{selectedMethod.bankGuarantee ? 'YES' : 'NO'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <MoneyIcon sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="body2">Cost</Typography>
                  <Typography variant="h6">{selectedMethod.cost}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <ScheduleIcon sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="body2">Timeline</Typography>
                  <Typography variant="h6">{selectedMethod.timeline}</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default PaymentMethodSelector;
export { PAYMENT_METHODS };
export type { PaymentMethodInfo };
