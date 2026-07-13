// Payment Method Tab with Integrated Dropdown Menu
import React, { useState } from 'react';
import {
  Box,
  Menu,
  MenuItem,
  Chip,
  Typography,
  ButtonBase,
} from '@mui/material';
import {
  Payment,
  Description,
  LocalShipping,
  AttachMoney,
  Assignment,
  ArrowDropDown,
} from '@mui/icons-material';

interface PaymentMethodTabProps {
  selectedMethod: string;
  onMethodChange: (method: string) => void;
}

export const PaymentMethodTab: React.FC<PaymentMethodTabProps> = ({
  selectedMethod,
  onMethodChange,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const paymentMethods = [
    {
      id: 'LC',
      name: 'Letter of Credit',
      shortName: 'LC',
      icon: <Description sx={{ fontSize: 18 }} />,
      description: 'Bank-guaranteed payment (UCP 600)',
      color: '#1976d2',
      riskLevel: 'LOW',
      recommended: true,
    },
    {
      id: 'CAD',
      name: 'Documentary Collection',
      shortName: 'CAD',
      icon: <LocalShipping sx={{ fontSize: 18 }} />,
      description: 'Cash Against Documents (D/P or D/A)',
      color: '#ed6c02',
      riskLevel: 'MEDIUM',
    },
    {
      id: 'ADVANCE',
      name: 'Advance Payment',
      shortName: 'Advance',
      icon: <AttachMoney sx={{ fontSize: 18 }} />,
      description: 'Payment before shipment (TT Advance)',
      color: '#2e7d32',
      riskLevel: 'LOW',
    },
    {
      id: 'CONSIGNMENT',
      name: 'Consignment',
      shortName: 'Consignment',
      icon: <Assignment sx={{ fontSize: 18 }} />,
      description: 'Limited to Fruits, Flowers, Meat',
      color: '#9c27b0',
      riskLevel: 'HIGH',
    },
  ];

  const currentMethod = paymentMethods.find(m => m.id === selectedMethod) || paymentMethods[0];

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (methodId: string) => {
    onMethodChange(methodId);
    handleClose();
  };

  return (
    <Box component="div" sx={{ display: 'inline-flex' }}>
      <ButtonBase
        onClick={handleOpen}
        onMouseEnter={handleOpen}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1.5,
          borderRadius: '4px 4px 0 0',
          minHeight: 48,
          color: open ? 'primary.main' : 'text.primary',
          borderBottom: open ? '2px solid' : '2px solid transparent',
          borderColor: 'primary.main',
          transition: 'all 0.2s',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        }}
      >
        <Payment sx={{ fontSize: 20 }} />
        <Typography sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
          {currentMethod.shortName}
        </Typography>
        <ArrowDropDown sx={{ fontSize: 20, ml: -0.5 }} />
      </ButtonBase>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          onMouseLeave: handleClose,
          sx: { py: 0.5 },
        }}
        PaperProps={{
          sx: {
            minWidth: 380,
            mt: 0.5,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        {paymentMethods.map((method) => (
          <MenuItem
            key={method.id}
            onClick={() => handleSelect(method.id)}
            selected={method.id === selectedMethod}
            sx={{
              py: 1.5,
              px: 2,
              borderLeft: method.id === selectedMethod ? `4px solid ${method.color}` : '4px solid transparent',
              '&.Mui-selected': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.08)',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
              <Box sx={{ color: method.color, display: 'flex' }}>{method.icon}</Box>
              <Box sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {method.name}
                  </Typography>
                  {method.recommended && (
                    <Chip 
                      label="Recommended" 
                      size="small" 
                      color="success" 
                      sx={{ height: 18, fontSize: '0.65rem' }}
                    />
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                  {method.description}
                </Typography>
              </Box>
              <Chip 
                label={method.riskLevel}
                size="small"
                sx={{
                  bgcolor: method.riskLevel === 'LOW' ? '#4caf50' : 
                           method.riskLevel === 'MEDIUM' ? '#ff9800' : '#f44336',
                  color: 'white',
                  fontSize: '0.65rem',
                  height: 20,
                  fontWeight: 600,
                }}
              />
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};
