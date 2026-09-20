'use client';

import React, { useEffect, useState } from 'react';
import { Typography, Box, Container, Paper, Grid, Chip, CircularProgress } from '@mui/material';
import { useRouter } from 'next/navigation';
import { recommendationService } from '@/services/recommendation.service';

export default function RecommendationsPage() {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const res = await recommendationService.getRecommendations();
        setRecommendations(res.data || []);
      } catch (err) {
        console.error('Failed to load recommendations', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecs();
  }, []);

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontFamily: '"DM Serif Display", serif', mb: 4 }}>
        Your Recommendations
      </Typography>

      <Grid container spacing={3}>
        {recommendations.map((rec) => (
          <Grid item xs={12} md={6} lg={4} key={rec.id}>
            <Paper 
              elevation={0} 
              sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider', cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
              onClick={() => router.push(`/recommendations/${rec.id}`)}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                  {rec.recommendationType?.replace(/_/g, ' ')}
                </Typography>
                <Chip label={rec.confidence || 'HIGH'} size="small" color="primary" variant="outlined" />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {new Date(rec.createdAt).toLocaleDateString()}
              </Typography>
              <Typography variant="body1">{rec.summary}</Typography>
              <Box sx={{ mt: 3, textAlign: 'right' }}>
                <Typography variant="button" color="primary">View Details &rarr;</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
        {recommendations.length === 0 && (
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography color="text.secondary">You don't have any recommendations yet. Try optimizing your routine!</Typography>
            </Box>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}

