export const MAP_STYLE_IDS = [
  'standard',
  'light',
  'dark',
  'night',
  'satellite',
  'vintage',
  'wildWest',
  'treasure',
  'playful',
  'blueprint',
] as const;

export const MAP_FEATURE_KEYS = [
  'business',
  'park',
  'attraction',
  'worship',
  'school',
  'medical',
  'government',
  'sports',
  'bus',
  'railAndAir',
  'streetNames',
  'placeNames',
] as const;

export type MapStyleId = (typeof MAP_STYLE_IDS)[number];
export type MapFeatureKey = (typeof MAP_FEATURE_KEYS)[number];

export interface MapDesign {
  style: MapStyleId;
  hidden: MapFeatureKey[];
}

export const DEFAULT_MAP_DESIGN: MapDesign = { style: 'standard', hidden: [] };

export type MapOverlayKind = 'paper' | 'dust' | 'grid';

export interface MapLook {
  styles: google.maps.MapTypeStyle[];
  mapTypeId: 'roadmap' | 'hybrid';
  pins: { next: string; done: string; me: string };
  routeColor: string;
  routeOutline?: string;
  dashedRoute: boolean;
  overlay?: MapOverlayKind;
  swatch: { land: string; road: string; water: string; park: string };
}

type Rule = google.maps.MapTypeStyle;
type Styler = Record<string, string | number>;

const rule = (
  featureType: string | undefined,
  elementType: string | undefined,
  stylers: Styler[],
): Rule => ({
  ...(featureType && { featureType }),
  ...(elementType && { elementType }),
  stylers,
});

const color = (value: string): Styler[] => [{ color: value }];
const off: Styler[] = [{ visibility: 'off' }];

const LIGHT: Rule[] = [
  rule(undefined, 'geometry', color('#f5f5f5')),
  rule(undefined, 'labels.icon', [{ saturation: -100 }]),
  rule(undefined, 'labels.text.fill', color('#616161')),
  rule(undefined, 'labels.text.stroke', color('#f5f5f5')),
  rule('poi', 'geometry', color('#eeeeee')),
  rule('poi', 'labels.text.fill', color('#757575')),
  rule('poi.park', 'geometry', color('#e2ece0')),
  rule('poi.park', 'labels.text.fill', color('#9e9e9e')),
  rule('road', 'geometry', color('#ffffff')),
  rule('road.highway', 'geometry', color('#dadada')),
  rule('road.local', 'labels.text.fill', color('#9e9e9e')),
  rule('transit.line', 'geometry', color('#e5e5e5')),
  rule('water', 'geometry', color('#cfd8dc')),
  rule('water', 'labels.text.fill', color('#9e9e9e')),
];

const DARK: Rule[] = [
  rule(undefined, 'geometry', color('#212121')),
  rule(undefined, 'labels.icon', [{ saturation: -100 }, { lightness: -20 }]),
  rule(undefined, 'labels.text.fill', color('#8a8a8a')),
  rule(undefined, 'labels.text.stroke', color('#212121')),
  rule('administrative', 'geometry', color('#757575')),
  rule('administrative.locality', 'labels.text.fill', color('#bdbdbd')),
  rule('poi', 'geometry', color('#262626')),
  rule('poi', 'labels.text.fill', color('#757575')),
  rule('poi.park', 'geometry', color('#1b2a1b')),
  rule('poi.park', 'labels.text.fill', color('#616161')),
  rule('road', 'geometry.fill', color('#2c2c2c')),
  rule('road', 'geometry.stroke', color('#212121')),
  rule('road', 'labels.text.fill', color('#9a9a9a')),
  rule('road.arterial', 'geometry', color('#373737')),
  rule('road.highway', 'geometry', color('#454545')),
  rule('transit', 'geometry', color('#2f2f2f')),
  rule('water', 'geometry', color('#0b0b0b')),
  rule('water', 'labels.text.fill', color('#3d3d3d')),
];

