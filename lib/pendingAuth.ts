import { router } from 'expo-router';

const KEY = 'sportmatchr.pendingAuth';
const OAUTH_KEY = 'sportmatchr.oauthReturn';

export type PendingAuth =
  | { kind: 'create'; courtId?: string; sport?: string; when?: string }
  | { kind: 'looking' }
  | { kind: 'join'; id: string };

let memory: PendingAuth | null = null;

function webStore(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function parseIntent(raw: string | null): PendingAuth | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as PendingAuth;
    if (v?.kind === 'create') {
      return {
        kind: 'create',
        courtId: typeof v.courtId === 'string' ? v.courtId : undefined,
        sport: typeof v.sport === 'string' ? v.sport : undefined,
        when: typeof v.when === 'string' ? v.when : undefined,
      };
    }
    if (v?.kind === 'looking') return { kind: 'looking' };
    if (v?.kind === 'join' && typeof v.id === 'string' && v.id) {
      return { kind: 'join', id: v.id };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function setPendingAuth(intent: PendingAuth) {
  memory = intent;
  const ss = webStore();
  if (ss) ss.setItem(KEY, JSON.stringify(intent));
}

export function peekPendingAuth(): PendingAuth | null {
  return parseIntent(webStore()?.getItem(KEY) ?? null) ?? memory;
}

export function takePendingAuth(): PendingAuth | null {
  const ss = webStore();
  const stored = parseIntent(ss?.getItem(KEY) ?? null);
  ss?.removeItem(KEY);
  const fromMem = memory;
  memory = null;
  return stored ?? fromMem;
}

export function markOAuthReturn() {
  const ss = webStore();
  if (ss) ss.setItem(OAUTH_KEY, '1');
}

export function takeOAuthReturn(): boolean {
  const ss = webStore();
  const hit = ss?.getItem(OAUTH_KEY) === '1';
  ss?.removeItem(OAUTH_KEY);
  return hit;
}

export function goToAuth(intent?: PendingAuth) {
  if (intent) setPendingAuth(intent);
  router.push('/auth');
}

export function resumeAfterAuth() {
  const intent = takePendingAuth();
  if (intent?.kind === 'create') {
    router.replace({
      pathname: '/create',
      params: {
        ...(intent.when ? { when: intent.when } : {}),
        ...(intent.sport ? { sport: intent.sport } : {}),
        ...(intent.courtId ? { courtId: intent.courtId } : {}),
      },
    });
    return;
  }
  if (intent?.kind === 'looking') {
    router.replace({ pathname: '/(tabs)/solos', params: { view: 'looking' } });
    return;
  }
  if (intent?.kind === 'join') {
    router.replace({ pathname: '/session/[id]', params: { id: intent.id } });
    return;
  }
  router.replace('/(tabs)/home');
}
