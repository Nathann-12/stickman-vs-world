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
  evalRecoilOffset,
  HitStop,
  lerp,
  realTimeOf,
  RecoilHit,
  ShakeBurst,
  smoothstep,
  springImpulse,
  Vec2,
} from "../engine/ik";
import { buildCamTransform, CameraKeyframe, evalCamera } from "../engine/cameraEngine";
import {
  computeKinematics,
  evalDecayPulses,
  evalHopArcs,
  evalPath,
  evalSurfaceAnchor,
  HopArc,
  KeyPoint,
  smoothSynthesizedPose,
  StickmanAction,
  StickmanEmotion,
  synthesizePhysicsPose,
} from "../engine/poseEngine";
import {
  ActionSpeedLines,
  applySecondaryMotion,
  GlowFilterDefs,
  GlowLine,
  JaggedBeam,
  ShockwaveBlast,
  SlashSmear,
  solveStickmanRig,
  StickmanPose,
} from "../engine/rig";
import {
  AudioPortalV3,
  BossMoodV3,
  MetronomeBossV3,
  MUSIC_FONT,
  MusicNoteBurstV3,
  PulseV3,
  TrebleBladeV3,
  VectorAccidentalV3,
  VectorNoteV3,
} from "./CharactersV3";
import {
  ConcertGrandPianoV3,
  FermataHarmonyVoidV3,
  RepeatReflectorV3,
  VinylAndEQArenaV3,
} from "./ArenasV3";

export const BBV3_WIDTH = 1080;
export const BBV3_HEIGHT = 1920;
export const BBV3_FPS = 60;
export const BBV3_DURATION_FRAMES = 5400; // 90s @ 60fps

// Continuous Vertical Tower (3 stacked stages, ZERO fade cuts!)
const S1_Y = 0;
const S2_Y = -1920;
const S3_Y = -3840;

const FLOOR_1 = S1_Y + 1090;
const VINYL_CX = 540;
const VINYL_CY = S2_Y + 740;
const VINYL_R = 252;
const EQ_CONSOLE_Y = VINYL_CY + 575;

// Hit-Stops authored in `animT` seconds (3-4 frame freezes on decisive strikes!)
export const BBV3_HIT_STOPS: HitStop[] = [
  { at: 49.95, duration: 0.04 }, // Repeat `:||` golden deflection freeze
  { at: 54.45, duration: 0.05 }, // `A + ♯ = A♯ ↑` uppercut kick freeze
  { at: 84.0, duration: 0.067 }, // `A MAJOR fff` meteor climax freeze
];

const FOUR_CHORDS = [
  { name: "Am", formula: "A + C + E = Am", notes: ["A", "C", "E"], start: 11.0, end: 14.0, color: "#38BDF8" },
  { name: "F", formula: "F + A + C = F", notes: ["F", "A", "C"], start: 14.0, end: 17.0, color: "#7DD3FC" },
  { name: "C", formula: "C + E + G = C", notes: ["C", "E", "G"], start: 17.0, end: 20.0, color: "#34D399" },
  { name: "G", formula: "G + B + D = G", notes: ["G", "B", "D"], start: 20.0, end: 23.0, color: "#FACC15" },
];

// Exported so compose-beatbreaker-v3-ost.mjs can sync automatic footsteps 1:1 with visual movement!
export const PULSE_V3_PATH: KeyPoint[] = [
  // ---- ACT I (0–11s): PORTAL FALL -> CURIOSITY LOOP -> SHARP/FLAT & OCTAVE ----
  { t: 0.0, x: 300, y: S1_Y + 420 },
  { t: 1.15, x: 300, y: S1_Y + 420 },
  { t: 2.0, x: 300, y: FLOOR_1, ease: easeInCubic },
  { t: 2.65, x: 300, y: FLOOR_1 },
  { t: 3.35, x: computeContactX(520, 1, CONTACT_REACH.POKE), y: FLOOR_1, ease: easeInOutCubic }, // Approach & poke `♩`
  { t: 3.65, x: computeContactX(520, 1, CONTACT_REACH.POKE), y: FLOOR_1 },
  { t: 4.1, x: 345, y: FLOOR_1, ease: easeOutCubic }, // Startled hop BACK! (Curiosity Loop)
  { t: 4.75, x: 345, y: FLOOR_1 }, // Head-shake curiosity pause
  { t: 5.45, x: computeContactX(560, 1, CONTACT_REACH.POKE), y: FLOOR_1, ease: easeInOutCubic }, // Excited dash back to test `♯`/`♭`!
  { t: 6.95, x: computeContactX(560, 1, CONTACT_REACH.POKE), y: FLOOR_1 },
  { t: 7.7, x: 540, y: FLOOR_1, ease: easeInOutCubic }, // Center for Octave Jump (`×2 Hz`)
  { t: 10.2, x: 540, y: FLOOR_1 },

  // ---- ACT II (11–35.5s): 4-CHORD PLAYGROUND -> 3D PIANO UNFOLD -> LIVE SONG JAM ----
  { t: 11.0, x: 340, y: FLOOR_1, ease: easeInOutCubic }, // Am
  { t: 11.45, x: 520, y: FLOOR_1, ease: easeInOutCubic },
  { t: 11.9, x: 700, y: FLOOR_1, ease: easeInOutCubic },
  { t: 13.5, x: 700, y: FLOOR_1 },
  { t: 14.0, x: 340, y: FLOOR_1, ease: easeInOutCubic }, // F
  { t: 14.45, x: 520, y: FLOOR_1, ease: easeInOutCubic },
  { t: 14.9, x: 700, y: FLOOR_1, ease: easeInOutCubic },
  { t: 16.5, x: 700, y: FLOOR_1 },
  { t: 17.0, x: 340, y: FLOOR_1, ease: easeInOutCubic }, // C
  { t: 17.45, x: 520, y: FLOOR_1, ease: easeInOutCubic },
  { t: 17.9, x: 700, y: FLOOR_1, ease: easeInOutCubic },
  { t: 19.5, x: 700, y: FLOOR_1 },
  { t: 20.0, x: 340, y: FLOOR_1, ease: easeInOutCubic }, // G
  { t: 20.45, x: 520, y: FLOOR_1, ease: easeInOutCubic },
  { t: 20.9, x: 700, y: FLOOR_1, ease: easeInOutCubic },
  { t: 22.8, x: 540, y: FLOOR_1, ease: easeInOutCubic }, // Center as 3D Piano unfolds!

  // 24s–35.5s: Jamming His Song + Stomping KICK / SNARE / HI-HAT Pads!
  { t: 24.0, x: 420, y: FLOOR_1 + 65, ease: easeInOutCubic },
  { t: 25.0, x: 295, y: FLOOR_1 + 65, ease: easeInOutCubic },
  { t: 26.0, x: 185, y: FLOOR_1 + 65, ease: easeInOutCubic },
  { t: 27.0, x: 675, y: FLOOR_1 + 65, ease: easeInOutCubic },
  { t: 28.0, x: 240, y: FLOOR_1 + 65, ease: easeInOutCubic }, // +KICK
  { t: 29.5, x: 540, y: FLOOR_1 + 65, ease: easeInOutCubic }, // +SNARE
  { t: 30.0, x: 800, y: FLOOR_1 + 65, ease: easeInOutCubic }, // +HI-HAT
  { t: 31.5, x: 420, y: FLOOR_1 + 65, ease: easeInOutCubic },
  { t: 33.5, x: 670, y: FLOOR_1 + 65, ease: easeInOutCubic },
  { t: 35.4, x: 520, y: FLOOR_1 + 65, ease: easeInOutCubic },

  // ---- ACT III (36–41.2s): OVER-COMMITMENT "UH-OH" GAG -> METRONOME ASSEMBLES! ----
  { t: 38.0, x: 520, y: FLOOR_1 + 65 }, // Happily taps 1-2-3-4 -> Metronome folds together!
  { t: 38.55, x: computeContactX(810, 1, CONTACT_REACH.PUSH, 65), y: FLOOR_1 + 65, ease: easeOutCubic }, // Frantically tries pushing Boss back!
  { t: 39.2, x: computeContactX(810, 1, CONTACT_REACH.PUSH, 65), y: FLOOR_1 + 65 },
  { t: 40.35, x: 215, y: FLOOR_1 + 65, ease: easeOutCubic }, // PANIC-SPRINT backward flailing arms + skid brake!
  { t: 41.2, x: 215, y: FLOOR_1 + 65 },

  // ---- ACT IV (41.2–57.6s): ANTI-AIR PIANO -> DOUBLE-TAKE `:||` -> `A♯ ↑` UPPERCUT! ----
  { t: 42.5, x: 420, y: FLOOR_1 + 65, ease: easeInOutCubic },
  { t: 43.5, x: 575, y: FLOOR_1 + 65, ease: easeInOutCubic },
  { t: 44.5, x: 420, y: FLOOR_1 + 65, ease: easeInOutCubic },
  { t: 45.5, x: 675, y: FLOOR_1 + 65, ease: easeInOutCubic },
  { t: 46.4, x: 270, y: FLOOR_1 + 65, ease: easeOutCubic }, // Cornered -> Double-Take Realization (46.4–47.7s)!
  { t: 47.7, x: 270, y: FLOOR_1 + 65 },
  { t: 48.2, x: 300, y: FLOOR_1 + 65, ease: easeInOutCubic }, // Crouch-lift & snap `| | + : = :||`!
  { t: 51.5, x: 300, y: FLOOR_1 + 65 }, // Brace & deflect Boss beam -> Shocked Boss!
  { t: 53.6, x: 590, y: FLOOR_1 + 65, ease: easeInCubic }, // Sprint with `A + ♯ = A♯`!
  { t: 54.45, x: computeContactX(795, 1, CONTACT_REACH.KICK, 20), y: FLOOR_1 + 10, ease: easeSnap }, // EXACT FLUSH UPPERCUT KICK!
  { t: 57.2, x: 320, y: VINYL_CY, ease: easeInOutCubic }, // Launch UP into Stage 2 wave!

  // ---- ACT V (57.2–74s): WAVE SURFING -> VINYL DJ REWIND -> EQ PARKOUR -> BASS +12dB MAX! ----
  { t: 59.1, x: 435, y: VINYL_CY + 24, ease: easeInOutCubic }, // Surfs sound wave as it coils into Vinyl!
  { t: 59.8, x: 410, y: VINYL_CY + 20, ease: easeInOutCubic },
  { t: 62.3, x: 380, y: VINYL_CY + 52, ease: easeInOutCubic }, // DJ Rewind scrubbing Boss's notes back!
  { t: 63.8, x: 830, y: EQ_CONSOLE_Y + 130, ease: easeInOutCubic }, // Parkour HIGH
  { t: 65.1, x: 540, y: EQ_CONSOLE_Y + 110, ease: easeInOutCubic }, // Parkour MID
  { t: 66.4, x: 250, y: EQ_CONSOLE_Y + 215, ease: easeInOutCubic }, // Grab BASS fader cap!
  { t: 69.2, x: 250, y: EQ_CONSOLE_Y + 35, ease: easeOutCubic }, // Shove BASS +12dB MAX!
  { t: 70.6, x: 540, y: S2_Y + 820, ease: easeOutCubic },
  { t: 74.0, x: 540, y: S3_Y + 460, ease: easeInOutCubic }, // Rocket UP to Stage 3!

  // ---- ACT VI (74–90s): `⁀ + • = 𝄐` FERMATA -> DOUBLE-TAKE `C + ♯ = C♯` -> `A MAJOR fff` HARMONY! ----
  { t: 76.2, x: 540, y: S3_Y + 420 },
  { t: 78.0, x: 540, y: S3_Y + 885, ease: easeInCubic }, // Slam Fermata `𝄐`!
  { t: 80.2, x: 425, y: S3_Y + 690, ease: easeInOutCubic }, // Double-Take looking at Frozen Boss -> `Am` -> `♯`!
  { t: 82.8, x: 500, y: S3_Y + 668, ease: easeInOutCubic }, // Slap golden `♯` onto `C` -> `C♯`!
  { t: 83.65, x: 540, y: S3_Y + 695, ease: easeOutCubic },
  { t: 84.0, x: 540, y: S3_Y + 1095, ease: easeSnap }, // FINAL `A MAJOR fff` METEOR KICK!
  { t: 85.6, x: 430, y: S3_Y + 1320, ease: easeOutCubic }, // Peaceful landing beside calm golden Metronome!
  { t: 90.0, x: 430, y: S3_Y + 1320 },
];

