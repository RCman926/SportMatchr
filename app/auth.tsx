import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { backendMode, signInWithEmail } from '../lib/api';
import { WEDGE } from '../constants/wedge';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const mode = backendMode();

  const submit = async () => {
    const value = email.trim();
    if (!value.includes('@')) {
      Alert.alert('Email required', 'Enter a valid email for the magic link.');
      return;
    }
    setLoading(true);
    const { error } = await signInWithEmail(value);
    setLoading(false);
    if (error) {
      Alert.alert(
        'Not connected yet',
        mode === 'mock'
          ? 'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then run the migration in supabase/migrations.'
          : error.message
      );
      return;
    }
    Alert.alert('Check your email', 'Open the magic link to finish signing in.');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.exit}
        onPress={() => router.replace('/(tabs)/home')}
        activeOpacity={0.85}
      >
        <Text style={styles.exitText}>← Continue as guest</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Join SportMatchr</Text>
      <Text style={styles.sub}>
        {WEDGE.pocketName} · {WEDGE.primarySport} first. Public courts only.
      </Text>

      <Text style={styles.mode}>
        Backend: {mode === 'supabase' ? 'Supabase live' : 'Mock (set .env to go live)'}
      </Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="you@email.com"
        placeholderTextColor="#94A3B8"
        value={email}
        onChangeText={setEmail}
      />

      <TouchableOpacity
        style={styles.btn}
        onPress={submit}
        activeOpacity={0.85}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.btnText}>Send magic link</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.hint}>
        Phone verify comes next. Photo/ID stay optional until the pocket has density.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8', padding: 16 },
  exit: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  exitText: { color: '#0F172A', fontWeight: '800' },
  header: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  sub: { color: '#64748B', marginTop: 6, marginBottom: 16, lineHeight: 20 },
  mode: { color: '#0D9488', fontWeight: '700', fontSize: 12, marginBottom: 20 },
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
  hint: { color: '#64748B', marginTop: 16, lineHeight: 18, fontSize: 13 },
});
