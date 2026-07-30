import { OTTAWA_COURTS, OttawaCourt } from '../constants/ottawaCourts';
import { OTTAWA_SPORTS, OttawaSport, currentOttawaSeason } from '../constants/sports';
import { haversineKm } from './location';

export type PlaceWithDistance = OttawaCourt & { distanceKm: number };

/** Free places only, optionally filtered by sport and season. */
export function listFreePlaces(opts?: {
  sport?: string | null;
  seasonAware?: boolean;
}): OttawaCourt[] {
  const season = currentOttawaSeason();
  let list = OTTAWA_COURTS.filter((c) => c.type === 'free');

  if (opts?.sport) {
    list = list.filter((c) => c.sports.includes(opts.sport!));
  }

  if (opts?.seasonAware) {
    list = list.filter((c) => {
      if (c.season === 'multi' || c.season === 'year-round') return true;
      if (season === 'Winter') return c.season === 'winter';
      if (season === 'Summer') return c.season === 'summer';
      return true;
    });
  }

  return list;
}

export function freePlacesNearYou(
  coords: { lat: number; lng: number },
  opts?: { sport?: string | null; limit?: number; seasonAware?: boolean }
): PlaceWithDistance[] {
  const limit = opts?.limit ?? 8;
  return listFreePlaces({ sport: opts?.sport, seasonAware: opts?.seasonAware })
    .map((c) => ({
      ...c,
      distanceKm: haversineKm(coords, { lat: c.lat, lng: c.lng }),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

/** Sports still missing a free place (should be empty after coverage pass). */
export function sportsMissingFreePlace(): OttawaSport[] {
  const free = OTTAWA_COURTS.filter((c) => c.type === 'free');
  return OTTAWA_SPORTS.filter((s) => !free.some((c) => c.sports.includes(s)));
}
