// Search Bar Component - 2026 Design
// Advanced search with autocomplete

import React, { useState } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  styled,
  alpha,
  Autocomplete,
  Box,
  Typography,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

interface SearchBarProps {
  /**
   * Search value
   */
  value: string;
  
  /**
   * Change handler
   */
  onChange: (value: string) => void;
  
  /**
   * Placeholder text
   */
  placeholder?: string;
  
  /**
   * Autocomplete suggestions
   */
  suggestions?: string[];
  
  /**
   * Custom brand color
   */
  brandColor?: string;
  
  /**
   * Show clear button
   * @default true
   */
  showClear?: boolean;
  
  /**
   * Debounce delay in ms
   * @default 300
   */
  debounce?: number;
}

const StyledTextField = styled(TextField, {
  shouldForwardProp: (prop) => prop !== 'brandColor',
})<{ brandColor?: string }>(({ theme, brandColor }) => {
  const color = brandColor || theme.palette.primary.main;
  
  return {
    '& .MuiOutlinedInput-root': {
      backgroundColor: alpha(theme.palette.background.paper, 0.8),
      backdropFilter: 'blur(10px)',
      borderRadius: 12,
      transition: 'all 0.3s ease',
      
      '&:hover': {
        backgroundColor: theme.palette.background.paper,
        
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: alpha(color, 0.3),
        },
      },
      
      '&.Mui-focused': {
        backgroundColor: theme.palette.background.paper,
        boxShadow: `0 0 0 3px ${alpha(color, 0.1)}`,
        
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: color,
          borderWidth: 2,
        },
      },
    },
    
    '& .MuiInputAdornment-root svg': {
      color: color,
    },
  };
});

/**
 * SearchBar - 2026 Search Component
 * 
 * Features:
 * - Glassmorphism design
 * - Autocomplete suggestions
 * - Clear button
 * - Brand-colored focus state
 * 
 * @example
 * ```tsx
 * // Basic search
 * <SearchBar
 *   value={searchTerm}
 *   onChange={setSearchTerm}
 *   placeholder="Search applications..."
 *   brandColor="#078930"
 * />
 * 
 * // With autocomplete
 * <SearchBar
 *   value={searchTerm}
 *   onChange={setSearchTerm}
 *   suggestions={['Coffee Beans', 'Green Coffee', 'Roasted Coffee']}
 *   brandColor="#0F47AF"
 * />
 * ```
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  suggestions,
  brandColor,
  showClear = true,
  debounce = 300,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  
  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    
    // Clear existing timer
    if (timer) {
      clearTimeout(timer);
    }
    
    // Set new timer for debounced update
    const newTimer = setTimeout(() => {
      onChange(newValue);
    }, debounce);
    
    setTimer(newTimer);
  };
  
  const handleClear = () => {
    setLocalValue('');
    onChange('');
    if (timer) {
      clearTimeout(timer);
    }
  };
  
  // With autocomplete
  if (suggestions && suggestions.length > 0) {
    return (
      <Autocomplete
        freeSolo
        options={suggestions}
        value={localValue}
        onInputChange={(_, newValue) => handleChange(newValue)}
        renderInput={(params) => (
          <StyledTextField
            {...params}
            brandColor={brandColor}
            placeholder={placeholder}
            fullWidth
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <>
                  {showClear && localValue && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={handleClear}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => (
          <Box component="li" {...props}>
            <SearchIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
            <Typography>{option}</Typography>
          </Box>
        )}
      />
    );
  }
  
  // Basic search
  return (
    <StyledTextField
      brandColor={brandColor}
      placeholder={placeholder}
      value={localValue}
      onChange={(e) => handleChange(e.target.value)}
      fullWidth
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
        endAdornment: showClear && localValue && (
          <InputAdornment position="end">
            <IconButton size="small" onClick={handleClear}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
};

export default SearchBar;
