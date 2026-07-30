import { useState } from 'react';
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
import { router } from 'expo-router';
import {
  backendMode,
  ensureProfile,
  seedFounderSessions,
  signInWithPassword,
  signUpWithPassword,
} from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import { WEDGE } from '../constants/wedge';

function notify(title: string, message?: string) {
  const text = message ? `${title}\n\n${message}` : title;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(text);
    return;
  }
  Alert.alert(title, message);
}

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const mode = backendMode();
  const isSignedIn = useAuthStore((s) => s.isSignedIn);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const finishSignedIn = async (userId: string, userEmail?: string | null) => {
    await ensureProfile(userId, userEmail);
    setStatus({ kind: 'ok', text: 'Signed in. You’re live.' });
    router.replace('/(tabs)/home');
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
        ? 'Supabase email rate limit hit (free mailer is tiny). Turn OFF “Confirm email” in Supabase → Authentication → Providers → Email so signup doesn’t send mail. Wait ~1 hour if you already burned the quota with magic links, then try Create account again.'
        : error.message;
      setStatus({ kind: 'err', text: msg });
      return;
    }
    if (data.user && data.session) {
      await finishSignedIn(data.user.id, data.user.email);
      return;
    }
    setStatus({ kind: 'err', text: 'No session returned. Try Create account, or check Supabase Auth settings.' });
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
        ? 'Supabase email rate limit hit (free mailer is tiny). Turn OFF “Confirm email” in Supabase → Authentication → Providers → Email so signup doesn’t send mail. Wait ~1 hour if you already burned the quota with magic links, then try Create account again.'
        : error.message;
      setStatus({ kind: 'err', text: msg });
      return;
    }
    if (data.user && data.session) {
      await finishSignedIn(data.user.id, data.user.email);
      return;
    }
    // Confirm-email is still ON in the Supabase project
    setStatus({
      kind: 'err',
      text: 'Account created, but email confirmation is required. In Supabase → Authentication → Providers → Email, turn OFF “Confirm email”, then Create account again (or confirm via the email if you prefer).',
    });
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
        text: `Created ${res.created} pickleball sessions in ${WEDGE.pocketName}.`,
      });
      router.replace('/(tabs)/home');
    }
  };

  if (isSignedIn) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
        <Text style={styles.header}>You’re signed in</Text>
        <Text style={styles.sub}>{user?.email}</Text>
        <Text style={styles.mode}>Backend: {mode === 'supabase' ? 'Supabase live' : 'Mock'}</Text>

        {status ? (
          <View style={[styles.statusBox, status.kind === 'err' ? styles.statusErr : styles.statusOk]}>
            <Text style={styles.statusText}>{status.text}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.btn} onPress={seed} disabled={loading} activeOpacity={0.85}>
          <Text style={styles.btnText}>
            {loading ? 'Working…' : 'Seed 2–3 Glebe pickleball sessions'}
          </Text>
        </TouchableOpacity>

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

      <Text style={styles.header}>Come play</Text>
      <Text style={styles.sub}>
        Glebe / Centretown pickleball and more. Make an account so you can host and join real games.
      </Text>

      {mode !== 'supabase' ? (
        <Text style={styles.modeWarn}>
          Offline demo mode — restart Expo with a cleared cache if you expected live sign-in.
        </Text>
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

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        secureTextEntry
        placeholder="At least 6 characters"
        placeholderTextColor="#94A3B8"
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.btn} onPress={onSignIn} activeOpacity={0.85} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Sign in</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondary}
        onPress={onCreate}
        activeOpacity={0.85}
        disabled={loading}
      >
        <Text style={styles.secondaryText}>Create account</Text>
      </TouchableOpacity>

      {status ? (
        <View style={[styles.statusBox, status.kind === 'err' ? styles.statusErr : styles.statusOk]}>
          <Text style={styles.statusText}>{status.text}</Text>
        </View>
      ) : (
        <Text style={styles.hint}>First time here? Tap Create account.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  pad: { padding: 16, paddingBottom: 40 },
  exit: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  exitText: { color: '#0F172A', fontWeight: '800' },
  header: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  sub: { color: '#64748B', marginTop: 6, marginBottom: 16, lineHeight: 20 },
  mode: { color: '#2F6B3A', fontWeight: '700', fontSize: 12, marginBottom: 20 },
  modeWarn: { color: '#7A5A1E', fontWeight: '600', fontSize: 13, marginBottom: 16, lineHeight: 18 },
  label: { color: '#64748B', fontWeight: '700', marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0F172A',
    marginBottom: 16,
  },
  btn: {
    backgroundColor: '#0D9488',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  secondary: {
    marginTop: 12,
    backgroundColor: '#CCFBF1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: { color: '#0F766E', fontWeight: '800' },
  danger: { marginTop: 20, alignItems: 'center', padding: 12 },
  dangerText: { color: '#EF4444', fontWeight: '700' },
  hint: { color: '#64748B', marginTop: 16, lineHeight: 18, fontSize: 13 },
  statusBox: {
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  statusOk: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  statusErr: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  statusText: { color: '#0F172A', lineHeight: 20, fontSize: 14, fontWeight: '600' },
});
