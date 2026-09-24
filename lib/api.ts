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
import { shouldUseDemoData, useAuthStore } from './authStore';
import { canAccessFounderOps } from './founder';
import { bumpCounters, type GameResult, type ResultLogEntry } from './record';
import { haversineKm } from './location';
import { useLocationStore } from './locationStore';
import {
  parseAgeGroup,
  parsePlayMix,
  parseSkillLevel,
  type AgeGroup,
  type PlayMix,
  type SkillLevel,
} from './sessionFilters';

export type { GameResult } from './record';

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
  playMix?: PlayMix;
  ageGroup?: AgeGroup;
  skillLevel?: SkillLevel;
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
  startsAt?: string;
  playMix?: PlayMix;
  ageGroup?: AgeGroup;
  skillLevel?: SkillLevel;
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
    startsAt: row.starts_at ?? undefined,
    playMix: parsePlayMix(row.play_mix),
    ageGroup: parseAgeGroup(row.age_group),
    skillLevel: parseSkillLevel(row.skill_level),
  };
}

/**
 * Live board for everyone except founder demo mode (preview, not signed in).
 * Friends on the public URL see real (possibly empty) data — never ghost mock people.
 */
export async function listSessions(
  sport?: string | null,
  _opts?: { live?: boolean }
): Promise<{ sessions: LiveSession[]; source: 'live' | 'demo'; error?: string }> {
  if (shouldUseDemoData() || !supabase) {
    if (shouldUseDemoData()) {
      const list = sport ? MOCK_SESSIONS.filter((s) => s.sport === sport) : MOCK_SESSIONS;
      return { sessions: list, source: 'demo' };
    }
    return {
      sessions: [],
      source: 'live',
      error: 'Games are temporarily unavailable. Pull to retry.',
    };
  }

  if (!useAuthStore.getState().isSignedIn) {
    const { data, error } = await supabase.rpc('list_public_sessions', {
      p_sport: sport || null,
    });
    if (error) {
      console.warn('list_public_sessions', error.message);
      return {
        sessions: [],
        source: 'live',
        error: 'Couldn’t reach the live games board. Pull to retry.',
      };
    }
    return {
      sessions: (data ?? []).map((row: any) =>
        mapSessionRow(
          {
            ...row,
            profiles: { display_name: row.host_name },
          },
          Number(row.member_count ?? 1)
        )
      ),
      source: 'live',
    };
  }

  // Hide games that started more than 6h ago (board stays fresh; host cancel still available)
  const staleBefore = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  let q = supabase
    .from('sessions')
    .select('*, profiles:host_id(display_name), session_members(count)')
    .eq('status', 'open')
    .gte('starts_at', staleBefore)
    .order('starts_at', { ascending: true });

  if (sport) q = q.eq('sport', sport);

  const { data, error } = await q;
  if (error) {
    console.warn('listSessions', error.message);
    return {
      sessions: [],
      source: 'live',
      error: 'Couldn’t reach the live games board. Pull to retry.',
    };
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
  // Founder demo (no account) — local mock session so you can walk the flow
  if (!supabase || shouldUseDemoData()) {
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
      play_mix: input.playMix ?? 'mixed',
      age_group: input.ageGroup ?? 'any',
      skill_level: input.skillLevel ?? 'any',
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
  if (!supabase) return shouldUseDemoData();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  await ensureProfile(user.id, user.email);

  const { data: session } = await supabase
    .from('sessions')
    .select('id, max_players, status, host_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (!session || session.status !== 'open') return false;

  const { count } = await supabase
    .from('session_members')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId);

  const { data: existing } = await supabase
    .from('session_members')
    .select('user_id')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existing && (count ?? 0) >= (session.max_players ?? 8)) {
    return false;
  }

  const { error } = await supabase.from('session_members').upsert({
    session_id: sessionId,
    user_id: user.id,
    role: user.id === session.host_id ? 'host' : 'player',
    show_status: 'joined',
  });
  if (error) return false;

  const nextCount = (count ?? 0) + (existing ? 0 : 1);
  if (nextCount >= (session.max_players ?? 8)) {
    await supabase.from('sessions').update({ status: 'full' }).eq('id', sessionId);
  }
  return true;
}

export async function leaveSession(sessionId: string): Promise<boolean> {
  if (!supabase) return shouldUseDemoData();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: session } = await supabase
    .from('sessions')
    .select('host_id, status')
    .eq('id', sessionId)
    .maybeSingle();
  if (!session) return false;
  if (session.host_id === user.id) return false;

  const { error } = await supabase
    .from('session_members')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', user.id);
  if (error) return false;

  if (session.status === 'full') {
    await supabase.from('sessions').update({ status: 'open' }).eq('id', sessionId);
  }
  return true;
}

