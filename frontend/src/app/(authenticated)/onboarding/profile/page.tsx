'use client';

import { Typography, Box, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';
import { useRouter } from 'next/navigation';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { OnboardingNavigation } from '@/components/onboarding/OnboardingNavigation';
import { useState } from 'react';
import api from '@/services/api';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [ageRange, setAgeRange] = useState('');
  const [country, setCountry] = useState('');
  
  const handleContinue = async () => {
    setLoading(true);
    try {
      await api.post('/onboarding/profile', {
        ageRange: ageRange || undefined,
        country: country || undefined,
      });
      router.push('/onboarding/skin-type');
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <OnboardingProgress currentStep={1} totalSteps={8} />
      
      <Typography variant="h4" sx={{ fontFamily: '"DM Serif Display", serif', mb: 3 }}>
        Basic Profile
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        This helps us understand basic factors that might affect your skin.
      </Typography>

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Age Range (Optional)</InputLabel>
        <Select
          value={ageRange}
          label="Age Range (Optional)"
          onChange={(e) => setAgeRange(e.target.value)}
        >
          <MenuItem value="under_18">Under 18</MenuItem>
          <MenuItem value="18_24">18–24</MenuItem>
          <MenuItem value="25_34">25–34</MenuItem>
          <MenuItem value="35_44">35–44</MenuItem>
          <MenuItem value="45_54">45–54</MenuItem>
          <MenuItem value="55_plus">55+</MenuItem>
        </Select>
      </FormControl>

      <TextField
        fullWidth
        label="Country"
        variant="outlined"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        sx={{ mb: 3 }}
      />

      <OnboardingNavigation 
        onBack={() => router.push('/onboarding/welcome')}
        onContinue={handleContinue}
        isLoading={loading}
      />
    </Box>
  );
}
