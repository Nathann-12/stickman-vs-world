# Pure Cinema Framing, Living 2.5D Sets & Chromium SVG Engineering (`v5`)

Pure-black vector animation looks like an Alan Becker theatrical short ONLY when the screen stays **clean, uncluttered, and physically grounded** — letting crisp silhouettes, ground shadows, dust puffs, wordless pictograms, and cinema camera direction do all the talking.

---

## 1. Pure Cinema Frame (Zero-HUD Default) & 3-Color Grammar

- **Pure `#000000` Canvas:** Use pitch-black `#000000` (`backgroundColor: "#000000"` + `<rect fill="#000000" />`) except during a 2–3 frame `#FFFFFF` climax Impact Frame.
- **Zero-HUD Default:** Keep the viewport free of chapter banners (`I. ...`), progress pill bars, scoreboards, or floating explanatory captions. Use `<ExpressiveEmote>` (`?`, `!`, `sweat`, `idea`) and wordless `<ThoughtBubble>` pictograms (`door`, `key`, `arrowUp`, `heart`, `broken`) when a character's internal thought needs crystal clarity. Reserve screen-space typography strictly for the **minimalist End Title Card** in the final `3–4s`.
  *(If the user explicitly requests an educational explainer mode with formulas on screen, show at most ONE compact diegetic formula callout at a time and fade it cleanly before reactions or climaxes.)*
- **Non-Latin / Thai Typography Rule (CRITICAL!):** When rendering Thai (or Indic/Arabic/CJK) end titles in SVG `<text>`, ALWAYS set **`letterSpacing={0}`** and use a native Thai-capable sans font stack (`'"Leelawadee UI", "Noto Sans Thai", "Tahoma", system-ui, sans-serif'`). Any positive `letterSpacing` detaches Thai vowels and tone marks from consonants! Always visually inspect the title frame before full `.mp4` render.
- **Strict 3-Role Color Grammar:**
  1. **Hero / Discovery Axis:** Crisp White `#E0F2FE` / `#FFFFFF` + Cool Accent (Cyan `#38BDF8` or Emerald `#34D399`).
  2. **Obstacle / Rival / Chaos Axis:** High-contrast Coral-Crimson `#FB7185` / `#FF2E63` (or vibrant Orange `#FB923C` for mischievous non-evil rivals!).
  3. **Goal / Climax / Mastery Axis:** Radiant Gold `#FACC15` / `#FEF08A` (signals the desired Exit/Star, clever callbacks, and emotional resolution).

---

## 2. Smart Cinema Camera (`evalSmartCamera`) & Mobile Safe Zones

Treat the camera (`assets/engine/cameraEngine.ts`) like a **film director**, not a static CCTV tripod:
- **Use `evalSmartCamera`:** Combine deliberate director keyframes with soft target tracking (`followTarget`, `followWeight`), velocity **Lead Room** (`leadVx`), subtle **handheld micro-drift (`handheldAmp: 2.0–3.0`)** on quiet reaction close-ups so paused shots feel alive, and optional `bounds` clamping. Use `frameTwoPoints(a, b, W, H)` to frame Hero + Goal or Hero + Rival cleanly without guessing!
- **Establishing Goal Shot (`zoom: 0.90–1.02`):** Frame BOTH Hero and the desired Goal in one clear visual composition within the first `4 seconds`.
- **Silent Reaction Punch-In (`zoom: 1.24–1.38` + `handheldAmp: 2.2`):** Ease smoothly closer onto Hero's head & upper body during `scratchHead`, `shrug`, `sweat`, `<ThoughtBubble>`, or Double-Take realizations!
- **Wide Gag Reveal (`zoom: 0.78–0.92`):** Pull back dramatically when Attempt #2 explodes, towers sky-high, or unleashes a chain reaction!
- **Tactile Grounding Primitives (`rig.tsx`):** Always place `<ContactShadow>` beneath characters & props (shrinks realistically with height!), `<DustPuff>` on `LANDING_TIMES` / crashes, `<ImpactStar>` at exact bonk/kick/throw contact points, and `<PhysicsRope>` / `<SpringCoil>` for physical tethers and springs!

