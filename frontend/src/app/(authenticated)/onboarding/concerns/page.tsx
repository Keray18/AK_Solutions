'use client';

import { Typography, Box } from '@mui/material';
import { useRouter } from 'next/navigation';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { OnboardingNavigation } from '@/components/onboarding/OnboardingNavigation';
import { SelectableCard } from '@/components/onboarding/SelectableCard';
import { useState } from 'react';
import api from '@/services/api';

const CONCERNS = [
  { id: 'acne', title: 'Breakouts & Acne' },
  { id: 'pigmentation', title: 'Pigmentation & Uneven Tone' },
  { id: 'dark_spots', title: 'Dark Spots' },
  { id: 'dryness', title: 'Dryness & Flaking' },
  { id: 'oiliness', title: 'Excess Oiliness' },
  { id: 'redness', title: 'Redness & Irritation' },
  { id: 'texture', title: 'Uneven Texture' },
  { id: 'dullness', title: 'Dullness' },
  { id: 'visible_pores', title: 'Visible Pores' },
  { id: 'aging', title: 'Fine Lines & Aging' },
];

export default function ConcernsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [primary, setPrimary] = useState<string>('');
  const [secondary, setSecondary] = useState<string[]>([]);
  
  const handleToggleSecondary = (id: string) => {
    if (primary === id) return;
    
    if (secondary.includes(id)) {
      setSecondary(secondary.filter(s => s !== id));
    } else {
      if (secondary.length < 4) {
        setSecondary([...secondary, id]);
      }
    }
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      await api.post('/onboarding/concerns', {
        primary,
        secondary
      });
      router.push('/onboarding/sensitivity');
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <OnboardingProgress currentStep={3} totalSteps={8} />
      
      {!primary ? (
        <>
          <Typography variant="h4" sx={{ fontFamily: '"DM Serif Display", serif', mb: 3 }}>
            What is your primary focus?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Choose the one thing you most want to improve.
          </Typography>

          <Box sx={{ flexGrow: 1, overflowY: 'auto', pb: 2 }}>
            {CONCERNS.map(c => (
              <SelectableCard
                key={c.id}
                title={c.title}
                selected={primary === c.id}
                onClick={() => setPrimary(c.id)}
              />
            ))}
          </Box>
        </>
      ) : (
        <>
          <Typography variant="h4" sx={{ fontFamily: '"DM Serif Display", serif', mb: 3 }}>
            Any secondary concerns?
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Select up to 4 more. Focusing on a few priorities helps SkinAI avoid building an unnecessarily complicated routine.
          </Typography>
          
          <Box sx={{ flexGrow: 1, overflowY: 'auto', pb: 2 }}>
            <SelectableCard
              title={`${CONCERNS.find(c => c.id === primary)?.title} (Primary)`}
              selected={true}
              onClick={() => {
                // reset primary
                setPrimary('');
                setSecondary([]);
              }}
            />

            {CONCERNS.filter(c => c.id !== primary).map(c => (
              <SelectableCard
                key={c.id}
                title={c.title}
                selected={secondary.includes(c.id)}
                onClick={() => handleToggleSecondary(c.id)}
              />
            ))}
          </Box>
        </>
      )}

      <OnboardingNavigation 
        onBack={() => {
          if (primary) {
            setPrimary('');
            setSecondary([]);
          } else {
            router.push('/onboarding/skin-type');
          }
        }}
        onContinue={handleContinue}
        isContinueDisabled={!primary}
        isLoading={loading}
      />
    </Box>
  );
}
