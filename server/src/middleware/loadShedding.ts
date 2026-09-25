
import { Request, Response, NextFunction } from 'express';
import { monitorEventLoopDelay } from 'perf_hooks';
import { getEncodeQueueDepth, getEncodeSlotsInUse } from '../services/collageProcessor';

const lagMonitor = monitorEventLoopDelay({ resolution: 20 });
lagMonitor.enable();

const MAX_LAG_MS         = Number(process.env.LOAD_MAX_LAG_MS         || 500);
const MAX_RSS_MB         = Number(process.env.LOAD_MAX_RSS_MB         || 800);
const MAX_QUEUE_DEPTH    = Number(process.env.LOAD_MAX_QUEUE_DEPTH    || 10);
const RETRY_AFTER_SECS   = Number(process.env.LOAD_RETRY_AFTER_SECS   || 30);

export interface LoadSnapshot {
  eventLoopLagP99Ms: number;
  eventLoopLagMeanMs: number;
  memoryRssMb: number;
  memoryCapMb: number;
  encodeSlotsInUse: number;
  encodeQueueDepth: number;
  circuitOpen: boolean;
  reason: string | null;
}

export function getLoadSnapshot(): LoadSnapshot {
  const meanMs = lagMonitor.mean / 1e6;
  const p99Ms  = lagMonitor.percentile(99) / 1e6;
  const rssMb  = process.memoryUsage().rss / (1024 * 1024);
  const queueDepth = getEncodeQueueDepth();
  const slotsInUse = getEncodeSlotsInUse();

  let reason: string | null = null;
  if (meanMs > MAX_LAG_MS)             reason = `event_loop_lag_${meanMs.toFixed(0)}ms`;
  else if (rssMb > MAX_RSS_MB)         reason = `memory_${rssMb.toFixed(0)}mb`;
  else if (queueDepth >= MAX_QUEUE_DEPTH) reason = `encode_queue_${queueDepth}`;

  return {
    eventLoopLagP99Ms: Math.round(p99Ms),
    eventLoopLagMeanMs: Math.round(meanMs),
    memoryRssMb: Math.round(rssMb),
    memoryCapMb: MAX_RSS_MB,
    encodeSlotsInUse: slotsInUse,
    encodeQueueDepth: queueDepth,
    circuitOpen: reason !== null,
    reason,
  };
}

export function loadShed(req: Request, res: Response, next: NextFunction): void {
  const snap = getLoadSnapshot();
  if (snap.circuitOpen) {
    res.set('Retry-After', String(RETRY_AFTER_SECS));
    res.status(503).json({
      error: 'service_busy',
      reason: snap.reason,
      retry_after_seconds: RETRY_AFTER_SECS,
    });
    return;
  }
  next();
}
