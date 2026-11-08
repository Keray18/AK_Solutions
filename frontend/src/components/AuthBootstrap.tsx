'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const { login, logout, setLoading } = useAuthStore();
  const hasAttemptedBootstrap = useRef(false);

  useEffect(() => {
    if (hasAttemptedBootstrap.current) return;
    hasAttemptedBootstrap.current = true;
    
    async function initAuth() {
      try {
        setLoading(true);
        // Attempt to refresh the token using HttpOnly cookie
        const response = await api.post('/auth/refresh');
        const { accessToken, user } = response.data.data;
        login(user, accessToken);
      } catch {
        logout();
      } finally {
        setLoading(false);
        setIsBootstrapped(true);
      }
    }

    initAuth();
  }, [login, logout, setLoading]);

  // Don't render children until we know the initial auth state
  // This prevents layout flickering on protected routes.
  if (!isBootstrapped) {
    return null; // Or a full-screen loading spinner
  }

  return <>{children}</>;
}
