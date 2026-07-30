import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useLocationStore } from '../lib/locationStore';
import { useAuthStore } from '../lib/authStore';
import { useAppFonts } from '../lib/fonts';
import { touchPresence } from '../lib/presence';
import { theme } from '../constants/theme';

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

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <Bootstrap />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.accent,
              headerTitleStyle: {
                fontFamily: theme.fonts.bodyBold,
                color: theme.ink,
              },
              contentStyle: { backgroundColor: theme.bg },
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
              name="session/[id]"
              options={{
                headerShown: true,
                title: 'Session',
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
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
