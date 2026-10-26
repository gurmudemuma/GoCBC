// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// ECX Portal - Lot Management Tab
// Handles coffee lot registration, grading, assignment, and release

import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Add,
  Science,
  Assignment,
  LocalShipping,
  Visibility,
  Refresh,
} from '@mui/icons-material';
import { CoffeeLot } from '../utils/dataLoader';
import { getStatusColor, getGradeColor } from '../utils/dataLoader';

interface LotManagementTabProps {
  lots: CoffeeLot[];
  loading?: boolean;
  onRefresh: () => void;
  onRegisterIntake: () => void;
  onGrade: (lot: CoffeeLot) => void;
  onAssign: (lot: CoffeeLot) => void;
  onRelease: (lot: CoffeeLot) => void;
  onViewDetails: (lot: CoffeeLot) => void;
}

const LotManagementTab: React.FC<LotManagementTabProps> = ({
  lots,
  loading = false,
  onRefresh,
  onRegisterIntake,
  onGrade,
  onAssign,
  onRelease,
  onViewDetails,
}) => {
  
  const getNextActionButton = (lot: CoffeeLot) => {
    switch (lot.status) {
      case 'WAREHOUSED':
        return (
          <Tooltip title="Assign Grade">
            <IconButton
              size="small"
              onClick={() => onGrade(lot)}
              sx={{ color: '#0F47AF' }}
            >
              <Science fontSize="small" />
            </IconButton>
          </Tooltip>
        );
      case 'GRADED':
        return (
          <Tooltip title="Assign to Contract">
            <IconButton
              size="small"
              onClick={() => onAssign(lot)}
              sx={{ color: '#f57c00' }}
            >
              <Assignment fontSize="small" />
            </IconButton>
          </Tooltip>
        );
      case 'ASSIGNED':
        return (
          <Tooltip title="Release for Export">
            <IconButton
              size="small"
              onClick={() => onRelease(lot)}
              sx={{ color: '#4caf50' }}
            >
              <LocalShipping fontSize="small" />
            </IconButton>
          </Tooltip>
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Process Steps Banner */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight="bold" gutterBottom>
          ECX Coffee Lot Lifecycle (4 Steps)
        </Typography>
        <Box display="flex" gap={2} flexWrap="wrap">
          {[
            { n: 1, label: 'Warehouse Intake', desc: 'Exporter delivers → Warehouse Receipt issued' },
            { n: 2, label: 'ECX Grading', desc: 'Quality inspection → Grade 1-5 assigned' },
            { n: 3, label: 'Lot Assignment', desc: 'Link to sales contract + set price' },
            { n: 4, label: 'Lot Release', desc: 'After clearance → Release for shipping' },
          ].map(s => (
            <Box
              key={s.n}
              sx={{
                flex: '1 1 200px',
                p: 1,
                bgcolor: 'background.paper',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" fontWeight="bold" color="primary">
                Step {s.n}: {s.label}
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                {s.desc}
              </Typography>
            </Box>
          ))}
        </Box>
      </Alert>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onRegisterIntake}
          sx={{ bgcolor: '#0F47AF' }}
        >
          Register Intake
        </Button>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={onRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Lots Table */}
      {lots.length === 0 && !loading ? (
        <Alert severity="info">
          No lots registered yet. Use "Register Intake" when an exporter delivers coffee to an ECX warehouse.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ bgcolor: '#0F47AF' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ECX Lot #</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Exporter</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Origin</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Quantity (kg)</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Processing</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Grade</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Moisture %</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Quality Score</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Contract ID</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lots.map((lot) => (
                <TableRow key={lot.lotId} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {lot.ecxLotNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{lot.exporterName || lot.exporterId}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {lot.origin}
                      {lot.subRegion && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {lot.subRegion}
                        </Typography>
                      )}
                    </Typography>
                  </TableCell>
                  <TableCell>{lot.quantity.toLocaleString()}</TableCell>
                  <TableCell>{lot.processingMethod}</TableCell>
                  <TableCell>
                    {lot.grade ? (
                      <Chip
                        label={lot.grade}
                        size="small"
                        color={getGradeColor(lot.grade)}
                      />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{lot.moistureContent != null ? `${lot.moistureContent}%` : '—'}</TableCell>
                  <TableCell>{lot.qualityScore ?? '—'}</TableCell>
                  <TableCell sx={{ fontSize: 11 }}>{lot.contractId || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={lot.status}
                      size="small"
                      color={getStatusColor(lot.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => onViewDetails(lot)}
                          sx={{ color: '#666' }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {getNextActionButton(lot)}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default LotManagementTab;
