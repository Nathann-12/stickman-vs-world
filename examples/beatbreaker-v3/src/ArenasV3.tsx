import React from "react";
import { clamp01, elasticScale, lerp, seededRandom } from "../engine/ik";
import { GlowLine } from "../engine/rig";

/**
 * STAGE 1 ARENA (V3): 3D-Perspective Obsidian Concert Grand Piano
 * Upgrades vs V1:
 * - Smooth spring key-sink (`activeKeyIndex` + `keyPressDepth`)
 * - 16 vibrating golden harp strings + Synthesia vertical beam with rising particles
 * - 3 Interactive glowing Drum Pads (`KICK`, `SNARE`, `HI-HAT`) that flash & ripple when stomped!
 */
export const ConcertGrandPianoV3: React.FC<{
  yTop: number;
  activeKeyIndex: number;
  beatPulse: number;
  time: number;
  drumFlash?: { kick: number; snare: number; hihat: number };
}> = ({
  yTop,
  activeKeyIndex,
  beatPulse,
  time,
  drumFlash = { kick: 0, snare: 0, hihat: 0 },
}) => {
  const notes = ["C", "D", "E", "F", "G", "A", "B"];
  const keyCount = notes.length;
  const topLeft = 104;
  const topWidth = 872;
  const botLeft = 32;
  const botWidth = 1016;
  const keyDepth = 258;
  const frontLip = 58;
  const blackGaps = [0, 1, 3, 4, 5];

  return (
    <g>
      {/* Grand Piano Curved Wing & 16 Vibrating Harp Strings */}
      <g opacity={0.26 + beatPulse * 0.14}>
        <path
          d={`M 88 ${yTop} Q 116 ${yTop - 550} 540 ${yTop - 630} Q 868 ${yTop - 675} 975 ${yTop - 320} L 990 ${yTop} Z`}
          fill="none"
          stroke="#38BDF8"
          strokeWidth={2.5}
        />
        {Array.from({ length: 16 }).map((_, i) => {
          const u = i / 15;
          const bx = lerp(118, 962, u);
          const topH = lerp(495, 295, u) + Math.sin(u * Math.PI) * 125;
          const hot = activeKeyIndex >= 0 && Math.abs(u - activeKeyIndex / 6) < 0.16;
          const vib = hot ? Math.sin(time * 66) * 5 : 0;
          return (
            <line
              key={i}
              x1={bx}
              y1={yTop - 12}
              x2={bx + vib}
              y2={yTop - topH}
              stroke={hot ? "#FACC15" : "#475569"}
              strokeWidth={hot ? 2.8 : 1.2}
            />
          );
        })}
      </g>

      {/* Synthesia Light Column + Rising Sparks from Pressed Key */}
      {activeKeyIndex >= 0 && activeKeyIndex < keyCount && (() => {
        const u0 = activeKeyIndex / keyCount;
        const u1 = (activeKeyIndex + 1) / keyCount;
        const x0 = lerp(topLeft, topLeft + topWidth, u0) + 8;
        const x1 = lerp(topLeft, topLeft + topWidth, u1) - 8;
        return (
          <g>
            <linearGradient id="piano-v3-beam" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.58" />
              <stop offset="55%" stopColor="#38BDF8" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
            </linearGradient>
            <rect x={x0} y={yTop - 700} width={x1 - x0} height={700} fill="url(#piano-v3-beam)" />
            {[0, 1, 2, 3].map((k) => {
              const p = ((time * 1.4 + k * 0.25) % 1);
              return (
                <circle
                  key={k}
                  cx={lerp(x0 + 16, x1 - 16, seededRandom(activeKeyIndex * 11 + k * 7))}
                  cy={yTop - p * 560}
                  r={4.5 * (1 - p)}
                  fill="#FACC15"
                  opacity={1 - p}
                />
              );
            })}
          </g>
        );
      })()}

      {/* Glossy Fallboard Rim */}
      <polygon
        points={`${topLeft - 14},${yTop - 22} ${topLeft + topWidth + 14},${yTop - 22} ${topLeft + topWidth + 8},${yTop} ${topLeft - 8},${yTop}`}
        fill="#0F172A"
        stroke="#38BDF8"
        strokeWidth={2.2}
      />

      {/* 7 3D-Perspective White Keys with Physical Sink & Bevel Lip */}
      {notes.map((label, i) => {
        const isPressed = i === activeKeyIndex;
        const sink = isPressed ? 24 : 0;
        const u0 = i / keyCount;
        const u1 = (i + 1) / keyCount;
        const tx0 = lerp(topLeft, topLeft + topWidth, u0) + 3;
        const tx1 = lerp(topLeft, topLeft + topWidth, u1) - 3;
        const bx0 = lerp(botLeft, botLeft + botWidth, u0) + 4;
        const bx1 = lerp(botLeft, botLeft + botWidth, u1) - 4;
        const yB = yTop + keyDepth + sink;
        const yT = yTop + sink * 0.45;

        return (
          <g key={label} filter={isPressed ? "url(#cyan-glow)" : undefined}>
            <polygon
              points={`${tx0},${yT} ${tx1},${yT} ${bx1},${yB} ${bx0},${yB}`}
              fill={isPressed ? "#38BDF8" : "#09101E"}
              stroke={isPressed ? "#FFFFFF" : "#38BDF8"}
              strokeWidth={isPressed ? 3.5 : 1.8}
              opacity={isPressed ? 0.96 : 0.88}
            />
            <polygon
              points={`${bx0},${yB} ${bx1},${yB} ${bx1},${yB + frontLip - sink * 0.5} ${bx0},${yB + frontLip - sink * 0.5}`}
              fill={isPressed ? "#0284C7" : "#04070E"}
              stroke={isPressed ? "#7DD3FC" : "#1E293B"}
              strokeWidth={1.8}
            />
            <text
              x={(bx0 + bx1) / 2}
              y={yB - 24}
              textAnchor="middle"
              fontFamily="system-ui, sans-serif"
              fontWeight={800}
              fontSize={30}
              fill={isPressed ? "#000000" : "#7DD3FC"}
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Raised 3D Obsidian Black Keys */}
      {blackGaps.map((gap) => {
        const u = (gap + 1) / keyCount;
        const tcx = lerp(topLeft, topLeft + topWidth, u);
        const bcx = lerp(botLeft, botLeft + botWidth, u);
        const bkY = yTop + 145;
        return (
          <g key={`bk-${gap}`}>
            <polygon
              points={`${tcx - 28},${yTop - 4} ${tcx + 28},${yTop - 4} ${bcx + 34},${bkY} ${bcx - 34},${bkY}`}
              fill="#020305"
              stroke="#475569"
              strokeWidth={2}
            />
            <polygon
              points={`${bcx - 34},${bkY} ${bcx + 34},${bkY} ${bcx + 34},${bkY + 26} ${bcx - 34},${bkY + 26}`}
              fill="#0F172A"
              stroke="#334155"
              strokeWidth={1.5}
            />
          </g>
        );
      })}

      {/* 3 Interactive Floor Drum Pads Under Keys (flash & ripple when stomped during Jam!) */}
      {[
        { label: "KICK", x: 240, flash: drumFlash.kick, col: "#FACC15" },
        { label: "SNARE", x: 540, flash: drumFlash.snare, col: "#FB7185" },
        { label: "HI-HAT", x: 840, flash: drumFlash.hihat, col: "#34D399" },
      ].map((pad) => {
        if (pad.flash <= 0.01) return null;
        return (
          <g key={pad.label} transform={`translate(${pad.x}, ${yTop + 365})`}>
            <ellipse
              cx={0}
              cy={0}
              rx={lerp(56, 128, 1 - pad.flash)}
              ry={lerp(18, 42, 1 - pad.flash)}
              fill="none"
              stroke={pad.col}
              strokeWidth={5 * pad.flash}
              opacity={pad.flash}
            />
            <text
              x={0}
              y={8}
              textAnchor="middle"
              fontFamily="system-ui, sans-serif"
              fontWeight={900}
              fontSize={26}
              fill={pad.col}
              opacity={pad.flash}
            >
              + {pad.label}!
            </text>
          </g>
        );
      })}
    </g>
  );
};

/** Stage 1 Tactical Counter: Elastic Repeat Sign `:||` Reflector */
export const RepeatReflectorV3: React.FC<{
  x: number;
  y: number;
  height?: number;
  lit?: boolean;
  opacity: number;
  hitTime?: number;
  time?: number;
}> = ({ x, y, height = 250, lit = false, opacity, hitTime = -10, time = 0 }) => {
  if (opacity <= 0.01) return null;
  const half = height / 2;
  const c = lit ? "#FACC15" : "#38BDF8";
  const b = elasticScale(time, hitTime, 0.25, 10, 32);

  return (
    <g transform={`translate(${x}, ${y}) scale(${b.sx}, ${b.sy})`} opacity={opacity}>
      <GlowLine x1={0} y1={-half} x2={0} y2={half} color={c} width={10} />
      <GlowLine x1={-18} y1={-half} x2={-18} y2={half} color="#FFFFFF" width={4} />
      <circle cx={26} cy={-38} r={11} fill={c} filter={lit ? "url(#gold-glow)" : "url(#cyan-glow)"} />
      <circle cx={26} cy={38} r={11} fill={c} filter={lit ? "url(#gold-glow)" : "url(#cyan-glow)"} />
      <text
        x={0}
        y={-half - 26}
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight={900}
        fontSize={28}
        letterSpacing={3}
        fill={c}
      >
        REPEAT :||
      </text>
    </g>
  );
};

/**
 * STAGE 2 ARENA (V3): 3D Vinyl Turntable + Wide Studio EQ Console with LIVE 10-Segment LED VU Meters!
 * All coordinates strictly relative to `cy` (ZERO Stage-1 leakage!).
 */
export const VinylAndEQArenaV3: React.FC<{
  cx: number;
  cy: number;
  radius: number;
  spinDeg: number;
  isReversing: boolean;
  bassLevel: number;
  beatPulse: number;
}> = ({ cx, cy, radius, spinDeg, isReversing, bassLevel, beatPulse }) => {
  const accent = isReversing ? "#FACC15" : "#38BDF8";
  const eqY = cy + 575;
  const cols = [
    { label: "BASS", x: 250, val: clamp01(0.32 + bassLevel * 0.68), col: bassLevel > 0.72 ? "#FACC15" : "#38BDF8" },
    { label: "MID", x: 540, val: clamp01(0.42 + beatPulse * 0.28), col: "#7DD3FC" },
    { label: "HIGH", x: 830, val: clamp01(0.36 + beatPulse * 0.34), col: "#FB7185" },
  ];

  return (
    <g>
      {/* Top Half: Spinning Obsidian Vinyl Turntable */}
      <g transform={`translate(${cx}, ${cy})`}>
        <circle cx={0} cy={0} r={radius + 14} fill="#04060C" stroke={accent} strokeWidth={3} opacity={0.45} />
        <circle cx={0} cy={0} r={radius} fill="#05070E" stroke={accent} strokeWidth={4} />
        {/* Concentric vinyl micro-grooves */}
        {[0.88, 0.76, 0.64, 0.52, 0.4].map((f, i) => (
          <circle
            key={i}
            cx={0}
            cy={0}
            r={radius * f}
            fill="none"
            stroke={isReversing ? "#FACC15" : "#334155"}
            strokeWidth={i % 2 === 0 ? 1.8 : 1.1}
            opacity={isReversing ? 0.55 : 0.48}
          />
        ))}
        {/* Rotating specular reflection wedges + cue markers */}
        <g transform={`rotate(${spinDeg})`}>
          <path d={`M 0 0 L ${radius * 0.92} ${-radius * 0.24} A ${radius} ${radius} 0 0 1 ${radius * 0.92} ${radius * 0.24} Z`} fill="#FFFFFF" opacity={0.07} />
          <path d={`M 0 0 L ${-radius * 0.92} ${radius * 0.24} A ${radius} ${radius} 0 0 1 ${-radius * 0.92} ${-radius * 0.24} Z`} fill="#FFFFFF" opacity={0.07} />
          <line x1={radius * 0.35} y1={0} x2={radius * 0.94} y2={0} stroke={accent} strokeWidth={4.5} strokeLinecap="round" />
        </g>
        {/* Center Record Label */}
        <circle cx={0} cy={0} r={radius * 0.26} fill={isReversing ? "#FACC15" : "#FB7185"} filter={isReversing ? "url(#gold-glow)" : "url(#magenta-glow)"} />
        <circle cx={0} cy={0} r={12} fill="#000000" />
        {/* Sleek Studio Tonearm */}
        <g transform={`translate(${radius + 54}, ${-radius * 0.68}) rotate(${isReversing ? 18 : 28})`}>
          <circle cx={0} cy={0} r={22} fill="#0F172A" stroke="#64748B" strokeWidth={3} />
          <line x1={0} y1={0} x2={-92} y2={radius * 0.85} stroke="#CBD5E1" strokeWidth={6} strokeLinecap="round" />
          <rect x={-106} y={radius * 0.82} width={22} height={30} rx={4} fill={accent} />
        </g>
        {isReversing && (
          <text x={0} y={-radius - 36} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight={900} fontSize={44} fill="#FACC15" filter="url(#gold-glow)">
            ◀◀  DJ REWIND!
          </text>
        )}
      </g>

      {/* Bottom Half: Wide Studio EQ Console + Live 10-Segment LED VU Meters */}
      <g>
        <rect x={84} y={eqY - 24} width={912} height={338} rx={26} fill="#04070F" stroke="#1E293B" strokeWidth={3} />
        {cols.map((c) => {
          const trackTop = eqY + 26;
          const trackBot = eqY + 236;
          const thumbY = lerp(trackBot, trackTop, c.val);
          const litLeds = Math.round(c.val * 10);
          return (
            <g key={c.label}>
              {/* 10-Segment Studio LED VU Meter beside each fader! */}
              {Array.from({ length: 10 }).map((_, seg) => {
                const isLit = seg < litLeds;
                const ly = lerp(trackBot - 8, trackTop + 4, seg / 9);
                const ledCol = seg >= 8 ? "#FACC15" : seg >= 6 ? "#FB7185" : c.col;
                return (
                  <rect
                    key={seg}
                    x={c.x - 58}
                    y={ly - 6}
                    width={24}
                    height={11}
                    rx={3}
                    fill={isLit ? ledCol : "#0F172A"}
                    opacity={isLit ? 0.95 : 0.45}
                  />
                );
              })}
              {/* Fader Groove */}
              <rect x={c.x - 7} y={trackTop} width={14} height={trackBot - trackTop} rx={7} fill="#0F172A" stroke="#334155" strokeWidth={2} />
              {/* Lit Fill */}
              <rect x={c.x - 5} y={thumbY} width={10} height={trackBot - thumbY} rx={5} fill={c.col} />
              {/* Physical Sliding Fader Cap */}
              <rect x={c.x - 36} y={thumbY - 18} width={72} height={36} rx={9} fill={c.col} stroke="#FFFFFF" strokeWidth={2.5} filter={c.val > 0.78 ? "url(#gold-glow)" : undefined} />
              <line x1={c.x - 22} y1={thumbY} x2={c.x + 22} y2={thumbY} stroke="#000000" strokeWidth={3.5} />
              <text x={c.x} y={eqY + 286} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight={900} fontSize={28} letterSpacing={3} fill={c.col}>
                {c.label}
              </text>
              {c.label === "BASS" && bassLevel > 0.72 && (
                <text x={540} y={eqY - 96} textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight={900} fontSize={40} fill="#FACC15" filter="url(#gold-glow)">
                  BASS  +12dB  MAX!
                </text>
              )}
            </g>
          );
        })}
      </g>
    </g>
  );
};

/** STAGE 3 ARENA (V3): Celestial Concentric Staff Void (freezes dead on Fermata `𝄐`!) */
export const FermataHarmonyVoidV3: React.FC<{
  cx: number;
  cy: number;
  time: number;
  frozen: boolean;
  harmony: boolean;
}> = ({ cx, cy, time, frozen, harmony }) => {
  const effectiveT = frozen ? 78.0 : time;
  const col = harmony ? "#FACC15" : frozen ? "#94A3B8" : "#38BDF8";
  const glyphs = ["♪", "♫", "♩", "𝄞", "♯", "♭"];

  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {[210, 310, 415].map((r, idx) => (
        <ellipse
          key={idx}
          cx={0}
          cy={0}
          rx={r}
          ry={r * 0.42}
          fill="none"
          stroke={col}
          strokeWidth={idx === 1 ? 2.2 : 1.4}
          strokeDasharray={frozen ? "10 10" : "none"}
          opacity={harmony ? 0.36 : 0.2}
          transform={`rotate(${(idx - 1) * 18})`}
        />
      ))}
      {Array.from({ length: 12 }).map((_, i) => {
        const ang = (i / 12) * Math.PI * 2 + effectiveT * (i % 2 === 0 ? 0.45 : -0.35);
        const rx = 260 + (i % 3) * 82;
        const ry = rx * 0.42;
        const nx = Math.cos(ang) * rx;
        const ny = Math.sin(ang) * ry;
        return (
          <text
            key={i}
            x={nx}
            y={ny}
            textAnchor="middle"
            fontFamily="Georgia, serif"
            fontSize={34}
            fill={harmony ? "#FACC15" : i % 2 === 0 ? "#7DD3FC" : "#FB7185"}
            opacity={frozen ? 0.35 : 0.72}
          >
            {glyphs[i % glyphs.length]}
          </text>
        );
      })}
    </g>
  );
};
