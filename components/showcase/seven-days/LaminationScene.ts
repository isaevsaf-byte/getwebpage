/**
 * SevenDays' WebGL lamination: the visitor's sketch as a foam-board model.
 *
 * Twelve blocks from getSketchLayout (one InstancedMesh) rise out of a page
 * plane. Their top faces sample a 2×2 atlas of stages 1–4 (drawSketchAtlas)
 * through MeshStandardMaterial.onBeforeCompile; the page plane samples the
 * same atlas plus a live canvas (the brief being typed, later the live page
 * with its URL typing). Everything is a pure function of the scrubbed `p` and
 * `launchT`, so scrolling back replays it exactly.
 *
 * Physical cues, all analytic — no shadow maps, no extra passes:
 *  - contact-hardening shadows and AO from every block onto the page and onto
 *    lower blocks (swept-box SDF, key light from the upper left);
 *  - foam-board edges: the printed sheet, a shaded glue line, foam core, contact darkening;
 *  - sockets: where a block lifts out, the page shows its cut-out. The draft
 *    sits slightly wrong, and the Day-4 revision drops the headline and the
 *    two buttons into their holes;
 *  - the press: a glass laminate sheet hinged at the top edge swings over and
 *    closes. Each block is clamped under the sheet's plane, so the flatten
 *    cascades top to bottom by geometry, and the live page is printed where
 *    the sheet touches. At flatten 1 the blocks hide and the page plane shows
 *    the identical stage-4 canvas, so the swap has no seam;
 *  - night, then lights on: a soft spotlight, then even light, env 1 → 1.6.
 *
 * The canvas stays transparent: SevenDays' DOM paper wipe shows through it.
 */
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  DirectionalLight,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  Vector4,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  drawSketch,
  drawSketchAtlas,
  ensureSketchFonts,
  getSketchLayout,
  sketchVisibleChars,
  type SketchBlock,
  type SketchCopy,
  type SketchInput,
  type SketchSector,
} from "@/lib/showcase/sketch";
import type { SceneFactory } from "@/lib/three/types";
import type { LaminationHandle, LaminationProps } from "./contract";

// ── world ──────────────────────────────────────────────────────────────────
const W = 1.6; // page width; the sketch is 1024×640, so H = 1
const H = 1;
const N = 12;
const DK = W * 0.85; // world units per sketch depth unit
const BEZEL = 0.035;
const HINGE = H / 2 + BEZEL * 0.55;
const LIFT = 0.01 * W; // hover lift
const LIGHT = new Vector3(-0.34, 0.5, 0.8).normalize();
const SCREEN_SCALE = 1.5; // live canvas at 1536×960
const DEG = Math.PI / 180;
const FILL = 0.9; // the pane's share of the frame
const PAN_X = 0.085; // re-centres the 3/4 view; 0 once square, so the wipe origin is the stage centre

const cl = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const seg = (p: number, a: number, b: number) => cl((p - a) / (b - a));
const io = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const eo = (t: number) => 1 - (1 - t) ** 4;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const damp = (a: number, b: number, l: number, dt: number) => a + (b - a) * (1 - Math.exp(-l * dt));

// ── shaders (shared by the page plane and the blocks) ──────────────────────
const VP = /* glsl */ `
varying vec2 vPg; varying vec3 vPn; varying vec3 vLc; varying vec3 vSz; varying vec3 vON; varying float vIdx;
#ifndef LAM_BASE
attribute vec4 aRect;
#endif
`;

const VB = /* glsl */ `#include <begin_vertex>
vLc = position; vON = normal;
#ifdef LAM_BASE
vPg = uv; vPn = position; vSz = vec3(1.); vIdx = -1.;
#else
vSz = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
vPn = (instanceMatrix * vec4(position, 1.)).xyz;
vPg = mix(aRect.xy, aRect.zw, position.xy + .5);
vIdx = float(gl_InstanceID);
#endif
`;

