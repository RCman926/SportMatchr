import { WEDGE } from './wedge';

export type VerificationLevel = 'none' | 'phone' | 'photo' | 'id';

export type PlayerProfile = {
  id: string;
  name: string;
  handle: string;
  bio: string;
  city: string;
  neighbourhood?: string;
  sports: string[];
  skill: 'Beginner' | 'Intermediate' | 'Advanced' | 'Any';
  intensity?: 'casual' | 'competitive' | 'any';
  verification: VerificationLevel;
  /** Real face photo URL — required for safety so people recognize you at the court */
  avatarUrl?: string;
  gamesPlayed: number;
  rating: number;
  streakDays: number;
  memberSince: string;
  preferredCourts: string[];
  lookingNow: boolean;
  shows?: number;
  noShows?: number;
  /** People who said they'd play with them again */
  rematchYes?: number;
  rematchTotal?: number;
};

export type MockSession = {
  id: string;
  sport: string;
  title: string;
  players: number;
  max: number;
  time: string;
  location: string;
  courtId?: string;
  lat?: number;
  lng?: number;
  description?: string;
  hostId: string;
  /** Recurring weekly anchor (e.g. "Tue 7:00 PM") */
  recurring?: string;
  intensity?: 'casual' | 'competitive' | 'any';
};

export type SoloPlayer = {
  id: string;
  profileId: string;
  name: string;
  sport: string;
  skill: 'Beginner' | 'Intermediate' | 'Advanced' | 'Any';
  distanceKm: number;
  /** Approximate live presence (public area — not home address) */
  lat: number;
  lng: number;
  neighbourhood: string;
  lookingFor: string;
  available: string;
  verification: VerificationLevel;
  rating: number;
  gamesPlayed: number;
};

export type ChatMessage = {
  id: string;
  sender: string;
  text: string;
  mine?: boolean;
  at: string;
};

export const VERIFICATION_LABEL: Record<VerificationLevel, string> = {
  none: 'Unverified',
  phone: 'Phone verified',
  photo: 'Photo verified',
  id: 'ID verified',
};

export const VERIFICATION_RANK: Record<VerificationLevel, number> = {
  none: 0,
  phone: 1,
  photo: 2,
  id: 3,
};

export const MY_PROFILE: PlayerProfile = {
  id: 'me',
  name: 'Ryan',
  handle: '@ryan',
  bio: 'Glebe / Centretown pickleball. Building the Tuesday crew.',
  city: 'Ottawa',
  neighbourhood: WEDGE.pocketName,
  sports: ['Pickleball', 'Basketball'],
  skill: 'Intermediate',
  intensity: 'casual',
  verification: 'phone',
  avatarUrl: undefined,
  gamesPlayed: 12,
  rating: 4.8,
  streakDays: 3,
  memberSince: '2026',
  preferredCourts: ['Lansdowne Park / Aberdeen Pavilion area', 'Brewer Park'],
  lookingNow: true,
  shows: 11,
  noShows: 0,
  rematchYes: 8,
  rematchTotal: 9,
};

