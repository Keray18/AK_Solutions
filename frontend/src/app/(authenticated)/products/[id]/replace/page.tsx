'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Typography, Box, Container, Paper, CircularProgress, Button, Grid } from '@mui/material';
import { recommendationService } from '@/services/recommendation.service';

export default function ReplaceProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [recommendation, setRecommendation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  const handleReasonSelect = async (selectedReason: string) => {
    setReason(selectedReason);
    setIsLoading(true);
    try {
      const res = await recommendationService.getReplacements(id);
      setRecommendation(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!id) return null;

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" sx={{ fontFamily: '"DM Serif Display", serif', mb: 2 }}>
        Replace Product
      </Typography>
      
      {!reason && !isLoading && (
        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ mb: 3 }}>Why are you considering replacing this product?</Typography>
          <Grid container spacing={2}>
            {['TOO_EXPENSIVE', 'IRRITATION_CONCERN', 'UNAVAILABLE', 'WANT_SIMPLER_ROUTINE', 'FINISHED', 'JUST_EXPLORING'].map(r => (
              <Grid size={{ xs: 12, sm: 6 }} key={r}>
                <Button 
                  fullWidth 
                  variant="outlined" 
                  color="primary"
                  sx={{ py: 2, borderRadius: 3 }}
                  onClick={() => handleReasonSelect(r)}
                >
                  {r.replace(/_/g, ' ')}
                </Button>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {isLoading && (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }} color="text.secondary">Analyzing candidates...</Typography>
        </Box>
      )}

      {recommendation && !isLoading && (
        <Box>
          <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider', mb: 4, bgcolor: recommendation.decision === 'KEEP' ? 'info.50' : 'success.50' }}>
            <Typography variant="overline" color="text.secondary">Decision</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 1, mb: 2 }}>
              {recommendation.decision === 'KEEP' ? 'KEEP YOUR CURRENT PRODUCT' : 'REPLACE PRODUCT'}
            </Typography>
            <Typography variant="body1">{recommendation.summary}</Typography>
          </Paper>

          {recommendation.items.length > 1 && (
            <>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Options</Typography>
              <Grid container spacing={3}>
                {recommendation.items.map((item: any, idx: number) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={idx}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider', height: '100%' }}>
                      <Typography variant="subtitle2" color="primary" sx={{ mb: 1, fontWeight: 700 }}>
                        {item.rank === 1 ? 'BEST FIT' : item.rank === 2 ? 'BUDGET OPTION' : 'ALTERNATIVE'}
                      </Typography>
                      <Typography variant="h6" sx={{ mb: 1 }}>Product ID: {item.productId}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{item.reason}</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Fit Score: {item.score}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </>
          )}

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Button variant="contained" color="primary" onClick={() => router.push('/recommendations')}>
              Back to Recommendations
            </Button>
          </Box>
        </Box>
      )}
    </Container>
  );
}