const FP = /* glsl */ `
uniform sampler2D uAtlas; uniform sampler2D uScreen;
uniform vec4 uM; uniform vec4 uImg; uniform vec4 uImgR; uniform vec4 uLit;
uniform vec2 uLid; uniform vec2 uSh; uniform float uHov;
uniform vec4 uBox[12]; uniform vec2 uZ[12]; uniform vec4 uSock[12];
varying vec2 vPg; varying vec3 vPn; varying vec3 vLc; varying vec3 vSz; varying vec3 vON; varying float vIdx;
vec3 gGlow;
float sdb(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }
float bnd(float x, float w) { return exp(-x * x / (w * w)); }
vec3 pageCol(vec2 uv) {
  vec2 q = clamp(uv, .0006, .9994) * .5;
  vec3 a1 = texture2D(uAtlas, q + vec2(0., .5)).rgb;
  vec3 a2 = texture2D(uAtlas, q + .5).rgb;
  vec3 a3 = texture2D(uAtlas, q).rgb;
  vec3 sc = texture2D(uScreen, uv).rgb;
  float s = (uv.x + (1. - uv.y) * .6) / 1.6;
  float inI = step(uImgR.x, uv.x) * step(uv.x, uImgR.z) * step(uImgR.y, uv.y) * step(uv.y, uImgR.w);
  float dI = length((uv - uImg.xy) * vec2(1.6, 1.)) - uM.w * uImg.z;
  float m12 = 1. - smoothstep(uM.y - .012, uM.y + .012, s);
  float m23 = mix(1. - smoothstep(uM.z - .012, uM.z + .012, s), 1. - smoothstep(-.005, .005, dI), inI);
  float yw = uv.y - .5;
  float m34 = smoothstep(uLid.x - .006, uLid.x + .006, yw);
  float y01 = 1. - uv.y - uM.x;
  float m01 = 1. - smoothstep(-.008, .008, y01);
  vec3 c = mix(mix(mix(a1, a2, m12), a3, m23), sc, m34);
  c = mix(sc, c, m01);
  float imgOn = step(.002, uM.w) * step(uM.w, .998) * inI;
  float lidOn = step(-.6, uLid.x) * step(uLid.x, .6);
  float core = bnd(s - uM.y, .01) + bnd(s - uM.z, .01) * (1. - inI) + bnd(dI, .006) * imgOn + bnd(y01, .008) + bnd(yw - uLid.x, .005) * lidOn;
  float fr = bnd(s - uM.y + .03, .025) + bnd(s - uM.z + .03, .025) * (1. - inI) + bnd(dI + .025, .02) * imgOn + bnd(y01 + .025, .02) + bnd(yw - uLid.x - .022, .016) * lidOn;
  gGlow = vec3(1., .9, .84) * min(core, 1.) * .6;
  return c * (1. - .5 * min(fr, 1.) * vec3(0., .55, .45));
}
vec2 occl(vec2 p, float z0) {
  float sh = 0., ao = 0.;
  for (int i = 0; i < 12; i++) {
    float t1 = uZ[i].y - z0;
    if (t1 < .0008) continue;
    float t0 = max(uZ[i].x - z0, 0.);
    vec2 c = p - uBox[i].xy;
    float d = 9.;
    for (int k = 0; k < 5; k++) d = min(d, sdb(c + uSh * mix(t0, t1, float(k) * .25), uBox[i].zw));
    float pen = .002 + t1 * .2;
    sh = max(sh, 1. - smoothstep(-pen * .3, pen, d));
    if (uZ[i].x - z0 < .002) ao = max(ao, (1. - smoothstep(0., .01 + t1 * .35, sdb(c, uBox[i].zw))) * min(t1 * 30., 1.));
  }
  return vec2(sh, ao);
}
`;

const FC = /* glsl */ `#include <color_fragment>
vec3 page = pageCol(vPg);
float top = step(.5, vON.z);
#ifdef LAM_BASE
diffuseColor.rgb = page;
#else
float dT = vSz.z * (1. - vLc.z);
vec3 foam = vec3(.86, .87, .84);
foam *= 1. - .14 * smoothstep(.0028, .0045, dT) * (1. - smoothstep(.0045, .009, dT));
foam = mix(page * .92, foam, smoothstep(.0022, .0034, dT));
foam *= mix(.5, 1., smoothstep(0., .04, vPn.z));
diffuseColor.rgb = mix(foam, page, top);
#endif
`;

