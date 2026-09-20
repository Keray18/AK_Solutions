'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Typography, Box, Container, Paper, Grid, CircularProgress } from '@mui/material';
import { RecommendationAction } from '@/types';
import { recommendationService } from '@/services/recommendation.service';

export default function RecommendationDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [detail, setDetail] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      try {
        const res = await recommendationService.getRecommendationById(id);
        setDetail(res.data);
      } catch (err) {
        console.error('Failed to fetch recommendation detail', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!detail) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Typography variant="h5">Recommendation not found</Typography>
      </Container>
    );
  }

  const getFitLabel = (score: number) => {
    if (score >= 85) return 'Strong fit';
    if (score >= 70) return 'Good fit';
    if (score >= 55) return 'Possible fit';
    return 'Weak fit';
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontFamily: '"DM Serif Display", serif', mb: 4 }}>
        SkinAI Recommendation
      </Typography>

      <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider', mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Summary</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>{detail.summary}</Typography>
        {detail.overallScore && (
          <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 600 }}>
            Fit: {getFitLabel(detail.overallScore)}
          </Typography>
        )}
        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
          Confidence: {detail.confidence}
        </Typography>
      </Paper>

      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>Suggested Actions</Typography>
      
      <Grid container spacing={3}>
        {detail.items?.map((item: any, idx: number) => (
          <Grid item xs={12} key={idx}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 3, 
                borderRadius: 4, 
                borderLeft: '4px solid', 
                borderColor: item.action === RecommendationAction.ADD ? 'success.main' : item.action === RecommendationAction.KEEP ? 'info.main' : 'error.main',
                bgcolor: 'background.paper'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                    {item.action}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Product ID: {item.productId}</Typography>
                  <Typography variant="body1" sx={{ mt: 1 }}>{item.reason}</Typography>
                </Box>
                {item.score && (
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{getFitLabel(item.score)}</Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

