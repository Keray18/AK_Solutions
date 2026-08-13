'use client';

import { useEffect, useState, Suspense } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import api from '@/services/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>(!token ? 'error' : 'verifying');
  const [errorMessage, setErrorMessage] = useState(!token ? 'No verification token provided.' : '');

  useEffect(() => {
    if (!token) {
      return;
    }

    let mounted = true;

    async function verify() {
      try {
        await api.post('/auth/verify-email', { token });
        if (mounted) {
          setStatus('success');
        }
      } catch (error: unknown) {
        if (mounted) {
          setStatus('error');
          const err = error as { response?: { data?: { error?: { message?: string } } } };
          if (err.response?.data?.error?.message) {
            setErrorMessage(err.response.data.error.message);
          } else {
            setErrorMessage('Verification failed. The link may have expired.');
          }
        }
      }
    }

    verify();

    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <Box sx={{ textAlign: 'center' }}>
      {status === 'verifying' && (
        <>
          <CircularProgress size={64} thickness={2} sx={{ mb: 4, color: 'primary.main' }} />
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            Verifying your email...
          </Typography>
          <Typography color="text.secondary">
            Please wait while we confirm your email address.
          </Typography>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 3 }} />
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
            Email Verified!
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            Your account has been successfully verified. You can now log in to SkinAI.
          </Typography>
          <Button variant="contained" size="large" component={Link} href="/login">
            Continue to Login
          </Button>
        </>
      )}

      {status === 'error' && (
        <>
          <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 3 }} />
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            Verification Failed
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            {errorMessage}
          </Typography>
          <Button variant="outlined" component={Link} href="/login">
            Return to login
          </Button>
        </>
      )}
    </Box>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<CircularProgress />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
