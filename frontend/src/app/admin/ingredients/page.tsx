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
} from '@mui/material';
import api from '../../../services/api';

const INGREDIENT_CATEGORIES = [
  'ACTIVE', 'HUMECTANT', 'EMOLLIENT', 'OCCLUSIVE', 'SURFACTANT',
  'PRESERVATIVE', 'ANTIOXIDANT', 'EXFOLIANT', 'SUNSCREEN_FILTER',
  'FRAGRANCE', 'BOTANICAL', 'PEPTIDE', 'CERAMIDE', 'RETINOID',
  'VITAMIN', 'OTHER'
];

interface Ingredient {
  id: string;
  inciName: string;
  commonName?: string | null;
  category?: string | null;
  description?: string | null;
}

export default function AdminIngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    inciName: '',
    commonName: '',
    category: '',
    description: '',
  });

  useEffect(() => {
    let mounted = true;

    const fetchIngredients = async () => {
      try {
        const res = await api.get('/ingredients'); // Note: Using public endpoint for listing
        if (mounted) {
          setIngredients(res.data.data.data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchIngredients();
    return () => { mounted = false; };
  }, []);

  const fetchIngredientsRef = async () => {
    try {
      const res = await api.get('/ingredients');
      setIngredients(res.data.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpen = (ingredient?: Ingredient) => {
    if (ingredient) {
      setEditingId(ingredient.id);
      setFormData({
        inciName: ingredient.inciName,
        commonName: ingredient.commonName || '',
        category: ingredient.category || '',
        description: ingredient.description || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        inciName: '',
        commonName: '',
        category: '',
        description: '',
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
        await api.patch(`/ingredients/${editingId}`, formData);
      } else {
        await api.post('/ingredients', formData);
      }
      handleClose();
      fetchIngredientsRef();
    } catch (err) {
      console.error(err);
      alert('Error saving ingredient');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this ingredient?')) {
      try {
        await api.delete(`/ingredients/${id}`);
        fetchIngredientsRef();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Ingredients Management</Typography>
        <Button variant="contained" onClick={() => handleOpen()}>Add Ingredient</Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>INCI Name</TableCell>
              <TableCell>Common Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ingredients.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.inciName}</TableCell>
                <TableCell>{item.commonName}</TableCell>
                <TableCell>{item.category}</TableCell>
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
        <DialogTitle>{editingId ? 'Edit Ingredient' : 'Add Ingredient'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="INCI Name"
              value={formData.inciName}
              onChange={(e) => setFormData({ ...formData, inciName: e.target.value })}
              fullWidth
            />
            <TextField
              label="Common Name"
              value={formData.commonName}
              onChange={(e) => setFormData({ ...formData, commonName: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              fullWidth
            >
              {INGREDIENT_CATEGORIES.map(cat => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
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
