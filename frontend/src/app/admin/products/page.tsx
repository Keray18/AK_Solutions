'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import api from '../../../services/api';

const PRODUCT_CATEGORIES = [
  'CLEANSER', 'TONER', 'ESSENCE', 'SERUM', 'TREATMENT', 'MOISTURIZER',
  'SUNSCREEN', 'RETINOID', 'EXFOLIANT', 'FACE_OIL', 'EYE_CREAM', 'MASK', 'OTHER'
];

interface Brand {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  brand?: Brand | null;
  category?: string | null;
  price?: number | null;
  available: boolean;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    brandId: '',
    category: '',
    price: '',
    available: true,
  });

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const [prodRes, brandRes] = await Promise.all([
          api.get('/products'), // Note: Using public endpoint for listing
          api.get('/admin/brands')
        ]);
        if (mounted) {
          setProducts(prodRes.data.data.data);
          setBrands(brandRes.data.data.data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, []);

  const fetchDataRef = async () => {
    try {
      const [prodRes, brandRes] = await Promise.all([
        api.get('/products'),
        api.get('/admin/brands')
      ]);
      setProducts(prodRes.data.data.data);
      setBrands(brandRes.data.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpen = (product?: Product) => {
    if (product) {
      setEditingId(product.id);
      setFormData({
        name: product.name,
        slug: product.slug,
        brandId: product.brand?.id || '',
        category: product.category || '',
        price: product.price || '',
        available: product.available,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        slug: '',
        brandId: '',
        category: '',
        price: '',
        available: true,
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : null,
      };

      if (editingId) {
        await api.patch(`/products/${editingId}`, payload);
      } else {
        await api.post('/products', payload);
      }
      handleClose();
      fetchDataRef();
    } catch (err) {
      console.error(err);
      alert('Error saving product');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/products/${id}`);
        fetchDataRef();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">Products Management</Typography>
        <Button variant="contained" onClick={() => handleOpen()}>Add Product</Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Brand</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Available</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.brand?.name}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>{item.available ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => handleOpen(item)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => handleDelete(item.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Product' : 'Add Product'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="Brand"
              value={formData.brandId}
              onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
              fullWidth
            >
              {brands.map(b => (
                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              fullWidth
            >
              {PRODUCT_CATEGORIES.map(cat => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Price (INR)"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.available}
                  onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                />
              }
              label="Available"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
