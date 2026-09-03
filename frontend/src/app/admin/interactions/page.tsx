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

const INTERACTION_TYPES = ['CONFLICT', 'CAUTION', 'SYNERGY', 'REDUNDANCY'];
const SEVERITY_LEVELS = ['HIGH', 'MEDIUM', 'LOW'];

interface Ingredient {
  id: string;
  inciName: string;
}

interface Interaction {
  id: string;
  ingredientAId: string;
  ingredientBId: string;
  interactionType?: string | null;
  severity?: string | null;
  explanation?: string | null;
  recommendation?: string | null;
}

export default function AdminInteractionsPage() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    ingredientAId: '',
    ingredientBId: '',
    interactionType: '',
    severity: '',
    explanation: '',
    recommendation: '',
  });

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const [intRes, ingRes] = await Promise.all([
          api.get('/interactions'), // Using public endpoint for listing
          api.get('/ingredients?limit=100') // Adjust limit if needed
        ]);
        if (mounted) {
          setInteractions(intRes.data.data.data);
          setIngredients(ingRes.data.data.data);
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
      const [intRes, ingRes] = await Promise.all([
        api.get('/interactions'),
        api.get('/ingredients?limit=100')
      ]);
      setInteractions(intRes.data.data.data);
      setIngredients(ingRes.data.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpen = (interaction?: Interaction) => {
    if (interaction) {
      setEditingId(interaction.id);
      setFormData({
        ingredientAId: interaction.ingredientAId,
        ingredientBId: interaction.ingredientBId,
        interactionType: interaction.interactionType || '',
        severity: interaction.severity || '',
        explanation: interaction.explanation || '',
        recommendation: interaction.recommendation || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        ingredientAId: '',
        ingredientBId: '',
        interactionType: '',
        severity: '',
        explanation: '',
        recommendation: '',
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
        await api.patch(`/interactions/${editingId}`, formData);
      } else {
        await api.post('/interactions', formData);
      }
      handleClose();
      fetchDataRef();
    } catch (err) {
      console.error(err);
      alert('Error saving interaction');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this interaction rule?')) {
      try {
        await api.delete(`/interactions/${id}`);
        fetchDataRef();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getIngredientName = (id: string) => {
    const ing = ingredients.find(i => i.id === id);
    return ing ? ing.inciName : id;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4">Interactions Management</Typography>
        <Button variant="contained" onClick={() => handleOpen()}>Add Rule</Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Ingredient A</TableCell>
              <TableCell>Ingredient B</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {interactions.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{getIngredientName(item.ingredientAId)}</TableCell>
                <TableCell>{getIngredientName(item.ingredientBId)}</TableCell>
                <TableCell>{item.interactionType}</TableCell>
                <TableCell>{item.severity}</TableCell>
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
        <DialogTitle>{editingId ? 'Edit Rule' : 'Add Rule'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              select
              label="Ingredient A"
              value={formData.ingredientAId}
              onChange={(e) => setFormData({ ...formData, ingredientAId: e.target.value })}
              fullWidth
            >
              {ingredients.map(ing => (
                <MenuItem key={ing.id} value={ing.id}>{ing.inciName}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Ingredient B"
              value={formData.ingredientBId}
              onChange={(e) => setFormData({ ...formData, ingredientBId: e.target.value })}
              fullWidth
            >
              {ingredients.map(ing => (
                <MenuItem key={ing.id} value={ing.id}>{ing.inciName}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Interaction Type"
              value={formData.interactionType}
              onChange={(e) => setFormData({ ...formData, interactionType: e.target.value })}
              fullWidth
            >
              {INTERACTION_TYPES.map(cat => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Severity"
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              fullWidth
            >
              {SEVERITY_LEVELS.map(cat => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Explanation"
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Recommendation"
              value={formData.recommendation}
              onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
              fullWidth
              multiline
              rows={2}
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
