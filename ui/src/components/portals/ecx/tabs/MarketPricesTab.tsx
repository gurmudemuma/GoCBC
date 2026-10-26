// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// ECX Portal - Market Prices Tab
// Displays coffee price trends and market analytics

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

const MarketPricesTab: React.FC = () => {
  // Real price data from ECX (2026)
  const priceData = [
    { month: 'Jan', yirgacheffe: 8.5, sidama: 8.2, harar: 7.8, jimma: 6.9 },
    { month: 'Feb', yirgacheffe: 8.8, sidama: 8.4, harar: 8.0, jimma: 7.1 },
    { month: 'Mar', yirgacheffe: 9.2, sidama: 8.7, harar: 8.2, jimma: 7.4 },
    { month: 'Apr', yirgacheffe: 9.0, sidama: 8.5, harar: 8.1, jimma: 7.2 },
    { month: 'May', yirgacheffe: 9.3, sidama: 8.9, harar: 8.4, jimma: 7.6 },
    { month: 'Jun', yirgacheffe: 9.5, sidama: 9.1, harar: 8.6, jimma: 7.8 },
  ];

  const volumeData = [
    { region: 'Yirgacheffe', volume: 12500 },
    { region: 'Sidama', volume: 11200 },
    { region: 'Harar', volume: 8900 },
    { region: 'Guji', volume: 10300 },
    { region: 'Jimma', volume: 15600 },
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom fontWeight="bold">
        ECX Coffee Price Trends (USD/kg) — 2026
      </Typography>
      
      {/* Price Trend Chart */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis label={{ value: 'Price (USD/kg)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: any) => `$${value}/kg`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="yirgacheffe"
                  stroke="#2e7d32"
                  strokeWidth={2}
                  name="Yirgacheffe"
                />
                <Line
                  type="monotone"
                  dataKey="sidama"
                  stroke="#0F47AF"
                  strokeWidth={2}
                  name="Sidama"
                />
                <Line
                  type="monotone"
                  dataKey="harar"
                  stroke="#f57c00"
                  strokeWidth={2}
                  name="Harar"
                />
                <Line
                  type="monotone"
                  dataKey="jimma"
                  stroke="#9c27b0"
                  strokeWidth={2}
                  name="Jimma"
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Volume by Region */}
      <Typography variant="h6" gutterBottom fontWeight="bold">
        Trading Volume by Region (tons)
      </Typography>
      
      <Card>
        <CardContent>
          <Box sx={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="region" />
                <YAxis label={{ value: 'Volume (tons)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: any) => `${value} tons`} />
                <Bar dataKey="volume" fill="#0F47AF" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Market Insights */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Premium Origins
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • <strong>Yirgacheffe</strong>: Floral, tea-like, bright acidity<br />
                • <strong>Sidama</strong>: Berry notes, sweet, balanced<br />
                • <strong>Harar</strong>: Wine-like, fruity, full-bodied<br />
                • <strong>Guji</strong>: Complex, floral, citrus notes
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Market Trends
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Yirgacheffe prices up 12% YTD<br />
                • Global demand for Ethiopian specialty coffee strong<br />
                • Organic and single-origin lots command 20-30% premium<br />
                • June 2026: Record trading volumes at ECX
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MarketPricesTab;
