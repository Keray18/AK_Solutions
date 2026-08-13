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
  Chip
} from '@mui/material';
import api from '../../../services/api';

interface Product {
  id: string;
  name: string;
  category: string;
  brand?: { name: string } | null;
}

export default function ProductsDiscoveryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchProducts = async () => {
      try {
        const res = await api.get(`/products?search=${search}`);
        if (mounted) {
          setProducts(res.data.data.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchProducts();
    return () => { mounted = false; };
  }, [search]);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Product Library</Typography>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          label="Search Products"
          variant="outlined"
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Box>

      <Grid container spacing={3}>
        {products.map(prod => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={prod.id}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" variant="subtitle2" gutterBottom>
                  {prod.brand?.name}
                </Typography>
                <Typography variant="h6">{prod.name}</Typography>
                <Box sx={{ mt: 2 }}>
                  <Chip size="small" label={prod.category} />
                </Box>
              </CardContent>
              <CardActions>
                <Button size="small" href={`/products/${prod.id}`}>View Details</Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
