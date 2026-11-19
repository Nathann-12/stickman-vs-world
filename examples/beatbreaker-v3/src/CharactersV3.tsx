import React from "react";
import {
  clamp01,
  elasticScale,
  lerp,
  seededRandom,
  Vec2,
} from "../engine/ik";
import {
  ArticulatedLimb,
  BossEye,
  StickmanBase,
  StickmanPose,
} from "../engine/rig";

export const MUSIC_FONT = "Georgia, 'Times New Roman', serif";

/**
 * Upgraded V3 Hero "PULSE" — built on `StickmanBase` with beat-reactive LED studio headphones
 * and live sonic ear-wave arcs when grooving or supercharged!
 */
export const PulseV3: React.FC<{
  pose: StickmanPose;
  powerBoost?: number;
  beatPulse?: number;
  opacity?: number;
  silhouetteMode?: boolean;
}> = ({ pose, powerBoost = 0, beatPulse = 0, opacity = 1, silhouetteMode = false }) => {
  return (
    <StickmanBase
      pose={pose}
      strokeColor="#E0F2FE"
      accentColor="#38BDF8"
      powerColor="#FACC15"
      powerBoost={powerBoost}
      opacity={opacity}
      silhouetteMode={silhouetteMode}
      renderHeadAccessory={({ headR, accentColor, silhouetteMode: sil }) => (
        <g>
          {/* Headband arch */}
          <path
            d={`M ${-headR - 3} 2 A ${headR + 4} ${headR + 4} 0 0 1 ${headR + 3} 2`}
            fill="none"
            stroke={accentColor}
            strokeWidth={4.5}
          />
          {/* Left & Right glowing studio earcups */}
          <rect x={-headR - 7} y={-6} width={8} height={17} rx={4} fill={accentColor} stroke="none" />
          <rect x={headR - 1} y={-6} width={8} height={17} rx={4} fill={accentColor} stroke="none" />
          {/* Live LED ring highlight + subtle beat sonic waves */}
          {!sil && (
            <>
              <rect x={-headR - 5} y={-3} width={3} height={11} rx={1.5} fill="#FFFFFF" stroke="none" opacity={0.6 + beatPulse * 0.4} />
              <rect x={headR + 2} y={-3} width={3} height={11} rx={1.5} fill="#FFFFFF" stroke="none" opacity={0.6 + beatPulse * 0.4} />
              {beatPulse > 0.25 && (
                <g fill="none" stroke={accentColor} strokeWidth={2} opacity={beatPulse * 0.55}>
                  <path d={`M ${-headR - 12} -6 A 14 14 0 0 0 ${-headR - 12} 10`} />
                  <path d={`M ${headR + 12} -6 A 14 14 0 0 1 ${headR + 12} 10`} />
                </g>
              )}
            </>
          )}
        </g>
      )}
    />
  );
};

export type BossMoodV3 =
  | "assembling"
  | "awake"
  | "telegraph"
  | "shocked"
  | "overdrive"
  | "frozen"
  | "harmony";

/**
 * Upgraded V3 Living, Articulated Antagonist — "THE METRONOME"
 * Features a tracking `<BossEye>`, TWO 2-Bone IK `<ArticulatedLimb>` conductor arms with glowing
 * batons, telegraph wind-up posture, elastic squash on impact, and peaceful golden Harmony mode!
 */
