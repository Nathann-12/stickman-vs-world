---
name: stickman-vs-world
description: >-
  Direct, animate, and score original rule-driven "Stickman vs. [Subject]" animations
  (Math, Physics, Music, Coding, Chemistry, Geometry, Finance, etc.) in Remotion + SVG,
  inspired by Alan Becker's Animation vs. series. Use when the user asks to create a
  stickman battle, educational stickman story, vertical TikTok/Shorts (9:16) or widescreen
  (16:9) stickman animation with logical rule-based escalation, multi-arena transitions,
  fluid 2-bone IK movement, and real-sample + Foley audio. Do not use for plain corporate
  explainers, slide decks, talking-head edits, or non-stickman UI demos.
---

# Stickman vs. World — Animation Director & Procedural Engine

Build original, high-craft **Stickman vs. [Any Subject]** animations in Remotion + SVG that combine Alan Becker-inspired rule-driven visual storytelling with continuous 2-bone IK physics motion, 2.5D interactive arenas, and real-sample acoustic + Foley sound design.

## The 6 Non-Negotiable Craft Laws

1. **Derivation Chain Law (Zero Deus Ex Machina):** Every weapon, power, arena, boss, and climax MUST physically assemble or transform out of primitives established earlier (`Primitive → Rule → Toy/Playground → Self-Inflicted Boss → Tactical Counter → Act-I Callback Finale`). Never spawn arbitrary props out of thin air.
2. **Zero-Teleport Continuous Motion Law:** Drive the hero through ONE unbroken world-space path (`evalPath`) + parabolic `HOP_ARCS`. Derive stride, knee lift, bob, lean, air tuck, and stretch from instantaneous velocity (`computeKinematics`), then filter with a tight 5-tap C¹ smoother (`smoothSynthesizedPose`). Never slide static poses across the screen like a slideshow.
3. **Continuous World-Space Multi-Arena Law:** Place every arena in ONE unbroken coordinate space matched to the subject's best macro-structure (Vertical Tower, Horizontal Road-Trip, Zoom-Out Clone Sandbox, or Morphing Chamber — never clone the same template across topics). Carry characters physically between stages with zero fade-to-black cuts.
4. **Show-First Acting & Living Antagonist Law:** Communicate intent through curiosity loops, mid-motion emotions (panic sprint, joyful jump), crouching floor pickups, automatic skid braking, `lookTarget` tracking, dual-hand world IK, reactive spring props, and an articulated reactive boss (`BossEye`, `ArticulatedLimb`, `evalRecoilOffset`). Keep on-screen text minimal and symbolic (`A + ♯ = A♯ ↑`), never explanatory paragraphs.
5. **Anti-Synthetic Real Audio + Domain Foley Law:** Never synthesize tonal melodies/chords with raw sine/square oscillators — use **real studio-recorded samples** (`fetchRealSamples.mjs`) for music/percussion, layered with HitStop-synced **Tactile & Domain Foley** (footsteps, sub-thumps, whooshes, electric crackle, breaker clunks, glass chimes, real-buffer scrubs), mastered cleanly to a verified 192kbps `.mp3`.
6. **Visual-Proof & Motion-Burst QA Law:** Never declare an animation done without compiling cleanly (`tsc --noEmit`), visually inspecting 12–16 story stills PLUS a 5-frame consecutive motion burst (`--sequence --muted`), and programmatically verifying audio peak/RMS levels across the full runtime.

---

## 7-Stage Production Pipeline

Execute these stages in order. Do not skip ahead until each stage's completion criterion is satisfied.

### Stage 1 — Concept & Derivation Ledger
Before writing code, design the domain logic and complete story arc.
- Read [references/storytelling-and-derivation.md](references/storytelling-and-derivation.md).
- Define:
  - **Hero Identity:** Original name, signature color, and 1 unmistakable silhouette accessory (e.g., studio headphones, scarf, visor, goggles, antenna).
  - **Antagonist Identity:** Born *from the domain's own rules* when the hero pushes them too far — never a generic monster.
  - **7-Step Derivation Ledger:** Map `Primitive → Rule → Scale/Compound → Act II Playground → Twist/Boss Assembly → 2–3 Tactical Counters → Act-I Callback Finisher`.
  - **Format & Runtime:** Confirm aspect ratio (`1080×1920` 9:16 vertical @ 60fps for TikTok/Shorts, or `1920×1080` 16:9 @ 60fps for YouTube) and target duration (typically 60s, 90s, or 120s).
- **Done when:** Every single object, arena, weapon, and twist traces back to an earlier primitive in the ledger with zero unexplained spawns.

