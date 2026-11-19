/**
 * Canonical End-to-End Composition Skeleton for `stickman-vs-world` V3 (9:16 @ 60fps).
 * Copy into `src/<slug>/MainComposition.tsx` and adapt to whichever Macro-Structure you chose
 * (Vertical Tower, Horizontal Road-Trip, Clone Sandbox, or Escape Chamber).
 */
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import {
  applyHitStops,
  clamp01,
  computeCameraShake,
  computeContactX,
  CONTACT_REACH,
  easeInCubic,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  easeSnap,
  elasticScale,
  evalRecoilOffset,
  HitStop,
  realTimeOf,
  RecoilHit,
  ShakeBurst,
  smoothstep,
  Vec2,
} from "./ik";
import { buildCamTransform, CameraKeyframe, evalCamera } from "./cameraEngine";
import {
  computeKinematics,
  evalDecayPulses,
  evalHopArcs,
  evalPath,
  HopArc,
  KeyPoint,
  smoothSynthesizedPose,
  StickmanAction,
  StickmanEmotion,
  synthesizePhysicsPose,
} from "./poseEngine";
import {
  ActionSpeedLines,
  applySecondaryMotion,
  ArticulatedLimb,
  BossEye,
  GlowFilterDefs,
  GlowLine,
  ShockwaveBlast,
  SlashSmear,
  solveStickmanRig,
  StickmanBase,
  StickmanPose,
} from "./rig";

export const COMP_WIDTH = 1080;
export const COMP_HEIGHT = 1920;
export const COMP_FPS = 60;
export const COMP_DURATION_FRAMES = 5400; // 90s @ 60fps

// Example world layout (adjust to Vertical Tower or Horizontal Panorama per Stage 1 choice)
const S1_Y = 0;
const S2_Y = -1920;
const S3_Y = -3840;
const FLOOR_1 = S1_Y + 1090;

const HIT_STOPS: HitStop[] = [
  { at: 54.45, duration: 0.05 }, // 3-frame impact freeze
  { at: 84.0, duration: 0.067 }, // 4-frame climax freeze
];

const HERO_PATH: KeyPoint[] = [
  { t: 0.0, x: 300, y: S1_Y + 420 },
  { t: 2.0, x: 300, y: FLOOR_1, ease: easeInCubic },
  { t: 3.4, x: computeContactX(520, 1, CONTACT_REACH.POKE), y: FLOOR_1, ease: easeInOutCubic },
  { t: 4.1, x: 360, y: FLOOR_1, ease: easeOutCubic }, // Curiosity recoil step back
  { t: 54.45, x: computeContactX(780, 1, CONTACT_REACH.KICK, 36), y: FLOOR_1 - 40, ease: easeSnap },
  { t: 58.0, x: 420, y: S2_Y + 1060, ease: easeInOutCubic },
  { t: 74.0, x: 540, y: S3_Y + 600, ease: easeInOutCubic },
  { t: 84.0, x: 540, y: S3_Y + 1140, ease: easeSnap },
  { t: 90.0, x: 540, y: S3_Y + 1300, ease: easeOutCubic },
];

const HOP_ARCS: HopArc[] = [
  [3.95, 4.3, 55],
  [53.8, 54.6, 130],
];

const ANTICIPATION_TIMES = [53.8, 83.75];
const LANDING_TIMES = [2.0, 4.3, 85.4];
const BOSS_HITS: RecoilHit[] = [{ at: 54.45, dx: 42, dy: -65, decay: 6.5 }];

const CAMERA_KEYS: CameraKeyframe[] = [
  { t: 0.0, fx: 440, fy: S1_Y + 860, zoom: 1.28 },
  { t: 3.0, fx: 540, fy: S1_Y + 960, zoom: 1.05, ease: easeInOutCubic },
  { t: 54.5, fx: 540, fy: S1_Y + 960, zoom: 1.04 },
  { t: 58.0, fx: 540, fy: S2_Y + 960, zoom: 1.04, ease: easeInOutCubic },
  { t: 74.0, fx: 540, fy: S3_Y + 960, zoom: 1.12, ease: easeInOutCubic },
  { t: 85.5, fx: 540, fy: S3_Y + 960, zoom: 1.0, ease: easeOutCubic },
];

