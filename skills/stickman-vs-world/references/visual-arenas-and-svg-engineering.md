# Visual Design, 2.5D Arenas & Chromium/Remotion SVG Engineering

Pure-black vector aesthetics look razor-sharp on OLED phones and widescreen monitors ONLY when color semantics, spatial safe zones, 2.5D depth cues, and Chromium SVG rendering traps are engineered deliberately.

---

## 1. Pure-Black Contrast & 3-Color Semantic Palette

- **Background:** Always use **pure pitch-black `#000000`** (`backgroundColor: "#000000"` + `<rect fill="#000000" />`), unless explicitly overridden (or during a 2–3 frame `#FFFFFF` Impact Frame). Avoid washed-out slate `#1a1d24` backgrounds that lower visual punch on TikTok/Shorts.
- **Strict 3-Role Color Grammar:**
  1. **Hero / Discovery Axis:** Crisp White core `#FFFFFF` / `#E0F2FE` + Cool Accent (e.g., Cyan `#38BDF8` / Emerald `#34D399`).
  2. **Threat / Boss Axis:** High-contrast Crimson-Magenta `#FB7185` / `#FF2E63` (instant peripheral recognition of danger!).
  3. **Power / Transformation / Climax Axis:** Radiant Gold `#FACC15` / `#FEF08A` (signals reflections, supercharges, time-freeze, and final mastery).
- **Subtle Acoustic/Energy Breathing Ring:** A thin (`strokeWidth={2}`, `opacity: 0.14–0.30`) centered halo ring pulsing softly on the beat adds ambient life without cluttering the black void.

---

## 2. Aspect-Ratio Safe Zones & Layout Geometry

### 9:16 Vertical (`1080×1920`, TikTok / Reels / YouTube Shorts)
Platform UI covers the bottom ~280px (captions/username/sound bar) and right ~120px (like/comment/share buttons). Design accordingly:
- **Top Chapter Title Band:** `y = 115–135` (muted `#64748B`, uppercase tracked `fontSize: 22–26`, `letterSpacing: 4–5`). Hide during initial portal zoom if the portal sits near the top!
- **Live State / Progress HUD Band:** `y = 200–285` (e.g., 4-chord pill bar `[ Am ][ F ][ C ][ G ]` + active track pills, or stage indicator). Keep compact (`max-width: 760px`, centered at `x = 540`).
- **Primary Playable Stage Zone:** `y = 380–1520` (hero floor around `FLOOR_Y = 1050–1250`, leaving ample vertical sky for jumps, falling attacks, and overhead formulas, plus room below for 3D-perspective floor depth!).
- **Hero Head Clearance Rule:** A standing stickman with feet at `FLOOR_Y` has the top of their head/accessory around `FLOOR_Y - 175`. Place floating symbols/notes above a standing hero at **`<= FLOOR_Y - 210`** (or offset horizontally by `>= 90px`) so the hero's head NEVER occludes key symbols.
- **Bottom Social Safe Zone:** Keep `y > 1620` free of essential text or formulas (visual perspective floor lips or ambient background trails are fine).

### 16:9 Widescreen (`1920×1080`, YouTube)
- **Playable Floor:** `FLOOR_Y = 740–800`.
- **Stage Stacking:** Horizontal panorama (`S1_X = 0`, `S2_X = 1920`, `S3_X = 3840`), or vertical + horizontal hybrid for large chases.
- **HUD Margins:** Keep top labels at `y = 75–95`, side safe margins `120px`.

---

## 3. Building Interactive 2.5D / 3D-Perspective Arenas in Pure SVG

Flat 1-pixel horizontal lines feel cheap. Upgrade every major arena into an **interactive 2.5D object** that reacts physically to character weight and attacks:

### Technique A — Trapezoid 3D Perspective Floor/Keyboard/Board
Project top edge (`topLeft..topRight` at `yTop`) down to wider bottom edge (`botLeft..botRight` at `yTop + depth`):
- Draw each tile/key as two `<polygon>` faces: **top surface** + **front 3D bevel lip** (`height = 48–60px`).
- **Physical Sink:** When Hero steps on key/tile `i`, shift that tile downward (`sink = 22–28px`), light its surface bright accent (`#38BDF8` / `#FACC15`), shorten its bevel lip (`frontLip - sink * 0.5`), and shoot a vertical gradient light column upward!
- **Background Depth Silhouette:** Add faint (`opacity: 0.20–0.32`) structural cues behind the floor (grand piano wing & vibrating harp strings, perspective perspective grid lines vanishing toward the horizon, glowing circuit traces).