const NIGHT: Rule[] = [
  rule(undefined, 'geometry', color('#242f3e')),
  rule(undefined, 'labels.text.stroke', color('#242f3e')),
  rule(undefined, 'labels.text.fill', color('#9e8f7a')),
  rule(undefined, 'labels.icon', [{ saturation: -60 }, { lightness: -15 }]),
  rule('administrative.locality', 'labels.text.fill', color('#d59563')),
  rule('poi', 'labels.text.fill', color('#d59563')),
  rule('poi.park', 'geometry', color('#263c3f')),
  rule('poi.park', 'labels.text.fill', color('#6b9a76')),
  rule('road', 'geometry', color('#38414e')),
  rule('road', 'geometry.stroke', color('#212a37')),
  rule('road', 'labels.text.fill', color('#9ca5b3')),
  rule('road.highway', 'geometry', color('#746855')),
  rule('road.highway', 'geometry.stroke', color('#1f2835')),
  rule('road.highway', 'labels.text.fill', color('#f3d19c')),
  rule('transit', 'geometry', color('#2f3948')),
  rule('transit.station', 'labels.text.fill', color('#d59563')),
  rule('water', 'geometry', color('#17263c')),
  rule('water', 'labels.text.fill', color('#515c6d')),
  rule('water', 'labels.text.stroke', color('#17263c')),
];

const VINTAGE: Rule[] = [
  rule(undefined, 'geometry', color('#ebe3cd')),
  rule(undefined, 'labels.text.fill', color('#523735')),
  rule(undefined, 'labels.text.stroke', color('#f5f1e6')),
  rule(undefined, 'labels.icon', [{ saturation: -75 }, { lightness: 5 }]),
  rule('administrative', 'geometry.stroke', color('#c9b2a6')),
  rule('landscape.natural', 'geometry', color('#dfd2ae')),
  rule('poi', 'geometry', color('#dfd2ae')),
  rule('poi', 'labels.text.fill', color('#93817c')),
  rule('poi.park', 'geometry.fill', color('#a5b076')),
  rule('poi.park', 'labels.text.fill', color('#447530')),
  rule('road', 'geometry', color('#f5f1e6')),
  rule('road.arterial', 'geometry', color('#fdfcf8')),
  rule('road.highway', 'geometry', color('#f8c967')),
  rule('road.highway', 'geometry.stroke', color('#e9bc62')),
  rule('road.highway.controlled_access', 'geometry', color('#e98d58')),
  rule('road.local', 'labels.text.fill', color('#806b63')),
  rule('transit.line', 'geometry', color('#dfd2ae')),
  rule('transit.station', 'geometry', color('#dfd2ae')),
  rule('water', 'geometry.fill', color('#b9d3c2')),
  rule('water', 'labels.text.fill', color('#92998d')),
];

const WILD_WEST: Rule[] = [
  rule(undefined, undefined, [{ saturation: -100 }]),
  rule(undefined, 'geometry', color('#d8d8d8')),
  rule(undefined, 'labels.text.fill', color('#1c1c1c')),
  rule(undefined, 'labels.text.stroke', [{ color: '#ececec' }, { weight: 3 }]),
  rule(undefined, 'labels.icon', [{ saturation: -100 }, { lightness: -15 }]),
  rule('administrative', 'geometry.stroke', color('#555555')),
  rule('landscape.natural', 'geometry', color('#d0d0d0')),
  rule('landscape.man_made', 'geometry', color('#cacaca')),
  rule('poi', 'geometry', color('#c2c2c2')),
  rule('poi.park', 'geometry', color('#a6a6a6')),
  rule('road', 'geometry.fill', color('#8c8c8c')),
  rule('road', 'geometry.stroke', color('#4a4a4a')),
  rule('road', 'labels.text.fill', color('#161616')),
  rule('road.local', 'geometry.fill', color('#9e9e9e')),
  rule('road.highway', 'geometry.fill', color('#5e5e5e')),
  rule('road.highway', 'geometry.stroke', color('#2e2e2e')),
  rule('transit.line', 'geometry', color('#3a3a3a')),
  rule('water', 'geometry', color('#6c6c6c')),
  rule('water', 'labels.text.fill', color('#262626')),
];

const TREASURE: Rule[] = [
  rule(undefined, 'geometry', color('#f0dcaa')),
  rule(undefined, 'labels.text.fill', color('#5a3a1e')),
  rule(undefined, 'labels.text.stroke', [{ color: '#f6e7c1' }, { weight: 3 }]),
  rule(undefined, 'labels.icon', [{ saturation: -80 }]),
  rule('administrative', 'geometry.stroke', color('#a0522d')),
  rule('landscape.natural', 'geometry', color('#e8cf95')),
  rule('poi', 'geometry', color('#e6cc92')),
  rule('poi.park', 'geometry', color('#b9bf7a')),
  rule('road', 'geometry.fill', color('#faf0d2')),
  rule('road', 'geometry.stroke', color('#b07a45')),
  rule('road.highway', 'geometry.fill', color('#e3b36b')),
  rule('road.highway', 'geometry.stroke', color('#a0522d')),
  rule('transit.line', 'geometry', color('#a0522d')),
  rule('water', 'geometry', color('#6fa7b8')),
  rule('water', 'labels.text.fill', color('#1f4a57')),
  rule('water', 'labels.text.stroke', color('#9cc6d2')),
];