export type SessionMember = {
  userId: string;
  name: string;
  role: 'host' | 'player';
  avatarUrl?: string;
};

export async function listSessionMembers(sessionId: string): Promise<SessionMember[]> {
  if (!supabase || sessionId.startsWith('mock-')) return [];
  const { data, error } = await supabase
    .from('session_members')
    .select('user_id, role, profiles:user_id(display_name, avatar_url)')
    .eq('session_id', sessionId);
  if (error || !data) return [];
  return data.map((row: any) => ({
    userId: row.user_id,
    name: row.profiles?.display_name ?? 'Player',
    role: row.role === 'host' ? 'host' : 'player',
    avatarUrl: row.profiles?.avatar_url ?? undefined,
  }));
}

export type UpdateSessionInput = {
  sport?: string;
  title?: string;
  location?: string;
  courtId?: string | null;
  maxPlayers?: number;
  description?: string;
  recurring?: string | null;
  startsAt?: string;
  playMix?: PlayMix;
  ageGroup?: AgeGroup;
  skillLevel?: SkillLevel;
};

export async function updateSession(
  sessionId: string,
  input: UpdateSessionInput
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Not connected' };
  if (sessionId.startsWith('mock-')) return { ok: true };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sign in required' };

  const patch: Record<string, unknown> = {};
  if (input.sport != null) patch.sport = input.sport;
  if (input.title != null) patch.title = input.title.trim();
  if (input.location != null) patch.location = input.location.trim();
  if (input.courtId !== undefined) patch.court_id = input.courtId;
  if (input.maxPlayers != null) patch.max_players = input.maxPlayers;
  if (input.description != null) patch.description = input.description;
  if (input.recurring !== undefined) patch.recurring_rule = input.recurring;
  if (input.startsAt != null) patch.starts_at = input.startsAt;
  if (input.playMix != null) patch.play_mix = input.playMix;
  if (input.ageGroup != null) patch.age_group = input.ageGroup;
  if (input.skillLevel != null) patch.skill_level = input.skillLevel;

  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await supabase
    .from('sessions')
    .update(patch)
    .eq('id', sessionId)
    .eq('host_id', user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function transferSessionHost(
  sessionId: string,
  newHostId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Not connected' };
  if (sessionId.startsWith('mock-')) return { ok: true };

  const { data, error } = await supabase.rpc('transfer_session_host', {
    p_session_id: sessionId,
    p_new_host_id: newHostId,
  });

  if (error) return { ok: false, error: error.message };
  const row = data as { ok?: boolean; error?: string } | null;
  if (!row?.ok) return { ok: false, error: row?.error ?? 'Transfer failed' };
  return { ok: true };
}

export async function removeSessionMember(
  sessionId: string,
  memberId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Not connected' };
  if (sessionId.startsWith('mock-')) return { ok: true };

  const { data, error } = await supabase.rpc('remove_session_member', {
    p_session_id: sessionId,
    p_member_id: memberId,
  });

  if (error) return { ok: false, error: error.message };
  const row = data as { ok?: boolean; error?: string } | null;
  if (!row?.ok) return { ok: false, error: row?.error ?? 'Could not remove player' };
  return { ok: true };
}

export async function cancelSession(sessionId: string): Promise<boolean> {
  if (!supabase) return shouldUseDemoData();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('sessions')
    .update({ status: 'cancelled' })
    .eq('id', sessionId)
    .eq('host_id', user.id);
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

/**
 * Optional self-reported result after a meetup. Not a ranking —
 * updates W–L–D + recent log so profiles can show % / trend.
 */
export async function submitGameResult(input: {
  sessionId: string;
  sport: string;
  result: GameResult;
}): Promise<{ ok: boolean; error?: string }> {
  const entry: ResultLogEntry = {
    result: input.result,
    sport: input.sport,
    at: new Date().toISOString().slice(0, 10),
    sessionId: input.sessionId,
  };

  if (!supabase) {
    const p = MY_PROFILE;
    const prev = (p.resultLog ?? []).find((e) => e.sessionId === input.sessionId);
    let wins = p.wins ?? 0;
    let losses = p.losses ?? 0;
    let draws = p.draws ?? 0;
    if (prev) {
      ({ wins, losses, draws } = bumpCounters(wins, losses, draws, prev.result, -1));
    }
    ({ wins, losses, draws } = bumpCounters(wins, losses, draws, input.result, 1));
    p.wins = wins;
    p.losses = losses;
    p.draws = draws;
    p.resultLog = [
      entry,
      ...(p.resultLog ?? []).filter((e) => e.sessionId !== input.sessionId),
    ].slice(0, 40);
    return { ok: true };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sign in to save a result' };

  const { data: existing } = await supabase
    .from('session_feedback')
    .select('result')
    .eq('session_id', input.sessionId)
    .eq('user_id', user.id)
    .maybeSingle();

  const { error: fbErr } = await supabase.from('session_feedback').upsert(
    {
      session_id: input.sessionId,
      user_id: user.id,
      result: input.result,
      sport: input.sport,
    },
    { onConflict: 'session_id,user_id' }
  );
  if (fbErr) return { ok: false, error: fbErr.message };

  const { data: profile } = await supabase
    .from('profiles')
    .select('wins, losses, draws, result_log')
    .eq('id', user.id)
    .maybeSingle();

  let wins = Number(profile?.wins ?? 0);
  let losses = Number(profile?.losses ?? 0);
  let draws = Number(profile?.draws ?? 0);
  const oldResult = existing?.result as GameResult | null | undefined;
  if (oldResult === 'win' || oldResult === 'loss' || oldResult === 'draw' || oldResult === 'fun') {
    ({ wins, losses, draws } = bumpCounters(wins, losses, draws, oldResult, -1));
  }
  ({ wins, losses, draws } = bumpCounters(wins, losses, draws, input.result, 1));

  const prevLog = Array.isArray(profile?.result_log)
    ? (profile!.result_log as ResultLogEntry[])
    : [];
  const nextLog = [
    entry,
    ...prevLog.filter((e) => e.sessionId !== input.sessionId),
  ].slice(0, 40);

  const { error: pErr } = await supabase
    .from('profiles')
    .update({
      wins,
      losses,
      draws,
      result_log: nextLog,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (pErr) return { ok: false, error: pErr.message };
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

  // Credit other players via SECURITY DEFINER RPC (RLS blocks direct profile updates)
  if (typeof input.wouldPlayAgain === 'boolean') {
    const { error: rpcErr } = await supabase.rpc('credit_rematch_votes', {
      p_session_id: input.sessionId,
      p_would_play_again: input.wouldPlayAgain,
    });
    if (rpcErr) console.warn('credit_rematch_votes', rpcErr.message);
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
  if (shouldUseDemoData()) {
    return { count: Math.max(1, SOLO_PLAYERS.length), source: 'demo' };
  }
  if (!supabase) {
    return { count: 0, source: 'live' };
  }

  const { data, error } = await supabase.rpc('online_now_count', { within_seconds: 120 });
  if (!error && typeof data === 'number') {
    return { count: data, source: 'live' };
  }

  return { count: 0, source: 'live' };
}

/** People currently in the app — signed-in profiles + anonymous visitor count. */
export async function listOnlinePeople(_opts?: {
  live?: boolean;
}): Promise<{ people: OnlinePerson[]; visitorCount: number; total: number; source: 'live' | 'demo' }> {
  if (shouldUseDemoData() || !supabase) {
    if (shouldUseDemoData()) {
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
    return { people: [], visitorCount: 0, total: 0, source: 'live' };
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
  if (shouldUseDemoData()) {
    return { count: SOLO_PLAYERS.length, source: 'demo' };
  }
  if (!supabase) {
    return { count: 0, source: 'live' };
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

  return { count: 0, source: 'live' };
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

export async function cloneNextWeek(session: LiveSession | MockSession): Promise<{ id: string; error?: string }> {
  const live = session as LiveSession;
  const next = await createSession({
    sport: session.sport,
    title: session.title,
    location: session.location,
    courtId: session.courtId,
    maxPlayers: session.max,
    description: session.description,
    recurring: session.recurring ?? `Weekly · ${session.time}`,
    startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    playMix: live.playMix,
    ageGroup: live.ageGroup,
    skillLevel: live.skillLevel,
  });
  return { id: next.id, error: next.error };
}

export async function listSolos(
  sport?: string | null,
  _opts?: { live?: boolean }
): Promise<{ players: SoloPlayer[]; source: 'live' | 'demo' }> {
  if (shouldUseDemoData() || !supabase) {
    if (shouldUseDemoData()) {
      const list = sport ? SOLO_PLAYERS.filter((p) => p.sport === sport) : SOLO_PLAYERS;
      return { players: list, source: 'demo' };
    }
    return { players: [], source: 'live' };
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

  const origin = useLocationStore.getState().coords ?? { lat: DEFAULT_LAT, lng: DEFAULT_LNG };

  const players: SoloPlayer[] = (data ?? []).map((row: any) => {
    const lat = Number(row.lat ?? DEFAULT_LAT);
    const lng = Number(row.lng ?? DEFAULT_LNG);
    return {
      id: row.user_id,
      profileId: row.user_id,
      name: row.profiles?.display_name ?? 'Player',
      sport: row.sport,
      skill: (row.skill as SoloPlayer['skill']) ?? 'Any',
      distanceKm: haversineKm(origin, { lat, lng }),
      lat,
      lng,
      neighbourhood: row.profiles?.neighbourhood || areaLabel({ lat, lng }),
      lookingFor: row.looking_for || 'Looking to play',
      available: 'Ready now',
      verification: (row.profiles?.verification as VerificationLevel) ?? 'none',
      rating: Number(row.profiles?.rating ?? 5),
      gamesPlayed: Number(row.profiles?.games_played ?? 0),
      avatarUrl: row.profiles?.avatar_url ?? undefined,
    };
  });

  return { players, source: 'live' };
}

export async function goLiveSolo(
  sport: string = getSeasonalPopularSports()[0] ?? 'Basketball',
  coords?: { lat: number; lng: number }
): Promise<{ ok: boolean; error?: string }> {
  if (shouldUseDemoData()) return { ok: true };
  if (!supabase) return { ok: false, error: 'Sign in required' };
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
  _opts?: { live?: boolean }
): Promise<ChatMessage[]> {
  if (shouldUseDemoData() || !supabase) {
    if (SESSION_CHAT[threadId]) return SESSION_CHAT[threadId];
    return [];
  }

  let { data, error } = await supabase
    .from('messages')
    .select('id, body, created_at, sender_id, profiles:sender_id(display_name, avatar_url)')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  // Profile join may fail for some roles — retry bare rows.
  if (error) {
    const retry = await supabase
      .from('messages')
      .select('id, body, created_at, sender_id')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    data = retry.data as typeof data;
    error = retry.error;
  }

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
    avatarUrl: row.profiles?.avatar_url ?? undefined,
    senderId: row.sender_id,
  }));
}

export async function sendMessage(threadId: string, text: string): Promise<ChatMessage | null> {
  // Founder demo (no account): local-only bubbles for click-through
  if (shouldUseDemoData()) {
    return {
      id: `local-${Date.now()}`,
      sender: 'You',
      text,
      mine: true,
      at: 'Now',
    };
  }

  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

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

/**
 * Looking "Say hi" → real 2-person open session both can chat in.
 */
export async function startMeetupWithLooking(input: {
  otherUserId: string;
  sport: string;
  title?: string;
  location?: string;
  neighbourhood?: string;
}): Promise<{ id: string; error?: string }> {
  if (shouldUseDemoData()) {
    return { id: `mock-meetup-${Date.now()}` };
  }
  if (!supabase) return { id: '', error: 'Sign in required' };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { id: '', error: 'Sign in required' };
  if (user.id === input.otherUserId) {
    return { id: '', error: 'That’s you' };
  }

  await ensureProfile(user.id, user.email);

  // Reuse an open meetup between these two for the same sport (last 24h)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: mine } = await supabase
    .from('session_members')
    .select('session_id, sessions!inner(id, sport, status, title, created_at)')
    .eq('user_id', user.id)
    .gte('joined_at', since);

  for (const row of mine ?? []) {
    const s = (row as any).sessions;
    if (!s || s.status !== 'open' || s.sport !== input.sport) continue;
    if (!String(s.title ?? '').startsWith('Meetup ·')) continue;
    const { data: otherMem } = await supabase
      .from('session_members')
      .select('user_id')
      .eq('session_id', s.id)
      .eq('user_id', input.otherUserId)
      .maybeSingle();
    if (otherMem) return { id: s.id as string };
  }

  const place =
    input.location?.trim() ||
    input.neighbourhood?.trim() ||
    `${WEDGE.pocketName} · public place TBD`;
  const title =
    input.title?.trim() || `Meetup · ${input.sport}`;

  const created = await createSession({
    sport: input.sport,
    title,
    location: place,
    maxPlayers: 4,
    description: 'Quick meetup from Looking. Confirm a free public place in chat.',
    startsAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
  });
  if (created.error || !created.id) {
    return { id: '', error: created.error ?? 'Could not start meetup' };
  }

  const { error: inviteErr } = await supabase.rpc('invite_session_member', {
    p_session_id: created.id,
    p_user_id: input.otherUserId,
  });
  if (inviteErr) {
    console.warn('invite_session_member', inviteErr.message);
    // Session still exists for host chat; other user can join via link later
  }

  return { id: created.id };
}

export async function reportUser(input: {
  reportedUserId?: string | null;
  sessionId?: string | null;
  reason: string;
  details?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const reason = input.reason.trim();
  if (!reason) return { ok: false, error: 'Reason required' };

  if (shouldUseDemoData()) return { ok: true };
  if (!supabase) return { ok: false, error: 'Sign in required' };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sign in required' };

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    reported_user_id: input.reportedUserId ?? null,
    session_id: input.sessionId ?? null,
    reason,
    details: input.details?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
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
        let avatarUrl: string | undefined;
        const { data: prof } = await supabase!
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', row.sender_id)
          .maybeSingle();
        if (prof?.display_name) sender = prof.display_name;
        if (prof?.avatar_url) avatarUrl = prof.avatar_url;
        onInsert({
          id: row.id,
          sender,
          text: row.body,
          mine: user?.id === row.sender_id,
          at: new Date(row.created_at).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          }),
          avatarUrl,
          senderId: row.sender_id,
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

export async function resetPasswordForEmail(email: string) {
  if (!supabase) {
    return {
      data: {},
      error: new Error('Supabase not loaded. Restart with .env keys.'),
    };
  }
  return supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: authRedirectTo(),
  });
}

export async function updatePassword(newPassword: string) {
  if (!supabase) {
    return {
      data: { user: null },
      error: new Error('Supabase not loaded. Restart with .env keys.'),
    };
  }
  return supabase.auth.updateUser({ password: newPassword });
}

export function authRedirectTo(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    // Never send confirm links to localhost when friends sign up on the live site
    const origin = window.location.origin;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'https://sportmatchr.pages.dev/auth';
    }
    return `${origin}/auth`;
  }
  return 'https://sportmatchr.pages.dev/auth';
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
  const result = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: authRedirectTo(),
    },
  });
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
  return supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: authRedirectTo(),
    },
  });
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signInWithOAuth(provider: 'google') {
  if (!supabase) {
    return {
      data: { provider, url: null },
      error: new Error(
        'Supabase not loaded. Run: npx expo start --clear (needs .env with EXPO_PUBLIC_SUPABASE_*).'
      ),
    };
  }
  return supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: authRedirectTo(),
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });
}

function nameFromMeta(email?: string | null, meta?: Record<string, unknown> | null) {
  const full = typeof meta?.full_name === 'string' ? meta.full_name.trim() : '';
  const name = typeof meta?.name === 'string' ? meta.name.trim() : '';
  const display = typeof meta?.display_name === 'string' ? meta.display_name.trim() : '';
  return full || name || display || email?.split('@')[0] || 'Player';
}

function avatarFromMeta(meta?: Record<string, unknown> | null) {
  const avatar = typeof meta?.avatar_url === 'string' ? meta.avatar_url : '';
  const picture = typeof meta?.picture === 'string' ? meta.picture : '';
  return avatar || picture || undefined;
}

export async function ensureProfile(
  userId: string,
  email?: string | null,
  meta?: Record<string, unknown> | null
) {
  if (!supabase) return;
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', userId)
    .maybeSingle();
  const name = nameFromMeta(email, meta);
  const avatar = avatarFromMeta(meta);
  if (data) {
    const patch: { display_name?: string; avatar_url?: string } = {};
    const looksLikeEmailPrefix =
      !data.display_name ||
      data.display_name === email?.split('@')[0] ||
      data.display_name === 'Player';
    if (looksLikeEmailPrefix && name !== data.display_name) patch.display_name = name;
    if (avatar && !data.avatar_url) patch.avatar_url = avatar;
    if (Object.keys(patch).length) {
      await supabase.from('profiles').update(patch).eq('id', userId);
    }
    return;
  }
  await supabase.from('profiles').upsert({
    id: userId,
    display_name: name,
    handle: `u${userId.slice(0, 8)}`,
    avatar_url: avatar,
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
    wins: Number(data.wins ?? 0),
    losses: Number(data.losses ?? 0),
    draws: Number(data.draws ?? 0),
    resultLog: Array.isArray(data.result_log) ? data.result_log : [],
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
  if (shouldUseDemoData()) {
    return PROFILES[id] ?? null;
  }
  if (!supabase) return null;

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

export async function deleteMyAccount(): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Not connected' };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sign in required' };

  const { data: files } = await supabase.storage.from('avatars').list(user.id);
  if (files?.length) {
    await supabase.storage
      .from('avatars')
      .remove(files.map((file) => `${user.id}/${file.name}`));
  }

  const { error } = await supabase.rpc('delete_my_account');
  if (error) return { ok: false, error: error.message };

  await supabase.auth.signOut({ scope: 'local' });
  return { ok: true };
}

/** Seed multi-sport Ottawa sessions for founder ops only (idempotent-ish). */
export async function seedFounderSessions(): Promise<{ created: number; error?: string }> {
  if (!supabase) return { created: 0, error: 'No supabase' };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { created: 0, error: 'Sign in required' };

  const preview = useAuthStore.getState().isFounderPreview;
  if (!canAccessFounderOps({ email: user.email, isFounderPreview: preview })) {
    return { created: 0, error: 'Founder ops only' };
  }

  await ensureProfile(user.id, user.email);

  // Close stale open sessions older than 7 days before seeding
  await supabase
    .from('sessions')
    .update({ status: 'completed' })
    .eq('status', 'open')
    .lt('starts_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const { count } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('host_id', user.id)
    .eq('status', 'open');

  if ((count ?? 0) >= 3) return { created: 0 };

  const seeds: CreateSessionInput[] = [
    {
      sport: 'Basketball',
      title: 'Evening run at Brewer',
      location: 'Brewer Park courts',
      courtId: 'brewer',
      maxPlayers: 10,
      recurring: 'Every Thu 6:30 PM',
      description: 'Casual full-court / half-court. Free public courts.',
      startsAt: nextWeekday(4, 18),
    },
    {
      sport: 'Volleyball',
      title: 'Beach volleyball — Mooney’s Bay',
      location: 'Mooney’s Bay Beach',
      courtId: 'mooneys',
      maxPlayers: 12,
      recurring: 'Every Sat 10:00 AM',
      description: 'Bring a ball if you have one. Beginners welcome.',
      startsAt: nextWeekday(6, 10),
    },
    {
      sport: 'Pickleball',
      title: 'Tuesday open play',
      location: 'Lansdowne Park / Aberdeen Pavilion area',
      courtId: 'lansdowne',
      maxPlayers: 8,
      recurring: 'Every Tue 7:00 PM',
      description: 'Recurring open play. Beginners welcome.',
      startsAt: nextWeekday(2, 19),
    },
    {
      sport: 'Outdoor Yoga',
      title: 'Morning stretch — Major’s Hill',
      location: 'Major’s Hill Park lawn',
      courtId: 'majors-hill',
      maxPlayers: 15,
      recurring: 'Every Sun 9:00 AM',
      description: 'Quiet outdoor yoga. Bring a mat. Free public green.',
      startsAt: nextWeekday(0, 9),
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

/** Suggest a free public place not yet in the catalog — we review and may add it. */
export async function suggestPlace(input: {
  name: string;
  neighbourhood?: string;
  notes?: string;
  sport?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Place name required' };

  const payload = {
    name,
    neighbourhood: input.neighbourhood?.trim() || null,
    notes: input.notes?.trim() || null,
    sport: input.sport ?? null,
    city: 'Ottawa',
  };

  // Always keep a local copy so founder preview / offline still captures ideas
  try {
    const key = 'sportmatchr.placeSuggestions';
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const raw = await AsyncStorage.getItem(key);
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    list.push({ ...payload, at: new Date().toISOString() });
    await AsyncStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* ignore local persist errors */
  }

  if (!supabase || shouldUseDemoData()) {
    return { ok: true };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: true }; // local copy already saved

  const { error } = await supabase.from('place_suggestions').insert({
    ...payload,
    suggested_by: user.id,
    status: 'new',
  });

  if (error) {
    // Local copy already saved — don't block hosting
    console.warn('suggestPlace', error.message);
    return { ok: true };
  }
  return { ok: true };
}

export type PlaceRatingStats = {
  placeId: string;
  avgStars: number;
  ratingCount: number;
  myStars?: number | null;
};

/** Batch rating stats for place cards (avg + count). */
export async function fetchPlaceRatingStats(
  placeIds: string[]
): Promise<Record<string, PlaceRatingStats>> {
  const out: Record<string, PlaceRatingStats> = {};
  if (!placeIds.length) return out;

  for (const id of placeIds) {
    out[id] = { placeId: id, avgStars: 0, ratingCount: 0, myStars: null };
  }

  if (!supabase || shouldUseDemoData()) return out;

  const { data, error } = await supabase.rpc('place_rating_stats', {
    place_ids: placeIds,
  });
  if (error) {
    console.warn('place_rating_stats', error.message);
    return out;
  }

  for (const row of data ?? []) {
    const id = String((row as any).place_id);
    out[id] = {
      placeId: id,
      avgStars: Number((row as any).avg_stars ?? 0),
      ratingCount: Number((row as any).rating_count ?? 0),
      myStars: null,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: mine } = await supabase
      .from('place_ratings')
      .select('place_id, stars')
      .eq('user_id', user.id)
      .in('place_id', placeIds);
    for (const row of mine ?? []) {
      const id = String(row.place_id);
      if (out[id]) out[id].myStars = Number(row.stars);
    }
  }

  return out;
}

export async function ratePlace(
  placeId: string,
  stars: number
): Promise<{ ok: boolean; error?: string }> {
  if (stars < 1 || stars > 5) return { ok: false, error: 'Pick 1–5 stars' };
  if (shouldUseDemoData()) return { ok: true };
  if (!supabase) return { ok: false, error: 'Sign in required' };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sign in required' };

  await ensureProfile(user.id, user.email);

  const { error } = await supabase.from('place_ratings').upsert(
    {
      place_id: placeId,
      user_id: user.id,
      stars,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'place_id,user_id' }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export function backendMode(): 'supabase' | 'mock' {
  return isSupabaseConfigured ? 'supabase' : 'mock';
}

export { MY_PROFILE, isSupabaseConfigured };
