'use client';

import { Typography, Box } from '@mui/material';
import { useRouter } from 'next/navigation';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { OnboardingNavigation } from '@/components/onboarding/OnboardingNavigation';
import { SelectableCard } from '@/components/onboarding/SelectableCard';
import { useState } from 'react';
import api from '@/services/api';

const CLIMATES = [
  { id: 'hot_humid', title: 'Hot & Humid' },
  { id: 'hot_dry', title: 'Hot & Dry' },
  { id: 'temperate', title: 'Moderate / Temperate' },
  { id: 'cold_dry', title: 'Cold & Dry' },
  { id: 'tropical', title: 'Tropical' },
  { id: 'continental', title: 'Varies Seasonally (Continental)' },
];

export default function EnvironmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState('');

  const handleContinue = async () => {
    setLoading(true);
    try {
      await api.post('/onboarding/environment', { climate: selected });
      router.push('/onboarding/budget');
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <OnboardingProgress currentStep={6} totalSteps={8} />
      
      <Typography variant="h4" sx={{ fontFamily: '"DM Serif Display", serif', mb: 3 }}>
        What is your local climate?
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Your environment plays a major role in what textures will feel comfortable on your skin.
      </Typography>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', pb: 2 }}>
        {CLIMATES.map(climate => (
          <SelectableCard
            key={climate.id}
            title={climate.title}
            selected={selected === climate.id}
            onClick={() => setSelected(climate.id)}
          />
        ))}
      </Box>

      <OnboardingNavigation 
        onBack={() => router.push('/onboarding/lifestyle')}
        onContinue={handleContinue}
        isContinueDisabled={!selected}
        isLoading={loading}
      />
    </Box>
  );
}
