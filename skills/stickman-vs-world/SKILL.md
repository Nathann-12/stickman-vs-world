---
name: stickman-vs-world
description: >-
  Direct, animate, and score original Alan Becker-style silent-film "Stickman vs. [Subject]"
  stories (Math, Physics, Music, Coding, Chemistry, Geometry, Finance, etc.) in Remotion + SVG.
  Use when creating vertical 9:16 TikTok/Shorts or 16:9 widescreen stickman narratives with
  character-driven Rule-of-Three storytelling, zero-HUD cinema framing, living expressive rivals,
  ground-locked zero-slide 2-bone IK pantomime acting, wordless pictogram thoughts, automated
  physics/safe-zone linting, and silence-first studio-sample + Foley sound design. Do not use
  for corporate explainers, slide decks, or non-stickman UI demos.
---

# Stickman vs. World (`v5`) — Silent-Film Director & Procedural Cinema Engine

Build cinema-grade, Alan Becker-inspired **Stickman vs. [Any Subject]** animated shorts in Remotion + SVG where **a wordless stickman wants something clear, experiments physically with the laws of a universe, clashes with a living rival or runaway backfire, and solves the problem through comedic Rule-of-Three escalation and an Act-I callback payoff**.

## The 7 Non-Negotiable Masterpiece Laws

1. **Character Want & Rule-of-Three Law (Story First):** Open every film with ONE unmistakable, wordless **Character Want** visible in the first 5 seconds (escape a locked door, reach a high ledge, catch a mischievous creature, build a friend, fix a wreck). Drive the plot through **Goal → Attempt 1 (Small Discovery/Fail) → Attempt 2 (Comedic Over-Escalation / Backfire) → Silent Realization → Attempt 3 (Clever Act-I Callback Payoff)**. Every object derives from earlier primitives.
2. **Pure Cinema Frame Law (Zero-HUD Default):** Render a **100% clean `#000000` theatrical canvas** free of chapter headers (`I. ...`), arcade progress bars, spoiler pills, or explanatory subtitles. Communicate internal plans and emotions strictly through physical props, `<ExpressiveEmote>` (`?`, `!`, `sweat`, `idea`), and wordless `<ThoughtBubble>` pictograms (`door`, `key`, `arrowUp`, `heart`, `broken`). *(Add formula callouts ONLY if the user explicitly requests an educational overlay.)*
3. **Physical Prop Continuity & Weight Law:** Every prop has continuous physical life: characters crouch down to grip it (`autoFloorCrouch`), carry it bolted to `rig.rightHand` / `rig.leftHand` (`action="carry"`), throw it along real gravity arcs (`evalBallisticArc`), and watch it bounce (`evalPropBounce`). Ground characters and props with `<ContactShadow>`, landing `<DustPuff>`, `<ImpactStar>`, `<PhysicsRope>`, and `<SpringCoil>`.
4. **Living Cast & Pantomime Acting Law:** Cast expressive living characters with arms, legs, eye contact, and wants of their own (`StickmanBase` rivals/partners or limbed `<LivingEntity>` symbols with IK running legs and expressive eyebrows). Give every twist a **1.2–2.2s silent Reaction Beat** using full pantomime (`scratchHead`, `shrug`, `point`, `tiptoe`, `slump`/`exhausted`, `stumble`, `wipeBrow`, `dustHands`, `lookTarget` double-takes).
5. **Ground-Locked Zero-Slide Motion & Smart Camera Law:** Pass `HERO_PATH` into `computeKinematics(..., HERO_PATH)` and feed `walkDist: k.walkDist` into `synthesizePhysicsPose` and `LivingEntity` so planted feet stay **locked pixel-for-pixel to the floor** (0px sliding, smooth turn-squash across facing flips, heel-plant skids ONLY on emergency sprint stops `|vx| > 290`). Auto-derive jump timing via `autoDeriveJumpTiming`, use `evalSmartCamera` (soft Lead Room + subtle handheld close-up breathing), and commit 60–90s films to **1–2 rich locations** so comedy breathes.
6. **Silence-First Studio Audio + Room-Tone Law:** Fetch all **29 live-verified real studio acoustic samples** via `fetchRealSamples.mjs` (full 4-octave Yamaha C5 `C2..C6`, Acoustic Drums, Bongos, Berklee Gong, Bell, Chime, Plucked String — never raw sine melodies). Lay an ultra-subtle `<mixRoomTone>` bed so silence feels like a real theater, score comedy with HitStop-synced Foley (`mixCartoonBoing`, `mixSlideWhistle`, `mixWoodKnock`, `mixTumbleClatter`, `mixGestureSwish`, `duckRange` music ducking), and earn full music *only* during chase/climax momentum.
7. **Automated Physics Lint + Dual Motion-Burst + Stranger Mute-Test Law:** Run `npx tsc --noEmit`, run `auditChoreography.mjs` (0 teleports, clean 9:16 safe zones, 0 unintentional character overlaps, `>= 3` calm Reaction Beats), render 12–16 story stills PLUS **TWO 5-frame motion bursts** (1 Walk/Carry zero-slide burst + 1 Fastest Impact/Throw burst) via `--sequence --muted`, inspect **every single frame** with `read_file`, verify audio dynamically, and pass the **Stranger Mute-Test**.

