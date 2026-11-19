# Stickman Motion, 2-Bone IK, Procedural Acting & Sakuga Polish

Why do most code-generated stickman animations look stiff, robotic, or like a "dragged slideshow"?
1. They linearly interpolate `x, y` while keeping limbs in a static pose ("ice-skating").
2. They teleport characters between scenes (`if (t < 10) ... else ...`), breaking physical continuity.
3. They skip anticipation, squash-and-stretch, gaze direction, and physical hand contact.
4. They render flat rigid lines instead of a curved spine + 2-bone IK limbs with inertia.

This guide defines the **5-Layer Motion Architecture** implemented in `assets/engine/ik.ts`, `assets/engine/rig.tsx`, and `assets/engine/poseEngine.ts`.

---

## Layer 1 — Proportions & Analytic 2-Bone IK Skeleton

A great stickman silhouette relies on balanced heroic proportions and a **curved spine** (never a straight vertical ruler):

```ts
TORSO_LEN = 58    // Quadratic Bézier hip -> chestCtrl -> shoulder
HEAD_RADIUS = 20  // Solid luminous or crisp hollow circle
UPPER_LEG = 42    // Thigh
LOWER_LEG = 42    // Shin (total leg reach = 84, standing hipOffset.y ≈ -72..-74 for natural slight knee bend!)
UPPER_ARM = 35    // Upper arm
LOWER_ARM = 34    // Forearm
```

### Critical IK Polarity Rules
- **Knees bend FORWARD** relative to `facing`: `kneeBend = facing === 1 ? -1 : 1` (in SVG Y-down coordinates!).
- **Elbows bend BACKWARD** relative to `facing`: `elbowBend = facing === 1 ? 1 : -1`.
- Always clamp target reach strictly inside `[|len1 - len2| + 0.001, len1 + len2 - 0.001]` so `Math.acos` NEVER produces `NaN`.
- **Depth Readability:** Render back leg + back arm first (`opacity: 0.85`, slightly thinner stroke `7.5–8px`), then spine (`9px`), then front leg + front arm (`8.5px`, `opacity: 1.0`), then head + accessory on top. This single layering trick makes every run cycle and kick read immediately in silhouette!

### Original Hero Design Rules
Never copy Alan Becker's exact orange hollow-head stickman unless explicitly requested as a fan tribute. Give every original hero:
- **Signature Color + Power Color** (e.g., Cyan-White `#E0F2FE` / `#38BDF8` → Supercharged Gold `#FACC15`).
- **1 Iconic Silhouette Accessory** attached to the head/neck transform (`rotate(headAngleDeg)`): glowing studio headphones, flowing 2-segment scarf/bandana (trails opposite `vx`!), holographic visor, lab goggles, wizard hat, or twin antennae.

---

## Layer 2 — Zero-Teleport Continuous World Trajectory

Define **ONE** continuous `HERO_PATH: KeyPoint[]` spanning `0.0s` to `DURATION`, plus parabolic jump arcs `HOP_ARCS: Array<[startSec, endSec, peakHeightPx]>`:

```ts
const HERO_PATH: KeyPoint[] = [
  { t: 0.0,  x: 300, y: S1_Y + 420 },
  { t: 2.0,  x: 300, y: FLOOR_1, ease: easeInCubic },       // Gravity fall!
  { t: 3.7,  x: 430, y: FLOOR_1, ease: easeInOutCubic },    // Walk over to poke primitive
  // ... continuous all the way through Stage 2 (S2_Y) and Stage 3 (S3_Y) to t = 90.0!
];

const HOP_ARCS: Array<[number, number, number]> = [
  [7.9, 9.1, 270],  // High octave discovery jump
  [11.0, 11.45, 75], // Playful hop between notes
];
```

**Why separate `HERO_PATH` and `HOP_ARCS`?**
- `HERO_PATH` controls clean horizontal travel and vertical stage elevations.
- `HOP_ARCS` adds exact `Math.sin(u * Math.PI) * height` gravity arcs on top, so landing frames match `FLOOR_Y` to the exact pixel and never float or sink through floors!

---

## Layer 3 — Velocity-Coupled Physics & Acting Pose Synthesis

