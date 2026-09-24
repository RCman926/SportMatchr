import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './authStore';
import { uploadAvatar } from './api';

const STORAGE_KEY = 'sportmatchr.profilePhotoUri';

export async function loadSavedProfilePhoto(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function saveProfilePhoto(uri: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, uri);
}

export async function clearProfilePhoto(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/**
 * Pick a real face photo from library or camera.
 * Safety: people should recognize you at the public court.
 */
export async function pickProfilePhoto(source: 'library' | 'camera' = 'library'): Promise<string | null> {
  if (source === 'camera') {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (!cam.granted) {
      Alert.alert(
        'Camera needed',
        'Allow camera access so you can take a clear face photo for your profile.'
      );
      return null;
    }
  } else {
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!lib.granted) {
      Alert.alert(
        'Photos needed',
        'Allow photo access so you can add a real face picture. Strangers need to recognize you at the court.'
      );
      return null;
    }
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
          cameraType: ImagePicker.CameraType.front,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        });

  if (result.canceled || !result.assets?.[0]?.uri) return null;

  const uri = result.assets[0].uri;
  await saveProfilePhoto(uri);
  return uri;
}

export function profilePhotoPrompt() {
  if (Platform.OS === 'web') {
    return pickProfilePhoto('library');
  }
  return new Promise<string | null>((resolve) => {
    Alert.alert(
      'Add a real face photo',
      'Use a clear photo of your face so people know who they’re meeting at the court. No logos or group shots.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        {
          text: 'Take selfie',
          onPress: () => {
            void pickProfilePhoto('camera').then(resolve);
          },
        },
        {
          text: 'Choose photo',
          onPress: () => {
            void pickProfilePhoto('library').then(resolve);
          },
        },
      ]
    );
  });
}

/**
 * Face photo for Join / Looking.
 * The remote upload matters: other players must be able to recognize the person.
 */
export const REQUIRE_FACE_PHOTO_TO_PLAY = true;

async function saveMeetupPhoto(uri: string): Promise<boolean> {
  const remoteUrl = await uploadAvatar(uri);
  if (remoteUrl) return true;
  Alert.alert(
    'Photo not saved',
    'We couldn’t save your photo to your profile. Check your connection and try again.'
  );
  return false;
}

/** Returns true if OK to proceed. */
export async function ensureFacePhotoForMeetup(opts?: {
  remoteAvatarUrl?: string | null;
}): Promise<boolean> {
  if (!REQUIRE_FACE_PHOTO_TO_PLAY) return true;
  if (useAuthStore.getState().isFounderPreview) return true;
  if (opts?.remoteAvatarUrl) return true;
  const local = await loadSavedProfilePhoto();
  if (local) return saveMeetupPhoto(local);

  const message =
    'Add a real face photo so people can recognize you at the public place. No logos or group shots.';

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const ok = window.confirm(`${message}\n\nAdd a photo now?`);
    if (!ok) return false;
    const uri = await pickProfilePhoto('library');
    return uri ? saveMeetupPhoto(uri) : false;
  }

  return new Promise((resolve) => {
    Alert.alert('Face photo required', message, [
      { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
      {
        text: 'Add photo',
        onPress: () => {
          void profilePhotoPrompt().then(async (uri) => {
            resolve(uri ? await saveMeetupPhoto(uri) : false);
          });
        },
      },
    ]);
  });
}
