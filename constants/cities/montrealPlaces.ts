import type { OttawaCourt } from '../ottawaCourts';

/**
 * DRAFT — not active in the app until Ottawa has unaided density.
 * Seed a few free-place pins so expansion can move fast later.
 */
export const MONTREAL_PLACES_DRAFT: OttawaCourt[] = [
  {
    id: 'mtl-lafontaine',
    name: 'Parc La Fontaine',
    neighbourhood: 'Plateau',
    sports: ['Soccer', 'Tennis', 'Running', 'Basketball'],
    type: 'free',
    season: 'multi',
    lat: 45.527,
    lng: -73.569,
    notes: 'DRAFT — activate after Ottawa proof',
  },
  {
    id: 'mtl-jarry',
    name: 'Parc Jarry',
    neighbourhood: 'Villeray',
    sports: ['Tennis', 'Soccer', 'Baseball', 'Running', 'Outdoor Basketball'],
    type: 'free',
    season: 'summer',
    lat: 45.535,
    lng: -73.628,
    notes: 'DRAFT',
  },
  {
    id: 'mtl-jean-drapeau',
    name: 'Parc Jean-Drapeau beaches / open space',
    neighbourhood: 'Île Sainte-Hélène',
    sports: ['Beach Volleyball', 'Swimming', 'Cycling', 'Running'],
    type: 'free',
    season: 'summer',
    lat: 45.513,
    lng: -73.533,
    notes: 'DRAFT',
  },
];