export const MetronomeBossV3: React.FC<{
  x: number;
  y: number;
  scale?: number;
  pendulumDeg: number;
  bpmLabel: string;
  mode: BossMoodV3;
  lookTarget: Vec2 | null;
  time: number;
  hitTime?: number;
  silhouetteMode?: boolean;
}> = ({
  x,
  y,
  scale = 1,
  pendulumDeg,
  bpmLabel,
  mode,
  lookTarget,
  time,
  hitTime = -10,
  silhouetteMode = false,
}) => {
  if (scale <= 0.01) return null;

  const isFrozen = mode === "frozen";
  const isOverdrive = mode === "overdrive";
  const isTelegraph = mode === "telegraph";
  const isShocked = mode === "shocked";
  const isHarmony = mode === "harmony";

  const mainColor = silhouetteMode
    ? "#05060a"
    : isHarmony
      ? "#FACC15"
      : isFrozen
        ? "#94A3B8"
        : isOverdrive
          ? "#FF2E63"
          : "#FB7185";

  const glowId = silhouetteMode
    ? undefined
    : isHarmony || isFrozen
      ? "url(#gold-glow)"
      : "url(#magenta-glow)";

  const bounce = elasticScale(time, hitTime, 0.24, 9, 30);
  const eyeMood = isHarmony
    ? "calm"
    : isFrozen
      ? "frozen"
      : isShocked
        ? "shocked"
        : isOverdrive
          ? "overdrive"
          : isTelegraph
            ? "angry"
            : "neutral";

  // Dynamic 2-bone IK conductor arm targets driven by Boss state!
  const speed = isOverdrive ? 11 : isHarmony ? 3.5 : 6.2;
  const wave = isFrozen ? 0 : Math.sin(time * speed);
  const wave2 = isFrozen ? 0 : Math.cos(time * speed);

  let leftArmTarget: Vec2 = { x: x - 118 + wave * 18, y: y - 55 + wave2 * 24 };
  let rightArmTarget: Vec2 = { x: x + 118 - wave * 18, y: y - 55 - wave2 * 24 };

  if (isTelegraph) {
    // Wide threatening baton raise before firing!
    leftArmTarget = { x: x - 132, y: y - 135 };
    rightArmTarget = { x: x + 132, y: y - 135 };
  } else if (isShocked) {
    // Comedic arms flung up in surprise!
    const jitter = Math.sin(time * 38) * 12;
    leftArmTarget = { x: x - 92 + jitter, y: y - 155 };
    rightArmTarget = { x: x + 92 - jitter, y: y - 155 };
  } else if (isHarmony) {
    // Gentle rhythmic conducting sway in gold harmony
    leftArmTarget = { x: x - 96, y: y - 48 + Math.sin(time * 3.14) * 16 };
    rightArmTarget = { x: x + 96, y: y - 48 + Math.sin(time * 3.14) * 16 };
  }

  return (
    <g>
      {/* Articulated 2-Bone IK Conductor Arms (world-space attached to torso shoulders!) */}
      {scale > 0.65 && (
        <g opacity={clamp01((scale - 0.65) / 0.35)}>
          <ArticulatedLimb
            root={{ x: x - 42 * scale, y: y - 58 * scale }}
            target={leftArmTarget}
            len1={58 * scale}
            len2={54 * scale}
            bendDir={-1}
            color={mainColor}
            strokeWidth={6.5}
          />
          <ArticulatedLimb
            root={{ x: x + 42 * scale, y: y - 58 * scale }}
            target={rightArmTarget}
            len1={58 * scale}
            len2={54 * scale}
            bendDir={1}
            color={mainColor}
            strokeWidth={6.5}
          />
          {/* Glowing conductor baton tips */}
          {!silhouetteMode && (
            <>
              <circle cx={leftArmTarget.x} cy={leftArmTarget.y} r={isTelegraph ? 10 : 6} fill="#FFFFFF" stroke={mainColor} strokeWidth={3} />
              <circle cx={rightArmTarget.x} cy={rightArmTarget.y} r={isTelegraph ? 10 : 6} fill="#FFFFFF" stroke={mainColor} strokeWidth={3} />
            </>
          )}
        </g>
      )}

      {/* Main Metronome Chassis with Elastic Hit Squash */}
      <g
        transform={`translate(${x}, ${y}) scale(${scale * bounce.sx}, ${scale * bounce.sy})`}
        filter={glowId}
      >
        {/* Telegraph / Overdrive danger aura ring */}
        {(isOverdrive || isTelegraph || isHarmony) && !silhouetteMode && (
          <circle
            cx={0}
            cy={-60}
            r={isTelegraph ? 128 + Math.sin(time * 40) * 8 : 112 + Math.sin(time * 12) * 10}
            fill="none"
            stroke={isHarmony ? "#FACC15" : mainColor}
            strokeWidth={isTelegraph ? 4 : 2.5}
            strokeDasharray={isHarmony ? "none" : "14 10"}
            opacity={isTelegraph ? 0.85 : 0.45}
          />
        )}

        {/* Obsidian pyramid chassis */}
        <polygon
          points="0,-166 76,30 -76,30"
          fill={silhouetteMode ? "#05060a" : isHarmony ? "#141004" : "#0A0408"}
          stroke={mainColor}
          strokeWidth={5}
          strokeLinejoin="round"
        />

        {/* Inner tempo graduation ticks */}
        {!silhouetteMode && (
          <g stroke={mainColor} strokeWidth={2} opacity={0.45}>
            <line x1={-22} y1={-112} x2={22} y2={-112} />
            <line x1={-32} y1={-84} x2={32} y2={-84} />
            <line x1={-40} y1={-56} x2={40} y2={-56} />
          </g>
        )}

        {/* Swinging Pendulum Arm & Weight */}
        <g transform={`translate(0, 12) rotate(${pendulumDeg})`}>
          <line x1={0} y1={0} x2={0} y2={-190} stroke="#FFFFFF" strokeWidth={5.5} strokeLinecap="round" />
          <polygon
            points="0,-168 18,-136 -18,-136"
            fill={isHarmony ? "#FACC15" : isOverdrive ? "#FACC15" : mainColor}
            stroke="#FFFFFF"
            strokeWidth={2.5}
          />
        </g>

        {/* Living Tracking Eye centered in Metronome core! */}
        {!silhouetteMode && (
          <BossEye
            cx={0}
            cy={-56}
            radius={22}
            lookTarget={lookTarget ? { x: lookTarget.x - x, y: lookTarget.y - y } : null}
            mood={eyeMood}
            color={mainColor}
          />
        )}

        {/* Base plinth */}
        <rect x={-82} y={24} width={164} height={22} rx={7} fill={silhouetteMode ? "#05060a" : "#110710"} stroke={mainColor} strokeWidth={3.5} />

        {/* Live BPM readout */}
        {!silhouetteMode && (
          <text
            x={0}
            y={-186}
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
            fontWeight={900}
            fontSize={30}
            fill={isHarmony ? "#FACC15" : isFrozen ? "#FACC15" : mainColor}
          >
            {bpmLabel}
          </text>
        )}
      </g>
    </g>
  );
};

