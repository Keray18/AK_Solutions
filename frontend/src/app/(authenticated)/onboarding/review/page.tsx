'use client';

import { Typography, Box, CircularProgress, Paper, Button } from '@mui/material';
import { useRouter } from 'next/navigation';
import { OnboardingNavigation } from '@/components/onboarding/OnboardingNavigation';
import { useState, useEffect } from 'react';
import api from '@/services/api';

interface Profile {
  userProfile: {
    ageRange: string;
    climate: string;
    monthlyBudget: string;
    currency: string;
  };
  skinProfile: {
    skinType: string;
    sensitivity: string;
  };
  concerns: { id: string; priority: string; concernType: string }[];
  routines: { id: string; routineType: string; stepCount: number }[];
}

export default function ReviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/skin-profile');
        setProfile(data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await api.post('/onboarding/complete', {});
      router.push('/dashboard');
    } catch (error) {
      console.error(error);
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error">Failed to load profile summary.</Typography>
      </Box>
    );
  }

  const { userProfile, skinProfile, concerns, routines } = profile;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Typography variant="h4" sx={{ fontFamily: '"DM Serif Display", serif', mb: 3 }}>
        Review your profile
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Make sure everything looks right before we personalize your experience.
      </Typography>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', pb: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
        
        {/* Skin */}
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Skin</Typography>
            <Button size="small" onClick={() => router.push('/onboarding/skin-type')}>Edit</Button>
          </Box>
          <Typography variant="body2" color="text.secondary">Type</Typography>
          <Typography variant="body1" sx={{ mb: 2, textTransform: 'capitalize' }}>{skinProfile.skinType}</Typography>
          
          <Typography variant="body2" color="text.secondary">Sensitivity</Typography>
          <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>{skinProfile.sensitivity}</Typography>
        </Paper>

        {/* Priorities */}
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Priorities</Typography>
            <Button size="small" onClick={() => router.push('/onboarding/concerns')}>Edit</Button>
          </Box>
          {concerns.map((c) => (
            <Box key={c.id} sx={{ mb: 1 }}>
              <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                {c.concernType.replace('_', ' ')}
                {c.priority === 'primary' && ' (Primary)'}
              </Typography>
            </Box>
          ))}
        </Paper>

        {/* Routines */}
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Routines</Typography>
            <Button size="small" onClick={() => router.push('/onboarding/routine')}>Edit</Button>
          </Box>
          {routines.map((r) => (
            <Box key={r.id} sx={{ mb: 1 }}>
              <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                {r.routineType} Routine: {r.stepCount} steps
              </Typography>
            </Box>
          ))}
        </Paper>

        {/* About You */}
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>About You</Typography>
            <Button size="small" onClick={() => router.push('/onboarding/profile')}>Edit</Button>
          </Box>
          {userProfile.ageRange && (
            <>
              <Typography variant="body2" color="text.secondary">Age</Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>{userProfile.ageRange.replace('_', '-')}</Typography>
            </>
          )}
          {userProfile.climate && (
            <>
              <Typography variant="body2" color="text.secondary">Environment</Typography>
              <Typography variant="body1" sx={{ mb: 2, textTransform: 'capitalize' }}>{userProfile.climate.replace('_', ' ')}</Typography>
            </>
          )}
          {userProfile.monthlyBudget && (
            <>
              <Typography variant="body2" color="text.secondary">Budget</Typography>
              <Typography variant="body1">{userProfile.currency} {userProfile.monthlyBudget}</Typography>
            </>
          )}
        </Paper>
      </Box>

      <OnboardingNavigation 
        onContinue={handleComplete}
        continueText="Create My Skin Profile"
        isLoading={completing}
      />
    </Box>
  );
}