const PLAYFUL: Rule[] = [
  rule(undefined, 'geometry', color('#f4f0ff')),
  rule(undefined, 'labels.text.fill', color('#4b3a99')),
  rule(undefined, 'labels.text.stroke', [{ color: '#ffffff' }, { weight: 3 }]),
  rule('landscape.man_made', 'geometry', color('#ece6ff')),
  rule('poi', 'geometry', color('#e9e2ff')),
  rule('poi.park', 'geometry', color('#b8f2c9')),
  rule('poi.park', 'labels.text.fill', color('#1f8a4c')),
  rule('road', 'geometry.fill', color('#ffffff')),
  rule('road', 'geometry.stroke', color('#d8cffb')),
  rule('road.highway', 'geometry.fill', color('#ffd166')),
  rule('road.highway', 'geometry.stroke', color('#f4b942')),
  rule('transit.line', 'geometry', color('#c9bdf7')),
  rule('water', 'geometry', color('#9ad4ff')),
  rule('water', 'labels.text.fill', color('#1c6aa8')),
];

const BLUEPRINT: Rule[] = [
  rule(undefined, 'geometry', color('#1d4f91')),
  rule(undefined, 'labels.text.fill', color('#e8f1ff')),
  rule(undefined, 'labels.text.stroke', [{ color: '#1d4f91' }, { weight: 3 }]),
  rule(undefined, 'labels.icon', [{ saturation: -100 }, { lightness: 40 }]),
  rule('administrative', 'geometry.stroke', color('#9cc2f0')),
  rule('landscape.man_made', 'geometry.stroke', color('#6d9ad6')),
  rule('poi', 'geometry', color('#1f5599')),
  rule('poi.park', 'geometry', color('#24609f')),
  rule('road', 'geometry.fill', color('#d6e6fb')),
  rule('road', 'geometry.stroke', color('#1d4f91')),
  rule('road.local', 'geometry.fill', color('#8fb6e8')),
  rule('road.highway', 'geometry.fill', color('#ffffff')),
  rule('road', 'labels.text.fill', color('#ffffff')),
  rule('transit.line', 'geometry', color('#9cc2f0')),
  rule('water', 'geometry', color('#123a6e')),
  rule('water', 'labels.text.fill', color('#9cc2f0')),
];

export const MAP_LOOKS: Record<MapStyleId, MapLook> = {
  standard: {
    styles: [],
    mapTypeId: 'roadmap',
    pins: { next: '#6c5ce7', done: '#00b894', me: '#0984e3' },
    routeColor: '#6c5ce7',
    dashedRoute: false,
    swatch: { land: '#f1f3f4', road: '#ffffff', water: '#aadaff', park: '#c8e6c9' },
  },
  light: {
    styles: LIGHT,
    mapTypeId: 'roadmap',
    pins: { next: '#6c5ce7', done: '#00a884', me: '#0984e3' },
    routeColor: '#6c5ce7',
    dashedRoute: false,
    swatch: { land: '#f5f5f5', road: '#ffffff', water: '#cfd8dc', park: '#e2ece0' },
  },
  dark: {
    styles: DARK,
    mapTypeId: 'roadmap',
    pins: { next: '#8b7bff', done: '#5c5a78', me: '#4dabf7' },
    routeColor: '#8b7bff',
    dashedRoute: false,
    swatch: { land: '#212121', road: '#3c3c3c', water: '#0b0b0b', park: '#1b2a1b' },
  },
  vintage: {
    styles: VINTAGE,
    mapTypeId: 'roadmap',
    pins: { next: '#c0392b', done: '#1b7f5b', me: '#1f4e79' },
    routeColor: '#9b1d12',
    routeOutline: '#fff6e0',
    dashedRoute: true,
    overlay: 'paper',
    swatch: { land: '#ebe3cd', road: '#f8c967', water: '#b9d3c2', park: '#a5b076' },
  },
  wildWest: {
    styles: WILD_WEST,
    mapTypeId: 'roadmap',
    pins: { next: '#e02424', done: '#0f766e', me: '#1d3557' },
    routeColor: '#e02424',
    routeOutline: '#fff3d6',
    dashedRoute: true,
    overlay: 'dust',
    swatch: { land: '#d8d8d8', road: '#5e5e5e', water: '#6c6c6c', park: '#a6a6a6' },
  },
  treasure: {
    styles: TREASURE,
    mapTypeId: 'roadmap',
    pins: { next: '#d00000', done: '#0e7490', me: '#3a0ca3' },
    routeColor: '#b3001b',
    routeOutline: '#fff6e0',
    dashedRoute: true,
    overlay: 'paper',
    swatch: { land: '#f0dcaa', road: '#e3b36b', water: '#6fa7b8', park: '#b9bf7a' },
  },
  playful: {
    styles: PLAYFUL,
    mapTypeId: 'roadmap',
    pins: { next: '#ff4d6d', done: '#06d6a0', me: '#4361ee' },
    routeColor: '#ff7675',
    dashedRoute: false,
    swatch: { land: '#f4f0ff', road: '#ffd166', water: '#9ad4ff', park: '#b8f2c9' },
  },
  night: {
    styles: NIGHT,
    mapTypeId: 'roadmap',
    pins: { next: '#ff9f1a', done: '#32ff7e', me: '#74b9ff' },
    routeColor: '#fdcb6e',
    dashedRoute: false,
    swatch: { land: '#242f3e', road: '#746855', water: '#17263c', park: '#263c3f' },
  },
  blueprint: {
    styles: BLUEPRINT,
    mapTypeId: 'roadmap',
    pins: { next: '#ff7a1a', done: '#ffd166', me: '#ff4d6d' },
    routeColor: '#ff7a1a',
    routeOutline: '#0a2347',
    dashedRoute: true,
    overlay: 'grid',
    swatch: { land: '#1d4f91', road: '#ffffff', water: '#123a6e', park: '#24609f' },
  },
  satellite: {
    styles: [],
    mapTypeId: 'hybrid',
    pins: { next: '#ffdd00', done: '#00e5ff', me: '#ff4d6d' },
    routeColor: '#ffd166',
    dashedRoute: false,
    swatch: { land: '#4a5a3a', road: '#c9c2b0', water: '#1e3a4a', park: '#2f4a2a' },
  },
};

