export interface FloorPoint {
  x: number;
  z: number;
}

export interface ArCoin {
  id: number;
  x: number;
  z: number;
  phase: number;
  collectedAt: number | null;
}

export interface ArGameState {
  coins: ArCoin[];
  elapsedSeconds: number;
}

export interface ArCollectResult {
  state: ArGameState;
  collected: boolean;
  meters: number;
}

export const NEAREST_START_M = 1.4;
export const FIRST_COIN_MAX_M = 2.6;
export const FIRST_COIN_SPREAD_RAD = 0.2;
export const REACH_TRACKED_M = 1.6;
export const REACH_STEPS_M = 2.2;
export const SUITCASE_MIN_M = 2.2;
const EDGE_RATIO = 0.95;
const SUITCASE_FAR_RATIO = 0.55;
const COIN_GAP_M = 0.9;
const PLACEMENT_TRIES = 200;

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function distance(a: FloorPoint, b: FloorPoint): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function placeCoins(count: number, center: FloorPoint, forward: FloorPoint, radius: number, random: () => number): FloorPoint[] {
  const reach = Math.max(NEAREST_START_M + 0.2, radius * EDGE_RATIO);
  const facing = Math.atan2(forward.z, forward.x);
  const at = (angle: number, meters: number) => ({ x: center.x + Math.cos(angle) * meters, z: center.z + Math.sin(angle) * meters });
  const placed: FloorPoint[] = [];
  const firstReach = Math.min(FIRST_COIN_MAX_M, reach);
  placed.push(at(facing + (random() * 2 - 1) * FIRST_COIN_SPREAD_RAD, NEAREST_START_M + (firstReach - NEAREST_START_M) * random()));
  for (let i = 1; i < count; i++) {
    const slot = facing + (i / count) * Math.PI * 2;
    const pick = () => at(slot + (random() - 0.5) * ((Math.PI * 2) / count), Math.sqrt(NEAREST_START_M ** 2 + (reach ** 2 - NEAREST_START_M ** 2) * random()));
    let spot = pick();
    for (let tries = 1; tries < PLACEMENT_TRIES && placed.some((other) => distance(other, spot) < COIN_GAP_M); tries++) spot = pick();
    placed.push(spot);
  }
  return placed;
}

const asTargets = (spots: FloorPoint[], random: () => number): ArCoin[] =>
  spots.map((spot, id) => ({ id, x: spot.x, z: spot.z, phase: random() * Math.PI * 2, collectedAt: null }));

export function createArGame(count: number, start: FloorPoint, forward: FloorPoint, radius: number, random: () => number): ArGameState {
  return { coins: asTargets(placeCoins(count, start, forward, radius, random), random), elapsedSeconds: 0 };
}

export function createSuitcaseHunt(start: FloorPoint, radius: number, random: () => number): ArGameState {
  const far = Math.max(SUITCASE_MIN_M + 0.2, radius * EDGE_RATIO);
  const near = Math.min(far - 0.2, Math.max(SUITCASE_MIN_M, radius * SUITCASE_FAR_RATIO));
  const angle = random() * Math.PI * 2;
  const meters = near + (far - near) * random();
  const spot = { x: start.x + Math.cos(angle) * meters, z: start.z + Math.sin(angle) * meters };
  return { coins: asTargets([spot], random), elapsedSeconds: 0 };
}

export function stepArGame(state: ArGameState, dt: number): ArGameState {
  return { ...state, elapsedSeconds: state.elapsedSeconds + dt };
}

export function inReach(coin: ArCoin, player: FloorPoint, reach: number): boolean {
  return coin.collectedAt === null && distance(coin, player) <= reach;
}

export function tryCollect(state: ArGameState, id: number, player: FloorPoint, reach: number): ArCollectResult {
  const coin = state.coins.find((c) => c.id === id);
  if (!coin || coin.collectedAt !== null) return { state, collected: false, meters: coin ? distance(coin, player) : Number.POSITIVE_INFINITY };
  const meters = distance(coin, player);
  if (meters > reach) return { state, collected: false, meters };
  const coins = state.coins.map((c) => (c.id === id ? { ...c, collectedAt: state.elapsedSeconds } : c));
  return { state: { ...state, coins }, collected: true, meters };
}

export function nearestCoin(state: ArGameState, player: FloorPoint): { coin: ArCoin; meters: number } | null {
  let best: { coin: ArCoin; meters: number } | null = null;
  for (const coin of state.coins) {
    if (coin.collectedAt !== null) continue;
    const meters = distance(coin, player);
    if (!best || meters < best.meters) best = { coin, meters };
  }
  return best;
}

export function collectedCount(state: ArGameState): number {
  return state.coins.filter((coin) => coin.collectedAt !== null).length;
}

export function isArGameOver(state: ArGameState, timeLimitSeconds: number): boolean {
  return state.elapsedSeconds >= timeLimitSeconds || state.coins.every((coin) => coin.collectedAt !== null);
}
