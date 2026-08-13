'use client';

import { Typography, Box, Button, TextField, IconButton, FormControl, InputLabel, Select, MenuItem, Paper, Tabs, Tab } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { OnboardingNavigation } from '@/components/onboarding/OnboardingNavigation';
import { useState } from 'react';
import api from '@/services/api';

const CATEGORIES = [
  'cleanser', 'toner', 'essence', 'serum', 'treatment', 
  'moisturizer', 'sunscreen', 'retinoid', 'exfoliant', 'face_oil', 'other'
];

interface RoutineStep {
  id: string;
  category: string;
  customProductName: string;
}

export default function RoutinePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0); // 0 = AM, 1 = PM
  
  const [amSteps, setAmSteps] = useState<RoutineStep[]>([]);
  const [pmSteps, setPmSteps] = useState<RoutineStep[]>([]);

  const handleAddStep = (isAm: boolean) => {
    const newStep = { id: crypto.randomUUID(), category: 'cleanser', customProductName: '' };
    if (isAm) {
      setAmSteps([...amSteps, newStep]);
    } else {
      setPmSteps([...pmSteps, newStep]);
    }
  };

  const handleRemoveStep = (isAm: boolean, id: string) => {
    if (isAm) {
      setAmSteps(amSteps.filter(s => s.id !== id));
    } else {
      setPmSteps(pmSteps.filter(s => s.id !== id));
    }
  };

  const handleStepChange = (isAm: boolean, id: string, field: keyof RoutineStep, value: string) => {
    if (isAm) {
      setAmSteps(amSteps.map(s => s.id === id ? { ...s, [field]: value } : s));
    } else {
      setPmSteps(pmSteps.map(s => s.id === id ? { ...s, [field]: value } : s));
    }
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      // Save AM
      const amData = amSteps.map((s, index) => ({
        category: s.category,
        customProductName: s.customProductName || 'Unknown Product',
        stepOrder: index + 1,
        frequency: 'daily'
      }));
      await api.post('/onboarding/routine', { routineType: 'morning', steps: amData });

      // Save PM
      const pmData = pmSteps.map((s, index) => ({
        category: s.category,
        customProductName: s.customProductName || 'Unknown Product',
        stepOrder: index + 1,
        frequency: 'daily'
      }));
      await api.post('/onboarding/routine', { routineType: 'evening', steps: pmData });

      router.push('/onboarding/review');
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const renderSteps = (isAm: boolean) => {
    const steps = isAm ? amSteps : pmSteps;
    
    if (steps.length === 0) {
      return (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            You don&apos;t have any products in your {isAm ? 'Morning' : 'Evening'} routine.
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => handleAddStep(isAm)}>
            Add Product
          </Button>
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {steps.map((step, index) => (
          <Paper key={step.id} variant="outlined" sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                {index + 1}
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={step.category}
                  label="Category"
                  onChange={(e) => handleStepChange(isAm, step.id, 'category', e.target.value)}
                >
                  {CATEGORIES.map(c => (
                    <MenuItem key={c} value={c}>
                      {c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small"
                fullWidth
                label="Product Name"
                placeholder="e.g. Cetaphil Gentle Cleanser"
                value={step.customProductName}
                onChange={(e) => handleStepChange(isAm, step.id, 'customProductName', e.target.value)}
              />
            </Box>
            <IconButton color="error" onClick={() => handleRemoveStep(isAm, step.id)}>
              <DeleteIcon />
            </IconButton>
          </Paper>
        ))}
        <Button 
          variant="text" 
          startIcon={<AddIcon />} 
          onClick={() => handleAddStep(isAm)}
          sx={{ alignSelf: 'flex-start' }}
        >
          Add Another Product
        </Button>
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <OnboardingProgress currentStep={8} totalSteps={8} />
      
      <Typography variant="h4" sx={{ fontFamily: '"DM Serif Display", serif', mb: 3 }}>
        What is your existing routine?
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        SkinAI should understand what you already use before recommending new products. It&apos;s okay if you don&apos;t use anything!
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label="Morning Routine" />
          <Tab label="Evening Routine" />
        </Tabs>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', pb: 2 }}>
        {tab === 0 ? renderSteps(true) : renderSteps(false)}
      </Box>

      <OnboardingNavigation 
        onBack={() => router.push('/onboarding/budget')}
        onContinue={handleContinue}
        continueText="Review Profile"
        isLoading={loading}
      />
    </Box>
  );
}
