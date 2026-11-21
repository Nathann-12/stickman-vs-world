# Silence-First Studio Scoring, Room-Tone & Tactile Foley (`v5`)

Great silent-film comedy is **50% timing and 50% contrast between warm theater silence and crisp sound**. When a clip plays a nonstop 120–160 BPM drum loop from start to finish, comedic pauses vanish.

Follow this **Silence-First 3-Layer Alan Becker Mix** using `assets/engine/fetchRealSamples.mjs` (29 verified real studio samples!) and `assets/engine/audioMixerTemplate.mjs`.

---

## 1. The Anti-Synthetic Rule: 29 Real Studio Samples First

1. Run `node scripts/fetch-real-samples.mjs`. It downloads and decodes **29 live-verified real acoustic recordings** from `tonejs.github.io` into 44.1kHz 16-bit mono WAVs inside `assets/samples/`:
   - **17 Yamaha C5 Salamander Concert Grand Piano anchors (`C2..C6`, full 4-octave range!)** — includes deep sub-bass `C2/Ds2/Fs2` for Pixar/cinematic weight + sparkling `C6`!
   - **6 Real Studio Acoustic Drum Kit pieces** (`kick`, `snare`, `hihat`, `tom1`, `tom2`, `tom3`)
   - **2 Real Acoustic Bongos / Rims** (`perc_wood_hi`, `perc_wood_lo`)
   - **4 Real Berklee Studio Orchestral / Cinema Foley WAVs:**
     - `orch_gong.wav` — resonant orchestral crash/climax swell!
     - `orch_bell.wav` — real acoustic portal/victory bell!
     - `orch_chime.wav` — shimmering chime!
     - `orch_pluck.wav` — real plucked acoustic string for sneaky `tiptoe` comedy!
2. Play tonal piano notes/chords via `playMultiAnchor(PIANO, ...)` (within `±1` semitone of real recordings — never raw sine melodies!).
3. Add **`mix.mixRoomTone(0.004)`** across the mix so silent comedic pauses feel like a real acoustic theater instead of dead digital zero (`0.000`).
4. Call **`mix.duckRange(R(gagT), 0.28, 0.38)`** right before mixing headline gags (`BONK`, `BOING`, `IDEA`) over active music so punchlines cut crystal clear!
5. Add subtle **`mix.mixGestureSwish(R(t), pan, 0.12)`** on crisp pantomime gestures (`shrug`, `scratchHead`, `point`, `wipeBrow`)!

---

## 2. The Silence-First Spotting Map (Pixar / Alan Becker Rhythm)

Do NOT wallpaper the whole timeline with drums! Spot music dynamically around story emotions:

| Story Phase | Musical Density | Sound Design Focus |
| :--- | :--- | :--- |
| **Goal Setup & First Discovery** | **90% Silence** | Crisp footsteps (`mixFootstepsAlongPath`), door knocks (`mixWoodKnock`), head-scratch soft brush, single delicate Yamaha C5 piano notes when Hero spots a clue! |
| **Attempt #1 (Small Comedic Fail)** | **Sparse Playful Punctuation** | Cartoon `mixElasticPop`, `mixCartoonBoing`, `mixSlideWhistle` on fail arcs, `mixTumbleClatter` on stumbles, comedic 2-note descending piano "*wah-wah*" stinger → **1.5s clean silence for Hero's `shrug`!** |
| **Attempt #2 (Escalation / Chase)** | **Earned Driving Acoustic Score** | Bring in real acoustic piano ostinato + real kick/snare/hi-hat ONLY when the chase or backfire truly kicks off! Layer `mixWhoosh`, `mixElectricCrackle`, `mixPowerChargeSweep`, `mixImpactClank`. |
| **Silent Realization Beat** | **Sudden Drop to Clean Silence** | Cut music cleanly! Let Hero's footsteps, a quiet gaze pause, and ONE crisp lightbulb `mixElasticPop` + single high piano ping carry the turning point! |
| **Attempt #3 Callback Payoff** | **Big Earned Peak → Warm Resolution** | Rising whoosh/charge → HitStop-locked `realTimeOf()` impact (`buildWarmThump` + `mixImpactClank` + massive triumphant Major piano bloom) → warm peaceful solo acoustic piano resolution as Hero achieves their original Goal! |

---

## 3. Full Cartoon & Domain Foley Toolkit (`audioMixerTemplate.mjs`)

Every event timestamp MUST wrap `animT` with **`realTimeOf(animEventT, HIT_STOPS)`** (and pass `{ hitStops: HIT_STOPS }` to `mixFootstepsAlongPath`) so zero audio drifts after a freeze-frame:

- **Locomotion & Weight:** `mixFootstepsAlongPath(heroPosAt, isAirborneAt, { hitStops })`, `buildWarmThump(DRUMS.kick)`
- **Silent-Film Slapstick Comedy:**
  - `mixCartoonBoing(t, pan, baseHz, dur, gain)` — springs, trampolines, bouncy fails, head-bonks!
  - `mixSlideWhistle(t, dur, startHz, endHz, gain, pan)` — rising throws/launches, comical falling drops!
  - `mixWoodKnock(t, pan, pitchHz, gain)` — knocking on locked exit doors, tapping props, subtle comic bonks!
  - `mixTumbleClatter(t, hits, spanSec, pan, gain)` — stumbles, collapsing blocks, scattered debris!
  - `mixElasticPop(t, pan, startHz, endHz, gain)` — lightbulb realizations, curious pokes, tiny clones popping out!
- **Action & Domain Physics:**
  - `mixWhoosh` (throws, flips, leaps, slashes), `mixSnapClick` (latching props), `mixHeavySwitchClunk` (heavy doors, levers, switches), `mixElectricCrackle` (sparks/energy), `mixPowerChargeSweep` (charging contraptions), `mixGlassChime` (sparkles/portals/magic), `mixImpactClank` (hard collisions), `mixBufferScratchRewind` (real-buffer tape/vinyl scrub).

---

## 4. Critical DSP & Remotion Gotchas

1. **No Trapezoidal Silence Bug:** Always use `Math.min(1, p / attack) * Math.min(1, (1 - p) / release)` for envelopes — NEVER `Math.sin(Math.PI * Math.min(1, p * k))`.
2. **192kbps Stereo MP3 + Cache-Busting Version Key:**
   - Transcode final mix via `ffmpeg -y -i temp.wav -c:a libmp3lame -b:a 192k public/sfx/<slug>-v1.mp3`.
   - Always pair filename and `<Audio key="<slug>-v1" src={staticFile("sfx/<slug>-v1.mp3")} />`. If re-mixing while Remotion Studio is running, bump to `-v2` on BOTH filename and `key`.
3. **Mandatory Programmatic Peak & Contrast Audit (`auditLevels`):**
   - Active action / payoff windows: `peak ∈ [0.40, 0.92]`, zero `NaN`, zero digital clipping (`< 0.99`).
   - Spotlight Foley gags (door knock, boing, throw whoosh, climax drop): clearly audible (`peak >= 0.35`, climax `>= 0.75`).
   - **Silence-First Contrast Check:** Intentional silent comedy / realization pockets MUST verify visibly quieter (`rms < 0.03`) right beside punchy peaks — proving genuine cinema dynamic range!
