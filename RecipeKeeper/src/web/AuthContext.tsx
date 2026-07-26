import type { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

import { supabase } from './supabaseClient';

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // 同じユーザーIDに対して何度もRPCを叩かないためのガード(サーバー側も日付判定で冪等だが、
  // TOKEN_REFRESHED等で不要に呼び続けるのを防ぐ)
  const claimedUserIdRef = useRef<string | null>(null);

  function maybeClaimLoginBonus(nextSession: Session | null) {
    const userId = nextSession?.user.id ?? null;
    if (!userId || claimedUserIdRef.current === userId) return;
    claimedUserIdRef.current = userId;
    supabase.rpc('claim_daily_login_bonus').then(({ error }) => {
      if (error) console.warn('claim_daily_login_bonus failed', error.message);
    });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
      maybeClaimLoginBonus(data.session);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
      maybeClaimLoginBonus(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ session, isLoading }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
