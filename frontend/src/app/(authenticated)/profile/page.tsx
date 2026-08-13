'use client';

import { Typography, Box, CircularProgress, Paper, Container, Button } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import api from '@/services/api';

interface Profile {
  userProfile: {
    ageRange?: string;
    climate?: string;
    monthlyBudget?: string;
    currency?: string;
  };
  skinProfile: {
    skinType: string;
    sensitivity: string;
  };
  concerns: { id: string; priority: string; concernType: string }[];
}

export default function ProfileViewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
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
        <Typography color="error">Failed to load profile.</Typography>
      </Box>
    );
  }

  const { userProfile, skinProfile, concerns } = profile;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontFamily: '"DM Serif Display", serif', mb: 4 }}>
        Skin Profile
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        
        {/* Skin */}
        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Skin Characteristics</Typography>
            <Button variant="outlined" size="small" onClick={() => router.push('/onboarding/skin-type')}>Edit</Button>
          </Box>
          <Typography variant="body2" color="text.secondary">Skin Type</Typography>
          <Typography variant="body1" sx={{ mb: 2, textTransform: 'capitalize', fontWeight: 500 }}>{skinProfile.skinType}</Typography>
          
          <Typography variant="body2" color="text.secondary">Sensitivity</Typography>
          <Typography variant="body1" sx={{ textTransform: 'capitalize', fontWeight: 500 }}>{skinProfile.sensitivity}</Typography>
        </Paper>

        {/* Priorities */}
        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Priorities</Typography>
            <Button variant="outlined" size="small" onClick={() => router.push('/onboarding/concerns')}>Edit</Button>
          </Box>
          {concerns.map((c) => (
            <Box key={c.id} sx={{ mb: 1.5 }}>
              <Typography variant="body1" sx={{ textTransform: 'capitalize', fontWeight: c.priority === 'primary' ? 600 : 400 }}>
                {c.concernType.replace('_', ' ')}
                {c.priority === 'primary' && ' (Primary)'}
              </Typography>
            </Box>
          ))}
        </Paper>

        {/* Context */}
        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Environmental Context</Typography>
            <Button variant="outlined" size="small" onClick={() => router.push('/onboarding/profile')}>Edit</Button>
          </Box>
          {userProfile.ageRange && (
            <>
              <Typography variant="body2" color="text.secondary">Age</Typography>
              <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>{userProfile.ageRange.replace('_', '-')}</Typography>
            </>
          )}
          {userProfile.climate && (
            <>
              <Typography variant="body2" color="text.secondary">Climate</Typography>
              <Typography variant="body1" sx={{ mb: 2, textTransform: 'capitalize', fontWeight: 500 }}>{userProfile.climate.replace('_', ' ')}</Typography>
            </>
          )}
          {userProfile.monthlyBudget && (
            <>
              <Typography variant="body2" color="text.secondary">Budget</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{userProfile.currency} {userProfile.monthlyBudget}</Typography>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
}
