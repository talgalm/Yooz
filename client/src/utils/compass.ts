export interface OrientationReading {
  alpha: number | null;
  absolute: boolean;
  webkitCompassHeading?: number;
}

export function compassHeading(reading: OrientationReading, screenAngle = 0): number | null {
  let heading: number | null = null;
  if (typeof reading.webkitCompassHeading === 'number' && Number.isFinite(reading.webkitCompassHeading)) {
    heading = reading.webkitCompassHeading;
  } else if (reading.absolute && reading.alpha !== null && Number.isFinite(reading.alpha)) {
    heading = 360 - reading.alpha;
  }
  if (heading === null) return null;
  return (((heading + screenAngle) % 360) + 360) % 360;
}