export const PULSE_V3_HOPS: HopArc[] = [
  [3.65, 4.1, 64], // Startled curiosity recoil hop!
  [7.9, 9.1, 275], // Octave ×2 Hz jump!
  [11.0, 11.45, 75], [11.45, 11.9, 85],
  [14.0, 14.45, 75], [14.45, 14.9, 85],
  [17.0, 17.45, 75], [17.45, 17.9, 85],
  [20.0, 20.45, 75], [20.45, 20.9, 85],
  [24.0, 25.0, 125], [25.0, 26.0, 125], [26.0, 27.0, 150], [27.0, 28.0, 150],
  [28.5, 29.5, 140], [29.5, 30.0, 110], [31.5, 33.5, 210],
  [36.0, 36.5, 75], [36.5, 37.0, 75], [37.0, 37.5, 75], [37.5, 38.0, 75],
  [39.25, 39.65, 72], // Flung back by Boss pendulum!
  [41.7, 42.5, 180], [42.7, 43.5, 180], [43.7, 44.5, 180], [44.7, 45.5, 180], [45.8, 46.4, 140],
  [47.4, 47.72, 42], // Tiny lightbulb realization hop before `:||`!
  [53.85, 54.65, 42], // Flush chest-level uppercut leap!
  [62.4, 63.8, 170], [63.9, 65.1, 160], [65.2, 66.4, 160],
];

const ANTICIPATION_TIMES = [7.88, 31.45, 53.8, 62.35, 83.62];
const LANDING_TIMES = [
  2.0, 4.1, 9.1, 11.9, 14.9, 17.9, 20.9, 28.0, 29.5, 30.0, 33.5,
  39.65, 42.5, 43.5, 44.5, 45.5, 46.4, 63.8, 65.1, 66.4, 85.6,
];

const BOSS_RECOIL_HITS: RecoilHit[] = [
  { at: 49.95, dx: 54, dy: -26, decay: 7.5 }, // Smacked by `:||` golden reflection!
  { at: 54.45, dx: 36, dy: -98, decay: 6.0 }, // Uppercutted UP into Stage 2!
  { at: 61.2, dx: 42, dy: -18, decay: 8.0 }, // Bonked by his own DJ-rewound notes!
  { at: 69.25, dx: 24, dy: -84, decay: 6.5 }, // Blasted UP by BASS +12dB!
  { at: 84.0, dx: 0, dy: 96, decay: 5.5 }, // `A MAJOR fff` meteor transformation!
];

