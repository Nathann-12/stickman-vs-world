# Stickman Motion, Pantomime Acting & Ground-Locked Physics (`v5`)

What makes Alan Becker's stickmen feel *human* even without a face or a single word of dialogue?
1. **Readable Silhouette Pantomime:** Every thought — confusion, exhaustion, sneaking, bragging, panic, realization — reads instantaneously through spine curve, head tilt, arm/leg geometry, and wordless `<ThoughtBubble>` pictograms.
2. **Physical Prop Weight & Continuity:** Objects never teleport or magically morph out of thin air — characters crouch down to pick them up, lean backward carrying heavy ones, wind up before throwing them along real ballistic arcs (`evalBallisticArc`), and watch them bounce (`evalPropBounce`).
3. **Ground-Locked Zero-Slide Gait & Turn-Squash:** Pass `HERO_PATH` into `computeKinematics(heroPosAt, t, defaultFacing, HERO_PATH)` and pass `walkDist: k.walkDist` into `synthesizePhysicsPose` (and `LivingEntity`). Planted feet stay locked pixel-for-pixel to the floor during stance phase (`evalPlantedFoot`) with smooth walk-to-idle blending, smooth cartoon turn-squash across facing flips, and heel-plant skids ONLY on emergency full-sprint stops (`|vx| > 290`, never on casual walks!). Auto-derive `ANTICIPATION_TIMES` and `LANDING_TIMES` via `autoDeriveJumpTiming(HERO_PATH, HOP_ARCS)` so every jump and touchdown gets crouch, squash, and `<DustPuff>` automatically!

---

## 1. Analytic 2-Bone IK Skeleton & Depth Layering

`assets/engine/rig.tsx` solves balanced heroic proportions with a curved quadratic-Bézier spine:
- `TORSO_LEN = 58`, `HEAD_RADIUS = 20`, `UPPER_LEG = 42`, `LOWER_LEG = 42`, `UPPER_ARM = 35`, `LOWER_ARM = 34`.
- **IK Polarity (SVG Y-down):** Knees bend forward (`kneeBend = facing === 1 ? -1 : 1`), elbows bend backward (`elbowBend = facing === 1 ? 1 : -1`).
- **Back/Front Depth Layering:** Back limbs (`opacity: 0.84`, slightly thinner stroke) render behind the spine; front limbs (`opacity: 1.0`) render in front so run cycles, kicks, shrugs, and throws read cleanly in silhouette.
- **Original Hero Design:** Give every hero 1 signature silhouette accessory (scarf, visor, goggles, bandana, headphones, cape) + signature color so they are memorable without copying Alan Becker's orange stickman.

---

## 2. The V4 Silent-Film Pantomime Library (`poseEngine.ts`)

Use these built-in `emotion` and `action` modes in `synthesizePhysicsPose` to act out every silent reaction beat:

### Emotions (Work While Idle, Walking, Running, OR Airborne!)
| Emotion | Silhouette Cue | Best Story Beat |
| :--- | :--- | :--- |
| `"curious"` | Forward torso lean, chin tilt, hand near chin | Spotting an unfamiliar primitive or locked exit |
| `"confused"` | Slight backward lean, strong head tilt, hand raised | When a rule behaves unexpectedly |
| `"shocked"` / `"panicked"` | Lean back `-0.34`, hands thrown up (flailing mid-run/air!) | Sudden backfire, rival ambush, runaway explosion |
| `"exhausted"` | Slumped spine `+0.48`, low drooping head, heavy dangling arms | After pushing a 1000 kg door or failing Attempt #1/#2 |
| `"smug"` | Lean back `-0.16`, hands proudly on hips, chin lifted | Right BEFORE a contraption hilariously backfires! |
| `"determined"` | Low wide combat/sprint stance, fists forward | Launching into Attempt #2 or the Act-III comeback |
| `"celebrate"` | Upright bounce, both arms pumping skyward | Reaching the goal or pulling off a cool trick |

### Pantomime & Physical Actions
| Action | Physical Gesture | When to Use |
| :--- | :--- | :--- |
| `"scratchHead"` | Left hand on hip, right hand scratching top/back of head (`sin(t*14)`) | Silent "Hmm... how do I solve this?" beat (`1.2–1.8s`) |
| `"shrug"` | Both arms out wide, tilted head, gentle shoulder lift | Classic cartoon "Well, that didn't work!" beat |
| `"point"` | Bold leaning forward arm extended straight at target | Spotting the goal, accusing a cheeky Rival, or revealing a clue |
| `"tiptoe"` | Slow delicate high-knee sneak cycle, hunched forward | Creeping past a sleeping/chaotic rival or sneaking up to flip a switch |
| `"carry"` | Both hands overhead/forward + realistic backward counterweight lean | Physically carrying a heavy symbol, boulder, or gadget across the set |
| `"throwWindup"` → `"throwRelease"` | Aiming hand forward while right arm draws far back (`0→1`), then whips forward! | Throwing a symbol/key/number along `evalBallisticArc()` |
| `"stumble"` | Forward faceplant lunge catching self on floor (`actionProgress 0→1`) | Slapstick trip after a failed sprint or knockback |
| `"dustHands"` | Rapid palm-clapping dust-off gesture, proud posture | "Job done!" right before (or after!) the twist |
| `"wipeBrow"` | Right arm sweeps relievedly across forehead | Exhaling in relief after surviving Attempt #2 chaos |
| `"push"` / `"brace"` / `"kick"` / `"slash"` | Grounded physical exertion & crisp martial-arts strikes | Pushing stuck doors, bracing shockwaves, decisive payoff hits |

