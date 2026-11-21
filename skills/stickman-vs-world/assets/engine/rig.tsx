import React from "react";
import { clamp, lerp, lerpVec, seededRandom, solveTwoBoneIK, Vec2 } from "./ik";

export type StickmanPose = {
  x: number;
  y: number;
  facing: 1 | -1;
  hipOffset: Vec2;
  torsoLean: number;
  torsoCurve: number;
  headTilt: number;
  leftFoot: Vec2;
  rightFoot: Vec2;
  leftHand: Vec2;
  rightHand: Vec2;
  scaleX?: number;
  scaleY?: number;
  bodyRotation?: number;
};

export type SolvedStickmanRig = {
  hip: Vec2;
  chestCtrl: Vec2;
  shoulder: Vec2;
  headCenter: Vec2;
  headAngleDeg: number;
  leftKnee: Vec2;
  leftFoot: Vec2;
  rightKnee: Vec2;
  rightFoot: Vec2;
  leftElbow: Vec2;
  leftHand: Vec2;
  rightElbow: Vec2;
  rightHand: Vec2;
};

export const RIG_METRICS = {
  TORSO_LEN: 58,
  HEAD_RADIUS: 20,
  UPPER_LEG: 42,
  LOWER_LEG: 42,
  UPPER_ARM: 35,
  LOWER_ARM: 34,
} as const;

export function blendPoses(a: StickmanPose, b: StickmanPose, t: number): StickmanPose {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    facing: t < 0.5 ? a.facing : b.facing,
    hipOffset: lerpVec(a.hipOffset, b.hipOffset, t),
    torsoLean: lerp(a.torsoLean, b.torsoLean, t),
    torsoCurve: lerp(a.torsoCurve, b.torsoCurve, t),
    headTilt: lerp(a.headTilt, b.headTilt, t),
    leftFoot: lerpVec(a.leftFoot, b.leftFoot, t),
    rightFoot: lerpVec(a.rightFoot, b.rightFoot, t),
    leftHand: lerpVec(a.leftHand, b.leftHand, t),
    rightHand: lerpVec(a.rightHand, b.rightHand, t),
    scaleX: lerp(a.scaleX ?? 1, b.scaleX ?? 1, t),
    scaleY: lerp(a.scaleY ?? 1, b.scaleY ?? 1, t),
    bodyRotation: lerp(a.bodyRotation ?? 0, b.bodyRotation ?? 0, t),
  };
}

/**
 * Adds velocity-driven secondary inertia (head lag, spine drag, & trailing limb drag)
 * so sudden accelerations feel organic rather than mechanical.
 */
export function applySecondaryMotion(
  poseAtNow: StickmanPose,
  poseEarlier: StickmanPose,
  dt: number,
  dragRightHand = false
): StickmanPose {
  const vx = (poseAtNow.x - poseEarlier.x) / Math.max(0.001, dt);
  const vy = (poseAtNow.y - poseEarlier.y) / Math.max(0.001, dt);
  const headDrag = clamp(-vx * 0.00016 * poseAtNow.facing, -0.2, 0.2);
  const armDragX = clamp(-vx * 0.01 * poseAtNow.facing, -14, 14);
  const armDragY = clamp(-vy * 0.01, -12, 12);
  const spineDrag = clamp(vx * 0.0035 * poseAtNow.facing, -5, 5);

  return {
    ...poseAtNow,
    headTilt: poseAtNow.headTilt + headDrag,
    torsoCurve: poseAtNow.torsoCurve + spineDrag,
    leftHand: { x: poseAtNow.leftHand.x + armDragX, y: poseAtNow.leftHand.y + armDragY },
    rightHand: dragRightHand
      ? { x: poseAtNow.rightHand.x + armDragX * 0.7, y: poseAtNow.rightHand.y + armDragY * 0.7 }
      : poseAtNow.rightHand,
  };
}

function toWorld(pose: StickmanPose, local: Vec2): Vec2 {
  const sx = pose.scaleX ?? 1;
  const sy = pose.scaleY ?? 1;
  const lx = local.x * pose.facing * sx;
  const ly = local.y * sy;
  const rot = pose.bodyRotation ?? 0;
  if (rot === 0) return { x: pose.x + lx, y: pose.y + ly };
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const pivotY = -72;
  const dy = ly - pivotY;
  return {
    x: pose.x + lx * cos - dy * sin,
    y: pose.y + pivotY + lx * sin + dy * cos,
  };
}

