import { StickmanPose } from "./rig";
import { clamp, clamp01, lerp, smoothstep, Vec2 } from "./ik";

export type KeyPoint = {
  t: number;
  x: number;
  y: number;
  ease?: (u: number) => number;
};

export type HopArc = [startSec: number, endSec: number, peakHeightPx: number];

/** Continuous piecewise world-space trajectory evaluator — zero position teleports. */
export function evalPath(points: KeyPoint[], t: number): Vec2 {
  if (t <= points[0].t) return { x: points[0].x, y: points[0].y };
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (t >= a.t && t <= b.t) {
      const u = clamp01((t - a.t) / Math.max(0.0001, b.t - a.t));
      const e = b.ease ? b.ease(u) : u;
      return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e) };
    }
  }
  const last = points[points.length - 1];
  return { x: last.x, y: last.y };
}

/**
 * Exact O(K) monotonic horizontal ground distance traveled along a KeyPoint path.
 * Drives ground-locked footsteps so planted feet NEVER slide across the floor!
 */
export function evalGroundDistance(points: KeyPoint[], t: number): number {
  if (t <= points[0].t) return 0;
  let dist = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (t >= b.t) {
      dist += Math.abs(b.x - a.x);
    } else {
      const u = clamp01((t - a.t) / Math.max(0.0001, b.t - a.t));
      const e = b.ease ? b.ease(u) : u;
      dist += Math.abs(lerp(a.x, b.x, e) - a.x);
      return dist;
    }
  }
  return dist;
}

/** Fallback numerical ground-distance integrator when raw `posAt` is passed without KeyPoints. */
function integrateGroundDistance(posAt: (timeSec: number) => Vec2, t: number): number {
  if (t <= 0) return 0;
  const step = 0.08;
  let dist = 0;
  let prevX = posAt(0).x;
  let s = step;
  while (s < t) {
    const curX = posAt(s).x;
    dist += Math.abs(curX - prevX);
    prevX = curX;
    s += step;
  }
  dist += Math.abs(posAt(t).x - prevX);
  return dist;
}

/** Evaluates parabolic vertical jump lift from a list of [start, end, height] arcs. */
export function evalHopArcs(arcs: HopArc[], t: number): number {
  let h = 0;
  for (const [s, e, peak] of arcs) {
    if (t >= s && t <= e) {
      h = Math.max(h, Math.sin(((t - s) / Math.max(0.0001, e - s)) * Math.PI) * peak);
    }
  }
  return h;
}

/**
 * Evaluates a dynamic moving floor surface `floorYAt(x, t)` (e.g. a seesaw, wave, or ramp)
 * and returns exact foot anchor `(x, y)` plus surface tangent `slopeRad`.
 */
export function evalSurfaceAnchor(
  x: number,
  t: number,
  floorYAt: (wx: number, timeSec: number) => number
): { x: number; y: number; slopeRad: number } {
  const dx = 4;
  const y0 = floorYAt(x - dx, t);
  const y = floorYAt(x, t);
  const y1 = floorYAt(x + dx, t);
  const slopeRad = Math.atan2(y1 - y0, dx * 2);
  return { x, y, slopeRad };
}

/** Evaluates decaying impulse pulses (for landing squash, pre-jump crouch, or hit recoil). */
export function evalDecayPulses(
  times: number[],
  t: number,
  durationSec = 0.24,
  mode: "after" | "before" = "after"
): number {
  let v = 0;
  for (const ts of times) {
    const dt = mode === "after" ? t - ts : ts - t;
    if (dt >= 0 && dt < durationSec) {
      const u = dt / durationSec;
      v = Math.max(v, Math.sin(u * Math.PI) * (1 - u));
    }
  }
  return v;
}

/**
 * Central-difference velocity, acceleration, facing, AND exact monotonic `walkDist`
 * for zero-foot-slide ground-locked footsteps!
 */
