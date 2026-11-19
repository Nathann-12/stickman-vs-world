import { StickmanPose } from "./rig";
import { clamp, clamp01, lerp, Vec2 } from "./ik";

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
 * Evaluates a dynamic moving floor surface `floorYAt(x, t)` (e.g. an oscillating AC sine wave
 * or tilting bridge) and returns exact foot anchor `(x, y)` plus surface tangent `slopeRad`!
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

/** Central-difference velocity, acceleration (for automatic skid braking!), & facing calculator. */
export function computeKinematics(
  posAt: (timeSec: number) => Vec2,
  t: number,
  defaultFacing: 1 | -1 = 1
): { x: number; y: number; vx: number; vy: number; ax: number; speed: number; facing: 1 | -1 } {
  const dt = 0.025;
  const p0 = posAt(Math.max(0, t - dt));
  const p1 = posAt(t);
  const p2 = posAt(t + dt);
  const vx = (p2.x - p0.x) / (2 * dt);
  const vy = (p2.y - p0.y) / (2 * dt);
  const ax = (p2.x - 2 * p1.x + p0.x) / (dt * dt);
  const speed = Math.hypot(vx, vy);
  const facing: 1 | -1 = Math.abs(vx) > 25 ? (vx >= 0 ? 1 : -1) : defaultFacing;
  return { x: p1.x, y: p1.y, vx, vy, ax, speed, facing };
}

export type StickmanEmotion = "neutral" | "curious" | "shocked" | "determined" | "celebrate";
export type StickmanAction = "none" | "slash" | "kick" | "victory" | "brace" | "push";

/**
 * Generates an organic, physics- & acting-driven StickmanPose:
 * - Grounded moving -> speed-coupled walk/run + automatic skid-braking lean on hard stops!
 * - Airborne -> rising knee tuck + vertical stretch vs. falling landing reach
 * - Emotions work BOTH while idle AND while moving/jumping (e.g. panic sprint, joy jump!)
 * - Supports sustained `crouch` (0..1) and floor-level `leftHandWorld`/`rightHandWorld` pickup!
 */
