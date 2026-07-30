/** Sports & activities people do around Ottawa — grouped by season. */

export const OTTAWA_SPORT_SEASONS = {
  Winter: [
    'Ice Hockey',
    'Shinny',
    'Skating',
    'Figure Skating',
    'Curling',
    'Broomball',
    'Cross-Country Skiing',
    'Snowboarding',
    'Downhill Skiing',
    'Snowshoeing',
    'Pond Hockey',
  ],
  Summer: [
    'Beach Volleyball',
    'Volleyball',
    'Soccer',
    'Baseball',
    'Softball',
    'Ultimate Frisbee',
    'Spikeball',
    'Tennis',
    'Pickleball',
    'Outdoor Basketball',
    'Disc Golf',
    'Golf',
    'Cricket',
    'Lacrosse',
    'Rugby',
    'Football',
    'Kickball',
    'Dodgeball',
    'Kayaking',
    'Canoeing',
    'Stand-Up Paddleboard',
    'Rowing',
    'Swimming',
    'Trail Running',
    'Hiking',
    'Skateboarding',
    'Outdoor Yoga',
    'Tai Chi',
  ],
  'Year-round': [
    'Basketball',
    'Badminton',
    'Squash',
    'Racquetball',
    'Table Tennis',
    'Futsal',
    'Running',
    'Cycling',
    'Mountain Biking',
    'Climbing',
    'Bouldering',
    'Boxing',
    'Martial Arts',
    'Yoga',
    'Tai Chi',
    'Qi Gong',
    'CrossFit',
    'Weight Training',
    'Ball Hockey',
    'Swimming',
  ],
} as const;

/** Alias used by SportPicker */
export const OTTAWA_SPORT_CATEGORIES = OTTAWA_SPORT_SEASONS;

export type OttawaSport =
  (typeof OTTAWA_SPORT_SEASONS)[keyof typeof OTTAWA_SPORT_SEASONS][number];

export const OTTAWA_SPORTS: OttawaSport[] = Array.from(
  new Set(
    (Object.values(OTTAWA_SPORT_SEASONS) as readonly (readonly OttawaSport[])[]).flat()
  )
);

export const OTTAWA_POPULAR_BY_SEASON = {
  Winter: ['Shinny', 'Skating', 'Ice Hockey', 'Pond Hockey', 'Cross-Country Skiing'] as OttawaSport[],
  Summer: [
    'Beach Volleyball',
    'Soccer',
    'Tennis',
    'Outdoor Basketball',
    'Outdoor Yoga',
    'Tai Chi',
    'Cricket',
    'Baseball',
  ] as OttawaSport[],
  'Year-round': [
    'Basketball',
    'Running',
    'Badminton',
    'Yoga',
    'Tai Chi',
    'Cycling',
  ] as OttawaSport[],
};

/** Multi-activity chips — not locked to one sport */
export const OTTAWA_POPULAR_SPORTS: OttawaSport[] = [
  'Beach Volleyball',
  'Basketball',
  'Soccer',
  'Shinny',
  'Tennis',
  'Outdoor Yoga',
  'Tai Chi',
  'Cricket',
  'Badminton',
  'Running',
  'Baseball',
  'Pickleball',
  'Ultimate Frisbee',
];

export const SPORTS_LIST = OTTAWA_SPORTS;

/** Default: no forced single sport — UI uses seasonal popular */
export const WEDGE_DEFAULT_SPORT: OttawaSport | null = null;

export type SportSeason = keyof typeof OTTAWA_SPORT_SEASONS;

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
