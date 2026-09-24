import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  backendMode,
  ensureProfile,
  resetPasswordForEmail,
  seedFounderSessions,
  signInWithEmail,
  signInWithOAuth,
  signInWithPassword,
  signUpWithPassword,
  updatePassword,
} from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import { canAccessFounderOps } from '../lib/founder';
import { PageHero } from '../components/SportScene';
import { supabase } from '../lib/supabase';
import { theme } from '../constants/theme';
import {
  markOAuthReturn,
  peekPendingAuth,
  resumeAfterAuth,
  takeOAuthReturn,
} from '../lib/pendingAuth';

const GOOGLE_AUTH_ENABLED = process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED === 'true';

function notify(title: string, message?: string) {
  const text = message ? `${title}\n\n${message}` : title;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(text);
    return;
  }
  Alert.alert(title, message);
}

function hasRecoveryParam(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('recovery') === '1';
  } catch {
    return false;
  }
}

export default function AuthScreen() {
  const params = useLocalSearchParams<{ recovery?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(
    () => params.recovery === '1' || hasRecoveryParam()
  );
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const mode = backendMode();
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const isFounderPreview = useAuthStore((s) => s.isFounderPreview);
  const founderOps = canAccessFounderOps({
    email: user?.email,
    isFounderPreview,
  });
  const pending = peekPendingAuth();

  useEffect(() => {
    if (params.recovery === '1' || hasRecoveryParam()) setRecoveryMode(true);
  }, [params.recovery]);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSignedIn || recoveryMode || !user) return;
    if (!takeOAuthReturn() && !peekPendingAuth()) return;
    void (async () => {
      await ensureProfile(
        user.id,
        user.email,
        user.user_metadata as Record<string, unknown>
      );
      resumeAfterAuth();
    })();
  }, [isSignedIn, recoveryMode, user]);

  const finishSignedIn = async (
    userId: string,
    userEmail?: string | null,
    meta?: Record<string, unknown> | null
  ) => {
    await ensureProfile(userId, userEmail, meta);
    setStatus({ kind: 'ok', text: 'Signed in. You’re live.' });
    resumeAfterAuth();
  };

  const onGoogle = async () => {
    setStatus(null);
    setLoading(true);
    markOAuthReturn();
    const { data, error } = await signInWithOAuth('google');
    if (error || !data?.url) {
      setLoading(false);
      const msg = /provider is not enabled|unsupported provider|validation_failed/i.test(
        error?.message ?? ''
      )
        ? 'Google isn’t switched on yet. Use the email link below — it takes one tap from your inbox.'
        : error?.message ?? 'Couldn’t start Google sign-in.';
      setStatus({ kind: 'err', text: msg });
      return;
    }
    try {
      const probe = await fetch(data.url, { method: 'GET', redirect: 'manual' });
      const text = await probe.clone().text();
      if (
        probe.status >= 400 ||
        /provider is not enabled|unsupported provider|validation_failed/i.test(text)
      ) {
        setLoading(false);
        setStatus({
          kind: 'err',
          text: 'Google isn’t switched on yet. Use the email link below — it takes one tap from your inbox.',
        });
        return;
      }
    } catch {
      /* CORS — still try the redirect */
    }
    if (typeof window !== 'undefined') {
      window.location.assign(data.url);
      return;
    }
    setLoading(false);
  };

  const onMagic = async () => {
    const value = email.trim().toLowerCase();
    setStatus(null);
    if (!value.includes('@')) {
      setStatus({ kind: 'err', text: 'Type your email first — we’ll send a sign-in link.' });
      return;
    }
    setLoading(true);
    markOAuthReturn();
    const { error } = await signInWithEmail(value);
    setLoading(false);
    if (error) {
      setStatus({
        kind: 'err',
        text: /rate limit/i.test(error.message)
          ? 'Too many emails. Wait a bit, then try again.'
          : error.message,
      });
      return;
    }
    setStatus({
      kind: 'ok',
      text: 'Check your email (and spam). Tap the link to get in — no password needed.',
    });
  };

  const onSignIn = async () => {
    const value = email.trim().toLowerCase();
    setStatus(null);
    if (!value.includes('@') || password.length < 6) {
      setStatus({ kind: 'err', text: 'Email + password (at least 6 characters) required.' });
      return;
    }
    setLoading(true);
    const { data, error } = await signInWithPassword(value, password);
    setLoading(false);
    if (error) {
      const msg = /rate limit/i.test(error.message)
        ? 'Too many sign-in attempts. Wait a bit, then try again.'
        : /email not confirmed|confirm/i.test(error.message)
          ? 'Confirm your email first — open the link we sent, then Sign in here.'
          : /invalid login|invalid credentials/i.test(error.message)
            ? 'Wrong email or password. Tap Forgot password if you need a reset.'
            : error.message;
      setStatus({ kind: 'err', text: msg });
      return;
    }
    if (data.user && data.session) {
      await finishSignedIn(data.user.id, data.user.email);
      return;
    }
    setStatus({ kind: 'err', text: 'No session returned. Try Create account, or check auth settings.' });
  };

  const onCreate = async () => {
    const value = email.trim().toLowerCase();
    setStatus(null);
    if (!value.includes('@') || password.length < 6) {
      setStatus({ kind: 'err', text: 'Email + password (at least 6 characters) required.' });
      return;
    }
    setLoading(true);
    const { data, error } = await signUpWithPassword(value, password);
    setLoading(false);
    if (error) {
      const msg = /rate limit/i.test(error.message)
        ? 'Too many sign-up attempts. Wait a bit, then try again.'
        : error.message;
      setStatus({ kind: 'err', text: msg });
      return;
    }
    if (data.user && data.session) {
      await finishSignedIn(data.user.id, data.user.email);
      return;
    }

    const existing = await signInWithPassword(value, password);
    if (existing.data?.user && existing.data?.session) {
      await finishSignedIn(existing.data.user.id, existing.data.user.email);
      return;
    }

    setStatus({
      kind: 'ok',
      text: 'Check your email and tap the confirm link (opens SportMatchr). If you already confirmed, tap Sign in with the same password.',
    });
  };

  const onForgot = async () => {
    const value = email.trim().toLowerCase();
    setStatus(null);
    if (!value.includes('@')) {
      setStatus({ kind: 'err', text: 'Enter your email above, then tap Forgot password.' });
      return;
    }
    setLoading(true);
    const { error } = await resetPasswordForEmail(value);
    setLoading(false);
    if (error) {
      setStatus({
        kind: 'err',
        text: /rate limit/i.test(error.message)
          ? 'Too many reset emails. Wait a bit, then try again.'
          : error.message,
      });
      return;
    }
    setStatus({
      kind: 'ok',
      text: 'Reset link sent. Check your email (and spam), then open the link to choose a new password.',
    });
  };

  const onSaveNewPassword = async () => {
    setStatus(null);
    if (password.length < 6) {
      setStatus({ kind: 'err', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (password !== password2) {
      setStatus({ kind: 'err', text: 'Passwords don’t match.' });
      return;
    }
    setLoading(true);
    const { data, error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      setStatus({ kind: 'err', text: error.message });
      return;
    }
    setRecoveryMode(false);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, '/auth');
    }
    if (data.user) {
      await finishSignedIn(data.user.id, data.user.email);
      return;
    }
    setStatus({ kind: 'ok', text: 'Password updated. Sign in with your new password.' });
  };

  const seed = async () => {
    setLoading(true);
    setStatus(null);
    const res = await seedFounderSessions();
    setLoading(false);
    if (res.error) {
      setStatus({ kind: 'err', text: res.error });
      notify('Seed failed', res.error);
    } else if (res.created === 0) {
      setStatus({ kind: 'ok', text: 'You already have open host sessions.' });
    } else {
      setStatus({
        kind: 'ok',
        text: `Created ${res.created} multi-sport sessions in Ottawa.`,
      });
      router.replace('/(tabs)/home');
    }
  };

  if (isSignedIn && recoveryMode) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>Choose a new password</Text>
        <Text style={styles.sub}>
          You’re resetting {user?.email ?? 'your account'}. Pick something you’ll remember (at
          least 6 characters).
        </Text>

        <Text style={styles.label}>New password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            autoCapitalize="none"
            secureTextEntry={!showPassword}
            placeholder="At least 6 characters"
            placeholderTextColor="#94A3B8"
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={styles.showBtn}
            onPress={() => setShowPassword((v) => !v)}
            activeOpacity={0.85}
          >
            <Text style={styles.showBtnText}>{showPassword ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Confirm password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            autoCapitalize="none"
            secureTextEntry={!showPassword}
            placeholder="Type it again"
            placeholderTextColor="#94A3B8"
            value={password2}
            onChangeText={setPassword2}
          />
          <TouchableOpacity
            style={styles.showBtn}
            onPress={() => setShowPassword((v) => !v)}
            activeOpacity={0.85}
          >
            <Text style={styles.showBtnText}>{showPassword ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.btn}
          onPress={onSaveNewPassword}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Save password</Text>
          )}
        </TouchableOpacity>

        {status ? (
          <View style={[styles.statusBox, status.kind === 'err' ? styles.statusErr : styles.statusOk]}>
            <Text style={styles.statusText}>{status.text}</Text>
          </View>
        ) : null}
      </ScrollView>
    );
  }

  if (isSignedIn) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
        <Text style={styles.header}>You’re signed in</Text>
        <Text style={styles.sub}>{user?.email}</Text>

        {status ? (
          <View style={[styles.statusBox, status.kind === 'err' ? styles.statusErr : styles.statusOk]}>
            <Text style={styles.statusText}>{status.text}</Text>
          </View>
        ) : null}

        {founderOps ? (
          <TouchableOpacity style={styles.btn} onPress={seed} disabled={loading} activeOpacity={0.85}>
            <Text style={styles.btnText}>
              {loading ? 'Working…' : 'Seed multi-sport Ottawa sessions'}
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.secondary}
          onPress={() => router.replace('/(tabs)/home')}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryText}>Go to Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.danger}
          onPress={async () => {
            await signOut();
            setStatus({ kind: 'ok', text: 'Signed out.' });
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.dangerText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
      <TouchableOpacity
        style={styles.exit}
        onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)/home');
        }}
        activeOpacity={0.85}
      >
        <Text style={styles.exitText}>← Just looking around</Text>
      </TouchableOpacity>

      <PageHero title="Come play" caption="Ottawa · free public places" />
      <Text style={styles.header}>Join so people know it’s you</Text>
      <Text style={styles.sub}>
        {pending?.kind === 'create'
          ? 'Then we’ll send you back to post tonight’s game.'
          : pending?.kind === 'looking'
            ? 'Then we’ll send you back so you can say you’re free.'
            : pending?.kind === 'join'
              ? 'Then we’ll send you back to that game.'
              : 'You need an account to host, join, or say you’re free. Takes a few seconds.'}
      </Text>

      {isFounderPreview ? (
        <>
          <TouchableOpacity
            style={styles.founderBtn}
            onPress={() => router.replace('/(tabs)/home')}
            activeOpacity={0.85}
          >
            <Text style={styles.founderBtnText}>Founder preview on — go home</Text>
          </TouchableOpacity>
          <Text style={styles.founderHint}>
            You’re on sample data. Friends should use the normal link (no ?founder=1).
          </Text>
        </>
      ) : null}

      {mode !== 'supabase' ? (
        <Text style={styles.modeWarn}>
          Offline demo mode — restart Expo with a cleared cache if you expected live sign-in.
        </Text>
      ) : null}

      {GOOGLE_AUTH_ENABLED ? (
        <>
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={onGoogle}
            activeOpacity={0.85}
            disabled={loading}
            accessibilityLabel="Continue with Google"
          >
            {loading && !showPasswordForm ? (
              <ActivityIndicator color={theme.ink} />
            ) : (
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.safeNote}>
            We never see your Google password. That’s the easy way.
          </Text>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or email</Text>
            <View style={styles.orLine} />
          </View>
        </>
      ) : null}

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="you@email.com"
        placeholderTextColor="#94A3B8"
        value={email}
        onChangeText={setEmail}
      />

      <TouchableOpacity style={styles.btn} onPress={onMagic} activeOpacity={0.85} disabled={loading}>
        {loading && showPasswordForm === false ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Email me a sign-in link</Text>
        )}
      </TouchableOpacity>
      <Text style={styles.hint}>
        No new password to invent. Tap the link we send — we never store one this way.
      </Text>

      <TouchableOpacity
        style={styles.passwordToggle}
        onPress={() => setShowPasswordForm((v) => !v)}
        activeOpacity={0.85}
      >
        <Text style={styles.passwordToggleText}>
          {showPasswordForm ? 'Hide password' : 'I already have a password'}
        </Text>
      </TouchableOpacity>

      {showPasswordForm ? (
        <>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              autoCapitalize="none"
              secureTextEntry={!showPassword}
              placeholder="At least 6 characters"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.showBtn}
              onPress={() => setShowPassword((v) => !v)}
              activeOpacity={0.85}
            >
              <Text style={styles.showBtnText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgot} onPress={onForgot} activeOpacity={0.85} disabled={loading}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btn} onPress={onSignIn} activeOpacity={0.85} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Sign in with password</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondary}
            onPress={onCreate}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={styles.secondaryText}>Create account with email</Text>
          </TouchableOpacity>
        </>
      ) : null}

      <TouchableOpacity onPress={() => router.push('/legal')} activeOpacity={0.85}>
        <Text style={styles.legalLink}>
          By joining you agree to the terms & privacy note.
        </Text>
      </TouchableOpacity>

      {status ? (
        <View style={[styles.statusBox, status.kind === 'err' ? styles.statusErr : styles.statusOk]}>
          <Text style={styles.statusText}>{status.text}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  pad: { padding: 16, paddingBottom: 40 },
  exit: {
    backgroundColor: theme.surfaceRaised,
    borderRadius: theme.radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  exitText: { color: theme.ink, fontFamily: theme.fonts.bodyBold },
  header: { fontSize: 28, fontFamily: theme.fonts.displayBold, color: theme.ink },
  sub: { color: theme.muted, marginTop: 6, marginBottom: 16, lineHeight: 20, fontFamily: theme.fonts.body },
  modeWarn: { color: theme.warnFg, fontFamily: theme.fonts.bodyMed, fontSize: 13, marginBottom: 16, lineHeight: 18 },
  label: { color: theme.muted, fontFamily: theme.fonts.bodyBold, marginBottom: 8 },
  input: {
    backgroundColor: theme.surfaceRaised,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.ink,
    marginBottom: 16,
    fontFamily: theme.fonts.body,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceRaised,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 16,
    paddingRight: 4,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.ink,
    fontFamily: theme.fonts.body,
  },
  showBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  showBtnText: {
    color: theme.accentDark,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13,
  },
  forgot: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 14,
    paddingVertical: 4,
  },
  forgotText: {
    color: theme.accentDark,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13,
  },
  googleBtn: {
    backgroundColor: theme.surfaceRaised,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.ink,
  },
  googleBtnText: {
    color: theme.ink,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 16,
  },
  safeNote: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 8,
    fontFamily: theme.fonts.body,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
  },
  orLine: { flex: 1, height: 1, backgroundColor: theme.borderStrong },
  orText: {
    color: theme.mutedSoft,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  passwordToggle: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 8,
  },
  passwordToggleText: {
    color: theme.accentDark,
    fontFamily: theme.fonts.bodyBold,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  btn: {
    backgroundColor: theme.ball,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.ballDark,
  },
  btnText: { color: theme.surfaceRaised, fontFamily: theme.fonts.bodyBold, fontSize: 16 },
  founderBtn: {
    backgroundColor: theme.accent,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  founderBtnText: { color: theme.surfaceRaised, fontFamily: theme.fonts.bodyBold, fontSize: 15 },
  founderHint: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
    fontFamily: theme.fonts.body,
  },
  secondary: {
    marginTop: 12,
    backgroundColor: theme.surfaceRaised,
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.borderStrong,
  },
  secondaryText: { color: theme.accentDark, fontFamily: theme.fonts.bodyBold },
  danger: { marginTop: 20, alignItems: 'center', padding: 12 },
  dangerText: { color: theme.danger, fontFamily: theme.fonts.bodyBold },
  hint: { color: theme.muted, marginTop: 16, lineHeight: 18, fontSize: 13, fontFamily: theme.fonts.body },
  legalLink: {
    color: theme.muted,
    marginTop: 14,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontFamily: theme.fonts.body,
  },
  statusBox: {
    marginTop: 16,
    marginBottom: 8,
    borderRadius: theme.radius.md,
    padding: 12,
    borderWidth: 1,
  },
  statusOk: { backgroundColor: theme.accentSoft, borderColor: theme.accent },
  statusErr: { backgroundColor: '#FEF2F2', borderColor: theme.danger },
  statusText: { color: theme.ink, lineHeight: 20, fontSize: 14, fontFamily: theme.fonts.bodyMed },
});
