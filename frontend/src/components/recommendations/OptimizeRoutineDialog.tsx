import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Paper, Chip } from '@mui/material';
import { RecommendationAction } from '@/types';

export function OptimizeRoutineDialog({ open, onClose, optimizationData, onApply }: any) {
  const [loading, setLoading] = useState(false);

  if (!optimizationData) return null;

  const handleApply = async () => {
    setLoading(true);
    await onApply(optimizationData.changes);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Routine Optimization</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, bgcolor: 'grey.50', py: 4, borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>Current Score</Typography>
              <Typography variant="h3" color="text.primary" sx={{ fontWeight: 700 }}>{optimizationData.currentScore}</Typography>
            </Box>
            <Box sx={{ color: 'text.disabled' }}>
              <Typography variant="h4">&rarr;</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="primary.main" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>Projected Score</Typography>
              <Typography variant="h3" color="success.main" sx={{ fontWeight: 700 }}>{optimizationData.projectedScore}</Typography>
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>Proposed Changes</Typography>
            {optimizationData.changes.length === 0 ? (
              <Typography color="text.secondary" variant="body2">Your routine is already fully optimized!</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {optimizationData.changes.map((change: any, idx: number) => (
                  <Paper key={idx} elevation={0} sx={{ display: 'flex', alignItems: 'flex-start', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Chip 
                      label={change.action} 
                      size="small" 
                      color={change.action === RecommendationAction.REMOVE ? 'error' : 'success'} 
                      sx={{ mr: 2, mt: 0.5 }} 
                    />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{change.reasonCode}</Typography>
                      <Typography variant="body2" color="text.secondary">{change.explanation}</Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={loading}>Close</Button>
        {optimizationData.changes.length > 0 && (
          <Button onClick={handleApply} variant="contained" color="primary" disabled={loading}>
            {loading ? 'Applying...' : 'Apply Optimization'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
