/**
 * Ottawa sports & activities.
 * Season labels for browsing. Outdoor ice is winter.
 * Indoor booked ice / gyms / clubs are not in this catalog.
 */

export type SportSeason = 'Winter' | 'Summer' | 'Year-round';

export type SportDef = {
  name: string;
  /** Can appear under multiple seasons in the picker */
  seasons: SportSeason[];
  popular?: boolean;
};

/**
 * Catalog — things you can actually do at a free public place.
 * Gyms, pools, padel cages, curling clubs, and bowling alleys stay out
 * until venues are a later phase. Popular = filter chips / host quick picks.
 */
export const OTTAWA_SPORT_DEFS: readonly SportDef[] = [
  // —— Winter (outdoor rinks / trails / hills) ——
  { name: 'Ice Hockey', seasons: ['Winter'], popular: true },
  { name: 'Shinny', seasons: ['Winter'], popular: true },
  { name: 'Stick and Puck', seasons: ['Winter'], popular: true },
  { name: 'Pond Hockey', seasons: ['Winter'], popular: true },
  { name: 'Ringette', seasons: ['Winter'], popular: true },
  { name: 'Skating', seasons: ['Winter'], popular: true },
  { name: 'Figure Skating', seasons: ['Winter'] },
  { name: 'Broomball', seasons: ['Winter'] },
  { name: 'Cross-Country Skiing', seasons: ['Winter'], popular: true },
  { name: 'Snowshoeing', seasons: ['Winter'] },
  { name: 'Fat Biking', seasons: ['Winter', 'Year-round'] },
  { name: 'Tobogganing', seasons: ['Winter'] },

  // —— Summer (parks, fields, water, paths) ——
  { name: 'Beach Volleyball', seasons: ['Summer'], popular: true },
  { name: 'Volleyball', seasons: ['Summer'], popular: true },
  { name: 'Soccer', seasons: ['Summer', 'Year-round'], popular: true },
  { name: 'Baseball', seasons: ['Summer'], popular: true },
  { name: 'Softball', seasons: ['Summer'], popular: true },
  { name: 'Slo-Pitch', seasons: ['Summer'], popular: true },
  { name: 'Ultimate Frisbee', seasons: ['Summer'], popular: true },
  { name: 'Spikeball', seasons: ['Summer'] },
  { name: 'Tennis', seasons: ['Summer', 'Year-round'], popular: true },
  { name: 'Pickleball', seasons: ['Summer', 'Year-round'], popular: true },
  { name: 'Outdoor Basketball', seasons: ['Summer'], popular: true },
  { name: 'Disc Golf', seasons: ['Summer'], popular: true },
  { name: 'Cricket', seasons: ['Summer'], popular: true },
  { name: 'Lacrosse', seasons: ['Summer'] },
  { name: 'Rugby', seasons: ['Summer'] },
  { name: 'Football', seasons: ['Summer'], popular: true },
  { name: 'Flag Football', seasons: ['Summer'] },
  { name: 'Kickball', seasons: ['Summer'] },
  { name: 'Kayaking', seasons: ['Summer'], popular: true },
  { name: 'Canoeing', seasons: ['Summer'] },
  { name: 'Stand-Up Paddleboard', seasons: ['Summer'], popular: true },
  { name: 'Kiteboarding', seasons: ['Summer'] },
  { name: 'Swimming', seasons: ['Summer'], popular: true },
  { name: 'Trail Running', seasons: ['Summer', 'Year-round'] },
  { name: 'Hiking', seasons: ['Summer', 'Year-round'], popular: true },
  { name: 'Skateboarding', seasons: ['Summer'] },
  { name: 'BMX', seasons: ['Summer'] },
  { name: 'Orienteering', seasons: ['Summer', 'Year-round'] },

  // —— Year-round outdoor ——
  { name: 'Basketball', seasons: ['Year-round'], popular: true },
  { name: 'Running', seasons: ['Year-round'], popular: true },
  { name: 'Cycling', seasons: ['Year-round'], popular: true },
  { name: 'Mountain Biking', seasons: ['Year-round'] },
  { name: 'Yoga', seasons: ['Year-round'] },
  { name: 'Tai Chi', seasons: ['Year-round', 'Summer'] },
  { name: 'Outdoor Yoga', seasons: ['Summer'] },
  { name: 'Outdoor Fitness', seasons: ['Year-round', 'Summer'] },
  { name: 'Ball Hockey', seasons: ['Year-round'], popular: true },
  { name: 'Inline Hockey', seasons: ['Summer', 'Year-round'] },
  { name: 'Parkour', seasons: ['Year-round'] },
] as const;

export type OttawaSport = (typeof OTTAWA_SPORT_DEFS)[number]['name'];

/** Host-arranged meetups — not a facility. Stay in the picker, off the map. */
export const EVENT_ONLY_SPORTS: readonly OttawaSport[] = [
  'Outdoor Yoga',
  'Yoga',
  'Tai Chi',
  'Orienteering',
];

/**
 * Map chips / pin labels — distinct public facilities most people look for.
 * Everything else stays in the host picker so you can still start that game
 * at a nearby park. Flag Football is a session sport; the map calls it Football.
 * Beach Volleyball stays its own pin label — not gym-court Volleyball.
 * Skating is the canal / public skate — not a hockey rink.
 */
