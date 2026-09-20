import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Grid, Paper } from '@mui/material';

export function ProductComparisonDialog({ open, onClose, productA, productB, onSelect }: any) {
  if (!productA || !productB) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Compare Products</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
              <Typography variant="h6" sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1, mb: 2 }}>
                Current Product
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 3 }}>
                {productA.name || 'Current Product'}
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>Match Score</Typography>
                <Typography variant="h5">{productA.score || 84}/100</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>Key Negatives</Typography>
                <ul style={{ paddingLeft: 16, color: '#d32f2f', fontSize: '0.875rem' }}>
                  <li>Slightly redundant</li>
                  <li>Not optimal for current season</li>
                </ul>
              </Box>
            </Paper>
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.100', borderRadius: 2 }}>
              <Typography variant="h6" color="primary.main" sx={{ borderBottom: '1px solid', borderColor: 'primary.100', pb: 1, mb: 2 }}>
                Recommended Candidate
              </Typography>
              <Typography variant="subtitle1" color="primary.dark" sx={{ fontWeight: 600, mb: 3 }}>
                {productB.name || 'New Recommendation'}
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Typography variant="caption" color="primary.main" sx={{ textTransform: 'uppercase' }}>Match Score</Typography>
                <Typography variant="h5" color="success.main">{productB.score || 94}/100</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="primary.main" sx={{ textTransform: 'uppercase' }}>Key Positives</Typography>
                <ul style={{ paddingLeft: 16, color: '#2e7d32', fontSize: '0.875rem' }}>
                  <li>Better budget fit</li>
                  <li>Fills missing hydration gap</li>
                </ul>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={() => { onSelect(productB); onClose(); }} variant="contained" color="primary">
          Accept Replacement
        </Button>
      </DialogActions>
    </Dialog>
  );
}
