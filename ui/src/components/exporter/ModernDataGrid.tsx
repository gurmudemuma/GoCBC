// Modern DataGrid Component with Professional Styling
// Used for displaying contracts, shipments, payments, etc.

import React from 'react';
import { DataGrid, GridColDef, GridRowsProp } from '@mui/x-data-grid';
import { Box } from '@mui/material';

interface ModernDataGridProps {
  rows: GridRowsProp;
  columns: GridColDef[];
  loading?: boolean;
  pageSize?: number;
  onRowClick?: (params: any) => void;
  checkboxSelection?: boolean;
  autoHeight?: boolean;
}

export const ModernDataGrid: React.FC<ModernDataGridProps> = ({
  rows,
  columns,
  loading = false,
  pageSize = 10,
  onRowClick,
  checkboxSelection = false,
  autoHeight = true,
}) => {
  return (
    <Box sx={{ width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={pageSize}
        rowsPerPageOptions={[5, 10, 25, 50]}
        loading={loading}
        disableSelectionOnClick
        checkboxSelection={checkboxSelection}
        autoHeight={autoHeight}
        onRowClick={onRowClick}
        sx={{
          border: 'none',
          bgcolor: 'white',
          borderRadius: 2,
          '& .MuiDataGrid-cell': {
            borderColor: '#F3F4F6',
            py: 2,
            fontSize: '0.875rem',
          },
          '& .MuiDataGrid-columnHeaders': {
            bgcolor: '#F9FAFB',
            borderColor: '#E5E7EB',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#374151',
            borderRadius: '8px 8px 0 0',
          },
          '& .MuiDataGrid-row': {
            '&:hover': {
              bgcolor: '#F9FAFB',
              cursor: onRowClick ? 'pointer' : 'default',
            },
            '&:last-child .MuiDataGrid-cell': {
              borderBottom: 'none',
            },
          },
          '& .MuiDataGrid-footerContainer': {
            borderColor: '#E5E7EB',
            bgcolor: '#F9FAFB',
            borderRadius: '0 0 8px 8px',
          },
          '& .MuiDataGrid-cell:focus': {
            outline: 'none',
          },
          '& .MuiDataGrid-cell:focus-within': {
            outline: 'none',
          },
          '& .MuiDataGrid-columnHeader:focus': {
            outline: 'none',
          },
          '& .MuiDataGrid-columnHeader:focus-within': {
            outline: 'none',
          },
          '& .MuiCheckbox-root': {
            color: '#7C3AED',
          },
          '& .MuiDataGrid-columnSeparator': {
            visibility: 'hidden',
          },
        }}
      />
    </Box>
  );
};

export default ModernDataGrid;
