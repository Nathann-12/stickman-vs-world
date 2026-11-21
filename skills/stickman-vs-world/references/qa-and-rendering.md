# Visual QA, Automated Physics Lint, Dual Motion-Bursts & Stranger Mute-Test (`v5`)

Clean TypeScript (`tsc --noEmit`) never catches weak storytelling, foot sliding, off-screen clipping, or character overlaps. **Automated physics linting PLUS real rendered visual inspection — judged as a silent film — is mandatory before presenting any animation as complete.**

---

## 1. Typecheck + Automated Choreography Physics Lint First
```bash
npx tsc --noEmit
```
AND run `runChoreographyAudit(...)` from `scripts/auditChoreography.mjs` to catch in `<0.2s` BEFORE rendering frames:
- Accidental teleports (`|vx| > 2200 px/s`)
- Head/feet clipping off viewport edges or entering 9:16 TikTok bottom `280px` UI zone
- Unintentional grounded Hero ↔ Rival sprite overlaps (`|dx| < 42px`)
- HitStop time overflow or breathless pacing (`< 3` calm Reaction Beats `>= 1.1s`)

---

## 2. Select 12–16 Story Frames + TWO 5-Frame Consecutive Motion Bursts

Pick exact real-time frames (`frame = Math.round(realTimeOf(animT, HIT_STOPS) * fps)`) covering the full narrative arc (Goal setup, Floor pickup, Silent Reaction Beats, Attempt #1 fail, Living Rival, Attempt #2 chaos, Silent Realization, Attempt #3 payoff, Climax Impact Frame, Epilogue, and Minimalist End Title — checking Thai/non-Latin vowels & tone marks if non-Latin!).

PLUS include **TWO mandatory 5-frame Motion-Burst Mini-Sequences**:
1. **Walk / Carry Zero-Slide Burst** (5 frames spaced 4–6 frames apart across a walk, carry, or tiptoe — verifies planted feet stay glued to the floor with ZERO sliding & ZERO accidental casual-walk heel-skidding!).
2. **Impact / Throw Contact Burst** (5 frames spaced 2 frames apart across your fastest throw, bonk, or climax impact — verifies Anticipation → Extension → Flush Contact → Recoil!).

---

## 3. Exact Windows-Safe Remotion Still Render Command

Always include **`--sequence --muted`** on still QA renders (prevents Windows/Node `EINVAL` inside Remotion's inline audio mixer):
```bash
npx remotion render <CompositionId> out/qa --sequence --muted --frames=90,240,480,...
```

---

## 4. Mandatory 8-Point Cinema Inspection Rubric

Open **EVERY SINGLE rendered frame** with `read_file` and verify all 8 checks:

1. **Zero-HUD Cinema Purity:** Pure `#000000` canvas free of chapter titles, progress pill bars, spoiler widgets, or subtitle clutter (unless the user explicitly requested an educational overlay).
2. **The Stranger Mute-Test (MOST IMPORTANT!):** Look through the 12–16 stills in order as if you know ZERO about the code. Can a stranger immediately narrate: *(a) what the Hero wants, (b) why Attempt #1 failed, (c) how Attempt #2 spiraled out of control, (d) what each character is feeling from posture alone, and (e) how the Act-I prop physically won the ending?* If any beat is confusing without explanation, strengthen the pantomime pose, prop visibility, or reaction camera punch-in!
3. **Physical Prop Continuity:** Every carried or thrown prop sits visibly bolted to the character's hand (`rig.rightHand`/`rig.leftHand`) or flies along a clean arc — never floating detached or teleporting.
4. **Motion-Burst Contact & Weight:** The 5 consecutive burst frames clearly show *Anticipation → Extension → Flush Contact → Recoil/Bounce* with zero air-punching and zero 1-frame facing-flip jitter.
5. **Grounded Feet & Expressive Silhouettes:** Standing/walking feet rest cleanly on `FLOOR_Y`; heads, accessories, and `LivingEntity` rivals read sharply against pitch-black without occlusion.
6. **Zero Invisible Lines or Detached IK Parts:** All flat floors, wires, beams, and blades render brightly (`<GlowLine>`/`<JaggedBeam>`), and all articulated attachments sit squarely on solved IK `.end` points.
7. **Zero Cross-Zone Leakage:** Off-screen props or neighboring rooms never peek awkwardly into the active frame before the camera moves there.
8. **Safe Zones:** In 9:16 vertical, all essential action, floor contact, and end title sit cleanly above the bottom `280px` social UI zone and inside horizontal margins.

Fix any blemish found, re-run `npx tsc --noEmit`, re-render the affected frame(s), and visually confirm via `read_file`.

---

## 5. Live Studio Preview vs. Final `.mp4` Export Policy

- **Default Delivery = Live Preview:** Launch `npx remotion studio --no-open` as a background daemon (`IsDaemon: true`) and give the user the exact composition URL (`http://localhost:3000/<CompositionId>`) so they can watch, listen, and request edits right away.
- **Full `.mp4` Export = Only on Explicit User Request:**
  ```bash
  npx remotion render <CompositionId> out/<slug>-final.mp4 --codec=h264 --crf=18
  ```
  Verify the file exists and is non-empty, then report the clickable path and specs.