const SHAKE_BURSTS: ShakeBurst[] = [
  { at: realTimeOf(2.0, HIT_STOPS), amp: 14 },
  { at: realTimeOf(54.45, HIT_STOPS), amp: 22 },
  { at: realTimeOf(84.0, HIT_STOPS), amp: 34, decay: 8 },
];

function heroPosAt(t: number): Vec2 {
  const base = evalPath(HERO_PATH, t);
  return { x: base.x, y: base.y - evalHopArcs(HOP_ARCS, t) };
}

function rawHeroPoseAt(t: number): StickmanPose {
  const k = computeKinematics(heroPosAt, t, 1);
  const hopH = evalHopArcs(HOP_ARCS, t);
  const airborne = t < 2.0 || hopH > 12 || (t >= 54.45 && t < 58.0) || (t >= 70.0 && t < 85.2);
  const beatPulse = Math.exp(-((t % 0.5) / 0.5) * 6.5);

  let emotion: StickmanEmotion = "neutral";
  if (t >= 2.8 && t < 3.6) emotion = "curious";
  else if (t >= 3.9 && t < 4.5) emotion = "shocked"; // Works mid-run & mid-hop too!

  let action: StickmanAction = "none";
  if (t >= 54.2 && t < 54.8) action = "kick";
  else if (t >= 86.0) action = "victory";

  const lookTarget: Vec2 | null = t < 10 ? { x: 520, y: FLOOR_1 - 95 } : { x: 780, y: FLOOR_1 - 120 };
  const rightHandWorld: Vec2 | null = t >= 3.35 && t < 3.85 ? { x: 520, y: FLOOR_1 - 12 } : null; // Reaches all the way to floor!

  return synthesizePhysicsPose({
    x: k.x,
    y: k.y,
    vx: k.vx,
    vy: k.vy,
    ax: k.ax, // Enables automatic heel-plant skid braking!
    facing: k.facing,
    airborne,
    t,
    beatPulse,
    lookTarget,
    rightHandWorld,
    anticipation: evalDecayPulses(ANTICIPATION_TIMES, t, 0.16, "before"),
    squash: evalDecayPulses(LANDING_TIMES, t, 0.24, "after"),
    emotion,
    action,
    bodyRotation: t < 2.0 ? clamp01((t - 1.15) / 0.85) * Math.PI * 2 : 0,
  });
}

