'use client';

import { Typography, Box } from '@mui/material';
import { useRouter } from 'next/navigation';
import { OnboardingNavigation } from '@/components/onboarding/OnboardingNavigation';
import { useState } from 'react';
import api from '@/services/api';

export default function WelcomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleBegin = async () => {
    setLoading(true);
    try {
      // Create initial profile if it doesn't exist, which starts the process
      await api.post('/onboarding/profile', {});
      router.push('/onboarding/profile');
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', mt: 8 }}>
      <Typography variant="h3" sx={{ fontFamily: '"DM Serif Display", serif', mb: 3 }}>
        Let&apos;s understand your skin.
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem', mb: 4, lineHeight: 1.6 }}>
        We&apos;ll ask a few questions about your skin, concerns, environment, routine, and budget so SkinAI can personalize future recommendations.
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        You can update this anytime. About 3–5 minutes.
      </Typography>

      <OnboardingNavigation 
        onContinue={handleBegin} 
        continueText="Let's Begin" 
        isLoading={loading}
      />
    </Box>
  );
}
