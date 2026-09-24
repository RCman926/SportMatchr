import { Platform } from 'react-native';

const KEY = 'sportmatchr.photoNudgeDismissed';

export function isPhotoNudgeDismissed(): boolean {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissPhotoNudge(): void {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* ignore */
  }
}