export function synthesizePhysicsPose(opts: {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax?: number;
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
  /** Optional dynamic surface slope (from evalSurfaceAnchor) for wave/ramp surfing */
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

  // Auto-bend slightly if either hand actively reaches near the floor (`y - rootY > -28`)
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
  let headTilt = beatPulse * 0.07;
  if (lookTarget) {
    const dx = (lookTarget.x - x) * facing;
    const dy = lookTarget.y - (y - (145 - crouchAmt * 32));
    headTilt = clamp(Math.atan2(dy, Math.max(40, Math.abs(dx))) * 0.45, -0.45, 0.45);
  }
  if (headShake > 0.01) {
    headTilt += Math.sin(t * 36) * 0.28 * headShake;
  }

  const compress = clamp01(squash + anticipation * 0.75);
  let hipOffset: Vec2 = { x: 0, y: -74 + beatPulse * 5 + compress * 22 + crouchAmt * 34 };
  let torsoLean = clamp((vx * facing) / 750, -0.35, 0.72) + anticipation * 0.26 + crouchAmt * 0.42;
  let torsoCurve = 6 + clamp((vx * facing) / 140, -6, 10);
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

    // Mid-air emotional acting (celebration jump, panic flail, determined dive!)
    if (emotion === "celebrate") {
      leftHand = { x: -36, y: -154 };
      rightHand = { x: 42, y: -158 };
      torsoLean = -0.08;
    } else if (emotion === "shocked") {
      const flail = Math.sin(t * 28) * 14;
      torsoLean = -0.35;
      leftHand = { x: -46, y: -136 + flail };
      rightHand = { x: 46, y: -136 - flail };
    } else if (emotion === "determined") {
      torsoLean = 0.48;
      leftHand = { x: -34, y: -102 };
      rightHand = { x: 52, y: -96 };
    }
  } else if (Math.abs(vx) > 35) {
    // Check for strong horizontal braking -> automatic Alan-Becker heel-plant skid!
    const isSkidding = vx * ax < -22000 && Math.abs(vx) > 75 && crouchAmt < 0.3;
    if (isSkidding) {
      hipOffset = { x: -12, y: -56 };
      torsoLean = -0.36;
      torsoCurve = -8;
      headTilt += 0.16;
      leftFoot = { x: -24, y: 0 };
      rightFoot = { x: 42, y: 0 };
      leftHand = { x: -44, y: -86 };
      rightHand = { x: 28, y: -112 };
      scaleX = 1.06;
      scaleY = 0.94;
    } else {
      const runBlend = clamp01((Math.abs(vx) - 80) / 300);
      const phase = t * lerp(9.5, 19.0, runBlend);
      const stride = lerp(26, 52, runBlend);
      const lift = lerp(12, 30, runBlend);
      const bob = Math.abs(Math.sin(phase)) * lerp(5, 11, runBlend);

      hipOffset = { x: lerp(2, 8, runBlend), y: -72 + runBlend * 8 - bob + crouchAmt * 22 };
      torsoLean = lerp(0.18, 0.68, runBlend) + crouchAmt * 0.2;
      torsoCurve = lerp(5, 11, runBlend);
      leftFoot = { x: Math.sin(phase) * stride - 4, y: Math.min(0, -Math.cos(phase) * lift) };
      rightFoot = { x: Math.sin(phase + Math.PI) * stride - 4, y: Math.min(0, -Math.cos(phase + Math.PI) * lift) };
      leftHand = { x: Math.sin(phase + Math.PI) * stride * 0.85, y: -88 - bob + crouchAmt * 18 };
      rightHand = { x: Math.sin(phase) * stride * 0.85, y: -88 - bob + crouchAmt * 18 };

      // Mid-run emotional acting (panic-flail sprint, heroic charge, joy skip!)
      if (emotion === "shocked") {
        const flail = Math.sin(t * 26) * 18;
        torsoLean = 0.22;
        headTilt -= 0.18;
        leftHand = { x: -34 + flail * 0.4, y: -136 + flail };
        rightHand = { x: 38 - flail * 0.4, y: -138 - flail };
      } else if (emotion === "determined") {
        torsoLean = lerp(0.36, 0.82, runBlend);
        leftHand = { x: -46, y: -84 - bob };
        rightHand = { x: 46, y: -88 - bob };
      } else if (emotion === "celebrate") {
        const pump = Math.sin(phase) * 14;
        torsoLean = 0.08;
        leftHand = { x: -28, y: -144 + pump };
        rightHand = { x: 34, y: -146 - pump };
      }
    }
  } else {
    const sway = Math.sin(t * Math.PI * 2) * 3.5;
    hipOffset = { x: sway * 0.5, y: -72 + beatPulse * 5 + compress * 22 + crouchAmt * 34 };
    torsoLean = 0.08 + sway * 0.012 + anticipation * 0.25 + crouchAmt * 0.42;
    leftFoot = { x: -22 - crouchAmt * 14, y: 0 };
    rightFoot = { x: 24 + crouchAmt * 14, y: 0 };
    leftHand = { x: -26 - sway * 0.5, y: -82 + beatPulse * 4 + crouchAmt * 28 };
    rightHand = { x: 32 + sway * 0.5, y: -84 + beatPulse * 4 + crouchAmt * 28 };

    if (emotion === "curious") {
      torsoLean = 0.24 + crouchAmt * 0.3;
      torsoCurve = 10;
      rightHand = { x: 22, y: -116 + crouchAmt * 28 };
      leftHand = { x: -20, y: -78 + crouchAmt * 24 };
    } else if (emotion === "shocked") {
      torsoLean = -0.32;
      torsoCurve = -8;
      hipOffset.y -= 8;
      leftHand = { x: -38, y: -130 };
      rightHand = { x: 44, y: -128 };
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

  // 4. Combat & Interactive Action overlays
  if (action === "slash") {
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

  // 5. Dual World-Space Hand IK Locks (now reaches ALL THE WAY to floor level y = 0!)
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
 * Removes joint pops across path corners while preserving crisp martial-arts snap.
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

  for (let i = 0; i < offsets.length; i++) {
    const p = poseFn(Math.max(0, t + offsets[i] * windowSec));
    const w = weights[i];
    const fs = p.facing === center.facing ? 1 : -1;
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
    scaleX,
    scaleY,
    bodyRotation,
  };
}
