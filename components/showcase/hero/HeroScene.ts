/**
 * The hero's WebGL scene (webgl tier only, loaded by <ThreeStage>).
 *
 * Four lit glass panes in a code-built studio: the visitor's sketch in front,
 * three real client sites cascading behind it (each showing the top of its
 * home page), the sketch's light pooling on a dark floor, and fog. Everything
 * renders on demand: once the intro, a sweep or a pointer move has settled,
 * render() returns false and the stage draws nothing.
 *
 * The "Claude at work" moment (props.aiWriting): the studio dims, the sketch
 * pane glows and turns to face you, and a composer card floats above it. The
 * tagline Claude streams writes itself on the card glyph by glyph — every new
 * glyph is drawn off-screen first and the pixels that changed become targets
 * for particles streaming in out of the dark, so they land exactly as the
 * glyph prints. When Claude finishes, the words pour from the card into the
 * page's text blocks the same way, the card dissolves and one light sweep
 * lifts the veil. The procedural sketch is code; only the copy is Claude's.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DynamicDrawUsage,
  Fog,
  Group,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Raycaster,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  Vector3,
  Vector4,
} from "three";
import { createGlassPane, type GlassPane } from "@/lib/three/glassPane";
import { createLightBar, type LightBar } from "@/lib/three/lightBar";
import type { SceneFactory } from "@/lib/three/types";
import {
  drawSketch,
  ensureSketchFonts,
  getSketchLayout,
  SECTORS,
  type SketchCopy,
  type SketchSector,
} from "@/lib/showcase/sketch";
import { fontFamilies } from "@/lib/showcase/sketch/fonts";
import type { HeroPaneSlug, HeroSceneProps, HeroSweepKind } from "./contract";

// ── Geometry (mirrors lib/three/glassPane.ts) ─────────────────────────────
const PW = 1.6;
const PH = 1.0;
const INSET = 0.04;
const ZF = 0.02;
const IW = PW - INSET * 2;
const CH = IW * (64 / 1024);
const SH = PH - INSET * 2 - CH;
const SY = -PH / 2 + INSET + SH / 2;
const FLOOR_Y = -0.85;

// Sketch texture at the screen's aspect, drawn without the sketch's own
// address bar (the glass chrome already is the address bar).
const TW = 1024;
const TH = Math.round((TW * SH) / IW);
const BAR = 34;
const KY = TH / (640 - BAR);

// Composer card, pane-local, floating above the sketch.
const CW = 0.9;
const CHH = 0.38;
const CX = 0.14;
const CY = 0.76;
const CZ = 0.34;
const CTW = 1024;
const CTH = Math.round((CTW * CHH) / CW);

const CAM = new Vector3(0, 0.25, 6.2);
const LOOK = new Vector3(0.7, 0, 0);

type V3 = [number, number, number];
interface PaneDef {
  slug: HeroPaneSlug;
  domain: string;
  pos: V3;
  rotY: number;
  rotX: number;
}
// A cascade tuned for real stage aspects (62vw × 100svh ≈ 1.0–1.1): each real
// site shows the top of its home page above the sketch. Back to front.
const DEFS: PaneDef[] = [
  { slug: "beautasy", domain: "beautasy.co.uk", pos: [1.67, 1.06, -1.8], rotY: -0.1, rotX: 0 },
  { slug: "safarisaev", domain: "safarisaev.ai", pos: [0.45, 0.46, -1], rotY: 0.3, rotX: 0 },
  { slug: "silkbees", domain: "silkbees.co.uk", pos: [2.17, 0.32, -0.85], rotY: -0.42, rotX: 0 },
  { slug: "sketch", domain: "yourbusiness.co.uk", pos: [1.2, -0.31, 0.45], rotY: -0.16, rotX: 0.04 },
];
const REAL_DIM = 0.55;
const TEXT_BLOCKS = ["sub", "cta", "cta2", "card1", "card2", "card3"] as const;

// ── Helpers ───────────────────────────────────────────────────────────────
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const f = (t: number, a: number, b: number) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
  return (x: number) => {
    if (x <= 0 || x >= 1) return clamp01(x);
    let lo = 0;
    let hi = 1;
    let t = x;
    for (let i = 0; i < 20; i++) {
      t = (lo + hi) / 2;
      if (f(t, x1, x2) < x) lo = t;
      else hi = t;
    }
    return f(t, y1, y2);
  };
}
const OUT = bezier(0.16, 1, 0.3, 1);
const IN_OUT = bezier(0.76, 0, 0.24, 1);
const damp = (a: number, b: number, l: number, dt: number) => a + (b - a) * (1 - Math.exp(-l * dt));
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return new Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const ctx2d = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c.getContext("2d", { willReadFrequently: true })!;
};
function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// ── Shaders ───────────────────────────────────────────────────────────────
const UV_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// Focus veil, block brackets, scan heads. Premultiplied, raw sRGB.
const VEIL_FS = /* glsl */ `
uniform float uOn;
uniform float uTime;
uniform vec4 uR[6];
uniform vec2 uRes;
uniform vec3 uInk;
uniform vec3 uPink;
uniform vec3 uOx;
varying vec2 vUv;
vec4 over(vec4 d, vec3 c, float a) { return vec4(c * a + d.rgb * (1.0 - a), a + d.a * (1.0 - a)); }
void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uRes;
  float lit = 0.0, br = 0.0, trail = 0.0, lead = 0.0;
  for (int i = 0; i < 6; i++) {
    vec2 lo = uR[i].xy - 7.0, hi = uR[i].zw + 7.0;
    vec2 d = max(lo - p, p - hi);
    float m = 1.0 - smoothstep(-1.5, 1.5, max(d.x, d.y));
    lit = max(lit, m);
    vec2 bl = lo + 2.5, bh = hi - 2.5;
    vec2 e = min(abs(p - bl), abs(p - bh));
    float inB = step(bl.x - 1.0, p.x) * step(p.x, bh.x + 1.0) * step(bl.y - 1.0, p.y) * step(p.y, bh.y + 1.0);
    float arm = max((1.0 - smoothstep(0.6, 1.6, e.x)) * step(e.y, 12.0), (1.0 - smoothstep(0.6, 1.6, e.y)) * step(e.x, 12.0));
    br = max(br, arm * inB);
    float dx = p.x - mix(lo.x, hi.x, fract(uTime * 0.42 + float(i) * 0.31));
    trail = max(trail, m * step(dx, 0.0) * exp(dx / 34.0));
    lead = max(lead, m * (1.0 - smoothstep(0.4, 1.4, abs(dx))));
  }
  float outside = 1.0 - lit;
  float dots = 1.0 - smoothstep(0.1, 0.24, length(fract(p / 7.0) - 0.5));
  float wave = 0.5 + 0.5 * sin(p.x * 0.017 + p.y * 0.023 - uTime * 2.4);
  vec4 c = vec4(0.0);
  c = over(c, uInk, 0.5 * outside);
  c = over(c, uPink, 0.3 * dots * wave * wave * outside);
  c = over(c, uOx, 0.12 * trail);
  c = over(c, uOx, 0.6 * lead);
  c = over(c, uOx, 0.9 * br);
  gl_FragColor = c * uOn;
}`;

