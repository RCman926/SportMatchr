const fs = require('fs');
const path = require('path');

/** Load KEY=VALUE pairs from .env without requiring dotenv. */
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const fileEnv = loadEnvFile();
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || fileEnv.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  fileEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

// Ensure Metro / Expo inlining also sees these when present in .env
if (supabaseUrl) process.env.EXPO_PUBLIC_SUPABASE_URL = supabaseUrl;
if (supabaseAnonKey) process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey;

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'SportMatchr',
  slug: 'SportMatchr',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'sportmatchr',
  ios: {
    supportsTablet: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'SportMatchr uses your location to show nearby pickup games and people ready to play at public courts.',
      NSCameraUsageDescription:
        'SportMatchr needs the camera so you can take a real face photo for your profile — people should recognize you at the court.',
      NSPhotoLibraryUsageDescription:
        'SportMatchr needs photo access so you can add a real face picture to your profile for safer meetups.',
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'CAMERA',
      'READ_MEDIA_IMAGES',
      'READ_EXTERNAL_STORAGE',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Allow SportMatchr to use your location to find nearby pickup games at public courts.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Allow SportMatchr to access your photos so you can add a real face picture for safer meetups.',
        cameraPermission:
          'Allow SportMatchr to use the camera so you can take a face photo for your profile.',
      },
    ],
  ],
  extra: {
    supabaseUrl,
    supabaseAnonKey,
    eas: {
      projectId: undefined,
    },
  },
};
