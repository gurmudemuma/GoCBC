// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// ECX Portal - Grading Standards Tab
// Displays ECX coffee grading criteria and quality standards

import React from 'react';
import {
  Box,
  Typography,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';

const GradingStandardsTab: React.FC = () => {
  const gradingStandards = [
    { grade: 'Grade 1', defects: '0-3', score: '≥85', moisture: '≤12%', eligible: true, description: 'Specialty grade - flawless, exceptional quality' },
    { grade: 'Grade 2', defects: '4-12', score: '80-84', moisture: '≤12%', eligible: true, description: 'Premium grade - very good quality' },
    { grade: 'Grade 3', defects: '13-25', score: '75-79', moisture: '≤12%', eligible: true, description: 'Exchange grade - good commercial quality' },
    { grade: 'Grade 4', defects: '26-45', score: '70-74', moisture: '≤12%', eligible: false, description: 'Standard grade - acceptable for local market' },
    { grade: 'Grade 5', defects: '>45', score: '<70', moisture: '>12%', eligible: false, description: 'Below standard - not suitable for export' },
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom fontWeight="bold">
        Ethiopian Coffee Grading Standards (ECTA/ECX)
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        ECX grading is based on <strong>SCA (Specialty Coffee Association)</strong> standards. 
        All lots must have <strong>≤12% moisture content</strong> for export eligibility. 
        Grades 1-3 qualify for international export, while Grades 4-5 are restricted to domestic market.
      </Alert>

      {/* Grading Standards Table */}
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#0F47AF' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Grade</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Defects (per 300g)</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>SCA Score</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Moisture</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Export Eligible</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {gradingStandards.map((standard) => (
              <TableRow key={standard.grade} hover>
                <TableCell>
                  <Chip
                    label={standard.grade}
                    size="small"
                    color={standard.eligible ? 'success' : 'error'}
                  />
                </TableCell>
                <TableCell>{standard.defects}</TableCell>
                <TableCell>{standard.score}</TableCell>
                <TableCell>{standard.moisture}</TableCell>
                <TableCell>
                  {standard.eligible ? (
                    <CheckCircle sx={{ color: '#4caf50' }} />
                  ) : (
                    <Cancel sx={{ color: '#d32f2f' }} />
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{standard.description}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Quality Criteria */}
      <Typography variant="h6" gutterBottom fontWeight="bold">
        Quality Assessment Criteria
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Physical Inspection
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • <strong>Defect Count</strong>: Primary, secondary defects per 300g sample<br />
                • <strong>Moisture Content</strong>: Must be ≤12% for export<br />
                • <strong>Bean Size</strong>: Screen size uniformity<br />
                • <strong>Color</strong>: Consistency and processing quality<br />
                • <strong>Foreign Matter</strong>: Stones, sticks, damaged beans
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Sensory Evaluation (Cupping)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • <strong>Aroma</strong>: Fragrance intensity and quality<br />
                • <strong>Flavor</strong>: Taste profile and complexity<br />
                • <strong>Acidity</strong>: Brightness and balance<br />
                • <strong>Body</strong>: Mouthfeel and texture<br />
                • <strong>Aftertaste</strong>: Finish and length
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Processing Methods
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • <strong>Washed</strong>: Clean, bright, floral notes<br />
                • <strong>Natural</strong>: Fruity, wine-like, full body<br />
                • <strong>Honey</strong>: Sweet, balanced, complex<br />
                • <strong>Pulped Natural</strong>: Semi-washed process<br />
                • Each method affects flavor profile
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Export Requirements */}
      <Alert severity="success" icon={<CheckCircle />} sx={{ mt: 3 }}>
        <Typography variant="body2" fontWeight="bold" gutterBottom>
          Export Requirements Summary
        </Typography>
        <Typography variant="body2">
          • Only <strong>Grade 1, 2, and 3</strong> coffee can be exported<br />
          • Moisture content must be <strong>≤12%</strong><br />
          • Must pass both physical inspection and sensory evaluation<br />
          • Traceability to origin (woreda/kebele) required<br />
          • ECX certificate and warehouse receipt mandatory
        </Typography>
      </Alert>
    </Box>
  );
};

export default GradingStandardsTab;
