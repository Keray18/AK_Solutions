'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const { login, logout, setLoading } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        setLoading(true);
        // Attempt to refresh the token using the HttpOnly cookie
        const response = await api.post('/auth/refresh');
        const { accessToken, user } = response.data.data;
        if (mounted) {
          login(user, accessToken);
        }
      } catch {
        if (mounted) {
          logout();
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setIsBootstrapped(true);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, [login, logout, setLoading]);

  // Don't render children until we know the initial auth state
  // This prevents layout flickering on protected routes.
  if (!isBootstrapped) {
    return null; // Or a full-screen loading spinner
  }

  return <>{children}</>;
}