### Technique B — Elliptical 3D Discs & Portals
- Build turntables, portals, orbitals, or radar arenas using concentric `<ellipse>` / `<circle>` grooves with subtle specular shine wedges (`opacity: 0.08`) and rotating radial markers driven by `spinDeg`.
- Reverse `spinDeg` direction and shift accent color (`Cyan/Magenta → Gold`) during rewind/time-reversal gags!

### Technique C — Uncluttered Interactive Control Consoles
- For multi-slider consoles (EQ `BASS / MID / HIGH`, Physics sliders `G / μ / k`, Code switches `IF / ELSE / LOOP`):
  - Space columns generously (`>= 240–290px` apart on `1080px` width) so value labels (`+12dB MAX!`) NEVER overlap neighboring sliders.
  - Drive slider thumb Y directly from Hero's hand/foot Y so pushing a slider visibly moves the mechanism in real time.

---

## 4. Battle-Tested Chromium + Remotion SVG Engineering Gotchas

Avoid these exact bugs that silently break SVG animations in Chromium/Remotion:

### Gotcha 1 — Zero-Height `<filter>` Invisibility & GPU Tile Limit (`>8192px`) (CRITICAL!)
1. **Zero-BBox Invisibility:** Default SVG `<filter>` uses `objectBoundingBox`. Applying `filter="url(#cyan-glow)"` to a perfectly horizontal `<line y1="500" y2="500" />`, vertical `<line>`, or flat `<path>` multiplies the filter region by `0` → Chromium **silently renders NOTHING (100% invisible)**!
2. **GPU Tile Blowup:** Conversely, setting `filterUnits="userSpaceOnUse"` across a giant multi-stage tower (`height > 8192px`) exceeds Chromium's GPU raster tile limit, clipping blurs or tanking render speed!
- **The Bulletproof V3 Rule:**
  - Keep `GlowFilterDefs` on `objectBoundingBox` with generous padding (`x="-60%" y="-60%" width="220%" height="220%"`) for **2D shapes, characters, icons, and text** (fast GPU tiles, zero clipping!).
  - For **ALL horizontal/vertical lines, floors, copper wires, laser beams, and arcs**, ALWAYS use `<GlowLine>` or `<JaggedBeam>` from `assets/engine/rig.tsx` (3 unfiltered layered strokes: soft outer halo + mid color + hot white core) — **100% immune to zero-bbox bugs AND zero filter overhead!**

### Gotcha 2 — Hardcoded Absolute Coordinates Inside Multi-Stage Arenas
NEVER write hardcoded canvas Y values like `y={1340}` inside a Stage 2 or Stage 3 arena component! Because all stages live in one continuous world `<g transform={camTransform}>`, a hardcoded `y={1340}` renders inside Stage 1 (`S1_Y = 0`) and photobombs the opening act!
- **Rule:** Every single coordinate inside an arena component MUST be computed relative to its anchor prop (`yTop + offset`, `cy + offset`, `cx + offset`).

### Gotcha 3 — Transition Boundary Overlap Collisions
Whenever a climax graphic bursts in (e.g., `fff` at `t = 84.0s`) or a portal closes (`t = 2.2s`):
- Cut the outgoing floating formula/triad cleanly at `t < 84.0` (NOT `t < 84.4`!). Even a `0.4s` overlap ruins the hero frame.
- Delay top HUD chapter text until the opening portal finishes its zoom-in (`t >= 2.35s`) with a smooth `0.4s` fade-in.

### Gotcha 4 — Strict Remotion Determinism
- **NEVER** use `Math.random()` inside render (causes frame flicker under multi-threaded rendering). Use `seededRandom(seed)` from `assets/engine/ik.ts`.
- **NEVER** use CSS `@keyframes`, `transition`, `requestAnimationFrame`, or `setTimeout`. Derive 100% of animation state purely from `const frame = useCurrentFrame(); const t = frame / fps;`.
- Always give `<linearGradient>` and `<filter>` unique IDs so multiple components never clobber each other's defs.
