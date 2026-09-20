'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Typography, Box, Container, Paper, CircularProgress, Button, Grid, Divider } from '@mui/material';
import { recommendationService } from '@/services/recommendation.service';

export default function OptimizeRoutinePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [optimization, setOptimization] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchOptimization = async () => {
      try {
        const res = await recommendationService.optimizeRoutine(id);
        setOptimization(res.data);
      } catch (err) {
        console.error('Failed to generate optimization', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOptimization();
  }, [id]);

  const handleApply = async () => {
    if (!optimization || !optimization.changes || optimization.changes.length === 0) return;
    setIsApplying(true);
    try {
      await recommendationService.applyOptimization(id, optimization.changes);
      router.push(`/routines/${id}/analysis`);
    } catch (err) {
      console.error(err);
      setIsApplying(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }} color="text.secondary">Analyzing routine for optimizations...</Typography>
      </Container>
    );
  }

  if (!optimization) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Typography variant="h5">Could not generate optimization.</Typography>
      </Container>
    );
  }

  const noChanges = optimization.changes.length === 0;

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" sx={{ fontFamily: '"DM Serif Display", serif', mb: 4 }}>
        Routine Optimization
      </Typography>

      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid item xs={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider', textAlign: 'center', bgcolor: 'grey.50' }}>
            <Typography variant="overline" color="text.secondary">Current Score</Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, mt: 1 }}>{optimization.currentScore}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'primary.main', textAlign: 'center', bgcolor: 'primary.50' }}>
            <Typography variant="overline" color="primary">Projected Score</Typography>
            <Typography variant="h3" color="primary" sx={{ fontWeight: 700, mt: 1 }}>{optimization.projectedScore}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Proposed Changes</Typography>
      
      {noChanges ? (
        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'success.main', bgcolor: 'success.50', textAlign: 'center' }}>
          <Typography variant="h6" color="success.dark" sx={{ mb: 1 }}>No Purchase Required</Typography>
          <Typography variant="body1" color="success.dark">Your current routine is well-structured and does not require any major changes.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {optimization.changes.map((change: any, idx: number) => (
            <Grid item xs={12} key={idx}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, borderLeft: '4px solid', borderColor: change.action === 'REMOVE' ? 'error.main' : 'primary.main', bgcolor: 'background.paper' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                      {change.action} Product
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Step ID: {change.stepId}
                    </Typography>
                    <Typography variant="body1">{change.explanation}</Typography>
                  </Box>
                  <Typography variant="button" color={change.action === 'REMOVE' ? 'error' : 'primary'}>
                    {change.reasonCode}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Divider sx={{ my: 4 }} />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button variant="outlined" color="inherit" onClick={() => router.back()} disabled={isApplying}>
          Keep Current Routine
        </Button>
        {!noChanges && (
          <Button variant="contained" color="primary" onClick={handleApply} disabled={isApplying}>
            {isApplying ? <CircularProgress size={24} color="inherit" /> : 'Apply Changes'}
          </Button>
        )}
      </Box>

    </Container>
  );
}
