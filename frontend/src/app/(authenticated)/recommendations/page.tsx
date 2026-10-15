'use client';

import React, { useEffect, useState } from 'react';
import {
  Typography,
  Box,
  Container,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Button,
  Alert,
} from '@mui/material';
import {
  AutoAwesome as SparklesIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { recommendationService } from '@/services/recommendation.service';

export default function RecommendationsPage() {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchRecs = async () => {
    setIsLoading(true);
    try {
      const res = await recommendationService.getRecommendations();
      setRecommendations(res.data || []);
      setErrorMsg(null);
    } catch (err: any) {
      console.error('Failed to load recommendations', err);
      setErrorMsg('Failed to load recommendation history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecs();
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      await recommendationService.generateRecommendations();
      await fetchRecs();
    } catch (err: any) {
      console.error('Failed to generate recommendation', err);
      setErrorMsg('Could not generate recommendations. Ensure you have completed onboarding and have a skin profile.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: '"DM Serif Display", serif', fontWeight: 600 }}>
            Your Recommendations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Personalized, conflict-checked recommendations grounded in real catalog chemistry.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={isGenerating ? <CircularProgress size={16} color="inherit" /> : <SparklesIcon />}
          onClick={handleGenerate}
          disabled={isGenerating}
          sx={{ borderRadius: 3 }}
        >
          {isGenerating ? 'Analyzing Catalog...' : 'Generate New Recommendation'}
        </Button>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
          {errorMsg}
        </Alert>
      )}

      <Grid container spacing={3}>
        {recommendations.map((rec) => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={rec.id}>
            <Paper 
              elevation={0} 
              sx={{
                p: 3,
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '100%',
              }}
              onClick={() => router.push(`/recommendations/${rec.id}`)}
            >
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                    {rec.recommendationType?.replace(/_/g, ' ')}
                  </Typography>
                  <Chip
                    label={rec.confidence || 'HIGH'}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  {new Date(rec.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </Typography>
                <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.6, mb: 2 }}>
                  {rec.summary}
                </Typography>
              </Box>
              <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Typography variant="button" color="primary" sx={{ fontWeight: 600 }}>
                  View Decision &rarr;
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
        {recommendations.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Paper
              elevation={0}
              sx={{
                textAlign: 'center',
                py: 8,
                px: 3,
                borderRadius: 4,
                border: '1px dashed',
                borderColor: 'divider',
                bgcolor: 'background.default',
              }}
            >
              <SparklesIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                No recommendations yet
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 460, mx: 'auto' }}>
                SkinAI evaluates your skin profile, active concerns, and current routines to recommend products or suggest keeping your current items.
              </Typography>
              <Button
                variant="contained"
                startIcon={isGenerating ? <CircularProgress size={16} color="inherit" /> : <SparklesIcon />}
                onClick={handleGenerate}
                disabled={isGenerating}
                sx={{ borderRadius: 3 }}
              >
                {isGenerating ? 'Evaluating Fit...' : 'Generate My First Recommendation'}
              </Button>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}