// Soft rounded-rect halo behind the sketch pane while Claude writes.
const AURA_FS = /* glsl */ `
uniform float uOn;
uniform float uTime;
uniform vec2 uSize;
uniform vec3 uPink;
uniform vec3 uOx;
varying vec2 vUv;
void main() {
  vec2 p = (vUv - 0.5) * uSize;
  vec2 q = abs(p) - vec2(0.78, 0.48);
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  float g = exp(-max(d, 0.0) * 7.0) * smoothstep(-0.03, 0.02, d);
  float pulse = 0.78 + 0.22 * sin(uTime * 2.3);
  vec3 c = mix(uPink, uOx, smoothstep(0.0, 0.35, d)) * g * pulse * uOn * 0.9;
  gl_FragColor = vec4(c, 1.0);
}`;

// Particles: comets out of the dark into the glass. Each is two entries: a
// head (drawn as a glowing point) and a tail 35ms behind it on the same path
// (the pair is drawn as a line that fades to nothing at the tail).
// aTo.w = kind * 4 + tail. kind 0 prints ink into the page, 1 dissolves
// (thinking), 2 prints light onto the card. Particles in one of six lanes
// share a curve, so a stream reads as threads of light.
const PT_VS = /* glsl */ `
uniform float uTime;
uniform float uScale;
uniform float uLine;
attribute vec4 aTo;
attribute vec3 aTime;
varying float vA;
varying float vInk;
varying float vLand;
void main() {
  float kind = floor(aTo.w / 4.0 + 0.01);
  float tail = aTo.w - kind * 4.0;
  float k = (uTime - aTime.x) / aTime.y;
  float live = step(0.0, k) * step(k, 1.4);
  vA = 0.0;
  vInk = 0.0;
  vLand = 0.0;
  if (uLine < 0.5 && (tail > 0.5 || live < 0.5)) { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); gl_PointSize = 1.0; return; }
  float s = aTime.z;
  float lane = floor(s * 6.0);
  float j = fract(s * 6.0) - 0.5;
  float e = 1.0 - pow(1.0 - clamp(k, 0.0, 1.0), 2.2);
  vec3 a = position, b = aTo.xyz;
  vec3 c = mix(a, b, 0.45) + vec3(sin(lane * 1.9 + 0.4) * 0.3 + j * 0.06, cos(lane * 2.7) * 0.26 + j * 0.05, 0.16 + 0.08 * lane);
  vec3 p = mix(mix(a, c, e), mix(c, b, e), e);
  p.xy += vec2(sin(uTime * 4.0 + lane * 2.0), cos(uTime * 3.4 + lane * 3.0)) * (1.0 - e) * 0.025;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float amb = step(0.5, kind) * step(kind, 1.5);
  vA = live * (1.0 - tail) * smoothstep(0.0, 0.1, k) * mix(1.0 - smoothstep(1.0, 1.4, k), 1.0 - smoothstep(0.55, 0.95, k), amb);
  vA *= mix(1.0, (1.0 - smoothstep(0.8, 1.0, k)) * (1.0 - amb), uLine);
  vLand = (1.0 - amb) * smoothstep(0.75, 1.0, k);
  vInk = vLand * step(kind, 0.5);
  gl_PointSize = max(1.0, mix(0.02, 0.0065, e) * mix(1.0, 0.7, amb) * (0.75 + 0.5 * fract(s * 61.0)) * uScale / -mv.z);
}`;
const PT_FS = /* glsl */ `
uniform vec3 uGlow;
uniform vec3 uHot;
uniform vec3 uInk;
varying float vA;
varying float vInk;
varying float vLand;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float core = 1.0 - smoothstep(0.0, 0.2, d);
  float a = (core + (1.0 - core) * exp(-d * d * 22.0) * 0.55) * vA;
  if (a < 0.01) discard;
  vec3 c = mix(mix(uGlow, uHot, core), uInk, vInk);
  // In flight the light adds (glow); on landing it settles like ink.
  gl_FragColor = vec4(c * a, a * mix(0.3, 1.0, max(vInk, vLand * 0.6)));
}`;
const LN_FS = /* glsl */ `
uniform vec3 uGlow;
uniform vec3 uHot;
varying float vA;
void main() {
  if (vA < 0.01) discard;
  gl_FragColor = vec4(mix(uGlow, uHot, vA * vA) * vA * 0.7, vA * 0.2);
}`;