Compute real instantaneous velocity via central finite differences (`dt = 0.025s`):
`vx = (x(t + dt) - x(t - dt)) / (2 * dt)`, `vy = (y(t + dt) - y(t - dt)) / (2 * dt)`.

Then synthesize the body from real motion + acting intent (`assets/engine/poseEngine.ts`):

### 1. Grounded Locomotion (`!airborne && Math.abs(vx) > 35`)
- `runBlend = clamp01((Math.abs(vx) - 80) / 300)` seamlessly morphs casual walk (`stride = 26`, `lean = 0.18`, `lift = 12`) into full anime sprint (`stride = 52`, `lean = 0.68`, `lift = 30`, `bob = 11`).
- Left foot & right foot oscillate `π` radians out of phase; arms swing in exact opposition to legs (`leftHand` matches `rightFoot`).
- **Result:** The stickman NEVER slides — even a 0.4-second sidestep triggers real foot steps!

### 2. Airborne Silhouette (`airborne`)
- **Rising (`vy < 0`):** Tuck knees upward (`leftFoot.y = -34`, `rightFoot.y = -18`), raise hands high, curve spine forward (`torsoCurve = 12`), apply subtle vertical stretch (`scaleY = 1 + stretch`, `scaleX = 1 - stretch * 0.5`).
- **Falling (`vy > 0`):** Extend landing legs downward (`y = -14 / -2`) in anticipation of impact; arms flare slightly outward for balance.
- **Mid-Air Flips:** Drive `bodyRotation` linearly or eased from `0 → Math.PI * 2` around the hip pivot (`pivotY = -72`).

### 3. Acting Micro-Beats (Closing the Hand-Drawn Expressiveness Gap!)
Code-driven stickmen feel 10× more alive when you schedule explicit **acting beats** alongside locomotion:
- **Gaze Tracking (`lookTarget: Vec2 | null`):** Tilts `headTilt` naturally toward whatever the stickman is noticing (a newly spawned chord, a boss telegraph, a falling note). Changing `lookTarget` rapidly left → right creates an instant **double-take**!
- **Pre-Jump / Pre-Strike Anticipation (`anticipation: 0..1`):** Schedule a `0.14s` downward crouch right *before* every big leap or dash (`hipOffset.y += anticipation * 18`, `torsoLean += anticipation * 0.28`, `scaleX = 1 + anticipation * 0.12`, `scaleY = 1 - anticipation * 0.12`). This single Principle of Animation makes every jump feel explosive!
- **Landing Squash (`squash: 0..1`):** For `0.22–0.26s` after every timestamp in `LANDING_TIMES`, decay `Math.sin(u * Math.PI) * (1 - u)` into hip drop (`+22px`), `scaleX = 1 + squash * 0.18`, `scaleY = 1 - squash * 0.16`.
- **Emotional Stances (`emotion`):**
  - `"curious"` — slight forward lean, chin tilt, one hand near chin/chest.
  - `"shocked"` — lean backward (`torsoLean = -0.32`), hands thrown up defensively, slight upward pop!
  - `"determined"` — low combat crouch, wide grounded stance, fists forward.
  - `"celebrate"` — upright bounce, both arms punching upward rhythmically on the beat!
- **Comedic Head Shake (`headShake: 0..1`):** Rapid damped oscillation on `headTilt` when confused or shaking off a hit.
- **Hit Recoil (`recoil: 0..1`):** Backward spine whip (`torsoLean -= recoil * 0.55`, `torsoCurve = -10`) when knocked back by a boss attack.
- **Dual World-Space Hand Locks (`rightHandWorld`, `leftHandWorld`):** Convert any world coordinate into local pose space (`lx = (target.x - x) * facing`, `ly = target.y - y`) so the hero physically pokes notes, grabs vinyl records, turns dials, pushes EQ sliders, carries a staff with two hands, or slaps symbols onto equations!

---

## Layer 4 — Tight 5-Tap C¹ Temporal Smoothing

