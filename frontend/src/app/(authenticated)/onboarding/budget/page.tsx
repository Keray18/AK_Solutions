'use client';

import { Typography, Box, FormControl, InputLabel, Select, MenuItem, InputAdornment, OutlinedInput } from '@mui/material';
import { useRouter } from 'next/navigation';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { OnboardingNavigation } from '@/components/onboarding/OnboardingNavigation';
import { useState } from 'react';
import api from '@/services/api';

export default function BudgetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState('INR');
  const [amount, setAmount] = useState('');
  const [flexibility, setFlexibility] = useState('flexible');

  const handleContinue = async () => {
    setLoading(true);
    try {
      await api.post('/onboarding/budget', {
        monthlyBudget: amount ? parseFloat(amount) : undefined,
        currency,
        budgetFlexibility: flexibility,
      });
      router.push('/onboarding/routine');
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <OnboardingProgress currentStep={7} totalSteps={8} />
      
      <Typography variant="h4" sx={{ fontFamily: '"DM Serif Display", serif', mb: 3 }}>
        What is your monthly skincare budget?
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        We prioritize optimizing what you already have, but this helps if we recommend new products.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl sx={{ width: 120 }}>
          <InputLabel>Currency</InputLabel>
          <Select
            value={currency}
            label="Currency"
            onChange={(e) => setCurrency(e.target.value)}
          >
            <MenuItem value="INR">INR (₹)</MenuItem>
            <MenuItem value="USD">USD ($)</MenuItem>
            <MenuItem value="KRW">KRW (₩)</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel htmlFor="budget-amount">Amount</InputLabel>
          <OutlinedInput
            id="budget-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            startAdornment={<InputAdornment position="start">{currency === 'INR' ? '₹' : (currency === 'USD' ? '$' : '₩')}</InputAdornment>}
            label="Amount"
            placeholder="e.g. 1500"
          />
        </FormControl>
      </Box>

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Flexibility</InputLabel>
        <Select
          value={flexibility}
          label="Flexibility"
          onChange={(e) => setFlexibility(e.target.value)}
        >
          <MenuItem value="strict">Strict (Do not exceed)</MenuItem>
          <MenuItem value="flexible">Flexible (Can spend more for the right product)</MenuItem>
          <MenuItem value="no_budget">I&apos;d rather not set a budget</MenuItem>
        </Select>
      </FormControl>

      <OnboardingNavigation 
        onBack={() => router.push('/onboarding/environment')}
        onContinue={handleContinue}
        isLoading={loading}
      />
    </Box>
  );
}