// ── Scene types ───────────────────────────────────────────────────────────
interface Pane {
  def: PaneDef;
  pane: GlassPane;
  bar: LightBar;
  toCam: Vector3;
  push: number;
  lean: number;
  rx: number;
  ry: number;
  hover: number;
}
interface Tween {
  from: number;
  to: number;
  dur: number;
  delay: number;
  ease: (x: number) => number;
  set: (v: number) => void;
  t0: number;
  end?: () => void;
}
type Rect = { x0: number; y0: number; x1: number; y1: number };
/** A canvas the particles print into: drawn ahead off-screen, shown later. */
interface Surface<S> {
  shown: CanvasRenderingContext2D;
  future: CanvasRenderingContext2D;
  tex: CanvasTexture;
  paint: (c: CanvasRenderingContext2D, s: S) => void;
  rects: Rect[];
  local: (x: number, y: number, out: Vector3) => Vector3;
  base: Uint8ClampedArray[];
  queue: { at: number; s: S }[];
  state: S;
  next: S;
  dirty: boolean;
  last: number;
}

const createHeroScene: SceneFactory = async (ctx) => {
  const { renderer, env, invalidate } = ctx;
  let width = ctx.width;
  let height = ctx.height;
  let disposed = false;

  const scene = new Scene();
  scene.environmentIntensity = 0.35;
  scene.fog = new Fog(0x14181a, 6, 14);
  const camera = new PerspectiveCamera(28, width / height, 0.1, 40);
  let fit = 1;

  const own: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => (own.push(x), x);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const canvasTex = (c: HTMLCanvasElement) => {
    const t = keep(new CanvasTexture(c));
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = aniso;
    return t;
  };

  const loader = new TextureLoader();
  const [siteTex] = await Promise.all([
    Promise.all(DEFS.slice(0, 3).map((d) => loader.loadAsync(`/showcase/sites/${d.slug}-1024.webp`))),
    ensureSketchFonts(),
  ]);
  for (const t of siteTex) {
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = aniso;
    keep(t);
  }
  const mono = fontFamilies().mono;
  const sans = fontFamilies().sans;

  // ── Props-derived state ─────────────────────────────────────────────────
  let props: HeroSceneProps | null = null;
  let sector: SketchSector = "salon";
  let envLevel = 0.35;
  let writing = false;
  let resolving = false;
  let writingEnded = 0;
  let resolvedAt = -9;
  let focus = 0;
  let ambient = 0;
  let poseKey = "";
  let lastTypeSweep = -9;
  let lastSweep: number | null = null;
  let baseKey = "";
  let copyKey = "";
  let baseDirty = true;
  let fontSample = "";
  let now = 0;

  // ── Surfaces ────────────────────────────────────────────────────────────
  const tmp = new Vector3();
  const sketchShown = ctx2d(TW, TH);
  const sketch: Surface<SketchCopy | undefined> = {
    shown: sketchShown,
    future: ctx2d(TW, TH),
    tex: canvasTex(sketchShown.canvas),
    paint(c, copy) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, TW, TH);
      c.translate(0, -BAR * KY);
      drawSketch(c, TW, 640 * KY, {
        name: props?.name ?? "",
        display: props?.display || "your business",
        domain: props?.domain || "yourbusiness.co.uk",
        sector,
        stage: props?.stage ?? 3,
        layout: "desktop",
        copy,
      });
      c.setTransform(1, 0, 0, 1, 0, 0);
    },
    rects: TEXT_BLOCKS.map(() => ({ x0: 0, y0: 0, x1: 1, y1: 1 })),
    local: (x, y, out) => out.set(-IW / 2 + (x / TW) * IW, SY + SH / 2 - (y / TH) * SH, ZF + 0.004),
    base: [],
    queue: [],
    state: undefined,
    next: undefined,
    dirty: false,
    last: -1,
  };

  let cardPulse = 1;
  const cardShown = ctx2d(CTW, CTH);
  const card: Surface<string> = {
    shown: cardShown,
    future: ctx2d(CTW, CTH),
    tex: canvasTex(cardShown.canvas),
    paint(c, text) {
      c.clearRect(0, 0, CTW, CTH);
      roundRect(c, 3, 3, CTW - 6, CTH - 6, 22);
      c.fillStyle = "rgba(20,24,26,0.97)";
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = "rgba(207,135,148,0.42)";
      c.stroke();
      c.textBaseline = "alphabetic";
      c.textAlign = "left";
      c.font = `400 30px ${mono}`;
      c.globalAlpha = 0.3 + 0.7 * cardPulse;
      c.fillStyle = "#cf8794";
      c.beginPath();
      c.arc(50, 56, 8, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
      const who = props?.display || "your business";
      let head = `Claude · writing for ${who}`;
      while (c.measureText(head).width > CTW - 130 && head.length > 24) head = head.slice(0, -2) + "…";
      c.fillText(head, 74, 66);
      // Body: the streamed tagline, wrapped, shrinking to fit four lines.
      let size = 54;
      let lines: string[] = [];
      for (; size >= 34; size -= 4) {
        c.font = `400 ${size}px ${sans}`;
        lines = [];
        let line = "";
        for (const word of text.split(" ")) {
          const tryLine = line ? `${line} ${word}` : word;
          if (line && c.measureText(tryLine).width > CTW - 96) {
            lines.push(line);
            line = word;
          } else line = tryLine;
        }
        lines.push(line);
        if (lines.length <= 4) break;
      }
      c.fillStyle = "#e3e6e0";
      const lh = size * 1.26;
      const y0 = 108 + size;
      lines.forEach((l, i) => c.fillText(l, 46, y0 + i * lh));
      if (writing) {
        const last = lines[lines.length - 1] ?? "";
        c.fillStyle = "#cf8794";
        c.fillRect(46 + c.measureText(last).width + (last ? 6 : 0), y0 + (lines.length - 1) * lh - size * 0.8, 3, size * 0.95);
      }
    },
    rects: [{ x0: 30, y0: 92, x1: CTW - 30, y1: CTH - 12 }],
    local: (x, y, out) => out.set(CX + (x / CTW - 0.5) * CW, CY + (0.5 - y / CTH) * CHH, CZ + 0.002),
    base: [],
    queue: [],
    state: "",
    next: "",
    dirty: false,
    last: -1,
  };

  const sample = <S,>(s: Surface<S>, c: CanvasRenderingContext2D) =>
    s.rects.map((r) =>
      c.getImageData(Math.floor(r.x0), Math.floor(r.y0), Math.max(1, Math.ceil(r.x1 - r.x0)), Math.max(1, Math.ceil(r.y1 - r.y0))).data,
    );
  const resetSurface = <S,>(s: Surface<S>) => {
    s.queue.length = 0;
    s.state = s.next;
    s.paint(s.shown, s.state);
    s.tex.needsUpdate = true;
    s.paint(s.future, s.next);
    s.base = sample(s, s.future);
  };

  // ── Panes and light bars ────────────────────────────────────────────────
  const panes: Pane[] = DEFS.map((def, i) => {
    const pane = createGlassPane({
      width: PW,
      height: PH,
      screen: i < 3 ? siteTex[i] : sketch.tex,
      domain: def.domain,
      env,
      invalidate,
    });
    pane.group.position.set(...def.pos);
    pane.group.rotation.set(def.rotX, def.rotY, 0);
    if (i < 3) pane.setDim(REAL_DIM);
    scene.add(pane.group);
    const bar = createLightBar(IW, PH - INSET * 2);
    bar.mesh.position.z = ZF + 0.003;
    bar.mesh.renderOrder = 4;
    bar.mesh.visible = false;
    pane.group.add(bar.mesh);
    const toCam = CAM.clone().sub(new Vector3(...def.pos)).normalize();
    return { def, pane, bar, toCam, push: 0, lean: 0, rx: def.rotX, ry: def.rotY, hover: 0 };
  });
  const sk = panes[3];
  const skGroup = sk.pane.group;
  const bodies = panes.map((p) => p.pane.body);

  // ── Floor: the sketch's light spilling onto the studio floor ───────────
  const fl = document.createElement("canvas");
  fl.width = fl.height = 256;
  const fc = fl.getContext("2d")!;
  const grad = fc.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(86,78,82,0.55)");
  grad.addColorStop(0.45, "rgba(44,46,49,0.3)");
  grad.addColorStop(1, "rgba(20,24,26,0)");
  fc.fillStyle = grad;
  fc.fillRect(0, 0, 256, 256);
  const floorMat = keep(
    new MeshBasicMaterial({ map: canvasTex(fl), transparent: true, depthWrite: false, toneMapped: false }),
  );
  const floor = new Mesh(keep(new PlaneGeometry(4.4, 2.6)), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(1.25, FLOOR_Y, 0.3);
  floor.renderOrder = -1;
  scene.add(floor);

  // ── Sketch chrome tag ───────────────────────────────────────────────────
  const tagCtx = ctx2d(512, 64);
  const tagTex = canvasTex(tagCtx.canvas);
  const tag = new Mesh(
    keep(new PlaneGeometry(IW / 2, CH)),
    keep(new MeshBasicMaterial({ map: tagTex, transparent: true, depthWrite: false, toneMapped: false })),
  );
  tag.position.set(IW / 4, PH / 2 - INSET - CH / 2, ZF + 0.001);
  tag.renderOrder = 1;
  skGroup.add(tag);
  let tagKey = "";
  const drawTag = (state: "sketch" | "writing" | "claude") => {
    const key = state + (state === "writing" ? Math.round(cardPulse * 5) : "");
    if (key === tagKey) return;
    tagKey = key;
    const c = tagCtx;
    c.clearRect(0, 0, 512, 64);
    const fade = c.createLinearGradient(0, 0, 200, 0);
    fade.addColorStop(0, "rgba(27,32,35,0)");
    fade.addColorStop(1, "#1b2023");
    c.fillStyle = fade;
    c.fillRect(0, 0, 512, 62);
    c.font = `400 24px ${mono}`;
    c.textBaseline = "middle";
    c.textAlign = "right";
    const label = state === "writing" ? "Claude is writing" : state === "claude" ? "words by Claude" : "";
    const w = label ? c.measureText(label).width : 0;
    c.fillStyle = "#e3e6e0";
    if (label) c.fillText(label, 492, 33);
    c.fillStyle = "#cf8794";
    if (state === "writing") {
      c.globalAlpha = 0.3 + 0.7 * cardPulse;
      c.beginPath();
      c.arc(492 - w - 16, 32, 6, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    } else c.fillText(state === "claude" ? "SKETCH · " : "SKETCH", 492 - w, 33);
    tagTex.needsUpdate = true;
  };
  drawTag("sketch");

  // ── Writing-mode meshes: veil, aura, card ───────────────────────────────
  const PINK = rgb("#cf8794");
  const OX = rgb("#7d2436");
  const veilU = {
    uOn: { value: 0 },
    uTime: { value: 0 },
    uR: { value: TEXT_BLOCKS.map(() => new Vector4()) },
    uRes: { value: new Vector2(TW, TH) },
    uInk: { value: rgb("#14181a") },
    uPink: { value: PINK },
    uOx: { value: OX },
  };
  const veil = new Mesh(
    keep(new PlaneGeometry(IW, SH)),
    keep(
      new ShaderMaterial({
        uniforms: veilU,
        vertexShader: UV_VS,
        fragmentShader: VEIL_FS,
        transparent: true,
        premultipliedAlpha: true,
        depthWrite: false,
      }),
    ),
  );
  veil.position.set(0, SY, ZF + 0.0024);
  veil.renderOrder = 3;

  const AURA = new Vector2(PW + 1.2, PH + 1.2);
  const auraU = { uOn: { value: 0 }, uTime: { value: 0 }, uSize: { value: AURA }, uPink: { value: PINK }, uOx: { value: OX } };
  const aura = new Mesh(
    keep(new PlaneGeometry(AURA.x, AURA.y)),
    keep(
      new ShaderMaterial({
        uniforms: auraU,
        vertexShader: UV_VS,
        fragmentShader: AURA_FS,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  aura.position.z = -0.04;
  aura.renderOrder = -1;

  const cardMat = keep(
    new MeshBasicMaterial({ map: card.tex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }),
  );
  const cardMesh = new Mesh(keep(new PlaneGeometry(CW, CHH)), cardMat);
  cardMesh.position.set(CX, CY, CZ);
  cardMesh.renderOrder = 6;

  for (const m of [veil, aura, cardMesh]) {
    m.visible = false;
    skGroup.add(m);
  }

  // ── Particles (pane-local) ──────────────────────────────────────────────
  const N = 6144; // entries: head + tail per comet
  const pFrom = new Float32Array(N * 3);
  const pTo = new Float32Array(N * 4);
  const pTime = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) pTime[i * 3] = -99;
  const pGeo = keep(new BufferGeometry());
  const aFrom = new BufferAttribute(pFrom, 3).setUsage(DynamicDrawUsage);
  const aTo = new BufferAttribute(pTo, 4).setUsage(DynamicDrawUsage);
  const aTime = new BufferAttribute(pTime, 3).setUsage(DynamicDrawUsage);
  pGeo.setAttribute("position", aFrom);
  pGeo.setAttribute("aTo", aTo);
  pGeo.setAttribute("aTime", aTime);
  const ptU = {
    uTime: { value: 0 },
    uScale: { value: 1 },
    uGlow: { value: PINK },
    uHot: { value: rgb("#fff6ee") },
    uInk: { value: rgb("#2a1d22") },
  };
  const fxMat = (line: number, fragmentShader: string) =>
    keep(
      new ShaderMaterial({
        uniforms: { ...ptU, uLine: { value: line } },
        vertexShader: PT_VS,
        fragmentShader,
        transparent: true,
        premultipliedAlpha: true,
        depthWrite: false,
      }),
    );
  const points = new Points(pGeo, fxMat(0, PT_FS));
  const trails = new LineSegments(pGeo, fxMat(1, LN_FS));
  const fx = new Group();
  for (const o of [trails, points]) {
    o.frustumCulled = false;
    o.renderOrder = 7;
    fx.add(o);
  }
  fx.visible = false;
  skGroup.add(fx);
  let pHead = 0;
  let pWrites = 0;
  let pUntil = 0;
  // Streams enter from the dark, up and to the right, off the frame.
  const ANCHORS = [new Vector3(1.35, 1.35, 0.9), new Vector3(1.8, 0.5, 1), new Vector3(0.5, 1.8, 0.7)];

  /** A streak from `from` (or one of the dark anchors) to `to`. */
  const srcV = new Vector3();
  const emit = (to: Vector3, t0: number, dur: number, kind: number, from?: Vector3) => {
    if (from) srcV.copy(from);
    else {
      const a = ANCHORS[Math.floor(Math.random() * ANCHORS.length)];
      srcV.set(a.x + rnd(-0.06, 0.06), a.y + rnd(-0.06, 0.06), a.z + rnd(-0.05, 0.05));
    }
    const seed = (Math.floor(Math.random() * 6) + Math.random() * 0.999) / 6;
    for (let g = 0; g < 2; g++) {
      const i = pHead;
      pHead = (pHead + 1) % N;
      pWrites++;
      pFrom.set([srcV.x, srcV.y, srcV.z], i * 3);
      pTo.set([to.x, to.y, to.z, kind * 4 + g], i * 4);
      pTime.set([t0 + g * 0.035, dur, seed], i * 3);
    }
    pUntil = Math.max(pUntil, t0 + dur * 1.4 + 0.08);
    fx.visible = true;
  };
  /** Upload only the slots written since the last frame. */
  const uploadParticles = () => {
    if (!pWrites) return;
    const count = Math.min(pWrites, N);
    const start = (pHead - count + N) % N;
    for (const [attr, size] of [[aFrom, 3], [aTo, 4], [aTime, 3]] as const) {
      attr.clearUpdateRanges();
      if (start + count <= N) attr.addUpdateRange(start * size, count * size);
      else {
        attr.addUpdateRange(start * size, (N - start) * size);
        attr.addUpdateRange(0, (start + count - N) * size);
      }
      attr.needsUpdate = true;
    }
    pWrites = 0;
  };

  /** Ink points of the card as it is shown: where the final words pour from. */
  const cardInk = () => {
    const r = card.rects[0];
    const w = Math.ceil(r.x1 - r.x0);
    const d = card.shown.getImageData(r.x0, r.y0, w, Math.ceil(r.y1 - r.y0)).data;
    const pts: number[] = [];
    for (let j = 0; j < d.length; j += 12) if (d[j] > 150) pts.push(r.x0 + ((j >> 2) % w), r.y0 + Math.floor((j >> 2) / w));
    return pts;
  };

  /** Draw the next state ahead; particles fly to every pixel that changed. */
  const print = <S,>(s: Surface<S>, t: number, kind: number, max: number, lag: number, source?: number[]) => {
    s.paint(s.future, s.next);
    const next = sample(s, s.future);
    const hits: number[] = [];
    s.rects.forEach((r, i) => {
      const a = s.base[i];
      const b = next[i];
      if (!a || a.length !== b.length) return;
      const w = Math.max(1, Math.ceil(r.x1 - r.x0));
      const h = b.length / 4 / w;
      for (let y = 0; y < h; y += 2)
        for (let x = 0; x < w; x += 2) {
          const j = (y * w + x) * 4;
          if (Math.abs(a[j] - b[j]) + Math.abs(a[j + 1] - b[j + 1]) + Math.abs(a[j + 2] - b[j + 2]) > 48)
            hits.push(Math.floor(r.x0) + x, Math.floor(r.y0) + y);
        }
    });
    s.base = next;
    const n = hits.length / 2;
    const step = n > max ? n / max : 1;
    const from = new Vector3();
    for (let k = 0; k < n; k += step) {
      const j = Math.floor(k) * 2;
      let src: Vector3 | undefined;
      if (source && source.length) {
        const q = Math.floor(Math.random() * (source.length / 2)) * 2;
        src = card.local(source[q], source[q + 1], from);
      }
      emit(s.local(hits[j] + rnd(-0.7, 0.7), hits[j + 1] + rnd(-0.7, 0.7), tmp), t + rnd(0, lag * 0.4), rnd(lag * 0.62, lag * 0.9), kind, src);
    }
    s.queue.push({ at: t + lag * 0.92, s: s.next });
    return n;
  };

  /** Show the newest state whose particles have landed. */
  const flush = <S,>(s: Surface<S>, t: number) => {
    let due = -1;
    for (let i = 0; i < s.queue.length; i++) if (s.queue[i].at <= t) due = i;
    if (due < 0) return;
    s.state = s.queue.splice(0, due + 1)[due].s;
    s.paint(s.shown, s.state);
    s.tex.needsUpdate = true;
  };

  // ── Tweens (a new tween on a key replaces the old one: interruptible) ──
  const tweens = new Map<string, Tween>();
  const tween = (
    key: string,
    from: number,
    to: number,
    dur: number,
    ease: (x: number) => number,
    set: (v: number) => void,
    delay = 0,
    end?: () => void,
  ) => {
    tweens.set(key, { from, to, dur, delay, ease, set, t0: NaN, end });
  };
  const sweepPane = (p: Pane, dur: number, delay = 0, fromCurrent = false) => {
    const u = p.bar.uniforms.uSweep;
    const from = fromCurrent && p.bar.mesh.visible && u.value < 1.2 ? u.value : -0.2;
    u.value = from;
    p.bar.mesh.visible = true;
    tween(`bar${p.def.slug}`, from, 1.2, dur, IN_OUT, (v) => (u.value = v), delay, () => {
      p.bar.mesh.visible = false;
    });
  };
  const fade = (key: string, m: Mesh, get: () => number, set: (v: number) => void, to: number, dur: number, delay = 0) => {
    if (to > 0) m.visible = true;
    tween(key, get(), to, dur, OUT, set, delay, to > 0 ? undefined : () => (m.visible = false));
  };

  // Intro, played once.
  tween("env", 0.35, 1, 1.2, OUT, (v) => (envLevel = v));
  panes.forEach((p, i) => {
    sweepPane(p, 1.4, 0.2 + 0.12 * i);
    tween(`push${i}`, 0, 0.06, 0.9, OUT, (v) => (p.push = v), 0.06 * i);
  });

  // ── Writing mode ────────────────────────────────────────────────────────
  const setWriting = (on: boolean) => {
    writing = on;
    if (on) {
      resolving = false;
      card.next = "";
      resetSurface(card);
      fade("veil", veil, () => veilU.uOn.value, (v) => (veilU.uOn.value = v), 1, 0.5);
      fade("aura", aura, () => auraU.uOn.value, (v) => (auraU.uOn.value = v), 1, 0.8);
      fade("card", cardMesh, () => cardMat.opacity, (v) => (cardMat.opacity = v), 1, 0.5, 0.1);
      tween("focus", focus, 1, 0.7, OUT, (v) => (focus = v));
      tween("lean", sk.lean, 0.1, 0.9, OUT, (v) => (sk.lean = v));
    } else {
      resolving = true;
      writingEnded = now;
    }
    updatePose();
  };

  const resolve = (t: number) => {
    resolving = false;
    resolvedAt = t;
    sweepPane(sk, 0.9);
    fade("veil", veil, () => veilU.uOn.value, (v) => (veilU.uOn.value = v), 0, 0.7, 0.1);
    fade("aura", aura, () => auraU.uOn.value, (v) => (auraU.uOn.value = v), 0, 1, 0.1);
    fade("card", cardMesh, () => cardMat.opacity, (v) => (cardMat.opacity = v), 0, 0.4);
    tween("focus", focus, 0, 0.9, OUT, (v) => (focus = v), 0.1);
    tween("lean", sk.lean, 0, 0.9, OUT, (v) => (sk.lean = v), 0.1);
    updatePose();
  };

  const updatePose = () => {
    const face = !!props?.committed || writing || resolving;
    const key = face ? "face" : "angle";
    if (key === poseKey) return;
    poseKey = key;
    tween("rx", sk.rx, face ? 0 : sk.def.rotX, 0.9, OUT, (v) => (sk.rx = v));
    tween("ry", sk.ry, face ? 0 : sk.def.rotY, 0.9, OUT, (v) => (sk.ry = v));
  };

  const playSweep = (kind: HeroSweepKind) => {
    if (kind === "intro") panes.forEach((p, i) => sweepPane(p, 1.4, 0.12 * i));
    else if (kind === "type") {
      if (now - lastTypeSweep < 1.2) return;
      lastTypeSweep = now;
      sweepPane(sk, 0.6);
    } else if (kind === "commit") sweepPane(sk, 0.9);
    else if (kind === "sector") sweepPane(sk, 0.6, 0, true);
    else if (!writing && !resolving && now - resolvedAt > 1.5) sweepPane(sk, 0.9);
  };

  const layoutRects = () => {
    const blocks = getSketchLayout(sector, "desktop");
    TEXT_BLOCKS.forEach((id, i) => {
      const b = blocks.find((x) => x.id === id)!;
      const r = sketch.rects[i];
      r.x0 = b.x * TW;
      r.x1 = (b.x + b.w) * TW;
      r.y0 = (b.y * 640 - BAR) * KY;
      r.y1 = ((b.y + b.h) * 640 - BAR) * KY;
      veilU.uR.value[i].set(r.x0, r.y0, r.x1, r.y1);
    });
    ptU.uInk.value = rgb(SECTORS[sector].palette.ink);
  };
  layoutRects();

  // ── Pointer, hover and click ────────────────────────────────────────────
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  let px = 0;
  let py = 0;
  let camX = 0;
  let camY = 0;
  let hovered = -1;
  let hoverSent = "";
  const host = ctx.canvas.closest<HTMLElement>("[data-tier]");
  const corner = new Vector3();
  const reportHover = () => {
    const cb = props?.onHover;
    if (hovered < 0) {
      if (hoverSent) cb?.(null);
      hoverSent = "";
      return;
    }
    const p = panes[hovered];
    corner.set(-PW / 2, PH / 2, ZF).applyMatrix4(p.pane.group.matrixWorld).project(camera);
    const x = Math.round(((corner.x + 1) / 2) * width);
    const y = Math.round(((1 - corner.y) / 2) * height);
    const key = `${p.def.slug}:${x >> 2}:${y >> 2}`;
    if (key === hoverSent) return;
    hoverSent = key;
    cb?.({ slug: p.def.slug, x, y });
  };
  const onClick = () => {
    if (hovered >= 0) props?.onSelect?.(panes[hovered].def.slug);
  };
  host?.addEventListener("click", onClick);

  const resize = (w: number, h: number, d: number) => {
    width = w;
    height = h;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Keep the cascade's horizontal framing on narrow or very wide stages.
    fit = Math.min(1.45, Math.max(0.84, 1 / camera.aspect));
    ptU.uScale.value = (h * d) / (2 * Math.tan((camera.fov * Math.PI) / 360));
  };
  resize(width, height, ctx.dpr);

  return {
    async compile() {
      if (baseDirty) {
        baseDirty = false;
        resetSurface(sketch);
      }
      const hidden = [veil, aura, cardMesh, fx, ...panes.map((p) => p.bar.mesh)];
      hidden.forEach((m) => (m.visible = true));
      await renderer.compileAsync(scene, camera);
      hidden.forEach((m) => (m.visible = false));
    },

    setProps(raw) {
      const p = raw as unknown as HeroSceneProps;
      props = p;
      const sec: SketchSector = SECTORS[p.sector] ? p.sector : "salon";
      if (sec !== sector) {
        sector = sec;
        layoutRects();
      }
      const nb = [p.name, p.display, p.domain, sec, p.stage].join("|");
      if (nb !== baseKey) {
        baseKey = nb;
        baseDirty = true;
        sk.pane.setDomain(p.domain || "yourbusiness.co.uk");
        if (/[^\u0000-ɏ]/.test(p.name) && p.name !== fontSample) {
          fontSample = p.name;
          ensureSketchFonts(p.name).then(() => {
            if (disposed) return;
            baseDirty = true;
            invalidate();
          });
        }
      }
      if (!!p.aiWriting !== writing) setWriting(!!p.aiWriting);
      // While Claude writes, the words go to the card; the page waits.
      if (writing && p.aiStreamed !== card.next) {
        card.next = p.aiStreamed || "";
        card.dirty = true;
      }
      if (!writing) {
        const nc = JSON.stringify(p.copy ?? null);
        if (nc !== copyKey) {
          copyKey = nc;
          sketch.next = p.copy ?? undefined;
          if (baseDirty) sketch.queue.length = 0;
          else sketch.dirty = true;
        }
      }
      updatePose();
      if (lastSweep === null) lastSweep = p.sweep;
      else if (p.sweep !== lastSweep) {
        lastSweep = p.sweep;
        playSweep(p.sweepKind);
      }
    },

    render(dt, t) {
      now = t;
      let busy = false;

      if (baseDirty) {
        baseDirty = false;
        resetSurface(sketch);
        if (cardMesh.visible) {
          card.paint(card.shown, card.state);
          card.tex.needsUpdate = true;
        }
      }
      if (card.dirty && t - card.last >= 0.06) {
        card.dirty = false;
        card.last = t;
        print(card, t, 2, 150, 0.75);
      }
      if (sketch.dirty && t - sketch.last >= 0.06) {
        sketch.dirty = false;
        sketch.last = t;
        // Final words pour from the card; cached copy arrives out of the dark.
        const src = cardMat.opacity > 0.3 ? cardInk() : undefined;
        print(sketch, t, 0, 500, src ? 1.0 : 0.7, src);
        if (src) fade("card", cardMesh, () => cardMat.opacity, (v) => (cardMat.opacity = v), 0, 0.5, 0.15);
      }
      flush(card, t);
      flush(sketch, t);
      if (card.dirty || sketch.dirty || card.queue.length || sketch.queue.length) busy = true;
      if (resolving && !sketch.dirty && !sketch.queue.length && t - writingEnded > 0.2) resolve(t);

      if (writing) {
        busy = true;
        // Thinking: a fine swarm searches the card and the blocks to fill.
        ambient += dt * 90;
        while (ambient >= 1) {
          ambient -= 1;
          if (Math.random() < 0.55) card.local(rnd(40, CTW - 40), rnd(100, CTH - 30), tmp);
          else {
            const r = sketch.rects[Math.floor(Math.random() * 6)];
            sketch.local(rnd(r.x0, r.x1), rnd(r.y0, r.y1), tmp);
          }
          emit(tmp, t, rnd(0.7, 1.15), 1);
        }
        const pulse = 0.5 + 0.5 * Math.sin(t * 5);
        if (Math.abs(pulse - cardPulse) > 0.15) {
          cardPulse = pulse;
          card.paint(card.shown, card.state);
          card.tex.needsUpdate = true;
        }
      } else cardPulse = 1;
      drawTag(writing || resolving ? "writing" : props?.copy ? "claude" : "sketch");

      uploadParticles();
      if (fx.visible && t > pUntil && !writing) fx.visible = false;
      if (fx.visible || veil.visible || aura.visible || cardMesh.visible) busy = true;
      ptU.uTime.value = veilU.uTime.value = auraU.uTime.value = t;

      for (const [k, tw] of tweens) {
        if (Number.isNaN(tw.t0)) tw.t0 = t;
        const x = (t - tw.t0 - tw.delay) / tw.dur;
        if (x < 0) continue;
        tw.set(tw.from + (tw.to - tw.from) * tw.ease(Math.min(1, x)));
        if (x >= 1) {
          tweens.delete(k);
          tw.end?.();
        }
      }
      if (tweens.size) busy = true;

      // The studio dims while Claude writes; the glowing pane carries the light.
      scene.environmentIntensity = envLevel * (1 - 0.35 * focus);
      panes.forEach((p, i) => {
        const g = p.pane.group;
        const off = p.push + p.lean;
        g.position.set(p.def.pos[0] + p.toCam.x * off, p.def.pos[1] + p.toCam.y * off, p.def.pos[2] + p.toCam.z * off);
        g.rotation.set(p.rx, p.ry, 0);
        const want = hovered === i ? 1 : 0;
        p.hover = damp(p.hover, want, 12, dt);
        if (Math.abs(p.hover - want) > 0.002) busy = true;
        else p.hover = want;
        if (i < 3) {
          const dim = (REAL_DIM + (1 - REAL_DIM) * 0.55 * p.hover) * (1 - 0.45 * focus);
          p.pane.setDim(dim);
        }
      });

      // Pointer parallax, aspect fit and the scroll-out dolly.
      camX = damp(camX, px * 0.18, 4, dt);
      camY = damp(camY, py * 0.1, 4, dt);
      if (Math.abs(camX - px * 0.18) > 3e-4 || Math.abs(camY - py * 0.1) > 3e-4) busy = true;
      camera.position.copy(CAM).sub(LOOK).multiplyScalar(fit).add(LOOK);
      camera.position.x += camX;
      camera.position.y += camY;
      camera.position.z -= 0.8 * clamp01(props?.scroll ?? 0);
      camera.lookAt(LOOK);
      camera.updateMatrixWorld();
      scene.updateMatrixWorld();
      reportHover();

      renderer.render(scene, camera);
      return busy;
    },

    resize,

    pointer(nx, ny) {
      px = nx;
      py = ny;
      ndc.set(nx, ny);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(bodies, false)[0];
      const next = hit ? bodies.indexOf(hit.object as Mesh) : -1;
      if (next !== hovered) {
        hovered = next;
        if (host) host.style.cursor = next >= 0 ? "pointer" : "";
      }
    },

    pointerLeave() {
      px = py = 0;
      hovered = -1;
      if (host) host.style.cursor = "";
    },

    dispose() {
      disposed = true;
      host?.removeEventListener("click", onClick);
      if (host) host.style.cursor = "";
      for (const p of panes) {
        p.bar.dispose();
        p.pane.dispose();
      }
      for (const o of own) o.dispose();
      tweens.clear();
    },
  };
};

export default createHeroScene;
