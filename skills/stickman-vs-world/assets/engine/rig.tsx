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
 * Expressive Boss Tracking Eye/Core — automatically looks toward `lookTarget`,
 * narrows angrily on `overdrive`, widens on `shocked`, and dims on `frozen`!
 */
export const BossEye: React.FC<{
  cx: number;
  cy: number;
  radius?: number;
  lookTarget?: Vec2 | null;
  mood?: "neutral" | "angry" | "overdrive" | "shocked" | "frozen" | "calm";
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
  const lidScaleY = mood === "overdrive" ? 0.45 : mood === "angry" ? 0.65 : mood === "shocked" ? 1.25 : 1;
  const eyeColor = mood === "frozen" ? "#94A3B8" : mood === "calm" ? "#FACC15" : color;

  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <ellipse cx={0} cy={0} rx={radius} ry={radius * lidScaleY} fill="#05060a" stroke={eyeColor} strokeWidth={3} />
      <circle cx={px} cy={py * lidScaleY} r={radius * (mood === "shocked" ? 0.28 : 0.42)} fill={eyeColor} />
    </g>
  );
};

/** 2-Bone IK Articulated Boss Arm / Tendril / Mechanical Claw so bosses move expressively! */
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
      <circle cx={mid.x} cy={mid.y} r={strokeWidth * 0.55} fill="#FFFFFF" />
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
  /** Optional custom head-local accessory renderer (centered at 0,0, rotated with headAngleDeg) */
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