---

## 7-Stage Production Pipeline

Execute stages in order. Satisfy each stage's completion criterion before advancing.

### Stage 1 — Story Premise, Living Cast & Prop Ledger
- Read [references/storytelling-and-derivation.md](references/storytelling-and-derivation.md).
- Define:
  - **One-Sentence Silent Premise:** `[Hero] wants [clear visual goal], tries [domain rules], collides with [living rival or physical backfire], and wins by [Act-I callback].`
  - **Story Archetype:** Pick one (`Locked Exit`, `Mischievous Runaway Rival`, `Creation Gone Wild`, or `Friendly Rivalry`).
  - **Living Cast:** Original Hero (signature color + 1 iconic silhouette accessory) + expressive Rival/Partner (`StickmanBase` or limbed `<LivingEntity>`).
  - **Physical Prop Ledger:** Trace the 3–4 core props continuously (`Rest → Picked Up → Carried/Thrown → Callback Payoff`).
  - **Runtime & Pacing Budget:** Confirm `1080×1920` (9:16) or `1920×1080` (16:9) @ `60fps`, duration (`60s` = 1 stage, 2–3 rules; `90s` = 1–2 spaces, 3–4 rules).
- **Done when:** Hero's Want reads unmistakably within 5s muted, every prop is continuous, and the plot fits inside the pacing ceiling.

### Stage 2 — Beat-Locked Silent-Film Script & Spatial Map
- Write a timestamped **Beat Script Table** (`0.0s → END`) obeying **Beat → Reaction (`1.2–2.2s`) → Decision → Action**:
  `Time | Story Function | Hero Pantomime & Held Prop | Rival Emotion & Action | Physical Cause → Effect | Camera (fx, fy, zoom) | Silence / Foley / Music Cue`
- Mark at least 3 explicit **Silent Reaction Beats** (camera punch-in `1.22–1.35×` + subtle `handheldAmp` + `scratchHead`/`shrug`/`ThoughtBubble`) and exact world anchors (`FLOOR_Y`, prop rest spots, contact points via `computeContactX`).
- **Done when:** Reading the table muted tells a funny, emotionally clear story with zero unexplained prop spawns.