export function solveStickmanRig(pose: StickmanPose): SolvedStickmanRig {
  const { TORSO_LEN, HEAD_RADIUS, UPPER_LEG, LOWER_LEG, UPPER_ARM, LOWER_ARM } = RIG_METRICS;
  const hip = toWorld(pose, pose.hipOffset);

  const torsoAngle = -Math.PI / 2 + pose.torsoLean;
  const shoulderLocal: Vec2 = {
    x: pose.hipOffset.x + Math.cos(torsoAngle) * TORSO_LEN,
    y: pose.hipOffset.y + Math.sin(torsoAngle) * TORSO_LEN,
  };
  const midTorsoLocal: Vec2 = {
    x: (pose.hipOffset.x + shoulderLocal.x) / 2 + pose.torsoCurve,
    y: (pose.hipOffset.y + shoulderLocal.y) / 2,
  };

  const headAngle = torsoAngle + pose.headTilt;
  const headCenterLocal: Vec2 = {
    x: shoulderLocal.x + Math.cos(headAngle) * (HEAD_RADIUS + 6),
    y: shoulderLocal.y + Math.sin(headAngle) * (HEAD_RADIUS + 6),
  };

  const shoulder = toWorld(pose, shoulderLocal);
  const chestCtrl = toWorld(pose, midTorsoLocal);
  const headCenter = toWorld(pose, headCenterLocal);
  const headAngleDeg =
    (Math.atan2(headCenter.y - shoulder.y, headCenter.x - shoulder.x) * 180) / Math.PI + 90;

  const kneeBend: 1 | -1 = pose.facing === 1 ? -1 : 1;
  const elbowBend: 1 | -1 = pose.facing === 1 ? 1 : -1;

  const lLeg = solveTwoBoneIK(hip, toWorld(pose, pose.leftFoot), UPPER_LEG, LOWER_LEG, kneeBend);
  const rLeg = solveTwoBoneIK(hip, toWorld(pose, pose.rightFoot), UPPER_LEG, LOWER_LEG, kneeBend);
  const lArm = solveTwoBoneIK(shoulder, toWorld(pose, pose.leftHand), UPPER_ARM, LOWER_ARM, elbowBend);
  const rArm = solveTwoBoneIK(shoulder, toWorld(pose, pose.rightHand), UPPER_ARM, LOWER_ARM, elbowBend);

  return {
    hip,
    chestCtrl,
    shoulder,
    headCenter,
    headAngleDeg,
    leftKnee: lLeg.mid,
    leftFoot: lLeg.end,
    rightKnee: rLeg.mid,
    rightFoot: rLeg.end,
    leftElbow: lArm.mid,
    leftHand: lArm.end,
    rightElbow: rArm.mid,
    rightHand: rArm.end,
  };
}

/**
 * GPU-Friendly SVG Glow Filter Defs (`objectBoundingBox` with generous -60%/220% padding).
 * NEVER exceeds Chromium's 8192px GPU tile ceiling!
 * NOTE: For perfectly horizontal/vertical `<line>` or flat `<path>`, ALWAYS use `<GlowLine>` below
 * instead of `filter="url(#...)"` so zero-height bounding boxes never vanish!
 */
export const GlowFilterDefs: React.FC = () => (
  <defs>
    {[
      { id: "cyan-glow", blur: 7 },
      { id: "gold-glow", blur: 8 },
      { id: "magenta-glow", blur: 8 },
      { id: "emerald-glow", blur: 7 },
    ].map((f) => (
      <filter key={f.id} id={f.id} x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation={f.blur} result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    ))}
  </defs>
);

/**
 * Bulletproof Glowing Line / Wire / Floor / Laser Beam (3 unfiltered layered strokes).
 * 100% immune to Chromium's zero-bbox filter invisibility bug AND ultra-fast on GPU!
 */
export const GlowLine: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  coreColor?: string;
  width?: number;
  opacity?: number;
}> = ({ x1, y1, x2, y2, color = "#38BDF8", coreColor = "#FFFFFF", width = 4, opacity = 1 }) => (
  <g opacity={opacity} strokeLinecap="round">
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width * 3.2} opacity={0.22} />
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} opacity={0.92} />
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={coreColor} strokeWidth={Math.max(1.2, width * 0.36)} />
  </g>
);

/**
 * Procedural deterministic jagged energy/lightning arc between two world points.
 * Uses unfiltered layered strokes (immune to zero-bbox filter bugs + fast GPU render!).
 */
export const JaggedBeam: React.FC<{
  from: Vec2;
  to: Vec2;
  time: number;
  segments?: number;
  jitter?: number;
  color?: string;
  coreColor?: string;
  width?: number;
  seedOffset?: number;
  opacity?: number;
}> = ({
  from,
  to,
  time,
  segments = 10,
  jitter = 26,
  color = "#FB7185",
  coreColor = "#FFFFFF",
  width = 4.5,
  seedOffset = 1,
  opacity = 1,
}) => {
  const step = Math.floor(time * 24);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / d;
  const ny = dx / d;
  const pts: string[] = [`M ${from.x} ${from.y}`];

  for (let i = 1; i < segments; i++) {
    const u = i / segments;
    const offset = (seededRandom(seedOffset * 131 + step * 37 + i * 17) - 0.5) * 2 * jitter * Math.sin(u * Math.PI);
    pts.push(`L ${from.x + dx * u + nx * offset} ${from.y + dy * u + ny * offset}`);
  }
  pts.push(`L ${to.x} ${to.y}`);
  const pathD = pts.join(" ");

  return (
    <g opacity={opacity} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={pathD} stroke={color} strokeWidth={width * 3.0} opacity={0.24} />
      <path d={pathD} stroke={color} strokeWidth={width} />
      <path d={pathD} stroke={coreColor} strokeWidth={Math.max(1.4, width * 0.38)} />
    </g>
  );
};

