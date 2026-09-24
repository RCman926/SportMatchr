import 'react-native-reanimated';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useLocationStore } from '../lib/locationStore';
import { useAuthStore } from '../lib/authStore';
import { useAppFonts } from '../lib/fonts';
import { touchPresence } from '../lib/presence';
import { theme } from '../constants/theme';
import { NotifyWatcher } from '../components/NotifyWatcher';
import { PulseDot } from '../components/motion';
import { AppErrorBoundary } from '../components/AppErrorBoundary';

const queryClient = new QueryClient();

function Bootstrap() {
  const refreshLocation = useLocationStore((s) => s.refresh);
  const bootstrapAuth = useAuthStore((s) => s.bootstrap);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);

  useEffect(() => {
    void refreshLocation();
    void bootstrapAuth();
  }, [refreshLocation, bootstrapAuth]);

  // Heartbeat while the app is open — counts as “online”, not “looking”
  useEffect(() => {
    if (!bootstrapped) return;

    let alive = true;
    const beat = () => {
      if (!alive) return;
      if (AppState.currentState === 'active' || AppState.currentState === 'unknown') {
        void touchPresence(userId);
      }
    };

    beat();
    const interval = setInterval(beat, 45000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') beat();
    });

    return () => {
      alive = false;
      clearInterval(interval);
      sub.remove();
    };
  }, [bootstrapped, userId]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useAppFonts();
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === 'web' && width >= 1100;

  if (!fontsLoaded) {
    return (
      <View style={bootStyles.root}>
        <PulseDot color={theme.accentBright} size={12} />
        <Text style={bootStyles.mark}>SPORTMATCHR</Text>
        <Text style={bootStyles.sub}>Ottawa · free public places</Text>
        <ActivityIndicator color={theme.accent} style={{ marginTop: 18 }} />
      </View>
    );
  }

  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={[layoutStyles.root, isWideWeb && layoutStyles.wideRoot]}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <Bootstrap />
            <NotifyWatcher />
            <Animated.View
              entering={FadeIn.duration(380).reduceMotion(ReduceMotion.System)}
              style={[layoutStyles.shell, isWideWeb && layoutStyles.wideShell]}
            >
            <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.accent,
              headerTitleStyle: {
                fontFamily: theme.fonts.bodyBold,
                color: theme.ink,
              },
              contentStyle: { backgroundColor: theme.bg },
              animation: 'fade_from_bottom',
              animationDuration: 280,
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="auth"
              options={{
                headerShown: true,
                title: 'Sign in',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="legal"
              options={{
                headerShown: true,
                title: 'Terms & privacy',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="session/[id]/index"
              options={{
                headerShown: true,
                title: 'Session',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="session/[id]/edit"
              options={{
                headerShown: true,
                title: 'Edit game',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="create"
              options={{
                headerShown: true,
                title: 'Host a game',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="profile/[id]"
              options={{
                headerShown: true,
                title: 'Player',
                headerBackTitle: 'Back',
              }}
            />
            </Stack>
            </Animated.View>
          </SafeAreaProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}

const layoutStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  wideRoot: {
    backgroundColor: '#E7EFE4',
  },
  shell: {
    flex: 1,
    width: '100%',
  },
  wideShell: {
    maxWidth: 1180,
    alignSelf: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.border,
  },
});

const bootStyles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.bg,
  },
  mark: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2.4,
    color: theme.accentDark,
  },
  sub: {
    marginTop: 6,
    fontSize: 13,
    color: theme.muted,
  },
});
