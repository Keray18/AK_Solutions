'use client';

import React, { useState, useEffect } from 'react';
import { 
  Typography, Box, Container, Paper, CircularProgress, 
  Button, TextField, Alert, useTheme, useMediaQuery,
  Card, CardContent, Divider
} from '@mui/material';
import { recommendationService } from '@/services/recommendation.service';

export default function CompareProductsPage() {
  const [productIdsInput, setProductIdsInput] = useState<string>('');
  const [comparison, setComparison] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleCompare = async () => {
    setIsLoading(true);
    setError(null);
    setComparison(null);

    const ids = productIdsInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
    if (ids.length < 2) {
      setError("Please enter at least 2 product IDs, separated by commas.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await recommendationService.compareProducts(ids);
      setComparison(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Failed to compare products");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h4" sx={{ fontFamily: '"DM Serif Display", serif', mb: 4 }}>
        Compare Products
      </Typography>

      <Paper elevation={0} sx={{ p: 4, mb: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body1" sx={{ mb: 2 }}>Enter 2-4 Product UUIDs (comma separated):</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField 
            fullWidth 
            label="Product IDs" 
            variant="outlined" 
            value={productIdsInput}
            onChange={(e) => setProductIdsInput(e.target.value)}
            placeholder="e.g. 123e4567-..., 987b6543-..."
            sx={{ flexGrow: 1 }}
          />
          <Button 
            variant="contained" 
            onClick={handleCompare} 
            disabled={isLoading || productIdsInput.length < 10}
            sx={{ minWidth: 150 }}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Run Comparison'}
          </Button>
        </Box>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </Paper>

      {comparison && (
        <Box>
          <Alert severity="info" sx={{ mb: 4, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>SkinAI Decision:</Typography>
            <Typography>{comparison.decision}</Typography>
          </Alert>

          {isMobile ? (
            // Mobile Responsive View (Cards)
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {comparison.scores.map((scoreObj: any, index: number) => (
                <Card key={index} variant="outlined" sx={{ borderRadius: 4 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} color="primary.main" gutterBottom>
                      Product {index + 1}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 2 }}>
                      ID: {scoreObj.productId}
                    </Typography>
                    
                    <Typography variant="subtitle2">Total Score: {scoreObj.totalScore}/100</Typography>
                    <Typography variant="subtitle2">Confidence: {scoreObj.confidence}</Typography>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="body2"><strong>Skin Fit:</strong> {scoreObj.breakdown.skinFit}</Typography>
                    <Typography variant="body2"><strong>Concern Relevance:</strong> {scoreObj.breakdown.concernRelevance}</Typography>
                    <Typography variant="body2"><strong>Compatibility:</strong> {scoreObj.breakdown.routineCompatibility}</Typography>
                    <Typography variant="body2"><strong>Evidence:</strong> {scoreObj.breakdown.evidence}</Typography>
                    <Typography variant="body2"><strong>Budget Fit:</strong> {scoreObj.breakdown.budgetFit}</Typography>
                    <Typography variant="body2"><strong>Simplicity:</strong> {scoreObj.breakdown.simplicity}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            // Desktop Table View
            <Paper elevation={0} sx={{ overflowX: 'auto', borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <Box component="thead">
                  <Box component="tr" sx={{ bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box component="th" sx={{ p: 2, fontWeight: 700 }}>Feature</Box>
                    {comparison.scores.map((s: any, i: number) => (
                      <Box component="th" key={i} sx={{ p: 2, fontWeight: 700 }}>Product {i + 1}</Box>
                    ))}
                  </Box>
                </Box>
                <Box component="tbody">
                  <Box component="tr" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box component="td" sx={{ p: 2, fontWeight: 600 }}>Product ID</Box>
                    {comparison.scores.map((s: any, i: number) => (
                      <Box component="td" key={i} sx={{ p: 2 }}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>{s.productId}</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Box component="tr" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box component="td" sx={{ p: 2, fontWeight: 600, color: 'primary.main' }}>SkinAI Fit Score</Box>
                    {comparison.scores.map((s: any, i: number) => (
                      <Box component="td" key={i} sx={{ p: 2, fontWeight: 700 }}>{s.totalScore}/100</Box>
                    ))}
                  </Box>
                  <Box component="tr" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box component="td" sx={{ p: 2, fontWeight: 600 }}>Confidence</Box>
                    {comparison.scores.map((s: any, i: number) => (
                      <Box component="td" key={i} sx={{ p: 2 }}>{s.confidence}</Box>
                    ))}
                  </Box>
                  <Box component="tr" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box component="td" sx={{ p: 2, fontWeight: 600 }}>Skin Fit Points</Box>
                    {comparison.scores.map((s: any, i: number) => (
                      <Box component="td" key={i} sx={{ p: 2 }}>{s.breakdown.skinFit}</Box>
                    ))}
                  </Box>
                  <Box component="tr" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box component="td" sx={{ p: 2, fontWeight: 600 }}>Concern Relevance</Box>
                    {comparison.scores.map((s: any, i: number) => (
                      <Box component="td" key={i} sx={{ p: 2 }}>{s.breakdown.concernRelevance}</Box>
                    ))}
                  </Box>
                  <Box component="tr" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box component="td" sx={{ p: 2, fontWeight: 600 }}>Routine Compatibility</Box>
                    {comparison.scores.map((s: any, i: number) => (
                      <Box component="td" key={i} sx={{ p: 2 }}>{s.breakdown.routineCompatibility}</Box>
                    ))}
                  </Box>
                  <Box component="tr" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box component="td" sx={{ p: 2, fontWeight: 600 }}>Evidence Quality</Box>
                    {comparison.scores.map((s: any, i: number) => (
                      <Box component="td" key={i} sx={{ p: 2 }}>{s.breakdown.evidence}</Box>
                    ))}
                  </Box>
                  <Box component="tr">
                    <Box component="td" sx={{ p: 2, fontWeight: 600 }}>Budget Fit</Box>
                    {comparison.scores.map((s: any, i: number) => (
                      <Box component="td" key={i} sx={{ p: 2 }}>{s.breakdown.budgetFit}</Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </Paper>
          )}
        </Box>
      )}
    </Container>
  );
}
