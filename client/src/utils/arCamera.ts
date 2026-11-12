export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface ArCamera {
  position: Vec3;
  right: Vec3;
  up: Vec3;
  forward: Vec3;
}

export interface Viewport {
  width: number;
  height: number;
  focal: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
  depth: number;
  pixelsPerMeter: number;
}

export interface FloorDirection {
  x: number;
  z: number;
}

export const EYE_HEIGHT_M = 1.4;
export const CAMERA_LONG_SIDE_FOV_DEG = 65;
const NEAR_PLANE_M = 0.15;
const DEG = Math.PI / 180;
const BACK_OF_DEVICE: Quat = { x: -Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2 };

export const IDENTITY_QUAT: Quat = { x: 0, y: 0, z: 0, w: 1 };

export function multiplyQuat(a: Quat, b: Quat): Quat {
  return {
    x: a.x * b.w + a.w * b.x + a.y * b.z - a.z * b.y,
    y: a.y * b.w + a.w * b.y + a.z * b.x - a.x * b.z,
    z: a.z * b.w + a.w * b.z + a.x * b.y - a.y * b.x,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

export function quatFromAxisAngle(axis: Vec3, radians: number): Quat {
  const s = Math.sin(radians / 2);
  return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos(radians / 2) };
}

export function rotateVec(q: Quat, v: Vec3): Vec3 {
  const ix = q.w * v.x + q.y * v.z - q.z * v.y;
  const iy = q.w * v.y + q.z * v.x - q.x * v.z;
  const iz = q.w * v.z + q.x * v.y - q.y * v.x;
  const iw = -q.x * v.x - q.y * v.y - q.z * v.z;
  return {
    x: ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
    y: iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
    z: iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x,
  };
}

export function normalizeQuat(q: Quat): Quat {
  const length = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };
}

export function easeQuat(from: Quat, to: Quat, amount: number): Quat {
  const sameHemisphere = from.x * to.x + from.y * to.y + from.z * to.z + from.w * to.w >= 0;
  const sign = sameHemisphere ? 1 : -1;
  return normalizeQuat({
    x: from.x + (to.x * sign - from.x) * amount,
    y: from.y + (to.y * sign - from.y) * amount,
    z: from.z + (to.z * sign - from.z) * amount,
    w: from.w + (to.w * sign - from.w) * amount,
  });
}

export function quatFromDeviceOrientation(alphaDeg: number, betaDeg: number, gammaDeg: number, screenAngleDeg = 0): Quat {
  const halfX = (betaDeg * DEG) / 2;
  const halfY = (alphaDeg * DEG) / 2;
  const halfZ = (-gammaDeg * DEG) / 2;
  const c1 = Math.cos(halfX);
  const c2 = Math.cos(halfY);
  const c3 = Math.cos(halfZ);
  const s1 = Math.sin(halfX);
  const s2 = Math.sin(halfY);
  const s3 = Math.sin(halfZ);
  const device: Quat = {
    x: s1 * c2 * c3 + c1 * s2 * s3,
    y: c1 * s2 * c3 - s1 * c2 * s3,
    z: c1 * c2 * s3 - s1 * s2 * c3,
    w: c1 * c2 * c3 + s1 * s2 * s3,
  };
  const lookingOutTheBack = multiplyQuat(device, BACK_OF_DEVICE);
  return multiplyQuat(lookingOutTheBack, quatFromAxisAngle({ x: 0, y: 0, z: 1 }, -screenAngleDeg * DEG));
}

export function quatFromYawPitch(yawDeg: number, pitchDeg: number): Quat {
  return quatFromDeviceOrientation(yawDeg, 90 + pitchDeg, 0, 0);
}

export function cameraFromQuat(q: Quat, position: Vec3 = { x: 0, y: EYE_HEIGHT_M, z: 0 }): ArCamera {
  return {
    position: { ...position },
    right: rotateVec(q, { x: 1, y: 0, z: 0 }),
    up: rotateVec(q, { x: 0, y: 1, z: 0 }),
    forward: rotateVec(q, { x: 0, y: 0, z: -1 }),
  };
}

