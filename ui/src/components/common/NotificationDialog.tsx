// Professional Notification Dialog Component
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Info,
} from '@mui/icons-material';

interface NotificationDialogProps {
  open: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  details?: string;
}

export const NotificationDialog: React.FC<NotificationDialogProps> = ({
  open,
  onClose,
  type,
  title,
  message,
  details,
}) => {
  const config = {
    success: {
      icon: <CheckCircle sx={{ fontSize: 48 }} />,
      color: '#4caf50',
      bgcolor: '#e8f5e9',
    },
    error: {
      icon: <Error sx={{ fontSize: 48 }} />,
      color: '#f44336',
      bgcolor: '#ffebee',
    },
    warning: {
      icon: <Warning sx={{ fontSize: 48 }} />,
      color: '#ff9800',
      bgcolor: '#fff3e0',
    },
    info: {
      icon: <Info sx={{ fontSize: 48 }} />,
      color: '#2196f3',
      bgcolor: '#e3f2fd',
    },
  };

  const currentConfig = config[type];

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderTop: `4px solid ${currentConfig.color}`,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            sx={{
              color: currentConfig.color,
              bgcolor: currentConfig.bgcolor,
              borderRadius: '50%',
              width: 56,
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {currentConfig.icon}
          </Box>
          <Typography variant="h6" fontWeight={600}>
            {title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Alert severity={type} variant="outlined" sx={{ mb: details ? 2 : 0 }}>
          <AlertTitle sx={{ fontWeight: 600 }}>{message}</AlertTitle>
          {details && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {details}
            </Typography>
          )}
        </Alert>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={onClose} 
          variant="contained"
          sx={{
            bgcolor: currentConfig.color,
            '&:hover': {
              bgcolor: currentConfig.color,
              filter: 'brightness(0.9)',
            },
          }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotificationDialog;
