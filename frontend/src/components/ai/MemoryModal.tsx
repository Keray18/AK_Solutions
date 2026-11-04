'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Psychology as MemoryIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import api from '@/services/api';

interface MemoryModalProps {
  open: boolean;
  onClose: () => void;
  onCleared?: () => void;
}

export default function MemoryModal({ open, onClose, onCleared }: MemoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [memory, setMemory] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadMemory = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.get('/ai/memory');
      setMemory(res.data.data);
    } catch (err: any) {
      console.error('Failed to load memory:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadMemory();
    }
  }, [open, loadMemory]);

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to erase all conversational memory? SkinAI will forget past conversation summaries and reported preferences.')) {
      return;
    }
    setClearing(true);
    setMessage(null);
    try {
      await api.delete('/ai/memory');
      setMemory(null);
      setMessage({ type: 'success', text: 'Conversational memory cleared successfully.' });
      if (onCleared) onCleared();
    } catch {
      setMessage({ type: 'error', text: 'Failed to clear memory.' });
    } finally {
      setClearing(false);
    }
  };

  const hasMemory =
    memory &&
    (memory.memorySummary ||
      (memory.avoidedIngredients && memory.avoidedIngredients.length > 0) ||
      (memory.productOutcomes && memory.productOutcomes.length > 0) ||
      (memory.preferences && Object.keys(memory.preferences).length > 0));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <MemoryIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Conversational Memory & Continuity
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          SkinAI synthesizes a compact long-term memory of your discussions so you can return without repeating
          yourself. Memory preserves stated preferences, avoided ingredients, and outcomes you report.
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : !hasMemory ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            No conversational memory has been recorded yet. As you ask questions and report outcomes, key preferences
            will be summarized here.
          </Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {memory.memorySummary && (
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', display: 'block', mb: 0.5 }}>
                  SUMMARY OF DISCUSSIONS:
                </Typography>
                <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                  {memory.memorySummary}
                </Typography>
              </Box>
            )}

            {memory.avoidedIngredients && memory.avoidedIngredients.length > 0 && (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
                  AVOIDED INGREDIENTS RECORDED:
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                  {memory.avoidedIngredients.map((ing: string, i: number) => (
                    <Chip key={i} label={ing} size="small" color="error" variant="outlined" />
                  ))}
                </Box>
              </Box>
            )}

            {memory.productOutcomes && memory.productOutcomes.length > 0 && (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
                  REPORTED PRODUCT EXPERIENCES:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {memory.productOutcomes.map((po: any, i: number) => (
                    <Box key={i} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {po.productName || 'Product'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {po.outcome}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {message && (
              <Alert severity={message.type} sx={{ borderRadius: 2 }}>
                {message.text}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button
          color="error"
          variant="outlined"
          startIcon={<DeleteIcon />}
          onClick={handleClear}
          disabled={clearing || loading || !hasMemory}
          size="small"
        >
          Clear Memory
        </Button>
        <Button onClick={onClose} variant="contained" color="primary">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
