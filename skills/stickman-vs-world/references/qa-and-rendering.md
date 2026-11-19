# Visual QA, Frame-Audit Loop & Rendering Protocol

Code compilation (`tsc --noEmit`) only proves syntax validity — it NEVER catches overlapping HUD labels, occluded heads, invisible filtered lines, or leaked Stage-2 props. **Visual frame inspection is mandatory before presenting any animation as complete.**

---

## 1. Typecheck First

Always verify zero TypeScript errors before rendering:
```bash
npx tsc --noEmit
```

---

## 2. Select 12–16 High-Leverage Audit Frames

Pick exact frame numbers (`frame = Math.round(timeSec * fps)`) covering every high-risk visual moment:
1. **Opening Portal / Arrival** (verify top HUD does NOT overlap portal!)
2. **First Contact / Primitive Discovery** (verify glowing flat strings/lines are visible!)
3. **Rule Operation / Scaling Peak** (e.g., `♩ = ♪ + ♪`, Octave jump)
4. **Act II Playground / Chord or Toy Assembly** (verify hero head does NOT occlude floating symbols!)
5. **Arena 1 Unfold / Full Joyful Groove** (verify 3D perspective floor + live HUD cleanliness)
6. **Act III Self-Inflicted Boss Assembly / Reveal**
7. **Arena 1 Battle / Anti-Air or Counter Device Assembly**
8. **Arena 1 → Arena 2 Transition Mid-Flight** (verify continuous camera tracking & afterimages)
9. **Arena 2 Centerpiece Morph & Comedic Reversal Gag** (e.g., DJ Rewind, Gravity Flip)
10. **Arena 2 Interactive Machine / Parkour** (verify zero label overlap on sliders/controls)
11. **Act VI Freeze / Tension Pause** (verify Boss frozen state + Hero floating cleanly)
12. **Climax Setup (Applying Act-I Primitive to Boss Core)**
13. **Climax Impact Frame (`#FFFFFF` flash or immediate burst)** (verify outgoing triad/formula cleared cleanly BEFORE climax burst text!)
14. **Finale Peaceful Landing & Minimalist Title Card**

---

## 3. Exact Remotion Inspection Render Command (Windows-Safe!)

**CRITICAL GOTCHA:** Running `npx remotion render <CompId> out/qa --frames=105,250,...` WITHOUT `--sequence --muted` crashes on Windows/Node with `EINVAL: invalid argument, write` inside Remotion's inline audio mixer!

Always render inspection stills with **`--sequence --muted`**:
```bash
npx remotion render <CompositionId> out/qa --sequence --muted --frames=105,250,515,750,1470,2260,2552,3005,3275,3660,4160,5050,5300
```
*(Note: Remotion outputs `.jpeg` or `.png` files like `element-0105.jpeg` inside `out/qa/` — list the directory if unsure of the extension.)*

---

## 4. Mandatory 7-Point Visual Inspection Rubric + Motion-Burst Check

### Part A — Motion-Burst Mini-Sequence (Catches Motion Feel Bugs!)
Static keyframes alone cannot catch air-punching, 1-frame facing-flip jitter, or floating kicks. Pick your **#1 fastest combat strike or jump-landing** (e.g., frame `3264`) and include a **5-frame mini-burst spaced 2 frames apart** (`3260,3262,3264,3266,3268`) in your `--frames=` list! Inspect those 5 consecutive frames in order to verify:
- Anticipation → Extension → Flush Contact (foot/hand touches target) → Recoil/Follow-Through!

### Part B — 7-Point Rubric on Every Rendered Frame
Open **EVERY SINGLE rendered frame** with `read_file` and verify:

1. **Zero Overlaps:** No HUD text collides with portals, props, formulas, or other labels; no climax text collides with fading symbols.
2. **Head & Silhouette Clearance:** Hero's head and silhouette accessory read crisply against pure `#000000` black without being buried behind props or text.
3. **Grounded Contact:** When standing/walking, hero's feet rest cleanly on `FLOOR_Y` (not floating 40px above or buried 40px below).
4. **No Invisible SVG Elements:** All glowing horizontal/vertical lines, strings, laser beams, and staff bars render brightly (verifying zero-bbox filter bug did not occur).
5. **No Cross-Stage Leakage:** Stage 2 / Stage 3 props never appear faintly or accidentally inside Stage 1.
6. **9:16 Mobile Readability (if vertical):** All key text and action sit comfortably above the bottom `280px` TikTok/Shorts safe zone and inside horizontal margins.
7. **Clear Cause-and-Effect:** Looking at the sequence of 12–16 stills alone, a stranger can follow the story arc (`Arrival → Discovery → Playground → Boss → Counter → Shift → Callback Climax`) effortlessly.

If ANY blemish is spotted: fix the exact component/timestamp, re-run `tsc --noEmit`, re-render the affected frame(s), and visually confirm the fix via `read_file`!

---

## 5. Live Studio Preview vs. Final `.mp4` Export Policy

- **Default Delivery = Live Preview:** Start `npx remotion studio` as a background daemon (`IsDaemon: true`) and give the user the exact composition URL (e.g., `http://localhost:3000/<CompositionId>`) so they can scrub, listen, and request tweaks immediately.
- **Full `.mp4` Export = Only on Explicit User Request:** Do NOT run a multi-minute full video render until the user asks to export/render the `.mp4`. When they ask:
  ```bash
  npx remotion render <CompositionId> out/<slug>-final.mp4 --codec=h264 --crf=18
  ```
  Verify the resulting `.mp4` exists, is non-empty, and report its exact clickable file path and specs (`1080×1920`, `60fps`, duration, file size).
