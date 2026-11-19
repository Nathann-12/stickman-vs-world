# Real-Sample Audio, Tactile Foley & DSP Engineering Pipeline

Audio accounts for **half the perceived quality** of a stickman animation. Raw WebAudio/JS sine-wave beeps and harsh square synths instantly scream "cheap synthetic demo" and ruin emotional immersion.

Follow this **3-Layer Real-Audio Architecture** using `assets/engine/audioMixerTemplate.mjs`.

---

## 1. The Anti-Synthetic Rule: Real Studio Samples First

Whenever music or acoustic impacts are needed:
1. **Run the verified real-sample fetcher first:** Copy [assets/engine/fetchRealSamples.mjs](../assets/engine/fetchRealSamples.mjs) to `scripts/fetch-real-samples.mjs` and run `node scripts/fetch-real-samples.mjs`. It automatically downloads 21 verified real acoustic recordings from `tonejs.github.io` (13 Yamaha C5 Salamander Concert Grand Piano chromatic anchors `A2..A5`, 6 real studio acoustic drum kit pieces, and 2 acoustic bongos/rims), auto-locates `ffmpeg` (PATH or Remotion's bundled compositor), and decodes all 21 into 44.1kHz 16-bit mono PCM WAV in `assets/samples/`.
2. **Multi-Anchor Pitch Shifting:** Instead of stretching a single sample across 4 octaves (which causes chipmunk artifacts), use **anchors spaced every 3 semitones** (`A2, C3, D#3, F#3, A3, C4, ...`) and pick the nearest anchor before applying linear-interpolated resampling (`playMultiAnchor`):
   `rate = Math.pow(2, (targetMidi - anchorMidi) / 12)`
   Every note stays within `±1` semitone of a real microphone recording — preserving natural hammer attack, wood resonance, and sustain!
3. **Sub-Enhanced Acoustic Thumps ("ตุ้บ ๆ" Warm Weight):**
   To make heavy stickman landings and bass hits feel physically weighty (not hollow clicks), use `buildWarmThump(DRUMS.kick)` which blends:
   - Real acoustic kick (`0.85` gain)
   - 140Hz low-passed copy of the same kick (`0.95` gain) for warm sub-punch
   - Layer with `DRUMS.tom3` (`0.40` gain, pitch `0.85×`) on major falls/slams!

---

## 2. The 3-Layer Alan Becker Mix

Layer all three into one sample-accurate stereo master buffer (`outL`, `outR` at `44100 Hz`) using [assets/engine/audioMixerTemplate.mjs](../assets/engine/audioMixerTemplate.mjs):

### Layer 1 — Diegetic Domain & Musical Events (Exact Timestamp Sync)
- Every visual discovery, chord stack, piano key stomp, symbol slap, and phase shift fires an exact audio event at the **identical real timestamp `realTimeOf(animEventT, HIT_STOPS)`** from your Stage 2 Storyboard Table.
- **Harmonic Storytelling:** Mirror the emotional arc musically!
  - Act I (Curiosity): Sparse, intimate solo notes on open space.
  - Act II (Joyful Playground): Build the track layer-by-layer on screen (`Piano` → `+Kick` → `+Snare` → `+Hi-Hat`) so the audience *hears* the hero inventing the music/world!
  - Act III–V (Boss Tension): Tighter percussion, minor/diminished tension, tempo escalation (`120 → 180 BPM` hits).
  - Act VI (Climax Freeze → Resolution): **1.5–2.5 seconds of near-total silence** during the freeze/countdown, followed by a massive harmonic resolution (e.g., Minor `Am` → triumphant Major `A Major` chord bloom + crash/sub boom)!

### Layer 2 — Tactile & Non-Music Domain Foley Layer (Built Into `audioMixerTemplate.mjs`!)
**Law 5 Nuance (Real Samples vs. Procedural Foley):** Never synthesize *tonal music melodies/chords* with raw sine/square oscillators (use real studio samples from `fetchRealSamples.mjs`!). For **non-musical physical SFX** (footsteps, wind whooshes, electric arcs, breaker clunks, glass chimes, mechanical snaps), sculpted filtered-noise and physical-model Foley inside `audioMixerTemplate.mjs` are encouraged and sound crisp when layered with real acoustic percussion!

Always populate tactile Foley synced to physical movement:
- **HitStop-Synced Automatic Footsteps (`mixFootstepsAlongPath`):** Pass `heroPosAt`, `isAirborneAt`, AND **`{ hitStops: HIT_STOPS }`** so footsteps automatically map through `mapHitStop(realT, hitStops)` and stay 100% locked across every freeze-frame!
- **Jump & Slash Air Whooshes (`mixWhoosh`):** Swept-bandpass air bursts (`320 Hz → 1450 Hz` on leaps/uppercuts; `1450 Hz → 260 Hz` on drops/slams).
- **Curiosity Taps & Lightbulb Pops (`mixElasticPop`):** Warm pitch-bent elastic pops whenever Hero pokes a springy primitive or hits a Double-Take realization beat!
- **Symbol Snaps (`mixSnapClick`) & Heavy Breakers (`mixHeavySwitchClunk`):** Crisp clicks for small snaps, chunky double-transient *KA-CHUNK* for switches/levers/doors.
- **Domain-Specific Non-Music SFX:** `mixElectricCrackle` (arcs/sparks/static), `mixPowerChargeSweep` (capacitors/turbines/lasers), `mixGlassChime` (chemistry/physics/crystal sparks), `mixImpactClank` (weapon clashes/reflections).
- **Heavy Landings (`buildWarmThump` + `tom3`):** Scaled to fall height (`gain: 0.55–0.92`).
- **Real-Buffer Rewind / DJ Scratch (`mixBufferScratchRewind`):** Scrubs directly forward/backward through the ALREADY-MIXED `outL`/`outR` audio buffer using a safe trapezoidal envelope!

### Layer 3 — Stereo Space, Reverb & Soft Limiting
- **Equal-Power Stereo Panning:** Map horizontal world `x` (`0..W`) subtly into `pan ∈ [-0.35, +0.35]` so left-stage hits sound slightly left and right-stage hits sound slightly right (`gL = gain * cos((pan+1)*π/4)`, `gR = gain * sin((pan+1)*π/4)`).
- **Subtle Studio Air Reverb:** 3–4 prime-delay stereo comb taps (`29ms, 43ms, 67ms, 97ms`, low wet mix `0.10–0.16`) glue dry samples and Foley into one cohesive acoustic room.
- **Soft Ceiling Limiter:** Pass the master stereo bus through `Math.tanh(x * 1.05) * 0.88` to guarantee zero harsh digital clipping while keeping punchy loudness.

---

## 3. Critical Audio DSP & Remotion Gotchas (Never Repeat!)

### Gotcha 1 — The `Math.sin(Math.PI * Math.min(1, p * k))` Silence Bug!
When writing a fade-in/fade-out envelope for a scratch, whoosh, or burst (`p` goes `0 → 1`):
- **BROKEN:** `const env = Math.sin(Math.PI * Math.min(1, p * 14));` — For `p` from `0.07` to `1.0`, `Math.min(1, p * 14)` stays pinned at `1`, and `Math.sin(Math.PI) === 0`! The entire middle 93% of your sound becomes SILENT!
- **FIXED (Trapezoidal Envelope):**
  ```js
  const env = Math.min(1, p / 0.06) * Math.min(1, (1 - p) / 0.08);
  ```
  Clean 6% fade-in, solid `1.0` body, clean 8% fade-out — zero clicks, zero accidental silence!

### Gotcha 2 — Heavy WAV Buffers & Remotion Studio Hot-Reload Silence
- Never serve a 15–30 MB uncompressed `.wav` to Remotion Studio if avoidable — browser decoding can stall or drop audio on scrub.
- Always transcode the finished mix to **192kbps stereo `.mp3`** (`~1.5–2.5 MB` for 90s):
  `ffmpeg -y -i temp_mix.wav -c:a libmp3lame -b:a 192k public/sfx/<slug>-v1.mp3`
- **Cache-Busting Rule:** Whenever you re-generate the audio while `npx remotion studio` is open, **increment the version filename** (`<slug>-v2.mp3`) AND put a matching **`key="<slug>-v2"`** on `<Audio>` (`<Audio key="my-ost-v2" src={staticFile("sfx/my-ost-v2.mp3")} />`). Deleting/overwriting an open file in-place can leave the browser `<audio>` element stuck silent.

### Gotcha 3 — Mandatory Programmatic Peak & RMS Verification
Never assume an audio mix worked just because the script exited `0`. Always run the built-in verifier in `assets/engine/audioMixerTemplate.mjs`:
- Print `peak` and `RMS` for every 5-second slice (`0–5s`, `5–10s`, ..., `85–90s`).
- Print `peak` and `RMS` for every **spotlight SFX window** (opening thump, DJ rewind/gag, boss reveal, climax freeze, climax drop).
- **Pass Criteria:**
  - Active music/action windows: `peak ∈ [0.25, 0.92]`, `RMS >= 0.04`.
  - Spotlight SFX windows (like DJ scratch/rewind): `peak >= 0.45`, `RMS >= 0.08`.
  - Intentional freeze/silence pause: clearly lower drop before massive peak spike (`>= 0.75`) on climax frame.
  - Zero `NaN`, zero `peak >= 0.99` digital clipping.
