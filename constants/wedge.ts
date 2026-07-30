/**
 * Prove-it city: Ottawa (multi-activity free places).
 * Glebe / Centretown is a strong pocket — not a single-sport monopoly.
 * Next cities (after unaided density): Montreal, Toronto.
 */

export const WEDGE = {
  city: 'Ottawa',
  /** Strong density pocket labels (neighbourhood match) */
  pocketName: 'Glebe / Centretown',
  pocketNeighbourhoods: [
    'The Glebe',
    'Glebe',
    'Centretown',
    'Centretown West',
    'Downtown / Glebe',
    'Old Ottawa South',
  ] as const,
  /**
   * Default chip when no season override — multi-sport; season chips preferred in UI.
   * @deprecated Prefer getSeasonalPopularSports() — kept for older imports.
   */
  primarySport: 'Basketball' as const,
  /** Highlight activities for seeding (all get people) */
  focusSports: [
    'Beach Volleyball',
    'Volleyball',
    'Basketball',
    'Soccer',
    'Shinny',
    'Badminton',
    'Cricket',
    'Baseball',
    'Tennis',
    'Pickleball',
    'Running',
    'Outdoor Yoga',
    'Tai Chi',
  ] as const,
  /** Court ids to surface first in Create / Map (free, multi-use) */
  priorityCourtIds: [
    'lansdowne',
    'brewer',
    'mooneys',
    'majors-hill',
    'nepean-point',
    'dow-rink',
  ] as const,
  copy: {
    homeSub: 'Free places near you — any sport, any pace.',
    pulseArea: 'Ottawa · who’s around right now',
    seedHint:
      'Host across sports at free public places. Expand to Montreal & Toronto after strangers meet without you.',
  },
} as const;

export function isWedgeNeighbourhood(neighbourhood: string): boolean {
  const n = neighbourhood.toLowerCase();
  return WEDGE.pocketNeighbourhoods.some((p) => n.includes(p.toLowerCase()));
}
