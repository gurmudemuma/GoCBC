// Professional Chart Component with Gradient
// Used in Exporter Portal for activity trends

import React from 'react';
import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import { TrendingUp } from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { EmptyState } from '@/components/common/EmptyState';

interface ChartDataPoint {
  month: string;
  value: number;
  volume?: number;
}

interface ProfessionalChartProps {
  data: ChartDataPoint[];
  title?: string;
  subtitle?: string;
  primaryColor?: string;
  showVolume?: boolean;
}

export const ProfessionalChart: React.FC<ProfessionalChartProps> = ({
  data,
  title = 'Export Activity Trends',
  subtitle = 'Contract value and volume over time',
  primaryColor = '#9b30b7', // Login page purple
  showVolume = false,
}) => {
  const hasData = data && data.length > 0;

  return (
    <Card sx={{ mb: 3, boxShadow: 2 }}>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h6" fontWeight="600" gutterBottom>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            <Chip
              label="Value"
              size="small"
              sx={{ bgcolor: primaryColor, color: 'white', fontWeight: 600 }}
            />
            {showVolume && (
              <Chip
                label="Volume"
                size="small"
                variant="outlined"
                sx={{ borderColor: primaryColor, color: primaryColor }}
              />
            )}
          </Box>
        </Box>

        {/* Chart or Empty State */}
        {hasData ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              {/* Gradient Definition */}
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={primaryColor} stopOpacity={0.05} />
                </linearGradient>
              </defs>

              {/* Grid */}
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E5E7EB"
                vertical={false}
              />

              {/* Axes */}
              <XAxis
                dataKey="month"
                stroke="#6B7280"
                style={{ fontSize: '12px', fontWeight: 500 }}
                tickMargin={10}
              />
              <YAxis
                stroke="#6B7280"
                style={{ fontSize: '12px', fontWeight: 500 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              />

              {/* Tooltip */}
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  padding: '12px',
                }}
                labelStyle={{
                  fontWeight: 600,
                  color: '#111827',
                  marginBottom: '4px',
                }}
                formatter={(value: any) => [`$${value.toLocaleString()}`, 'Value']}
              />

              {/* Line */}
              <Line
                type="monotone"
                dataKey="value"
                stroke={primaryColor}
                strokeWidth={3}
                fill="url(#colorValue)"
                dot={{
                  fill: primaryColor,
                  r: 5,
                  strokeWidth: 2,
                  stroke: 'white',
                }}
                activeDot={{
                  r: 7,
                  strokeWidth: 2,
                  stroke: 'white',
                  fill: primaryColor,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            icon={<TrendingUp />}
            title="No Data Yet"
            description="Your export activity chart will appear here once you create contracts and complete transactions. Start by creating your first contract."
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ProfessionalChart;
