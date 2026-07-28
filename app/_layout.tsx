import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <Stack>
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
                title: 'Create',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="profile/[id]"
              options={{
                headerShown: true,
                title: 'Profile',
                headerBackTitle: 'Back',
              }}
            />
          </Stack>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
