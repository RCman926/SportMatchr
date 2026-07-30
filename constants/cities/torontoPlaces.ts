import type { OttawaCourt } from '../ottawaCourts';

/**
 * DRAFT — not active in the app until Ottawa has unaided density.
 */
export const TORONTO_PLACES_DRAFT: OttawaCourt[] = [
  {
    id: 'to-trinity-bellwoods',
    name: 'Trinity Bellwoods Park',
    neighbourhood: 'West Queen West',
    sports: ['Soccer', 'Ultimate Frisbee', 'Running', 'Outdoor Yoga', 'Tai Chi', 'Spikeball'],
    type: 'free',
    season: 'multi',
    lat: 43.647,
    lng: -79.419,
    notes: 'DRAFT — activate after Ottawa proof',
  },
  {
    id: 'to-high-park',
    name: 'High Park',
    neighbourhood: 'High Park',
    sports: ['Soccer', 'Baseball', 'Running', 'Hiking', 'Outdoor Yoga', 'Tennis'],
    type: 'free',
    season: 'multi',
    lat: 43.6465,
    lng: -79.4635,
    notes: 'DRAFT',
  },
  {
    id: 'to-woodbine-beach',
    name: 'Woodbine Beach',
    neighbourhood: 'The Beaches',
    sports: ['Beach Volleyball', 'Swimming', 'Running', 'Outdoor Yoga'],
    type: 'free',
    season: 'summer',
    lat: 43.667,
    lng: -79.3,
    notes: 'DRAFT',
  },
];