export const MAP_SPORTS = [
  'Hockey',
  'Skating',
  'Football',
  'Tennis',
  'Disc Golf',
  'Basketball',
  'Soccer',
  'Volleyball',
  'Beach Volleyball',
  'Outdoor Fitness',
] as const;

export type MapSport = (typeof MAP_SPORTS)[number];

const MAP_ALIAS: Record<string, MapSport> = {
  Hockey: 'Hockey',
  'Ice Hockey': 'Hockey',
  Shinny: 'Hockey',
  'Stick and Puck': 'Hockey',
  'Pond Hockey': 'Hockey',
  Ringette: 'Hockey',
  Broomball: 'Hockey',
  Skating: 'Skating',
  'Figure Skating': 'Skating',
  Football: 'Football',
  'Flag Football': 'Football',
  Tennis: 'Tennis',
  'Disc Golf': 'Disc Golf',
  Basketball: 'Basketball',
  'Outdoor Basketball': 'Basketball',
  Soccer: 'Soccer',
  Volleyball: 'Volleyball',
  'Beach Volleyball': 'Beach Volleyball',
  'Outdoor Fitness': 'Outdoor Fitness',
};

export function toMapSport(sport: string | null | undefined): MapSport | null {
  if (!sport) return null;
  return MAP_ALIAS[sport] ?? null;
}

export function mapSportsOnly(sports: string[]): MapSport[] {
  const seen = new Set<MapSport>();
  const sand = sports.includes('Beach Volleyball');
  for (const s of sports) {
    if (sand && s === 'Volleyball') continue;
    const mapped = toMapSport(s);
    if (mapped) seen.add(mapped);
  }
  return MAP_SPORTS.filter((s) => seen.has(s));
}

function sportsForSeason(season: SportSeason): OttawaSport[] {
  return OTTAWA_SPORT_DEFS.filter((d) => d.seasons.includes(season)).map((d) => d.name);
}

/** Picker sections — a sport can show in more than one season */
export const OTTAWA_SPORT_SEASONS: Record<SportSeason, OttawaSport[]> = {
  Winter: sportsForSeason('Winter'),
  Summer: sportsForSeason('Summer'),
  'Year-round': sportsForSeason('Year-round'),
};

/** Alias used by SportPicker */
export const OTTAWA_SPORT_CATEGORIES = OTTAWA_SPORT_SEASONS;

export const OTTAWA_SPORTS: OttawaSport[] = OTTAWA_SPORT_DEFS.map((d) => d.name);

export const OTTAWA_POPULAR_BY_SEASON: Record<SportSeason, OttawaSport[]> = {
  Winter: OTTAWA_SPORT_DEFS.filter(
    (d) => d.popular && d.seasons.includes('Winter')
  ).map((d) => d.name),
  Summer: OTTAWA_SPORT_DEFS.filter(
    (d) => d.popular && d.seasons.includes('Summer')
  ).map((d) => d.name),
  'Year-round': OTTAWA_SPORT_DEFS.filter(
    (d) => d.popular && d.seasons.includes('Year-round')
  ).map((d) => d.name),
};

/** Multi-activity chips — seasonal first, then other popular */
export const OTTAWA_POPULAR_SPORTS: OttawaSport[] = Array.from(
  new Set(OTTAWA_SPORT_DEFS.filter((d) => d.popular).map((d) => d.name))
);

export const SPORTS_LIST = OTTAWA_SPORTS;

/** Default: no forced single sport — UI uses seasonal popular */
export const WEDGE_DEFAULT_SPORT: OttawaSport | null = null;

/** Rough season for Ottawa (Northern Hemisphere). */
export function currentOttawaSeason(date = new Date()): SportSeason {
  const m = date.getMonth(); // 0–11
  if (m === 11 || m <= 2) return 'Winter';
  if (m >= 5 && m <= 8) return 'Summer';
  return 'Year-round';
}

export function getSeasonalPopularSports(date = new Date()): OttawaSport[] {
  const season = currentOttawaSeason(date);
  return OTTAWA_POPULAR_BY_SEASON[season];
}

export function sportsInSeason(season: SportSeason | 'All'): OttawaSport[] {
  if (season === 'All') return OTTAWA_SPORTS;
  return OTTAWA_SPORT_SEASONS[season];
}

export function popularSportsForBrowse(season: SportSeason | 'All' | 'In season'): OttawaSport[] {
  if (season === 'All') return OTTAWA_POPULAR_SPORTS;
  if (season === 'In season') return getSeasonalPopularSports();
  return OTTAWA_POPULAR_BY_SEASON[season];
}

/** Outdoor ice sports (neighbourhood rinks / canal). */
export function isIceSport(sport: string | null | undefined): boolean {
  if (!sport) return false;
  const mapped = toMapSport(sport);
  if (mapped === 'Hockey' || mapped === 'Skating') return true;
  return [
    'Ice Hockey',
    'Shinny',
    'Stick and Puck',
    'Pond Hockey',
    'Ringette',
    'Skating',
    'Figure Skating',
    'Broomball',
  ].includes(sport);
}
