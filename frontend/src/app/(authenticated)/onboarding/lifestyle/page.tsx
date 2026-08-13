'use client';

import { Typography, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useRouter } from 'next/navigation';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { OnboardingNavigation } from '@/components/onboarding/OnboardingNavigation';
import { useState } from 'react';
import api from '@/services/api';

export default function LifestylePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [outdoorExposure, setOutdoorExposure] = useState('');
  const [sunExposure, setSunExposure] = useState('');

  const handleContinue = async () => {
    setLoading(true);
    try {
      await api.post('/onboarding/lifestyle', {
        outdoorExposure: outdoorExposure || undefined,
        sunExposure: sunExposure || undefined,
      });
      router.push('/onboarding/environment');
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <OnboardingProgress currentStep={5} totalSteps={8} />
      
      <Typography variant="h4" sx={{ fontFamily: '"DM Serif Display", serif', mb: 3 }}>
        Lifestyle (Optional)
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Tell us a bit about your daily routine so we can suggest products that fit naturally into your life.
      </Typography>

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Outdoor Exposure</InputLabel>
        <Select
          value={outdoorExposure}
          label="Outdoor Exposure"
          onChange={(e) => setOutdoorExposure(e.target.value)}
        >
          <MenuItem value="Mostly indoors">Mostly indoors</MenuItem>
          <MenuItem value="1–2 hours/day">1–2 hours/day</MenuItem>
          <MenuItem value="2–4 hours/day">2–4 hours/day</MenuItem>
          <MenuItem value="4+ hours/day">4+ hours/day</MenuItem>
          <MenuItem value="Varies">Varies</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Typical Sun Exposure</InputLabel>
        <Select
          value={sunExposure}
          label="Typical Sun Exposure"
          onChange={(e) => setSunExposure(e.target.value)}
        >
          <MenuItem value="Low">Low</MenuItem>
          <MenuItem value="Moderate">Moderate</MenuItem>
          <MenuItem value="High">High</MenuItem>
          <MenuItem value="Varies">Varies</MenuItem>
        </Select>
      </FormControl>

      <OnboardingNavigation 
        onBack={() => router.push('/onboarding/sensitivity')}
        onContinue={handleContinue}
        isLoading={loading}
      />
    </Box>
  );
}