export function floorForward(camera: ArCamera): FloorDirection {
  const lookingDown = Math.hypot(camera.forward.x, camera.forward.z) < 0.2;
  const source = lookingDown ? camera.up : camera.forward;
  const length = Math.hypot(source.x, source.z) || 1;
  return { x: source.x / length, z: source.z / length };
}

export function floorRight(camera: ArCamera): FloorDirection {
  const forward = floorForward(camera);
  return { x: -forward.z, z: forward.x };
}

export function yawOf(camera: ArCamera): number {
  const forward = floorForward(camera);
  return Math.atan2(-forward.x, -forward.z) / DEG;
}

export function pitchOf(camera: ArCamera): number {
  return Math.asin(Math.max(-1, Math.min(1, camera.forward.y))) / DEG;
}

export function focalForViewport(width: number, height: number, videoWidth?: number, videoHeight?: number): number {
  const halfFov = Math.tan((CAMERA_LONG_SIDE_FOV_DEG * DEG) / 2);
  if (videoWidth && videoHeight) {
    const coverScale = Math.max(width / videoWidth, height / videoHeight);
    return ((Math.max(videoWidth, videoHeight) / 2) / halfFov) * coverScale;
  }
  return (Math.max(width, height) / 2) / halfFov;
}

export function projectToScreen(point: Vec3, camera: ArCamera, viewport: Viewport): ScreenPoint | null {
  const dx = point.x - camera.position.x;
  const dy = point.y - camera.position.y;
  const dz = point.z - camera.position.z;
  const depth = dx * camera.forward.x + dy * camera.forward.y + dz * camera.forward.z;
  if (depth < NEAR_PLANE_M) return null;
  const across = dx * camera.right.x + dy * camera.right.y + dz * camera.right.z;
  const upward = dx * camera.up.x + dy * camera.up.y + dz * camera.up.z;
  const pixelsPerMeter = viewport.focal / depth;
  return {
    x: viewport.width / 2 + across * pixelsPerMeter,
    y: viewport.height / 2 - upward * pixelsPerMeter,
    depth,
    pixelsPerMeter,
  };
}

export interface EdgeMarker {
  onScreen: boolean;
  x: number;
  y: number;
  angle: number;
}

export function edgeMarker(point: Vec3, camera: ArCamera, viewport: Viewport, inset: number): EdgeMarker {
  const projected = projectToScreen(point, camera, viewport);
  const inView = (p: ScreenPoint) => p.x >= 0 && p.x <= viewport.width && p.y >= 0 && p.y <= viewport.height;
  if (projected && inView(projected)) return { onScreen: true, x: projected.x, y: projected.y, angle: 0 };
  const dx = point.x - camera.position.x;
  const dy = point.y - camera.position.y;
  const dz = point.z - camera.position.z;
  let across = dx * camera.right.x + dy * camera.right.y + dz * camera.right.z;
  let down = -(dx * camera.up.x + dy * camera.up.y + dz * camera.up.z);
  if (Math.hypot(across, down) < 1e-6) {
    across = 0;
    down = 1;
  }
  const halfWidth = viewport.width / 2 - inset;
  const halfHeight = viewport.height / 2 - inset;
  const scale = Math.min(halfWidth / Math.max(Math.abs(across), 1e-9), halfHeight / Math.max(Math.abs(down), 1e-9));
  return {
    onScreen: false,
    x: viewport.width / 2 + across * scale,
    y: viewport.height / 2 + down * scale,
    angle: Math.atan2(down, across),
  };
}

export interface RadarDot {
  x: number;
  y: number;
  inRange: boolean;
}

export function radarDot(point: FloorDirection, player: FloorDirection, camera: ArCamera, rangeMeters: number): RadarDot {
  const forward = floorForward(camera);
  const right = floorRight(camera);
  const relX = point.x - player.x;
  const relZ = point.z - player.z;
  let x = (relX * right.x + relZ * right.z) / rangeMeters;
  let y = -(relX * forward.x + relZ * forward.z) / rangeMeters;
  const length = Math.hypot(x, y);
  if (length > 1) {
    x /= length;
    y /= length;
  }
  return { x, y, inRange: length <= 1 };
}
