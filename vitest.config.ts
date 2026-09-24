import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      'react-native': new URL('./test/stubs/react-native.ts', import.meta.url).pathname,
      'expo-location': new URL('./test/stubs/expo-location.ts', import.meta.url).pathname,
    },
  },
});
