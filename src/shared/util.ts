import { ACTIVE_WINDOW_HOURS, RECENCY_DECAY_HOURS } from "./constants.js";
import type { SegmentSample } from "./types.js";

export const MS_IN_SECOND = 1000;
export const SECONDS_IN_HOUR = 3600;
const HOURS_TO_MS = 60 * 60 * 1000;

export function now(): number {
  return Date.now();
}

export function domainFromUrl(targetUrl: string): string {
  try {
    const { hostname } = new URL(targetUrl);
    return hostname.replace(/^www\./, "") || targetUrl;
  } catch {
    return targetUrl;
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function pruneSegments(
  segments: SegmentSample[],
  horizonHours = RECENCY_DECAY_HOURS,
): SegmentSample[] {
  const cutoff = now() - horizonHours * HOURS_TO_MS;
  return segments.filter((segment) => segment.timestamp >= cutoff);
}

export function sumSegmentsWithinHours(
  segments: SegmentSample[],
  windowHours = ACTIVE_WINDOW_HOURS,
): {
  totalSeconds: number;
  visitCount: number;
} {
  const cutoff = now() - windowHours * HOURS_TO_MS;
  let totalSeconds = 0;
  let visitCount = 0;
  for (const segment of segments) {
    if (segment.timestamp >= cutoff) {
      totalSeconds += segment.duration;
      visitCount += 1;
    }
  }
  return { totalSeconds, visitCount };
}

export function recencyMultiplier(lastActivatedAt: number): number {
  const hoursSince = (now() - lastActivatedAt) / HOURS_TO_MS;
  if (hoursSince <= 0) {
    return 1;
  }
  if (hoursSince >= RECENCY_DECAY_HOURS) {
    return 0;
  }
  return 1 - hoursSince / RECENCY_DECAY_HOURS;
}
