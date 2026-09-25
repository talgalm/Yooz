import assert from 'assert';
import { TEMPLATES, buildFilterComplex } from './collage';

const t = TEMPLATES.default;
const logo = t.logo!;
const mirroredX = t.width - logo.x - logo.w;

const both = buildFilterComplex(t, { logoIdx: 7, logoRightIdx: 8, titleIdx: null });
assert.ok(both.includes(`[logo]overlay=x=${logo.x}:y=${logo.y}`), 'left logo at the yellow box');
assert.ok(both.includes(`[logoR]overlay=x=${mirroredX}:y=${logo.y}`), 'right logo mirrored');
assert.ok(
  both.indexOf('[comp][fg]overlay') < both.indexOf('[logoR]overlay'),
  'right logo composites after (on top of) the foreground',
);
assert.ok(
  both.indexOf('[logo]overlay') < both.indexOf('[comp][fg]overlay'),
  'left logo composites before (behind) the foreground',
);

const rightOnly = buildFilterComplex(t, { logoIdx: null, logoRightIdx: 7, titleIdx: null });
assert.ok(rightOnly.includes('[logoR]overlay'), 'right logo works without a left logo');
assert.ok(!rightOnly.includes('[logo]overlay'), 'no left logo overlay when unset');
assert.ok(!rightOnly.includes(logo.color), 'yellow is only keyed when a left logo is present');

const none = buildFilterComplex(t, { logoIdx: null, logoRightIdx: null, titleIdx: null });
assert.ok(!none.includes('logoR'), 'no right-logo chain when unset');
assert.ok(none.includes('[withFg]null[vraw]'), 'plain composite still terminates at [vraw]');

const noBox = buildFilterComplex(TEMPLATES['gan-yehoshua'], { logoIdx: 7, logoRightIdx: 8, titleIdx: null });
assert.ok(!noBox.includes('logoR') && !noBox.includes('[logo]'), 'templates without a logo box draw no logos');

console.log('collage filter self-check passed');
