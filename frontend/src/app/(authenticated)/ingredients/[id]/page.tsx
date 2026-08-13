'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Box, Typography, Paper, Chip, Divider, Grid } from '@mui/material';
import api from '../../../../services/api';

interface IngredientDetail {
  inciName: string;
  commonName?: string | null;
  category?: string | null;
  irritationPotential?: string | null;
  description?: string | null;
  functions?: string[];
  benefits?: string[];
}

export default function IngredientDetailPage() {
  const params = useParams();
  const [ingredient, setIngredient] = useState<IngredientDetail | null>(null);

  useEffect(() => {
    if (params.id) {
      api.get(`/ingredients/${params.id}`).then(res => {
        setIngredient(res.data.data);
      }).catch(err => console.error(err));
    }
  }, [params.id]);

  if (!ingredient) return <Box sx={{ p: 3 }}><Typography>Loading...</Typography></Box>;

  return (
    <Box>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h3">{ingredient.inciName}</Typography>
        {ingredient.commonName && <Typography variant="h5" color="text.secondary">{ingredient.commonName}</Typography>}
        
        <Box sx={{ my: 2 }}>
          <Chip label={`Category: ${ingredient.category || 'Unknown'}`} color="primary" />
          {ingredient.irritationPotential && (
            <Chip label={`Irritation: ${ingredient.irritationPotential}`} color="warning" sx={{ ml: 1 }} />
          )}
        </Box>

        <Typography variant="body1" sx={{ mb: 2 }}>{ingredient.description || 'No description available.'}</Typography>

        <Divider sx={{ my: 3 }} />

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h6">Functions</Typography>
            <ul>
              {ingredient.functions?.map((f: string) => <li key={f}>{f}</li>) || <li>None listed</li>}
            </ul>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h6">Benefits</Typography>
            <ul>
              {ingredient.benefits?.map((b: string) => <li key={b}>{b}</li>) || <li>None listed</li>}
            </ul>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
