export type Vec2 = { x: number; y: number };

export const vec = (x: number, y: number): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const len = (a: Vec2): number => Math.hypot(a.x, a.y);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));
export const clamp01 = (v: number): number => clamp(v, 0, 1);

export const smoothstep = (t: number): number => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};

export const easeOutBack = (t: number): number => {
  const c = clamp01(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(c - 1, 3) + c1 * Math.pow(c - 1, 2);
};

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);

export const easeInCubic = (t: number): number => {
  const c = clamp01(t);
  return c * c * c;
};

export const easeInOutCubic = (t: number): number => {
  const c = clamp01(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};

/** Snappy anime-style burst curve */
export const easeSnap = (t: number): number => {
  const c = clamp01(t);
  return 1 - Math.pow(1 - c, 4.5);
};

export const lerpVec = (a: Vec2, b: Vec2, t: number): Vec2 => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
});

export type HitStop = { at: number; duration: number };

/**
 * Warps real clock time `t` into `animT` by inserting freeze-frames at each HitStop.
 * Each stop's `at` is specified in `animT` coordinates for intuitive choreography.
 */
export function applyHitStops(
  t: number,
  stops: HitStop[]
): { animT: number; inHitStop: boolean; hitStopProgress: number } {
  let shifted = t;
  for (const s of stops) {
    if (shifted >= s.at && shifted < s.at + s.duration) {
      return {
        animT: s.at,
        inHitStop: true,
        hitStopProgress: (shifted - s.at) / s.duration,
      };
    }
    if (shifted >= s.at + s.duration) {
      shifted -= s.duration;
    }
  }
  return { animT: shifted, inHitStop: false, hitStopProgress: 0 };
}

/**
 * Exact inverse of applyHitStops: converts an `animT` event timestamp into
 * real timeline seconds `t` so Audio cues and camera shakes NEVER desync!
 */
export function realTimeOf(animEventT: number, stops: HitStop[]): number {
  let realT = animEventT;
  for (const s of stops) {
    if (animEventT > s.at) {
      realT += s.duration;
    }
  }
  return realT;
}

/**
 * Analytic 2-bone Inverse Kinematics solver (clamped against NaN).
 * In SVG Y-down space: kneeBend = facing === 1 ? -1 : 1; elbowBend = facing === 1 ? 1 : -1.
 */
export function solveTwoBoneIK(
  root: Vec2,
  target: Vec2,
  len1: number,
  len2: number,
  bendDir: 1 | -1
): { mid: Vec2; end: Vec2 } {
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const rawDist = Math.hypot(dx, dy);
  const maxReach = len1 + len2 - 0.001;
  const minReach = Math.abs(len1 - len2) + 0.001;
  const dist = clamp(rawDist, minReach, maxReach);

  const baseAngle = Math.atan2(dy, dx);
  const cosAngle = clamp(
    (len1 * len1 + dist * dist - len2 * len2) / (2 * len1 * dist),
    -1,
    1
  );
  const bendAngle = Math.acos(cosAngle);
  const jointAngle = baseAngle + bendDir * bendAngle;

  const mid: Vec2 = {
    x: root.x + Math.cos(jointAngle) * len1,
    y: root.y + Math.sin(jointAngle) * len1,
  };

  const end: Vec2 =
    rawDist > maxReach
      ? {
          x: root.x + Math.cos(baseAngle) * maxReach,
          y: root.y + Math.sin(baseAngle) * maxReach,
        }
      : target;

  return { mid, end };
}

/** Deterministic pseudo-random in [0, 1) — safe for multi-threaded Remotion renders. */
export function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export type ShakeBurst = { at: number; amp: number; decay?: number };

/** Trauma-decay camera shake helper — crisp impact punch without nausea. */
export function computeCameraShake(t: number, bursts: ShakeBurst[]): Vec2 {
  let sx = 0;
  let sy = 0;
  for (const b of bursts) {
    const dt = t - b.at;
    if (dt >= 0 && dt < 0.7) {
      const env = b.amp * Math.exp(-dt * (b.decay ?? 11));
      sx += Math.sin(dt * 74) * env;
      sy += Math.cos(dt * 89) * env * 0.82;
    }
  }
  return { x: sx, y: sy };
}

