import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  userId: string | null;
  // From the `name` passed to signUp's `options.data` (see signUp below) —
  // Supabase mirrors it onto every session's user_metadata server-side, so
  // this is available immediately on any device without a separate fetch
  // from `profiles`.
  userName: string | null;
  // True once a password-recovery deep link has been opened and turned into
  // a session — the app should show the "set a new password" screen instead
  // of the normal signed-in flow until `completePasswordReset` succeeds.
  recoveryPending: boolean;
  recoveryError: string | null;
  clearRecoveryError: () => void;
  signUp: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error: string | null }>;
  completePasswordReset: (newPassword: string) => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Supabase's password-recovery redirect appends tokens as a URL fragment
 * (`#access_token=...&type=recovery`), not a query string, and RN has no
 * URL bar to auto-consume it (hence `detectSessionInUrl: false` on the
 * client) — so the app has to parse it out of the raw deep-link URL itself.
 * Falls back to `?query` in case a given provider/config ever sends it that
 * way instead; either is a plain `key=value&...` string once past the
 * first `#`/`?`. */
function extractUrlParams(url: string): URLSearchParams {
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const start = hashIndex >= 0 ? hashIndex + 1 : queryIndex >= 0 ? queryIndex + 1 : url.length;
  return new URLSearchParams(url.slice(start));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [recoveryPending, setRecoveryPending] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const params = extractUrlParams(url);

      const errorDescription = params.get('error_description');
      if (errorDescription) {
        setRecoveryError(errorDescription);
        return;
      }

      if (params.get('type') !== 'recovery') return;
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (!accessToken || !refreshToken) return;

      const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (error) {
        setRecoveryError(error.message);
        return;
      }
      setRecoveryError(null);
      setRecoveryPending(true);
    };

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => sub.remove();
  }, []);

  const signUp: AuthContextValue['signUp'] = async (email, password, name) => {
    // `data.name` lands in auth.users.raw_user_meta_data, which the
    // on_auth_user_created trigger (supabase/schema.sql) reads to populate
    // public.profiles — the password itself is never sent anywhere but
    // Supabase's own auth system.
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    // If the project has email confirmation disabled, signUp returns an
    // active session immediately (onAuthStateChange above picks it up and
    // the app navigates straight in) — no confirmation step to mention.
    return { error: error?.message ?? null, needsEmailConfirmation: !error && !data.session };
  };

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPasswordForEmail: AuthContextValue['resetPasswordForEmail'] = async (email) => {
    const redirectTo = Linking.createURL('reset-password');
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error: error?.message ?? null };
  };

  const completePasswordReset: AuthContextValue['completePasswordReset'] = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) setRecoveryPending(false);
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        session,
        userId: session?.user.id ?? null,
        userName: (session?.user.user_metadata?.name as string | undefined) ?? null,
        recoveryPending,
        recoveryError,
        clearRecoveryError: () => setRecoveryError(null),
        signUp,
        signIn,
        signOut,
        resetPasswordForEmail,
        completePasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
