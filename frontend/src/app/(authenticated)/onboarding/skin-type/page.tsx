'use client';

import { Typography, Box, Alert } from '@mui/material';
import { useRouter } from 'next/navigation';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { OnboardingNavigation } from '@/components/onboarding/OnboardingNavigation';
import { SelectableCard } from '@/components/onboarding/SelectableCard';
import { useState } from 'react';
import api from '@/services/api';

const SKIN_TYPES = [
  { id: 'dry', title: 'Dry', description: 'Often feels tight or flaky.' },
  { id: 'oily', title: 'Oily', description: 'Becomes shiny across most of the face.' },
  { id: 'combination', title: 'Combination', description: 'Oily T-zone, normal or dry cheeks.' },
  { id: 'normal', title: 'Balanced / Normal', description: 'Comfortable, not too oily or dry.' },
  { id: 'not_sure', title: "I'm not sure", description: "We'll help you figure it out." },
];

export default function SkinTypePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState('');
  
  // Guided state
  const [guidedStep, setGuidedStep] = useState(0);
  const [guidedAnswers, setGuidedAnswers] = useState<{ tightness?: string; middayShine?: string; flaking?: string; tZoneDifferent?: string }>({});
  const [suggestion, setSuggestion] = useState<{ skinType: string, reason: string } | null>(null);

  const handleContinue = async () => {
    if (selected === 'not_sure' && guidedStep === 0) {
      setGuidedStep(1);
      return;
    }

    if (guidedStep > 0 && !suggestion) {
      // Proceed with guided questionnaire
      if (guidedStep === 4) {
        setLoading(true);
        try {
          const { data } = await api.post('/onboarding/skin', {
            isGuided: true,
            guidedInputs: guidedAnswers
          });
          setSuggestion({ skinType: data.data.skinType, reason: data.data.reason });
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
        return;
      }
      setGuidedStep(guidedStep + 1);
      return;
    }

    // Standard continue
    setLoading(true);
    try {
      if (suggestion) {
        // They accepted or overrode the suggestion
        await api.post('/onboarding/skin', { skinType: suggestion.skinType });
      } else {
        await api.post('/onboarding/skin', { skinType: selected });
      }
      router.push('/onboarding/concerns');
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (suggestion) {
      setSuggestion(null);
      setGuidedStep(4);
      return;
    }
    if (guidedStep > 0) {
      if (guidedStep === 1) setSelected('');
      setGuidedStep(guidedStep - 1);
      return;
    }
    router.push('/onboarding/profile');
  };

  if (suggestion) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <OnboardingProgress currentStep={2} totalSteps={8} />
        <Typography variant="h4" sx={{ fontFamily: '"DM Serif Display", serif', mb: 3 }}>
          Suggested Skin Type
        </Typography>
        <Alert severity="info" sx={{ mb: 4, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
            {suggestion.skinType.charAt(0).toUpperCase() + suggestion.skinType.slice(1)}
          </Typography>
          <Typography variant="body2">{suggestion.reason}</Typography>
        </Alert>

        <Typography variant="body1" sx={{ mb: 2 }}>
          Does this sound right?
        </Typography>

        <SelectableCard
          title={`Yes, let's use ${suggestion.skinType}`}
          selected={true}
          onClick={() => {}}
        />
        
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography 
            variant="body2" 
            color="primary" 
            sx={{ cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => {
              setSuggestion(null);
              setGuidedStep(0);
              setSelected('');
            }}
          >
            Choose something else
          </Typography>
        </Box>

        <OnboardingNavigation onBack={handleBack} onContinue={handleContinue} isLoading={loading} />
      </Box>
    );
  }

  if (guidedStep === 1) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <OnboardingProgress currentStep={2} totalSteps={8} />
        <Typography variant="h5" sx={{ mb: 4 }}>
          After washing your face and applying nothing for 30 minutes, how does your skin feel?
        </Typography>
        {['often', 'sometimes', 'never', 'not_sure'].map(val => (
          <SelectableCard
            key={val}
            title={val.replace('_', ' ').toUpperCase()}
            selected={guidedAnswers.tightness === val}
            onClick={() => setGuidedAnswers({...guidedAnswers, tightness: val})}
          />
        ))}
        <OnboardingNavigation onBack={handleBack} onContinue={handleContinue} isContinueDisabled={!guidedAnswers.tightness} />
      </Box>
    );
  }

  if (guidedStep === 2) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <OnboardingProgress currentStep={2} totalSteps={8} />
        <Typography variant="h5" sx={{ mb: 4 }}>
          By the middle of the day, where do you usually notice shine?
        </Typography>
        {[
          {id: 'all_over', title: 'Across most of my face'},
          {id: 't_zone', title: 'Mostly forehead/nose/chin'},
          {id: 'none', title: 'Almost nowhere'},
          {id: 'not_sure', title: 'Not sure'}
        ].map(opt => (
          <SelectableCard
            key={opt.id}
            title={opt.title}
            selected={guidedAnswers.middayShine === opt.id}
            onClick={() => setGuidedAnswers({...guidedAnswers, middayShine: opt.id})}
          />
        ))}
        <OnboardingNavigation onBack={handleBack} onContinue={handleContinue} isContinueDisabled={!guidedAnswers.middayShine} />
      </Box>
    );
  }

  if (guidedStep === 3) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <OnboardingProgress currentStep={2} totalSteps={8} />
        <Typography variant="h5" sx={{ mb: 4 }}>
          How often do you notice visible dryness or flaking?
        </Typography>
        {['often', 'sometimes', 'never', 'not_sure'].map(val => (
          <SelectableCard
            key={val}
            title={val.replace('_', ' ').toUpperCase()}
            selected={guidedAnswers.flaking === val}
            onClick={() => setGuidedAnswers({...guidedAnswers, flaking: val})}
          />
        ))}
        <OnboardingNavigation onBack={handleBack} onContinue={handleContinue} isContinueDisabled={!guidedAnswers.flaking} />
      </Box>
    );
  }

  if (guidedStep === 4) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <OnboardingProgress currentStep={2} totalSteps={8} />
        <Typography variant="h5" sx={{ mb: 4 }}>
          Does your T-zone behave differently from your cheeks?
        </Typography>
        {['yes', 'no', 'sometimes', 'not_sure'].map(val => (
          <SelectableCard
            key={val}
            title={val.replace('_', ' ').toUpperCase()}
            selected={guidedAnswers.tZoneDifferent === val}
            onClick={() => setGuidedAnswers({...guidedAnswers, tZoneDifferent: val})}
          />
        ))}
        <OnboardingNavigation onBack={handleBack} onContinue={handleContinue} isContinueDisabled={!guidedAnswers.tZoneDifferent} isLoading={loading} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <OnboardingProgress currentStep={2} totalSteps={8} />
      
      <Typography variant="h4" sx={{ fontFamily: '"DM Serif Display", serif', mb: 3 }}>
        How does your skin usually behave?
      </Typography>

      {SKIN_TYPES.map(type => (
        <SelectableCard
          key={type.id}
          title={type.title}
          description={type.description}
          selected={selected === type.id}
          onClick={() => setSelected(type.id)}
        />
      ))}

      <OnboardingNavigation 
        onBack={handleBack}
        onContinue={handleContinue}
        isContinueDisabled={!selected}
        isLoading={loading}
      />
    </Box>
  );
}
