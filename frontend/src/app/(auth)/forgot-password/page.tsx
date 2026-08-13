'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Stack,
} from '@mui/material';
import Link from 'next/link';
import api from '@/services/api';

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotFormValues) => {
    try {
      setIsLoading(true);
      setServerError('');

      await api.post('/auth/forgot-password', {
        email: data.email,
      });

      setIsSuccess(true);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      if (err.response?.data?.error?.message) {
        setServerError(err.response.data.error.message);
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
          Check your email
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          If an account exists for that email, we&apos;ve sent instructions on how to reset your password.
        </Typography>
        <Button variant="outlined" component={Link} href="/login">
          Return to login
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          Reset your password
        </Typography>
        <Typography color="text.secondary">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </Typography>
      </Box>

      {serverError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {serverError}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={3}>
          <TextField
            {...register('email')}
            fullWidth
            label="Email Address"
            type="email"
            error={!!errors.email}
            helperText={errors.email?.message}
            disabled={isLoading}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{ py: 1.5 }}
          >
            {isLoading ? 'Sending instructions...' : 'Send Reset Link'}
          </Button>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Link href="/login" style={{ color: 'inherit', fontWeight: 500, fontSize: '0.875rem' }}>
              Back to login
            </Link>
          </Box>
        </Stack>
      </form>
    </Box>
  );
}