### Stage 3 — One-Command Project Scaffold & V5 Engine Copy
- Scaffold cleanly with [assets/engine/scaffoldProject.mjs](assets/engine/scaffoldProject.mjs) (`node <skill>/assets/engine/scaffoldProject.mjs <dir> <CompId>`) OR copy all V5 engine files manually:
  - `assets/engine/ik.ts` → `src/engine/ik.ts` (2-bone IK, HitStop + `realTimeOf`, `evalBallisticArc`, `evalPropBounce`, `elasticScale`, `springImpulse`, `evalRecoilOffset`, `computeContactX`, camera shake)
  - `assets/engine/cameraEngine.ts` → `src/engine/cameraEngine.ts` (`evalCamera`, `evalSmartCamera` with Lead Room + handheld breathing + bounds clamp, `frameTwoPoints`, `worldToScreen`)
  - `assets/engine/rig.tsx` → `src/engine/rig.tsx` (`StickmanBase`, `LivingEntity`, `ExpressiveEmote`, `ThoughtBubble`, `ContactShadow`, `DustPuff`, `ImpactStar`, `PhysicsRope`, `SpringCoil`, `GlowFilterDefs`, `<GlowLine>`, `<JaggedBeam>`, Sakuga VFX)
  - `assets/engine/poseEngine.ts` → `src/engine/poseEngine.ts` (ground-locked zero-slide `evalGroundDistance` + `evalPlantedFoot`, smooth turn-squash, sprint-only skid braking, full Pantomime library, C¹ smoother)
  - `assets/engine/timeline.ts` → `src/engine/timeline.ts` (`autoDeriveJumpTiming`, `auditPathSpeeds`)
  - `assets/engine/CompositionTemplate.tsx` → starting zero-HUD V5 skeleton
- **Done when:** `npm install` finishes and `npx tsc --noEmit` exits `0`.

### Stage 4 — Living Set, Physical Props & Character Components
- Read [references/visual-arenas-and-svg-engineering.md](references/visual-arenas-and-svg-engineering.md).
- Build modular components on pure `#000000` (zero HUD chrome):
  - Custom Hero wrapper around `StickmanBase` + `<ContactShadow>` + automatic landing `<DustPuff>`.
  - Living Rival/Partner (`StickmanBase` or `<LivingEntity>` with `walkDist`) + `<ContactShadow>`.
  - Tangible 2.5D Set & Physical Props (`<SpringCoil>`, `<PhysicsRope>`, doors, levers, seesaws, boulders) using `<GlowLine>`/`<JaggedBeam>` for ALL flat lines/beams, strictly relative stage coordinates, and Thai/non-Latin safe typography (`letterSpacing={0}` + native Thai font stack when non-Latin end titles are used).
- **Done when:** Every set element and prop renders cleanly with zero HUD clutter, zero zero-bbox filter bugs, and zero coordinate leakage.

### Stage 5 — Pantomime Choreography, Prop Physics & Automated Physics Lint
- Read [references/stickman-motion-and-acting.md](references/stickman-motion-and-acting.md).
- Wire continuous `HERO_PATH`, `RIVAL_PATH`, `HOP_ARCS`, `autoDeriveJumpTiming(...)`, `evalSmartCamera`, eye-contact `lookTarget`, `rightHandWorld`/`leftHandWorld` floor grabs, `walkDist: k.walkDist`, continuous prop states (`rest → rig.rightHand → evalBallisticArc → evalPropBounce`), `<ImpactStar>`, and `<ThoughtBubble>`.
- Run [assets/engine/auditChoreography.mjs](assets/engine/auditChoreography.mjs) to verify zero teleports, clean viewport/9:16 safe zones, zero accidental Hero/Rival overlaps, valid HitStop bounds, and `>= 3` calm Reaction Beats BEFORE rendering frames!
- **Done when:** `npx tsc --noEmit` exits `0` AND `auditChoreography.mjs` passes with zero errors/unintended overlaps.

### Stage 6 — Silence-First Studio Sample + Foley Soundtrack
- Read [references/audio-and-foley-pipeline.md](references/audio-and-foley-pipeline.md).
- Run `node scripts/fetch-real-samples.mjs` to download & decode all **29 verified real studio WAVs** (`C2..C6` Concert Grand Piano, Acoustic Drum Kit, Bongos, Berklee Gong, Bell, Chime, Plucked String).
- Compose stereo soundtrack in `scripts/compose-ost.mjs` synced strictly to `realTimeOf(animT, HIT_STOPS)`:
  - Add subtle `mixRoomTone(0.004)` so silent comedy pauses feel alive.
  - Spot HitStop-synced footsteps (`mixFootstepsAlongPath` with `{ hitStops }`), slapstick Foley (`mixCartoonBoing`, `mixSlideWhistle`, `mixWoodKnock`, `mixTumbleClatter`, `mixGestureSwish`), real Berklee `orch_pluck` for tiptoe sneaks, `orch_bell`/`orch_chime` for portals & ideas, `orch_gong` + `C2..C6` piano for climaxes, and `duckRange()` around headline gags!
