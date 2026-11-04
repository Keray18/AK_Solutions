'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Typography,
  Box,
  Container,
  Paper,
  Grid,
  CircularProgress,
  Button,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckIcon,
  Add as AddIcon,
  Science as ScienceIcon,
  AutoAwesome as SparklesIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { recommendationService } from '@/services/recommendation.service';
import api from '@/services/api';

export default function RecommendationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [detail, setDetail] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRoutines, setUserRoutines] = useState<any[]>([]);

  // Add to routine modal state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [targetRoutineId, setTargetRoutineId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      try {
        const res = await recommendationService.getRecommendationById(id);
        setDetail(res.data);
      } catch (err) {
        console.error('Failed to fetch recommendation detail', err);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchRoutines = async () => {
      try {
        const res = await api.get('/routines');
        const list = res.data?.data || res.data || [];
        setUserRoutines(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Failed to fetch user routines', err);
      }
    };

    fetchDetail();
    fetchRoutines();
  }, [id]);

  const handleOpenAddDialog = (item: any) => {
    setSelectedItem(item);
    // Auto-select morning or evening based on category or default to first
    const cat = item.product?.category?.toLowerCase() || '';
    if (cat === 'sunscreen') {
      const am = userRoutines.find((r) => r.routineType === 'morning');
      setTargetRoutineId(am ? am.id : userRoutines[0]?.id || '');
    } else if (cat === 'retinoid' || cat === 'exfoliant') {
      const pm = userRoutines.find((r) => r.routineType === 'evening');
      setTargetRoutineId(pm ? pm.id : userRoutines[0]?.id || '');
    } else {
      setTargetRoutineId(userRoutines[0]?.id || '');
    }
    setAddDialogOpen(true);
  };

  const handleConfirmAdd = async () => {
    if (!targetRoutineId || !selectedItem) return;
    setIsAdding(true);
    try {
      const routine = userRoutines.find((r) => r.id === targetRoutineId);
      const stepOrder = (routine?.steps?.length || 0) + 1;
      const category = selectedItem.product?.category || 'other';

      // 1. Add step to routine
      await api.post(`/routines/${targetRoutineId}/steps`, {
        productId: selectedItem.productId,
        category,
        stepOrder,
        frequency: 'daily',
      });

      // 2. Trigger fresh analysis
      try {
        await api.post(`/routines/${targetRoutineId}/analyze`);
      } catch {
        // Analysis error non-blocking
      }

      const routineTypeName = routine?.routineType ? routine.routineType.toUpperCase() : 'YOUR';
      setSuccessMessage(
        `Added "${selectedItem.product?.name || 'Product'}" to your ${routineTypeName} routine! Health score updated.`
      );
      setAddDialogOpen(false);

      // Refresh routines list
      const res = await api.get('/routines');
      setUserRoutines(res.data?.data || res.data || []);
    } catch (err: any) {
      console.error('Failed to add product to routine:', err);
      alert(err.response?.data?.error?.message || 'Failed to add product to routine. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 12, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading evidence-grounded recommendation...
        </Typography>
      </Container>
    );
  }

  if (!detail) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Recommendation not found or belongs to another user.
        </Alert>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => router.push('/recommendations')}>
          Back to Recommendations
        </Button>
      </Container>
    );
  }

  const getFitLabel = (score: number) => {
    if (score >= 85) return 'Strong fit';
    if (score >= 70) return 'Good fit';
    if (score >= 55) return 'Possible fit';
    return 'Weak fit';
  };

  const getActionColor = (action: string) => {
    switch (action?.toLowerCase()) {
      case 'add':
        return 'success';
      case 'replace':
        return 'secondary';
      case 'keep':
        return 'info';
      case 'remove':
        return 'error';
      default:
        return 'primary';
    }
  };

  const getActionTitle = (action: string) => {
    switch (action?.toLowerCase()) {
      case 'add':
        return 'Recommended Addition';
      case 'replace':
        return 'Recommended Replacement';
      case 'keep':
        return 'Keep Current Product';
      case 'remove':
        return 'Consider Removing';
      default:
        return action;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4, pb: 12 }}>
      {/* Back button */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="text"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/recommendations')}
          sx={{ color: 'text.secondary', px: 0 }}
        >
          Back to Recommendations
        </Button>
      </Box>

      {/* Success Notification */}
      {successMessage && (
        <Alert
          severity="success"
          icon={<CheckIcon fontSize="inherit" />}
          sx={{ mb: 4, borderRadius: 3 }}
          onClose={() => setSuccessMessage(null)}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => router.push('/routines')}
            >
              View Routines
            </Button>
          }
        >
          {successMessage}
        </Alert>
      )}

      {/* Decision Summary Card */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
          mb: 4,
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="overline" sx={{ fontWeight: 700, color: 'primary.main', letterSpacing: 1 }}>
              SKINAI DECISION ENGINE
            </Typography>
            <Typography variant="h4" sx={{ fontFamily: '"DM Serif Display", serif', fontWeight: 600 }}>
              {detail.recommendationType?.replace(/_/g, ' ').toUpperCase() || 'RECOMMENDATION'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Generated on {new Date(detail.createdAt).toLocaleDateString(undefined, { dateStyle: 'full' })}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={`Confidence: ${detail.confidence || 'HIGH'}`}
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
            {detail.overallScore && (
              <Chip
                label={`Fit Score: ${detail.overallScore}/100`}
                color="success"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>
        </Box>

        <Typography variant="body1" sx={{ color: 'text.primary', lineHeight: 1.7, mb: 1.5 }}>
          {detail.summary}
        </Typography>
      </Paper>

      {/* Recommended Products / Actions Section */}
      <Typography variant="h5" sx={{ fontFamily: '"DM Serif Display", serif', fontWeight: 600, mb: 3 }}>
        Recommended Products & Actions
      </Typography>

      <Grid container spacing={3}>
        {detail.items?.map((item: any, idx: number) => {
          const product = item.product;
          const brandName = product?.brand?.name || null;
          const productName = product?.name || (item.productId ? `Product (${item.productId.slice(0, 8)})` : 'Product Recommendation');
          const category = product?.category ? product.category.replace(/_/g, ' ').toUpperCase() : null;
          const price = product?.price ? `${product.currency === 'INR' || !product.currency ? '₹' : '$'}${product.price}` : null;
          const isAddOrReplace = item.action === 'add' || item.action === 'replace';

          return (
            <Grid size={{ xs: 12 }} key={item.id || idx}>
              <Paper
                elevation={0}
                sx={{
                  p: 3.5,
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderLeft: '5px solid',
                  borderLeftColor: `${getActionColor(item.action)}.main`,
                  bgcolor: 'background.paper',
                  transition: 'box-shadow 0.2s',
                  '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.06)' },
                }}
              >
                {/* Top Action & Score Bar */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Chip
                      label={getActionTitle(item.action)}
                      color={getActionColor(item.action) as any}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                    {category && (
                      <Chip
                        label={category}
                        variant="outlined"
                        size="small"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    )}
                  </Box>

                  {item.score && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {getFitLabel(item.score)}
                      </Typography>
                      <Chip
                        label={`${item.score}/100`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                  )}
                </Box>

                {/* Brand & Product Title (Never a UUID!) */}
                <Box sx={{ mb: 2 }}>
                  {brandName && (
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {brandName}
                    </Typography>
                  )}
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                    {productName}
                  </Typography>
                  {price && (
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      {price} {product?.size ? `• ${product.size}` : ''}
                    </Typography>
                  )}
                </Box>

                {/* Description */}
                {product?.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                    {product.description}
                  </Typography>
                )}

                {/* Skin Type & Concern Suitability */}
                {((product?.skinTypeSuitability && product.skinTypeSuitability.length > 0) ||
                  (product?.concernSuitability && product.concernSuitability.length > 0)) && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {product.skinTypeSuitability?.map((st: string) => (
                      <Chip
                        key={st}
                        label={`${st} skin`}
                        size="small"
                        sx={{ bgcolor: 'grey.100', fontSize: '0.75rem', textTransform: 'capitalize' }}
                      />
                    ))}
                    {product.concernSuitability?.map((c: string) => (
                      <Chip
                        key={c}
                        label={c.replace(/_/g, ' ')}
                        size="small"
                        color="secondary"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem', textTransform: 'capitalize' }}
                      />
                    ))}
                  </Box>
                )}

                {/* Key Ingredients */}
                {product?.ingredients && product.ingredients.length > 0 && (
                  <Box sx={{ mb: 2.5, p: 2, bgcolor: 'background.default', borderRadius: 2.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                      <ScienceIcon sx={{ fontSize: 14 }} /> KEY ACTIVE INGREDIENTS:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {product.ingredients.map((ing: any, iIdx: number) => (
                        <Chip
                          key={iIdx}
                          label={ing.inciName || ing.commonName}
                          size="small"
                          variant="filled"
                          sx={{ bgcolor: 'white', border: '1px solid', borderColor: 'divider', fontSize: '0.75rem' }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                {/* Recommendation Reason & Action Buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ maxWidth: '75%' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block' }}>
                      WHY THIS WAS SELECTED
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.5 }}>
                      {item.reason}
                    </Typography>
                  </Box>

                  {isAddOrReplace && (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenAddDialog(item)}
                      sx={{ borderRadius: 2.5, px: 2.5, whiteSpace: 'nowrap' }}
                    >
                      Add to Routine
                    </Button>
                  )}
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* Add To Routine Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Add to Routine
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose which routine to add <strong>{selectedItem?.product?.name || 'this product'}</strong> to:
          </Typography>

          {userRoutines.length === 0 ? (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              No routines created yet. Please create a Morning or Evening routine in the Routines dashboard first.
            </Alert>
          ) : (
            <RadioGroup
              value={targetRoutineId}
              onChange={(e) => setTargetRoutineId(e.target.value)}
            >
              {userRoutines.map((r) => (
                <FormControlLabel
                  key={r.id}
                  value={r.id}
                  control={<Radio color="primary" />}
                  label={
                    <Box sx={{ py: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                        {r.name || `${r.routineType} Routine`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.steps?.length || 0} existing product{(r.steps?.length || 0) === 1 ? '' : 's'}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </RadioGroup>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleConfirmAdd}
            disabled={!targetRoutineId || isAdding || userRoutines.length === 0}
            startIcon={isAdding ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
            sx={{ borderRadius: 2 }}
          >
            {isAdding ? 'Adding...' : 'Confirm & Re-analyze'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
