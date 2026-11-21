import { clamp, clamp01, lerp, Vec2 } from "./ik";

export type CameraKeyframe = {
  t: number;
  /** World-space horizontal focus center */
  fx: number;
  /** World-space vertical focus center */
  fy: number;
  /** Zoom factor (>1 zooms in closer, 1 = native viewport) */
  zoom: number;
  ease?: (u: number) => number;
};

export type CameraState = {
  fx: number;
  fy: number;
  zoom: number;
};

export type CameraBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

/** Continuous piecewise camera focus & zoom evaluator across all zones. */
export function evalCamera(keyframes: CameraKeyframe[], t: number): CameraState {
  if (t <= keyframes[0].t) {
    return { fx: keyframes[0].fx, fy: keyframes[0].fy, zoom: keyframes[0].zoom };
  }
  for (let i = 0; i < keyframes.length - 1; i++) {
    const a = keyframes[i];
    const b = keyframes[i + 1];
    if (t >= a.t && t <= b.t) {
      const u = clamp01((t - a.t) / Math.max(0.0001, b.t - a.t));
      const e = b.ease ? b.ease(u) : u;
      return {
        fx: lerp(a.fx, b.fx, e),
        fy: lerp(a.fy, b.fy, e),
        zoom: lerp(a.zoom, b.zoom, e),
      };
    }
  }
  const last = keyframes[keyframes.length - 1];
  return { fx: last.fx, fy: last.fy, zoom: last.zoom };
}

/**
 * Cinema Director Camera Evaluator (`v5`):
 * Combines deliberate director keyframes with optional soft target tracking,
 * velocity look-ahead (Lead Room), organic handheld micro-drift on reaction close-ups,
 * and automatic world-bounds clamping so shakes/zooms never reveal broken borders!
 */
export function evalSmartCamera(
  keyframes: CameraKeyframe[],
  t: number,
  opts?: {
    /** Optional world target to softly track (e.g. hero's chest or a thrown prop) */
    followTarget?: Vec2;
    /** 0 = pure keyframe, 0.35 = subtle follow, 1 = locked follow */
    followWeight?: number;
    /** Horizontal target velocity (px/s) for cinematic Lead Room look-ahead */
    leadVx?: number;
    /** Subtle organic handheld breathing drift in px (e.g. 2.5 on close-up reactions) */
    handheldAmp?: number;
    /** Optional world-space bounds clamp */
    bounds?: CameraBounds;
  }
): CameraState {
  const base = evalCamera(keyframes, t);
  let fx = base.fx;
  let fy = base.fy;
  const zoom = base.zoom;

  if (opts?.followTarget && (opts.followWeight ?? 0) > 0) {
    const w = clamp01(opts.followWeight ?? 0);
    const leadX = clamp((opts.leadVx ?? 0) * 0.22, -90, 90);
    fx = lerp(fx, opts.followTarget.x + leadX, w);
    fy = lerp(fy, opts.followTarget.y, w);
  }

  if (opts?.handheldAmp && opts.handheldAmp > 0) {
    const a = opts.handheldAmp;
    fx += Math.sin(t * 1.9) * a + Math.cos(t * 3.1) * a * 0.4;
    fy += Math.cos(t * 1.5 + 0.7) * a * 0.8 + Math.sin(t * 2.7) * a * 0.35;
  }

  if (opts?.bounds) {
    fx = clamp(fx, opts.bounds.minX, opts.bounds.maxX);
    fy = clamp(fy, opts.bounds.minY, opts.bounds.maxY);
  }

  return { fx, fy, zoom };
}

/**
 * Auto-framing helper: computes exact `(fx, fy, zoom)` to frame TWO characters or Hero + Goal
 * cleanly inside the viewport with generous cinema margins!
 */
export function frameTwoPoints(
  a: Vec2,
  b: Vec2,
  viewportWidth: number,
  viewportHeight: number,
  paddingPx = 240,
  minZoom = 0.75,
  maxZoom = 1.32
): CameraState {
  const fx = (a.x + b.x) / 2;
  const fy = (a.y + b.y) / 2;
  const spanX = Math.abs(b.x - a.x) + paddingPx * 2;
  const spanY = Math.abs(b.y - a.y) + paddingPx * 2;
  const zoom = clamp(Math.min(viewportWidth / spanX, viewportHeight / spanY), minZoom, maxZoom);
  return { fx, fy, zoom };
}

/**
 * Builds the exact pivot-safe SVG `transform` string for the continuous world `<g>`.
 * Works identically for 9:16 Vertical (1080x1920) and 16:9 Widescreen (1920x1080).
 */
export function buildCamTransform(
  cam: CameraState,
  shake: Vec2,
  viewportWidth: number,
  viewportHeight: number
): string {
  const cx = viewportWidth / 2;
  const cy = viewportHeight / 2;
  return `translate(${cx + shake.x}, ${cy + shake.y}) scale(${cam.zoom}) translate(${-cam.fx}, ${-cam.fy})`;
}

/**
 * Projects a world-space point into viewport screen coordinates.
 * Used by both runtime HUD alignment AND the automated Choreography Safe-Zone Linter!
 */
export function worldToScreen(
  worldPt: Vec2,
  cam: CameraState,
  viewportWidth: number,
  viewportHeight: number
): Vec2 {
  return {
    x: viewportWidth / 2 + (worldPt.x - cam.fx) * cam.zoom,
    y: viewportHeight / 2 + (worldPt.y - cam.fy) * cam.zoom,
  };
}
