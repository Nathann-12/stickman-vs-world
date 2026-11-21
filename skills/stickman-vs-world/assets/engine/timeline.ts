import { HopArc, KeyPoint } from "./poseEngine";

/**
 * Auto-derives ANTICIPATION_TIMES and LANDING_TIMES directly from `path` + `hops`
 * so you NEVER forget a pre-jump crouch, landing squash, or ground dust puff when
 * tweaking timestamps!
 */
export function autoDeriveJumpTiming(
  path: KeyPoint[],
  hops: HopArc[],
  opts?: {
    minAnticipationHeightPx?: number;
    minDropHeightPx?: number;
    extraAnticipations?: number[];
    extraLandings?: number[];
  }
): { anticipationTimes: number[]; landingTimes: number[] } {
  const minH = opts?.minAnticipationHeightPx ?? 75;
  const minDrop = opts?.minDropHeightPx ?? 90;
  const antSet = new Set<number>(opts?.extraAnticipations ?? []);
  const landSet = new Set<number>(opts?.extraLandings ?? []);

  for (const [start, end, peak] of hops) {
    if (peak >= minH) antSet.add(Number(start.toFixed(3)));
    landSet.add(Number(end.toFixed(3)));
  }

  // Also detect gravity falls in KeyPoint path (large downward Y drop followed by a stop/floor)
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const cur = path[i];
    if (cur.y - prev.y >= minDrop) {
      landSet.add(Number(cur.t.toFixed(3)));
    }
  }

  return {
    anticipationTimes: Array.from(antSet).sort((a, b) => a - b),
    landingTimes: Array.from(landSet).sort((a, b) => a - b),
  };
}

/**
 * Helper to validate walk/sprint segment speeds during development or linting.
 * Flags accidental teleports (`|vx| > 1800 px/s`) or unintended crawl glitches.
 */
export function auditPathSpeeds(
  path: KeyPoint[],
  maxReasonableSpeedPxPerSec = 1800
): Array<{ segIndex: number; t0: number; t1: number; avgVx: number; avgVy: number; warning: string }> {
  const issues: Array<{
    segIndex: number;
    t0: number;
    t1: number;
    avgVx: number;
    avgVy: number;
    warning: string;
  }> = [];

  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const dt = b.t - a.t;
    if (dt <= 0) {
      issues.push({
        segIndex: i,
        t0: a.t,
        t1: b.t,
        avgVx: Infinity,
        avgVy: Infinity,
        warning: `Non-increasing timestamps (${a.t}s -> ${b.t}s)`,
      });
      continue;
    }
    const avgVx = Math.abs(b.x - a.x) / dt;
    const avgVy = Math.abs(b.y - a.y) / dt;
    if (avgVx > maxReasonableSpeedPxPerSec) {
      issues.push({
        segIndex: i,
        t0: a.t,
        t1: b.t,
        avgVx: Math.round(avgVx),
        avgVy: Math.round(avgVy),
        warning: `Possible teleport: avg |vx|=${Math.round(avgVx)} px/s (${a.x} -> ${b.x} in ${dt.toFixed(2)}s)`,
      });
    }
  }
  return issues;
}