/**
 * Expressive Tracking Eye/Core — looks toward `lookTarget`,
 * narrows angrily on `overdrive`, widens on `shocked`, and dims on `frozen`!
 */
export const BossEye: React.FC<{
  cx: number;
  cy: number;
  radius?: number;
  lookTarget?: Vec2 | null;
  mood?: "neutral" | "angry" | "overdrive" | "shocked" | "frozen" | "calm" | "smug";
  color?: string;
}> = ({ cx, cy, radius = 18, lookTarget = null, mood = "neutral", color = "#FB7185" }) => {
  let px = 0;
  let py = 0;
  if (lookTarget) {
    const dx = lookTarget.x - cx;
    const dy = lookTarget.y - cy;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const maxShift = radius * 0.42;
    px = (dx / dist) * Math.min(maxShift, dist * 0.05);
    py = (dy / dist) * Math.min(maxShift, dist * 0.05);
  }
  const lidScaleY =
    mood === "overdrive"
      ? 0.45
      : mood === "angry" || mood === "smug"
      ? 0.65
      : mood === "shocked"
      ? 1.25
      : 1;
  const eyeColor = mood === "frozen" ? "#94A3B8" : mood === "calm" ? "#FACC15" : color;

  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <ellipse cx={0} cy={0} rx={radius} ry={radius * lidScaleY} fill="#05060a" stroke={eyeColor} strokeWidth={3} />
      <circle cx={px} cy={py * lidScaleY} r={radius * (mood === "shocked" ? 0.28 : 0.42)} fill={eyeColor} />
    </g>
  );
};

/** 2-Bone IK Articulated Limb / Claw / Tendril (always bolts any attached prop to `.end`!) */
export const ArticulatedLimb: React.FC<{
  root: Vec2;
  target: Vec2;
  len1: number;
  len2: number;
  bendDir?: 1 | -1;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
}> = ({ root, target, len1, len2, bendDir = 1, color = "#FB7185", strokeWidth = 7, opacity = 1 }) => {
  const { mid, end } = solveTwoBoneIK(root, target, len1, len2, bendDir);
  return (
    <g opacity={opacity} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={`M ${root.x} ${root.y} L ${mid.x} ${mid.y} L ${end.x} ${end.y}`} stroke={color} strokeWidth={strokeWidth * 2.2} opacity={0.2} />
      <path d={`M ${root.x} ${root.y} L ${mid.x} ${mid.y} L ${end.x} ${end.y}`} stroke={color} strokeWidth={strokeWidth} />
      <circle cx={mid.x} cy={mid.y} r={strokeWidth * 0.48} fill="#FFFFFF" />
    </g>
  );
};

/**
 * Living Character Entity (Alan Becker-style living symbol, creature, or mischievous rival!).
 * Gives any domain symbol (`e`, `g`, `π`, `λ`, `H₂O`, etc.) real running 2-bone IK legs,
 * expressive waving/taunting arms, squash-and-stretch body, and expressive eyes + eyebrows!
 */
