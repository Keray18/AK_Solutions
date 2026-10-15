'use client';

import {
  Box,
  Typography,
  Container,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Chip,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  AutoAwesome as SparklesIcon,
  EventNote as RoutineIcon,
  Science as ScienceIcon,
  Psychology as AiIcon,
  ArrowForward as ArrowForwardIcon,
  WarningAmber as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useAuthStore } from '@/stores/authStore';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';

interface SkinProfileData {
  skinProfile: {
    skinType: string;
    sensitivity: string;
  };
  concerns: { priority: string; concernType: string }[];
  routines: { id: string; routineType: string; stepCount: number }[];
}

interface ScoreCategory {
  score: number;
  max: number;
  reasons?: string[];
}

interface RoutineAnalysis {
  id: string;
  routineId: string;
  overallScore: number;
  confidence: string;
  isStale?: boolean;
  breakdown?: {
    compatibility?: ScoreCategory | number;
    structure?: ScoreCategory | number;
    concernCoverage?: ScoreCategory | number;
    simplicity?: ScoreCategory | number;
    usage?: ScoreCategory | number;
  };
  issues?: any[];
}

const getCategoryPct = (cat: any): number => {
  if (!cat) return 100;
  if (typeof cat === 'number') return Math.min(100, Math.max(0, Math.round(cat)));
  if (typeof cat.score === 'number' && typeof cat.max === 'number' && cat.max > 0) {
    return Math.min(100, Math.max(0, Math.round((cat.score / cat.max) * 100)));
  }
  return 100;
};

interface RecommendationSummary {
  id: string;
  recommendationType: string;
  summary: string;
  confidence: string;
  overallScore?: number;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SkinProfileData | null>(null);
  const [analyses, setAnalyses] = useState<Record<string, RoutineAnalysis | null>>({});
  const [recommendations, setRecommendations] = useState<RecommendationSummary[]>([]);
  const [analyzingRoutineId, setAnalyzingRoutineId] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const { data: profileRes } = await api.get('/skin-profile');
      setProfile(profileRes.data);

      // Fetch analyses for user's routines
      if (profileRes.data?.routines && profileRes.data.routines.length > 0) {
        const analysesMap: Record<string, RoutineAnalysis | null> = {};
        for (const r of profileRes.data.routines) {
          try {
            const { data: analysisRes } = await api.get(`/routines/${r.id}/analysis`);
            if (analysisRes.data && !analysisRes.data.analysisUnavailable) {
              analysesMap[r.id] = analysisRes.data;
            } else {
              analysesMap[r.id] = null;
            }
          } catch {
            analysesMap[r.id] = null;
          }
        }
        setAnalyses(analysesMap);
      }

