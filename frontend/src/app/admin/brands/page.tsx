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
  Switch,
  FormControlLabel,
} from '@mui/material';
import api from '../../../services/api';

interface Brand {
  id: string;
  name: string;
  slug: string;
  country?: string | null;
  website?: string | null;
  active: boolean;
}

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    country: '',
    website: '',
    active: true,
  });

  useEffect(() => {
    let mounted = true;

    const fetchBrands = async () => {
      try {
        const res = await api.get('/admin/brands');
        if (mounted) {
          setBrands(res.data.data.data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchBrands();
    return () => { mounted = false; };
  }, []);

  const fetchBrandsRef = async () => {
    try {
      const res = await api.get('/admin/brands');
      setBrands(res.data.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpen = (brand?: Brand) => {
    if (brand) {
      setEditingId(brand.id);
      setFormData({
        name: brand.name,
        slug: brand.slug,
        country: brand.country || '',
        website: brand.website || '',
        active: brand.active,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        slug: '',
        country: '',
        website: '',
        active: true,
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await api.patch(`/admin/brands/${editingId}`, formData);
      } else {
        await api.post('/admin/brands', formData);
      }
      handleClose();
      fetchBrandsRef();
    } catch (err) {
      console.error(err);
      alert('Error saving brand');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this brand?')) {
      try {
        await api.delete(`/admin/brands/${id}`);
        fetchBrandsRef();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Brands Management</Typography>
        <Button variant="contained" onClick={() => handleOpen()}>Add Brand</Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Slug</TableCell>
              <TableCell>Country</TableCell>
              <TableCell>Active</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {brands.map((brand) => (
              <TableRow key={brand.id}>
                <TableCell>{brand.name}</TableCell>
                <TableCell>{brand.slug}</TableCell>
                <TableCell>{brand.country}</TableCell>
                <TableCell>{brand.active ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => handleOpen(brand)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => handleDelete(brand.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Brand' : 'Add Brand'}</DialogTitle>
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
              label="Country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              fullWidth
            />
            <TextField
              label="Website"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
              }
              label="Active"
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
