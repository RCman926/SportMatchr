import type { ImageSourcePropType } from 'react-native';
import type { SportFamily } from './sportVisual';
import { sportFamily } from './sportVisual';

export const SPORT_PHOTOS: Record<SportFamily, ImageSourcePropType> = {
  ice: require('../assets/sports/ice.jpg'),
  court: require('../assets/sports/court.jpg'),
  field: require('../assets/sports/field.jpg'),
  diamond: require('../assets/sports/diamond.jpg'),
  racket: require('../assets/sports/racket.jpg'),
  disc: require('../assets/sports/disc.jpg'),
  water: require('../assets/sports/water.jpg'),
  path: require('../assets/sports/path.jpg'),
  snow: require('../assets/sports/snow.jpg'),
  climb: require('../assets/sports/climb.jpg'),
  quiet: require('../assets/sports/quiet.jpg'),
  gym: require('../assets/sports/gym.jpg'),
  lawn: require('../assets/sports/lawn.jpg'),
};

const SPECIFIC: Record<string, ImageSourcePropType> = {
  beach: require('../assets/sports/beach.jpg'),
  volleyball: require('../assets/sports/volleyball.jpg'),
  basketball: require('../assets/sports/basketball.jpg'),
  ballhockey: require('../assets/sports/ballhockey.jpg'),
  shinny: require('../assets/sports/shinny.jpg'),
  icehockey: require('../assets/sports/icehockey.jpg'),
  pickleball: require('../assets/sports/pickleball.jpg'),
  tennis: require('../assets/sports/tennis.jpg'),
  badminton: require('../assets/sports/badminton.jpg'),
  curling: require('../assets/sports/curling.jpg'),
  soccer: require('../assets/sports/soccer.jpg'),
  baseball: require('../assets/sports/baseball.jpg'),
  cricket: require('../assets/sports/cricket.jpg'),
  kayak: require('../assets/sports/kayak.jpg'),
  running: require('../assets/sports/running.jpg'),
  outdooryoga: require('../assets/sports/outdooryoga.jpg'),
  taichi: require('../assets/sports/taichi.jpg'),
  court: require('../assets/sports/court.jpg'),
  softball: require('../assets/sports/softball.jpg'),
  slopitch: require('../assets/sports/slopitch.jpg'),
  padel: require('../assets/sports/padel.jpg'),
};

const NAME_KEY: Record<string, keyof typeof SPECIFIC> = {
  beach: 'beach',
  'beach volleyball': 'beach',
  swimming: 'beach',
  volleyball: 'volleyball',
  basketball: 'basketball',
  'outdoor basketball': 'court',
  'ball hockey': 'ballhockey',
  'inline hockey': 'ballhockey',
  shinny: 'shinny',
  'pond hockey': 'shinny',
  'stick and puck': 'shinny',
  skating: 'shinny',
  'figure skating': 'shinny',
  hockey: 'icehockey',
  'ice hockey': 'icehockey',
  ringette: 'icehockey',
  curling: 'curling',
  pickleball: 'pickleball',
  padel: 'padel',
  tennis: 'tennis',
  badminton: 'badminton',
  soccer: 'soccer',
  futsal: 'soccer',
  football: 'soccer',
  'flag football': 'soccer',
  baseball: 'baseball',
  softball: 'softball',
  'slo-pitch': 'slopitch',
  cricket: 'cricket',
  kayaking: 'kayak',
  canoeing: 'kayak',
  running: 'running',
  hiking: 'running',
  cycling: 'running',
  'outdoor yoga': 'outdooryoga',
  yoga: 'outdooryoga',
  'tai chi': 'taichi',
};

const KEY_RULES: [RegExp, keyof typeof SPECIFIC][] = [
  [/^beach$|beach\s*volley|swimming/, 'beach'],
  [/volley/, 'volleyball'],
  [/outdoor\s*basket/, 'court'],
  [/basketball/, 'basketball'],
  [/ball\s*hockey|inline\s*hockey/, 'ballhockey'],
  [/pond\s*hockey|shinny|stick and puck/, 'shinny'],
  [/ice\s*hockey|ringette|^hockey$/, 'icehockey'],
  [/curling/, 'curling'],
  [/pickleball/, 'pickleball'],
  [/padel/, 'padel'],
  [/table tennis/, 'badminton'],
  [/tennis/, 'tennis'],
  [/badminton/, 'badminton'],
  [/soccer|futsal|flag football|\bfootball\b/, 'soccer'],
  [/cricket/, 'cricket'],
  [/slo-?pitch/, 'slopitch'],
  [/softball/, 'softball'],
  [/baseball/, 'baseball'],
  [/kayak|canoe|kite|sail/, 'kayak'],
  [/hiking|cycling|^running$|\brun\b/, 'running'],
  [/yoga|pilates/, 'outdooryoga'],
  [/tai chi|qi gong/, 'taichi'],
];

export const CITY_PHOTO: ImageSourcePropType = require('../assets/sports/ottawa.jpg');

export function sportPhoto(name: string | null | undefined): ImageSourcePropType {
  const n = (name ?? '').trim().toLowerCase();
  if (n) {
    const exact = NAME_KEY[n];
    if (exact) return SPECIFIC[exact];
    for (const [re, key] of KEY_RULES) {
      if (re.test(n)) return SPECIFIC[key];
    }
  }
  return SPORT_PHOTOS[sportFamily(name)];
}
