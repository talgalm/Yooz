import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP_FEATURE_KEYS, MAP_LOOKS, MAP_STYLE_IDS, lookFor, mapOptionsFor, type MapStyleId } from './mapDesign';
import { textColorOn } from './mapPins';

const GOOGLE_FEATURE_TYPES = new Set([
  'all',
  'administrative', 'administrative.country', 'administrative.land_parcel', 'administrative.locality',
  'administrative.neighborhood', 'administrative.province',
  'landscape', 'landscape.man_made', 'landscape.natural', 'landscape.natural.landcover', 'landscape.natural.terrain',
  'poi', 'poi.attraction', 'poi.business', 'poi.government', 'poi.medical', 'poi.park', 'poi.place_of_worship',
  'poi.school', 'poi.sports_complex',
  'road', 'road.arterial', 'road.highway', 'road.highway.controlled_access', 'road.local',
  'transit', 'transit.line', 'transit.station', 'transit.station.airport', 'transit.station.bus', 'transit.station.rail',
  'water',
]);

const GOOGLE_ELEMENT_TYPES = new Set([
  'all', 'geometry', 'geometry.fill', 'geometry.stroke',
  'labels', 'labels.icon', 'labels.text', 'labels.text.fill', 'labels.text.stroke',
]);

const GOOGLE_STYLERS = new Set(['hue', 'lightness', 'saturation', 'gamma', 'invert_lightness', 'visibility', 'color', 'weight']);

const everyDesign = MAP_STYLE_IDS.map((style) => ({ style, hidden: [...MAP_FEATURE_KEYS] }));

test('every rule names a feature, element and styler Google knows, since Google ignores a typo silently', () => {
  for (const design of everyDesign) {
    for (const rule of mapOptionsFor(design).styles ?? []) {
      if (rule.featureType) assert.ok(GOOGLE_FEATURE_TYPES.has(rule.featureType), `${design.style}: unknown featureType ${rule.featureType}`);
      if (rule.elementType) assert.ok(GOOGLE_ELEMENT_TYPES.has(rule.elementType), `${design.style}: unknown elementType ${rule.elementType}`);
      for (const styler of rule.stylers) {
        for (const key of Object.keys(styler)) assert.ok(GOOGLE_STYLERS.has(key), `${design.style}: unknown styler ${key}`);
      }
    }
  }
});

test('colours are six-digit hex, which is all Google accepts', () => {
  for (const design of everyDesign) {
    for (const rule of mapOptionsFor(design).styles ?? []) {
      for (const styler of rule.stylers as Record<string, unknown>[]) {
        if ('color' in styler) assert.match(String(styler.color), /^#[0-9a-f]{6}$/i, `${design.style}: bad colour`);
      }
    }
  }
});

test('hiding a feature is applied after the style, so the style cannot bring it back', () => {
  const styles = mapOptionsFor({ style: 'vintage', hidden: ['business'] }).styles ?? [];
  const last = styles[styles.length - 1];
  assert.equal(last.featureType, 'poi.business');
  assert.deepEqual(last.stylers, [{ visibility: 'off' }]);
});

test('the standard design with nothing hidden is the plain Google map', () => {
  assert.deepEqual(mapOptionsFor({ style: 'standard', hidden: [] }), { styles: [], mapTypeId: 'roadmap' });
  assert.deepEqual(mapOptionsFor(undefined), { styles: [], mapTypeId: 'roadmap' });
});

test('satellite switches the map type, and an unknown style falls back to standard', () => {
  assert.equal(mapOptionsFor({ style: 'satellite', hidden: [] }).mapTypeId, 'hybrid');
  assert.equal(lookFor({ style: 'nope' as MapStyleId, hidden: [] }), MAP_LOOKS.standard);
});

test('hiding every place also hides the places no checkbox names, like the airport', () => {
  const everything = mapOptionsFor({ style: 'standard', hidden: [...MAP_FEATURE_KEYS] }).styles ?? [];
  assert.ok(everything.some((r) => r.featureType === 'poi' && r.elementType === 'labels'));
  assert.ok(everything.some((r) => r.featureType === 'transit.station' && r.elementType === 'labels'));
  const oneShown = mapOptionsFor({ style: 'standard', hidden: MAP_FEATURE_KEYS.filter((k) => k !== 'school') }).styles ?? [];
  assert.ok(!oneShown.some((r) => r.featureType === 'poi' && r.elementType === 'labels'), 'schools were asked for, so place labels must stay');
});

test('every look has its own valid pin colours', () => {
  for (const id of MAP_STYLE_IDS) {
    const { pins } = MAP_LOOKS[id];
    for (const [role, value] of Object.entries(pins)) assert.match(value, /^#[0-9a-f]{6}$/i, `${id}: bad ${role} colour`);
  }
});

test('a pin number is dark on a light pin and white on a dark one', () => {
  assert.equal(textColorOn('#ffdd00'), '#1a1a1a');
  assert.equal(textColorOn('#ffd166'), '#1a1a1a');
  assert.equal(textColorOn('#6c5ce7'), '#ffffff');
  assert.equal(textColorOn('#e02424'), '#ffffff');
});

test('every feature hides something', () => {
  for (const key of MAP_FEATURE_KEYS) {
    const styles = mapOptionsFor({ style: 'standard', hidden: [key] }).styles ?? [];
    assert.ok(styles.length > 0, `${key} has no rule`);
  }
});
