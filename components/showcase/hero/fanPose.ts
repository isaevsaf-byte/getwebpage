/**
 * The CSS-3D fan, posed through the same camera as hero/HeroScene.
 *
 * The poster is what desktop visitors see first, and on the WebGL tier the
 * canvas cross-fades in over it — so the two must line up, or the panes
 * visibly jump. Instead of hand-tuned CSS poses, the camera is reproduced in
 * CSS: a perspective equal to the camera's focal length (in svh, since the
 * stage is 100svh tall), the camera's view rotation as one matrix3d on the
 * fan, and each pane at its world position scaled to svh.
 *
 * Pure math, evaluated once at module load — identical on server and client.
 * Mirrors HeroScene's camera and pane table; keep them in sync.
 */

import type { HeroPaneSlug } from "./contract";

type V3 = [number, number, number];

export interface FanPaneDef {
  slug: HeroPaneSlug;
  pos: V3;
  rotY: number;
  rotX: number;
}

/** Mirror of HeroScene: camera, look-at, vertical fov (deg), pane size. */
const CAM: V3 = [0, 0.25, 6.2];
const LOOK: V3 = [0.7, 0, 0];
const FOV = 28;
const PANE_W = 1.6;

/** Mirror of HeroScene's DEFS (back to front). */
export const FAN_PANES: readonly FanPaneDef[] = [
  { slug: "beautasy", pos: [1.67, 1.06, -1.8], rotY: -0.1, rotX: 0 },
  { slug: "safarisaev", pos: [0.45, 0.46, -1], rotY: 0.3, rotX: 0 },
  { slug: "silkbees", pos: [2.17, 0.32, -0.85], rotY: -0.42, rotX: 0 },
  { slug: "sketch", pos: [1.2, -0.31, 0.45], rotY: -0.16, rotX: 0.04 },
];

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3): V3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const r = (n: number, d = 5) => {
  const v = Number(n.toFixed(d));
  return Object.is(v, -0) ? 0 : v;
};

/** Focal length in svh for a 100svh-tall stage. */
const F = 50 / Math.tan(((FOV / 2) * Math.PI) / 180);
const D = len(sub(LOOK, CAM));
/** svh per world unit at the look-at distance. */
const S = F / D;

// Camera basis (three.js lookAt with up = +Y): back = C − L.
const back = norm(sub(CAM, LOOK));
const right = norm(cross([0, 1, 0], back));
const up = cross(back, right);

/**
 * CSS coords q = S·(x, −y, z). Camera space p_c = Rᵀ(p − C). We want
 * o = S·(x_c, −y_c, z_c + D). With F = diag(1,−1,1): o = (F Rᵀ F) q + t,
 * t = −S·F·Rᵀ·C + (0, 0, S·D).
 */
const Rt = [right, up, back]; // rows of Rᵀ
const flip = [1, -1, 1];
const M: number[][] = [0, 1, 2].map((i) => [0, 1, 2].map((j) => flip[i] * Rt[i][j] * flip[j]));
const RtC = Rt.map((row) => dot(row, CAM));
const T: V3 = [-S * flip[0] * RtC[0], -S * flip[1] * RtC[1], -S * flip[2] * RtC[2] + S * D];

/** CSS perspective for the scene (svh). */
export const FAN_PERSPECTIVE = `${r(F, 3)}svh`;

/** The camera view as a transform on the fan container. matrix3d is column-major. */
export const FAN_CAMERA_TRANSFORM =
  `translate3d(${r(T[0], 4)}svh, ${r(T[1], 4)}svh, ${r(T[2], 4)}svh) ` +
  `matrix3d(${[
    M[0][0], M[1][0], M[2][0], 0,
    M[0][1], M[1][1], M[2][1], 0,
    M[0][2], M[1][2], M[2][2], 0,
    0, 0, 0, 1,
  ]
    .map((v) => r(v, 6))
    .join(", ")})`;

/** Pane width in svh (all panes share HeroScene's 1.6-unit width). */
export const FAN_PANE_WIDTH = `${r(PANE_W * S, 3)}svh`;

/**
 * A pane's transform inside the fan (transform-origin 0 0): centre the box,
 * rotate (three's rotX ↔ CSS rotateX(−θ) because y is flipped), then place.
 * The sketch's rotation is left to CssPane's --rx/--ry so commit can tween it.
 */
export function fanPaneTransform(def: FanPaneDef, withRotation = true): string {
  const [x, y, z] = def.pos;
  const place = `translate3d(${r(x * S, 3)}svh, ${r(-y * S, 3)}svh, ${r(z * S, 3)}svh)`;
  const rot = withRotation ? ` rotateX(${r(-def.rotX, 4)}rad) rotateY(${r(def.rotY, 4)}rad)` : "";
  return `${place}${rot} translate(-50%, -50%)`;
}

/** The sketch pane's resting tilt in degrees, for CssPane's tilt prop. */
export function fanSketchTilt(): { x: number; y: number } {
  const def = FAN_PANES.find((p) => p.slug === "sketch");
  if (!def) return { x: 3, y: -10 };
  return { x: r((-def.rotX * 180) / Math.PI, 2), y: r((def.rotY * 180) / Math.PI, 2) };
}
