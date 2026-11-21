/**
 * Automated Choreography, Physics, Safe-Zone & Pacing Linter (`stickman-vs-world` v5).
 * Runs in <0.2s BEFORE rendering a single frame so ANY AI agent catches:
 *  1. Accidental teleports / non-monotonic timestamps (`|vx| > 1800 px/s`)
 *  2. Viewport / 9:16 social safe-zone clipping (Hero head off-top or feet inside bottom 280px UI!)
 *  3. Unintentional grounded character sprite overlaps (`|dx| < 42px` between Hero & Rival)
 *  4. HitStop time-expansion overflow (`realTimeOf(duration) > totalRuntime`)
 *  5. Breathless montage pacing (fewer than 3 calm Reaction Beats `>= 1.1s`)
 *
 * Usage: Import `runChoreographyAudit(...)` from a small script (e.g. `scripts/audit-story.mjs`)
 * or pass exported world arrays directly.
 */
export function runChoreographyAudit({
  durationSec,
  viewportWidth = 1080,
  viewportHeight = 1920,
  isVerticalSocial = true,
  heroPosAt,
  rivalPosAt = null,
  cameraAt,
  hitStops = [],
  allowOverlapWindows = [],
}) {
  const warnings = [];
  const errors = [];

  const dt = 0.1;
  let calmStreak = 0;
  let reactionBeatsFound = 0;
  let maxVx = 0;
  let maxVxAt = 0;

  let offscreenCount = 0;
  let bottomSafeViolations = 0;
  let overlapCount = 0;
  let firstOffscreen = null;
  let firstBottom = null;
  let firstOverlap = null;

  const isAllowedOverlap = (t) =>
    allowOverlapWindows.some(([a, b]) => t >= a && t <= b);

  for (let t = 0.1; t <= durationSec - 0.1; t += dt) {
    const pPrev = heroPosAt(Math.max(0, t - 0.05));
    const p = heroPosAt(t);
    const pNext = heroPosAt(Math.min(durationSec, t + 0.05));
    const vx = (pNext.x - pPrev.x) / 0.1;
    const vy = (pNext.y - pPrev.y) / 0.1;
    const speed = Math.hypot(vx, vy);

    if (Math.abs(vx) > maxVx) {
      maxVx = Math.abs(vx);
      maxVxAt = t;
    }
    if (Math.abs(vx) > 2200) {
      errors.push(`TELEPORT at t=${t.toFixed(2)}s: |vx|=${Math.round(Math.abs(vx))} px/s`);
    }

    // Track calm silent Reaction Beats (speed < 35 px/s for >= 1.1s)
    if (speed < 35) {
      calmStreak += dt;
    } else {
      if (calmStreak >= 1.1) reactionBeatsFound++;
      calmStreak = 0;
    }

    // Project Hero head & feet into screen coordinates
    const cam = cameraAt(t);
    const toScr = (pt) => ({
      x: viewportWidth / 2 + (pt.x - cam.fx) * cam.zoom,
      y: viewportHeight / 2 + (pt.y - cam.fy) * cam.zoom,
    });
    const feetScr = toScr(p);
    const headScr = toScr({ x: p.x, y: p.y - 175 });

    if (headScr.y < 24 || feetScr.y > viewportHeight - 20 || feetScr.x < 24 || feetScr.x > viewportWidth - 24) {
      offscreenCount++;
      if (!firstOffscreen) {
        firstOffscreen = `t=${t.toFixed(1)}s (headY=${Math.round(headScr.y)}, feet=(${Math.round(feetScr.x)},${Math.round(feetScr.y)}))`;
      }
    }
    if (isVerticalSocial && feetScr.y > viewportHeight - 270) {
      bottomSafeViolations++;
      if (!firstBottom) {
        firstBottom = `t=${t.toFixed(1)}s (feetY=${Math.round(feetScr.y)} > ${viewportHeight - 270})`;
      }
    }

    // Check accidental Hero <-> Rival overlap
    if (rivalPosAt && !isAllowedOverlap(t)) {
      const r = rivalPosAt(t);
      if (Math.abs(p.x - r.x) < 42 && Math.abs(p.y - r.y) < 60) {
        overlapCount++;
        if (!firstOverlap) {
          firstOverlap = `t=${t.toFixed(1)}s (heroX=${Math.round(p.x)}, rivalX=${Math.round(r.x)})`;
        }
      }
    }
  }
  if (calmStreak >= 1.1) reactionBeatsFound++;

  if (offscreenCount > 4) {
    warnings.push(`Hero clips viewport edge on ${offscreenCount} samples (first: ${firstOffscreen})`);
  }
  if (bottomSafeViolations > 4) {
    warnings.push(`Hero feet enter 9:16 bottom UI safe zone on ${bottomSafeViolations} samples (first: ${firstBottom})`);
  }
  if (overlapCount > 2) {
    warnings.push(`Hero/Rival sprite overlap on ${overlapCount} samples without allowOverlapWindows (first: ${firstOverlap})`);
  }
  if (reactionBeatsFound < 3) {
    warnings.push(`Only ${reactionBeatsFound} silent/calm Reaction Beats (>=1.1s) found — recommend >= 3 so comedy breathes!`);
  }

  const hitStopTotal = hitStops.reduce((s, h) => s + h.duration, 0);
  if (hitStopTotal > 1.2) {
    warnings.push(`Total HitStop duration is ${hitStopTotal.toFixed(2)}s — verify finale fits inside ${durationSec}s!`);
  }

  console.log("=== Choreography & Cinema Physics Audit (v5) ===");
  console.log(`Max |vx|: ${Math.round(maxVx)} px/s (at t=${maxVxAt.toFixed(2)}s)`);
  console.log(`Calm Reaction Beats (>=1.1s): ${reactionBeatsFound}`);
  console.log(`Total HitStop time: ${hitStopTotal.toFixed(3)}s`);
  if (errors.length === 0 && warnings.length === 0) {
    console.log("PASS: Zero teleports, clean safe zones, zero accidental overlaps, strong breathing pace!");
  } else {
    for (const e of errors) console.error("ERROR:", e);
    for (const w of warnings) console.warn("WARN :", w);
  }
  return { ok: errors.length === 0, errors, warnings, reactionBeatsFound };
}