Raw piecewise transitions can produce tiny elbow/knee pops at segment boundaries. Wrap the pose generator in `smoothSynthesizedPose(rawPoseFn, t, 0.04)`:
- 5-tap symmetric Gaussian-like kernel: offsets `[-1.0, -0.5, 0, +0.5, +1.0] * windowSec`, weights `[0.10, 0.22, 0.36, 0.22, 0.10]`.
- **Window rule:** Keep `windowSec` between `0.032` and `0.045` seconds! Wider windows (`> 0.08s`) turn snappy punches into mush; `0.038s` deletes micro-jitter while keeping martial arts crisp.
- **Facing-Flip Safety:** Multiply `x`-local components (`hipOffset.x`, `torsoLean`, `headTilt`, `leftFoot.x`, `rightFoot.x`, `leftHand.x`, `rightHand.x`) by `fs = p.facing === center.facing ? 1 : -1` inside the weighted sum so turning around never collapses limbs through zero.

---

## Layer 5 — Sakuga Action Juice & Camera Choreography

Reserve high-intensity VFX for genuine climax/impact peaks so contrast stays dramatic:

1. **Hit-Stops (`applyHitStops` + `realTimeOf`):**
   - Freeze `animT` for `0.04–0.08s` (2–5 frames at 60fps) on decisive hits (uppercut launch, climax meteor kick).
   - **CRITICAL:** Convert `animT` audio/shake triggers back to real clock time using `realTimeOf(eventAnimT, HIT_STOPS)` so sound effects and screen shakes NEVER drift out of sync!
2. **Impact Frames (`2–3 frames` = `0.035–0.05s`):**
   - Invert the entire canvas background to `#FFFFFF` and switch Hero/Boss/Climax Text to solid `#05060a` silhouette (`silhouetteMode={true}`) on the exact climax frame!
3. **Afterimage Ghost Trails:**
   - During high-speed launches or final strikes, render 3 faded copies at `t - 0.028`, `t - 0.056`, `t - 0.084` (`opacity: 0.22, 0.165, 0.11`).
4. **Slash Smears, Speed Lines & Seeded Particle Bursts:**
   - Use tapered crescent `SlashSmear` arcs (always oriented cleanly above the floor!), radial `ActionSpeedLines` on finishers, and domain-themed particle bursts (notes, sparks, digits, atoms — never generic plain circles!).
5. **Camera Choreography (`camTransform`):**
   - `translate(${W/2 + shakeX}, ${H/2 + shakeY}) scale(${zoom}) translate(${-fx}, ${-fy})`
   - **Dynamic Zoom Curve:**
     - Intimate discovery (`Act I`): `1.22–1.32×` so the small hero and first primitive feel personal and clear.
     - Arena combat (`Act II–V`): `1.00–1.06×` so both Hero, Boss, and interactive floor remain cleanly inside frame.
     - Climax freeze / finisher (`Act VI`): tighten to `1.12–1.20×` for drama, then ease back to `1.00×` for the title card!
   - **Trauma-Decay Camera Shake:** Sum decaying bursts `amp * Math.exp(-dt * 12) * Math.sin(dt * 72)` at landing/impact/explosion timestamps (zero persistent nausea!).

---

## Layer 6 — The 5 Alan Becker Multi-Beat Acting & Comedy Patterns

Single-frame emotions (`emotion: "curious"`) feel flat unless sequenced into **multi-beat comedic timing**. Weave at least 2–3 of these proven patterns into every 60–120s story:

### Pattern 1 — The Curiosity Loop (Act I Discovery)
Never walk straight up and master an object on frame 1! Stage discovery across 4 micro-beats (~1.8s total):
1. `t + 0.00s` **Spot & Lean:** Hero stops at `computeContactX(propX, 1, CONTACT_REACH.POKE)`, `emotion: "curious"`, `lookTarget: propPos`.
2. `t + 0.35s` **Tentative Poke:** `rightHandWorld = propPos` → prop triggers `elasticScale(t, pokeT, 0.28)` + `mixElasticPop`.
3. `t + 0.55s` **Startled Recoil Hop:** Hero hops backward 70px (`HOP_ARCS` height 55px) with `emotion: "shocked"` as the prop splits/reacts!
4. `t + 1.15s` **Delighted Repeat:** Hero tilts head, steps back in faster, and taps playfully 2–3× to confirm the rule!

