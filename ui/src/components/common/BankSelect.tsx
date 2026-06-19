// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// Bank Select Component - Reusable bank dropdown with grouping

import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListSubheader,
  FormHelperText,
} from '@mui/material';
import { BANK_GROUPS, Bank, getEthiopianBanks, getInternationalBanks } from '@/utils/banks';

interface BankSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  helperText?: string;
  error?: boolean;
  required?: boolean;
  disabled?: boolean;
  type?: 'all' | 'ethiopian' | 'international';
  excludeBank?: string; // Exclude a specific bank (useful for ensuring different banks)
  fullWidth?: boolean;
}

const BankSelect: React.FC<BankSelectProps> = ({
  value,
  onChange,
  label = 'Select Bank',
  helperText,
  error = false,
  required = false,
  disabled = false,
  type = 'all',
  excludeBank,
  fullWidth = true,
}) => {
  const handleChange = (event: any) => {
    onChange(event.target.value);
  };

  const renderBankGroups = () => {
    const items: JSX.Element[] = [];

    if (type === 'all' || type === 'ethiopian') {
      // Ethiopian Banks
      items.push(
        <ListSubheader key="ethiopian-header" sx={{ bgcolor: 'primary.main', color: 'white', fontWeight: 'bold' }}>
          🇪🇹 Ethiopian Banks
        </ListSubheader>
      );
      BANK_GROUPS.ethiopian.banks.forEach((bank) => {
        if (!excludeBank || bank.name !== excludeBank) {
          items.push(
            <MenuItem key={bank.id} value={bank.name} sx={{ pl: 4 }}>
              {bank.name} {bank.swiftCode && `(${bank.swiftCode})`}
            </MenuItem>
          );
        }
      });
    }

    if (type === 'all' || type === 'international') {
      // International Banks by Region
      const regions = [
        { key: 'us', icon: '🇺🇸' },
        { key: 'uk', icon: '🇬🇧' },
        { key: 'eu', icon: '🇪🇺' },
        { key: 'asia', icon: '🌏' },
        { key: 'middle_east', icon: '🕌' },
        { key: 'africa', icon: '🌍' },
      ];

      regions.forEach(({ key, icon }) => {
        const group = BANK_GROUPS[key as keyof typeof BANK_GROUPS];
        if (group && group.banks.length > 0) {
          items.push(
            <ListSubheader key={`${key}-header`} sx={{ bgcolor: 'secondary.main', color: 'white', fontWeight: 'bold' }}>
              {icon} {group.label}
            </ListSubheader>
          );
          group.banks.forEach((bank) => {
            if (!excludeBank || bank.name !== excludeBank) {
              items.push(
                <MenuItem key={bank.id} value={bank.name} sx={{ pl: 4 }}>
                  {bank.name} {bank.swiftCode && `(${bank.swiftCode})`}
                </MenuItem>
              );
            }
          });
        }
      });
    }

    return items;
  };

  return (
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
          <em>Select a bank</em>
        </MenuItem>
        {renderBankGroups()}
      </Select>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
};

export default BankSelect;
