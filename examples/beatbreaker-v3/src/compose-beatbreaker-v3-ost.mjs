/**
 * BEATBREAKER V3 Soundtrack & Full Alan-Becker Tactile Foley Composer
 * Powered directly by `stickman-vs-world` V3 `audioMixerTemplate.mjs` + 21 real studio WAV samples!
 * Every single cue and automatic footstep is locked to `realTimeOf(animEventT, HIT_STOPS)`!
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import {
  createStereoMix,
  realTimeOf,
  SR,
} from "../../../skills/stickman-vs-world/assets/engine/audioMixerTemplate.mjs";

const DURATION = 90.0;
const BEAT = 0.5;
const BAR = 2.0;

// Exact Hit-Stops mirrored from BeatbreakerV3.tsx!
const HIT_STOPS = [
  { at: 49.95, duration: 0.04 },
  { at: 54.45, duration: 0.05 },
  { at: 84.0, duration: 0.067 },
];
const rt = (animT) => realTimeOf(animT, HIT_STOPS);

const SAMPLES_DIR = path.resolve("assets/samples");
const OUT_DIR = path.resolve("public/sfx");
fs.mkdirSync(OUT_DIR, { recursive: true });

const mix = createStereoMix(DURATION);

const PIANO_ANCHORS = [
  { midi: 45, name: "piano_A2" },
  { midi: 48, name: "piano_C3" },
  { midi: 51, name: "piano_Ds3" },
  { midi: 54, name: "piano_Fs3" },
  { midi: 57, name: "piano_A3" },
  { midi: 60, name: "piano_C4" },
  { midi: 63, name: "piano_Ds4" },
  { midi: 66, name: "piano_Fs4" },
  { midi: 69, name: "piano_A4" },
  { midi: 72, name: "piano_C5" },
  { midi: 75, name: "piano_Ds5" },
  { midi: 78, name: "piano_Fs5" },
  { midi: 81, name: "piano_A5" },
].map((a) => ({ ...a, data: mix.loadMonoWav(path.join(SAMPLES_DIR, `${a.name}.wav`)) }));

const DRUMS = {
  kick: mix.loadMonoWav(path.join(SAMPLES_DIR, "drum_kick.wav")),
  snare: mix.loadMonoWav(path.join(SAMPLES_DIR, "drum_snare.wav")),
  hihat: mix.loadMonoWav(path.join(SAMPLES_DIR, "drum_hihat.wav")),
  tom1: mix.loadMonoWav(path.join(SAMPLES_DIR, "drum_tom1.wav")),
  tom2: mix.loadMonoWav(path.join(SAMPLES_DIR, "drum_tom2.wav")),
  tom3: mix.loadMonoWav(path.join(SAMPLES_DIR, "drum_tom3.wav")),
  woodHi: mix.loadMonoWav(path.join(SAMPLES_DIR, "perc_wood_hi.wav")),
  woodLo: mix.loadMonoWav(path.join(SAMPLES_DIR, "perc_wood_lo.wav")),
};

const kickWarm = mix.buildWarmThump(DRUMS.kick);
const playPiano = (animT, midi, vel = 0.8, dur = 2.2, pan = 0) =>
  mix.playMultiAnchor(PIANO_ANCHORS, rt(animT), midi, vel, dur, pan);

const M = {
  E2: 40, F2: 41, G2: 43, A2: 45, B2: 47,
  C3: 48, D3: 50, E3: 52, F3: 53, G3: 55, A3: 57, B3: 59,
  C4: 60, Cs4: 61, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, As4: 70, B4: 71,
  C5: 72, Cs5: 73, D5: 74, E5: 76, F5: 77, G5: 79, A5: 81, B5: 83,
};

// =========================================================================
// LAYER 1 â€” REAL YAMAHA C5 GRAND PIANO + STUDIO ACOUSTIC DRUM SCORE
// =========================================================================
// Act I (0â€“11s): Portal Arrival -> Curiosity Loop -> Sharp/Flat & Octave
mix.mixGlassChime(rt(0.5), -0.15, 1320, 0.22);
playPiano(0.5, M.E5, 0.36, 1.8, -0.1);
mix.mixWhoosh(rt(1.35), 0.55, 1100, 260, 0.24, -0.15); // Falling through portal!

// 2.0s: Heavy THUMP ("à¸•à¸¸à¹‰à¸š!") onto taut 440Hz string!
mix.mixBuf(rt(2.0), kickWarm, 0.94, -0.1, 0.92);
mix.mixBuf(rt(2.0), DRUMS.tom3, 0.44, -0.1, 0.85);
playPiano(2.0, M.A2, 0.92, 2.8, 0);
playPiano(2.02, M.A4, 0.84, 2.2, 0.08);

// 3.45s: Curiosity Loop crouch-poke `â™© -> â™ª + â™ª` + Startled Hop Pop!
mix.mixElasticPop(rt(3.42), 0.0, 290, 820, 0.30);
playPiano(3.45, M.A4, 0.82, 0.75, -0.18);
playPiano(3.72, M.A4, 0.86, 1.1, 0.18);
mix.mixBuf(rt(3.45), DRUMS.woodHi, 0.32, -0.15, 1.3);
mix.mixBuf(rt(3.72), DRUMS.woodHi, 0.32, 0.15, 1.38);
mix.mixWhoosh(rt(3.68), 0.25, 360, 920, 0.22, -0.15); // Startled hop back!

// 5.5sâ€“10s: Sharp `â™¯`, Flat `â™­`, and `Ã—2 Hz` Octave Jump!
playPiano(5.5, M.A4, 0.78, 0.5, -0.1);
mix.mixElasticPop(rt(5.76), 0.12, 340, 960, 0.26);
playPiano(5.78, M.As4, 0.92, 1.0, 0.12);
mix.mixBuf(rt(5.78), DRUMS.woodHi, 0.36, 0.12, 1.5);
playPiano(6.8, M.As4, 0.72, 0.45, 0.1);
mix.mixElasticPop(rt(7.04), -0.1, 780, 320, 0.24);
playPiano(7.05, M.A4, 0.88, 1.1, -0.1);
mix.mixBuf(rt(7.05), DRUMS.woodLo, 0.36, -0.1, 1.15);
mix.mixWhoosh(rt(7.92), 0.36, 300, 1580, 0.30, 0); // Big Octave Jump!
mix.mixBuf(rt(8.2), DRUMS.tom1, 0.45, 0, 1.2);
mix.mixGlassChime(rt(8.22), 0.15, 1760, 0.24);
playPiano(8.2, M.A4, 0.85, 2.0, -0.18);
playPiano(8.24, M.A5, 0.92, 2.2, 0.18);
playPiano(8.6, M.E5, 0.65, 1.6, 0);

// Act II (11â€“35.5s): 4 Chords (`Am -> F -> C -> G`) -> 3D Piano Unfold -> Live Song Jam!
const fourChords = [
  { start: 11.0, bass: M.A2, notes: [M.A3, M.C4, M.E4, M.A4] },
  { start: 14.0, bass: M.F2, notes: [M.F3, M.A3, M.C4, M.F4] },
  { start: 17.0, bass: M.C3, notes: [M.C4, M.E4, M.G4, M.C5] },
  { start: 20.0, bass: M.G2, notes: [M.G3, M.B3, M.D4, M.G4] },
];
for (const ch of fourChords) {
  ch.notes.slice(0, 3).forEach((n, i) => {
    mix.mixElasticPop(rt(ch.start + i * 0.45), (i - 1) * 0.2, 300 + i * 90, 620 + i * 110, 0.18);
    mix.mixBuf(rt(ch.start + i * 0.45), DRUMS.tom3, 0.25, (i - 1) * 0.2, 1.0 + i * 0.12);
    playPiano(ch.start + i * 0.45, n, 0.8, 2.4, (i - 1) * 0.2);
  });
  mix.mixBuf(rt(ch.start + 1.45), kickWarm, 0.65, 0, 0.96);
  playPiano(ch.start + 1.45, ch.bass, 0.9, 2.2, 0);
  ch.notes.forEach((n, i) => playPiano(ch.start + 1.45 + i * 0.03, n, 0.72, 2.2, (i - 1.5) * 0.15));
}

// 23.0s: 3D Grand Piano Unfold shimmer!
mix.mixWhoosh(rt(23.0), 0.55, 220, 1280, 0.26, 0);
[M.A2, M.E3, M.A3, M.C4, M.E4, M.G4, M.A4, M.C5].forEach((n, i) => {
  playPiano(23.0 + i * 0.045, n, 0.76, 2.5, (i - 3.5) * 0.14);
});

const songProg = [
  { bass: M.A2, ch: [M.A3, M.C4, M.E4], mel: [M.E5, M.D5, M.C5, M.A4] },
  { bass: M.F2, ch: [M.F3, M.A3, M.C4], mel: [M.C5, M.A4, M.C5, M.D5] },
  { bass: M.C3, ch: [M.C4, M.E4, M.G4], mel: [M.E5, M.G5, M.E5, M.C5] },
  { bass: M.G2, ch: [M.G3, M.B3, M.D4], mel: [M.D5, M.B4, M.G4, M.B4] },
];
for (let bar = 12; bar < 18; bar++) {
  const bs = bar * BAR;
  const p = songProg[(bar - 12) % 4];
  const hasKick = bar >= 14;
  const hasSnare = bar >= 14;
  const hasHat = bar >= 15;
  playPiano(bs, p.bass, 0.9, 1.9, -0.1);
  p.ch.forEach((n, i) => playPiano(bs + i * 0.018, n, 0.65, 1.85, -0.2 + i * 0.15));
  playPiano(bs + 1.0, p.bass + 7, 0.62, 1.0, 0.1);
  for (let b = 0; b < 4; b++) {
    const bt = bs + b * BEAT;
    playPiano(bt, p.mel[b], 0.78, 0.95, (b - 1.5) * 0.2);
    if (b === 1) playPiano(bt + 0.25, p.mel[2], 0.55, 0.5, 0.1);
    if (hasKick && (b === 0 || b === 2)) mix.mixBuf(rt(bt), kickWarm, 0.9, 0, 0.96);
    if (hasKick && bar >= 15 && b === 2) mix.mixBuf(rt(bt + 0.25), kickWarm, 0.58, 0, 1.02);
    if (hasSnare && ((bar === 14 && b === 3) || (bar >= 15 && (b === 1 || b === 3)))) {
      mix.mixBuf(rt(bt), DRUMS.snare, 0.76, 0.05, 1.0);
    }
    if (hasHat) {
      mix.mixBuf(rt(bt), DRUMS.hihat, 0.34, -0.22, 1.0, 0.12);
      mix.mixBuf(rt(bt + 0.25), DRUMS.hihat, 0.24, -0.22, 1.05, 0.12);
    }
  }
}
mix.mixWhoosh(rt(31.8), 0.45, 360, 1300, 0.24, 0); // Mid-air celebration flip!

// Act III (36â€“41.2s): 4/4 Taps -> Over-Commitment "Uh-Oh" Gag -> Boss Assembles!
for (let b = 0; b < 4; b++) {
  const bt = 36.0 + b * BEAT;
  mix.mixSnapClick(rt(bt), (b - 1.5) * 0.18, 1180 + b * 110, 0.24);
  mix.mixBuf(rt(bt), kickWarm, 0.85, 0, 1.0);
  mix.mixBuf(rt(bt), b === 0 ? DRUMS.woodHi : DRUMS.woodLo, 0.62, 0, 1.38);
  playPiano(bt, [M.A3, M.C4, M.E4, M.A4][b], 0.68, 0.7, (b - 1.5) * 0.15);
}
mix.mixHeavySwitchClunk(rt(38.0), 0.25, 0.52); // Giant Metronome snaps together!
mix.mixImpactClank(rt(39.22), 0.15, 0.72); // Boss pendulum knocks Pulse back!
mix.mixWhoosh(rt(39.25), 0.35, 1200, 320, 0.28, -0.2); // Flung backward!

// Act IV (38â€“55s): 3D Concert Piano Battle + Double-Take `:||` + `Aâ™¯ â†‘` Uppercut!
const battleProg = [
  { bass: M.A2, ch: [M.A3, M.C4, M.E4], mel: [M.E5, M.D5, M.C5, M.B4] },
  { bass: M.F2, ch: [M.F3, M.A3, M.C4], mel: [M.C5, M.A4, M.G4, M.A4] },
  { bass: M.D3, ch: [M.D3, M.F3, M.A3], mel: [M.F5, M.E5, M.D5, M.C5] },
  { bass: M.E2, ch: [M.E3, M.G3, M.B3], mel: [M.E5, M.G5, M.E5, M.B4] },
];
for (let bar = 19; bar < 28; bar++) {
  const bs = bar * BAR;
  const p = battleProg[(bar - 19) % 4];
  playPiano(bs, p.bass, 0.92, 1.9, -0.1);
  p.ch.forEach((n, idx) => playPiano(bs + 0.015 * idx, n, 0.62, 1.8, -0.2 + idx * 0.1));
  playPiano(bs + 1.0, p.bass + 7, 0.68, 1.0, 0.1);
  for (let b = 0; b < 4; b++) {
    const bt = bs + b * BEAT;
    playPiano(bt, p.mel[b], 0.68, 0.85, (b - 1.5) * 0.2);
    if (b === 0 || b === 2) mix.mixBuf(rt(bt), kickWarm, 0.92, 0, 0.96);
    if (b === 2) mix.mixBuf(rt(bt + 0.25), kickWarm, 0.62, 0, 1.02);
    if (b === 1 || b === 3) mix.mixBuf(rt(bt), DRUMS.snare, 0.78, 0.05, 1.0);
    mix.mixBuf(rt(bt), DRUMS.hihat, 0.34, -0.22, 1.0, 0.12);
    mix.mixBuf(rt(bt + 0.25), DRUMS.hihat, 0.24, -0.22, 1.04, 0.12);
  }
}

// Double-Take lightbulb (`47.4s`) + `:||` Snap (`49.1s`) + Golden Reflection (`49.95s`)!
mix.mixElasticPop(rt(47.4), -0.15, 360, 1080, 0.30);
mix.mixHeavySwitchClunk(rt(49.15), -0.15, 0.44);
mix.mixImpactClank(rt(49.95), 0, 0.95);
mix.mixBuf(rt(49.95), DRUMS.snare, 0.92, 0, 1.12);
playPiano(49.95, M.E5, 0.95, 1.2, -0.35);
playPiano(50.1, M.A5, 1.0, 1.4, 0.35);

// 54.45s: `A + â™¯ = Aâ™¯ â†‘` Uppercut Kick + Rocket Launch!
mix.mixWhoosh(rt(54.15), 0.32, 280, 1800, 0.38, 0.2);
mix.mixImpactClank(rt(54.45), 0.25, 1.0);
playPiano(54.2, M.A4, 0.95, 0.6, 0);
playPiano(54.45, M.As4, 1.0, 1.2, 0);
mix.mixBuf(rt(54.45), kickWarm, 1.08, 0, 0.88);
mix.mixBuf(rt(54.45), DRUMS.tom1, 0.75, 0, 1.15);
[M.A3, M.C4, M.E4, M.G4, M.A4, M.C5, M.E5, M.G5, M.A5, M.B5].forEach((n, i) => {
  playPiano(54.55 + i * 0.075, n, 0.72, 1.1, (i - 4.5) * 0.14);
});

// Act V (56â€“74s): Wave Surfing -> Vinyl DJ Rewind -> Studio LED EQ Parkour -> BASS +12dB MAX!
for (let bar = 28; bar < 37; bar++) {
  const bs = bar * BAR;
  if (bar === 30) continue; // 60â€“62s reserved for REAL-BUFFER DJ SCRATCH REWIND!
  const p = battleProg[(bar - 28) % 4];
  const bassMul = bar < 33 ? 1.0 : bar === 33 ? 1.18 : 1.38;
  playPiano(bs, p.bass, 0.92 * Math.min(1.2, bassMul), 1.5, 0);
  playPiano(bs + 0.75, p.bass, 0.72 * Math.min(1.2, bassMul), 0.7, 0);
  p.ch.forEach((n) => {
    playPiano(bs + 0.5, n, 0.58, 0.45, 0.25);
    playPiano(bs + 1.5, n, 0.58, 0.45, -0.25);
  });
  for (let b = 0; b < 4; b++) {
    const bt = bs + b * BEAT;
    if (b === 0 || b === 2 || (bar >= 34 && b === 3)) mix.mixBuf(rt(bt), kickWarm, 0.95 * bassMul, 0, bar >= 34 ? 0.85 : 0.95);
    if (b === 2) mix.mixBuf(rt(bt + 0.25), kickWarm, 0.65 * bassMul, 0, 0.98);
    if (b === 1 || b === 3) mix.mixBuf(rt(bt), DRUMS.snare, 0.82, 0, 0.98);
    mix.mixBuf(rt(bt), DRUMS.hihat, 0.34, -0.25, 1.0, 0.12);
    mix.mixBuf(rt(bt + 0.25), DRUMS.hihat, 0.25, -0.25, 1.05, 0.12);
    if (bar === 34 && b >= 2) {
      mix.mixBuf(rt(bt), DRUMS.tom1, 0.65, -0.3, 1.0);
      mix.mixBuf(rt(bt + 0.25), DRUMS.tom2, 0.7, 0.3, 1.0);
    }
  }
}

// 59.8sâ€“62.3s: REAL-BUFFER DJ BABY-SCRATCH & SPINBACK REWIND (synced via `rt()`!)
{
  const sliceStart = Math.floor(rt(58.0) * SR);
  const sliceLen = Math.floor(2.0 * SR);
  const srcL = mix.outL.slice(sliceStart, sliceStart + sliceLen);
  const srcR = mix.outR.slice(sliceStart, sliceStart + sliceLen);
  const scratchStart = Math.floor(rt(59.8) * SR);
  const scratchLen = Math.floor(2.45 * SR);
  let cursor = Math.floor(0.5 * SR);
  let seed = 777;
  const sRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 4294967296) * 2 - 1;
  };
  for (let i = 0; i < scratchLen; i++) {
    const p = i / scratchLen;
    let speed = 0;
    if (p < 0.48) {
      const cycle = (p / 0.48) * 3.0;
      speed = Math.sin(cycle * Math.PI * 2) * 3.6;
      cursor = Math.floor(0.5 * SR) + Math.sin(cycle * Math.PI * 2) * (0.14 * SR);
    } else {
      const rp = (p - 0.48) / 0.52;
      speed = -(1.8 + 3.4 * Math.sin(rp * Math.PI));
      cursor += speed;
    }
    const wrapped = ((cursor % sliceLen) + sliceLen) % sliceLen;
    const i0 = Math.floor(wrapped);
    const i1 = (i0 + 1) % sliceLen;
    const frac = wrapped - i0;
    const env = Math.min(1, p * 20) * Math.min(1, (1 - p) * 14);
    const grit = sRand() * 0.05 * Math.min(1, Math.abs(speed) / 2.5);
    mix.outL[scratchStart + i] = ((srcL[i0] * (1 - frac) + srcL[i1] * frac) * 1.42 + grit) * env;
    mix.outR[scratchStart + i] = ((srcR[i0] * (1 - frac) + srcR[i1] * frac) * 1.42 + grit) * env;
  }
}

// EQ Parkour whooshes & Laser zaps + BASS +12dB Power Charge Sweep!
mix.mixWhoosh(rt(62.45), 0.28, 320, 1280, 0.25, 0.25);
mix.mixElectricCrackle(rt(64.1), 0.45, 0.45, 0.25);
mix.mixWhoosh(rt(64.0), 0.25, 340, 1250, 0.24, 0);
mix.mixElectricCrackle(rt(65.4), 0.45, 0.45, 0);
mix.mixPowerChargeSweep(rt(66.5), 2.5, 110, 740, 0.28, -0.25);
mix.mixHeavySwitchClunk(rt(69.2), -0.25, 0.58);
mix.mixBuf(rt(69.2), kickWarm, 1.35, 0, 0.78);
mix.mixBuf(rt(69.2), DRUMS.tom3, 0.95, 0, 0.72);
mix.mixBuf(rt(69.2), DRUMS.snare, 0.75, 0, 0.9);
playPiano(69.2, M.A2, 1.0, 2.2, 0);
mix.mixWhoosh(rt(70.5), 0.7, 260, 1850, 0.34, 0);

// Act VI (74â€“90s): Fermata `ð„` Silence -> Double-Take -> `C + â™¯ = Câ™¯` -> `A MAJOR fff` Harmony!
for (let bar = 37; bar < 39; bar++) {
  const bs = bar * BAR;
  for (let b = 0; b < 4; b++) {
    const bt = bs + b * BEAT;
    mix.mixBuf(rt(bt), kickWarm, 0.95, 0, 0.94);
    mix.mixBuf(rt(bt), DRUMS.tom2, 0.48, -0.2, 1.0 + b * 0.05);
    mix.mixBuf(rt(bt + 0.25), DRUMS.tom1, 0.45, 0.2, 1.05 + b * 0.05);
    if (b === 1 || b === 3) mix.mixBuf(rt(bt), DRUMS.snare, 0.85, 0, 1.0);
  }
  const rise = [M.A4, M.B4, M.C5, M.D5, M.E5, M.G5, M.A5, M.B5];
  for (let k = 0; k < 4; k++) playPiano(bs + k * 0.5, rise[(bar - 37) * 4 + k], 0.75, 0.85, 0);
}

// 78.0s: FERMATA `ð„` LOCK + Luminous Am9 Freeze!
mix.mixHeavySwitchClunk(rt(78.0), 0, 0.55);
mix.mixBuf(rt(78.0), kickWarm, 0.85, 0, 0.82);
[M.A2, M.E3, M.A3, M.C4, M.E4, M.B4].forEach((n, i) => {
  playPiano(78.0 + i * 0.06, n, 0.78, 4.2, (i - 2.5) * 0.18);
});
mix.mixElasticPop(rt(81.1), 0, 420, 1180, 0.26); // Double-Take 2 Lightbulb!

// 82.0sâ€“84.0s: Count-In + `C5 -> Câ™¯5` Golden Key-Change Lift!
mix.mixBuf(rt(82.0), DRUMS.woodHi, 0.88, 0, 1.45);
mix.mixBuf(rt(82.5), DRUMS.woodHi, 0.92, 0, 1.45);
playPiano(82.5, M.C5, 0.85, 0.65, -0.12);
mix.mixBuf(rt(83.0), DRUMS.woodHi, 0.96, 0, 1.45);
mix.mixGlassChime(rt(83.0), 0, 1109, 0.30); // C#5 harmonic shimmer!
playPiano(83.0, M.Cs5, 1.0, 1.3, 0.12);
mix.mixBuf(rt(83.5), DRUMS.woodHi, 1.0, 0, 1.5);
mix.mixWhoosh(rt(83.68), 0.32, 1650, 240, 0.36, 0); // Meteor dive!

// 84.0s: `fff` GRAND FINALE â€” TRIUMPHANT REAL YAMAHA C5 `A MAJOR9` + Impact Clank!
mix.mixImpactClank(rt(84.0), 0, 1.0);
mix.mixBuf(rt(84.0), kickWarm, 1.35, 0, 0.8);
mix.mixBuf(rt(84.0), DRUMS.snare, 0.95, 0, 0.95);
mix.mixBuf(rt(84.0), DRUMS.tom3, 0.85, 0, 0.78);
[M.A2, M.E3, M.A3, M.Cs4, M.E4, M.A4, M.Cs5, M.E5].forEach((n, i) => {
  playPiano(84.0 + i * 0.025, n, 0.92, 5.2, (i - 3.5) * 0.2);
});
mix.mixBuf(rt(84.5), DRUMS.hihat, 0.42, -0.2, 0.82, 0.3);
mix.mixBuf(rt(85.0), kickWarm, 0.88, 0, 0.95);
mix.mixBuf(rt(85.5), DRUMS.snare, 0.52, 0.15, 1.05);
mix.mixBuf(rt(86.0), kickWarm, 0.72, 0, 0.95);

// 86.0sâ€“90.0s: Serene Golden Harmony Resolution Outro
mix.mixGlassChime(rt(86.05), 0.15, 880, 0.20);
[
  { t: 86.0, n: M.A2 },
  { t: 86.02, n: M.A3 },
  { t: 86.5, n: M.Cs4 },
  { t: 87.0, n: M.E4 },
  { t: 87.5, n: M.A4 },
  { t: 88.1, n: M.Cs5 },
].forEach((o, i) => playPiano(o.t, o.n, 0.72, 3.2, (i - 2.5) * 0.1));

// =========================================================================
// LAYER 2 â€” AUTOMATIC HITSTOP-SYNCED FOOTSTEPS ALONG GROUNDED HERO SEGMENTS
// =========================================================================
const WALK_SEGMENTS = [
  [2.65, 3.35, 300, 452],
  [4.75, 5.45, 345, 492],
  [6.95, 7.7, 492, 540],
  [38.0, 38.55, 520, 683],
  [39.65, 40.35, 520, 215], // Panic-sprint footsteps!
  [51.5, 53.6, 300, 590],  // Charge sprint footsteps!
];
mix.mixFootstepsAlongPath(
  (t) => {
    for (const [s, e, x0, x1] of WALK_SEGMENTS) {
      if (t >= s && t <= e) return { x: x0 + ((t - s) / (e - s)) * (x1 - x0), y: 1090 };
    }
    return { x: 540, y: 1090 };
  },
  (t) => !WALK_SEGMENTS.some(([s, e]) => t >= s && t <= e),
  { viewportWidth: 1080, gain: 0.14, hitStops: HIT_STOPS }
);

// Master stereo WAV -> 192kbps MP3 + mandatory level audit!
const tmpWav = path.join(OUT_DIR, "beatbreaker-v3-ost.tmp.wav");
const outMp3 = path.join(OUT_DIR, "beatbreaker-v3-ost.mp3");
mix.masterAndWriteWav(tmpWav, 0.14);
execFileSync("ffmpeg.exe", ["-y", "-loglevel", "error", "-i", tmpWav, "-c:a", "libmp3lame", "-b:a", "192k", outMp3]);
fs.unlinkSync(tmpWav);

mix.auditLevels([
  { label: "01_portal+thump", start: 0.4, end: 2.8 },
  { label: "02_curiosity_loop", start: 3.3, end: 4.5 },
  { label: "03_uh_oh_sprint", start: 37.8, end: 40.6 },
  { label: "04_repeat_clank", start: 49.7, end: 50.6 },
  { label: "05_uppercut_hit", start: 54.1, end: 55.2 },
  { label: "06_dj_rewind", start: 59.8, end: 62.4 },
  { label: "07_bass_max", start: 66.5, end: 70.0 },
  { label: "08_fermata+fff", start: 78.0, end: 85.5 },
]);
console.log("Generated V3 Real-Sample + Full Foley MP3:", outMp3, fs.statSync(outMp3).size, "bytes");