### Stage 2 — Beat-Locked Storyboard & World Map
- Pick the Macro-Structure matching your domain (Vertical Tower, Horizontal Road-Trip, Clone Sandbox, or Morphing Chamber) and enforce the **Concept-Budget Rule** (`60s` = 3–4 rules; `90s` = 5–6 rules max + mandatory silent comedic breathing beats) from [references/storytelling-and-derivation.md](references/storytelling-and-derivation.md).
- Write a timestamped beat table (`0.0s → END`) locking every `0.5s–3.0s` beat to:
  `Time | Act | Arena | Hero Action & Acting Beat | Boss State | Domain Formula | Camera | Audio/Foley Cue`
- Lock the world coordinate map (stage origins, floor Y anchors, ceiling launch vectors, camera safe zones).
- **Done when:** All 6 acts, every stage transition, every boss telegraph/reaction, and every audio cue share exact agreed timestamps in seconds and fit inside the Concept-Budget ceiling.

### Stage 3 — Project Setup & Reusable Engine Copy
- Create or open the Remotion TypeScript project (`@remotion/cli`, `remotion`, `react`).
- Copy the verified starter engine modules from `assets/engine/` into the project:
  - [assets/engine/ik.ts](assets/engine/ik.ts) → `src/engine/ik.ts` (2-bone IK, easing, HitStop + `realTimeOf`, spring/elastic prop physics, directional recoil, contact-reach math, camera shake)
  - [assets/engine/cameraEngine.ts](assets/engine/cameraEngine.ts) → `src/engine/cameraEngine.ts` (continuous focus/zoom camera evaluator, pivot-safe `buildCamTransform`, `worldToScreen`)
  - [assets/engine/rig.tsx](assets/engine/rig.tsx) → `src/engine/rig.tsx` (rig solver, GPU-safe `GlowFilterDefs`, `<GlowLine>`, `<JaggedBeam>`, `<BossEye>`, `<ArticulatedLimb>`, customizable `StickmanBase`, Sakuga VFX)
  - [assets/engine/poseEngine.ts](assets/engine/poseEngine.ts) → `src/engine/poseEngine.ts` (continuous path, hop arcs, dynamic surface surfing `evalSurfaceAnchor`, decay pulses, kinematics + skid braking, mid-motion emotions, floor-reach crouch, 5-tap C¹ smoother)
  - [assets/engine/CompositionTemplate.tsx](assets/engine/CompositionTemplate.tsx) → copy as starting skeleton for your main composition (pre-wires HitStops, `realTimeOf`, camera, secondary motion, articulated Boss, spring props, Impact Frame, Afterimages, and versioned `<Audio>`)
- **Done when:** `src/engine/*` compiles with `npx tsc --noEmit` (zero errors).

### Stage 4 — Visual Arenas, Props & Character Components
- Read [references/visual-arenas-and-svg-engineering.md](references/visual-arenas-and-svg-engineering.md) before authoring any SVG components.
- Build modular components:
  - Custom Hero wrapper around `StickmanBase` (with iconic accessory + power-boost aura).
  - Articulated, reactive multi-state Boss component (`BossEye`, `ArticulatedLimb`, directional `evalRecoilOffset`, telegraph glow).
  - Domain symbol/prop components wired to `elasticScale()` / `springImpulse()` so every touched prop visibly wobbles and rings, plus 2.5D/3D-perspective interactive arenas (keys that physically sink, dials/faders that move, strings/grids that vibrate).
- Use `<GlowLine>` / `<JaggedBeam>` for ALL flat lines, wires, floors, and arcs (zero Chromium bbox-filter bugs and zero `>8192px` GPU tile clipping), and keep coordinates strictly relative inside every arena component.
- **Done when:** Every arena renders cleanly at its own stage offset with zero cross-stage coordinate leakage.

### Stage 5 — Choreography, Multi-Beat Acting & Contact Sync
- Read [references/stickman-motion-and-acting.md](references/stickman-motion-and-acting.md) before wiring the main composition.
- Author ONE unified `HERO_PATH`, `HOP_ARCS`, `ANTICIPATION_TIMES`, `LANDING_TIMES`, `CAMERA_KEYS`, `lookTarget` schedule, `leftHandWorld`/`rightHandWorld` interaction schedule (supports floor-level pickup via auto-crouch!), `action`/`emotion` cues (work mid-run & mid-jump!), and boss trajectory.
- Embed at least 2–3 **Alan Becker Multi-Beat Acting Patterns** (Curiosity Loop, Double-Take Realization, Over-Commitment "Uh-Oh" Gag) and align every strike via `computeContactX()` + `CONTACT_REACH` so kicks, pokes, and slashes connect flush (zero air-punching!).
- Add Sakuga juice at impact peaks: pre-jump crouch, automatic skid-braking (`ax`), 2–4 frame Hit-Stop (synced via `realTimeOf`), 2–3 frame `#FFFFFF` inverted Impact Frame at the climax, 3-step afterimages during high-speed bursts, `SlashSmear`, `ActionSpeedLines`, and trauma-decay camera shake.
- **Done when:** Scrubbing the entire timeline shows continuous, readable, weight-filled motion with exact impact contact, zero teleports, and zero overlapping UI.