export function computeKinematics(
  posAt: (timeSec: number) => Vec2,
  t: number,
  defaultFacing: 1 | -1 = 1,
  pathPoints?: KeyPoint[]
): {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  speed: number;
  facing: 1 | -1;
  walkDist: number;
} {
  const dt = 0.025;
  const p0 = posAt(Math.max(0, t - dt));
  const p1 = posAt(t);
  const p2 = posAt(t + dt);
  const vx = (p2.x - p0.x) / (2 * dt);
  const vy = (p2.y - p0.y) / (2 * dt);
  const ax = (p2.x - 2 * p1.x + p0.x) / (dt * dt);
  const speed = Math.hypot(vx, vy);
  const facing: 1 | -1 = Math.abs(vx) > 12 ? (vx >= 0 ? 1 : -1) : defaultFacing;
  const walkDist = pathPoints ? evalGroundDistance(pathPoints, t) : integrateGroundDistance(posAt, t);
  return { x: p1.x, y: p1.y, vx, vy, ax, speed, facing, walkDist };
}

/** Expressive character emotions usable while idle, walking, running, OR airborne! */
export type StickmanEmotion =
  | "neutral"
  | "curious"
  | "shocked"
  | "determined"
  | "celebrate"
  | "confused"
  | "exhausted"
  | "smug"
  | "panicked";

/** Rich Alan-Becker silent-film pantomime & physical action library! */
export type StickmanAction =
  | "none"
  | "scratchHead"
  | "shrug"
  | "point"
  | "tiptoe"
  | "carry"
  | "throwWindup"
  | "throwRelease"
  | "stumble"
  | "dustHands"
  | "wipeBrow"
  | "slash"
  | "kick"
  | "victory"
  | "brace"
  | "push";

/**
 * Evaluates a true ground-locked 2-phase (Stance + Swing) foot target from monotonic `walkDist`.
 * During stance (`0 <= c < 1`), localX moves linearly `+halfStep -> -halfStep` at `y = 0`,
 * cancelling body motion 1:1 so the planted foot stays GLUED to the exact floor pixel!
 */
function evalPlantedFoot(
  cycle: number,
  halfStep: number,
  swingExtend: number,
  liftPx: number
): Vec2 {
  const c = ((cycle % 2) + 2) % 2;
  if (c < 1) {
    // STANCE PHASE: Foot firmly planted on floor (y = 0), sliding backward at exact -vx!
    return { x: lerp(halfStep, -halfStep, c), y: 0 };
  }
  // SWING PHASE: Foot peels cleanly off floor, arcs smoothly forward, plants ahead!
  const u = c - 1;
  const xBase = lerp(-halfStep, halfStep, smoothstep(u));
  const xExtra = Math.sin(u * Math.PI) * swingExtend;
  return {
    x: xBase + xExtra * 0.35,
    y: -Math.sin(u * Math.PI) * liftPx,
  };
}

/**
 * Generates an organic, physics- & pantomime-driven StickmanPose:
 * - Grounded moving -> ZERO-SLIDE ground-locked footsteps (`walkDist`), smooth walk->sprint transition,
 *   delicate ground-locked `tiptoe` sneak, and sprint-only heel-plant skidding (never skids on casual walks!)
 * - Airborne -> rising knee tuck + vertical stretch vs. falling landing reach
 * - Expressive silent-film pantomime (`scratchHead`, `shrug`, `point`, `stumble`, `wipeBrow`, `dustHands`, `throwWindup`)
 * - Dual world-space hand locks (`leftHandWorld`, `rightHandWorld`) reaching all the way to floor level!
 */