export const LivingEntity: React.FC<{
  x: number;
  y: number;
  vx: number;
  vy: number;
  walkDist?: number;
  time: number;
  symbol: string;
  facing?: 1 | -1;
  airborne?: boolean;
  mood?: "neutral" | "smug" | "angry" | "shocked" | "happy" | "panicked";
  color?: string;
  glowFilter?: string;
  scale?: number;
  lookTarget?: Vec2 | null;
  silhouetteMode?: boolean;
}> = ({
  x,
  y,
  vx,
  vy,
  walkDist,
  time,
  symbol,
  facing = 1,
  airborne = false,
  mood = "smug",
  color = "#FB7185",
  glowFilter = "url(#magenta-glow)",
  scale = 1,
  lookTarget = null,
  silhouetteMode = false,
}) => {
  const speed = Math.abs(vx);
  const moving = !airborne && speed > 6;
  const dist = walkDist ?? Math.abs(x);
  const halfStep = 18;
  const cycle = dist / (halfStep * 2);
  const moveBlend = moving ? clamp((speed - 6) / 36, 0, 1) : 0;
  const phase = moving ? cycle * Math.PI : time * 4;
  const bob = moving ? Math.abs(Math.sin(phase)) * 8 * moveBlend : Math.sin(phase) * 3;
  const lean = clamp((vx * facing) / 620, -0.35, 0.42);
  const stretchY = airborne ? 1 + clamp(Math.abs(vy) / 1100, 0, 0.16) : 1;
  const stretchX = 1 / Math.sqrt(stretchY);

  const hipY = -44 - bob;
  const bodyY = hipY - 26;
  const strokeCol = silhouetteMode ? "#05060a" : color;

  const evalTinyFoot = (cRaw: number): Vec2 => {
    const c = ((cRaw % 2) + 2) % 2;
    if (c < 1) return { x: lerp(halfStep, -halfStep, c), y: 0 };
    const u = c - 1;
    const s = u * u * (3 - 2 * u);
    return { x: lerp(-halfStep, halfStep, s), y: -Math.sin(u * Math.PI) * 18 };
  };

  const lTarget = evalTinyFoot(cycle);
  const rTarget = evalTinyFoot(cycle + 1);
  const lFoot: Vec2 = airborne
    ? { x: -16, y: -18 }
    : moving
    ? { x: lerp(-14, lTarget.x, moveBlend), y: lTarget.y * moveBlend }
    : { x: -14, y: 0 };
  const rFoot: Vec2 = airborne
    ? { x: 18, y: -8 }
    : moving
    ? { x: lerp(16, rTarget.x, moveBlend), y: rTarget.y * moveBlend }
    : { x: 16, y: 0 };

  const armWave = mood === "smug" || mood === "happy" ? Math.sin(time * 12) * 14 : mood === "panicked" ? Math.sin(time * 26) * 18 : 0;
  const lHand: Vec2 =
    mood === "smug"
      ? { x: -34, y: bodyY - 8 }
      : mood === "panicked" || mood === "shocked"
      ? { x: -42, y: bodyY - 34 + armWave }
      : { x: -36, y: bodyY + 4 - Math.sin(phase) * 12 };
  const rHand: Vec2 =
    mood === "smug"
      ? { x: 42, y: bodyY - 24 + armWave } // Cheeky taunt wave!
      : mood === "panicked" || mood === "shocked"
      ? { x: 42, y: bodyY - 34 - armWave }
      : { x: 38, y: bodyY + 4 + Math.sin(phase) * 12 };

  const kneeDir: 1 | -1 = facing === 1 ? -1 : 1;
  const lLeg = solveTwoBoneIK({ x: -8, y: hipY }, lFoot, 26, 26, kneeDir);
  const rLeg = solveTwoBoneIK({ x: 8, y: hipY }, rFoot, 26, 26, kneeDir);

  // Subtle gaze shift for tiny expressive eyes
  let ex = 0;
  let ey = 0;
  if (lookTarget) {
    const dx = (lookTarget.x - x) * facing;
    const dy = lookTarget.y - (y + bodyY);
    const d = Math.max(1, Math.hypot(dx, dy));
    ex = clamp((dx / d) * 3, -3, 3);
    ey = clamp((dy / d) * 2.5, -2.5, 2.5);
  }

  return (
    <g
      transform={`translate(${x}, ${y}) scale(${facing * scale * stretchX}, ${scale * stretchY})`}
      filter={silhouetteMode ? undefined : glowFilter}
    >
      {/* 2-Bone IK Little Running Legs */}
      <g fill="none" stroke={strokeCol} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
        <path d={`M -8 ${hipY} L ${lLeg.mid.x} ${lLeg.mid.y} L ${lLeg.end.x} ${lLeg.end.y}`} opacity={0.85} />
        <path d={`M 8 ${hipY} L ${rLeg.mid.x} ${rLeg.mid.y} L ${rLeg.end.x} ${rLeg.end.y}`} />
        {/* Expressive Little Arms */}
        <path d={`M -20 ${bodyY + 2} Q -28 ${bodyY + 8} ${lHand.x} ${lHand.y}`} strokeWidth={5.2} opacity={0.88} />
        <path d={`M 20 ${bodyY + 2} Q 28 ${bodyY + 8} ${rHand.x} ${rHand.y}`} strokeWidth={5.5} />
      </g>

      {/* Living Symbol Torso (un-mirrored text so letters never flip backwards!) */}
      <g transform={`translate(0, ${bodyY}) rotate(${(lean * 180) / Math.PI}) scale(${facing}, 1)`}>
        <text
          x={0}
          y={20}
          textAnchor="middle"
          fontFamily="Georgia, ui-serif, serif"
          fontStyle="italic"
          fontWeight={900}
          fontSize={72}
          fill={strokeCol}
        >
          {symbol}
        </text>
        {/* Expressive Little Eyes & Brows perched above symbol */}
        {!silhouetteMode && (
          <g transform={`translate(${facing * 4}, -34)`}>
            <circle cx={-8 + ex * facing} cy={ey} r={3.6} fill="#FFFFFF" />
            <circle cx={8 + ex * facing} cy={ey} r={3.6} fill="#FFFFFF" />
            {mood === "angry" && (
              <>
                <line x1={-14} y1={-8} x2={-3} y2={-4} stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" />
                <line x1={14} y1={-8} x2={3} y2={-4} stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" />
              </>
            )}
            {mood === "smug" && (
              <>
                <line x1={-13} y1={-6} x2={-3} y2={-6} stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" />
                <path d="M 3 -8 Q 8 -12 13 -7" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" />
              </>
            )}
            {mood === "shocked" && (
              <>
                <circle cx={-8} cy={0} r={6} fill="none" stroke="#FFFFFF" strokeWidth={2} />
                <circle cx={8} cy={0} r={6} fill="none" stroke="#FFFFFF" strokeWidth={2} />
              </>
            )}
          </g>
        )}
      </g>
    </g>
  );
};

