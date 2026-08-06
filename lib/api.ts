import { supabase, isSupabaseConfigured } from './supabase';
import {
  MOCK_SESSIONS,
  SESSION_CHAT,
  SOLO_PLAYERS,
  MY_PROFILE,
  PROFILES,
  ChatMessage,
  MockSession,
  SoloPlayer,
  PlayerProfile,
  VerificationLevel,
} from '../constants/mockData';
import { WEDGE } from '../constants/wedge';
import { getSeasonalPopularSports } from '../constants/sports';
import { areaLabel } from './location';

const DEFAULT_LAT = 45.3989;
const DEFAULT_LNG = -75.6836;

export type CreateSessionInput = {
  sport: string;
  title: string;
  location: string;
  courtId?: string;
  maxPlayers: number;
  startsAt?: string;
  recurring?: string;
  description?: string;
};

export type SessionFeedbackInput = {
  sessionId: string;
  wouldPlayAgain?: boolean;
  rating?: number;
  wantRematch?: boolean;
  wantNextWeek?: boolean;
  /** Did the crew / meetup show up as expected? */
  showedUp?: boolean;
};

export type LiveSession = MockSession & {
  hostName?: string;
  memberCount?: number;
  role?: string;
};

export type SessionMember = {
  userId: string;
  name: string;
  role: 'host' | 'player';
  showStatus: 'joined' | 'here' | 'showed' | 'no_show';
  avatarUrl?: string;
  verification: VerificationLevel;
  skill?: PlayerProfile['skill'];
  neighbourhood?: string;
};

function mapSessionRow(row: any, memberCount = 1): LiveSession {
  return {
    id: row.id,
    sport: row.sport,
    title: row.title,
    players: memberCount,
    max: row.max_players,
    time: new Date(row.starts_at).toLocaleString(),
    location: row.location,
    courtId: row.court_id ?? undefined,
    description: row.description ?? undefined,
    hostId: row.host_id,
    hostName: row.profiles?.display_name,
    recurring: row.recurring_rule ?? undefined,
    intensity: row.intensity,
    memberCount,
  };
}

/** Guest = mock preview. Signed-in live = real DB (empty allowed). */
export async function listSessions(
  sport?: string | null,
  opts?: { live?: boolean }
): Promise<{ sessions: LiveSession[]; source: 'live' | 'demo' }> {
  const live = opts?.live ?? false;

  if (!supabase || !live) {
    const list = sport ? MOCK_SESSIONS.filter((s) => s.sport === sport) : MOCK_SESSIONS;
    return { sessions: list, source: 'demo' };
  }

  let q = supabase
    .from('sessions')
    .select('*, profiles:host_id(display_name), session_members(count)')
    .eq('status', 'open')
    .order('starts_at', { ascending: true });

  if (sport) q = q.eq('sport', sport);

  const { data, error } = await q;
  if (error) {
    console.warn('listSessions', error.message);
    return { sessions: [], source: 'live' };
  }

  const sessions = (data ?? []).map((row: any) => {
    const count = Array.isArray(row.session_members)
      ? Number(row.session_members[0]?.count ?? 1)
      : 1;
    return mapSessionRow(row, count);
  });

  return { sessions, source: 'live' };
}

export async function listMySessions(): Promise<LiveSession[]> {
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('session_members')
    .select('role, sessions(*, profiles:host_id(display_name), session_members(count))')
    .eq('user_id', user.id);

  if (error || !data) return [];

  return data
    .filter((row: any) => row.sessions)
    .map((row: any) => {
      const s = row.sessions;
      const count = Array.isArray(s.session_members)
        ? Number(s.session_members[0]?.count ?? 1)
        : 1;
      return { ...mapSessionRow(s, count), role: row.role === 'host' ? 'Hosting' : 'Joined' };
    });
}

export async function createSession(
  input: CreateSessionInput
): Promise<{ id: string; mock: boolean; error?: string }> {
  if (!supabase) {
    return { id: `mock-${Date.now()}`, mock: true };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { id: '', mock: false, error: 'Sign in required' };

  // Ensure profile exists (trigger should create it; upsert safety)
  await ensureProfile(user.id, user.email);

  const startsAt = input.startsAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      host_id: user.id,
      sport: input.sport,
      title: input.title,
      description: input.description ?? '',
      location: input.location,
      court_id: input.courtId ?? null,
      starts_at: startsAt,
      max_players: input.maxPlayers,
      recurring_rule: input.recurring ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { id: '', mock: false, error: error?.message ?? 'Create failed' };
  }

  await supabase.from('session_members').insert({
    session_id: data.id,
    user_id: user.id,
    role: 'host',
    show_status: 'joined',
  });

  return { id: data.id, mock: false };
}