export function synthesizePhysicsPose(opts: {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax?: number;
  /** Exact monotonic horizontal ground distance from `computeKinematics` (guarantees zero foot-slide!) */
  walkDist?: number;
  facing: 1 | -1;
  airborne: boolean;
  t: number;
  beatPulse?: number;
  lookTarget?: Vec2 | null;
  leftHandWorld?: Vec2 | null;
  rightHandWorld?: Vec2 | null;
  /** Sustained crouch/kneel 0..1 (e.g. picking up floor objects, stealth ducking) */
  crouch?: number;
  anticipation?: number;
  squash?: number;
  recoil?: number;
  headShake?: number;
  bodyRotation?: number;
  /** Optional dynamic surface slope (from evalSurfaceAnchor) for wave/ramp/seesaw surfing */
  surfaceSlopeRad?: number;
  emotion?: StickmanEmotion;
  action?: StickmanAction;
  actionProgress?: number;
}): StickmanPose {
  const {
    x,
    y,
    vx,
    vy,
    ax = 0,
    walkDist,
    facing,
    airborne,
    t,
    beatPulse = 0,
    lookTarget = null,
    leftHandWorld = null,
    rightHandWorld = null,
    crouch = 0,
    anticipation = 0,
    squash = 0,
    recoil = 0,
    headShake = 0,
    bodyRotation = 0,
    surfaceSlopeRad = 0,
    emotion = "neutral",
    action = "none",
    actionProgress = 0,
  } = opts;

  // Auto-bend slightly if either hand actively reaches near the floor (`y - rootY > -30`)
  let autoFloorCrouch = 0;
  if (!airborne) {
    if (rightHandWorld && rightHandWorld.y - y > -30) {
      autoFloorCrouch = Math.max(autoFloorCrouch, clamp01((rightHandWorld.y - y + 30) / 36) * 0.65);
    }
    if (leftHandWorld && leftHandWorld.y - y > -30) {
      autoFloorCrouch = Math.max(autoFloorCrouch, clamp01((leftHandWorld.y - y + 30) / 36) * 0.65);
    }
  }
  const crouchAmt = clamp01(Math.max(crouch, autoFloorCrouch));

  // 1. Gaze tracking + comedic head shake
  let headTilt = beatPulse * 0.06;
  if (lookTarget) {
    const dx = (lookTarget.x - x) * facing;
    const dy = lookTarget.y - (y - (145 - crouchAmt * 32));
    headTilt = clamp(Math.atan2(dy, Math.max(40, Math.abs(dx))) * 0.45, -0.45, 0.45);
  }
  if (headShake > 0.01) {
    headTilt += Math.sin(t * 36) * 0.28 * headShake;
  }

  const compress = clamp01(squash + anticipation * 0.75);
  let hipOffset: Vec2 = { x: 0, y: -74 + beatPulse * 4 + compress * 22 + crouchAmt * 34 };
  let torsoLean = clamp((vx * facing) / 820, -0.3, 0.68) + anticipation * 0.26 + crouchAmt * 0.42;
  let torsoCurve = 6 + clamp((vx * facing) / 160, -6, 10);
  let leftFoot: Vec2 = { x: -20 - crouchAmt * 14, y: 0 };
  let rightFoot: Vec2 = { x: 22 + crouchAmt * 14, y: 0 };
  let leftHand: Vec2 = { x: -24, y: -82 + beatPulse * 3 + crouchAmt * 28 };
  let rightHand: Vec2 = { x: 30, y: -86 - beatPulse * 3 + crouchAmt * 28 };
  let scaleX = 1 + compress * 0.16;
  let scaleY = 1 - compress * 0.14;

  // 2. Locomotion / Airborne / Idle base
  if (airborne) {
    const rising = vy < 0;
    const stretch = clamp(Math.abs(vy) / 1100, 0, 0.16);
    scaleX = 1 - stretch * 0.5;
    scaleY = 1 + stretch;
    hipOffset = { x: 0, y: -72 };
    torsoLean = clamp((vx * facing) / 700, -0.25, 0.45);
    torsoCurve = rising ? 12 : 4;
    leftFoot = rising ? { x: -26, y: -34 } : { x: -22, y: -14 };
    rightFoot = rising ? { x: 28, y: -18 } : { x: 24, y: -2 };
    leftHand = { x: -38, y: rising ? -132 : -118 };
    rightHand = { x: 44, y: rising ? -142 : -112 };

    if (emotion === "celebrate") {
      leftHand = { x: -36, y: -154 };
      rightHand = { x: 42, y: -158 };
      torsoLean = -0.08;
    } else if (emotion === "shocked" || emotion === "panicked") {
      const flail = Math.sin(t * 30) * 16;
      torsoLean = -0.36;
      leftHand = { x: -48, y: -138 + flail };
      rightHand = { x: 48, y: -138 - flail };
    } else if (emotion === "determined") {
      torsoLean = 0.48;
      leftHand = { x: -34, y: -102 };
      rightHand = { x: 52, y: -96 };
    }
  } else if (Math.abs(vx) > 4) {
    // Only trigger anime heel-plant skid on an EMERGENCY HARD BRAKE FROM A FULL SPRINT!
    // Never skids during casual walking, carrying objects, or tiptoe sneaking!
    const isHardSprintSkid =
      Math.abs(vx) > 290 &&
      vx * ax < -220000 &&
      crouchAmt < 0.25 &&
      action === "none";

    if (isHardSprintSkid) {
      hipOffset = { x: -12, y: -58 };
      torsoLean = -0.34;
      torsoCurve = -8;
      headTilt += 0.16;
      leftFoot = { x: -24, y: 0 };
      rightFoot = { x: 40, y: 0 };
      leftHand = { x: -44, y: -88 };
      rightHand = { x: 28, y: -112 };
      scaleX = 1.05;
      scaleY = 0.95;
    } else if (action === "tiptoe") {
      // Ground-locked delicate sneaking tiptoe: zero floor-slide, high careful knees!
      const dist = walkDist ?? Math.abs(x);
      const halfStep = 21;
      const cycle = dist / (halfStep * 2);
      const moveBlend = smoothstep(clamp01((Math.abs(vx) - 4) / 28));
      const lTarget = evalPlantedFoot(cycle, halfStep, 4, 28);
      const rTarget = evalPlantedFoot(cycle + 1, halfStep, 4, 28);
      const stepBob = Math.abs(Math.sin(cycle * Math.PI)) * 6 * moveBlend;

      hipOffset = { x: 4 * moveBlend, y: -68 + stepBob };
      torsoLean = lerp(0.18, 0.34, moveBlend);
      torsoCurve = 12;
      headTilt -= 0.12;
      leftFoot = { x: lerp(-18, lTarget.x, moveBlend), y: lTarget.y * moveBlend };
      rightFoot = { x: lerp(20, rTarget.x, moveBlend), y: rTarget.y * moveBlend };
      leftHand = { x: -16, y: -104 + Math.sin(cycle * Math.PI) * 5 * moveBlend };
      rightHand = { x: 38, y: -106 - Math.sin(cycle * Math.PI) * 5 * moveBlend };
    } else {
      // TRUE GROUND-LOCKED WALK / RUN CYCLE: planted foot stays glued to floor pixel-for-pixel!
      const dist = walkDist ?? Math.abs(x);
      const absVx = Math.abs(vx);
      const moveBlend = smoothstep(clamp01((absVx - 4) / 42));
      const runBlend = smoothstep(clamp01((absVx - 150) / 260));

      // Constant 58px step distance (halfStep = 29px) guarantees 0.00px foot slip during walks!
      const halfStep = 29;
      const cycle = dist / (halfStep * 2);
      const lift = lerp(14, 34, runBlend);
      const swingExtend = lerp(0, 22, runBlend);

      const lTarget = evalPlantedFoot(cycle, halfStep, swingExtend, lift);
      const rTarget = evalPlantedFoot(cycle + 1, halfStep, swingExtend, lift);
      const bob = Math.abs(Math.sin(cycle * Math.PI)) * lerp(4, 11, runBlend) * moveBlend;

      hipOffset = {
        x: lerp(0, lerp(2, 8, runBlend), moveBlend),
        y: -73 + runBlend * 7 - bob + crouchAmt * 22,
      };
      torsoLean = lerp(0.06, lerp(0.14, 0.64, runBlend), moveBlend) + crouchAmt * 0.2;
      torsoCurve = lerp(5, 11, runBlend);

      leftFoot = {
        x: lerp(-20 - crouchAmt * 14, lTarget.x, moveBlend),
        y: lTarget.y * moveBlend,
      };
      rightFoot = {
        x: lerp(22 + crouchAmt * 14, rTarget.x, moveBlend),
        y: rTarget.y * moveBlend,
      };

      // Arms swing smoothly in natural opposition to legs!
      const armPhase = Math.cos(cycle * Math.PI);
      const armSwing = lerp(20, 44, runBlend) * moveBlend;
      leftHand = { x: -armPhase * armSwing - 4, y: -86 - bob + crouchAmt * 18 };
      rightHand = { x: armPhase * armSwing + 6, y: -86 - bob + crouchAmt * 18 };

      if (emotion === "shocked" || emotion === "panicked") {
        const flail = Math.sin(t * 28) * 18;
        torsoLean = 0.24;
        headTilt -= 0.18;
        leftHand = { x: -34 + flail * 0.4, y: -136 + flail };
        rightHand = { x: 38 - flail * 0.4, y: -138 - flail };
      } else if (emotion === "determined") {
        torsoLean = lerp(0.28, 0.78, runBlend);
        leftHand = { x: -42, y: -84 - bob };
        rightHand = { x: 44, y: -88 - bob };
      } else if (emotion === "celebrate") {
        const pump = Math.sin(cycle * Math.PI) * 12;
        torsoLean = 0.06;
        leftHand = { x: -28, y: -144 + pump };
        rightHand = { x: 34, y: -146 - pump };
      } else if (emotion === "exhausted") {
        hipOffset.y += 10;
        torsoLean = 0.45;
        torsoCurve = 12;
        headTilt += 0.25;
        leftHand = { x: 6, y: -58 };
        rightHand = { x: 18, y: -56 };
      }
    }
  } else {
    const sway = Math.sin(t * 2.8) * 2.8;
    hipOffset = { x: sway * 0.5, y: -72 + beatPulse * 4 + compress * 22 + crouchAmt * 34 };
    torsoLean = 0.06 + sway * 0.01 + anticipation * 0.25 + crouchAmt * 0.42;
    leftFoot = { x: -22 - crouchAmt * 14, y: 0 };
    rightFoot = { x: 24 + crouchAmt * 14, y: 0 };
    leftHand = { x: -24 - sway * 0.4, y: -82 + beatPulse * 3 + crouchAmt * 28 };
    rightHand = { x: 28 + sway * 0.4, y: -84 + beatPulse * 3 + crouchAmt * 28 };

    if (emotion === "curious") {
      torsoLean = 0.24 + crouchAmt * 0.3;
      torsoCurve = 10;
      rightHand = { x: 22, y: -118 + crouchAmt * 28 };
      leftHand = { x: -20, y: -78 + crouchAmt * 24 };
    } else if (emotion === "confused") {
      torsoLean = -0.06;
      headTilt += 0.24;
      leftHand = { x: -34, y: -96 };
      rightHand = { x: 18, y: -142 };
    } else if (emotion === "shocked" || emotion === "panicked") {
      torsoLean = -0.34;
      torsoCurve = -9;
      hipOffset.y -= 8;
      leftHand = { x: -40, y: -134 };
      rightHand = { x: 46, y: -132 };
    } else if (emotion === "determined") {
      hipOffset.y += 12;
      torsoLean = 0.34;
      leftFoot = { x: -36, y: 0 };
      rightFoot = { x: 34, y: 0 };
      leftHand = { x: -18, y: -96 };
      rightHand = { x: 48, y: -92 };
    } else if (emotion === "celebrate") {
      const pump = Math.sin(t * 10) * 10;
      torsoLean = -0.05;
      leftHand = { x: -36, y: -146 + pump };
      rightHand = { x: 38, y: -148 - pump };
    } else if (emotion === "exhausted") {
      hipOffset = { x: -4, y: -58 };
      torsoLean = 0.48;
      torsoCurve = 14;
      headTilt += 0.32;
      leftFoot = { x: -26, y: 0 };
      rightFoot = { x: 26, y: 0 };
      leftHand = { x: 8, y: -56 + Math.sin(t * 4.5) * 4 };
      rightHand = { x: 24, y: -54 + Math.sin(t * 4.5) * 4 };
    } else if (emotion === "smug") {
      torsoLean = -0.16;
      torsoCurve = -6;
      headTilt -= 0.14;
      leftHand = { x: -20, y: -88 };
      rightHand = { x: 22, y: -88 };
    }
  }

  // 3. Hit Recoil overlay
  if (recoil > 0.01) {
    torsoLean -= recoil * 0.52;
    torsoCurve -= recoil * 12;
    hipOffset.x -= recoil * 14;
    leftHand = { x: -42, y: -108 };
    rightHand = { x: 20, y: -118 };
  }

  // 4. Pantomime Acting & Combat Action overlays
  if (action === "scratchHead") {
    const scratch = Math.sin(t * 14) * 5;
    torsoLean = -0.05;
    headTilt += 0.18;
    leftHand = { x: -20, y: -86 };
    rightHand = { x: 10 + scratch, y: -158 + scratch * 0.4 };
  } else if (action === "shrug") {
    const bob = Math.sin(t * 6) * 4;
    hipOffset.y += 4;
    torsoLean = -0.04;
    headTilt += 0.2;
    leftHand = { x: -44, y: -112 + bob };
    rightHand = { x: 46, y: -112 + bob };
  } else if (action === "point") {
    torsoLean = 0.22;
    torsoCurve = 8;
    leftHand = { x: -26, y: -88 };
    rightHand = { x: 68, y: -118 };
  } else if (action === "carry") {
    torsoLean = Math.abs(vx) > 20 ? torsoLean * 0.35 - 0.1 : -0.12;
    torsoCurve = -4;
    leftHand = { x: 14, y: -146 };
    rightHand = { x: 34, y: -146 };
  } else if (action === "throwWindup") {
    const p = clamp01(actionProgress);
    torsoLean = lerp(0.0, -0.42, p);
    torsoCurve = lerp(4, -10, p);
    leftHand = { x: lerp(16, 48, p), y: -108 };
    rightHand = { x: lerp(26, -54, p), y: lerp(-96, -138, p) };
  } else if (action === "throwRelease") {
    const p = clamp01(actionProgress);
    torsoLean = lerp(-0.35, 0.56, p);
    torsoCurve = lerp(-8, 12, p);
    leftHand = { x: lerp(42, -38, p), y: -96 };
    rightHand = { x: lerp(-46, 68, p), y: lerp(-136, -124, p) };
  } else if (action === "stumble") {
    const p = clamp01(actionProgress);
    hipOffset = { x: lerp(0, 18, p), y: lerp(-68, -28, p) };
    torsoLean = lerp(0.4, 1.18, p);
    torsoCurve = 12;
    leftFoot = { x: -42, y: -10 };
    rightFoot = { x: -12, y: 0 };
    leftHand = { x: 24, y: -42 };
    rightHand = { x: 56, y: -16 };
  } else if (action === "dustHands") {
    const clap = Math.sin(t * 22) * 14;
    torsoLean = -0.06;
    headTilt -= 0.08;
    leftHand = { x: 18 + clap, y: -98 };
    rightHand = { x: 24 - clap, y: -100 };
  } else if (action === "wipeBrow") {
    const wipe = Math.sin(t * 8) * 14;
    torsoLean = -0.1;
    headTilt -= 0.14;
    leftHand = { x: -24, y: -84 };
    rightHand = { x: 12 + wipe, y: -146 };
  } else if (action === "slash") {
    const p = clamp01(actionProgress);
    torsoLean = lerp(-0.15, 0.58, p);
    hipOffset.x = lerp(-10, 14, p);
    leftHand = { x: lerp(18, -40, p), y: -96 };
    rightHand = { x: lerp(-18, 68, p), y: lerp(-46, -148, p) };
  } else if (action === "brace") {
    torsoLean = 0.34;
    leftFoot = { x: -40, y: 0 };
    rightFoot = { x: 36, y: 0 };
    leftHand = { x: -26, y: -94 };
    rightHand = { x: 56, y: -102 };
  } else if (action === "push") {
    torsoLean = 0.48;
    leftFoot = { x: -42, y: 0 };
    rightFoot = { x: 30, y: 0 };
    leftHand = { x: 52, y: -96 };
    rightHand = { x: 64, y: -104 };
  } else if (action === "kick") {
    torsoLean = -0.5;
    torsoCurve = 12;
    headTilt = 0.25;
    leftFoot = { x: -30, y: -24 };
    rightFoot = { x: 84, y: -64 };
    leftHand = { x: -48, y: -94 };
    rightHand = { x: 26, y: -118 };
  } else if (action === "victory") {
    torsoLean = -0.04;
    leftHand = { x: -26, y: -86 };
    rightHand = { x: 38, y: -148 + Math.sin(t * 3.5) * 4 };
  }

  // 5. Dual World-Space Hand IK Locks (reaches all the way down to floor y = 0!)
  if (leftHandWorld) {
    leftHand = {
      x: clamp((leftHandWorld.x - x) * facing, -68, 80),
      y: clamp(leftHandWorld.y - y, -162, 4),
    };
  }
  if (rightHandWorld) {
    rightHand = {
      x: clamp((rightHandWorld.x - x) * facing, -58, 82),
      y: clamp(rightHandWorld.y - y, -162, 4),
    };
  }

  return {
    x,
    y,
    facing,
    hipOffset,
    torsoLean,
    torsoCurve,
    headTilt,
    leftFoot,
    rightFoot,
    leftHand,
    rightHand,
    scaleX,
    scaleY,
    bodyRotation: bodyRotation + surfaceSlopeRad * 0.65,
  };
}

