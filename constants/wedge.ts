/**
 * Launch wedge — density before geography.
 * One pocket + one primary sport until weekly games happen without manual seeding.
 */

export const WEDGE = {
  city: 'Ottawa',
  /** Primary density pocket labels (neighbourhood match) */
  pocketName: 'Glebe / Centretown',
  pocketNeighbourhoods: [
    'The Glebe',
    'Glebe',
    'Centretown',
    'Centretown West',
    'Downtown / Glebe',
    'Old Ottawa South',
  ] as const,
  /** Primary sport for cold-start liquidity */
  primarySport: 'Pickleball' as const,
  /** Secondary sports still shown, but not the seeding focus */
  secondarySports: ['Basketball', 'Tennis', 'Soccer'] as const,
  /** Court ids to surface first in Create / Map */
  priorityCourtIds: ['lansdowne', 'brewer', 'nepean'] as const,
  copy: {
    homeSub: 'Pickup · Glebe / Centretown · Pickleball first',
    pulseArea: 'Glebe / Centretown · live now',
    seedHint:
      'Win this pocket first: weekly pickleball at public courts. Expand sports and neighbourhoods only after strangers play without you.',
  },
} as const;

export function isWedgeNeighbourhood(neighbourhood: string): boolean {
  const n = neighbourhood.toLowerCase();
  return WEDGE.pocketNeighbourhoods.some((p) => n.includes(p.toLowerCase()));
}
