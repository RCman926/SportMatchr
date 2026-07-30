/**
 * City expansion — Ottawa is live; MTL/TO draft only until Ottawa has unaided density.
 * Do not wire a Canada-wide city picker that shows empty feeds.
 */

export type SportMatchrCity = {
  id: string;
  name: string;
  /** When false, do not show in product city switcher */
  active: boolean;
  status: 'live' | 'draft' | 'planned';
  note: string;
};

export const CITIES: SportMatchrCity[] = [
  {
    id: 'ottawa',
    name: 'Ottawa',
    active: true,
    status: 'live',
    note: 'Prove-it city — free places + multi-activity hosts',
  },
  {
    id: 'montreal',
    name: 'Montreal',
    active: false,
    status: 'draft',
    note: 'Expand after Ottawa unaided meetups — draft places in montrealPlaces.ts',
  },
  {
    id: 'toronto',
    name: 'Toronto',
    active: false,
    status: 'draft',
    note: 'Expand after Ottawa unaided meetups — draft places in torontoPlaces.ts',
  },
];

export const ACTIVE_CITY_ID = 'ottawa';