      // Fetch user recommendations
      try {
        const { data: recsRes } = await api.get('/recommendations');
        setRecommendations((recsRes.data || []).slice(0, 3));
      } catch {
        setRecommendations([]);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRunAnalysis = async (routineId: string) => {
    setAnalyzingRoutineId(routineId);
    try {
      const { data } = await api.post(`/routines/${routineId}/analyze`);
      setAnalyses((prev) => ({ ...prev, [routineId]: data.data }));
    } catch (err) {
      console.error('Failed to analyze routine:', err);
    } finally {
      setAnalyzingRoutineId(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const primaryConcern = profile?.concerns?.find((c) => c.priority.toLowerCase() === 'primary');
  const secondaryConcerns = profile?.concerns?.filter((c) => c.priority.toLowerCase() === 'secondary') || [];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Top Greeting & Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: '"DM Serif Display", serif', fontWeight: 600 }}>
            Welcome back, {user?.name?.split(' ')[0] || 'there'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your personalized, evidence-grounded skincare decision center.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<RoutineIcon />}
            onClick={() => router.push('/routines')}
            size="small"
            sx={{ borderRadius: 3 }}
          >
            My Routines
          </Button>
          <Button
            variant="outlined"
            startIcon={<ScienceIcon />}
            onClick={() => router.push('/products')}
            size="small"
            sx={{ borderRadius: 3 }}
          >
            Catalog
          </Button>
          <Button
            variant="contained"
            startIcon={<AiIcon />}
            onClick={() => router.push('/ai')}
            size="small"
            sx={{ borderRadius: 3 }}
          >
            Ask AI Assistant
          </Button>
        </Box>
      </Box>

      {!profile ? (
        <Alert severity="warning" sx={{ borderRadius: 3 }}>
          Please complete your onboarding to see your profile summary.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {/* Skin Profile Summary Card */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3.5,
                borderRadius: 4,
                height: '100%',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Skin Profile
                  </Typography>
                  <Chip
                    label={`${profile.skinProfile.skinType.toUpperCase()} SKIN`}
                    color="primary"
                    variant="filled"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Sensitivity Level:{' '}
                  <Typography component="span" variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize', color: 'text.primary' }}>
                    {profile.skinProfile.sensitivity}
                  </Typography>
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                  PRIMARY CONCERN
                </Typography>
                {primaryConcern ? (
                  <Chip
                    label={primaryConcern.concernType.replace(/_/g, ' ').toUpperCase()}
                    color="secondary"
                    sx={{ fontWeight: 600, mb: 2.5 }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>None recorded</Typography>
                )}

                {secondaryConcerns.length > 0 && (
                  <>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5, display: 'block', mb: 1 }}>
                      SECONDARY CONCERNS
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      {secondaryConcerns.map((c, i) => (
                        <Chip
                          key={i}
                          label={c.concernType.replace(/_/g, ' ')}
                          variant="outlined"
                          size="small"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      ))}
                    </Box>
                  </>
                )}
              </Box>

              <Button
                variant="text"
                endIcon={<ArrowForwardIcon />}
                onClick={() => router.push('/profile')}
                sx={{ alignSelf: 'flex-start', mt: 2, px: 0 }}
              >
                Edit Skin Profile
              </Button>
            </Paper>
          </Grid>

          {/* Routine & Routine Analysis Card */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3.5,
                borderRadius: 4,
                height: '100%',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Active Routines & Analysis
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => router.push('/routines')}
                  sx={{ borderRadius: 2 }}
                >
                  Manage Routines
                </Button>
              </Box>

              {profile.routines.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    No routines created yet. Build your morning or evening routine to check for ingredient conflicts.
                  </Typography>
                  <Button variant="contained" onClick={() => router.push('/routines')} sx={{ borderRadius: 3 }}>
                    Create Routine
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  {profile.routines.map((r) => {
                    const analysis = analyses[r.id];
                    const isAnalyzing = analyzingRoutineId === r.id;

                    return (
                      <Paper
                        key={r.id}
                        variant="outlined"
                        sx={{ p: 2.5, borderRadius: 3, bgcolor: 'background.default' }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                              {r.routineType} Routine
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {r.stepCount} product{r.stepCount === 1 ? '' : 's'} included
                            </Typography>
                          </Box>

                          {analysis ? (
                            <Box sx={{ textAlign: 'right' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="h5" sx={{ fontWeight: 700, color: analysis.overallScore >= 70 ? 'success.main' : 'warning.main' }}>
                                  {analysis.overallScore}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">/100</Typography>
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                Health Score
                              </Typography>
                            </Box>
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              disabled={isAnalyzing}
                              onClick={() => handleRunAnalysis(r.id)}
                              startIcon={isAnalyzing ? <CircularProgress size={14} /> : <SparklesIcon />}
                            >
                              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
                            </Button>
                          )}
                        </Box>

                        {/* Analysis Breakdown Bars if available */}
                        {analysis && (
                          <Box sx={{ mt: 2 }}>
                            {analysis.isStale && (
                              <Alert
                                severity="info"
                                icon={<WarningIcon fontSize="small" />}
                                sx={{ py: 0.5, mb: 1.5, borderRadius: 2 }}
                                action={
                                  <Button
                                    color="inherit"
                                    size="small"
                                    startIcon={<RefreshIcon />}
                                    disabled={isAnalyzing}
                                    onClick={() => handleRunAnalysis(r.id)}
                                  >
                                    Re-analyze
                                  </Button>
                                }
                              >
                                Routine modified since last analysis
                              </Alert>
                            )}

                            {analysis.breakdown && (
                              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                                <Grid size={{ xs: 6 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    Compatibility: {getCategoryPct(analysis.breakdown.compatibility)}%
                                  </Typography>
                                  <LinearProgress
                                    variant="determinate"
                                    value={getCategoryPct(analysis.breakdown.compatibility)}
                                    sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                                    color={getCategoryPct(analysis.breakdown.compatibility) < 70 ? 'warning' : 'primary'}
                                  />
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    Simplicity: {getCategoryPct(analysis.breakdown.simplicity)}%
                                  </Typography>
                                  <LinearProgress
                                    variant="determinate"
                                    value={getCategoryPct(analysis.breakdown.simplicity)}
                                    sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                                    color="primary"
                                  />
                                </Grid>
                              </Grid>
                            )}

                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => router.push(`/routines/${r.id}/analysis`)}
                                sx={{ px: 1, py: 0.5 }}
                              >
                                Detailed Breakdown &rarr;
                              </Button>
                              <Button
                                size="small"
                                variant="text"
                                color="secondary"
                                onClick={() => router.push(`/routines/${r.id}/optimize`)}
                                sx={{ px: 1, py: 0.5 }}
                              >
                                Optimize Routine &rarr;
                              </Button>
                            </Box>
                          </Box>
                        )}
                      </Paper>
                    );
                  })}
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Recent Recommendations */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3.5,
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Personalized Recommendations
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Deterministic fit assessment based on your skin profile & routine chemistry.
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => router.push('/recommendations')}
                  sx={{ borderRadius: 2 }}
                >
                  View All
                </Button>
              </Box>

              {recommendations.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, bgcolor: 'background.default', borderRadius: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    No product recommendations generated yet. Request a replacement or discovery recommendation.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<SparklesIcon />}
                    onClick={() => router.push('/recommendations')}
                    sx={{ borderRadius: 3 }}
                  >
                    Generate Recommendations
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {recommendations.map((rec) => (
                    <Paper
                      key={rec.id}
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        cursor: 'pointer',
                        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                        transition: 'all 0.2s',
                      }}
                      onClick={() => router.push(`/recommendations/${rec.id}`)}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                          {rec.recommendationType.replace(/_/g, ' ')}
                        </Typography>
                        <Chip
                          label={rec.confidence}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {rec.summary}
                      </Typography>
                      <Typography variant="caption" color="primary" sx={{ fontWeight: 600 }}>
                        View Details &rarr;
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Trust First Banner */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3.5,
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'primary.50',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <CheckCircleIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                    Trust First
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, mb: 2 }}>
                  SkinAI is a neutral decision engine, not a storefront. We will advise keeping your existing product or buying nothing whenever no alternative is genuinely superior.
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                  Have questions about active ingredients or layering safety?
                </Typography>
              </Box>

              <Button
                variant="contained"
                color="primary"
                startIcon={<AiIcon />}
                onClick={() => router.push('/ai')}
                sx={{ mt: 3, borderRadius: 3 }}
              >
                Ask Skincare Advisor
              </Button>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Container>
  );
}