### Stage 6 — Real-Sample + Full Domain Foley Soundtrack Composition
- Read [references/audio-and-foley-pipeline.md](references/audio-and-foley-pipeline.md).
- Copy [assets/engine/fetchRealSamples.mjs](assets/engine/fetchRealSamples.mjs) → `scripts/fetch-real-samples.mjs` and run `node scripts/fetch-real-samples.mjs` to download and decode 21 verified real acoustic piano, drum, and percussion WAVs into `assets/samples/`.
- Copy and adapt [assets/engine/audioMixerTemplate.mjs](assets/engine/audioMixerTemplate.mjs) → `scripts/compose-ost.mjs` to mix all 3 layers synced to `realTimeOf(animEventT, HIT_STOPS)`:
  1. Real-sample musical/percussion cues (`playMultiAnchor`, chords, tempo escalation, harmonic shift)
  2. HitStop-Synced Tactile & Domain Foley (`mixFootstepsAlongPath` with `{ hitStops }`, `buildWarmThump`, `mixWhoosh`, `mixElasticPop`, `mixSnapClick`, `mixHeavySwitchClunk`, `mixElectricCrackle`, `mixPowerChargeSweep`, `mixGlassChime`, `mixImpactClank`, `mixBufferScratchRewind`)
  3. Dynamic arrangement arc (sparse Act I → joyful layered Act II → tense combat → dead-silent freeze → massive `fff` climax)
- Encode via `ffmpeg` to 192kbps `.mp3` inside `public/sfx/` with a versioned filename (`<slug>-v1.mp3`) and matching `<Audio key="..." />`.
- Run `auditLevels()` to prove zero silent dropouts and zero clipping.
- **Done when:** Every non-silent 5s segment and every spotlight SFX window verifies non-silent (`peak 0.25–0.92`, zero clipping) and matches the visual timestamps.

### Stage 7 — Mandatory Visual QA, Motion-Burst Check & Live Preview
- Read [references/qa-and-rendering.md](references/qa-and-rendering.md).
- Run `npx tsc --noEmit` (must exit 0).
- Render 12–16 story inspection frames PLUS a **5-frame consecutive motion burst** across your fastest strike/landing using `--sequence --muted --frames=...` and open **every single rendered frame** with `read_file` to audit contact, motion arcs, overlaps, silhouettes, grounded feet, HUD legibility, and pure-black contrast.
- Fix any visual blemishes spotted and re-verify the fixed frames.
- Launch `npx remotion studio` as a background preview server so the user can watch interactively. **Do not render the full `.mp4` until the user explicitly requests export.**
- **Done when:** Typecheck is clean, all audited frames & motion burst pass inspection, audio verification passes, and live Studio preview is ready.

---

## Red-Flag Anti-Patterns (Check Before Finishing)

- **Slideshow Skating:** Hero moves horizontally while legs stay frozen → verify `computeKinematics` velocity threshold and `evalPath` continuity.
- **Air-Punching / Rigid Props:** Hero kicks/pokes 100px away from target or touched symbols don't react → place attack keyframes via `computeContactX()` + wire `elasticScale()` / `evalRecoilOffset()`.
- **Template Cloning / Concept Overload:** Reskinning the exact same vertical tower + cramming 9 rules into 90s → choose the authentic Macro-Structure and obey the Concept-Budget ceiling.
- **Deus Ex Machina Prop:** Weapon or boss appears without an on-screen assembly/transformation beat → insert a 1–2s physical derivation beat.
- **Invisible Glowing Line / GPU Tile Clipping:** Flat `<line>` vanishes under SVG filter, or `userSpaceOnUse` exceeds `8192px` → keep `GlowFilterDefs` `objectBoundingBox` and ALWAYS use `<GlowLine>` / `<JaggedBeam>` for flat lines/wires/beams.
- **HitStop Audio Drift:** Footsteps or SFX drift off-beat after a freeze-frame → pass `{ hitStops }` into `mixFootstepsAlongPath` and wrap all event timestamps with `realTimeOf(animEventT, HIT_STOPS)`.
- **Stage Coordinate Leak:** A Stage 2/3 prop shows up in Stage 1 → replace hardcoded `y` with `cy + offset` / `yTop + offset`.
- **Trapezoidal Silence Bug:** Using `Math.sin(Math.PI * Math.min(1, p * k))` in audio DSP silences the middle of a sound → use `Math.min(1, p / attack) * Math.min(1, (1 - p) / release)`.
- **Stale Studio Audio:** Overwriting/deleting an audio file while Remotion Studio is running causes silence → version the `.mp3` filename and `<Audio key>` together.
- **Windows Frame-Render Crash:** Running `npx remotion render --frames=a,b,c` without `--sequence --muted` triggers `EINVAL` in audio mixing → always include `--sequence --muted` for still QA renders.