export const MainComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const realT = frame / fps;
  const { animT } = applyHitStops(realT, HIT_STOPS);

  const climaxRealT = realTimeOf(84.0, HIT_STOPS);
  const isImpactFrame = realT >= climaxRealT && realT < climaxRealT + 0.045;

  const cam = evalCamera(CAMERA_KEYS, animT);
  const shake = computeCameraShake(realT, SHAKE_BURSTS);
  const camTransform = buildCamTransform(cam, shake, COMP_WIDTH, COMP_HEIGHT);

  const smoothNow = smoothSynthesizedPose(rawHeroPoseAt, animT, 0.04);
  const smoothPrev = smoothSynthesizedPose(rawHeroPoseAt, Math.max(0, animT - 0.025), 0.04);
  const heroPose = applySecondaryMotion(smoothNow, smoothPrev, 0.025);
  const rig = solveStickmanRig(heroPose);
  const powerBoost = animT >= 82.5 && animT < 86.0 ? smoothstep((animT - 82.5) / 0.6) : 0;

  const propBounce = elasticScale(animT, 3.55, 0.28);
  const bossRecoil = evalRecoilOffset(animT, BOSS_HITS);
  const bossPos = { x: 780 + bossRecoil.x, y: FLOOR_1 - 110 + bossRecoil.y };
  const showAfterimages = ((animT >= 53.8 && animT <= 57.6) || (animT >= 83.7 && animT <= 84.5)) && !isImpactFrame;

  return (
    <AbsoluteFill style={{ backgroundColor: isImpactFrame ? "#FFFFFF" : "#000000" }}>
      <Audio key="ost-v1" src={staticFile("sfx/ost-v1.mp3")} volume={1.0} />

      <svg width={COMP_WIDTH} height={COMP_HEIGHT} viewBox={`0 0 ${COMP_WIDTH} ${COMP_HEIGHT}`} style={{ display: "block" }}>
        <GlowFilterDefs />
        <rect x={0} y={0} width={COMP_WIDTH} height={COMP_HEIGHT} fill={isImpactFrame ? "#FFFFFF" : "#000000"} />

        {animT >= 2.35 && animT < 85.5 && !isImpactFrame && (
          <text
            x={540}
            y={128}
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
            fontWeight={800}
            fontSize={24}
            letterSpacing={5}
            fill="#64748B"
            opacity={smoothstep((animT - 2.35) / 0.4)}
          >
            I. FIRST CONTACT
          </text>
        )}

        <g transform={camTransform}>
          {/* Bulletproof GlowLine for horizontal/flat wires & floors (zero bbox-filter bugs & fast GPU!) */}
          <GlowLine x1={60} y1={FLOOR_1} x2={1020} y2={FLOOR_1} color="#38BDF8" width={3.5} />

          {/* Example Reactive Spring Primitive */}
          <g transform={`translate(520, ${FLOOR_1 - 16}) scale(${propBounce.sx}, ${propBounce.sy})`}>
            <circle cx={0} cy={0} r={18} fill="none" stroke="#7DD3FC" strokeWidth={4} filter="url(#cyan-glow)" />
          </g>

          {/* Example Articulated Boss with Tracking Eye & IK Limb (NOT a static polygon!) */}
          <g>
            <ArticulatedLimb
              root={{ x: bossPos.x - 36, y: bossPos.y + 8 }}
              target={{ x: bossPos.x - 108, y: bossPos.y + 22 + Math.sin(animT * 5) * 18 }}
              len1={52}
              len2={48}
              bendDir={-1}
              color="#FB7185"
            />
            <polygon
              points={`${bossPos.x},${bossPos.y - 56} ${bossPos.x + 50},${bossPos.y + 44} ${bossPos.x - 50},${bossPos.y + 44}`}
              fill="#14060D"
              stroke="#FB7185"
              strokeWidth={5}
              filter="url(#magenta-glow)"
            />
            <BossEye cx={bossPos.x} cy={bossPos.y} radius={18} lookTarget={rig.headCenter} mood="angry" />
          </g>

          {showAfterimages &&
            [0.028, 0.056, 0.084].map((dt, idx) => (
              <StickmanBase
                key={idx}
                pose={smoothSynthesizedPose(rawHeroPoseAt, Math.max(0, animT - dt), 0.035)}
                powerBoost={powerBoost}
                opacity={0.22 - idx * 0.055}
              />
            ))}

          <StickmanBase
            pose={heroPose}
            powerBoost={powerBoost}
            silhouetteMode={isImpactFrame}
            renderHeadAccessory={({ headR, accentColor }) => (
              <path
                d={`M ${-headR - 2} 2 A ${headR + 3} ${headR + 3} 0 0 1 ${headR + 2} 2`}
                fill="none"
                stroke={accentColor}
                strokeWidth={4.5}
              />
            )}
          />

          <SlashSmear cx={rig.rightFoot.x} cy={rig.rightFoot.y} radius={150} rotationDeg={-25} progress={clamp01((animT - 54.35) / 0.3)} color="#FACC15" />
          <ShockwaveBlast cx={540} cy={S3_Y + 1140} progress={clamp01((animT - 84.0) / 0.8)} maxRadius={780} color="#FACC15" />
        </g>

        <ActionSpeedLines mode="radial" intensity={animT >= 83.95 && animT < 85.0 ? 1.0 : 0} time={animT} color="#FACC15" width={COMP_WIDTH} height={COMP_HEIGHT} />

        {animT >= 85.8 && (
          <g opacity={smoothstep((animT - 85.8) / 0.8)} transform={`translate(540, 560) scale(${easeOutBack(clamp01((animT - 85.8) / 0.5))})`}>
            <text x={0} y={0} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight={900} fontSize={88} letterSpacing={8} fill="#FFFFFF" filter="url(#cyan-glow)">
              TITLE HERE
            </text>
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};
