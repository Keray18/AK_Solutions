'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Box, Typography, Paper, Chip, Divider, List, ListItem, ListItemText } from '@mui/material';
import api from '../../../../services/api';

interface ProductIngredient {
  isKeyIngredient: boolean;
  ingredient: {
    id: string;
    inciName: string;
    category?: string;
  };
}

interface ProductDetail {
  name: string;
  category: string;
  price?: number;
  currency?: string;
  description?: string;
  brand?: { name: string };
  ingredients?: ProductIngredient[];
}

export default function ProductDetailPage() {
  const params = useParams();
  const [product, setProduct] = useState<ProductDetail | null>(null);

  useEffect(() => {
    if (params.id) {
      api.get(`/products/${params.id}`).then(res => {
        setProduct(res.data.data);
      }).catch(err => console.error(err));
    }
  }, [params.id]);

  if (!product) return <Box sx={{ p: 3 }}><Typography>Loading...</Typography></Box>;

  return (
    <Box>
      <Paper sx={{ p: 4 }}>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          {product.brand?.name}
        </Typography>
        <Typography variant="h3">{product.name}</Typography>
        
        <Box sx={{ my: 3 }}>
          <Chip label={`Category: ${product.category}`} color="primary" />
          {product.price && (
            <Chip label={`${product.currency} ${product.price}`} sx={{ ml: 1 }} />
          )}
        </Box>

        <Typography variant="body1" sx={{ mb: 2 }}>{product.description || 'No description available.'}</Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" gutterBottom>Ingredients</Typography>
        <List>
          {product.ingredients?.map((pi) => (
            <ListItem key={pi.ingredient.id} disablePadding sx={{ py: 1 }}>
              <ListItemText 
                primary={
                  <Typography variant="body1">
                    {pi.ingredient.inciName}
                    {pi.isKeyIngredient && (
                      <Chip label="Key Ingredient" size="small" color="secondary" sx={{ ml: 1 }} />
                    )}
                  </Typography>
                }
                secondary={pi.ingredient.category}
              />
            </ListItem>
          ))}
          {(!product.ingredients || product.ingredients.length === 0) && (
            <Typography color="text.secondary">Ingredient list not available.</Typography>
          )}
        </List>
      </Paper>
    </Box>
  );
}
