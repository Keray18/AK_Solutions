'use client';

import { Typography, Box } from '@mui/material';
import { useRouter } from 'next/navigation';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { OnboardingNavigation } from '@/components/onboarding/OnboardingNavigation';
import { SelectableCard } from '@/components/onboarding/SelectableCard';
import { useState } from 'react';
import api from '@/services/api';

const SENSITIVITY_LEVELS = [
  { id: 'low', title: 'Low', description: 'My skin rarely reacts to new skincare.' },
  { id: 'medium', title: 'Moderate', description: 'My skin occasionally becomes irritated.' },
  { id: 'high', title: 'High', description: 'My skin reacts easily to new products or strong ingredients.' },
];

export default function SensitivityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState('');

  const handleContinue = async () => {
    setLoading(true);
    try {
      await api.post('/onboarding/sensitivity', { sensitivity: selected });
      router.push('/onboarding/lifestyle');
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <OnboardingProgress currentStep={4} totalSteps={8} />
      
      <Typography variant="h4" sx={{ fontFamily: '"DM Serif Display", serif', mb: 3 }}>
        How sensitive is your skin?
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        This helps us filter out potentially irritating ingredients.
      </Typography>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', pb: 2 }}>
        {SENSITIVITY_LEVELS.map(level => (
          <SelectableCard
            key={level.id}
            title={level.title}
            description={level.description}
            selected={selected === level.id}
            onClick={() => setSelected(level.id)}
          />
        ))}
      </Box>

      <OnboardingNavigation 
        onBack={() => router.push('/onboarding/concerns')}
        onContinue={handleContinue}
        isContinueDisabled={!selected}
        isLoading={loading}
      />
    </Box>
  );
}