/**
 * Minimal silent-film cartoon emote burst right beside a character's head (`?`, `!`, `sweat`, `spark`).
 * Communicates realization, confusion, or panic WITHOUT explanatory HUD text!
 */
export const ExpressiveEmote: React.FC<{
  x: number;
  y: number;
  kind: "?" | "!" | "sweat" | "idea";
  progress: number; // 0..1
  color?: string;
}> = ({ x, y, kind, progress, color = "#FACC15" }) => {
  if (progress <= 0 || progress >= 1) return null;
  const pop = progress < 0.2 ? progress / 0.2 : progress > 0.8 ? (1 - progress) / 0.2 : 1;
  const lift = progress * 14;

  return (
    <g transform={`translate(${x}, ${y - lift}) scale(${0.6 + pop * 0.45})`} opacity={pop}>
      {kind === "sweat" ? (
        <path
          d="M 0 -14 Q 10 2 0 12 Q -10 2 0 -14 Z"
          fill="#38BDF8"
          stroke="#E0F2FE"
          strokeWidth={2}
        />
      ) : kind === "idea" ? (
        <g stroke={color} strokeWidth={3.5} strokeLinecap="round">
          <circle cx={0} cy={0} r={9} fill={color} opacity={0.9} />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <line
                key={i}
                x1={Math.cos(a) * 14}
                y1={Math.sin(a) * 14}
                x2={Math.cos(a) * 22}
                y2={Math.sin(a) * 22}
              />
            );
          })}
        </g>
      ) : (
        <text
          x={0}
          y={10}
          textAnchor="middle"
          fontFamily="system-ui, sans-serif"
          fontWeight={900}
          fontSize={38}
          fill={color}
          filter="url(#gold-glow)"
        >
          {kind}
        </text>
      )}
    </g>
  );
};

export type StickmanBaseProps = {
  pose: StickmanPose;
  strokeColor?: string;
  accentColor?: string;
  powerColor?: string;
  powerBoost?: number;
  opacity?: number;
  hollowHead?: boolean;
  silhouetteMode?: boolean;
  renderHeadAccessory?: (ctx: {
    headR: number;
    accentColor: string;
    strokeColor: string;
    facing: 1 | -1;
    silhouetteMode: boolean;
  }) => React.ReactNode;
};