export async function joinSession(sessionId: string): Promise<boolean> {
  if (!supabase) return true;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  await ensureProfile(user.id, user.email);

  const { error } = await supabase.from('session_members').upsert({
    session_id: sessionId,
    user_id: user.id,
    role: 'player',
    show_status: 'joined',
  });
  return !error;
}

export async function getSessionById(id: string): Promise<LiveSession | null> {
  if (!supabase) {
    return MOCK_SESSIONS.find((s) => s.id === id) ?? null;
  }
  const { data } = await supabase
    .from('sessions')
    .select('*, profiles:host_id(display_name), session_members(count)')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  const count = Array.isArray((data as any).session_members)
    ? Number((data as any).session_members[0]?.count ?? 1)
    : 1;
  return mapSessionRow(data, count);
}

/** Demo roster used when there's no live backend (guest / preview mode). */
function demoRoster(): SessionMember[] {
  const pick = (id: string, role: 'host' | 'player'): SessionMember | null => {
    const p = PROFILES[id];
    if (!p) return null;
    return {
      userId: p.id,
      name: p.name,
      role,
      showStatus: 'joined',
      avatarUrl: p.avatarUrl,
      verification: p.verification,
      skill: p.skill,
      neighbourhood: p.neighbourhood,
    };
  };
  return [
    pick('me', 'host'),
    pick('sam', 'player'),
    pick('alex', 'player'),
    pick('jordan', 'player'),
    pick('casey', 'player'),
  ].filter(Boolean) as SessionMember[];
}

/** Players who have joined a session, host first. */
export async function listSessionMembers(sessionId: string): Promise<SessionMember[]> {
  if (!supabase || sessionId.startsWith('solo') || sessionId.startsWith('mock-')) {
    return demoRoster();
  }

  const { data, error } = await supabase
    .from('session_members')
    .select(
      'user_id, role, show_status, profiles:user_id(display_name, avatar_url, verification, skill, neighbourhood)'
    )
    .eq('session_id', sessionId);

  if (error || !data) {
    console.warn('listSessionMembers', error?.message);
    return [];
  }

  const members: SessionMember[] = data.map((row: any) => ({
    userId: row.user_id,
    name: row.profiles?.display_name ?? 'Player',
    role: row.role === 'host' ? 'host' : 'player',
    showStatus: row.show_status ?? 'joined',
    avatarUrl: row.profiles?.avatar_url ?? undefined,
    verification: (row.profiles?.verification as VerificationLevel) ?? 'none',
    skill: row.profiles?.skill ?? undefined,
    neighbourhood: row.profiles?.neighbourhood ?? undefined,
  }));

  // Host first, then joined order.
  return members.sort((a, b) => (a.role === 'host' ? -1 : b.role === 'host' ? 1 : 0));
}

/**
 * Host-only: remove a player from a session. Hosts cannot remove themselves.
 * Live removal needs the host delete policy from the session_members migration.
 */
