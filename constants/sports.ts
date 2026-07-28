/** Sports people play around Ottawa — grouped by season. */

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
  Winter: ['Shinny', 'Skating', 'Ice Hockey', 'Curling', 'Cross-Country Skiing'] as OttawaSport[],
  Summer: [
    'Pickleball',
    'Soccer',
    'Tennis',
    'Beach Volleyball',
    'Outdoor Basketball',
    'Ultimate Frisbee',
  ] as OttawaSport[],
  'Year-round': ['Basketball', 'Running', 'Cycling', 'Climbing', 'Badminton'] as OttawaSport[],
};

/**
 * Wedge-first chips: Pickleball leads. Other sports remain available in SportPicker.
 * Do not reorder away from Pickleball until Glebe/Centretown has weekly density.
 */
export const OTTAWA_POPULAR_SPORTS: OttawaSport[] = [
  'Pickleball',
  'Basketball',
  'Tennis',
  'Soccer',
  'Outdoor Basketball',
  'Running',
  'Beach Volleyball',
  'Ultimate Frisbee',
];

export const SPORTS_LIST = OTTAWA_SPORTS;

/** Default filter on Home / Solos for launch wedge */
export const WEDGE_DEFAULT_SPORT: OttawaSport = 'Pickleball';