const FEATURE_RULES: Record<MapFeatureKey, Rule[]> = {
  business: [rule('poi.business', undefined, off)],
  park: [rule('poi.park', 'labels', off)],
  attraction: [rule('poi.attraction', undefined, off)],
  worship: [rule('poi.place_of_worship', undefined, off)],
  school: [rule('poi.school', undefined, off)],
  medical: [rule('poi.medical', undefined, off)],
  government: [rule('poi.government', undefined, off)],
  sports: [rule('poi.sports_complex', undefined, off)],
  bus: [rule('transit.station.bus', undefined, off)],
  railAndAir: [rule('transit.station.rail', undefined, off), rule('transit.station.airport', undefined, off)],
  streetNames: [rule('road', 'labels', off)],
  placeNames: [rule('administrative', 'labels', off)],
};

const PLACE_GROUPS: { keys: MapFeatureKey[]; leftovers: Rule }[] = [
  {
    keys: ['business', 'park', 'attraction', 'worship', 'school', 'medical', 'government', 'sports'],
    leftovers: rule('poi', 'labels', off),
  },
  {
    keys: ['bus', 'railAndAir'],
    leftovers: rule('transit.station', 'labels', off),
  },
];

export function lookFor(design: MapDesign | undefined): MapLook {
  return MAP_LOOKS[design?.style ?? 'standard'] ?? MAP_LOOKS.standard;
}

export function mapOptionsFor(design: MapDesign | undefined): Pick<google.maps.MapOptions, 'styles' | 'mapTypeId'> {
  const look = lookFor(design);
  const hidden = design?.hidden ?? [];
  const hiddenRules = hidden.flatMap((key) => FEATURE_RULES[key] ?? []);
  const leftoverRules = PLACE_GROUPS
    .filter((group) => group.keys.every((key) => hidden.includes(key)))
    .map((group) => group.leftovers);
  return { styles: [...look.styles, ...hiddenRules, ...leftoverRules], mapTypeId: look.mapTypeId };
}

export function routeLineOptions(look: MapLook): google.maps.PolylineOptions {
  if (!look.dashedRoute) {
    return { strokeColor: look.routeColor, strokeWeight: 5, strokeOpacity: 0.85 };
  }
  const dash = (strokeColor: string, strokeWeight: number): google.maps.IconSequence => ({
    icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, strokeColor, strokeWeight, scale: 3.5 },
    offset: '0',
    repeat: '18px',
  });
  return {
    strokeOpacity: 0,
    icons: [
      ...(look.routeOutline ? [dash(look.routeOutline, 9)] : []),
      dash(look.routeColor, 5),
    ],
  };
}