/** Reusable, customizable Stickman renderer with back/front depth layering & accessory slot. */
export const StickmanBase: React.FC<StickmanBaseProps> = ({
  pose,
  strokeColor = "#E0F2FE",
  accentColor = "#38BDF8",
  powerColor = "#FACC15",
  powerBoost = 0,
  opacity = 1,
  hollowHead = false,
  silhouetteMode = false,
  renderHeadAccessory,
}) => {
  const r = solveStickmanRig(pose);
  const bodyColor = silhouetteMode ? "#05060a" : powerBoost > 0.3 ? "#FEF08A" : strokeColor;
  const trimColor = silhouetteMode ? "#05060a" : powerBoost > 0.3 ? powerColor : accentColor;
  const headR = RIG_METRICS.HEAD_RADIUS;

  return (
    <g
      opacity={opacity}
      filter={silhouetteMode ? undefined : powerBoost > 0.3 ? "url(#gold-glow)" : "url(#cyan-glow)"}
      stroke={bodyColor}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {powerBoost > 0.08 && !silhouetteMode && (
        <circle cx={r.hip.x} cy={r.hip.y - 35} r={68 + powerBoost * 34} fill={trimColor} opacity={0.14 * powerBoost} stroke="none" />
      )}

      {/* Back limbs (depth layered) */}
      <path d={`M ${r.hip.x} ${r.hip.y} L ${r.leftKnee.x} ${r.leftKnee.y} L ${r.leftFoot.x} ${r.leftFoot.y}`} strokeWidth={8} opacity={0.84} />
      <path d={`M ${r.shoulder.x} ${r.shoulder.y} L ${r.leftElbow.x} ${r.leftElbow.y} L ${r.leftHand.x} ${r.leftHand.y}`} strokeWidth={7.5} opacity={0.84} />

      {/* Fluid curved spine */}
      <path d={`M ${r.hip.x} ${r.hip.y} Q ${r.chestCtrl.x} ${r.chestCtrl.y} ${r.shoulder.x} ${r.shoulder.y}`} strokeWidth={9} />

      {/* Front limbs */}
      <path d={`M ${r.hip.x} ${r.hip.y} L ${r.rightKnee.x} ${r.rightKnee.y} L ${r.rightFoot.x} ${r.rightFoot.y}`} strokeWidth={8.5} />
      <path d={`M ${r.shoulder.x} ${r.shoulder.y} L ${r.rightElbow.x} ${r.rightElbow.y} L ${r.rightHand.x} ${r.rightHand.y}`} strokeWidth={8} />

      {/* Head + optional signature silhouette accessory */}
      <g transform={`translate(${r.headCenter.x}, ${r.headCenter.y}) rotate(${r.headAngleDeg})`}>
        {hollowHead ? (
          <circle cx={0} cy={0} r={headR} fill={silhouetteMode ? "#05060a" : "#000000"} stroke={bodyColor} strokeWidth={7} />
        ) : (
          <circle cx={0} cy={0} r={headR} fill={bodyColor} stroke="none" />
        )}
        {renderHeadAccessory?.({
          headR,
          accentColor: trimColor,
          strokeColor: bodyColor,
          facing: pose.facing,
          silhouetteMode,
        })}
      </g>
    </g>
  );
};

/** Tapered anime crescent slash smear */
export const SlashSmear: React.FC<{
  cx: number;
  cy: number;
  radius: number;
  rotationDeg: number;
  progress: number;
  color?: string;
  flipY?: boolean;
}> = ({ cx, cy, radius, rotationDeg, progress, color = "#FACC15", flipY = false }) => {
  if (progress <= 0 || progress >= 1) return null;
  const op = Math.sin(progress * Math.PI);
  const rOut = radius;
  const rIn = radius * lerp(0.58, 0.88, progress);

  return (
    <g
      transform={`translate(${cx}, ${cy}) rotate(${rotationDeg}) scale(1, ${flipY ? -1 : 1})`}
      opacity={op}
      filter="url(#gold-glow)"
    >
      <path d={`M 0 ${-rOut} A ${rOut} ${rOut} 0 0 1 ${rOut} 0 A ${rIn} ${rIn} 0 0 0 0 ${-rOut * 0.72} Z`} fill={color} />
      <path d={`M 8 ${-rOut * 0.92} A ${rOut * 0.92} ${rOut * 0.92} 0 0 1 ${rOut * 0.94} -4`} fill="none" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" />
    </g>
  );
};

/** Screen-space radial or horizontal anime speed lines (configurable for 9:16 or 16:9). */
export const ActionSpeedLines: React.FC<{
  mode: "horizontal" | "radial";
  intensity: number;
  time: number;
  color?: string;
  width?: number;
  height?: number;
}> = ({ mode, intensity, time, color = "#FFFFFF", width = 1080, height = 1920 }) => {
  if (intensity <= 0.02) return null;

  if (mode === "horizontal") {
    return (
      <g opacity={intensity * 0.3}>
        {Array.from({ length: 16 }).map((_, i) => {
          const y = seededRandom(i * 19.1) * height;
          const speed = 2600 + seededRandom(i * 7.3) * 1600;
          const span = width + 600;
          const x = (((seededRandom(i * 3.7) * span - time * speed) % span) + span) % span - 300;
          const w = 160 + seededRandom(i * 11.2) * 280;
          return (
            <line key={i} x1={x} y1={y} x2={x + w} y2={y} stroke={color} strokeWidth={1.5 + seededRandom(i * 5.5) * 2} strokeLinecap="round" />
          );
        })}
      </g>
    );
  }

  const cx = width / 2;
  const cy = height / 2;
  const outer = Math.hypot(cx, cy) + 120;
  return (
    <g opacity={intensity * 0.42}>
      {Array.from({ length: 32 }).map((_, i) => {
        const ang = (i / 32) * Math.PI * 2 + Math.sin(time * 24 + i) * 0.02;
        const r1 = Math.min(width, height) * 0.3 + seededRandom(i * 13.7) * 220;
        return (
          <line
            key={i}
            x1={cx + Math.cos(ang) * r1}
            y1={cy + Math.sin(ang) * r1}
            x2={cx + Math.cos(ang) * outer}
            y2={cy + Math.sin(ang) * outer}
            stroke={color}
            strokeWidth={1.5 + seededRandom(i * 9.1) * 2.8}
          />
        );
      })}
    </g>
  );
};

