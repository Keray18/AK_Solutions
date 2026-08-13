'use client';

import { Box, Typography, Container, Grid, Paper, CircularProgress, Alert } from '@mui/material';
import { useAuthStore } from '@/stores/authStore';
import { useState, useEffect } from 'react';
import api from '@/services/api';

interface Profile {
  skinProfile: {
    skinType: string;
    sensitivity: string;
  };
  concerns: { priority: string; concernType: string }[];
  routines: { id: string; routineType: string; stepCount: number }[];
}

export default function DashboardPage() {
  const { user } = useAuthStore();
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 4, fontFamily: '"DM Serif Display", serif' }}>
        Good afternoon, {user?.name.split(' ')[0]}
      </Typography>

      {!profile ? (
        <Alert severity="warning">Please complete your onboarding to see your profile summary.</Alert>
      ) : (
        <Grid container spacing={3}>
          {/* Profile Summary */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 4, height: '100%', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>
                Your Skin Profile
              </Typography>
              <Typography variant="body1" sx={{ textTransform: 'capitalize', mb: 1 }}>
                {profile.skinProfile.skinType} skin
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize', mb: 3 }}>
                {profile.skinProfile.sensitivity} sensitivity
              </Typography>

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                PRIMARY FOCUS
              </Typography>
              <Typography variant="body1" sx={{ textTransform: 'capitalize', mb: 1 }}>
                {profile.concerns.find((c) => c.priority === 'primary')?.concernType.replace('_', ' ')}
              </Typography>
            </Paper>
          </Grid>

          {/* Routine Summary */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 4, height: '100%', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>
                Current Routine
              </Typography>
              {profile.routines.map((r) => (
                <Box key={r.id} sx={{ mb: 2 }}>
                  <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                    {r.routineType} Routine
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {r.stepCount} steps
                  </Typography>
                </Box>
              ))}
              
              <Box sx={{ mt: 4, p: 2, bgcolor: 'primary.50', borderRadius: 2 }}>
                <Typography variant="subtitle2" color="primary.main">
                  Routine analysis coming in the next step.
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Container>
  );
}
