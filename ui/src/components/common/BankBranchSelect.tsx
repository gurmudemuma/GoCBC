// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Bank Branch Select Component - Cascading selection with bank branches

import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip,
  Box,
  Typography,
} from '@mui/material';
import { LocationOn, Phone, Email, AccountBalance } from '@mui/icons-material';
import { BankBranch, getBranchesByBankName } from '@/utils/bankBranches';

interface BankBranchSelectProps {
  bankName: string; // Selected bank name
  value: string; // Selected branch name
  onChange: (branchName: string, branch: BankBranch | null) => void;
  label?: string;
  helperText?: string;
  error?: boolean;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  showDetails?: boolean; // Show branch details in dropdown
}

const BankBranchSelect: React.FC<BankBranchSelectProps> = ({
  bankName,
  value,
  onChange,
  label = 'Select Branch',
  helperText,
  error = false,
  required = false,
  disabled = false,
  fullWidth = true,
  showDetails = true,
}) => {
  const branches = React.useMemo(() => {
    if (!bankName) return [];
    return getBranchesByBankName(bankName);
  }, [bankName]);

  const selectedBranch = React.useMemo(() => {
    return branches.find(b => b.branchName === value) || null;
  }, [branches, value]);

  const handleChange = (event: any) => {
    const branchName = event.target.value;
    const branch = branches.find(b => b.branchName === branchName) || null;
    onChange(branchName, branch);
  };

  // If no bank selected, show disabled state
  if (!bankName) {
    return (
      <FormControl fullWidth={fullWidth} disabled={true} required={required}>
        <InputLabel>{label}</InputLabel>
        <Select value="" label={label}>
          <MenuItem value="">
            <em>Please select a bank first</em>
          </MenuItem>
        </Select>
        <FormHelperText>Select a bank to view available branches</FormHelperText>
      </FormControl>
    );
  }

  // If no branches found for bank
  if (branches.length === 0) {
    return (
      <FormControl fullWidth={fullWidth} error={true} required={required}>
        <InputLabel>{label}</InputLabel>
        <Select value="" label={label} disabled>
          <MenuItem value="">
            <em>No branches available</em>
          </MenuItem>
        </Select>
        <FormHelperText error>
          No branches found for {bankName}. This bank may not process export transactions.
        </FormHelperText>
      </FormControl>
    );
  }

  return (
    <Box>
      <FormControl fullWidth={fullWidth} error={error} required={required} disabled={disabled}>
        <InputLabel>{label}</InputLabel>
        <Select
          value={value}
          onChange={handleChange}
          label={label}
          MenuProps={{
            PaperProps: {
              style: {
                maxHeight: 400,
              },
            },
          }}
        >
          <MenuItem value="">
            <em>Select a branch</em>
          </MenuItem>
          {branches.map((branch) => (
            <MenuItem key={branch.id} value={branch.branchName}>
              <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body1" fontWeight={branch.isMainBranch ? 'bold' : 'normal'}>
                    {branch.branchName}
                  </Typography>
                  {branch.isMainBranch && (
                    <Chip label="Main" size="small" color="primary" sx={{ ml: 1 }} />
                  )}
                </Box>
                {showDetails && (
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationOn sx={{ fontSize: 14 }} />
                      {branch.city} - {branch.branchCode}
                    </Typography>
                  </Box>
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
        {helperText && <FormHelperText>{helperText}</FormHelperText>}
        {!helperText && branches.length > 0 && (
          <FormHelperText>
            {branches.length} {branches.length === 1 ? 'branch' : 'branches'} available for {bankName}
          </FormHelperText>
        )}
      </FormControl>

      {/* Selected Branch Details Card */}
      {selectedBranch && showDetails && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            bgcolor: 'primary.50',
            border: '1px solid',
            borderColor: 'primary.200',
            borderRadius: 1,
          }}
        >
          <Typography variant="subtitle2" color="primary.main" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountBalance sx={{ fontSize: 18 }} />
            Selected Branch Details
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="body2">
              <strong>Branch:</strong> {selectedBranch.branchName}
              {selectedBranch.isMainBranch && (
                <Chip label="Main Branch" size="small" color="primary" sx={{ ml: 1, height: 18 }} />
              )}
            </Typography>
            
            <Typography variant="body2">
              <strong>Code:</strong> {selectedBranch.branchCode}
            </Typography>
            
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocationOn sx={{ fontSize: 16 }} />
              <strong>Location:</strong> {selectedBranch.address}, {selectedBranch.city}
            </Typography>
            
            {selectedBranch.phone && (
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Phone sx={{ fontSize: 16 }} />
                <strong>Phone:</strong> {selectedBranch.phone}
              </Typography>
            )}
            
            {selectedBranch.email && (
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Email sx={{ fontSize: 16 }} />
                <strong>Email:</strong> {selectedBranch.email}
              </Typography>
            )}
            
            {selectedBranch.isLcProcessing && (
              <Chip
                label="✓ Authorized for LC Processing"
                size="small"
                color="success"
                sx={{ mt: 1, width: 'fit-content' }}
              />
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default BankBranchSelect;