/**
 * Damped elastic spring impulse in [-1, 1] after `hitAt`.
 * Use on touched symbols, struck rivals, plucked strings, or landed platforms so
 * every prop reacts with physical cartoon elasticity.
 */
export function springImpulse(
  t: number,
  hitAt: number,
  decay = 9,
  freq = 34
): number {
  const dt = t - hitAt;
  if (dt < 0 || dt > 1.2) return 0;
  return Math.exp(-dt * decay) * Math.sin(dt * freq);
}

/**
 * Volume-preserving elastic squash-and-stretch `{ sx, sy }` after a poke/spawn/hit.
 */
export function elasticScale(
  t: number,
  hitAt: number,
  amp = 0.24,
  decay = 10,
  freq = 28
): { sx: number; sy: number } {
  const s = springImpulse(t, hitAt, decay, freq) * amp;
  return { sx: 1 + s, sy: 1 / Math.max(0.55, 1 + s) };
}

export type RecoilHit = { at: number; dx: number; dy: number; decay?: number };

/**
 * Directional knockback & elastic return vector for characters or struck props.
 */
export function evalRecoilOffset(t: number, hits: RecoilHit[]): Vec2 {
  let x = 0;
  let y = 0;
  for (const h of hits) {
    const dt = t - h.at;
    if (dt >= 0 && dt < 0.9) {
      const env = Math.min(1, dt / 0.045) * Math.exp(-dt * (h.decay ?? 7.5));
      x += h.dx * env;
      y += h.dy * env;
    }
  }
  return { x, y };
}

/**
 * Evaluates a real ballistic throw/drop arc between `from` and `to` with gravity lift & rotation.
 * Keeps props physically continuous (carried -> thrown -> bounced -> settled) with ZERO teleports!
 */
export function evalBallisticArc(
  from: Vec2,
  to: Vec2,
  startT: number,
  endT: number,
  t: number,
  arcHeight = 160,
  spinDeg = 360
): { x: number; y: number; rotDeg: number; progress: number } {
  const u = clamp01((t - startT) / Math.max(0.0001, endT - startT));
  const lift = 4 * u * (1 - u) * arcHeight;
  return {
    x: lerp(from.x, to.x, u),
    y: lerp(from.y, to.y, u) - lift,
    rotDeg: u * spinDeg,
    progress: u,
  };
}

/**
 * Evaluates decaying multi-bounce settling height (px upward) after a dropped/thrown prop lands at `landT`.
 */
export function evalPropBounce(
  t: number,
  landT: number,
  firstBouncePx = 42,
  firstDurSec = 0.28,
  bounces = 3
): number {
  const dt = t - landT;
  if (dt <= 0) return 0;
  let elapsed = 0;
  let h = firstBouncePx;
  let dur = firstDurSec;
  for (let i = 0; i < bounces; i++) {
    if (dt >= elapsed && dt < elapsed + dur) {
      const u = (dt - elapsed) / dur;
      return Math.sin(u * Math.PI) * h;
    }
    elapsed += dur;
    h *= 0.45;
    dur *= 0.72;
  }
  return 0;
}

/** Standard stickman contact reach distances (px) so strikes and grabs NEVER air-punch! */
export const CONTACT_REACH = {
  POKE: 68,
  PUNCH: 66,
  KICK: 84,
  PUSH: 62,
  GRAB: 58,
  SLASH_BASE: 70,
} as const;

/**
 * Computes exact attacker/actor root `x` so a hand/foot connects flush on `targetX` at contact frame.
 */
export function computeContactX(
  targetX: number,
  attackerFacing: 1 | -1,
  reachPx: number,
  targetHalfWidth = 0
): number {
  return targetX - attackerFacing * (reachPx + targetHalfWidth);
}