/** Classic crisp SVG musical note with optional elastic spring bounce on touch/spawn! */
export const VectorNoteV3: React.FC<{
  x: number;
  y: number;
  type: "quarter" | "eighth" | "beamed";
  pitchLabel?: string;
  color?: string;
  scale?: number;
  opacity?: number;
  glow?: string;
  bounceAt?: number;
  time?: number;
}> = ({
  x,
  y,
  type,
  pitchLabel,
  color = "#7DD3FC",
  scale = 1,
  opacity = 1,
  glow = "url(#cyan-glow)",
  bounceAt = -10,
  time = 0,
}) => {
  if (scale <= 0.01 || opacity <= 0.01) return null;
  const b = bounceAt >= 0 ? elasticScale(time, bounceAt, 0.28, 9, 30) : { sx: 1, sy: 1 };

  return (
    <g
      transform={`translate(${x}, ${y}) scale(${scale * b.sx}, ${scale * b.sy})`}
      opacity={opacity}
      filter={glow}
    >
      {type === "beamed" ? (
        <g>
          <ellipse cx={-20} cy={12} rx={15} ry={11} transform="rotate(-22 -20 12)" fill={color} />
          <ellipse cx={22} cy={4} rx={15} ry={11} transform="rotate(-22 22 4)" fill={color} />
          <line x1={-7} y1={10} x2={-7} y2={-56} stroke={color} strokeWidth={5.5} strokeLinecap="round" />
          <line x1={35} y1={2} x2={35} y2={-64} stroke={color} strokeWidth={5.5} strokeLinecap="round" />
          <path d="M -9 -56 L 37 -64 L 37 -50 L -9 -42 Z" fill={color} />
        </g>
      ) : (
        <g>
          <ellipse cx={0} cy={0} rx={17} ry={12} transform="rotate(-22)" fill={color} />
          <line x1={14} y1={-3} x2={14} y2={-74} stroke={color} strokeWidth={5.5} strokeLinecap="round" />
          {type === "eighth" && (
            <path d="M 14 -74 C 36 -60, 42 -36, 26 -18 C 33 -34, 28 -48, 14 -56 Z" fill={color} />
          )}
        </g>
      )}
      {pitchLabel && (
        <text
          x={0}
          y={44}
          textAnchor="middle"
          fontFamily="system-ui, sans-serif"
          fontWeight={900}
          fontSize={28}
          fill={color}
        >
          {pitchLabel}
        </text>
      )}
    </g>
  );
};