### 9:16 Vertical Safe Zones (`1080×1920`, TikTok / Reels / Shorts)
Platform UI covers the bottom `~280px` and far-right `~110px`:
- Keep primary floor anchor around `FLOOR_Y = 1180–1280` (with 2.5D floor thickness finishing above `y = 1580`) so characters' feet, props, and slapstick stumbles never hide behind TikTok captions!
- Keep upper sky (`y = 260–1050`) open for towering obstacles, high portals, ballistic throw arcs, and clean end titles.
- **Head Clearance:** Standing stickman head top sits near `FLOOR_Y - 175`. Place overhead set fixtures or floating props at `<= FLOOR_Y - 230` unless Hero is physically jumping to touch them.

### 16:9 Widescreen (`1920×1080`, YouTube)
- Primary floor around `FLOOR_Y = 760–820`, side safe margins `120px`, generous horizontal staging for road-trips, seesaws, chases, and physical throw arcs.

---

## 3. Building Living 2.5D Sets (Not Arcade Panels!)

Design environments that feel like **tangible physical places** characters can push against, climb, bounce on, or break:
- **Tangible Goal Landmarks:** A glowing 2.5D **Exit Door** with a physical handle that rattles (`springImpulse`) and swings open in perspective (`scaleX`) when unlocked; a shimmering **Sky Portal** high above a vertical shaft; a broken **Chasm Bridge** begging to be spanned.
- **Physical Interactive Set Pieces:**
  - **2.5D Perspective Floor / Ledges / Tiles:** Trapezoid top face + front 3D bevel lip that physically sinks (`springImpulse`) whenever characters land or heavy boulders drop on them.
  - **Elastic Springs, Seesaws & Trampolines:** Coiled zigzag `<path>` springs that visibly compress (`scaleY`) under Hero's feet and snap upward (`springImpulse`); tilting seesaw beams driven by `evalSurfaceAnchor()` so Hero tilts naturally while riding!
  - **Diegetic Props with Weight:** Heavy blocks (`100 kg`), physical switches/levers that visibly rotate `-35° → +35°`, gravity arrows `g ↓` that Hero can physically grab and flip upside-down!

---

## 4. Battle-Tested Chromium + Remotion SVG Engineering Gotchas

1. **Zero-BBox `<filter>` Invisibility & GPU Tile Limit (`>8192px`):**
   - Keep `GlowFilterDefs` on `objectBoundingBox` (`x="-60%" y="-60%" width="220%" height="220%"`) for 2D shapes, characters, and icons.
   - For **ALL flat horizontal/vertical lines, floors, wires, strings, beams, and blades**, ALWAYS use `<GlowLine>` or `<JaggedBeam>` from `assets/engine/rig.tsx` (3 unfiltered layered strokes — immune to Chromium's zero-bbox bug and zero GPU tile blowup!).
2. **Strictly Relative Stage Coordinates:**
   - Every coordinate inside any multi-zone set component MUST be relative to its anchor (`stageX + offset`, `stageY + offset`). Keep off-screen bridges outside the active `1080px`/`1920px` viewport until the camera actually pans into them so nothing peeks awkwardly at screen edges.
3. **Bolt Attached Props to Solved IK Endpoints:**
   - Never position a held prop or claw tip at a raw unreachable target — always read `heroRig.rightHand` / `heroRig.leftHand` or `solveTwoBoneIK(...).end`!
4. **Strict Remotion Determinism:**
   - NEVER use `Math.random()`, CSS `@keyframes`, `transition`, or timers. Use `seededRandom(seed)` and derive 100% of frame state purely from `frame / fps`.
   - Give every `<linearGradient>` and `<filter>` a unique ID.
