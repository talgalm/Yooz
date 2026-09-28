import { distanceMeters, type LatLng } from './geo';

export interface WalkStep {
  instruction: string;
  maneuver?: string;
  distanceM: number;
  durationS: number;
  end: LatLng;
  path: LatLng[];
}

export interface WalkRoute {
  steps: WalkStep[];
  distanceM: number;
  durationS: number;
}

export interface NextTurn {
  instruction: string;
  maneuver?: string;
  inM: number;
  arriving: boolean;
}

const MANEUVER_ARROWS: Record<string, string> = {
  'turn-left': '←',
  'turn-right': '→',
  'turn-slight-left': '↖',
  'turn-slight-right': '↗',
  'turn-sharp-left': '↙',
  'turn-sharp-right': '↘',
  'keep-left': '↖',
  'keep-right': '↗',
  'uturn-left': '↶',
  'uturn-right': '↷',
  'roundabout-left': '↺',
  'roundabout-right': '↻',
  straight: '↑',
};

export function maneuverArrow(maneuver: string | undefined): string {
  return (maneuver && MANEUVER_ARROWS[maneuver]) || '↑';
}

function distanceToPath(me: LatLng, path: LatLng[]): number {
  let best = Infinity;
  for (const point of path) best = Math.min(best, distanceMeters(me, point));
  return best;
}

export function currentStepIndex(route: WalkRoute, me: LatLng): number {
  let bestIndex = 0;
  let best = Infinity;
  route.steps.forEach((step, i) => {
    const d = distanceToPath(me, step.path);
    if (d < best) {
      best = d;
      bestIndex = i;
    }
  });
  return bestIndex;
}

export function offRouteMeters(route: WalkRoute, me: LatLng): number {
  let best = Infinity;
  for (const step of route.steps) best = Math.min(best, distanceToPath(me, step.path));
  return best;
}

export function nextTurn(route: WalkRoute, me: LatLng): NextTurn | null {
  if (route.steps.length === 0) return null;
  const at = currentStepIndex(route, me);
  const inM = distanceMeters(me, route.steps[at].end);
  const following = route.steps[at + 1];
  if (!following) return { instruction: '', inM, arriving: true };
  return { instruction: following.instruction, maneuver: following.maneuver, inM, arriving: false };
}

export function remainingWalk(route: WalkRoute, me: LatLng): { distanceM: number; durationS: number } {
  if (route.steps.length === 0) return { distanceM: 0, durationS: 0 };
  const at = currentStepIndex(route, me);
  const step = route.steps[at];
  const toStepEnd = Math.min(distanceMeters(me, step.end), step.distanceM);
  const share = step.distanceM > 0 ? toStepEnd / step.distanceM : 0;
  let distanceM = toStepEnd;
  let durationS = step.durationS * share;
  for (const later of route.steps.slice(at + 1)) {
    distanceM += later.distanceM;
    durationS += later.durationS;
  }
  return { distanceM, durationS };
}
