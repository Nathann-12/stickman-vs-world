import { clamp01, lerp, Vec2 } from "./ik";

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

/** Continuous piecewise camera focus & zoom evaluator across all arenas. */
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
 * Builds the exact pivot-safe SVG `transform` string for the continuous world `<g>`.
 * Works identically for 9:16 Vertical Towers (1080x1920) and 16:9 Panoramas (1920x1080).
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
 * Handy for checking safe-zone clearance or aligning screen-space HUD callouts.
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
