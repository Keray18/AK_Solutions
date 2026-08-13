'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
} from '@mui/material';
import api from '../../../services/api';

interface Ingredient {
  id: string;
  inciName: string;
  commonName?: string | null;
  category?: string | null;
}

export default function IngredientsDiscoveryPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchIngredients = async () => {
      try {
        const res = await api.get(`/ingredients?search=${search}`);
        if (mounted) {
          setIngredients(res.data.data.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchIngredients();
    return () => { mounted = false; };
  }, [search]);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Ingredient Library</Typography>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          label="Search Ingredients (e.g. Niacinamide)"
          variant="outlined"
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Box>

      <Grid container spacing={3}>
        {ingredients.map(ing => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={ing.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{ing.inciName}</Typography>
                {ing.commonName && <Typography color="text.secondary" variant="subtitle2">{ing.commonName}</Typography>}
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Category: {ing.category || 'Unknown'}
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" href={`/ingredients/${ing.id}`}>Learn More</Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