export const PROFILES: Record<string, PlayerProfile> = {
  me: MY_PROFILE,
  sam: {
    id: 'sam',
    name: 'Sam',
    handle: '@sampickle',
    bio: 'New to pickleball — teach me and I’ll buy coffee after.',
    city: 'Ottawa',
    neighbourhood: 'The Glebe',
    sports: ['Pickleball'],
    skill: 'Beginner',
    intensity: 'casual',
    verification: 'phone',
    avatarUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
    gamesPlayed: 4,
    rating: 5.0,
    streakDays: 1,
    memberSince: '2026',
    preferredCourts: ['Lansdowne Park / Aberdeen Pavilion area'],
    lookingNow: true,
    shows: 4,
    noShows: 0,
    rematchYes: 3,
    rematchTotal: 3,
  },
  morgan: {
    id: 'morgan',
    name: 'Morgan',
    handle: '@morganpb',
    bio: 'Hosts Tue open play. Anyone welcome — paddles to spare.',
    city: 'Ottawa',
    neighbourhood: 'Centretown',
    sports: ['Pickleball'],
    skill: 'Intermediate',
    intensity: 'casual',
    verification: 'phone',
    avatarUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
    gamesPlayed: 36,
    rating: 4.9,
    streakDays: 5,
    memberSince: '2025',
    preferredCourts: ['Lansdowne Park / Aberdeen Pavilion area', 'Brewer Park'],
    lookingNow: true,
    rematchYes: 22,
    rematchTotal: 24,
    shows: 34,
    noShows: 1,
  },
  alex: {
    id: 'alex',
    name: 'Alex',
    handle: '@alexhoops',
    bio: '3v3 at Brewer after pickleball sometimes. Friendly competition.',
    city: 'Ottawa',
    neighbourhood: 'Old Ottawa South',
    sports: ['Basketball', 'Pickleball'],
    skill: 'Intermediate',
    intensity: 'any',
    verification: 'phone',
    avatarUrl: 'https://randomuser.me/api/portraits/men/75.jpg',
    gamesPlayed: 48,
    rating: 4.9,
    streakDays: 7,
    memberSince: '2025',
    preferredCourts: ['Brewer Park', 'Lansdowne Park / Aberdeen Pavilion area'],
    lookingNow: true,
    shows: 45,
    noShows: 2,
  },
  jordan: {
    id: 'jordan',
    name: 'Jordan',
    handle: '@jtennis',
    bio: 'Tennis + pickleball around Centretown. Consistent partners preferred.',
    city: 'Ottawa',
    neighbourhood: 'Centretown',
    sports: ['Tennis', 'Pickleball'],
    skill: 'Any',
    intensity: 'casual',
    verification: 'photo',
    avatarUrl: 'https://randomuser.me/api/portraits/women/68.jpg',
    gamesPlayed: 21,
    rating: 4.7,
    streakDays: 2,
    memberSince: '2025',
    preferredCourts: ['Lansdowne Park / Aberdeen Pavilion area'],
    lookingNow: true,
    shows: 19,
    noShows: 1,
  },
  casey: {
    id: 'casey',
    name: 'Casey',
    handle: '@caseykicks',
    bio: 'Mostly soccer — dipping into Tuesday pickleball.',
    city: 'Ottawa',
    neighbourhood: 'The Glebe',
    sports: ['Soccer', 'Pickleball'],
    skill: 'Beginner',
    intensity: 'casual',
    verification: 'none',
    avatarUrl: undefined,
    gamesPlayed: 8,
    rating: 4.6,
    streakDays: 0,
    memberSince: '2026',
    preferredCourts: ['Lansdowne Park / Aberdeen Pavilion area'],
    lookingNow: true,
    shows: 6,
    noShows: 1,
  },
};

/** Wedge sessions — Pickleball-first, Glebe/Centretown courts, recurring where possible */
export const MOCK_SESSIONS: MockSession[] = [
  {
    id: '1',
    sport: 'Pickleball',
    title: 'Tuesday Open Play',
    players: 5,
    max: 8,
    time: 'Today 7:00 PM',
    location: 'Lansdowne Park / Aberdeen Pavilion area',
    courtId: 'lansdowne',
    lat: 45.3989,
    lng: -75.6836,
    description: 'Recurring Tue open play. Beginners welcome. Bring a paddle if you have one.',
    hostId: 'morgan',
    recurring: 'Every Tue 7:00 PM',
    intensity: 'casual',
  },
  {
    id: '2',
    sport: 'Pickleball',
    title: 'Lunch doubles',
    players: 2,
    max: 4,
    time: 'Today 12:15 PM',
    location: 'Lansdowne Park / Aberdeen Pavilion area',
    courtId: 'lansdowne',
    lat: 45.3989,
    lng: -75.6836,
    description: 'Quick lunch game. Casual only.',
    hostId: 'sam',
    intensity: 'casual',
  },
  {
    id: '3',
    sport: 'Pickleball',
    title: 'Weekend beginner clinic vibe',
    players: 3,
    max: 6,
    time: 'Sat 10:00 AM',
    location: 'Brewer Park',
    courtId: 'brewer',
    lat: 45.3889,
    lng: -75.6881,
    description: 'Same time next week if we fill. Soft teaching welcome.',
    hostId: 'morgan',
    recurring: 'Every Sat 10:00 AM',
    intensity: 'casual',
  },
  {
    id: '4',
    sport: 'Basketball',
    title: 'Brewer evening runs',
    players: 4,
    max: 10,
    time: 'Tomorrow 6:30 PM',
    location: 'Brewer Park',
    courtId: 'brewer',
    lat: 45.3889,
    lng: -75.6881,
    description: 'Secondary wedge sport — still Glebe pocket.',
    hostId: 'alex',
    intensity: 'any',
  },
];

