'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/keys';
import type { User } from '@/lib/api/types';

/**
 * Signing in and out.
 *
 * These call this app's own auth routes rather than the API: those routes are what move the
 * returned tokens into httpOnly cookies, so the browser never holds a credential it could
 * leak through an injected script.
 */

function useSessionChange() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return async (destination: string) => {
    // Clear rather than refetch: after a sign-in or sign-out, every cached answer was given
    // to a different identity.
    queryClient.clear();
    router.replace(destination);
    router.refresh();
  };
}

export function useLogin() {
  const onSessionChange = useSessionChange();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      api.post<{ user: User }>('auth/login', input),
    onSuccess: () => onSessionChange('/'),
  });
}

export function useRegister() {
  const onSessionChange = useSessionChange();
  return useMutation({
    mutationFn: (input: { email: string; password: string; displayName: string }) =>
      api.post<{ user: User }>('auth/register', input),
    onSuccess: () => onSessionChange('/'),
  });
}

export function useLogout() {
  const onSessionChange = useSessionChange();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>('auth/logout'),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.session, { user: null });
      return onSessionChange('/login');
    },
  });
}