export async function removeSessionMember(
  sessionId: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase || sessionId.startsWith('solo') || sessionId.startsWith('mock-')) {
    return { ok: true };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sign in required' };
  if (user.id === userId) return { ok: false, error: "You can't remove yourself as host" };

  const { error } = await supabase
    .from('session_members')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .neq('role', 'host');

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function markHere(sessionId: string): Promise<boolean> {
  if (!supabase) return true;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: existing } = await supabase
    .from('session_members')
    .select('show_status')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();

  const { error } = await supabase
    .from('session_members')
    .update({ show_status: 'here' })
    .eq('session_id', sessionId)
    .eq('user_id', user.id);
  if (error) return false;

  // First check-in for this session → bump show count
  if (existing?.show_status !== 'here' && existing?.show_status !== 'showed') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('shows, games_played')
      .eq('id', user.id)
      .maybeSingle();
    await supabase
      .from('profiles')
      .update({
        shows: (profile?.shows ?? 0) + 1,
        games_played: (profile?.games_played ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
  }
  return true;
}

export async function submitFeedback(input: SessionFeedbackInput): Promise<boolean> {
  if (!supabase) return true;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from('session_feedback').upsert(
    {
      session_id: input.sessionId,
      user_id: user.id,
      would_play_again: input.wouldPlayAgain ?? null,
      rating: input.rating ?? null,
      want_rematch: input.wantRematch ?? false,
      want_next_week: input.wantNextWeek ?? false,
      showed_up: input.showedUp ?? null,
    },
    { onConflict: 'session_id,user_id' }
  );
  if (error) return false;

  // Credit other players with a rematch vote (trust, not skill)
  if (typeof input.wouldPlayAgain === 'boolean') {
    const { data: members } = await supabase
      .from('session_members')
      .select('user_id')
      .eq('session_id', input.sessionId);
    const others = (members ?? [])
      .map((m) => m.user_id as string)
      .filter((id) => id !== user.id);

    for (const otherId of others) {
      const { data: p } = await supabase
        .from('profiles')
        .select('rematch_yes, rematch_total')
        .eq('id', otherId)
        .maybeSingle();
      await supabase
        .from('profiles')
        .update({
          rematch_total: (p?.rematch_total ?? 0) + 1,
          rematch_yes: (p?.rematch_yes ?? 0) + (input.wouldPlayAgain ? 1 : 0),
          updated_at: new Date().toISOString(),
        })
        .eq('id', otherId);
    }
  }
  return true;
}

export type OnlinePerson = {
  id: string;
  name: string;
  kind: 'signed_in' | 'visitor';
  lookingNow: boolean;
  neighbourhood?: string;
  avatarUrl?: string;
  verification?: VerificationLevel;
};

/** How many devices are currently in the app (last ~2 min). Guests count too. */
export async function countOnlineNow(): Promise<{ count: number; source: 'live' | 'demo' }> {
  if (!supabase) {
    return { count: Math.max(1, SOLO_PLAYERS.length), source: 'demo' };
  }

  const { data, error } = await supabase.rpc('online_now_count', { within_seconds: 120 });
  if (!error && typeof data === 'number') {
    return { count: data, source: 'live' };
  }

  return { count: 0, source: 'live' };
}

/** People currently in the app — signed-in profiles + anonymous visitor count. */
export async function listOnlinePeople(opts?: {
  live?: boolean;
}): Promise<{ people: OnlinePerson[]; visitorCount: number; total: number; source: 'live' | 'demo' }> {
  const live = opts?.live ?? isSupabaseConfigured;

  if (!supabase || !live) {
    const people: OnlinePerson[] = Object.values(PROFILES)
      .filter((p) => p.id !== 'me')
      .slice(0, 4)
      .map((p) => ({
        id: p.id,
        name: p.name,
        kind: 'signed_in' as const,
        lookingNow: Boolean(p.lookingNow),
        neighbourhood: p.neighbourhood,
        avatarUrl: p.avatarUrl,
        verification: p.verification,
      }));
    return { people, visitorCount: 2, total: people.length + 2, source: 'demo' };
  }

  const since = new Date(Date.now() - 120_000).toISOString();
  const { data, error } = await supabase
    .from('app_presence')
    .select(
      'client_id, user_id, last_seen_at, profiles:user_id(display_name, neighbourhood, avatar_url, verification, looking_now)'
    )
    .gt('last_seen_at', since)
    .order('last_seen_at', { ascending: false });

  if (error) {
    console.warn('listOnlinePeople', error.message);
    return { people: [], visitorCount: 0, total: 0, source: 'live' };
  }

  const people: OnlinePerson[] = [];
  let visitorCount = 0;
  const seenUsers = new Set<string>();

  for (const row of data ?? []) {
    if (!row.user_id) {
      visitorCount += 1;
      continue;
    }
    if (seenUsers.has(row.user_id)) continue;
    seenUsers.add(row.user_id);
    const profile = (row as any).profiles;
    people.push({
      id: row.user_id,
      name: profile?.display_name ?? 'Player',
      kind: 'signed_in',
      lookingNow: Boolean(profile?.looking_now),
      neighbourhood: profile?.neighbourhood ?? WEDGE.pocketName,
      avatarUrl: profile?.avatar_url ?? undefined,
      verification: (profile?.verification as VerificationLevel) ?? 'none',
    });
  }

  return {
    people,
    visitorCount,
    total: people.length + visitorCount,
    source: 'live',
  };
}

/** How many people are actively looking via Go Live (solos). */
export async function countLookingNow(): Promise<{ count: number; source: 'live' | 'demo' }> {
  if (!supabase) {
    return { count: SOLO_PLAYERS.length, source: 'demo' };
  }

  const { data, error } = await supabase.rpc('looking_now_count');
  if (!error && typeof data === 'number') {
    return { count: data, source: 'live' };
  }

  const { count, error: cErr } = await supabase
    .from('solos')
    .select('*', { count: 'exact', head: true })
    .gt('available_until', new Date().toISOString());

  if (!cErr && typeof count === 'number') {
    return { count, source: 'live' };
  }

  return { count: SOLO_PLAYERS.length, source: 'demo' };
}

export function trustLabel(profile: Pick<PlayerProfile, 'shows' | 'noShows' | 'rematchYes' | 'rematchTotal'>): string {
  const shows = profile.shows ?? 0;
  const noShows = profile.noShows ?? 0;
  const totalShow = shows + noShows;
  const rematchYes = profile.rematchYes ?? 0;
  const rematchTotal = profile.rematchTotal ?? 0;

  const parts: string[] = [];
  if (totalShow === 0 && rematchTotal === 0) {
    return 'New around here — no games yet';
  }
  if (totalShow > 0) {
    const rate = shows / totalShow;
    if (rate >= 0.85) parts.push('Usually shows up');
    else if (rate >= 0.6) parts.push('Often shows up');
    else parts.push('Mixed show-up so far');
  }
  if (rematchTotal > 0) {
    parts.push(
      rematchYes === 1 ? '1 person would rematch' : `${rematchYes} people would rematch`
    );
  }
  return parts.join(' · ');
}

export async function cloneNextWeek(session: MockSession): Promise<{ id: string; error?: string }> {
  const next = await createSession({
    sport: session.sport,
    title: session.title,
    location: session.location,
    courtId: session.courtId,
    maxPlayers: session.max,
    description: session.description,
    recurring: session.recurring ?? `Weekly · ${session.time}`,
    startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  return { id: next.id, error: next.error };
}

export async function listSolos(
  sport?: string | null,
  opts?: { live?: boolean }
): Promise<{ players: SoloPlayer[]; source: 'live' | 'demo' }> {
  const live = opts?.live ?? false;
  if (!supabase || !live) {
    const list = sport ? SOLO_PLAYERS.filter((p) => p.sport === sport) : SOLO_PLAYERS;
    return { players: list, source: 'demo' };
  }

  let q = supabase
    .from('solos')
    .select(
      '*, profiles:user_id(display_name, verification, rating, games_played, avatar_url, neighbourhood)'
    )
    .gt('available_until', new Date().toISOString());

  if (sport) q = q.eq('sport', sport);

  const { data, error } = await q;
  if (error) {
    console.warn('listSolos', error.message);
    return { players: [], source: 'live' };
  }

  const players: SoloPlayer[] = (data ?? []).map((row: any) => {
    const lat = Number(row.lat ?? DEFAULT_LAT);
    const lng = Number(row.lng ?? DEFAULT_LNG);
    return {
      id: row.user_id,
      profileId: row.user_id,
      name: row.profiles?.display_name ?? 'Player',
      sport: row.sport,
      skill: (row.skill as SoloPlayer['skill']) ?? 'Any',
      distanceKm: 1,
      lat,
      lng,
      neighbourhood: row.profiles?.neighbourhood || areaLabel({ lat, lng }),
      lookingFor: row.looking_for || 'Looking to play',
      available: 'Ready now',
      verification: (row.profiles?.verification as VerificationLevel) ?? 'none',
      rating: Number(row.profiles?.rating ?? 5),
      gamesPlayed: Number(row.profiles?.games_played ?? 0),
    };
  });

  return { players, source: 'live' };
}

export async function goLiveSolo(
  sport: string = getSeasonalPopularSports()[0] ?? 'Basketball',
  coords?: { lat: number; lng: number }
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: true };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sign in required' };

  await ensureProfile(user.id, user.email);

  const until = new Date(Date.now() + 90 * 60 * 1000).toISOString();
  const { error } = await supabase.from('solos').upsert({
    user_id: user.id,
    sport,
    looking_for: `Looking for ${sport} near ${WEDGE.pocketName}`,
    available_until: until,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    updated_at: new Date().toISOString(),
  });

  if (error) return { ok: false, error: error.message };
  await supabase.from('profiles').update({ looking_now: true }).eq('id', user.id);
  return { ok: true };
}

export async function stopLiveSolo(): Promise<boolean> {
  if (!supabase) return true;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  await supabase.from('solos').delete().eq('user_id', user.id);
  await supabase.from('profiles').update({ looking_now: false }).eq('id', user.id);
  return true;
}

export async function listMessages(
  threadId: string,
  opts?: { live?: boolean }
): Promise<ChatMessage[]> {
  const live = opts?.live ?? false;
  if (!supabase || !live) {
    const key = SESSION_CHAT[threadId] ? threadId : 'solo';
    return SESSION_CHAT[key] ?? SESSION_CHAT.solo;
  }

  const { data, error } = await supabase
    .from('messages')
    .select('id, body, created_at, sender_id, profiles:sender_id(display_name)')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (data ?? []).map((row: any) => ({
    id: row.id,
    sender: row.profiles?.display_name ?? 'Player',
    text: row.body,
    mine: user?.id === row.sender_id,
    at: new Date(row.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  }));
}

export async function sendMessage(threadId: string, text: string): Promise<ChatMessage | null> {
  const local = (): ChatMessage => ({
    id: `local-${Date.now()}`,
    sender: 'You',
    text,
    mine: true,
    at: 'Now',
  });

  if (!supabase) return local();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Guest / demo: keep chatting locally without forcing auth
  if (!user) return local();

  await ensureProfile(user.id, user.email);

  const { data, error } = await supabase
    .from('messages')
    .insert({ thread_id: threadId, sender_id: user.id, body: text })
    .select('id, created_at')
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    sender: 'You',
    text,
    mine: true,
    at: 'Now',
  };
}

export function subscribeMessages(
  threadId: string,
  onInsert: (msg: ChatMessage) => void
): () => void {
  if (!supabase) return () => undefined;

  const channel = supabase
    .channel(`messages:${threadId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `thread_id=eq.${threadId}`,
      },
      async (payload) => {
        const row = payload.new as any;
        const {
          data: { user },
        } = await supabase!.auth.getUser();
        let sender = 'Player';
        const { data: prof } = await supabase!
          .from('profiles')
          .select('display_name')
          .eq('id', row.sender_id)
          .maybeSingle();
        if (prof?.display_name) sender = prof.display_name;
        onInsert({
          id: row.id,
          sender,
          text: row.body,
          mine: user?.id === row.sender_id,
          at: new Date(row.created_at).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          }),
        });
      }
    )
    .subscribe();

  return () => {
    void supabase!.removeChannel(channel);
  };
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) {
    return {
      data: { user: null, session: null },
      error: new Error(
        'Supabase not loaded. Run: npx expo start --clear (needs .env with EXPO_PUBLIC_SUPABASE_*).'
      ),
    };
  }
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword(email: string, password: string) {
  if (!supabase) {
    return {
      data: { user: null, session: null },
      error: new Error(
        'Supabase not loaded. Run: npx expo start --clear (needs .env with EXPO_PUBLIC_SUPABASE_*).'
      ),
    };
  }
  const result = await supabase.auth.signUp({ email, password });
  if (result.data.user && result.data.session) {
    await ensureProfile(result.data.user.id, result.data.user.email);
  }
  return result;
}

/** @deprecated Prefer password auth for local MVP */
export async function signInWithEmail(email: string) {
  if (!supabase) {
    return {
      error: new Error(
        'Supabase not loaded. Stop Expo, then run: npx expo start --clear (needs .env with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY).'
      ),
    };
  }
  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/auth` : 'sportmatchr://auth';
  return supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: redirectTo,
    },
  });
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function ensureProfile(userId: string, email?: string | null) {
  if (!supabase) return;
  const { data } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
  if (data) return;
  const name = email?.split('@')[0] || 'Player';
  await supabase.from('profiles').upsert({
    id: userId,
    display_name: name,
    handle: `u${userId.slice(0, 8)}`,
  });
}

function mapProfileRow(data: any): PlayerProfile {
  return {
    id: data.id,
    name: data.display_name,
    handle: data.handle ? `@${String(data.handle).replace(/^@/, '')}` : '@player',
    bio: data.bio ?? '',
    city: data.city ?? 'Ottawa',
    neighbourhood: data.neighbourhood ?? WEDGE.pocketName,
    sports: data.sports?.length ? data.sports : ['Pickleball'],
    skill: data.skill ?? 'Any',
    intensity: data.intensity ?? 'casual',
    verification: data.verification ?? 'none',
    avatarUrl: data.avatar_url ?? undefined,
    gamesPlayed: data.games_played ?? 0,
    rating: Number(data.rating ?? 5),
    streakDays: data.streak_days ?? 0,
    memberSince: data.created_at ? String(data.created_at).slice(0, 4) : '2026',
    preferredCourts: data.preferred_courts ?? [],
    lookingNow: Boolean(data.looking_now),
    shows: data.shows ?? 0,
    noShows: data.no_shows ?? 0,
    rematchYes: data.rematch_yes ?? 0,
    rematchTotal: data.rematch_total ?? 0,
  };
}

export async function fetchMyProfile(): Promise<PlayerProfile | null> {
  if (!supabase) return MY_PROFILE;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  await ensureProfile(user.id, user.email);

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!data) return null;
  return mapProfileRow(data);
}

export async function fetchProfileById(id: string): Promise<PlayerProfile | null> {
  if (PROFILES[id]) return PROFILES[id];
  if (!supabase) return PROFILES.alex;

  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapProfileRow(data);
}

export async function updateMyProfile(patch: {
  display_name?: string;
  bio?: string;
  sports?: string[];
  looking_now?: boolean;
  avatar_url?: string | null;
  neighbourhood?: string;
}): Promise<boolean> {
  if (!supabase) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', user.id);
  return !error;
}

export async function uploadAvatar(localUri: string): Promise<string | null> {
  if (!supabase) return localUri;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const ext = localUri.split('.').pop()?.split('?')[0] || 'jpg';
  const path = `${user.id}/avatar.${ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp' ? ext : 'jpg'}`;

  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error } = await supabase.storage.from('avatars').upload(path, blob, {
    upsert: true,
    contentType: blob.type || 'image/jpeg',
  });
  if (error) {
    console.warn('uploadAvatar', error.message);
    return null;
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = `${data.publicUrl}?t=${Date.now()}`;
  await updateMyProfile({ avatar_url: url });
  return url;
}

/** Seed recurring Glebe pickleball sessions for the signed-in founder (idempotent-ish). */
export async function seedFounderSessions(): Promise<{ created: number; error?: string }> {
  if (!supabase) return { created: 0, error: 'No supabase' };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { created: 0, error: 'Sign in required' };

  await ensureProfile(user.id, user.email);

  const { count } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('host_id', user.id)
    .eq('status', 'open');

  if ((count ?? 0) >= 2) return { created: 0 };

  const seeds: CreateSessionInput[] = [
    {
      sport: 'Pickleball',
      title: 'Tuesday Open Play',
      location: 'Lansdowne Park / Aberdeen Pavilion area',
      courtId: 'lansdowne',
      maxPlayers: 8,
      recurring: 'Every Tue 7:00 PM',
      description: 'Recurring Tue open play. Beginners welcome.',
      startsAt: nextWeekday(2, 19), // Tuesday 7pm
    },
    {
      sport: 'Pickleball',
      title: 'Weekend beginner vibe',
      location: 'Brewer Park',
      courtId: 'brewer',
      maxPlayers: 6,
      recurring: 'Every Sat 10:00 AM',
      description: 'Soft teaching welcome. Same time next week.',
      startsAt: nextWeekday(6, 10),
    },
    {
      sport: 'Pickleball',
      title: 'Lunch doubles',
      location: 'Lansdowne Park / Aberdeen Pavilion area',
      courtId: 'lansdowne',
      maxPlayers: 4,
      description: 'Quick lunch game. Casual only.',
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  let created = 0;
  for (const s of seeds) {
    const res = await createSession(s);
    if (!res.error && res.id) created += 1;
  }
  return { created };
}

function nextWeekday(day: number, hour: number): string {
  const d = new Date();
  const delta = (day + 7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + delta);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export function backendMode(): 'supabase' | 'mock' {
  return isSupabaseConfigured ? 'supabase' : 'mock';
}

export { MY_PROFILE, isSupabaseConfigured };