const FO = /* glsl */ `if (top > .5) {
  vec2 o = occl(vPn.xy, vPn.z);
  float L = uLit.x * (1. - .45 * o.y) + uLit.y * (1. - .8 * o.x);
  L *= 1. - uLit.z * .3 * smoothstep(.2, 1., length(vPn.xy * vec2(.8, 1.25)));
  vec3 pc = page * L;
#ifdef LAM_BASE
  float sk = 0.;
  for (int i = 0; i < 12; i++) if (sdb(vPn.xy - uSock[i].xy, uSock[i].zw) < 0.) sk = max(sk, smoothstep(0., .004, uZ[i].y));
  pc = mix(pc, vec3(.03, .034, .036) * (1. + 2. * (1. - o.x)), sk);
#else
  float e = min((.5 - abs(vLc.x)) * vSz.x, (.5 - abs(vLc.y)) * vSz.y);
  pc *= 1. + .07 * (1. - smoothstep(0., .0016, e));
  pc = mix(pc, vec3(.624, .242, .296), (1. - smoothstep(.002, .005, e)) * uHov * step(abs(vIdx - uLit.w), .5));
#endif
  outgoingLight = pc + gGlow;
}
#include <opaque_fragment>`;

// ── blocks ─────────────────────────────────────────────────────────────────
interface Blk {
  b: SketchBlock;
  cx: number;
  cy: number;
  hw: number;
  hh: number;
  d: number;
  /** Draft x offset; the Day-4 revision slides it to 0. */
  dx: number;
}

function buildBlocks(sector: SketchSector): Blk[] {
  const out = getSketchLayout(sector, "desktop").map((b) => ({
    b,
    cx: (b.x + b.w / 2 - 0.5) * W,
    cy: (0.5 - b.y - b.h / 2) * H,
    hw: (b.w * W) / 2,
    hh: (b.h * H) / 2,
    d: b.depth * DK,
    dx: 0,
  }));
  const by = (id: string) => out.find((o) => o.b.id === id);
  const head = by("headline");
  if (head) head.dx = -0.03 * W;
  const a = by("cta");
  const c = by("cta2");
  if (a && c && Math.abs(a.cy - c.cy) < 1e-3) {
    // The draft has the two buttons the wrong way round.
    const [l, r] = a.cx < c.cx ? [a, c] : [c, a];
    const left = l.cx - l.hw;
    const right = r.cx + r.hw;
    r.dx = left + r.hw - r.cx;
    l.dx = right - l.hw - l.cx;
  }
  return out;
}

interface Sol {
  x: Float32Array;
  y: Float32Array;
  zb: Float32Array;
  h: Float32Array;
  r: Float32Array;
}
const newSol = (): Sol => ({
  x: new Float32Array(N),
  y: new Float32Array(N),
  zb: new Float32Array(N),
  h: new Float32Array(N),
  r: new Float32Array(N),
});

/** Laminate sheet angle: lying open above the page (π) → closed (0). */
function lidAngle(p: number): number {
  if (p < 0.74) return Math.PI;
  if (p < 0.8) return mix(Math.PI, 40 * DEG, io(seg(p, 0.74, 0.8)));
  return Math.atan(Math.tan(40 * DEG) * (1 - seg(p, 0.8, 0.895)) ** 1.6);
}
const lidTan = (a: number) => (a > 89.9 * DEG ? 1e4 : Math.tan(a));

function solve(blocks: Blk[], p: number, lift: Float32Array | null, s: Sol) {
  const u = seg(p, 0.25, 0.4);
  const rv = io(seg(p, 0.64, 0.7));
  const arc = Math.sin(Math.PI * rv);
  const tl = lidTan(lidAngle(p));
  blocks.forEach((k, i) => {
    let h = k.d * eo(cl((u - i * 0.035) / 0.615));
    let y = k.cy;
    let zb = 0;
    let r = 0;
    const id = k.b.id;
    if (id === "headline") zb = 0.022 * arc;
    else if (id === "cta") {
      y += 0.04 * H * arc;
      zb = 0.075 * arc;
      r = 4 * DEG * arc;
    } else if (id === "cta2") {
      y -= 0.04 * H * arc;
      r = -4 * DEG * arc;
    }
    if (lift && h > 0.004) h += lift[i];
    if (tl < 1e3) h = Math.min(h, Math.max(0, (HINGE - (y + k.hh)) * tl - zb));
    s.x[i] = k.cx + k.dx * (1 - rv);
    s.y[i] = y;
    s.zb[i] = zb;
    s.h[i] = h;
    s.r[i] = r;
  });
}