const CAMERA_KEYS: CameraKeyframe[] = [
  { t: 0.0, fx: 410, fy: S1_Y + 860, zoom: 1.3 },
  { t: 2.6, fx: 490, fy: S1_Y + 930, zoom: 1.16, ease: easeInOutCubic },
  { t: 5.5, fx: 540, fy: S1_Y + 950, zoom: 1.05, ease: easeInOutCubic },
  { t: 37.8, fx: 540, fy: S1_Y + 950, zoom: 1.04 },
  { t: 39.2, fx: 600, fy: S1_Y + 940, zoom: 1.1, ease: easeInOutCubic }, // Slight zoom on Metronome reveal!
  { t: 41.2, fx: 540, fy: S1_Y + 960, zoom: 1.03, ease: easeInOutCubic },
  { t: 54.45, fx: 540, fy: S1_Y + 960, zoom: 1.04 },
  { t: 57.8, fx: 540, fy: S2_Y + 960, zoom: 1.04, ease: easeInOutCubic }, // Continuous track UP to Stage 2!
  { t: 70.2, fx: 540, fy: S2_Y + 960, zoom: 1.04 },
  { t: 74.0, fx: 540, fy: S3_Y + 960, zoom: 1.12, ease: easeInOutCubic }, // Continuous track UP to Stage 3!
  { t: 81.5, fx: 540, fy: S3_Y + 940, zoom: 1.18, ease: easeInOutCubic }, // Tighten for `Am -> A MAJOR`!
  { t: 84.1, fx: 540, fy: S3_Y + 960, zoom: 1.06, ease: easeSnap },
  { t: 86.2, fx: 540, fy: S3_Y + 960, zoom: 1.0, ease: easeOutCubic },
];

const SHAKE_BURSTS: ShakeBurst[] = [
  { at: realTimeOf(2.0, BBV3_HIT_STOPS), amp: 14 },
  { at: realTimeOf(38.0, BBV3_HIT_STOPS), amp: 18 },
  { at: realTimeOf(49.95, BBV3_HIT_STOPS), amp: 20 },
  { at: realTimeOf(54.45, BBV3_HIT_STOPS), amp: 26 },
  { at: realTimeOf(69.2, BBV3_HIT_STOPS), amp: 24 },
  { at: realTimeOf(84.0, BBV3_HIT_STOPS), amp: 36, decay: 7.5 },
];

function waveFloorY(wx: number, t: number): number {
  return VINYL_CY + Math.sin(wx * 0.014 - t * 11) * 58;
}

export function pulseV3PosAt(t: number): Vec2 {
  const base = evalPath(PULSE_V3_PATH, t);
  if (t >= 57.3 && t < 59.0) {
    // Dynamic waveform surfing powered by V3 `evalSurfaceAnchor`!
    const surf = evalSurfaceAnchor(base.x, t, waveFloorY);
    const blend = Math.sin(clamp01((t - 57.3) / 1.7) * Math.PI);
    return { x: base.x, y: lerp(base.y, surf.y, blend) };
  }
  return { x: base.x, y: base.y - evalHopArcs(PULSE_V3_HOPS, t) };
}

export function isPulseV3Airborne(t: number): boolean {
  const hopH = evalHopArcs(PULSE_V3_HOPS, t);
  return t < 2.0 || hopH > 12 || (t >= 54.45 && t < 57.3) || (t >= 69.3 && t < 85.2);
}

function rawPulseV3PoseAt(t: number): StickmanPose {
  const k = computeKinematics(pulseV3PosAt, t, 1);
  const airborne = isPulseV3Airborne(t);
  const isFrozen = t >= 78.0 && t < 84.0;
  const beatPulse = isFrozen ? 0 : Math.exp(-((t % 0.5) / 0.5) * 6.5);

  let surfaceSlopeRad = 0;
  if (t >= 57.3 && t < 59.0) {
    surfaceSlopeRad = evalSurfaceAnchor(k.x, t, waveFloorY).slopeRad;
  }

  let bodyRotation = 0;
  if (t < 2.0) bodyRotation = clamp01((t - 1.15) / 0.85) * Math.PI * 2;
  else if (t >= 31.8 && t < 33.2) bodyRotation = clamp01((t - 31.8) / 1.4) * Math.PI * 2;
  else if (t >= 54.7 && t < 57.1) bodyRotation = clamp01((t - 54.7) / 2.4) * Math.PI * 2;

  // Expressive V3 Emotions (now work mid-run & mid-jump too!)
  let emotion: StickmanEmotion = "neutral";
  if (t >= 2.6 && t < 3.45) emotion = "curious";
  else if (t >= 3.65 && t < 4.35) emotion = "shocked"; // Mid-air startled recoil hop!
  else if (t >= 24.0 && t < 35.5) emotion = "celebrate";
  else if (t >= 38.0 && t < 38.55) emotion = "shocked"; // Freeze staring up at giant Metronome!
  else if (t >= 39.25 && t < 40.35) emotion = "shocked"; // Panic-flail sprint backward!
  else if (t >= 40.5 && t < 41.8) emotion = "determined";
  else if (t >= 86.2) emotion = "celebrate";

  // Sustained Crouch for floor pokes & barline pickup!
  let crouch = 0;
  if (t >= 3.1 && t < 3.65) crouch = 0.42;
  else if (t >= 47.9 && t < 48.6) crouch = 0.58;

  // Active Gaze Tracking (`lookTarget`) including TWO Alan Becker Double-Take sequences!
  let lookTarget: Vec2 | null = { x: 810, y: FLOOR_1 - 120 };
  if (t < 10.5) lookTarget = { x: 540, y: FLOOR_1 - 85 };
  else if (t < 23.0) lookTarget = { x: 520, y: FLOOR_1 - 240 };
  else if (t >= 46.4 && t < 46.75) lookTarget = { x: 820, y: FLOOR_1 - 140 }; // Double-Take 1: Boss
  else if (t >= 46.75 && t < 47.15) lookTarget = { x: 350, y: FLOOR_1 - 40 }; // Double-Take 1: Floor barlines
  else if (t >= 47.15 && t < 47.55) lookTarget = { x: 820, y: FLOOR_1 - 140 }; // Double-Take 1: Back to Boss!
  else if (t >= 58.0 && t < 64.0) lookTarget = { x: 740, y: VINYL_CY - 80 };
  else if (t >= 66.0 && t < 70.0) lookTarget = { x: 250, y: EQ_CONSOLE_Y + 30 };
  else if (t >= 79.6 && t < 80.1) lookTarget = { x: 540, y: S3_Y + 1140 }; // Double-Take 2: Frozen Boss
  else if (t >= 80.1 && t < 80.7) lookTarget = { x: 540, y: S3_Y + 490 }; // Double-Take 2: Floating `Am` triad
  else if (t >= 80.7 && t < 81.2) lookTarget = { x: 540, y: S3_Y + 1140 }; // Double-Take 2: Back to Boss -> Lightbulb!
  else if (t >= 85.8) lookTarget = { x: 670, y: S3_Y + 1160 }; // Warm nod to golden Harmony Metronome!

  // Dual World-Space Hand IK Locks (including floor-level reach!)
  let rightHandWorld: Vec2 | null = null;
  let leftHandWorld: Vec2 | null = null;
  if (t >= 3.3 && t < 3.65) rightHandWorld = { x: 515, y: FLOOR_1 - 28 }; // Crouch-poke `♩` near taut string!
  else if (t >= 5.5 && t < 7.3) rightHandWorld = { x: 548, y: FLOOR_1 - 125 }; // Test `♯` & `♭`
  else if (t >= 48.0 && t < 49.3) {
    leftHandWorld = { x: 345, y: FLOOR_1 - 24 };
    rightHandWorld = { x: 392, y: FLOOR_1 - 80 }; // Two-handed `:||` assembly!
  } else if (t >= 59.8 && t < 62.3) {
    rightHandWorld = { x: 465, y: VINYL_CY + 10 + Math.sin(t * 20) * 18 }; // Physically scrubbing the Vinyl record!
  } else if (t >= 66.4 && t < 69.2) {
    leftHandWorld = { x: 240, y: k.y - 54 };
    rightHandWorld = { x: 262, y: k.y - 54 }; // Two-hand shove on BASS fader!
  } else if (t >= 82.6 && t < 83.4) rightHandWorld = { x: 540, y: S3_Y + 478 }; // Slap golden `♯` onto `C`!

  let action: StickmanAction = "none";
  let actionProgress = 0;
  if (t >= 38.55 && t < 39.25) action = "push"; // Over-commitment "Uh-Oh" trying to push Boss back!
  else if (t >= 49.6 && t < 51.3) action = "brace";
  else if (t >= 54.15 && t < 54.7) action = "kick"; // Flush `A♯ ↑` uppercut kick!
  else if (t >= 66.4 && t < 69.2) action = "push";
  else if (t >= 83.85 && t < 84.45) action = "kick"; // Climax meteor kick!
  else if (t >= 86.4) action = "victory";

  const headShake = t >= 4.2 && t < 4.75 ? Math.sin(((t - 4.2) / 0.55) * Math.PI) : 0;
  const recoil = evalDecayPulses([39.22], t, 0.35, "after");

  return synthesizePhysicsPose({
    x: k.x,
    y: k.y,
    vx: k.vx,
    vy: k.vy,
    ax: k.ax, // Automatic heel-plant skid braking!
    facing: t >= 39.25 && t < 40.35 ? -1 : k.facing,
    airborne,
    t,
    beatPulse,
    lookTarget,
    leftHandWorld,
    rightHandWorld,
    crouch,
    anticipation: evalDecayPulses(ANTICIPATION_TIMES, t, 0.16, "before"),
    squash: evalDecayPulses(LANDING_TIMES, t, 0.24, "after"),
    recoil,
    headShake,
    bodyRotation,
    surfaceSlopeRad,
    emotion,
    action,
    actionProgress,
  });
}

