import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme/colors';

export default function AuthScreen() {
  const { signIn, signUp, resetPasswordForEmail, recoveryError, clearRecoveryError } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedUpMessage, setSignedUpMessage] = useState<string | null>(null);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);

  const canSubmit =
    email.trim().length > 0 &&
    password.length >= 6 &&
    (mode === 'signIn' || name.trim().length > 0) &&
    !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setSignedUpMessage(null);

    if (mode === 'signIn') {
      const { error } = await signIn(email.trim(), password);
      setSubmitting(false);
      if (error) setError(error);
      return;
    }

    const { error, needsEmailConfirmation } = await signUp(email.trim(), password, name.trim());
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    // If sign-up didn't need email confirmation, it already produced an
    // active session — onAuthStateChange in useAuth picks it up and the app
    // navigates in on its own, no message needed here.
    if (needsEmailConfirmation) {
      setSignedUpMessage('Check your email to confirm your account, then sign in.');
      setMode('signIn');
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email above, then tap "Forgot password?" again.');
      return;
    }
    setForgotSubmitting(true);
    setError(null);
    setForgotMessage(null);
    const { error: resetError } = await resetPasswordForEmail(email.trim());
    setForgotSubmitting(false);
    // Supabase doesn't reveal whether the email has an account (so this
    // doesn't leak account existence) — only a genuine send failure surfaces
    // as an error.
    if (resetError) {
      setError(resetError);
      return;
    }
    setForgotMessage('If an account exists for that email, a password reset link is on its way.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Text style={styles.emoji}>🌱</Text>
        <Text style={styles.title}>{mode === 'signIn' ? 'Welcome back' : 'Create an account'}</Text>
        <Text style={styles.subtitle}>
          {mode === 'signIn'
            ? 'Sign in to sync your habits across devices.'
            : 'Your habits, streaks, and challenges will sync to your account.'}
        </Text>

        {recoveryError && (
          <Pressable onPress={clearRecoveryError}>
            <Text style={styles.errorText}>{recoveryError} Tap to dismiss.</Text>
          </Pressable>
        )}

        {mode === 'signUp' && (
          <>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
            />
          </>
        )}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          returnKeyType="next"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="At least 6 characters"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={mode === 'signIn' ? 'password' : 'new-password'}
          returnKeyType="done"
          onSubmitEditing={submit}
        />

        {mode === 'signIn' && (
          <Pressable style={styles.forgotButton} onPress={handleForgotPassword} disabled={forgotSubmitting}>
            <Text style={styles.forgotButtonText}>{forgotSubmitting ? 'Sending…' : 'Forgot password?'}</Text>
          </Pressable>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}
        {signedUpMessage && <Text style={styles.successText}>{signedUpMessage}</Text>}
        {forgotMessage && <Text style={styles.successText}>{forgotMessage}</Text>}

        <Pressable
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={submit}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.submitButtonText}>{mode === 'signIn' ? 'Sign in' : 'Sign up'}</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.switchModeButton}
          onPress={() => {
            setMode((m) => (m === 'signIn' ? 'signUp' : 'signIn'));
            setError(null);
            setSignedUpMessage(null);
            setForgotMessage(null);
          }}
        >
          <Text style={styles.switchModeText}>
            {mode === 'signIn' ? "Don't have an account? " : 'Already have an account? '}
            <Text style={styles.switchModeLink}>{mode === 'signIn' ? 'Sign up' : 'Sign in'}</Text>
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 16,
    textAlign: 'center',
  },
  forgotButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  forgotButtonText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  successText: {
    color: colors.success,
    fontSize: 13,
    marginTop: 16,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  switchModeButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  switchModeText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  switchModeLink: {
    color: colors.accent,
    fontWeight: '700',
  },
});
