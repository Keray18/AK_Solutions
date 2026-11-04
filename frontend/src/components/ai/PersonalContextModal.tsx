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
  CircularProgress,
  Chip,
  Grid,
  Paper,
} from '@mui/material';
import {
  Person as PersonIcon,
  EventNote as RoutineIcon,
  HealthAndSafety as HealthIcon,
  Psychology as MemoryIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import api from '@/services/api';

interface PersonalContextModalProps {
  open: boolean;
  onClose: () => void;
  onOpenHealth: () => void;
  onOpenMemory: () => void;
}

export default function PersonalContextModal({
  open,
  onClose,
  onOpenHealth,
  onOpenMemory,
}: PersonalContextModalProps) {
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<any>(null);

  const loadContext = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/ai/personal-context');
      setContext(res.data.data);
    } catch (err: any) {
      console.error('Failed to load personal context:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadContext();
    }
  }, [open, loadContext]);

  const profile = context?.profile;
  const routine = context?.routine;
  const health = context?.healthContext;
  const memory = context?.memory;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <PersonIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Your Skincare Identity & Personal Context
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          SkinAI never uses canned responses. Every consultation synthesizes your live skin profile, active routines,
          consented health data, and long-term memory.
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Grid container spacing={2.5}>
            {/* Profile Card */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <PersonIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    SKIN CHARACTERISTICS
                  </Typography>
                </Box>
                {profile ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Skin Type:
                      </Typography>
                      <Chip label={profile.skinType || 'Not set'} size="small" color="primary" variant="outlined" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Sensitivity:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                        {profile.sensitivityLevel || 'None'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Primary Concern:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                        {profile.primaryConcern || 'General'}
                      </Typography>
                    </Box>
                    {profile.secondaryConcerns && profile.secondaryConcerns.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Secondary Concerns:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {profile.secondaryConcerns.map((c: string, idx: number) => (
                            <Chip key={idx} label={c} size="small" variant="filled" sx={{ textTransform: 'capitalize' }} />
                          ))}
                        </Box>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Budget & Climate:
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {profile.currency || 'INR'} {profile.budgetLimit || 'Flexible'} • {profile.climate || 'Temperate'}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No skin profile found. Complete onboarding or visit your profile page.
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Routine Card */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <RoutineIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    ACTIVE ROUTINES & PRODUCTS
                  </Typography>
                </Box>
                {routine && routine.hasRoutine ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip label={`${routine.activeRoutines?.length || 0} Active Routines`} size="small" color="success" />
                      <Chip label={`${routine.totalSteps || 0} Total Steps`} size="small" variant="outlined" />
                    </Box>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Products in Daily Regimen:
                      </Typography>
                      {routine.currentProducts && routine.currentProducts.length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {routine.currentProducts.slice(0, 4).map((p: any, idx: number) => (
                            <Typography key={idx} variant="caption" sx={{ fontWeight: 500 }}>
                              • {p.brand} {p.name} ({p.stepType})
                            </Typography>
                          ))}
                          {routine.currentProducts.length > 4 && (
                            <Typography variant="caption" color="text.secondary">
                              + {routine.currentProducts.length - 4} more products
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          No products mapped yet.
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No active routine loaded. SkinAI will suggest building a foundational routine.
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Health Context Summary */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  height: '100%',
                  bgcolor: health?.consentGiven ? 'primary.50' : 'background.paper',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HealthIcon color={health?.consentGiven ? 'primary' : 'disabled'} fontSize="small" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      HEALTH CONTEXT
                    </Typography>
                  </Box>
                  <Button size="small" onClick={onOpenHealth}>
                    Manage
                  </Button>
                </Box>
                {health?.consentGiven ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CheckIcon color="success" sx={{ fontSize: 16 }} />
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.dark' }}>
                        Consent Active — Contraindication protection enabled
                      </Typography>
                    </Box>
                    {health.allergies?.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        <strong>Allergies:</strong> {health.allergies.join(', ')}
                      </Typography>
                    )}
                    {health.currentMedications?.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        <strong>Medications:</strong> {health.currentMedications.join(', ')}
                      </Typography>
                    )}
                    {health.medicalConditions?.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        <strong>Conditions:</strong> {health.medicalConditions.join(', ')}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Consent not provided. AI Advisor does not access or store sensitive health factors.
                    </Typography>
                    <Button size="small" variant="outlined" color="primary" onClick={onOpenHealth}>
                      Enable Health Protections
                    </Button>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Memory Card */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MemoryIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      LONG-TERM MEMORY
                    </Typography>
                  </Box>
                  <Button size="small" onClick={onOpenMemory}>
                    Inspect
                  </Button>
                </Box>
                {memory?.memorySummary ? (
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', lineHeight: 1.5 }}>
                    {memory.memorySummary}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No past conversation memories recorded yet.
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