/**
 * Tight 5-tap C¹ temporal smoother (0.035–0.045s window).
 * Removes joint pops across path corners while preserving crisp acting & martial-arts snap.
 */
export function smoothSynthesizedPose(
  poseFn: (timeSec: number) => StickmanPose,
  t: number,
  windowSec = 0.04
): StickmanPose {
  const offsets = [-1.0, -0.5, 0, 0.5, 1.0];
  const weights = [0.1, 0.22, 0.36, 0.22, 0.1];
  const center = poseFn(Math.max(0, t));

  let x = 0, y = 0, hipX = 0, hipY = 0, torsoLean = 0, torsoCurve = 0, headTilt = 0;
  let lfX = 0, lfY = 0, rfX = 0, rfY = 0, lhX = 0, lhY = 0, rhX = 0, rhY = 0;
  let scaleX = 0, scaleY = 0, bodyRotation = 0;

  let facingChanges = 0;
  for (let i = 0; i < offsets.length; i++) {
    const p = poseFn(Math.max(0, t + offsets[i] * windowSec));
    const w = weights[i];
    const fs = p.facing === center.facing ? 1 : -1;
    if (fs === -1) facingChanges += w;
    x += p.x * w;
    y += p.y * w;
    hipX += p.hipOffset.x * fs * w;
    hipY += p.hipOffset.y * w;
    torsoLean += p.torsoLean * fs * w;
    torsoCurve += p.torsoCurve * fs * w;
    headTilt += p.headTilt * fs * w;
    lfX += p.leftFoot.x * fs * w;
    lfY += p.leftFoot.y * w;
    rfX += p.rightFoot.x * fs * w;
    rfY += p.rightFoot.y * w;
    lhX += p.leftHand.x * fs * w;
    lhY += p.leftHand.y * w;
    rhX += p.rightHand.x * fs * w;
    rhY += p.rightHand.y * w;
    scaleX += (p.scaleX ?? 1) * w;
    scaleY += (p.scaleY ?? 1) * w;
    bodyRotation += (p.bodyRotation ?? 0) * w;
  }

  // Smooth cartoon turn-squash: gently narrows X across a facing flip so turns feel organic, never 1-frame snaps!
  const turnSquash = 1 - Math.min(0.45, facingChanges * 0.9);

  return {
    x,
    y,
    facing: center.facing,
    hipOffset: { x: hipX, y: hipY },
    torsoLean,
    torsoCurve,
    headTilt,
    leftFoot: { x: lfX, y: lfY },
    rightFoot: { x: rfX, y: rfY },
    leftHand: { x: lhX, y: lhY },
    rightHand: { x: rhX, y: rhY },
    scaleX: scaleX * turnSquash,
    scaleY,
    bodyRotation,
  };
}
