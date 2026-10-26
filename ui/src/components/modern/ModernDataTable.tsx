// Modern Data Table Component - 2026 Design
// Enhanced table with sorting, filtering, hover effects

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  styled,
  alpha,
  Checkbox,
  IconButton,
  Tooltip,
  Box,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';

interface Column<T> {
  id: keyof T;
  label: string;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T) => React.ReactNode;
}

interface ModernDataTableProps<T> {
  /**
   * Table columns configuration
   */
  columns: Column<T>[];
  
  /**
   * Table data rows
   */
  data: T[];
  
  /**
   * Enable row selection
   * @default false
   */
  selectable?: boolean;
  
  /**
   * Selected row IDs
   */
  selectedIds?: (string | number)[];
  
  /**
   * Selection change handler
   */
  onSelectionChange?: (ids: (string | number)[]) => void;
  
  /**
   * Row click handler
   */
  onRowClick?: (row: T) => void;
  
  /**
   * Row actions menu handler
   */
  onRowAction?: (row: T) => void;
  
  /**
   * Custom brand color
   */
  brandColor?: string;
  
  /**
   * Row key field
   * @default 'id'
   */
  rowKey?: keyof T;
  
  /**
   * Enable hover effect
   * @default true
   */
  hover?: boolean;
}

const StyledTableContainer = styled(Paper)({
  borderRadius: 12,
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
});

const StyledTableHead = styled(TableHead, {
  shouldForwardProp: (prop) => prop !== 'brandColor',
})<{ brandColor?: string }>(({ theme, brandColor }) => {
  const color = brandColor || theme.palette.primary.main;
  
  return {
    background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.8)} 100%)`,
    
    '& .MuiTableCell-head': {
      color: '#ffffff',
      fontWeight: 700,
      fontSize: '0.875rem',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      borderBottom: 'none',
      padding: '16px',
      
      '& .MuiTableSortLabel-root': {
        color: '#ffffff',
        
        '&:hover': {
          color: '#ffffff',
        },
        
        '&.Mui-active': {
          color: '#ffffff',
          
          '& .MuiTableSortLabel-icon': {
            color: '#ffffff',
          },
        },
      },
    },
  };
});

const StyledTableRow = styled(TableRow, {
  shouldForwardProp: (prop) => !['brandColor', 'clickable'].includes(prop as string),
})<{ brandColor?: string; clickable?: boolean }>(({ theme, brandColor, clickable }) => {
  const color = brandColor || theme.palette.primary.main;
  
  return {
    transition: 'all 0.2s ease',
    cursor: clickable ? 'pointer' : 'default',
    
    '&:hover': {
      backgroundColor: alpha(color, 0.05),
      transform: 'scale(1.005)',
      boxShadow: `0 2px 8px ${alpha(color, 0.1)}`,
    },
    
    '&.Mui-selected': {
      backgroundColor: alpha(color, 0.1),
      
      '&:hover': {
        backgroundColor: alpha(color, 0.15),
      },
    },
  };
});

const StyledTableCell = styled(TableCell)({
  padding: '16px',
  borderBottom: '1px solid rgba(224, 224, 224, 0.4)',
});

/**
 * ModernDataTable - 2026 Data Table Component
 * 
 * Features:
 * - Sortable columns
 * - Row selection
 * - Hover effects
 * - Brand-colored header
 * - Custom cell rendering
 * 
 * @example
 * ```tsx
 * interface Application {
 *   id: string;
 *   company: string;
 *   status: string;
 *   date: string;
 * }
 * 
 * const columns: Column<Application>[] = [
 *   { id: 'company', label: 'Company', sortable: true },
 *   { 
 *     id: 'status', 
 *     label: 'Status',
 *     render: (value) => <StatusChip status={value} />
 *   },
 *   { id: 'date', label: 'Date', sortable: true },
 * ];
 * 
 * <ModernDataTable
 *   columns={columns}
 *   data={applications}
 *   brandColor="#078930"
 *   selectable
 *   onRowClick={(row) => navigate(`/app/${row.id}`)}
 * />
 * ```
 */
export function ModernDataTable<T extends Record<string, any>>({
  columns,
  data,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  onRowClick,
  onRowAction,
  brandColor,
  rowKey = 'id' as keyof T,
  hover = true,
}: ModernDataTableProps<T>) {
  const [orderBy, setOrderBy] = useState<keyof T | null>(null);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  
  const handleSort = (columnId: keyof T) => {
    const isAsc = orderBy === columnId && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(columnId);
  };
  
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return;
    
    if (event.target.checked) {
      const allIds = data.map((row) => row[rowKey]);
      onSelectionChange(allIds);
    } else {
      onSelectionChange([]);
    }
  };
  
  const handleSelectRow = (id: string | number) => {
    if (!onSelectionChange) return;
    
    const newSelectedIds = selectedIds.includes(id)
      ? selectedIds.filter((selectedId) => selectedId !== id)
      : [...selectedIds, id];
    
    onSelectionChange(newSelectedIds);
  };
  
  // Sort data
  const sortedData = React.useMemo(() => {
    if (!orderBy) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];
      
      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, orderBy, order]);
  
  return (
    <StyledTableContainer>
      <TableContainer>
        <Table>
          <StyledTableHead brandColor={brandColor}>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedIds.length > 0 && selectedIds.length < data.length}
                    checked={data.length > 0 && selectedIds.length === data.length}
                    onChange={handleSelectAll}
                    sx={{ color: '#ffffff' }}
                  />
                </TableCell>
              )}
              
              {columns.map((column) => (
                <TableCell
                  key={String(column.id)}
                  align={column.align}
                  style={{ width: column.width }}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
              
              {onRowAction && (
                <TableCell align="center" style={{ width: 60 }}>
                  Actions
                </TableCell>
              )}
            </TableRow>
          </StyledTableHead>
          
          <TableBody>
            {sortedData.map((row) => {
              const id = row[rowKey];
              const isSelected = selectedIds.includes(id);
              
              return (
                <StyledTableRow
                  key={String(id)}
                  hover={hover}
                  selected={isSelected}
                  onClick={() => onRowClick?.(row)}
                  brandColor={brandColor}
                  clickable={!!onRowClick}
                >
                  {selectable && (
                    <StyledTableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleSelectRow(id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </StyledTableCell>
                  )}
                  
                  {columns.map((column) => (
                    <StyledTableCell
                      key={String(column.id)}
                      align={column.align}
                    >
                      {column.render
                        ? column.render(row[column.id], row)
                        : row[column.id]}
                    </StyledTableCell>
                  ))}
                  
                  {onRowAction && (
                    <StyledTableCell align="center">
                      <Tooltip title="Actions">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRowAction(row);
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Tooltip>
                    </StyledTableCell>
                  )}
                </StyledTableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </StyledTableContainer>
  );
}

export default ModernDataTable;
