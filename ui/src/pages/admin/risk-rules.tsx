import React from 'react';
import RiskRulesManager from '@/components/admin/RiskRulesManager';
import { Box, Typography } from '@mui/material';

const RiskRulesPage: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Risk Rules Configuration</Typography>
      <RiskRulesManager />
    </Box>
  );
};

export default RiskRulesPage;
