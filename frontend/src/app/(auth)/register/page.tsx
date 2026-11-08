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
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, Google } from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  inviteCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const router = useRouter();
  const { login } = useAuthStore();
  const isGoogleAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setIsLoading(true);
      setServerError('');

      const response = await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
        inviteCode: data.inviteCode?.trim() || undefined,
      });

      if (response.data?.data?.accessToken) {
        // Auto-login flow
        const { accessToken, user } = response.data.data;
        login(user, accessToken);
        router.push('/onboarding');
      } else {
        // Manual verification flow
        setIsSuccess(true);
      }
      
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
          We&apos;ve sent a verification link to your email address. Please verify your account to continue.
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
          Create an account
        </Typography>
        <Typography color="text.secondary">
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'inherit', fontWeight: 600 }}>
            Log in
          </Link>
        </Typography>
      </Box>

      {serverError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {serverError}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 3, borderRadius: 2, fontSize: '0.875rem' }}>
        <strong>Friends & Family Beta:</strong> Registration is currently private. If you have an invite code or invited email address, you can create your account below.
      </Alert>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={3}>
          <TextField
            {...register('name')}
            fullWidth
            label="Full Name"
            error={!!errors.name}
            helperText={errors.name?.message}
            disabled={isLoading}
          />

          <TextField
            {...register('email')}
            fullWidth
            label="Email Address"
            type="email"
            error={!!errors.email}
            helperText={errors.email?.message}
            disabled={isLoading}
          />

          <TextField
            {...register('inviteCode')}
            fullWidth
            label="Beta Invitation Code"
            placeholder="Enter your invitation code"
            error={!!errors.inviteCode}
            helperText={errors.inviteCode?.message || 'Required for registration during the private friends & family beta'}
            disabled={isLoading}
          />

          <TextField
            {...register('password')}
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            error={!!errors.password}
            helperText={errors.password?.message}
            disabled={isLoading}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={isLoading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            {...register('confirmPassword')}
            fullWidth
            label="Confirm Password"
            type={showPassword ? 'text' : 'password'}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
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
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>

          {isGoogleAuthEnabled && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
                <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
                <Typography variant="body2" sx={{ px: 2, color: 'text.secondary' }}>
                  OR
                </Typography>
                <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
              </Box>

              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<Google />}
                sx={{ py: 1.5 }}
                disabled={isLoading}
              >
                Continue with Google
              </Button>
            </>
          )}
        </Stack>
      </form>
    </Box>
  );
}
