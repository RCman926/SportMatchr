import type { OttawaCourt } from './ottawaCourts';

/**
 * Paid recreation centres — NOT live in the app yet.
 * Bring these back only after a venue says yes (or hosts are clearly DIY-booking).
 * SportMatchr does not book ice/court time.
 */
export const PAID_VENUES_DRAFT: OttawaCourt[] = [
  {
    id: 'nepean',
    name: 'Nepean Sportsplex',
    neighbourhood: 'Nepean',
    sports: ['Basketball', 'Tennis', 'Badminton', 'Pickleball', 'Swimming'],
    type: 'paid',
    season: 'year-round',
    lat: 45.3456,
    lng: -75.7612,
    notes: 'Not partnered — host must book / arrange entry themselves',
  },
  {
    id: 'orleans-complex',
    name: 'Bob MacQuarrie Recreation Complex',
    neighbourhood: 'Orléans',
    sports: ['Basketball', 'Soccer', 'Pickleball', 'Swimming'],
    type: 'paid',
    season: 'year-round',
    lat: 45.4721,
    lng: -75.5468,
    notes: 'Not partnered — host must book / arrange entry themselves',
  },
  {
    id: 'richcraft',
    name: 'Richcraft Recreation Complex',
    neighbourhood: 'Kanata',
    sports: ['Basketball', 'Soccer', 'Swimming', 'Climbing'],
    type: 'paid',
    season: 'year-round',
    lat: 45.3085,
    lng: -75.9125,
    notes: 'Not partnered — host must book / arrange entry themselves',
  },
  {
    id: 'walter-baker-complex',
    name: 'Walter Baker Sports Centre',
    neighbourhood: 'Kanata',
    sports: ['Swimming', 'Basketball', 'Badminton', 'Skating'],
    type: 'paid',
    season: 'year-round',
    lat: 45.3125,
    lng: -75.8985,
    notes: 'Not partnered — host must book / arrange entry themselves',
  },
  {
    id: 'bern-conron',
    name: 'Bernice L. Conron Community Centre',
    neighbourhood: 'Stittsville',
    sports: ['Basketball', 'Pickleball', 'Badminton'],
    type: 'paid',
    season: 'year-round',
    lat: 45.2585,
    lng: -75.9225,
    notes: 'Not partnered — host must book / arrange entry themselves',
  },
];
