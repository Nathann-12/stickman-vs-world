/**
 * Reusable Real-Sample + Full Alan-Becker Tactile Foley Stereo Audio Mixer (`stickman-vs-world` V3).
 * Copy to `scripts/compose-ost.mjs`, run `node scripts/fetch-real-samples.mjs` first,
 * write your timestamp-synced score + Foley layer, transcode to 192kbps MP3, and verify every slice!
 */
import fs from "fs";
import path from "path";

export const SR = 44100;

function seeded(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Exact JS twin of ik.ts `applyHitStops` so audio scanners stay 100% locked across Hit-Stops! */
export function mapHitStop(realT, hitStops = []) {
  let shifted = realT;
  for (const s of hitStops) {
    if (shifted >= s.at && shifted < s.at + s.duration) {
      return { animT: s.at, inHitStop: true };
    }
    if (shifted >= s.at + s.duration) {
      shifted -= s.duration;
    }
  }
  return { animT: shifted, inHitStop: false };
}

/** Exact JS twin of ik.ts `realTimeOf` to convert animT event timestamps into real audio seconds. */
export function realTimeOf(animEventT, hitStops = []) {
  let realT = animEventT;
  for (const s of hitStops) {
    if (animEventT > s.at) realT += s.duration;
  }
  return realT;
}

export function createStereoMix(durationSec) {
  const totalSamples = Math.floor(SR * durationSec);
  const outL = new Float32Array(totalSamples);
  const outR = new Float32Array(totalSamples);

  function loadMonoWav(filePath) {
    const buf = fs.readFileSync(filePath);
    let offset = 12;
    while (offset < buf.length - 8) {
      const id = buf.toString("ascii", offset, offset + 4);
      const size = buf.readUInt32LE(offset + 4);
      if (id === "data") {
        const n = size / 2;
        const out = new Float32Array(n);
        for (let i = 0; i < n; i++) out[i] = buf.readInt16LE(offset + 8 + i * 2) / 32768;
        return out;
      }
      offset += 8 + size;
    }
    throw new Error(`No PCM data chunk in ${filePath}`);
  }

  function lowpass(buf, cutoffHz) {
    const rc = 1 / (2 * Math.PI * cutoffHz);
    const dt = 1 / SR;
    const alpha = dt / (rc + dt);
    const res = new Float32Array(buf.length);
    let y = 0;
    for (let i = 0; i < buf.length; i++) {
      y += alpha * (buf[i] - y);
      res[i] = y;
    }
    return res;
  }

  /** Sub-boosted warm acoustic kick ("thump / ตุ้บ") for heavy landings */
  function buildWarmThump(kickBuf) {
    const len = Math.max(kickBuf.length, Math.floor(SR * 0.36));
    const sub = lowpass(kickBuf, 140);
    const res = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      res[i] = (i < kickBuf.length ? kickBuf[i] : 0) * 0.85 + (i < sub.length ? sub[i] : 0) * 0.95;
    }
    return res;
  }

  /** Equal-power panned linear-interpolated sample mixer */
  function mixBuf(startSec, buf, gain = 1, pan = 0, rate = 1.0, maxDurSec = null) {
    const startIdx = Math.floor(startSec * SR);
    const gL = gain * Math.cos(((pan + 1) * Math.PI) / 4);
    const gR = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    const maxOut = maxDurSec
      ? Math.min(Math.floor(maxDurSec * SR), Math.floor(buf.length / rate))
      : Math.floor(buf.length / rate);
    const fadeLen = Math.min(Math.floor(SR * 0.06), Math.floor(maxOut * 0.25));

    for (let i = 0; i < maxOut; i++) {
      const idx = startIdx + i;
      if (idx < 0 || idx >= totalSamples) continue;
      const srcPos = i * rate;
      const i0 = Math.floor(srcPos);
      const frac = srcPos - i0;
      const s0 = i0 < buf.length ? buf[i0] : 0;
      const s1 = i0 + 1 < buf.length ? buf[i0 + 1] : 0;
      let s = s0 + (s1 - s0) * frac;
      if (maxDurSec && i > maxOut - fadeLen) s *= (maxOut - i) / Math.max(1, fadeLen);
      outL[idx] += s * gL;
      outR[idx] += s * gR;
    }
  }

  /** Multi-anchor pitch-shifted instrument player (stays within +-1..2 semitones of real recording!) */
  function playMultiAnchor(anchors, startSec, midi, vel = 0.8, durSec = 2.2, pan = 0) {
    let best = anchors[0];
    let bestDiff = Math.abs(midi - best.midi);
    for (const a of anchors) {
      const d = Math.abs(midi - a.midi);
      if (d < bestDiff) {
        best = a;
        bestDiff = d;
      }
    }
    const rate = Math.pow(2, (midi - best.midi) / 12);
    mixBuf(startSec, best.data, vel * 0.72, pan, rate, durSec);
  }

  // ==================== TACTILE & DOMAIN FOLEY TOOLKIT ====================

  /** Soft organic stickman footstep (low-passed heel thud + crisp shoe tap, micro-varied!) */
  function mixFootstep(startSec, pan = 0, runBlend = 0.4, gain = 0.12) {
    const dur = 0.055;
    const n = Math.floor(dur * SR);
    const startIdx = Math.floor(startSec * SR);
    const gL = gain * Math.cos(((pan + 1) * Math.PI) / 4);
    const gR = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    const jitter = 0.9 + seeded(startSec * 31.7) * 0.22;
    const baseHz = (130 + runBlend * 65) * jitter;
    let lp = 0;
    let seed = Math.floor(startSec * 4999) + 13;

    for (let i = 0; i < n; i++) {
      const idx = startIdx + i;
      if (idx < 0 || idx >= totalSamples) continue;
      const dt = i / SR;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const noise = (seed / 4294967296) * 2 - 1;
      lp += 0.14 * (noise - lp);
      const heel = Math.sin(2 * Math.PI * baseHz * dt * Math.exp(-dt * 18)) * Math.exp(-dt * 75);
      const scuff = lp * Math.exp(-dt * 95) * (0.45 + runBlend * 0.4);
      const s = heel * 0.65 + scuff;
      outL[idx] += s * gL;
      outR[idx] += s * gR;
    }
  }

  /**
   * Automatically scans a continuous `animT` hero trajectory and places speed-matched footsteps
   * in REAL time, fully synchronized across `hitStops` (ZERO drift after Hit-Stops!).
   */
  function mixFootstepsAlongPath(
    posAtAnimT,
    isAirborneAtAnimT,
    { viewportWidth = 1080, gain = 0.11, hitStops = [] } = {}
  ) {
    let stepAccum = 0;
    const dt = 0.01;
    let prev = posAtAnimT(0);
    for (let realT = dt; realT < durationSec - 0.1; realT += dt) {
      const { animT, inHitStop } = mapHitStop(realT, hitStops);
      if (inHitStop) continue;
      const cur = posAtAnimT(animT);
      const vx = Math.abs(cur.x - prev.x) / dt;
      prev = cur;
      if (isAirborneAtAnimT(animT) || vx < 40) {
        stepAccum = Math.min(stepAccum, 0.3);
        continue;
      }
      const runBlend = Math.max(0, Math.min(1, (vx - 80) / 300));
      const stepsPerSec = 3.0 + runBlend * 3.1;
      stepAccum += dt * stepsPerSec;
      if (stepAccum >= 1.0) {
        stepAccum -= 1.0;
        const pan = Math.max(-0.35, Math.min(0.35, (cur.x / viewportWidth - 0.5) * 0.7));
        mixFootstep(realT, pan, runBlend, gain * (0.85 + runBlend * 0.35));
      }
    }
  }

  /** Swept-bandpass air whoosh for leaps, uppercuts, dashes, and weapon slashes */
  function mixWhoosh(startSec, durSec = 0.22, startHz = 320, endHz = 1450, gain = 0.26, pan = 0) {
    const n = Math.floor(durSec * SR);
    const startIdx = Math.floor(startSec * SR);
    const gL = gain * Math.cos(((pan + 1) * Math.PI) / 4);
    const gR = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    let seed = Math.floor(startSec * 9973) + 17;
    let lp = 0;
    let prev = 0;
    for (let i = 0; i < n; i++) {
      const idx = startIdx + i;
      if (idx < 0 || idx >= totalSamples) continue;
      const p = i / Math.max(1, n - 1);
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const white = (seed / 4294967296) * 2 - 1;
      const fc = startHz + (endHz - startHz) * p;
      const alpha = Math.min(0.95, (2 * Math.PI * fc) / SR);
      lp += alpha * (white - lp);
      const hp = lp - prev * 0.88;
      prev = lp;
      const env = Math.min(1, p / 0.12) * Math.min(1, (1 - p) / 0.25);
      outL[idx] += hp * env * gL;
      outR[idx] += hp * env * gR;
    }
  }

  /** Crisp mechanical/symbol snap click (assembling formulas, toggling switches, locking props) */
  function mixSnapClick(startSec, pan = 0, pitchHz = 1320, gain = 0.24) {
    const n = Math.floor(0.045 * SR);
    const startIdx = Math.floor(startSec * SR);
    const gL = gain * Math.cos(((pan + 1) * Math.PI) / 4);
    const gR = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = 0; i < n; i++) {
      const idx = startIdx + i;
      if (idx < 0 || idx >= totalSamples) continue;
      const dt = i / SR;
      const s =
        (Math.sin(2 * Math.PI * pitchHz * dt) * 0.6 +
          Math.sin(2 * Math.PI * pitchHz * 2.41 * dt) * 0.4) *
        Math.exp(-dt * 120);
      outL[idx] += s * gL;
      outR[idx] += s * gR;
    }
  }

  /** Heavy mechanical breaker / lever KA-CHUNK (double-transient metallic latch + low thud) */
  function mixHeavySwitchClunk(startSec, pan = 0, gain = 0.42) {
    mixSnapClick(startSec, pan, 680, gain * 0.85);
    mixSnapClick(startSec + 0.028, pan, 1420, gain * 0.65);
    const n = Math.floor(0.14 * SR);
    const startIdx = Math.floor(startSec * SR);
    const gL = gain * Math.cos(((pan + 1) * Math.PI) / 4);
    const gR = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = 0; i < n; i++) {
      const idx = startIdx + i;
      if (idx < 0 || idx >= totalSamples) continue;
      const dt = i / SR;
      const thud = Math.sin(2 * Math.PI * 95 * dt * Math.exp(-dt * 14)) * Math.exp(-dt * 34);
      outL[idx] += thud * gL;
      outR[idx] += thud * gR;
    }
  }

  /** Stochastic crackling electric arc / static discharge (filtered micro-sparks + 60/120Hz buzz) */
  function mixElectricCrackle(startSec, durSec = 0.45, intensity = 0.55, pan = 0) {
    const n = Math.floor(durSec * SR);
    const startIdx = Math.floor(startSec * SR);
    const gL = intensity * 0.42 * Math.cos(((pan + 1) * Math.PI) / 4);
    const gR = intensity * 0.42 * Math.sin(((pan + 1) * Math.PI) / 4);
    let seed = Math.floor(startSec * 12347) + 29;
    let prev = 0;
    for (let i = 0; i < n; i++) {
      const idx = startIdx + i;
      if (idx < 0 || idx >= totalSamples) continue;
      const p = i / Math.max(1, n - 1);
      const dt = i / SR;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const u = seed / 4294967296;
      const spark = u > 0.965 ? (u - 0.965) * 42 * (seed & 1 ? 1 : -1) : (u * 2 - 1) * 0.18;
      const hp = spark - prev * 0.72;
      prev = spark;
      const hum = (Math.sin(2 * Math.PI * 60 * dt) * 0.2 + Math.sin(2 * Math.PI * 180 * dt) * 0.14) * 0.45;
      const env = Math.min(1, p / 0.05) * Math.min(1, (1 - p) / 0.12);
      const s = (hp + hum) * env;
      outL[idx] += s * gL;
      outR[idx] += s * gR;
    }
  }

  /** Filtered harmonic turbine / capacitor power charge sweep (rich breathy rise, never bare sine!) */
  function mixPowerChargeSweep(startSec, durSec = 1.0, startHz = 140, endHz = 980, gain = 0.24, pan = 0) {
    const n = Math.floor(durSec * SR);
    const startIdx = Math.floor(startSec * SR);
    const gL = gain * Math.cos(((pan + 1) * Math.PI) / 4);
    const gR = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    let ph = 0;
    let seed = Math.floor(startSec * 6131) + 7;
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const idx = startIdx + i;
      if (idx < 0 || idx >= totalSamples) continue;
      const p = i / Math.max(1, n - 1);
      const f = startHz * Math.pow(endHz / Math.max(1, startHz), p * p);
      ph += (2 * Math.PI * f) / SR;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      lp += 0.08 * ((seed / 4294967296) * 2 - 1 - lp);
      const body = Math.sin(ph) * 0.55 + Math.sin(ph * 2.01) * 0.25 + lp * 0.4;
      const env = Math.min(1, p / 0.1) * Math.min(1, (1 - p) / 0.08) * (0.35 + 0.65 * p);
      outL[idx] += body * env * gL;
      outR[idx] += body * env * gR;
    }
  }

  /** Crystalline inharmonic glass/crystal chime (Chemistry, Physics, filament ping, magic sparkle) */
  function mixGlassChime(startSec, pan = 0, baseHz = 1180, gain = 0.22) {
    const n = Math.floor(0.55 * SR);
    const startIdx = Math.floor(startSec * SR);
    const gL = gain * Math.cos(((pan + 1) * Math.PI) / 4);
    const gR = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    const ratios = [1.0, 2.756, 5.404];
    for (let i = 0; i < n; i++) {
      const idx = startIdx + i;
      if (idx < 0 || idx >= totalSamples) continue;
      const dt = i / SR;
      const s =
        Math.sin(2 * Math.PI * baseHz * ratios[0] * dt) * Math.exp(-dt * 8) * 0.55 +
        Math.sin(2 * Math.PI * baseHz * ratios[1] * dt) * Math.exp(-dt * 15) * 0.3 +
        Math.sin(2 * Math.PI * baseHz * ratios[2] * dt) * Math.exp(-dt * 24) * 0.15;
      outL[idx] += s * gL;
      outR[idx] += s * gR;
    }
  }

  /** Organic elastic pop (curiosity taps, lightbulb realizations, spring prop bounces) */
  function mixElasticPop(startSec, pan = 0, startHz = 260, endHz = 780, gain = 0.24) {
    const dur = 0.095;
    const n = Math.floor(dur * SR);
    const startIdx = Math.floor(startSec * SR);
    const gL = gain * Math.cos(((pan + 1) * Math.PI) / 4);
    const gR = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const idx = startIdx + i;
      if (idx < 0 || idx >= totalSamples) continue;
      const p = i / n;
      const freq = startHz + (endHz - startHz) * Math.pow(p, 0.7);
      phase += (2 * Math.PI * freq) / SR;
      const env = Math.min(1, p / 0.06) * Math.exp(-p * 5.2);
      const s = Math.sin(phase) * env;
      outL[idx] += s * gL;
      outR[idx] += s * gR;
    }
  }

  /** Layered physical strike (weapon clash, shield reflection, heavy knockback) */
  function mixImpactClank(startSec, pan = 0, intensity = 0.75) {
    const dur = 0.28;
    const n = Math.floor(dur * SR);
    const startIdx = Math.floor(startSec * SR);
    const gL = intensity * 0.45 * Math.cos(((pan + 1) * Math.PI) / 4);
    const gR = intensity * 0.45 * Math.sin(((pan + 1) * Math.PI) / 4);
    let seed = Math.floor(startSec * 7717) + 3;
    for (let i = 0; i < n; i++) {
      const idx = startIdx + i;
      if (idx < 0 || idx >= totalSamples) continue;
      const dt = i / SR;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const crack = ((seed / 4294967296) * 2 - 1) * Math.exp(-dt * 110) * 0.65;
      const body = Math.sin(2 * Math.PI * 105 * dt * Math.exp(-dt * 9)) * Math.exp(-dt * 24) * 0.7;
      const ring =
        (Math.sin(2 * Math.PI * 820 * dt) * 0.35 + Math.sin(2 * Math.PI * 1490 * dt) * 0.25) *
        Math.exp(-dt * 18);
      const s = crack + body + ring;
      outL[idx] += s * gL;
      outR[idx] += s * gR;
    }
  }

  /** Classic springy cartoon boing (elastic trampolines, comical bounces, head-bonks!) */
  function mixCartoonBoing(startSec, pan = 0, baseHz = 165, durSec = 0.42, gain = 0.34) {
    const n = Math.floor(durSec * SR);
    const startIdx = Math.floor(startSec * SR);
    const gL = gain * Math.cos(((pan + 1) * Math.PI) / 4);
    const gR = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const idx = startIdx + i;
      if (idx < 0 || idx >= totalSamples) continue;
      const dt = i / SR;
      const p = i / Math.max(1, n - 1);
      const f = baseHz * (1 + 0.55 * Math.exp(-dt * 6.5) * Math.sin(2 * Math.PI * 15 * dt) + p * 0.5);
      ph += (2 * Math.PI * f) / SR;
      const env = Math.min(1, p / 0.03) * Math.exp(-dt * 6.2);
      const s = (Math.sin(ph) * 0.7 + Math.sin(ph * 2.02) * 0.25) * env;
      outL[idx] += s * gL;
      outR[idx] += s * gR;
    }
  }

  /** Expressive breathy cartoon slide whistle (rising leap/throw, falling drop/fail!) */
  function mixSlideWhistle(startSec, durSec = 0.34, startHz = 420, endHz = 1380, gain = 0.22, pan = 0) {
    const n = Math.floor(durSec * SR);
    const startIdx = Math.floor(startSec * SR);
    const gL = gain * Math.cos(((pan + 1) * Math.PI) / 4);
    const gR = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    let ph = 0;
    let seed = Math.floor(startSec * 8191) + 5;
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const idx = startIdx + i;
      if (idx < 0 || idx >= totalSamples) continue;
      const p = i / Math.max(1, n - 1);
      const f = startHz * Math.pow(endHz / Math.max(1, startHz), p);
      ph += (2 * Math.PI * f) / SR;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      lp += 0.12 * ((seed / 4294967296) * 2 - 1 - lp);
      const env = Math.min(1, p / 0.08) * Math.min(1, (1 - p) / 0.12);
      const s = (Math.sin(ph) * 0.78 + Math.sin(ph * 2) * 0.14 + lp * 0.18) * env;
      outL[idx] += s * gL;
      outR[idx] += s * gR;
    }
  }

  /** Hollow tactile wood/door knock (knocking on locked exit, tapping props, head-bonk) */
  function mixWoodKnock(startSec, pan = 0, pitchHz = 320, gain = 0.34) {
    const n = Math.floor(0.08 * SR);
    const startIdx = Math.floor(startSec * SR);
    const gL = gain * Math.cos(((pan + 1) * Math.PI) / 4);
    const gR = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = 0; i < n; i++) {
      const idx = startIdx + i;
      if (idx < 0 || idx >= totalSamples) continue;
      const dt = i / SR;
      const s =
        (Math.sin(2 * Math.PI * pitchHz * dt) * 0.65 +
          Math.sin(2 * Math.PI * pitchHz * 2.18 * dt) * 0.35) *
        Math.exp(-dt * 68);
      outL[idx] += s * gL;
      outR[idx] += s * gR;
    }
  }

  /** Multi-hit slapstick tumble / falling prop clatter (stumbles, collapsing towers, scattered objects) */
  function mixTumbleClatter(startSec, hits = 5, spanSec = 0.42, pan = 0, gain = 0.3) {
    for (let h = 0; h < hits; h++) {
      const u = h / Math.max(1, hits - 1);
      const t = startSec + Math.pow(u, 0.85) * spanSec;
      const pitch = 290 + seeded(startSec * 17 + h * 31) * 440;
      mixWoodKnock(t, pan + (u - 0.5) * 0.2, pitch, gain * (1 - u * 0.45));
    }
  }

  /** Subtle warm cinema room-air bed (v5) so silent comedy beats feel alive instead of digital dead-zero! */
  function mixRoomTone(gain = 0.0045) {
    let seed = 424242;
    let lpL = 0;
    let lpR = 0;
    for (let i = 0; i < totalSamples; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const wL = (seed / 4294967296) * 2 - 1;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const wR = (seed / 4294967296) * 2 - 1;
      lpL += 0.018 * (wL - lpL);
      lpR += 0.018 * (wR - lpR);
      outL[i] += lpL * gain;
      outR[i] += lpR * gain;
    }
  }

  /** Crisp tiny cloth/air swish (v5) for silent pantomime gestures (shrug, scratchHead, point, wipeBrow) */
  function mixGestureSwish(startSec, pan = 0, gain = 0.14) {
    mixWhoosh(startSec, 0.11, 520, 1240, gain, pan);
  }

  /**
   * Sidechain-style music ducking (v5): smoothly attenuates already-mixed music inside `[startSec, startSec+durSec]`
   * right before mixing a headline comedic Foley gag (BONK, BOING, IDEA) so punchlines cut crystal clear!
   */
  function duckRange(startSec, durSec = 0.28, duckGain = 0.38, fadeSec = 0.04) {
    const i0 = Math.max(0, Math.floor((startSec - fadeSec) * SR));
    const i1 = Math.min(totalSamples, Math.floor((startSec + durSec + fadeSec) * SR));
    const fadeN = Math.max(1, Math.floor(fadeSec * SR));
    for (let i = i0; i < i1; i++) {
      let mult = duckGain;
      if (i < i0 + fadeN) {
        const u = (i - i0) / fadeN;
        mult = 1 - (1 - duckGain) * u;
      } else if (i > i1 - fadeN) {
        const u = (i1 - i) / fadeN;
        mult = 1 - (1 - duckGain) * u;
      }
      outL[i] *= mult;
      outR[i] *= mult;
    }
  }

  /** Real-Buffer DJ Scratch / Tape Rewind DSP with safe trapezoidal envelope! */
  function mixBufferScratchRewind(startSec, durSec, sourceSec, gain = 1.05) {
    const startIdx = Math.floor(startSec * SR);
    const len = Math.floor(durSec * SR);
    const anchorSrc = Math.floor(sourceSec * SR);
    const snapL = outL.slice(Math.max(0, anchorSrc - SR * 5), Math.min(totalSamples, anchorSrc + SR * 2));
    const snapR = outR.slice(Math.max(0, anchorSrc - SR * 5), Math.min(totalSamples, anchorSrc + SR * 2));
    const anchorOffset = anchorSrc - Math.max(0, anchorSrc - SR * 5);

    for (let i = 0; i < len; i++) {
      const idx = startIdx + i;
      if (idx >= 0 && idx < totalSamples) {
        outL[idx] *= 0.08;
        outR[idx] *= 0.08;
      }
    }

    for (let i = 0; i < len; i++) {
      const idx = startIdx + i;
      if (idx < 0 || idx >= totalSamples) continue;
      const p = i / Math.max(1, len - 1);
      let relSamples;
      if (p < 0.44) {
        relSamples = -Math.sin((p / 0.44) * Math.PI * 2) * SR * 0.28;
      } else {
        const r = (p - 0.44) / 0.56;
        relSamples = -Math.pow(r, 1.45) * SR * 2.6;
      }
      const pos = anchorOffset + relSamples;
      const i0 = Math.max(0, Math.min(snapL.length - 2, Math.floor(pos)));
      const frac = Math.max(0, Math.min(1, pos - i0));
      const sL = snapL[i0] + (snapL[i0 + 1] - snapL[i0]) * frac;
      const sR = snapR[i0] + (snapR[i0 + 1] - snapR[i0]) * frac;
      const env = Math.min(1, p / 0.05) * Math.min(1, (1 - p) / 0.08);
      outL[idx] += sL * env * gain;
      outR[idx] += sR * env * gain;
    }
  }

  /** Subtle studio stereo reverb + warm tanh soft ceiling limiter */
  function masterAndWriteWav(outWavPath, reverbWet = 0.12) {
    const delays = [1279, 1889, 2953, 4271];
    const wetL = new Float32Array(totalSamples);
    const wetR = new Float32Array(totalSamples);
    for (let dIdx = 0; dIdx < delays.length; dIdx++) {
      const d = delays[dIdx];
      const g = (reverbWet / delays.length) * (1 - dIdx * 0.14);
      for (let i = d; i < totalSamples; i++) {
        wetL[i] += outR[i - d] * g;
        wetR[i] += outL[i - d] * g;
      }
    }

    const pcm = Buffer.alloc(44 + totalSamples * 4);
    pcm.write("RIFF", 0);
    pcm.writeUInt32LE(36 + totalSamples * 4, 4);
    pcm.write("WAVE", 8);
    pcm.write("fmt ", 12);
    pcm.writeUInt32LE(16, 16);
    pcm.writeUInt16LE(1, 20);
    pcm.writeUInt16LE(2, 22);
    pcm.writeUInt32LE(SR, 24);
    pcm.writeUInt32LE(SR * 4, 28);
    pcm.writeUInt16LE(4, 32);
    pcm.writeUInt16LE(16, 34);
    pcm.write("data", 36);
    pcm.writeUInt32LE(totalSamples * 4, 40);

    for (let i = 0; i < totalSamples; i++) {
      const l = Math.tanh((outL[i] + wetL[i]) * 1.05) * 0.88;
      const r = Math.tanh((outR[i] + wetR[i]) * 1.05) * 0.88;
      outL[i] = l;
      outR[i] = r;
      pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, l)) * 32767), 44 + i * 4);
      pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r)) * 32767), 44 + i * 4 + 2);
    }

    fs.mkdirSync(path.dirname(outWavPath), { recursive: true });
    fs.writeFileSync(outWavPath, pcm);
  }

  /** Programmatic peak & RMS audit across every 5s bucket + spotlight windows */
  function auditLevels(spotlightWindows = []) {
    const inspect = (label, aSec, bSec) => {
      const i0 = Math.max(0, Math.floor(aSec * SR));
      const i1 = Math.min(totalSamples, Math.floor(bSec * SR));
      let peak = 0;
      let sumSq = 0;
      for (let i = i0; i < i1; i++) {
        const v = Math.max(Math.abs(outL[i]), Math.abs(outR[i]));
        if (v > peak) peak = v;
        sumSq += 0.5 * (outL[i] * outL[i] + outR[i] * outR[i]);
      }
      const rms = Math.sqrt(sumSq / Math.max(1, i1 - i0));
      console.log(`${label.padEnd(22)} peak=${peak.toFixed(3)}  rms=${rms.toFixed(3)}`);
    };

    console.log("--- 5s Timeline Audio Audit ---");
    for (let s = 0; s < durationSec; s += 5) {
      inspect(`${String(s).padStart(2)}s-${String(Math.min(durationSec, s + 5)).padStart(2)}s`, s, s + 5);
    }
    if (spotlightWindows.length > 0) {
      console.log("--- Spotlight SFX Audit ---");
      for (const w of spotlightWindows) inspect(w.label, w.start, w.end);
    }
  }

  return {
    outL,
    outR,
    loadMonoWav,
    lowpass,
    buildWarmThump,
    mixBuf,
    playMultiAnchor,
    mixFootstep,
    mixFootstepsAlongPath,
    mixWhoosh,
    mixSnapClick,
    mixHeavySwitchClunk,
    mixElectricCrackle,
    mixPowerChargeSweep,
    mixGlassChime,
    mixElasticPop,
    mixImpactClank,
    mixCartoonBoing,
    mixSlideWhistle,
    mixWoodKnock,
    mixTumbleClatter,
    mixRoomTone,
    mixGestureSwish,
    duckRange,
    mixBufferScratchRewind,
    masterAndWriteWav,
    auditLevels,
  };
}