/** Expanding glowing ring blast for landings, counters, and power releases. */
export const ShockwaveBlast: React.FC<{
  cx: number;
  cy: number;
  progress: number;
  maxRadius?: number;
  color?: string;
}> = ({ cx, cy, progress, maxRadius = 600, color = "#38BDF8" }) => {
  if (progress <= 0 || progress >= 1) return null;
  const r = lerp(24, maxRadius, 1 - Math.pow(1 - progress, 3));
  const op = (1 - progress) * 0.85;
  return (
    <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={lerp(18, 2, progress)} opacity={op} />
  );
};

// ==================== V5 SILENT-FILM CINEMA VFX & PROP PRIMITIVES ====================

/**
 * Altitude-aware ground contact shadow (`v5`):
 * Automatically shrinks and fades as a character or thrown prop rises above `floorY`,
 * instantly selling 3D height, weight, gravity, and crisp grounded contact!
 */
export const ContactShadow: React.FC<{
  x: number;
  floorY: number;
  heightAboveFloor?: number;
  baseRadiusX?: number;
  color?: string;
  opacity?: number;
}> = ({ x, floorY, heightAboveFloor = 0, baseRadiusX = 34, color = "#38BDF8", opacity = 0.28 }) => {
  const h = Math.max(0, heightAboveFloor);
  const atten = clamp(1 - h / 560, 0.14, 1);
  return (
    <ellipse
      cx={x}
      cy={floorY + 3}
      rx={baseRadiusX * atten}
      ry={5.5 * atten}
      fill={color}
      opacity={opacity * atten * atten}
    />
  );
};

/**
 * Deterministic cartoon landing/skid dust puffs (`v5`) expanding outward along `floorY`.
 * Trigger automatically on `LANDING_TIMES` or crashes so every touchdown feels weighty!
 */
export const DustPuff: React.FC<{
  x: number;
  floorY: number;
  progress: number; // 0..1 over ~0.38s after landing
  scale?: number;
  color?: string;
}> = ({ x, floorY, progress, scale = 1, color = "#94A3B8" }) => {
  if (progress <= 0 || progress >= 1) return null;
  const e = 1 - Math.pow(1 - progress, 3);
  const op = (1 - progress) * 0.62;
  const puffs = [-1, 1];
  return (
    <g opacity={op}>
      {puffs.map((dir) => (
        <g key={dir}>
          <circle
            cx={x + dir * lerp(10, 62 * scale, e)}
            cy={floorY - lerp(4, 18 * scale, e)}
            r={lerp(6, 15 * scale, e) * (1 - progress * 0.4)}
            fill={color}
          />
          <circle
            cx={x + dir * lerp(6, 36 * scale, e)}
            cy={floorY - lerp(3, 10 * scale, e)}
            r={lerp(5, 11 * scale, e) * (1 - progress * 0.45)}
            fill={color}
            opacity={0.75}
          />
        </g>
      ))}
    </g>
  );
};

/**
 * Crisp Alan-Becker / Manga Impact Star burst (`v5`) at exact bonk/kick/throw contact `{x, y}`!
 */
export const ImpactStar: React.FC<{
  cx: number;
  cy: number;
  progress: number; // 0..1 over ~0.24s
  radius?: number;
  points?: number;
  color?: string;
  coreColor?: string;
}> = ({ cx, cy, progress, radius = 64, points = 8, color = "#FACC15", coreColor = "#FFFFFF" }) => {
  if (progress <= 0 || progress >= 1) return null;
  const op = Math.sin(progress * Math.PI);
  const rOut = radius * lerp(0.45, 1.15, progress);
  const rIn = rOut * lerp(0.32, 0.14, progress);
  const coords: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? rOut * (0.85 + seededRandom(i * 11.3) * 0.3) : rIn;
    coords.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
  }
  return (
    <g opacity={op}>
      <polygon points={coords.join(" ")} fill={color} filter="url(#gold-glow)" />
      <circle cx={cx} cy={cy} r={rIn * 0.9} fill={coreColor} />
    </g>
  );
};

export type ThoughtPictogram = "door" | "key" | "arrowUp" | "heart" | "broken" | "lightning" | "custom";

/**
 * Alan Becker-style Wordless Pictogram Thought Bubble (`v5`):
 * Lets characters communicate plans, desires, memories, and truces with ZERO sentences!
 */