export const VectorAccidentalV3: React.FC<{
  x: number;
  y: number;
  kind: "sharp" | "flat";
  scale?: number;
  color?: string;
  opacity?: number;
}> = ({ x, y, kind, scale = 1, color = "#FACC15", opacity = 1 }) => {
  if (scale <= 0.01 || opacity <= 0.01) return null;
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`} opacity={opacity} filter="url(#gold-glow)">
      {kind === "sharp" ? (
        <g stroke={color} strokeLinecap="round">
          <line x1={-10} y1={-28} x2={-10} y2={28} strokeWidth={5} />
          <line x1={10} y1={-30} x2={10} y2={26} strokeWidth={5} />
          <line x1={-22} y1={-8} x2={22} y2={-15} strokeWidth={7} />
          <line x1={-22} y1={14} x2={22} y2={7} strokeWidth={7} />
        </g>
      ) : (
        <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
          <line x1={-10} y1={-34} x2={-10} y2={22} strokeWidth={5.5} />
          <path d="M -10 -2 C 12 -10, 18 10, -10 22" strokeWidth={6} />
        </g>
      )}
    </g>
  );
};

/** Luminous Treble Clef Blade carried during Stage 3–4 climax! */
export const TrebleBladeV3: React.FC<{
  x: number;
  y: number;
  angleDeg?: number;
  scale?: number;
  powerBoost?: number;
}> = ({ x, y, angleDeg = -25, scale = 1, powerBoost = 0 }) => {
  const col = powerBoost > 0.25 ? "#FACC15" : "#38BDF8";
  return (
    <g transform={`translate(${x}, ${y}) rotate(${angleDeg}) scale(${scale})`} filter={powerBoost > 0.25 ? "url(#gold-glow)" : "url(#cyan-glow)"}>
      <path
        d="M 0 38 C -16 38, -16 18, 0 18 C 16 18, 22 -8, 4 -24 C -18 -42, -16 -76, 4 -98 C 18 -114, 10 -144, 0 -152 C -12 -134, -8 -102, 0 -64 L 0 54 C 0 70, -16 74, -20 62"
        fill="none"
        stroke={col}
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 0 38 C -16 38, -16 18, 0 18 C 16 18, 22 -8, 4 -24 C -18 -42, -16 -76, 4 -98 C 18 -114, 10 -144, 0 -152 C -12 -134, -8 -102, 0 -64 L 0 54"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </g>
  );
};

/** Opening Sound-Wave Portal */
export const AudioPortalV3: React.FC<{
  x: number;
  y: number;
  openProgress: number;
  time: number;
}> = ({ x, y, openProgress, time }) => {
  if (openProgress <= 0.01) return null;
  const rx = 148 * openProgress;
  const ry = 32 * openProgress;
  return (
    <g transform={`translate(${x}, ${y})`} filter="url(#cyan-glow)">
      <ellipse cx={0} cy={0} rx={rx * 1.15} ry={ry * 1.25} fill="#38BDF8" opacity={0.18} />
      <ellipse cx={0} cy={0} rx={rx} ry={ry} fill="#000000" stroke="#38BDF8" strokeWidth={6} />
      <ellipse cx={0} cy={0} rx={rx * 0.72} ry={ry * 0.68} fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeDasharray="16 10" strokeDashoffset={-time * 85} />
    </g>
  );
};

/** Deterministic Musical Symbol Particle Burst */
export const MusicNoteBurstV3: React.FC<{
  x: number;
  y: number;
  progress: number;
  seedOffset: number;
  count?: number;
  radius?: number;
  color?: string;
  secondaryColor?: string;
}> = ({
  x,
  y,
  progress,
  seedOffset,
  count = 16,
  radius = 220,
  color = "#7DD3FC",
  secondaryColor = "#FACC15",
}) => {
  if (progress <= 0 || progress >= 1) return null;
  const symbols = ["♪", "♫", "♩", "♯", "♭", "𝄞"];
  const ease = 1 - Math.pow(1 - progress, 3);
  const op = progress < 0.72 ? 1 : 1 - (progress - 0.72) / 0.28;

  return (
    <g opacity={op}>
      {Array.from({ length: count }).map((_, i) => {
        const ang = (i / count) * Math.PI * 2 + seededRandom(seedOffset + i * 3.1) * 0.5;
        const dist = radius * (0.45 + seededRandom(seedOffset + i * 7.7) * 0.7) * ease;
        const px = x + Math.cos(ang) * dist;
        const py = y + Math.sin(ang) * dist;
        const sz = lerp(34, 18, progress) * (0.8 + seededRandom(seedOffset + i * 5.3) * 0.5);
        const sym = symbols[i % symbols.length];
        return (
          <text
            key={i}
            x={px}
            y={py}
            textAnchor="middle"
            fontFamily={MUSIC_FONT}
            fontWeight={700}
            fontSize={sz}
            fill={i % 2 === 0 ? color : secondaryColor}
          >
            {sym}
          </text>
        );
      })}
    </g>
  );
};