---

## 3. Physical Prop Continuity Engine (Zero Teleporting Props!)

NEVER make a prop vanish from the floor and magically spawn in a character's hand or turn into a sword mid-air. Drive every interactive prop through **one continuous state function**:

```ts
// Example continuous prop lifecycle: Floor Rest -> Held in Hand -> Ballistic Throw -> Multi-Bounce!
let propPos: Vec2 = PROP_REST;
let propRot = 0;

if (animT >= GRAB_T && animT < THROW_T) {
  // Physically bolted to Hero's solved hand coordinate!
  propPos = heroRig.rightHand;
  propRot = heroPose.facing === 1 ? -12 : 12;
} else if (animT >= THROW_T && animT < LAND_T) {
  // Real parabolic gravity flight with spin!
  const arc = evalBallisticArc(throwOriginHand, PROP_TARGET, THROW_T, LAND_T, animT, 185, 540);
  propPos = { x: arc.x, y: arc.y };
  propRot = arc.rotDeg;
} else if (animT >= LAND_T) {
  // Decaying elastic bounce settle on landing surface!
  propPos = { x: PROP_TARGET.x, y: PROP_TARGET.y - evalPropBounce(animT, LAND_T, 44) };
}
```

**Pickup Contact Rule:** For `0.35s` right before `GRAB_T`, lock `rightHandWorld = PROP_REST`! `synthesizePhysicsPose` automatically triggers `autoFloorCrouch` so the stickman physically bends down, grips the prop flush, and lifts it off the floor in one unbroken motion!

---

## 4. Living Rival & Multi-Character Choreography

Cast a **living character** rather than a lifeless turret:
- **Option A — `LivingEntity` (`assets/engine/rig.tsx`):** Turns any domain symbol (`e`, `π`, `g`, `λ`, `0`, `x`) into a cheeky bipedal creature with 2-bone IK running legs, waving arms, squash-and-stretch, and expressive eyebrows (`smug`, `angry`, `shocked`, `happy`, `panicked`).
- **Option B — Second `StickmanBase`:** A rival or companion stickman with distinct color, `hollowHead={true}`, and unique accessory running its own `RIVAL_PATH` + `rawRivalPoseAt(animT)`.
- **Eye Contact = Chemistry:** Set Hero's `lookTarget = rivalHeadPos` and Rival's `lookTarget = heroRig.headCenter` during face-offs, double-takes, and truce beats.
- **Overlapping Comedy:** Let Rival act *behind Hero's back* while Hero is busy doing `dustHands` or `smug` — the audience sees the trouble coming 1.5 seconds before Hero turns around!
- **Bolt Attached Claws/Items to `.end`:** Whenever using `ArticulatedLimb`, compute the exact tip with `solveTwoBoneIK(root, target, len1, len2, bendDir).end` so attached props never detach past max arm reach!

---

## 5. Contact Sync Math, Timing & Sakuga Restraint

1. **Exact Contact Placement (`computeContactX`):**
   - `CONTACT_REACH`: `GRAB (58)`, `PUSH (62)`, `PUNCH (66)`, `POKE (68)`, `SLASH_BASE (70)`, `KICK (84)`.
   - Place the actor's `HERO_PATH` keyframe at contact time `T` to `computeContactX(targetX, facing, reachPx, targetHalfWidth)` so knocks, grabs, shoves, and kicks connect flush.
2. **Anticipation → Action → Follow-Through:**
   - Schedule `ANTICIPATION_TIMES` (`0.16s` before major leaps/throws) and `LANDING_TIMES` (`0.24s` after touchdowns).
   - Keep the 5-tap C¹ smoother window tight (`0.035–0.042s`).
3. **Sakuga Polish (Earned Contrast):**
   - Reserve `HitStop` (`applyHitStops` + `realTimeOf`, 2–5 frames), `#FFFFFF` Impact Frames (2–3 frames), 3-step afterimages, and `ActionSpeedLines` for **1–2 genuine peak beats** so quiet pantomime comedy and high-speed action amplify each other.
