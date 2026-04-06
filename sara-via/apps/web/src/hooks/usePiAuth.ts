'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { initPiSdk } from '../lib/pi';
import type { PiUser } from '../types/pi-sdk';

interface SessionResponse {
  accessToken: string;
  refreshToken: string;
  user: PiUser;
}

export function usePiAuth() {
  const [user, setUser] = useState<PiUser | null>(null);
  const [jwt, setJwt] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persistSession = useCallback((session: SessionResponse) => {
    setUser(session.user);
    setJwt(session.accessToken);
    setRefreshToken(session.refreshToken);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sara-via.jwt', session.accessToken);
      localStorage.setItem('sara-via.refresh', session.refreshToken);
      localStorage.setItem('sara-via.user', JSON.stringify(session.user));
    }
  }, []);

  useEffect(() => {
    initPiSdk();
    if (typeof window !== 'undefined') {
      const storedJwt = localStorage.getItem('sara-via.jwt');
      const storedRefresh = localStorage.getItem('sara-via.refresh');
      const storedUser = localStorage.getItem('sara-via.user');
      if (storedJwt) setJwt(storedJwt);
      if (storedRefresh) setRefreshToken(storedRefresh);
      if (storedUser) setUser(JSON.parse(storedUser) as PiUser);
    }
  }, []);

  const signIn = useCallback(async () => {
    if (!window.Pi) {
      setError('Pi SDK is not available. Open the app inside Pi Browser or inject the SDK script.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const authResult = await window.Pi.authenticate(['username', 'payments'], (payment) => {
        console.info('Incomplete Pi payment found', payment.identifier);
      });

      const session = await apiFetch<SessionResponse>('/auth/pi/login', {
        method: 'POST',
        body: JSON.stringify({ accessToken: authResult.accessToken })
      });

      persistSession(session);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Pi authentication failed');
    } finally {
      setIsLoading(false);
    }
  }, [persistSession]);

  const rotateSession = useCallback(async () => {
    if (!refreshToken) {
      return null;
    }

    try {
      const session = await apiFetch<SessionResponse>('/auth/pi/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      });
      persistSession(session);
      return session.accessToken;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Session refresh failed');
      return null;
    }
  }, [persistSession, refreshToken]);

  return { user, jwt, refreshToken, isLoading, error, signIn, rotateSession };
}
