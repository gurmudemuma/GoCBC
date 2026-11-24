// Filter Panel Component - 2026 Design
// Multi-criteria filter component

import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  styled,
  alpha,
  SelectChangeEvent,
} from '@mui/material';
import { ModernCard } from './ModernCard';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  options: FilterOption[];
  multiple?: boolean;
}

interface FilterPanelProps {
  /**
   * Filter configurations
   */
  filters: FilterConfig[];
  
  /**
   * Current filter values
   */
  values: Record<string, string | string[]>;
  
  /**
   * Change handler
   */
  onChange: (filterId: string, value: string | string[]) => void;
  
  /**
   * Custom brand color
   */
  brandColor?: string;
}

const StyledFormControl = styled(FormControl, {
  shouldForwardProp: (prop) => prop !== 'brandColor',
})<{ brandColor?: string }>(({ theme, brandColor }) => {
  const color = brandColor || theme.palette.primary.main;
  
  return {
    '& .MuiOutlinedInput-root': {
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: color,
      },
    },
    
    '& .MuiInputLabel-root.Mui-focused': {
      color: color,
    },
  };
});

/**
 * FilterPanel - 2026 Filter Component
 * 
 * Multi-criteria filtering with dropdowns
 * 
 * @example
 * ```tsx
 * const filters: FilterConfig[] = [
 *   {
 *     id: 'status',
 *     label: 'Status',
 *     options: [
 *       { label: 'Approved', value: 'approved' },
 *       { label: 'Pending', value: 'pending' },
 *     ],
 *   },
 *   {
 *     id: 'type',
 *     label: 'Type',
 *     options: [
 *       { label: 'Arabica', value: 'arabica' },
 *       { label: 'Robusta', value: 'robusta' },
 *     ],
 *     multiple: true,
 *   },
 * ];
 * 
 * const [filterValues, setFilterValues] = useState({});
 * 
 * <FilterPanel
 *   filters={filters}
 *   values={filterValues}
 *   onChange={(id, value) => 
 *     setFilterValues({ ...filterValues, [id]: value })
 *   }
 *   brandColor="#078930"
 * />
 * ```
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  values,
  onChange,
  brandColor,
}) => {
  const handleChange = (filterId: string, event: SelectChangeEvent<string | string[]>) => {
    onChange(filterId, event.target.value);
  };
  
  return (
    <ModernCard brandColor={brandColor} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {filters.map((filter) => (
          <StyledFormControl
            key={filter.id}
            brandColor={brandColor}
            sx={{ minWidth: 200, flex: 1 }}
          >
            <InputLabel>{filter.label}</InputLabel>
            <Select
              value={values[filter.id] || (filter.multiple ? [] : '')}
              onChange={(e) => handleChange(filter.id, e)}
              label={filter.label}
              multiple={filter.multiple}
              renderValue={(selected) => {
                if (filter.multiple && Array.isArray(selected)) {
                  return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const option = filter.options.find((opt) => opt.value === value);
                        return (
                          <Chip
                            key={value}
                            label={option?.label || value}
                            size="small"
                            sx={{
                              backgroundColor: alpha(brandColor || '#000', 0.1),
                            }}
                          />
                        );
                      })}
                    </Box>
                  );
                }
                
                const option = filter.options.find((opt) => opt.value === selected);
                return option?.label || selected;
              }}
            >
              {filter.options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </StyledFormControl>
        ))}
      </Box>
    </ModernCard>
  );
};

export default FilterPanel;
