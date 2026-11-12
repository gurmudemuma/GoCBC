// PortalDataGrid — the standard MUI X DataGrid.
// Unifies the per-portal grids (NBE's black/gold CBE headers, Exporter's
// per-section orange/blue tints, Customs' light-blue border-crossing
// header, Shipping's unstyled grid): one header treatment — a light
// brand tint, bold 13px headers, a brand-tinted bottom border — with
// subtle brand hover. All DataGrid props (rows, columns, getRowId,
// loading, pagination model, autoHeight, …) pass straight through, so
// this is a presentation-only swap.
import React from 'react';
import { alpha } from '@mui/material';
import { DataGrid, DataGridProps } from '@mui/x-data-grid';
import { getPortalBrand, PortalOrgKey } from './PortalBrand';

export type PortalDataGridProps = DataGridProps & { brand: PortalOrgKey };

export const PortalDataGrid: React.FC<PortalDataGridProps> = (props) => {
  const { brand, sx, pageSizeOptions, ...rest } = props;
  const b = getPortalBrand(brand);
  return (
    <DataGrid
      pageSizeOptions={pageSizeOptions ?? [10, 25, 50]}
      {...rest}
      sx={{
        border: '1px solid #e0e0e0',
        '& .MuiDataGrid-columnHeaders': {
          backgroundColor: alpha(b.primary, 0.08),
          fontWeight: 700,
          fontSize: '13px',
          borderBottom: `2px solid ${alpha(b.primary, 0.3)}`,
        },
        '& .MuiDataGrid-cell': { borderBottom: '1px solid #f0f0f0' },
        '& .MuiDataGrid-row:hover': { backgroundColor: alpha(b.primary, 0.04) },
        ...(sx as object),
      }}
    />
  );
};

export default PortalDataGrid;
