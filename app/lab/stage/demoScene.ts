/**
 * Demo scene for /lab/stage: four glass panes with the real portfolio
 * screenshots, the studio env and a light-bar intro. It mirrors the hero's
 * budget (4 panes, 4 light bars) so the lab's fps numbers mean something.
 *
 *   /lab/stage          on-demand loop: intro, then the loop sleeps
 *   /lab/stage?loop=1   renders every frame (worst case for the fps probe)
 */
import {
  PerspectiveCamera,
  Raycaster,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
  type Object3D,
} from "three";
import { createGlassPane, type GlassPane } from "@/lib/three/glassPane";
import { createLightBar, type LightBar } from "@/lib/three/lightBar";
import type { SceneFactory } from "@/lib/three/types";

type PaneDef = {
  src: string;
  domain: string;
  pos: [number, number, number];
  rotY: number;
  rotX?: number;
  dim: number;
};

// Back to front, so the light-bar stagger runs back → front.
const PANES: PaneDef[] = [
  { src: "/portfolio/safarisaev.jpg", domain: "safarisaev.ai", pos: [1.05, 0.62, -1.25], rotY: -0.06, dim: 0.55 },
  { src: "/portfolio/bektothefuture.jpg", domain: "bektothefuture.com", pos: [-0.35, 0.05, -0.45], rotY: 0.24, dim: 0.55 },
  { src: "/portfolio/silkbees.jpg", domain: "silkbees.co.uk", pos: [2.6, -0.05, -0.35], rotY: -0.38, dim: 0.55 },
  { src: "/portfolio/beautasy.jpg", domain: "beautasy.co.uk", pos: [1.15, 0, 0.6], rotY: -0.18, rotX: 0.05, dim: 1 },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
// cubic-bezier(.16,1,.3,1) ≈ quintic out; (.76,0,.24,1) ≈ cubic in-out.
const studioOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 5);
const studioInOut = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const damp = (a: number, b: number, lambda: number, dt: number) => a + (b - a) * (1 - Math.exp(-lambda * dt));

type Entry = { pane: GlassPane; bar: LightBar; baseZ: number; dim: number; hover: number };

const createDemoScene: SceneFactory = async (ctx) => {
  const { renderer, env } = ctx;
  const loop = new URLSearchParams(window.location.search).has("loop");

  const scene = new Scene();
  scene.environmentIntensity = 0.35;

  const camera = new PerspectiveCamera(28, ctx.width / ctx.height, 0.1, 40);
  const camBase = new Vector3(0, 0.25, 6.2);
  const lookTarget = new Vector3(0.7, 0, 0);
  camera.position.copy(camBase);
  camera.lookAt(lookTarget);

  const loader = new TextureLoader();
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const textures = await Promise.all(PANES.map((p) => loader.loadAsync(p.src)));
  for (const t of textures) {
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = maxAniso;
  }

  const entries: Entry[] = PANES.map((def, i) => {
    const pane = createGlassPane({
      width: 1.6,
      height: 1.0,
      screen: textures[i],
      domain: def.domain,
      env,
      invalidate: ctx.invalidate,
    });
    pane.group.position.set(...def.pos);
    pane.group.rotation.set(def.rotX ?? 0, def.rotY, 0);
    pane.setDim(def.dim);
    const bar = createLightBar(1.52, 0.92);
    bar.mesh.position.z = 0.023;
    bar.mesh.visible = false;
    pane.group.add(bar.mesh);
    scene.add(pane.group);
    return { pane, bar, baseZ: def.pos[2], dim: def.dim, hover: 0 };
  });

  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const bodies: Object3D[] = entries.map((e) => e.pane.body);
  let pointerX = 0;
  let pointerY = 0;
  let hovered = -1;
  let camX = 0;
  let camY = 0;

  const INTRO_END = 0.2 + 0.12 * (entries.length - 1) + 1.4;

  return {
    async compile() {
      await renderer.compileAsync(scene, camera);
    },

    render(dt, t) {
      let busy = false;

      // Studio fades in.
      scene.environmentIntensity = 0.35 + 0.65 * studioOut(t / 1.2);

      entries.forEach((e, i) => {
        // Each pane eases 0.06 toward the camera, 60ms stagger.
        const k = studioOut((t - i * 0.06) / 0.9);
        e.pane.group.position.z = e.baseZ + 0.06 * k;

        // Intro light-bar sweep, 1.4s, 120ms stagger from the back.
        const local = (t - 0.2 - i * 0.12) / 1.4;
        let sweep = -0.2;
        let on = local > 0 && local < 1;
        if (on) sweep = -0.2 + 1.4 * studioInOut(local);

        // ?loop=1: a sweep every 2.6s after the intro, to keep the GPU busy.
        const lt = t - INTRO_END - i * 0.12;
        if (loop && lt > 0) {
          const phase = (lt % 2.6) / 0.6;
          if (phase < 1) {
            on = true;
            sweep = -0.2 + 1.4 * studioInOut(phase);
          }
        }
        e.bar.mesh.visible = on;
        e.bar.uniforms.uSweep.value = sweep;

        // Hover lifts the dim on real panes.
        const targetHover = hovered === i ? 1 : 0;
        e.hover = damp(e.hover, targetHover, 10, dt);
        e.pane.setDim(e.dim + (1 - e.dim) * 0.6 * e.hover);
        if (Math.abs(e.hover - targetHover) > 1e-3) busy = true;
      });

      // Pointer parallax: camera offset ±0.18 x / ±0.10 y, damped (λ 4).
      camX = damp(camX, pointerX * 0.18, 4, dt);
      camY = damp(camY, pointerY * 0.1, 4, dt);
      if (Math.abs(camX - pointerX * 0.18) > 1e-4 || Math.abs(camY - pointerY * 0.1) > 1e-4) busy = true;
      camera.position.set(camBase.x + camX, camBase.y + camY, camBase.z);
      camera.lookAt(lookTarget);

      renderer.render(scene, camera);
      return loop || busy || t < INTRO_END + 0.05;
    },

    resize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },

    pointer(nx, ny) {
      pointerX = nx;
      pointerY = ny;
      ndc.set(nx, ny);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(bodies, false)[0];
      hovered = hit ? bodies.indexOf(hit.object) : -1;
    },

    pointerLeave() {
      pointerX = 0;
      pointerY = 0;
      hovered = -1;
    },

    dispose() {
      for (const e of entries) {
        e.bar.dispose();
        e.pane.dispose();
      }
      for (const t of textures) t.dispose();
    },
  };
};

export default createDemoScene;
