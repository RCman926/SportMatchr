export type SportFamily =
  | 'ice'
  | 'court'
  | 'field'
  | 'diamond'
  | 'racket'
  | 'disc'
  | 'water'
  | 'path'
  | 'snow'
  | 'climb'
  | 'quiet'
  | 'gym'
  | 'lawn';

export type SportVisual = {
  family: SportFamily;
  wash: string;
  ink: string;
  border: string;
  /** Full-card scene */
  ground: string;
  line: string;
  paint: string;
};

const PALETTE: Record<SportFamily, Omit<SportVisual, 'family'>> = {
  ice: {
    wash: '#E7F3FB',
    ink: '#1E5F7A',
    border: '#B7D7EA',
    ground: '#D8EEF8',
    line: '#C81E2A',
    paint: '#3D7EA6',
  },
  court: {
    wash: '#F6E4D6',
    ink: '#8E3F1A',
    border: '#E8C4A8',
    ground: '#3A3834',
    line: '#F4EFE6',
    paint: '#C75A28',
  },
  field: {
    wash: '#DCEFDC',
    ink: '#1B6B32',
    border: '#B5D8B8',
    ground: '#2F7A3E',
    line: '#F4F7F2',
    paint: '#1B5C2E',
  },
  diamond: {
    wash: '#FCE8E6',
    ink: '#B33A32',
    border: '#F0C0BA',
    ground: '#3E8A4A',
    line: '#F4E6C8',
    paint: '#C45A32',
  },
  racket: {
    wash: '#E7EEFB',
    ink: '#34518A',
    border: '#BCCAE8',
    ground: '#3D6B4F',
    line: '#F7F4EE',
    paint: '#2C5280',
  },
  disc: {
    wash: '#FFF3D4',
    ink: '#9A6B00',
    border: '#E8D392',
    ground: '#4A7A32',
    line: '#F7E7A0',
    paint: '#C48A00',
  },
  water: {
    wash: '#D9F1F4',
    ink: '#176B7A',
    border: '#A8D8DF',
    ground: '#1A6B78',
    line: '#B8E8EE',
    paint: '#0E4A54',
  },
  path: {
    wash: '#F3EBDD',
    ink: '#7A5A28',
    border: '#E0D0B0',
    ground: '#6B8F4A',
    line: '#E8DCC4',
    paint: '#4A5C32',
  },
  snow: {
    wash: '#EEF5FA',
    ink: '#3D6788',
    border: '#C5D8E6',
    ground: '#E8F0F6',
    line: '#8AA8C0',
    paint: '#5A7A96',
  },
  climb: {
    wash: '#F6E6D6',
    ink: '#9A5420',
    border: '#E8C8A8',
    ground: '#6B5344',
    line: '#E8C8A0',
    paint: '#C47A40',
  },
  quiet: {
    wash: '#EDE8F6',
    ink: '#5C4588',
    border: '#D0C4E6',
    ground: '#7A9A6A',
    line: '#F0E8C8',
    paint: '#E8C878',
  },
  gym: {
    wash: '#F3E6E2',
    ink: '#8A3D38',
    border: '#E0C4BE',
    ground: '#2C2C2C',
    line: '#E8E0D8',
    paint: '#C45A40',
  },
  lawn: {
    wash: '#E6F2D6',
    ink: '#3F6E1E',
    border: '#C2DCA0',
    ground: '#5A8A32',
    line: '#F2F6E8',
    paint: '#3F6E1E',
  },
};

export function sportFamily(name: string | null | undefined): SportFamily {
  const n = (name ?? '').toLowerCase();
  if (!n) return 'court';

  if (
    /ice hockey|^hockey$|shinny|stick and puck|pond hockey|ringette|speed skat|figure skat|^skating$|curling|broomball/.test(
      n
    )
  ) {
    return 'ice';
  }
  if (/ball hockey|inline hockey/.test(n)) return 'gym';
  if (/outdoor fitness|calisthenics|bodyweight/.test(n)) return 'gym';
  if (/ski|snowboard|snowshoe|toboggan/.test(n)) return 'snow';
  if (/ice climb/.test(n)) return 'climb';
  if (/climb|boulder/.test(n)) return 'climb';
  if (
    /yoga|tai chi|qi gong|pilates/.test(n)
  ) {
    return 'quiet';
  }
  if (/^beach$|beach volley/.test(n)) return 'water';
  if (/kayak|canoe|paddle|rowing|swim|water polo|sail|kite/.test(n)) {
    return 'water';
  }
  if (
    /run|hiking|cycl|biking|skateboard|bmx|parkour|orienteering/.test(n)
  ) {
    return 'path';
  }
  if (/tennis|pickleball|padel|badminton|squash|racquet|table tennis/.test(n)) {
    return 'racket';
  }
  if (/baseball|softball|slo-pitch|cricket/.test(n)) return 'diamond';
  if (/ultimate|disc golf|spikeball|frisbee/.test(n)) return 'disc';
  if (/golf|driving range|lawn bowl|bocce|cornhole/.test(n)) return 'lawn';
  if (
    /soccer|futsal|rugby|football|kickball|dodgeball|lacrosse|field hockey/.test(n)
  ) {
    return 'field';
  }
  if (
    /box|martial|wrestl|fencing|archery|crossfit|weight|dance fitness/.test(n)
  ) {
    return 'gym';
  }
  if (/bowl/.test(n)) return 'gym';
  // volleyball, basketball, netball, handball
  return 'court';
}

export function sportVisual(name: string | null | undefined): SportVisual {
  const family = sportFamily(name);
  return { family, ...PALETTE[family] };
}
