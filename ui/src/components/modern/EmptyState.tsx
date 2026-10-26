// Empty State Component - 2026 Design
// No data illustration component

import React from 'react';
import { Box, Typography, styled, alpha } from '@mui/material';
import {
  Inbox as InboxIcon,
  SearchOff as SearchOffIcon,
  ErrorOutline as ErrorOutlineIcon,
  CloudOff as CloudOffIcon,
  HourglassEmpty as HourglassEmptyIcon,
} from '@mui/icons-material';
import { AnimatedButton } from './AnimatedButton';

export type EmptyStateType = 'no-data' | 'no-results' | 'error' | 'offline' | 'coming-soon';

interface EmptyStateProps {
  /**
   * Empty state type
   */
  type?: EmptyStateType;
  
  /**
   * Custom title
   */
  title?: string;
  
  /**
   * Custom description
   */
  description?: string;
  
  /**
   * Custom icon
   */
  icon?: React.ReactNode;
  
  /**
   * Action button label
   */
  actionLabel?: string;
  
  /**
   * Action button handler
   */
  onAction?: () => void;
  
  /**
   * Custom brand color
   */
  brandColor?: string;
}

const Container = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 48,
  textAlign: 'center',
  minHeight: 300,
});

const IconContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'brandColor',
})<{ brandColor?: string }>(({ theme, brandColor }) => {
  const color = brandColor || theme.palette.primary.main;
  
  return {
    width: 120,
    height: 120,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(135deg, ${alpha(color, 0.05)} 0%, ${alpha(color, 0.15)} 100%)`,
    marginBottom: 24,
    
    '& svg': {
      fontSize: 64,
      color: alpha(color, 0.5),
    },
  };
});

const defaultContent: Record<EmptyStateType, { title: string; description: string; icon: React.ReactElement }> = {
  'no-data': {
    title: 'No Data Available',
    description: 'There is no data to display at the moment. Try adding some items or check back later.',
    icon: <InboxIcon />,
  },
  'no-results': {
    title: 'No Results Found',
    description: 'We couldn\'t find any results matching your search. Try adjusting your filters or search terms.',
    icon: <SearchOffIcon />,
  },
  'error': {
    title: 'Something Went Wrong',
    description: 'We encountered an error while loading the data. Please try again or contact support if the problem persists.',
    icon: <ErrorOutlineIcon />,
  },
  'offline': {
    title: 'No Connection',
    description: 'Unable to connect to the server. Please check your internet connection and try again.',
    icon: <CloudOffIcon />,
  },
  'coming-soon': {
    title: 'Coming Soon',
    description: 'This feature is currently under development. Stay tuned for updates!',
    icon: <HourglassEmptyIcon />,
  },
};

/**
 * EmptyState - 2026 Empty/No Data Component
 * 
 * Displays friendly empty states with icons and optional actions
 * 
 * @example
 * ```tsx
 * // No data state
 * <EmptyState type="no-data" brandColor="#078930" />
 * 
 * // No search results with action
 * <EmptyState 
 *   type="no-results"
 *   actionLabel="Clear Filters"
 *   onAction={() => clearFilters()}
 *   brandColor="#0F47AF"
 * />
 * 
 * // Custom empty state
 * <EmptyState
 *   title="No Applications Yet"
 *   description="Start by creating your first export application"
 *   icon={<DescriptionIcon />}
 *   actionLabel="Create Application"
 *   onAction={() => navigate('/apply')}
 *   brandColor="#8B6F47"
 * />
 * ```
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'no-data',
  title,
  description,
  icon,
  actionLabel,
  onAction,
  brandColor,
}) => {
  const content = defaultContent[type];
  
  return (
    <Container>
      <IconContainer brandColor={brandColor}>
        {icon || content.icon}
      </IconContainer>
      
      <Typography
        variant="h5"
        sx={{
          fontWeight: 600,
          mb: 1,
          color: 'text.primary',
        }}
      >
        {title || content.title}
      </Typography>
      
      <Typography
        variant="body1"
        sx={{
          color: 'text.secondary',
          maxWidth: 500,
          mb: 3,
        }}
      >
        {description || content.description}
      </Typography>
      
      {actionLabel && onAction && (
        <AnimatedButton
          onClick={onAction}
          brandColor={brandColor}
          variant="contained"
        >
          {actionLabel}
        </AnimatedButton>
      )}
    </Container>
  );
};

export default EmptyState;
