'use client';

import { Box, Button } from '@mui/material';

interface OnboardingNavigationProps {
  onBack?: () => void;
  onContinue: () => void;
  continueText?: string;
  isContinueDisabled?: boolean;
  isLoading?: boolean;
}

export function OnboardingNavigation({ 
  onBack, 
  onContinue, 
  continueText = 'Continue', 
  isContinueDisabled = false,
  isLoading = false,
}: OnboardingNavigationProps) {
  return (
    <Box sx={{ mt: 'auto', pt: 4, pb: 4, display: 'flex', justifyContent: 'space-between' }}>
      {onBack ? (
        <Button 
          variant="text" 
          onClick={onBack}
          disabled={isLoading}
          sx={{ color: 'text.secondary' }}
        >
          Back
        </Button>
      ) : (
        <Box /> // spacer
      )}
      <Button 
        variant="contained" 
        color="primary" 
        onClick={onContinue}
        disabled={isContinueDisabled || isLoading}
        sx={{ minWidth: 120 }}
      >
        {isLoading ? 'Saving...' : continueText}
      </Button>
    </Box>
  );
}