export const ThoughtBubble: React.FC<{
  x: number;
  y: number;
  progress: number; // 0..1 across display window
  pictogram?: ThoughtPictogram;
  accentColor?: string;
  tailSide?: "left" | "right";
  children?: React.ReactNode;
}> = ({
  x,
  y,
  progress,
  pictogram = "door",
  accentColor = "#FACC15",
  tailSide = "left",
  children,
}) => {
  if (progress <= 0 || progress >= 1) return null;
  const enter = clamp(progress / 0.14, 0, 1);
  const exit = clamp((1 - progress) / 0.16, 0, 1);
  const s = 0.65 + 0.35 * Math.min(enter, exit);
  const op = Math.min(enter, exit);
  const tDir = tailSide === "left" ? -1 : 1;

  return (
    <g transform={`translate(${x}, ${y}) scale(${s})`} opacity={op}>
      {/* Little cartoon thought trail dots */}
      <circle cx={tDir * 30} cy={46} r={5} fill="#0F172A" stroke={accentColor} strokeWidth={2} />
      <circle cx={tDir * 20} cy={34} r={7.5} fill="#0F172A" stroke={accentColor} strokeWidth={2} />
      {/* Clean rounded cloud frame */}
      <rect
        x={-44}
        y={-32}
        width={88}
        height={60}
        rx={22}
        fill="#070B14"
        stroke={accentColor}
        strokeWidth={3}
        filter="url(#gold-glow)"
      />
      {/* Wordless Vector Pictogram inside */}
      {pictogram === "door" && (
        <g transform="translate(0, 0)">
          <rect x={-12} y={-18} width={24} height={34} rx={2} fill="none" stroke={accentColor} strokeWidth={3} />
          <circle cx={6} cy={0} r={2.6} fill={accentColor} />
        </g>
      )}
      {pictogram === "key" && (
        <g stroke={accentColor} strokeWidth={3} fill="none" strokeLinecap="round">
          <circle cx={-10} cy={-2} r={8} />
          <line x1={-2} y1={-2} x2={18} y2={-2} />
          <line x1={12} y1={-2} x2={12} y2={7} />
          <line x1={18} y1={-2} x2={18} y2={6} />
        </g>
      )}
      {pictogram === "arrowUp" && (
        <g stroke={accentColor} strokeWidth={3.8} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line x1={0} y1={15} x2={0} y2={-14} />
          <path d="M -11 -4 L 0 -15 L 11 -4" />
        </g>
      )}
      {pictogram === "heart" && (
        <path
          d="M 0 13 C -18 2 -20 -14 -8 -15 C -2 -15 0 -9 0 -9 C 0 -9 2 -15 8 -15 C 20 -14 18 2 0 13 Z"
          fill={accentColor}
        />
      )}
      {pictogram === "lightning" && (
        <polygon points="3,-18 -11,2 0,2 -4,18 12,-2 1,-2" fill={accentColor} />
      )}
      {pictogram === "broken" && (
        <path d="M -16 6 L -6 -8 L 4 4 L 16 -10" fill="none" stroke="#FB7185" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {pictogram === "custom" && children}
    </g>
  );
};

/**
 * Physical Catenary Rope / Cable / Tether (`v5`):
 * Sags realistically under gravity when `slackPx > 0`, and pulls crisp & taut as `slackPx -> 0`!
 */
export const PhysicsRope: React.FC<{
  from: Vec2;
  to: Vec2;
  slackPx?: number;
  color?: string;
  width?: number;
  endKnot?: boolean;
}> = ({ from, to, slackPx = 24, color = "#FACC15", width = 4.8, endKnot = true }) => {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2 + slackPx;
  const d = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke={color} strokeWidth={width * 2.6} opacity={0.22} />
      <path d={d} stroke={color} strokeWidth={width} />
      <path d={d} stroke="#FFFFFF" strokeWidth={Math.max(1.2, width * 0.32)} opacity={0.85} />
      {endKnot && <circle cx={to.x} cy={to.y} r={width * 1.5} fill="#FEF08A" />}
    </g>
  );
};

/**
 * Reusable Physical Coiled Spring (`v5`) with top/bottom plates and real compression scaling!
 */
export const SpringCoil: React.FC<{
  x: number;
  y: number;
  heightPx?: number;
  widthPx?: number;
  color?: string;
  topColor?: string;
  silhouetteMode?: boolean;
}> = ({
  x,
  y,
  heightPx = 56,
  widthPx = 68,
  color = "#FACC15",
  topColor = "#38BDF8",
  silhouetteMode = false,
}) => {
  const hw = widthPx / 2;
  const cw = hw * 0.72;
  const h = Math.max(14, heightPx);
  const c = silhouetteMode ? "#05060a" : color;
  const tc = silhouetteMode ? "#05060a" : topColor;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <GlowLine x1={-hw} y1={0} x2={hw} y2={0} color={c} width={4.2} />
      <path
        d={`M ${-cw} -2 L ${cw} ${-h * 0.22} L ${-cw} ${-h * 0.44} L ${cw} ${-h * 0.66} L ${-cw} ${-h * 0.86} L ${cw} ${-h}`}
        fill="none"
        stroke={c}
        strokeWidth={5.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <GlowLine x1={-hw - 2} y1={-h} x2={hw + 2} y2={-h} color={tc} width={4.8} />
    </g>
  );
};
