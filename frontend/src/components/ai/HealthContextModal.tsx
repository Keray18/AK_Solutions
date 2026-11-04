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
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  HealthAndSafety as HealthIcon,
  Security as SecurityIcon,
  DeleteForever as DeleteIcon,
} from '@mui/icons-material';
import api from '@/services/api';

interface HealthContextModalProps {
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function HealthContextModal({ open, onClose, onUpdated }: HealthContextModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [allergies, setAllergies] = useState<string>('');
  const [medicalConditions, setMedicalConditions] = useState<string>('');
  const [currentMedications, setCurrentMedications] = useState<string>('');
  const [diagnosedSkinConditions, setDiagnosedSkinConditions] = useState<string>('');
  const [adverseReactions, setAdverseReactions] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadHealthContext = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.get('/ai/health-context');
      const data = res.data.data;
      if (data) {
        setConsentGiven(!!data.consentGiven);
        setAllergies(Array.isArray(data.allergies) ? data.allergies.join(', ') : '');
        setMedicalConditions(Array.isArray(data.medicalConditions) ? data.medicalConditions.join(', ') : '');
        setCurrentMedications(Array.isArray(data.currentMedications) ? data.currentMedications.join(', ') : '');
        setDiagnosedSkinConditions(Array.isArray(data.diagnosedSkinConditions) ? data.diagnosedSkinConditions.join(', ') : '');
        setAdverseReactions(Array.isArray(data.adverseReactions) ? data.adverseReactions.join(', ') : '');
      } else {
        setConsentGiven(false);
        setAllergies('');
        setMedicalConditions('');
        setCurrentMedications('');
        setDiagnosedSkinConditions('');
        setAdverseReactions('');
      }
    } catch (err: any) {
      console.error('Failed to load health context:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadHealthContext();
    }
  }, [open, loadHealthContext]);

  const parseArray = (str: string) => {
    return str
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/ai/health-context', {
        consentGiven,
        allergies: parseArray(allergies),
        medicalConditions: parseArray(medicalConditions),
        currentMedications: parseArray(currentMedications),
        diagnosedSkinConditions: parseArray(diagnosedSkinConditions),
        adverseReactions: parseArray(adverseReactions),
      });
      setMessage({ type: 'success', text: 'Health context saved securely.' });
      if (onUpdated) onUpdated();
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save health context.' });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to delete all stored health information and revoke consent?')) {
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await api.delete('/ai/health-context');
      setConsentGiven(false);
      setAllergies('');
      setMedicalConditions('');
      setCurrentMedications('');
      setDiagnosedSkinConditions('');
      setAdverseReactions('');
      setMessage({ type: 'success', text: 'Health context and consent permanently cleared.' });
      if (onUpdated) onUpdated();
    } catch {
      setMessage({ type: 'error', text: 'Failed to clear health context.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <HealthIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Consented Health Context
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2 }}>
        <Alert severity="info" icon={<SecurityIcon fontSize="inherit" />} sx={{ mb: 2.5, borderRadius: 2 }}>
          <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.5 }}>
            <strong>Privacy & Consent:</strong> SkinAI only accesses and evaluates sensitive health information (such
            as active medications, allergies, or diagnosed skin conditions) when you explicitly consent. This data is
            used exclusively to prevent ingredient contraindications and tailor advice. You may revoke consent and wipe
            this data at any time.
          </Typography>
        </Alert>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Enable Health Context for AI Consultations
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {consentGiven
                      ? 'Consent granted. AI Advisor will check your disclosed health factors for contraindications.'
                      : 'Consent disabled. AI Advisor will operate strictly on your general skin profile.'}
                  </Typography>
                </Box>
              }
            />

            <Divider sx={{ my: 1 }} />

            <TextField
              label="Known Allergies & Sensitivities"
              placeholder="e.g. Fragrance, Aspirin/Salicylates, Essential oils"
              helperText="Separate multiple values with commas"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              disabled={!consentGiven}
              fullWidth
              size="small"
            />

            <TextField
              label="Current Medications & Topical Treatments"
              placeholder="e.g. Tretinoin 0.05%, Oral Isotretinoin, Spironolactone"
              helperText="Prescription topicals and oral dermatological medications"
              value={currentMedications}
              onChange={(e) => setCurrentMedications(e.target.value)}
              disabled={!consentGiven}
              fullWidth
              size="small"
            />

            <TextField
              label="Diagnosed Skin Conditions"
              placeholder="e.g. Rosacea, Atopic Eczema, Seborrheic Dermatitis"
              helperText="Formally diagnosed conditions materially affecting product selection"
              value={diagnosedSkinConditions}
              onChange={(e) => setDiagnosedSkinConditions(e.target.value)}
              disabled={!consentGiven}
              fullWidth
              size="small"
            />

            <TextField
              label="Relevant Medical Conditions"
              placeholder="e.g. Pregnancy, Nursing, Thyroid disorder"
              helperText="Conditions affecting safe skincare ingredient usage"
              value={medicalConditions}
              onChange={(e) => setMedicalConditions(e.target.value)}
              disabled={!consentGiven}
              fullWidth
              size="small"
            />

            <TextField
              label="Reported Reactions to Skincare Products"
              placeholder="e.g. Burning with chemical sunscreens, breakout from high-linoleic oils"
              value={adverseReactions}
              onChange={(e) => setAdverseReactions(e.target.value)}
              disabled={!consentGiven}
              fullWidth
              size="small"
            />

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
          variant="text"
          startIcon={<DeleteIcon />}
          onClick={handleClear}
          disabled={saving || loading}
          size="small"
        >
          Clear Data & Revoke
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} color="inherit" disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" color="primary" disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save Health Context'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
