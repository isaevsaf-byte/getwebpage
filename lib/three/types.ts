/**
 * Contract between <ThreeStage> and the scene modules it loads.
 *
 * Type-only imports from 'three' keep this file free of runtime code, so the
 * stage component can import these types without pulling three.js into the
 * main bundle. Only the dynamically imported scene modules touch three.
 */
import type { Texture, WebGLRenderer } from "three";

export interface StageContext {
  renderer: WebGLRenderer;
  canvas: HTMLCanvasElement;
  /** CSS pixels of the host at creation time. Later changes arrive via handle.resize. */
  width: number;
  height: number;
  /** Device pixel ratio actually used (min(devicePixelRatio, 1.75), may later drop to 1). */
  dpr: number;
  /** Prefiltered studio environment from createStudioEnv (owned by the stage). */
  env: Texture;
  /** Ask for one more frame. Cheap to call repeatedly; coalesced into one rAF. */
  invalidate: () => void;
  /** Always false: reduced-motion visitors never reach the WebGL tier. */
  reduced: false;
}

export interface SceneHandle {
  /**
   * Draw one frame. `dt` is seconds since the previous frame of the same run
   * (clamped to 0.1, 1/60 after a sleep). `t` is seconds of active (unpaused)
   * stage time. Return true to keep animating, false to let the loop sleep
   * until the next invalidate().
   */
  render(dt: number, t: number): boolean;
  /** Host resized (CSS px) or the DPR was stepped down. The renderer is already resized. */
  resize(w: number, h: number, dpr: number): void;
  /** Receives the stage's `props` once after creation and on every change. */
  setProps?(p: Record<string, unknown>): void;
  /**
   * Fine pointers only. Normalised over the host, NDC convention:
   * nx -1 (left) … 1 (right), ny 1 (top) … -1 (bottom) — feed straight into
   * Raycaster.setFromCamera.
   */
  pointer?(nx: number, ny: number): void;
  /** Pointer left the host. If absent, the stage calls pointer(0, 0) instead. */
  pointerLeave?(): void;
  /** Optional warm-up, e.g. `renderer.compileAsync(scene, camera)`. Awaited before the first frame. */
  compile?(): Promise<void>;
  /** Free every geometry, material and texture the scene created (not ctx.env). */
  dispose(): void;
}

export type SceneFactory = (ctx: StageContext) => SceneHandle | Promise<SceneHandle>;

export type SceneModule = { default: SceneFactory };