### Pattern 2 — The Double-Take Realization (Act IV / Act VI Turning Point)
Show the hero *thinking* with ZERO dialogue bubbles:
1. `t + 0.00s` **Cornered Pause:** Hero halts; `lookTarget = bossPos` (`0.30s`).
2. `t + 0.30s` **Glance at Act-I Clue:** Snap `lookTarget = actOneSymbolPos` (`0.35s`) — camera lingers slightly.
3. `t + 0.65s` **Snap Back to Boss:** `lookTarget = bossPos` (`0.22s`).
4. `t + 0.88s` **Lightbulb Pop:** Tiny 35px excitement hop + `mixElasticPop` + immediate sprint into `emotion: "determined"`!

### Pattern 3 — The Over-Commitment "Uh-Oh" Gag (Act III Twist / Act V Comedy)
1. Hero joyfully repeats an action (`tap 1 → tap 2 → tap 3 → tap 4`, or pushes a slider happily with `action: "push"`).
2. On beat 4, the resulting object grows **way bigger than expected** (`scale > 2.2`, turns crimson).
3. Hero freezes (`0.35s`), leans backward (`emotion: "shocked"`), tries frantically pushing it back (`action: "push"` for `0.4s`), realizes it won't budge, spins (`facing: -1`), and sprints away!

### Pattern 4 — Tactile Spring Props (Nothing Feels Rigid!)
Every object the hero pokes, lands on, or strikes MUST physically respond using `elasticScale()` or `springImpulse()` from `assets/engine/ik.ts`:
```tsx
const bounce = elasticScale(animT, pokeTime, 0.28);
<g transform={`translate(${px}, ${py}) scale(${bounce.sx}, ${bounce.sy})`}>
  {/* symbol / note / button / equation */}
</g>
```
When a string, lever, or platform is touched, oscillate its midpoint by `springImpulse(animT, hitTime) * 26` so the entire universe feels physically elastic.

### Pattern 5 — Anticipation → Strike → Follow-Through Rhythm
Schedule **both** `ANTICIPATION_TIMES` (`evalDecayPulses(..., 0.16, "before")`) before every major jump/dash AND `LANDING_TIMES` (`evalDecayPulses(..., 0.24, "after")`) at every touchdown. The contrast between compressed crouch → stretched flight → compressed landing creates unmistakable cartoon weight.

---

## Layer 7 — Contact Sync Math & Multi-Character Fight Choreography

A common AI mistake in stickman fights is **"air-punching"**: placing Hero at `x = 500` and Boss at `x = 700` when Hero kicks, leaving a 100px empty gap!

### Exact Reach & Contact Placement (`computeContactX`)
Use `CONTACT_REACH` and `computeContactX()` from `assets/engine/ik.ts` at every strike timestamp:
- **Poke / Touch:** `CONTACT_REACH.POKE` (`68px`)
- **Punch:** `CONTACT_REACH.PUNCH` (`66px`)
- **Flying Kick:** `CONTACT_REACH.KICK` (`84px`)
- **Two-Hand Push:** `CONTACT_REACH.PUSH` (`62px`)
- **Weapon Slash:** `CONTACT_REACH.SLASH_BASE + weaponBladeLen` (`70px + bladeLen`)

Place Hero's `HERO_PATH` keyframe at contact timestamp `T` to `computeContactX(targetX, facing, reachPx, targetHalfWidth)`, and schedule:
1. **Target Recoil** at the EXACT same `T`: `BOSS_HITS.push({ at: T, dx: facing * 45, dy: -35 })` via `evalRecoilOffset(animT, BOSS_HITS)`.
2. **Hit-Stop Freeze** at `T`: `{ at: T, duration: 0.05 }` (3 frames) — freezes BOTH attacker and defender simultaneously!
3. **Audio Impact + Camera Shake** at `realTimeOf(T, HIT_STOPS)`: `mixImpactClank` + `SHAKE_BURSTS`.

### Multi-Stickman / Clone / Rival Fight Rules
When animating 2+ stickmen (e.g., rival duel, coding `for`-loop clone squad):
- Give each fighter an unmistakable color + distinct head silhouette (`hollowHead={true}` vs. solid luminous head + unique accessory).
- Instantiate separate `HERO_PATH` / `RIVAL_PATH` + `rawPoseAt` functions sharing the SAME `animT` from `applyHitStops` so both fighters freeze together on mutual weapon clashes!
- Stagger `facing` dynamically so fighters naturally turn toward each other when grounded idle (`defaultFacing = targetX >= myX ? 1 : -1`).