export const SOLO_PLAYERS: SoloPlayer[] = [
  {
    id: 's1',
    profileId: 'morgan',
    name: 'Morgan',
    sport: 'Pickleball',
    skill: 'Intermediate',
    distanceKm: 0.8,
    lat: 45.3992,
    lng: -75.6841,
    neighbourhood: 'The Glebe',
    lookingFor: 'Need 1–2 for doubles at Lansdowne',
    available: 'Ready now',
    verification: 'phone',
    rating: 4.9,
    gamesPlayed: 36,
  },
  {
    id: 's2',
    profileId: 'sam',
    name: 'Sam',
    sport: 'Pickleball',
    skill: 'Beginner',
    distanceKm: 1.1,
    lat: 45.4015,
    lng: -75.6902,
    neighbourhood: 'The Glebe',
    lookingFor: 'Anyone free for a quick game?',
    available: 'Ready now',
    verification: 'phone',
    rating: 5.0,
    gamesPlayed: 4,
  },
  {
    id: 's3',
    profileId: 'jordan',
    name: 'Jordan',
    sport: 'Pickleball',
    skill: 'Any',
    distanceKm: 1.4,
    lat: 45.411,
    lng: -75.6982,
    neighbourhood: 'Centretown',
    lookingFor: 'Pickleball or tennis — Centretown',
    available: 'Next 60 min',
    verification: 'photo',
    rating: 4.7,
    gamesPlayed: 21,
  },
  {
    id: 's4',
    profileId: 'casey',
    name: 'Casey',
    sport: 'Pickleball',
    skill: 'Beginner',
    distanceKm: 1.6,
    lat: 45.4045,
    lng: -75.6915,
    neighbourhood: 'The Glebe',
    lookingFor: 'First pickleball — patient partner?',
    available: 'Ready now',
    verification: 'none',
    rating: 4.6,
    gamesPlayed: 8,
  },
  {
    id: 's5',
    profileId: 'alex',
    name: 'Alex',
    sport: 'Basketball',
    skill: 'Intermediate',
    distanceKm: 1.2,
    lat: 45.3895,
    lng: -75.6875,
    neighbourhood: 'Old Ottawa South',
    lookingFor: 'Need 1–2 more for 3v3 at Brewer',
    available: 'After 7 PM',
    verification: 'phone',
    rating: 4.9,
    gamesPlayed: 48,
  },
];

export const SESSION_CHAT: Record<string, ChatMessage[]> = {
  '1': [
    { id: 'm1', sender: 'Morgan', text: 'Courts by Aberdeen — see you 7.', at: '5:12 PM' },
    { id: 'm2', sender: 'You', text: 'Bringing an extra paddle.', mine: true, at: '5:14 PM' },
    { id: 'm3', sender: 'Sam', text: 'On my way from Bank St.', at: '5:16 PM' },
  ],
  '2': [
    { id: 'm1', sender: 'Sam', text: 'Still need one more for doubles.', at: '11:40 AM' },
  ],
  '3': [
    { id: 'm1', sender: 'Morgan', text: 'Same time next Saturday if we hit 4+.', at: 'Yesterday' },
  ],
  '4': [
    { id: 'm1', sender: 'Alex', text: 'Who’s bringing the ball?', at: 'Yesterday' },
  ],
  solo: [
    { id: 'm1', sender: 'Morgan', text: 'Hey — Lansdowne pickleball in 20?', at: 'Just now' },
  ],
};

export const SAFETY_TIPS = [
  'Meet only at public courts or staffed venues.',
  'Only play with people who have a real face photo — recognize them at the court.',
  'Phone verify when you can. Tell a friend where you’re going before you leave.',
  'Chat in-app first — don’t share your home address.',
  'If anything feels off, leave and report the user.',
];

/** Seed targets for founder ops (see docs/SEED_PLAYBOOK.md) */
export const SEED_TARGETS = {
  users: 75,
  recurringHosts: 8,
  minActivities: 4,
  pocket: WEDGE.pocketName,
  city: WEDGE.city,
  note: 'Multi-activity hosts at free places — not pickleball-only',
} as const;