function pose(cam: PerspectiveCamera, p: number, aspect: number) {
  const i = io(seg(p, 0, 0.08));
  // Squares up as the sheet closes, landing front-on exactly as the site goes live.
  const o = io(seg(p, 0.72, 0.9));
  const drift = Math.sin(Math.PI * seg(p, 0.1, 0.55));
  const az = (35 * i + 3 * drift) * (1 - o) * DEG;
  const el = (6 + 22 * i - 2 * drift) * (1 - o) * DEG;
  const fov = 30 - 6 * o;
  const t = Math.tan((fov * DEG) / 2);
  const dist = Math.max((W / 2 + BEZEL) / FILL / (t * aspect), (H / 2 + BEZEL) / FILL / t);
  const pan = PAN_X * i * (1 - o);
  cam.fov = fov;
  cam.aspect = aspect;
  cam.position.set(
    Math.sin(az) * Math.cos(el) * dist + pan,
    Math.sin(el) * dist,
    Math.cos(az) * Math.cos(el) * dist + 0.05,
  );
  cam.lookAt(pan, 0, 0.05);
  cam.updateProjectionMatrix();
}

// ── scene ──────────────────────────────────────────────────────────────────
const createLaminationScene: SceneFactory = async (ctx) => {
  const { renderer, invalidate } = ctx;
  let w = ctx.width;
  let h = ctx.height;
  let dead = false;

  const st = {
    p: 0,
    launchT: 0,
    name: "",
    display: "your business",
    domain: "yourbusiness.co.uk",
    sector: "salon" as SketchSector,
    copy: undefined as SketchCopy | undefined,
    onHover: undefined as LaminationProps["onHover"],
  };
  const base = (): Omit<SketchInput, "stage" | "progress"> => ({
    name: st.name,
    display: st.display,
    domain: st.domain,
    sector: st.sector,
    layout: "desktop",
    copy: st.copy,
  });

  const scene = new Scene();
  scene.environment = ctx.env;
  const camera = new PerspectiveCamera(30, w / h, 0.1, 30);
  const sun = new DirectionalLight("#fff3ea", 1.9);
  sun.position.copy(LIGHT).multiplyScalar(5);
  const fillLight = new DirectionalLight("#e4e9ec", 1.1);
  fillLight.position.set(4, 1.2, 2.6);
  scene.add(sun, fillLight);

  const pane = new Group();
  scene.add(pane);
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);

  // Canvases → textures.
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const tex = (c: HTMLCanvasElement) => {
    const t = keep(new CanvasTexture(c));
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = aniso;
    return t;
  };
  const atlasCanvas = document.createElement("canvas");
  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = 1024 * SCREEN_SCALE;
  screenCanvas.height = 640 * SCREEN_SCALE;
  const atlasTex = tex(atlasCanvas);
  const screenTex = tex(screenCanvas);

  const U = {
    uAtlas: { value: atlasTex },
    uScreen: { value: screenTex },
    uM: { value: new Vector4() },
    uImg: { value: new Vector4() },
    uImgR: { value: new Vector4() },
    uLit: { value: new Vector4(0.5, 0.38, 1, -1) },
    uLid: { value: new Vector2(9, 0) },
    uSh: { value: new Vector2(LIGHT.x / LIGHT.z, LIGHT.y / LIGHT.z) },
    uHov: { value: 0 },
    uBox: { value: Array.from({ length: N }, () => new Vector4()) },
    uZ: { value: Array.from({ length: N }, () => new Vector2()) },
    uSock: { value: Array.from({ length: N }, () => new Vector4()) },
  };

  const printMat = (isBase: boolean) => {
    const m = keep(new MeshStandardMaterial({ roughness: 0.62, metalness: 0, toneMapped: false }));
    if (isBase) m.defines = { LAM_BASE: "" };
    m.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, U);
      s.vertexShader = VP + s.vertexShader.replace("#include <begin_vertex>", VB);
      s.fragmentShader =
        FP +
        s.fragmentShader
          .replace("#include <color_fragment>", FC)
          .replace("#include <opaque_fragment>", FO);
    };
    m.customProgramCacheKey = () => (isBase ? "lam-base" : "lam-block");
    return m;
  };

  // Page plane: the "screen" that shows every stage and, at the end, the live page.
  const page = new Mesh(keep(new PlaneGeometry(W, H)), printMat(true));
  page.renderOrder = 1; // after the blocks, so covered pixels are depth-rejected
  pane.add(page);

  // Device body: an ink slab with a bezel, like the hero's panes.
  const body = new Mesh(
    keep(new RoundedBoxGeometry(W + BEZEL * 2, H + BEZEL * 2, 0.05, 3, 0.022)),
    keep(
      new MeshPhysicalMaterial({
        color: "#1b2023",
        roughness: 0.34,
        clearcoat: 0.8,
        clearcoatRoughness: 0.12,
      }),
    ),
  );
  body.position.z = -0.03; // front face 5mm behind the page
  pane.add(body);

  // Blocks.
  const boxGeo = keep(new BoxGeometry(1, 1, 1).translate(0, 0, 0.5));
  const rectAttr = new InstancedBufferAttribute(new Float32Array(N * 4), 4);
  boxGeo.setAttribute("aRect", rectAttr);
  const blocksMesh = new InstancedMesh(boxGeo, printMat(false), N);
  blocksMesh.instanceMatrix.setUsage(DynamicDrawUsage);
  blocksMesh.frustumCulled = false;
  pane.add(blocksMesh);

  // 12-column construction grid, running past the page edges.
  const gridPos: number[] = [];
  const ext = 0.12;
  for (let k = 0; k < 12; k++) {
    for (const px of [64 + k * 76, 124 + k * 76]) {
      const x = (px / 1024 - 0.5) * W;
      gridPos.push(x, -H / 2 - ext, 0.0012, x, H / 2 + ext, 0.0012);
    }
  }
  for (const y of [-H / 2, H / 2 - (34 / 640) * H]) gridPos.push(-W / 2 - ext, y, 0.0012, W / 2 + ext, y, 0.0012);
  const gridGeo = keep(new BufferGeometry());
  gridGeo.setAttribute("position", new Float32BufferAttribute(gridPos, 3));
  const gridMat = keep(
    new LineBasicMaterial({ color: "#cf8794", transparent: true, opacity: 0, depthWrite: false, toneMapped: false }),
  );
  const grid = new LineSegments(gridGeo, gridMat);
  pane.add(grid);

  // Laminate sheet: glass hinged at the top bezel. Fresnel alpha and env
  // reflections, a bright cut edge, and a sheen that travels as it swings.
  const lidW = W + BEZEL * 1.2;
  const lidH = H / 2 + HINGE - 0.004;
  const lidU = {
    uOn: { value: 0 },
    uSweep: { value: 2 },
    uEdge: { value: 1 },
    uHalf: { value: new Vector2(lidW / 2, lidH / 2) },
  };
  const lidMat = keep(
    new MeshStandardMaterial({ color: "#ffffff", metalness: 1, roughness: 0.05, transparent: true, depthWrite: false }),
  );
  lidMat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, lidU);
    s.vertexShader =
      "varying vec2 vLp;\n" + s.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvLp = position.xy;");
    s.fragmentShader =
      "uniform float uOn; uniform float uSweep; uniform float uEdge; uniform vec2 uHalf; varying vec2 vLp;\n" +
      s.fragmentShader.replace(
        "#include <opaque_fragment>",
        [
          "float fr = pow(1. - abs(dot(normalize(normal), normalize(vViewPosition))), 3.);",
          "vec2 dd = uHalf - abs(vLp);",
          "float edge = (1. - smoothstep(.0, .005, min(dd.x, dd.y))) * uEdge;",
          "vec2 q = vLp / uHalf * .5 + .5;",
          "float sw = q.x * .45 + q.y - uSweep;",
          "float streak = exp(-sw * sw / .006) * uEdge;",
          "outgoingLight += vec3(1., .97, .94) * (edge * .9 + streak * .45);",
          "diffuseColor.a = (mix(.03, .07, uEdge) + .7 * fr + .75 * edge + .28 * streak) * uOn;",
          "#include <opaque_fragment>",
        ].join("\n"),
      );
  };
  lidMat.customProgramCacheKey = () => "lam-lid";
  const lid = new Mesh(keep(new RoundedBoxGeometry(lidW, lidH, 0.008, 2, 0.003)), lidMat);
  lid.position.y = -lidH / 2;
  lid.renderOrder = 3;
  const hinge = new Group();
  hinge.position.set(0, HINGE, 0.0045);
  hinge.add(lid);
  pane.add(hinge);

  // Soft shadow on the wall behind; only visible once the ground turns to paper.
  const shCanvas = document.createElement("canvas");
  shCanvas.width = 256;
  shCanvas.height = 160;
  const sc2 = shCanvas.getContext("2d");
  if (sc2) {
    sc2.shadowColor = "#000";
    sc2.shadowBlur = 22;
    sc2.shadowOffsetX = 1000;
    sc2.fillRect(-1000 + 72, 48, 112, 64); // 72/48px of margin: the blur never reaches the edge
  }
  const shMat = keep(
    new MeshBasicMaterial({ map: tex(shCanvas), color: "#000", transparent: true, opacity: 0, depthWrite: false }),
  );
  const shadow = new Mesh(keep(new PlaneGeometry(((W + BEZEL * 2) * 256) / 112, ((H + BEZEL * 2) * 160) / 64)), shMat);
  // Dropped straight down and a little narrower than the device: the stage
  // canvas ends ~40px past the pane's sides, and a sideways offset left the
  // blur visibly cut by the canvas edge on the paper ground.
  shadow.position.set(0, (-LIGHT.y / LIGHT.z) * 0.3, -0.3);
  shadow.scale.x = 0.8;
  shadow.renderOrder = -1;
  pane.add(shadow);

  // ── layout + drawing ─────────────────────────────────────────────────────
  let blocks: Blk[] = [];
  let sector: SketchSector | null = null;
  const setLayout = () => {
    sector = st.sector;
    blocks = buildBlocks(st.sector);
    const a = rectAttr.array as Float32Array;
    blocks.forEach((k, i) => {
      const b = k.b;
      a.set([b.x, 1 - b.y - b.h, b.x + b.w, 1 - b.y], i * 4);
      U.uSock.value[i].set(k.cx, k.cy, k.hw, k.hh);
      if (b.id === "image") {
        U.uImgR.value.set(b.x, 1 - b.y - b.h, b.x + b.w, 1 - b.y);
        U.uImg.value.set(b.x + b.w / 2, 1 - b.y - b.h / 2, Math.hypot(b.w * 0.8, b.h * 0.5) + 0.02, 0);
      }
    });
    rectAttr.needsUpdate = true;
  };

  let ver = 0;
  let screenKey = "";
  let timer = 0;
  let pending = true;
  const redraw = () => {
    window.clearTimeout(timer);
    timer = 0;
    pending = false;
    if (sector !== st.sector) setLayout();
    drawSketchAtlas(atlasCanvas, base());
    atlasTex.needsUpdate = true;
    ver++;
    invalidate();
  };
  const schedule = () => {
    pending = true;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      ensureSketchFonts(st.display).then(() => {
        if (!dead && pending) redraw();
      });
    }, 120);
  };

  const sctx = screenCanvas.getContext("2d");
  const drawScreen = () => {
    const live = st.p >= 0.5;
    const input: SketchInput = {
      ...base(),
      stage: live ? 4 : 0,
      progress: live ? st.launchT : seg(st.p, 0.085, 0.225),
    };
    const key = `${live}|${sketchVisibleChars(input)}|${ver}`;
    if (key === screenKey || !sctx) return;
    screenKey = key;
    sctx.setTransform(SCREEN_SCALE, 0, 0, SCREEN_SCALE, 0, 0);
    drawSketch(sctx, 1024, 640, input);
    screenTex.needsUpdate = true;
  };

  await ensureSketchFonts();
  setLayout();
  drawSketchAtlas(atlasCanvas, base());

  // ── per-frame state ──────────────────────────────────────────────────────
  const sol = newSol();
  const tmp = newSol();
  const lift = new Float32Array(N);
  const M = new Matrix4();
  const Q = new Quaternion();
  const P = new Vector3();
  const S = new Vector3();
  const Z = new Vector3(0, 0, 1);
  const V = new Vector3();
  const ray = new Raycaster();
  const ndc = new Vector2();
  let pointerIn = false;
  let hoverDirty = false;
  let hovered = -1;
  let hovAmt = 0;
  let lastEmit = "";

  const toCss = (v: Vector3, cam: PerspectiveCamera) => {
    v.project(cam);
    return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h };
  };

  const apply = (p: number) => {
    solve(blocks, p, lift, sol);
    let maxH = 0;
    blocks.forEach((k, i) => {
      const hh = sol.h[i];
      maxH = Math.max(maxH, hh);
      Q.setFromAxisAngle(Z, sol.r[i]);
      P.set(sol.x[i], sol.y[i], sol.zb[i]);
      S.set(k.hw * 2, k.hh * 2, Math.max(hh, 5e-4));
      blocksMesh.setMatrixAt(i, M.compose(P, Q, S));
      U.uBox.value[i].set(sol.x[i], sol.y[i], k.hw, k.hh);
      U.uZ.value[i].set(sol.zb[i], sol.zb[i] + (hh > 2e-4 ? hh : 0));
    });
    blocksMesh.instanceMatrix.needsUpdate = true;
    blocksMesh.visible = maxH > 2e-4;

    // Stage masks: brief → wire wipe, type sweep, colour sweep, image reveal.
    U.uM.value.set(
      mix(-0.06, 1.06, seg(p, 0.232, 0.258)),
      mix(-0.06, 1.06, seg(p, 0.4, 0.47)),
      mix(-0.06, 1.06, seg(p, 0.47, 0.53)),
      io(seg(p, 0.48, 0.55)),
    );
    const a = lidAngle(p);
    const tl = lidTan(a);
    // Where the sheet is 1cm off the page: above it, the page is pressed and live.
    U.uLid.value.x = tl >= 1e3 ? 9 : tl < 1e-5 ? -9 : HINGE - 0.01 / tl;
    lidU.uSweep.value = mix(-0.4, 1.9, a / Math.PI);
    lidU.uEdge.value = Math.min(1, a / (25 * DEG));
    hinge.rotation.x = -a;
    lidU.uOn.value = seg(p, 0.738, 0.762); // appears as it starts to swing
    hinge.visible = lidU.uOn.value > 0;

    gridMat.opacity = 0.35 * seg(p, 0.25, 0.4) * (1 - seg(p, 0.72, 0.78));
    grid.visible = gridMat.opacity > 0.002;

    const day = io(seg(p, 0.93, 1));
    scene.environmentIntensity = 1 + 0.6 * day;
    U.uLit.value.set(mix(0.5, 0.7, day), mix(0.38, 0.3, day), 1 - day, hovered);
    U.uHov.value = hovAmt;
    shMat.opacity = 0.2 * day;
    pane.position.y = -0.4 * (1 - eo(seg(p, 0, 0.08)));
    pose(camera, p, w / h);
  };

  const emit = () => {
    const cb = st.onHover;
    if (hovered < 0) {
      if (lastEmit !== "") cb?.(null);
      lastEmit = "";
      return;
    }
    const k = blocks[hovered];
    V.set(sol.x[hovered], sol.y[hovered] + k.hh, sol.zb[hovered] + sol.h[hovered]);
    V.y += pane.position.y;
    const c = toCss(V, camera);
    const key = `${hovered}|${Math.round(c.x)}|${Math.round(c.y)}`;
    if (key === lastEmit) return;
    lastEmit = key;
    cb?.({ blockId: k.b.id, label: k.b.hoverLabel, x: c.x, y: c.y });
  };

  const pick = () => {
    hoverDirty = false;
    let next = -1;
    if (pointerIn && blocksMesh.visible && st.p > 0.27 && st.p < 0.74) {
      blocksMesh.updateMatrixWorld();
      blocksMesh.computeBoundingSphere();
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObject(blocksMesh, false)[0];
      if (hit && hit.instanceId !== undefined && sol.h[hit.instanceId] > 0.006) next = hit.instanceId;
    }
    const changed = next !== hovered;
    hovered = next;
    return changed;
  };

  const handle: LaminationHandle = {
    async compile() {
      if (pending) {
        await ensureSketchFonts(st.display);
        redraw();
      }
      // compileAsync skips hidden objects; show everything so no shader
      // compiles mid-scroll when the lid or the blocks first appear.
      apply(st.p);
      drawScreen();
      for (const o of [blocksMesh, grid, hinge]) o.visible = true;
      await renderer.compileAsync(scene, camera);
      // One warm draw while the canvas is still hidden: some drivers build
      // pipeline state on first use, which would otherwise hitch at p 0.25.
      renderer.render(scene, camera);
      apply(st.p);
    },

    render(dt) {
      let busy = false;
      blocks.forEach((_, i) => {
        const target = i === hovered ? LIFT : 0;
        lift[i] = damp(lift[i], target, 20, dt);
        if (Math.abs(lift[i] - target) > 1e-5) busy = true;
        else lift[i] = target;
      });
      const ht = hovered >= 0 ? 1 : 0;
      hovAmt = damp(hovAmt, ht, 20, dt);
      if (Math.abs(hovAmt - ht) > 1e-3) busy = true;
      else hovAmt = ht;

      apply(st.p);
      drawScreen();
      if (hoverDirty && pick()) busy = true;
      emit();
      renderer.render(scene, camera);
      return busy;
    },

    resize(nw, nh) {
      w = nw;
      h = nh;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },

    setProps(raw) {
      const q = raw as Partial<LaminationProps>;
      let input = false;
      if (typeof q.p === "number" && q.p !== st.p) {
        st.p = cl(q.p);
        hoverDirty = true;
      }
      if (typeof q.launchT === "number") st.launchT = cl(q.launchT);
      for (const k of ["name", "display", "domain", "sector"] as const) {
        const val = q[k];
        if (typeof val === "string" && val !== st[k]) {
          Object.assign(st, { [k]: val });
          input = true;
        }
      }
      if ("copy" in q) {
        const next = q.copy ?? undefined;
        if (JSON.stringify(next ?? null) !== JSON.stringify(st.copy ?? null)) {
          st.copy = next;
          input = true;
        }
      }
      if ("onHover" in q) st.onHover = q.onHover;
      if (input) schedule();
      invalidate();
    },

    pointer(nx, ny) {
      ndc.set(nx, ny);
      pointerIn = true;
      hoverDirty = true;
    },

    pointerLeave() {
      pointerIn = false;
      hoverDirty = true;
    },

    projectRect(blockId) {
      const i = blocks.findIndex((k) => k.b.id === blockId);
      if (i < 0) return null;
      // Day-4 hold pose (camera still, draft positions, full height), so the
      // rect is valid whenever SevenDays measures it.
      const pr = Math.min(0.635, Math.max(0.56, st.p));
      solve(blocks, pr, null, tmp);
      const cam = camera.clone();
      pose(cam, pr, w / h);
      const k = blocks[i];
      const c = Math.cos(tmp.r[i]);
      const s = Math.sin(tmp.r[i]);
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]) {
        const lx = sx * k.hw;
        const ly = sy * k.hh;
        V.set(tmp.x[i] + lx * c - ly * s, tmp.y[i] + lx * s + ly * c, tmp.zb[i] + tmp.h[i]);
        const pt = toCss(V, cam);
        x0 = Math.min(x0, pt.x);
        y0 = Math.min(y0, pt.y);
        x1 = Math.max(x1, pt.x);
        y1 = Math.max(y1, pt.y);
      }
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    },

    dispose() {
      dead = true;
      window.clearTimeout(timer);
      blocksMesh.dispose();
      for (const d of disposables) d.dispose();
      scene.clear();
    },
  };

  return handle;
};

export default createLaminationScene;