export const BeatbreakerV3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const realT = frame / fps;
  const { animT: t } = applyHitStops(realT, BBV3_HIT_STOPS);

  const isFrozen = t >= 78.0 && t < 84.0;
  const isHarmony = t >= 84.6;
  const isScratchRewind = t >= 59.8 && t < 62.3;
  const beatPulse = isFrozen ? 0 : Math.exp(-((t % 0.5) / 0.5) * 6.5);

  const climaxRealT = realTimeOf(84.0, BBV3_HIT_STOPS);
  const isImpactFrame = realT >= climaxRealT && realT < climaxRealT + 0.048;

  const cam = evalCamera(CAMERA_KEYS, t);
  const shake = computeCameraShake(realT, SHAKE_BURSTS);
  const camTransform = buildCamTransform(cam, shake, BBV3_WIDTH, BBV3_HEIGHT);

  const smoothNow = smoothSynthesizedPose(rawPulseV3PoseAt, t, 0.038);
  const smoothPrev = smoothSynthesizedPose(rawPulseV3PoseAt, Math.max(0, t - 0.025), 0.038);
  const pulsePose = applySecondaryMotion(smoothNow, smoothPrev, 0.025);
  const rig = solveStickmanRig(pulsePose);

  const powerBoost =
    t >= 52.0 && t < 55.6
      ? 0.55
      : t >= 69.0 && t < 74.0
        ? 0.85
        : t >= 82.8 && t < 86.2
          ? 1.0
          : 0;

  // Articulated Boss Trajectory + Directional Recoil (`evalRecoilOffset`)
  const bossAssemble = t < 38.0 ? 0 : easeOutBack(clamp01((t - 38.0) / 0.75));
  let baseBossX = 815;
  let baseBossY = FLOOR_1 - 24;
  if (t >= 54.45 && t < 58.0) {
    const u = easeInOutCubic((t - 54.45) / 3.55);
    baseBossX = lerp(815, 760, u);
    baseBossY = lerp(FLOOR_1 - 24, VINYL_CY - 82, u);
  } else if (t >= 58.0 && t < 69.2) {
    baseBossX = 760 + Math.sin(t * 2.2) * 28;
    baseBossY = VINYL_CY - 82 + Math.sin(t * 3.1) * 16;
  } else if (t >= 69.2 && t < 74.0) {
    const u = easeInOutCubic((t - 69.2) / 4.8);
    baseBossX = lerp(760, 540, u);
    baseBossY = lerp(VINYL_CY - 82, S3_Y + 1140, u);
  } else if (t >= 74.0 && t < 85.0) {
    baseBossX = 540;
    baseBossY = S3_Y + 1140 + (isFrozen ? 0 : Math.sin(t * 4.5) * 12);
  } else if (t >= 85.0) {
    const u = easeOutCubic(clamp01((t - 85.0) / 1.0));
    baseBossX = lerp(540, 680, u);
    baseBossY = lerp(S3_Y + 1140, S3_Y + 1255, u) + Math.sin(t * 3.14) * 10;
  }

  const bossRecoil = evalRecoilOffset(t, BOSS_RECOIL_HITS);
  const bossX = baseBossX + bossRecoil.x;
  const bossY = baseBossY + bossRecoil.y;

  // Living Boss State Machine (includes telegraph wind-ups & comedic shock!)
  let bossMode: BossMoodV3 = "awake";
  if (t < 38.75) bossMode = "assembling";
  else if (isHarmony) bossMode = "harmony";
  else if (isFrozen) bossMode = "frozen";
  else if ((t >= 49.95 && t < 51.3) || (t >= 60.7 && t < 62.5)) bossMode = "shocked"; // Comedic shock on `:||` & DJ Rewind!
  else if ((t >= 49.2 && t < 49.6) || (t >= 63.75 && t < 64.1) || (t >= 65.05 && t < 65.4)) bossMode = "telegraph";
  else if (t >= 58.0 && t < 78.0) bossMode = "overdrive";

  const latestBossHitT = BOSS_RECOIL_HITS.reduce((acc, h) => (t >= h.at ? h.at : acc), -10);
  const pendulumFreq = bossMode === "overdrive" ? 9.42 : bossMode === "harmony" ? 3.14 : 6.28;
  const pendulumDeg = isFrozen ? 28 : Math.sin(t * pendulumFreq) * (bossMode === "overdrive" ? 42 : bossMode === "harmony" ? 22 : 32);

  // Taut 440Hz String with genuine V3 `springImpulse` vibration on landing & poke!
  const stringPluck =
    springImpulse(t, 2.0, 5.5, 36) * 44 +
    springImpulse(t, 3.45, 7.5, 42) * 26 +
    springImpulse(t, 5.75, 8.0, 48) * 18;
  const singleStringD = `M 80 ${FLOOR_1} Q 540 ${FLOOR_1 + stringPluck} 1000 ${FLOOR_1}`;

  const pianoUnfold = t < 23.0 ? 0 : easeOutBack(clamp01((t - 23.0) / 0.95));
  let activePianoKey = -1;
  if (t >= 24.0 && t < 35.8) {
    const seq = [2, 1, 0, 4, 2, 3, 5, 4, 2, 0, 4, 5];
    activePianoKey = seq[Math.floor((t - 24.0) / 0.95) % seq.length];
  } else if (t >= 42.3 && t < 42.75) activePianoKey = 2;
  else if (t >= 43.3 && t < 43.75) activePianoKey = 3;
  else if (t >= 44.3 && t < 44.75) activePianoKey = 2;
  else if (t >= 45.3 && t < 45.75) activePianoKey = 4;

  const drumFlash = {
    kick: clamp01(1 - (t - 28.0) / 1.1) * (t >= 28.0 ? 1 : 0),
    snare: clamp01(1 - (t - 29.5) / 1.1) * (t >= 29.5 ? 1 : 0),
    hihat: clamp01(1 - (t - 30.0) / 1.1) * (t >= 30.0 ? 1 : 0),
  };

  const vinylCoil = t < 58.1 ? 0 : smoothstep((t - 58.1) / 0.95);
  const vinylSpin = isScratchRewind
    ? 480 - (t - 59.8) * 380 + Math.sin((t - 59.8) * 28) * 42
    : t * 92;
  const bassLevel = t < 66.4 ? 0 : clamp01((t - 66.4) / 2.8);

  const pianoTargets = [
    { hitT: 42.5, x: 420, type: "beamed" as const },
    { hitT: 43.5, x: 575, type: "eighth" as const },
    { hitT: 44.5, x: 420, type: "beamed" as const },
    { hitT: 45.5, x: 675, type: "quarter" as const },
  ];

  const currentChordIdx =
    t >= 11.0 && t < 23.0
      ? FOUR_CHORDS.findIndex((c) => t >= c.start && t < c.end)
      : t >= 23.8 && t < 36.0
        ? Math.floor((t - 23.8) / 2.0) % 4
        : -1;

  let chapterText = "I. DISCOVERING SOUND";
  if (t >= 11.0 && t < 23.0) chapterText = "II. BUILDING CHORDS";
  else if (t >= 23.0 && t < 36.0) chapterText = "III. MAKING A SONG";
  else if (t >= 36.0 && t < 57.5) chapterText = "IV. THE METRONOME";
  else if (t >= 57.5 && t < 74.0) chapterText = "V. VINYL & BASS EQ";
  else if (t >= 74.0) chapterText = "VI. Am  →  A MAJOR";

  const countInNum = t >= 82.0 && t < 84.0 ? Math.floor((t - 82.0) / 0.5) + 1 : 0;
  const titleOpacity = t >= 86.2 ? smoothstep((t - 86.2) / 0.9) : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: isImpactFrame ? "#FFFFFF" : "#000000" }}>
      <Audio key="beatbreaker-v3-ost" src={staticFile("sfx/beatbreaker-v3-ost.mp3")} volume={1.0} />

      <svg width={BBV3_WIDTH} height={BBV3_HEIGHT} viewBox="0 0 1080 1920" style={{ display: "block" }}>
        <GlowFilterDefs />
        <rect x={0} y={0} width={1080} height={1920} fill={isImpactFrame ? "#FFFFFF" : "#000000"} />

        {/* Subtle Acoustic Pulse Halo */}
        {!isImpactFrame && t >= 12.4 && t < 88.0 && (
          <circle
            cx={540}
            cy={960}
            r={340 + beatPulse * 62}
            fill="none"
            stroke={isHarmony || isFrozen ? "#FACC15" : t >= 38 && t < 74 ? "#F43F5E" : "#38BDF8"}
            strokeWidth={2}
            opacity={0.14 + beatPulse * 0.16}
          />
        )}

        {/* Top Chapter HUD (delayed cleanly past opening portal zoom!) */}
        {t >= 2.4 && t < 85.6 && !isImpactFrame && (
          <text
            x={540}
            y={128}
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
            fontWeight={800}
            fontSize={24}
            letterSpacing={5}
            fill="#64748B"
            opacity={smoothstep((t - 2.4) / 0.4)}
          >
            {chapterText}
          </text>
        )}

        {/* Live 4-Chord DAW Progression Tracker HUD (11s–36s) */}
        {t >= 11.0 && t < 36.2 && !isImpactFrame && (
          <g transform="translate(540, 215)" opacity={t > 35.4 ? 1 - smoothstep((t - 35.4) / 0.8) : smoothstep((t - 11.0) / 0.4)}>
            {FOUR_CHORDS.map((ch, idx) => {
              const unlocked = t >= ch.start;
              const active = idx === currentChordIdx;
              const bx = (idx - 1.5) * 180;
              return (
                <g key={ch.name} transform={`translate(${bx}, 0)`} opacity={unlocked ? 1 : 0.2}>
                  <rect
                    x={-68}
                    y={-34}
                    width={136}
                    height={68}
                    rx={14}
                    fill={active ? ch.color : "#070B14"}
                    stroke={unlocked ? ch.color : "#334155"}
                    strokeWidth={active ? 4 : 2}
                    filter={active ? "url(#cyan-glow)" : undefined}
                  />
                  <text x={0} y={12} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight={900} fontSize={34} fill={active ? "#000000" : unlocked ? "#FFFFFF" : "#475569"}>
                    {ch.name}
                  </text>
                </g>
              );
            })}
            {t >= 23.8 && (
              <g transform="translate(0, 76)">
                {[
                  { label: "PIANO", on: t >= 23.8, c: "#7DD3FC" },
                  { label: "KICK", on: t >= 28.0, c: "#FACC15" },
                  { label: "SNARE", on: t >= 29.5, c: "#FB7185" },
                  { label: "HI-HAT", on: t >= 30.0, c: "#34D399" },
                ].map((trk, i) => (
                  <g key={trk.label} transform={`translate(${(i - 1.5) * 168}, 0)`} opacity={trk.on ? 1 : 0.18}>
                    <rect x={-64} y={-20} width={128} height={40} rx={20} fill="#050810" stroke={trk.on ? trk.c : "#334155"} strokeWidth={2} />
                    <text x={0} y={7} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight={800} fontSize={18} fill={trk.on ? trk.c : "#475569"}>
                      {trk.on ? `● ${trk.label}` : trk.label}
                    </text>
                  </g>
                ))}
              </g>
            )}
          </g>
        )}

        {/* ==================== CONTINUOUS VERTICAL TOWER WORLD ==================== */}
        <g transform={camTransform}>
          {/* ---------- STAGE 1: 440Hz STRING -> 4 CHORDS -> 3D GRAND PIANO DUEL ---------- */}
          <g>
            <AudioPortalV3
              x={300}
              y={S1_Y + 420}
              openProgress={t < 0.4 ? 0 : t < 2.2 ? easeOutBack(clamp01((t - 0.4) / 0.45)) : 1 - smoothstep((t - 2.2) / 0.5)}
              time={t}
            />

            {/* Single Vibrating 440 Hz String (3 unfiltered strokes — zero bbox filter bug!) */}
            {t < 24.0 && (
              <g opacity={1 - pianoUnfold}>
                <path d={singleStringD} fill="none" stroke="#38BDF8" strokeWidth={11} opacity={0.26} strokeLinecap="round" />
                <path d={singleStringD} fill="none" stroke="#7DD3FC" strokeWidth={4} strokeLinecap="round" />
                <path d={singleStringD} fill="none" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" />
                {t >= 2.0 && t < 3.4 && (
                  <text x={540} y={FLOOR_1 + 78} textAnchor="middle" fontFamily={MUSIC_FONT} fontStyle="italic" fontSize={38} fill="#7DD3FC" filter="url(#cyan-glow)">
                    440 Hz  (A)
                  </text>
                )}
              </g>
            )}

            {/* 1. Curiosity Loop: `♩ = ♪ + ♪` with elastic spring bounce! (2.1s–5.2s) */}
            {t >= 2.1 && t < 5.2 && (
              <g>
                {t < 3.45 ? (
                  <VectorNoteV3 x={520} y={FLOOR_1 - 36} type="quarter" pitchLabel="♩" color="#7DD3FC" scale={easeOutBack(clamp01((t - 2.1) / 0.35))} bounceAt={3.35} time={t} />
                ) : (
                  <g>
                    <VectorNoteV3 x={lerp(520, 465, easeOutCubic(clamp01((t - 3.45) / 0.35)))} y={FLOOR_1 - 82} type="eighth" color="#7DD3FC" scale={1.1} bounceAt={3.45} time={t} />
                    <VectorNoteV3 x={lerp(520, 605, easeOutCubic(clamp01((t - 3.45) / 0.35)))} y={FLOOR_1 - 82} type="eighth" color="#7DD3FC" scale={1.1} bounceAt={3.45} time={t} />
                    <text x={535} y={FLOOR_1 - 215} textAnchor="middle" fontFamily={MUSIC_FONT} fontWeight={700} fontSize={44} fill="#FFFFFF" filter="url(#cyan-glow)">
                      ♩  =  ♪ + ♪
                    </text>
                  </g>
                )}
              </g>
            )}

            {/* 2. Pitch & Octave Discovery (5.2s–10.7s) */}
            {t >= 5.2 && t < 7.9 && (() => {
              const isSharp = t >= 5.75 && t < 7.05;
              const ny = isSharp ? FLOOR_1 - 145 : FLOOR_1 - 85;
              return (
                <g>
                  <VectorNoteV3 x={565} y={ny} type="quarter" pitchLabel={isSharp ? "A♯" : "A"} color={isSharp ? "#FACC15" : "#7DD3FC"} scale={1.15} glow={isSharp ? "url(#gold-glow)" : "url(#cyan-glow)"} bounceAt={isSharp ? 5.75 : 7.05} time={t} />
                  {t >= 5.5 && t < 6.7 && <VectorAccidentalV3 x={515} y={ny} kind="sharp" scale={1.25} color="#FACC15" />}
                  {t >= 6.8 && t < 7.8 && <VectorAccidentalV3 x={515} y={ny} kind="flat" scale={1.25} color="#C084FC" />}
                  <text x={540} y={FLOOR_1 - 255} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight={900} fontSize={42} fill={isSharp ? "#FACC15" : "#C084FC"}>
                    {t < 6.75 ? "A + ♯  =  A♯ ↑" : "A♯ + ♭  =  A ↓"}
                  </text>
                </g>
              );
            })()}

            {t >= 8.0 && t < 10.7 && (
              <g opacity={t > 10.0 ? 1 - smoothstep((t - 10.0) / 0.6) : 1}>
                <VectorNoteV3 x={430} y={FLOOR_1 - 95} type="quarter" pitchLabel="A4" color="#7DD3FC" scale={1.0} />
                <VectorNoteV3 x={650} y={FLOOR_1 - 250} type="quarter" pitchLabel="A5" color="#FACC15" scale={easeOutBack(clamp01((t - 8.2) / 0.35)) * 1.2} glow="url(#gold-glow)" bounceAt={8.2} time={t} />
                <text x={540} y={FLOOR_1 - 465} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight={900} fontSize={42} fill="#FACC15" filter="url(#gold-glow)">
                  440 Hz × 2  =  OCTAVE!
                </text>
              </g>
            )}

            {/* 3. Building 4 Chords (`Am -> F -> C -> G`, cleanly elevated above Pulse's head!) */}
            {FOUR_CHORDS.map((ch) => {
              if (t < ch.start || t >= ch.end) return null;
              const dt = t - ch.start;
              return (
                <g key={ch.name} opacity={dt > 2.6 ? 1 - (dt - 2.6) / 0.4 : 1}>
                  <VectorNoteV3 x={340} y={FLOOR_1 - 185} type="quarter" pitchLabel={ch.notes[0]} color={ch.color} scale={easeOutBack(clamp01(dt / 0.25))} bounceAt={ch.start} time={t} />
                  {dt >= 0.45 && <VectorNoteV3 x={520} y={FLOOR_1 - 225} type="quarter" pitchLabel={ch.notes[1]} color={ch.color} scale={easeOutBack(clamp01((dt - 0.45) / 0.25))} bounceAt={ch.start + 0.45} time={t} />}
                  {dt >= 0.9 && <VectorNoteV3 x={700} y={FLOOR_1 - 265} type="quarter" pitchLabel={ch.notes[2]} color={ch.color} scale={easeOutBack(clamp01((dt - 0.9) / 0.25))} bounceAt={ch.start + 0.9} time={t} />}
                  {dt >= 1.2 && (
                    <text x={520} y={FLOOR_1 - 375} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight={900} fontSize={48} fill={ch.color} filter="url(#gold-glow)">
                      {ch.formula}
                    </text>
                  )}
                  {dt >= 1.45 && (
                    <MusicNoteBurstV3 x={520} y={FLOOR_1 - 225} progress={clamp01((dt - 1.45) / 1.1)} seedOffset={ch.start * 7} count={14} radius={220} color={ch.color} secondaryColor="#FFFFFF" />
                  )}
                </g>
              );
            })}

            {/* 3D Concert Grand Piano Unfolding + Interactive Drum Pads */}
            {pianoUnfold > 0.01 && (
              <g transform={`translate(540, ${FLOOR_1}) scale(${lerp(0.35, 1, pianoUnfold)}, ${pianoUnfold}) translate(-540, ${-FLOOR_1})`}>
                <ConcertGrandPianoV3 yTop={FLOOR_1} activeKeyIndex={activePianoKey} beatPulse={beatPulse} time={t} drumFlash={drumFlash} />
              </g>
            )}

            {/* Joyful Floating Jam Notes (24s–35.8s) */}
            {t >= 24.0 && t < 35.8 && (
              <g>
                {[0, 1, 2, 3, 4, 5].map((i) => {
                  const spawn = 24.0 + i * 1.8;
                  if (t < spawn || t > spawn + 2.2) return null;
                  const p = (t - spawn) / 2.2;
                  const ch = FOUR_CHORDS[i % 4];
                  return (
                    <VectorNoteV3
                      key={`jam-${i}`}
                      x={240 + ((i * 157) % 580)}
                      y={lerp(FLOOR_1 - 80, FLOOR_1 - 460, p)}
                      type={i % 2 === 0 ? "beamed" : "eighth"}
                      color={ch.color}
                      scale={0.95}
                      opacity={Math.sin(p * Math.PI)}
                    />
                  );
                })}
              </g>
            )}

            {/* 4. Over-Commitment Twist (36.0s–38.8s): `4/4 → ♩ = 120` Assembles Metronome! */}
            {t >= 36.0 && t < 38.8 && (
              <g opacity={t > 38.0 ? 1 - smoothstep((t - 38.0) / 0.6) : 1}>
                {[0, 1, 2, 3].map((idx) => {
                  const spawnT = 36.0 + idx * 0.5;
                  if (t < spawnT) return null;
                  const foldP = t >= 37.6 ? easeInCubic(clamp01((t - 37.6) / 0.45)) : 0;
                  const bx = lerp(240 + idx * 185, 815, foldP);
                  const by = lerp(FLOOR_1 - 220, FLOOR_1 - 40, foldP);
                  return (
                    <g key={idx}>
                      <GlowLine x1={bx} y1={by - 70} x2={bx} y2={by + 70} color="#FB7185" width={7} />
                      <text x={bx} y={by - 95} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight={900} fontSize={36} fill="#FB7185">
                        {idx + 1}
                      </text>
                    </g>
                  );
                })}
                {t >= 37.3 && (
                  <text x={540} y={FLOOR_1 - 390} textAnchor="middle" fontFamily={MUSIC_FONT} fontWeight={900} fontSize={54} fill="#FB7185" filter="url(#magenta-glow)">
                    4/4  →  ♩ = 120
                  </text>
                )}
              </g>
            )}

            {/* Piano Anti-Air Battle (41.5s–46.5s) */}
            {pianoTargets.map((pt, idx) => {
              const dropStart = pt.hitT - 0.9;
              if (t >= dropStart && t < pt.hitT) {
                const p = (t - dropStart) / 0.9;
                return <VectorNoteV3 key={`pt-${idx}`} x={pt.x} y={lerp(FLOOR_1 - 680, FLOOR_1 - 280, p * p)} type={pt.type} color="#FB7185" scale={1.25} glow="url(#magenta-glow)" />;
              }
              if (t >= pt.hitT && t < pt.hitT + 0.55) {
                const blastP = (t - pt.hitT) / 0.55;
                return (
                  <g key={`ptb-${idx}`}>
                    <GlowLine x1={pt.x} y1={FLOOR_1} x2={pt.x} y2={FLOOR_1 - 320} color="#7DD3FC" width={16 * (1 - blastP)} opacity={1 - blastP} />
                    <MusicNoteBurstV3 x={pt.x} y={FLOOR_1 - 280} progress={blastP} seedOffset={30 + idx * 17} count={14} radius={185} color="#7DD3FC" secondaryColor="#FB7185" />
                  </g>
                );
              }
              return null;
            })}

            {/* Double-Take -> Assemble `| | + : = :||` Reflector (47.8s–51.8s) */}
            {t >= 47.8 && t < 49.3 && (() => {
              const merge = easeInOutCubic(clamp01((t - 48.2) / 0.9));
              return (
                <g>
                  <GlowLine x1={lerp(295, 368, merge)} y1={FLOOR_1 - 155} x2={lerp(295, 368, merge)} y2={FLOOR_1 + 55} color="#FFFFFF" width={4} />
                  <GlowLine x1={lerp(345, 386, merge)} y1={FLOOR_1 - 155} x2={lerp(345, 386, merge)} y2={FLOOR_1 + 55} color="#38BDF8" width={9} />
                  <circle cx={lerp(475, 412, merge)} cy={FLOOR_1 - 85} r={11} fill="#FACC15" filter="url(#gold-glow)" />
                  <circle cx={lerp(475, 412, merge)} cy={FLOOR_1 - 15} r={11} fill="#FACC15" filter="url(#gold-glow)" />
                  <text x={388} y={FLOOR_1 - 210} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight={900} fontSize={32} fill="#7DD3FC">
                    | |  +  :  =  :||
                  </text>
                </g>
              );
            })()}

            <RepeatReflectorV3
              x={386}
              y={FLOOR_1 - 50}
              lit={t >= 49.95 && t < 51.3}
              opacity={t >= 49.2 && t < 51.8 ? Math.min(smoothstep((t - 49.2) / 0.2), 1 - smoothstep((t - 51.3) / 0.5)) : 0}
              hitTime={49.95}
              time={t}
            />

            {/* Jagged Energy Beams for Boss Fire + Golden Reflection! */}
            {t >= 49.6 && t < 51.1 && (
              <g>
                <JaggedBeam from={{ x: bossX - 55, y: FLOOR_1 - 52 }} to={{ x: 390, y: FLOOR_1 - 52 }} time={t} color="#FF2E63" width={8} jitter={16} />
                {t >= 49.95 && (
                  <JaggedBeam from={{ x: 390, y: FLOOR_1 - 88 }} to={{ x: bossX - 24, y: FLOOR_1 - 88 }} time={t} color="#FACC15" width={10} jitter={20} seedOffset={7} />
                )}
              </g>
            )}

            {/* `A + ♯ = A♯ ↑` Pitch-Shift Uppercut (52.0s–55.4s) */}
            {t >= 52.0 && t < 55.4 && (
              <g>
                <VectorAccidentalV3 x={rig.rightHand.x + 14} y={rig.rightHand.y} kind="sharp" scale={1.5} color="#FACC15" />
                <text x={540} y={S1_Y + 620 - Math.max(0, t - 54.45) * 160} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight={900} fontSize={48} fill="#FACC15" filter="url(#gold-glow)">
                  A  +  ♯  =  A♯ ↑
                </text>
              </g>
            )}
          </g>

          {/* ---------- STAGE 2 (57.2–74s): LIVE WAVE SURFING -> VINYL DJ REWIND -> STUDIO LED EQ ---------- */}
          <g>
            {t >= 57.0 && t < 59.3 && (
              <g opacity={1 - vinylCoil}>
                <path
                  d={Array.from({ length: 48 })
                    .map((_, i) => {
                      const wx = lerp(80, 1000, i / 47);
                      return `${i === 0 ? "M" : "L"} ${wx} ${waveFloorY(wx, t)}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke="#FB7185"
                  strokeWidth={14}
                  opacity={0.24}
                  strokeLinecap="round"
                />
                <path
                  d={Array.from({ length: 48 })
                    .map((_, i) => {
                      const wx = lerp(80, 1000, i / 47);
                      return `${i === 0 ? "M" : "L"} ${wx} ${waveFloorY(wx, t)}`;
                    })
                    .join(" ")}
                  fill="none"
                  stroke="#FB7185"
                  strokeWidth={5}
                  strokeLinecap="round"
                />
                <text x={540} y={VINYL_CY - 355} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight={800} fontSize={36} fill="#FB7185" filter="url(#magenta-glow)">
                  WAVE  →  VINYL GROOVE
                </text>
              </g>
            )}

            {vinylCoil > 0.01 && (
              <g opacity={vinylCoil}>
                <VinylAndEQArenaV3
                  cx={VINYL_CX}
                  cy={VINYL_CY}
                  radius={VINYL_R * lerp(0.4, 1, vinylCoil)}
                  spinDeg={vinylSpin}
                  isReversing={isScratchRewind}
                  bassLevel={bassLevel}
                  beatPulse={beatPulse}
                />
              </g>
            )}

            {/* Visual DJ Rewind Gag (58.8s–62.5s) */}
            {t >= 58.8 && t < 62.5 && (
              <g>
                {[0, 1, 2, 3, 4].map((idx) => {
                  const forwardP = clamp01((t - (58.8 + idx * 0.16)) / 0.9);
                  const revP = isScratchRewind ? easeInOutCubic(clamp01((t - 59.8) / 2.2)) : 0;
                  const netP = clamp01(forwardP - revP * 1.15);
                  return (
                    <VectorNoteV3
                      key={`rw-${idx}`}
                      x={lerp(bossX - 40, 390, netP)}
                      y={lerp(bossY - 70, VINYL_CY - 10 + (idx - 2) * 44, netP)}
                      type={idx % 2 === 0 ? "eighth" : "beamed"}
                      color={isScratchRewind ? "#FACC15" : "#FB7185"}
                      scale={0.95}
                      glow={isScratchRewind ? "url(#gold-glow)" : "url(#magenta-glow)"}
                    />
                  );
                })}
              </g>
            )}

            {/* Boss Vertical Jagged Lasers During EQ Parkour */}
            {t >= 64.1 && t < 64.7 && (
              <JaggedBeam from={{ x: bossX, y: bossY }} to={{ x: 830, y: EQ_CONSOLE_Y + 250 }} time={t} color="#FF2E63" width={8} opacity={Math.sin(((t - 64.1) / 0.6) * Math.PI)} />
            )}
            {t >= 65.4 && t < 66.0 && (
              <JaggedBeam from={{ x: bossX, y: bossY }} to={{ x: 540, y: EQ_CONSOLE_Y + 250 }} time={t} color="#FF2E63" width={8} opacity={Math.sin(((t - 65.4) / 0.6) * Math.PI)} seedOffset={3} />
            )}

            {t >= 62.6 && t < 65.0 && (
              <text x={540} y={EQ_CONSOLE_Y - 58} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight={900} fontSize={34} fill="#7DD3FC" opacity={smoothstep((t - 62.6) / 0.5)} filter="url(#cyan-glow)">
                SPLIT FREQ  →  BASS · MID · HIGH
              </text>
            )}

            <ShockwaveBlast cx={250} cy={EQ_CONSOLE_Y + 40} progress={clamp01((t - 69.2) / 0.9)} maxRadius={920} color="#38BDF8" />
            <ShockwaveBlast cx={250} cy={EQ_CONSOLE_Y + 40} progress={clamp01((t - 69.4) / 0.9)} maxRadius={820} color="#FACC15" />
          </g>

          {/* ---------- STAGE 3 (74–90s): `⁀ + • = 𝄐` FERMATA -> `Am + ♯ = A MAJOR fff` -> HARMONY ---------- */}
          <g>
            <FermataHarmonyVoidV3 cx={540} cy={S3_Y + 960} time={t} frozen={isFrozen} harmony={isHarmony} />

            {/* Assemble `⁀ + • = 𝄐` Fermata */}
            {t >= 74.2 && t < 84.0 && (() => {
              const merge = easeInOutCubic(clamp01((t - 75.0) / 1.0));
              const fx = t < 76.3 ? 540 : t < 78.0 ? lerp(540, rig.rightHand.x, smoothstep((t - 76.3) / 0.3)) : bossX;
              const fy = t < 76.3 ? S3_Y + 410 : t < 78.0 ? lerp(S3_Y + 410, rig.rightHand.y, smoothstep((t - 76.3) / 0.3)) : bossY - 245;
              return (
                <g filter="url(#gold-glow)">
                  <path d={`M ${fx - 44 - (1 - merge) * 80} ${fy + 10} A 44 44 0 0 1 ${fx + 44 - (1 - merge) * 80} ${fy + 10}`} fill="none" stroke="#FACC15" strokeWidth={8} strokeLinecap="round" />
                  <circle cx={fx + (1 - merge) * 90} cy={fy + 4} r={9} fill="#FFFFFF" />
                  {t < 77.4 && (
                    <text x={540} y={S3_Y + 325} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight={900} fontSize={36} fill="#FACC15">
                      ⁀  +  •  =  FERMATA (PAUSE)
                    </text>
                  )}
                </g>
              );
            })()}

            {/* Callback: `Am (A·C·E) + ♯ -> A MAJOR (A·C♯·E)` — clears cleanly BEFORE `t = 84.0`! */}
            {t >= 79.5 && t < 84.0 && (() => {
              const isMajor = t >= 83.0;
              return (
                <g opacity={smoothstep((t - 79.5) / 0.6)}>
                  <text
                    x={540}
                    y={S3_Y + 370}
                    textAnchor="middle"
                    fontFamily="system-ui, sans-serif"
                    fontWeight={900}
                    fontSize={52}
                    fill={isMajor ? "#FACC15" : "#7DD3FC"}
                    filter={isMajor ? "url(#gold-glow)" : "url(#cyan-glow)"}
                  >
                    {isMajor ? "A · C♯ · E  =  A MAJOR!" : "A · C · E  (Am)"}
                  </text>
                  <VectorNoteV3 x={390} y={S3_Y + 510} type="quarter" pitchLabel="A" color={isMajor ? "#FACC15" : "#7DD3FC"} scale={1.1} />
                  <VectorNoteV3
                    x={540}
                    y={isMajor ? S3_Y + 478 : S3_Y + 505}
                    type="quarter"
                    pitchLabel={isMajor ? "C♯" : "C"}
                    color={isMajor ? "#FACC15" : "#FB7185"}
                    scale={isMajor ? 1.32 : 1.1}
                    glow={isMajor ? "url(#gold-glow)" : "url(#magenta-glow)"}
                    bounceAt={83.0}
                    time={t}
                  />
                  <VectorNoteV3 x={690} y={S3_Y + 485} type="quarter" pitchLabel="E" color={isMajor ? "#FACC15" : "#7DD3FC"} scale={1.1} />
                  {t >= 82.0 && t < 83.4 && (
                    <VectorAccidentalV3
                      x={lerp(rig.rightHand.x, 505, easeSnap(clamp01((t - 82.5) / 0.5)))}
                      y={lerp(rig.rightHand.y, S3_Y + 478, easeSnap(clamp01((t - 82.5) / 0.5)))}
                      kind="sharp"
                      scale={1.38}
                      color="#FACC15"
                    />
                  )}
                </g>
              );
            })()}

            {/* Peaceful Golden Stage 3 Floor Line */}
            {t >= 85.0 && (
              <GlowLine x1={140} y1={S3_Y + 1320} x2={940} y2={S3_Y + 1320} color="#FACC15" width={4} opacity={smoothstep((t - 85.0) / 0.8)} />
            )}
          </g>

          {/* ---------- LIVING ARTICULATED BOSS & PULSE HERO ---------- */}
          {bossAssemble > 0.01 && (
            <MetronomeBossV3
              x={bossX}
              y={bossY}
              scale={bossAssemble}
              pendulumDeg={pendulumDeg}
              bpmLabel={bossMode === "harmony" ? "♩ = 120 ♪" : bossMode === "overdrive" ? "♩ = 180 !" : "♩ = 120"}
              mode={bossMode}
              lookTarget={rig.headCenter}
              time={t}
              hitTime={latestBossHitT}
              silhouetteMode={isImpactFrame}
            />
          )}

          {/* High-Speed Afterimages */}
          {((t >= 53.6 && t <= 57.3) || (t >= 70.0 && t <= 74.0) || (t >= 83.7 && t <= 84.5)) &&
            !isImpactFrame &&
            [0.028, 0.056, 0.084].map((dt, idx) => (
              <PulseV3
                key={idx}
                pose={smoothSynthesizedPose(rawPulseV3PoseAt, Math.max(0, t - dt), 0.035)}
                powerBoost={powerBoost}
                opacity={0.22 - idx * 0.055}
              />
            ))}

          <PulseV3 pose={pulsePose} powerBoost={powerBoost} beatPulse={beatPulse} silhouetteMode={isImpactFrame} />

          {t >= 70.5 && t < 85.6 && (
            <TrebleBladeV3 x={rig.rightHand.x} y={rig.rightHand.y} angleDeg={-25} scale={0.95} powerBoost={powerBoost} />
          )}

          {/* Sakuga Smears & Note Bursts */}
          <SlashSmear cx={rig.rightFoot.x} cy={rig.rightFoot.y} radius={160} rotationDeg={-25} progress={clamp01((t - 54.35) / 0.3)} color="#FACC15" />
          <SlashSmear cx={540} cy={S3_Y + 1040} radius={235} rotationDeg={90} progress={clamp01((t - 83.92) / 0.35)} color="#FACC15" />

          <MusicNoteBurstV3 x={390} y={FLOOR_1 - 50} progress={clamp01((t - 49.95) / 0.65)} seedOffset={11} count={16} radius={200} color="#FACC15" secondaryColor="#FB7185" />
          <MusicNoteBurstV3 x={bossX} y={bossY - 90} progress={clamp01((t - 54.45) / 0.85)} seedOffset={22} count={24} radius={290} color="#FACC15" secondaryColor="#38BDF8" />
          <MusicNoteBurstV3 x={bossX} y={bossY - 120} progress={clamp01((t - 78.0) / 0.9)} seedOffset={44} count={22} radius={280} color="#FACC15" secondaryColor="#FFFFFF" />
          <MusicNoteBurstV3 x={540} y={S3_Y + 1090} progress={clamp01((t - 84.0) / 1.9)} seedOffset={99} count={56} radius={620} color="#FACC15" secondaryColor="#38BDF8" />
        </g>

        {/* Screen-Space Radial Speed Lines, Count-In, `fff`, & Minimalist Title Card */}
        <ActionSpeedLines mode="radial" intensity={t >= 83.95 && t < 85.0 ? 1.0 : 0} time={t} color="#FACC15" width={BBV3_WIDTH} height={BBV3_HEIGHT} />

        {countInNum > 0 && (
          <g transform={`translate(540, 265) scale(${easeOutBack(((t - 82.0) % 0.5) / 0.25)})`}>
            <text x={0} y={0} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight={900} fontSize={120} fill="#FACC15" filter="url(#gold-glow)">
              {countInNum}
            </text>
          </g>
        )}

        {t >= 84.0 && t < 85.5 && (
          <g transform={`translate(540, 560) scale(${easeOutBack(clamp01((t - 84.0) / 0.25))})`} opacity={1 - smoothstep((t - 84.9) / 0.6)}>
            <text
              x={0}
              y={0}
              textAnchor="middle"
              fontFamily={MUSIC_FONT}
              fontStyle="italic"
              fontWeight={900}
              fontSize={185}
              fill={isImpactFrame ? "#000000" : "#FACC15"}
              filter={isImpactFrame ? undefined : "url(#gold-glow)"}
            >
              fff
            </text>
          </g>
        )}

        {titleOpacity > 0.01 && (
          <g opacity={titleOpacity}>
            <text x={540} y={505} textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight={900} fontSize={94} letterSpacing={10} fill="#FFFFFF" filter="url(#cyan-glow)">
              BEAT
            </text>
            <text x={540} y={605} textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight={900} fontSize={94} letterSpacing={10} fill="#FACC15" filter="url(#gold-glow)">
              BREAKER
            </text>
            <text x={540} y={678} textAnchor="middle" fontFamily={MUSIC_FONT} fontStyle="italic" fontSize={32} fill="#94A3B8" letterSpacing={3}>
              440 Hz  →  Song  →  A Major (fff)
            </text>
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};