- Encode to 192kbps `.mp3` inside `public/sfx/<slug>-v1.mp3` with matching `<Audio key="<slug>-v1" />` and audit levels via `auditLevels()`.
- **Done when:** Active peaks sit cleanly in `[0.35, 0.92]` (climax `>= 0.75`, zero clipping) AND silent comedy pockets verify genuine room-tone contrast (`rms < 0.025`).

### Stage 7 — Dual Motion-Burst Visual QA, Stranger Mute-Test & Live Preview
- Read [references/qa-and-rendering.md](references/qa-and-rendering.md).
- Render 12–16 story stills PLUS **TWO 5-frame motion bursts** using `--sequence --muted --frames=...`:
  1. **Walk/Carry Burst** (5 frames spaced 4–6 frames apart across a walk or carry — proves planted feet stay glued to the floor with zero sliding & zero casual-walk skidding!)
  2. **Impact/Throw Burst** (5 frames spaced 2 frames apart across fastest throw, bonk, or climax — proves Anticipation → Flush Contact → Recoil!)
- Inspect **EVERY rendered frame** via `read_file` against the 9-Point Cinema Rubric & **Stranger Mute-Test**. Fix any flaw and visually re-verify.
- Launch `npx remotion studio --no-open` as a background daemon (`IsDaemon: true`) and give the user the localhost URL. **Render full `.mp4` only when explicitly requested.**
- **Done when:** Typecheck, Choreography Lint, Dual Motion-Burst QA, Stranger Mute-Test, and Audio Audit all pass, and live Studio preview is running.

---

## Red-Flag Anti-Patterns (Catch Before Delivery)

- **Walking Foot-Slide / Casual-Walk Skid:** Omitting `walkDist: k.walkDist` or using `t * varyingFreq` → always pass `HERO_PATH` to `computeKinematics` and `walkDist: k.walkDist` into `synthesizePhysicsPose` & `LivingEntity`.
- **Arcade HUD / Spoiler Chrome:** Chapter headers, progress pill bars, or formula banners cluttering a silent film → delete HUD chrome; use physical props, `<ExpressiveEmote>`, and wordless `<ThoughtBubble>` pictograms.
- **Boss-Rush Checklist / Polygon Turret:** Spawning an angry hexagon with zero Hero goal → build around a clear **Character Want**, a limbed `<LivingEntity>` or rival stickman, and **Rule-of-Three** escalation.
- **Teleporting Props / Detached IK Claws:** Morphing props mid-air or placing attached claws at raw `target` → track props through `rest → rig.rightHand → evalBallisticArc → evalPropBounce` and bolt claws to `solveTwoBoneIK(...).end`.
- **Broken Thai / Non-Latin Titles:** Putting `letterSpacing > 0` or Latin-only serif fonts on Thai/Indic text → always use `letterSpacing={0}` + native Thai sans font stack (`"Leelawadee UI", "Noto Sans Thai", "Tahoma", sans-serif`) and visually verify the title frame before `.mp4` export!
- **Wallpaper Drum Loop / Digital Dead Zero:** Playing nonstop drums over comedy or leaving digital `0.000` silence → use `mixRoomTone(0.004)`, `duckRange()`, and earned music spotting.
- **Invisible Flat Line / Windows Frame-Render Crash:** Putting SVG `<filter>` on flat `<line>` or omitting `--sequence --muted` on Windows → always use `<GlowLine>`/`<JaggedBeam>` and `--sequence --muted`.
