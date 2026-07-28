import { supabase, isSupabaseConfigured } from './supabase';
import {
  MOCK_SESSIONS,
  SESSION_CHAT,
  SOLO_PLAYERS,
  MY_PROFILE,
  ChatMessage,
  MockSession,
  SoloPlayer,
} from '../constants/mockData';
import { WEDGE } from '../constants/wedge';

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
};

/** List open sessions — Supabase when configured, else wedge mock */
export async function listSessions(sport?: string | null): Promise<MockSession[]> {
  if (!supabase) {
    return sport ? MOCK_SESSIONS.filter((s) => s.sport === sport) : MOCK_SESSIONS;
  }

  let q = supabase
    .from('sessions')
    .select('*, profiles:host_id(display_name)')
    .eq('status', 'open')
    .order('starts_at', { ascending: true });

  if (sport) q = q.eq('sport', sport);

  const { data, error } = await q;
  if (error || !data?.length) {
    return sport ? MOCK_SESSIONS.filter((s) => s.sport === sport) : MOCK_SESSIONS;
  }

  return data.map((row: any) => ({
    id: row.id,
    sport: row.sport,
    title: row.title,
    players: 1,
    max: row.max_players,
    time: new Date(row.starts_at).toLocaleString(),
    location: row.location,
    courtId: row.court_id ?? undefined,
    description: row.description ?? undefined,
    hostId: row.host_id,
    recurring: row.recurring_rule ?? undefined,
    intensity: row.intensity,
  }));
}

export async function createSession(input: CreateSessionInput): Promise<{ id: string; mock: boolean }> {
  if (!supabase) {
    return { id: `mock-${Date.now()}`, mock: true };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { id: `mock-${Date.now()}`, mock: true };

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

  if (error || !data) return { id: `mock-${Date.now()}`, mock: true };

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

  const { error } = await supabase.from('session_members').upsert({
    session_id: sessionId,
    user_id: user.id,
    role: 'player',
    show_status: 'joined',
  });
  return !error;
}

export async function markHere(sessionId: string): Promise<boolean> {
  if (!supabase) return true;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('session_members')
    .update({ show_status: 'here' })
    .eq('session_id', sessionId)
    .eq('user_id', user.id);
  return !error;
}

export async function markShowStatus(
  sessionId: string,
  userId: string,
  status: 'showed' | 'no_show'
): Promise<boolean> {
  if (!supabase) return true;
  const { error } = await supabase
    .from('session_members')
    .update({ show_status: status })
    .eq('session_id', sessionId)
    .eq('user_id', userId);

  if (!error) {
    const field = status === 'showed' ? 'shows' : 'no_shows';
    try {
      await supabase.rpc('increment_profile_counter', {
        target_user: userId,
        counter: field,
      });
    } catch {
      /* rpc optional until migration applied */
    }
  }
  return !error;
}

export async function submitFeedback(input: SessionFeedbackInput): Promise<boolean> {
  if (!supabase) return true;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from('session_feedback').upsert({
    session_id: input.sessionId,
    user_id: user.id,
    would_play_again: input.wouldPlayAgain ?? null,
    rating: input.rating ?? null,
    want_rematch: input.wantRematch ?? false,
    want_next_week: input.wantNextWeek ?? false,
  });
  return !error;
}

export async function cloneNextWeek(session: MockSession): Promise<{ id: string }> {
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
  return { id: next.id };
}

export async function listSolos(sport?: string | null): Promise<SoloPlayer[]> {
  if (!supabase) {
    return sport ? SOLO_PLAYERS.filter((p) => p.sport === sport) : SOLO_PLAYERS;
  }

  let q = supabase
    .from('solos')
    .select('*, profiles:user_id(display_name, verification, rating, games_played)')
    .gt('available_until', new Date().toISOString());

  if (sport) q = q.eq('sport', sport);

  const { data, error } = await q;
  if (error || !data?.length) {
    return sport ? SOLO_PLAYERS.filter((p) => p.sport === sport) : SOLO_PLAYERS;
  }

  return data.map((row: any) => ({
    id: row.user_id,
    profileId: row.user_id,
    name: row.profiles?.display_name ?? 'Player',
    sport: row.sport,
    skill: row.skill ?? 'Any',
    distanceKm: 1,
    lookingFor: row.looking_for || 'Looking to play',
    available: 'Ready now',
    verification: row.profiles?.verification ?? 'none',
    rating: Number(row.profiles?.rating ?? 5),
    gamesPlayed: Number(row.profiles?.games_played ?? 0),
  }));
}

export async function goLiveSolo(sport: string = WEDGE.primarySport): Promise<boolean> {
  if (!supabase) return true;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const until = new Date(Date.now() + 90 * 60 * 1000).toISOString();
  const { error } = await supabase.from('solos').upsert({
    user_id: user.id,
    sport,
    looking_for: `Looking for ${sport} near ${WEDGE.pocketName}`,
    available_until: until,
    updated_at: new Date().toISOString(),
  });

  await supabase.from('profiles').update({ looking_now: true }).eq('id', user.id);
  return !error;
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

export async function listMessages(threadId: string): Promise<ChatMessage[]> {
  if (!supabase) {
    const key = SESSION_CHAT[threadId] ? threadId : 'solo';
    return SESSION_CHAT[key] ?? SESSION_CHAT.solo;
  }

  const { data, error } = await supabase
    .from('messages')
    .select('id, body, created_at, sender_id, profiles:sender_id(display_name)')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error || !data?.length) {
    const key = SESSION_CHAT[threadId] ? threadId : 'solo';
    return SESSION_CHAT[key] ?? SESSION_CHAT.solo;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return data.map((row: any) => ({
    id: row.id,
    sender: row.profiles?.display_name ?? 'Player',
    text: row.body,
    mine: user?.id === row.sender_id,
    at: new Date(row.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  }));
}

export async function sendMessage(threadId: string, text: string): Promise<ChatMessage | null> {
  if (!supabase) {
    return {
      id: `local-${Date.now()}`,
      sender: 'You',
      text,
      mine: true,
      at: 'Now',
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

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

export async function signInWithEmail(email: string) {
  if (!supabase) return { error: new Error('Supabase not configured. Add EXPO_PUBLIC_SUPABASE_URL and ANON_KEY.') };
  return supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function backendMode(): 'supabase' | 'mock' {
  return isSupabaseConfigured ? 'supabase' : 'mock';
}

export { MY_PROFILE, isSupabaseConfigured };
