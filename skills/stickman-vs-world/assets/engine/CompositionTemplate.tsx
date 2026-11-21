/**
 * Canonical Zero-HUD Cinema Story Skeleton for `stickman-vs-world` v5 (9:16 @ 60fps).
 * Pre-wired with:
 *  - Ground-locked zero-slide footsteps (`walkDist: k.walkDist`) + smooth turn-squash
 *  - Auto-derived jump anticipations & landings (`autoDeriveJumpTiming`)
 *  - Smart Cinema Camera (`evalSmartCamera` with subtle handheld reaction breathing!)
 *  - Ground `<ContactShadow>`, automatic landing `<DustPuff>`, `<ImpactStar>`, wordless `<ThoughtBubble>`
 *  - Expressive `<LivingEntity>` rival + continuous carried/thrown prop (`evalBallisticArc`)
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
  elasticScale,
  evalBallisticArc,
  evalPropBounce,
  HitStop,
  realTimeOf,
  ShakeBurst,
  smoothstep,
  Vec2,
} from "./ik";
import { buildCamTransform, CameraKeyframe, evalSmartCamera } from "./cameraEngine";
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
import { autoDeriveJumpTiming } from "./timeline";
import {
  ActionSpeedLines,
  applySecondaryMotion,
  ContactShadow,
  DustPuff,
  ExpressiveEmote,
  GlowFilterDefs,
  GlowLine,
  ImpactStar,
  LivingEntity,
  ShockwaveBlast,
  solveStickmanRig,
  StickmanBase,
  StickmanPose,
  ThoughtBubble,
} from "./rig";

export const COMP_WIDTH = 1080;
export const COMP_HEIGHT = 1920;
export const COMP_FPS = 60;
export const COMP_DURATION_FRAMES = 3600; // 60s @ 60fps

const FLOOR_Y = 1220;
const PROP_REST: Vec2 = { x: 460, y: FLOOR_Y - 24 };
const PROP_LAND: Vec2 = { x: 760, y: FLOOR_Y - 24 };

const HIT_STOPS: HitStop[] = [{ at: 52.0, duration: 0.067 }];

const HERO_PATH: KeyPoint[] = [
  { t: 0.0, x: 240, y: 460 },
  { t: 1.8, x: 240, y: FLOOR_Y, ease: easeInCubic },
  { t: 3.4, x: 240, y: FLOOR_Y },
  { t: 4.8, x: computeContactX(PROP_REST.x, 1, CONTACT_REACH.GRAB), y: FLOOR_Y, ease: easeInOutCubic },
  { t: 7.4, x: computeContactX(PROP_REST.x, 1, CONTACT_REACH.GRAB), y: FLOOR_Y },
  { t: 54.0, x: 540, y: FLOOR_Y, ease: easeInOutCubic },
  { t: 60.0, x: 540, y: FLOOR_Y },
];

const RIVAL_PATH: KeyPoint[] = [
  { t: 0.0, x: 820, y: FLOOR_Y },
  { t: 7.5, x: 820, y: FLOOR_Y },
  { t: 9.0, x: 690, y: FLOOR_Y, ease: easeOutCubic },
  { t: 60.0, x: 690, y: FLOOR_Y },
];

const HOP_ARCS: HopArc[] = [[6.2, 6.55, 45]];
const { anticipationTimes: ANTICIPATION_TIMES, landingTimes: LANDING_TIMES } = autoDeriveJumpTiming(
  HERO_PATH,
  HOP_ARCS
);

const CAMERA_KEYS: CameraKeyframe[] = [
  { t: 0.0, fx: 320, fy: 960, zoom: 1.28 },
  { t: 3.0, fx: 520, fy: 1020, zoom: 1.05, ease: easeInOutCubic },
  { t: 60.0, fx: 540, fy: 1020, zoom: 1.0, ease: easeOutCubic },
];

const SHAKE_BURSTS: ShakeBurst[] = [
  { at: realTimeOf(1.8, HIT_STOPS), amp: 12 },
  { at: realTimeOf(52.0, HIT_STOPS), amp: 28, decay: 8 },
];

function heroPosAt(t: number): Vec2 {
  const base = evalPath(HERO_PATH, t);
  return { x: base.x, y: base.y - evalHopArcs(HOP_ARCS, t) };
}

function rivalPosAt(t: number): Vec2 {
  return evalPath(RIVAL_PATH, t);
}

function rawHeroPoseAt(t: number): StickmanPose {
  const k = computeKinematics(heroPosAt, t, 1, HERO_PATH);
  const airborne = t < 1.8 || evalHopArcs(HOP_ARCS, t) > 10;

  let emotion: StickmanEmotion = "neutral";
  let action: StickmanAction = "none";
  let actionProgress = 0;

  if (t >= 2.2 && t < 3.4) {
    emotion = "confused";
    action = "scratchHead";
  } else if (t >= 6.6 && t < 7.05) {
    action = "throwWindup";
    actionProgress = clamp01((t - 6.6) / 0.45);
  } else if (t >= 7.05 && t < 7.45) {
    action = "throwRelease";
    actionProgress = clamp01((t - 7.05) / 0.35);
  } else if (t >= 55.0) {
    action = "dustHands";
  }

  const rightHandWorld: Vec2 | null = t >= 4.95 && t < 5.55 ? PROP_REST : null;

  return synthesizePhysicsPose({
    x: k.x,
    y: k.y,
    vx: k.vx,
    vy: k.vy,
    ax: k.ax,
    walkDist: k.walkDist,
    facing: k.facing,
    airborne,
    t,
    lookTarget: rivalPosAt(t),
    rightHandWorld,
    anticipation: evalDecayPulses(ANTICIPATION_TIMES, t, 0.16, "before"),
    squash: evalDecayPulses(LANDING_TIMES, t, 0.24, "after"),
    emotion,
    action,
    actionProgress,
  });
}

export const MainComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const realT = frame / fps;
  const { animT } = applyHitStops(realT, HIT_STOPS);

  const climaxRealT = realTimeOf(52.0, HIT_STOPS);
  const isImpactFrame = realT >= climaxRealT && realT < climaxRealT + 0.05;

  const cam = evalSmartCamera(CAMERA_KEYS, animT, {
    handheldAmp: animT >= 2.0 && animT < 3.6 ? 2.2 : 0, // Subtle organic cinema breathing on reaction close-up!
  });
  const shake = computeCameraShake(realT, SHAKE_BURSTS);
  const camTransform = buildCamTransform(cam, shake, COMP_WIDTH, COMP_HEIGHT);

  const smoothNow = smoothSynthesizedPose(rawHeroPoseAt, animT, 0.038);
  const smoothPrev = smoothSynthesizedPose(rawHeroPoseAt, Math.max(0, animT - 0.025), 0.038);
  const heroPose = applySecondaryMotion(smoothNow, smoothPrev, 0.025);
  const heroRig = solveStickmanRig(heroPose);

  const rivalK = computeKinematics(rivalPosAt, animT, -1, RIVAL_PATH);

  // Continuous Physical Prop: Rest -> Held in Hand -> Ballistic Throw -> Multi-Bounce!
  let propPos = PROP_REST;
  let propRot = 0;
  if (animT >= 5.35 && animT < 7.15) {
    propPos = heroRig.rightHand;
  } else if (animT >= 7.15 && animT < 7.95) {
    const arc = evalBallisticArc(heroRig.rightHand, PROP_LAND, 7.15, 7.95, animT, 180, 540);
    propPos = { x: arc.x, y: arc.y };
    propRot = arc.rotDeg;
  } else if (animT >= 7.95) {
    propPos = { x: PROP_LAND.x, y: PROP_LAND.y - evalPropBounce(animT, 7.95, 44) };
  }
  const propBounce = elasticScale(animT, 7.95, 0.26);

  return (
    <AbsoluteFill style={{ backgroundColor: isImpactFrame ? "#FFFFFF" : "#000000" }}>
      <Audio key="story-v1" src={staticFile("sfx/story-v1.mp3")} volume={1.0} />

      <svg width={COMP_WIDTH} height={COMP_HEIGHT} viewBox={`0 0 ${COMP_WIDTH} ${COMP_HEIGHT}`} style={{ display: "block" }}>
        <GlowFilterDefs />
        <rect x={0} y={0} width={COMP_WIDTH} height={COMP_HEIGHT} fill={isImpactFrame ? "#FFFFFF" : "#000000"} />

        {/* PURE ZERO-HUD CINEMA WORLD SPACE */}
        <g transform={camTransform}>
          <GlowLine x1={60} y1={FLOOR_Y} x2={1020} y2={FLOOR_Y} color="#38BDF8" width={3.5} />

          {/* V5 Altitude-Aware Ground Contact Shadows */}
          {!isImpactFrame && (
            <>
              <ContactShadow x={heroPose.x} floorY={FLOOR_Y} heightAboveFloor={FLOOR_Y - heroPose.y} />
              <ContactShadow x={rivalK.x} floorY={FLOOR_Y} heightAboveFloor={FLOOR_Y - rivalK.y} color="#FB7185" baseRadiusX={26} />
            </>
          )}

          {/* V5 Automatic Ground Dust Puffs on Every Landing */}
          {!isImpactFrame &&
            LANDING_TIMES.map((lt) => (
              <DustPuff key={lt} x={heroPosAt(lt).x} floorY={FLOOR_Y} progress={clamp01((animT - lt) / 0.36)} />
            ))}

          {/* Physically Carried & Thrown Prop */}
          <g transform={`translate(${propPos.x}, ${propPos.y}) rotate(${propRot}) scale(${propBounce.sx}, ${propBounce.sy})`}>
            <circle cx={0} cy={0} r={22} fill="#020617" stroke="#FACC15" strokeWidth={4} filter="url(#gold-glow)" />
          </g>

          {/* Living Rival with Zero-Slide IK Legs */}
          <LivingEntity
            x={rivalK.x}
            y={rivalK.y}
            vx={rivalK.vx}
            vy={rivalK.vy}
            walkDist={rivalK.walkDist}
            time={animT}
            symbol="e"
            facing={rivalK.facing}
            mood={animT >= 7.95 ? "shocked" : "smug"}
            lookTarget={heroRig.headCenter}
            silhouetteMode={isImpactFrame}
          />

          <StickmanBase pose={heroPose} silhouetteMode={isImpactFrame} />

          {/* Wordless Pictogram Thought Bubble + Silent Emote + Contact Star */}
          {!isImpactFrame && (
            <>
              <ThoughtBubble x={heroRig.headCenter.x + 76} y={heroRig.headCenter.y - 88} progress={clamp01((animT - 2.3) / 1.4)} pictogram="door" />
              <ExpressiveEmote x={heroRig.headCenter.x + 34} y={heroRig.headCenter.y - 34} kind="?" progress={clamp01((animT - 2.35) / 0.9)} />
              <ImpactStar cx={PROP_LAND.x} cy={PROP_LAND.y} progress={clamp01((animT - 7.95) / 0.26)} />
            </>
          )}

          <ShockwaveBlast cx={540} cy={FLOOR_Y - 80} progress={clamp01((animT - 52.0) / 0.75)} maxRadius={720} color="#FACC15" />
        </g>

        <ActionSpeedLines mode="radial" intensity={animT >= 51.95 && animT < 52.8 ? 1 : 0} time={animT} color="#FACC15" width={COMP_WIDTH} height={COMP_HEIGHT} />

        {/* Minimalist End Title Only (last 4s; use letterSpacing={0} for Thai/non-Latin!) */}
        {animT >= 56.0 && !isImpactFrame && (
          <g opacity={smoothstep((animT - 56.0) / 0.7)} transform={`translate(540, 560) scale(${easeOutBack(clamp01((animT - 56.0) / 0.45))})`}>
            <text x={0} y={0} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight={900} fontSize={84} letterSpacing={8} fill="#FFFFFF" filter="url(#cyan-glow)">
              TITLE HERE
            </text>
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};
