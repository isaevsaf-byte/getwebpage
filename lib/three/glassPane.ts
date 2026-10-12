import {
  CanvasTexture,
  Color,
  Group,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  type Material,
  type Texture,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/**
 * A browser window made of glass: a dark rounded slab, a chrome strip with
 * the domain, a screen that takes any texture, a hairline edge, a fresnel rim
 * lit by the studio env and a faint front reflection.
 *
 * No MeshTransmissionMaterial (an extra full-scene render per frame); the
 * "glass" is clearcoat + env reflections + rim, which costs one pass.
 */

export type PaneTone = "ink" | "bone";

export interface GlassPaneOptions {
  width: number;
  height: number;
  screen: Texture;
  domain: string;
  env: Texture;
  tone?: PaneTone;
  /** Called after an async redraw (the chrome font finished loading). Pass ctx.invalidate. */
  invalidate?: () => void;
}

export interface GlassPane {
  group: Group;
  /** The rounded slab — a convenient raycast target for hover. */
  body: Mesh;
  setScreen(t: Texture): void;
  /** 1 = full brightness, 0.55 = the dimmed "real site" look. Applies to screen and chrome. */
  setDim(v: number): void;
  setDomain(d: string): void;
  dispose(): void;
}

const DEPTH = 0.04;
const SEGMENTS = 4;
const RADIUS = 0.035; // RoundedBoxGeometry clamps to depth/2 = 0.02
const INSET = 0.04;
const CHROME_W = 1024; // 2× the 512×32 spec size so the DM Mono domain stays crisp at DPR 1.75
const CHROME_H = 64;
const Z_FACE = DEPTH / 2;

const PALETTE = {
  ink: {
    body: "#1b2023",
    chrome: "#1b2023",
    hairline: "rgba(227,230,224,0.10)",
    dots: "#3b4346",
    text: "#9aa19d",
    rim: new Color("#7d2436").lerp(new Color("#e3e6e0"), 0.18),
    rimIntensity: 1.6,
  },
  bone: {
    body: "#d9dcd6",
    chrome: "#dcdfd9",
    hairline: "rgba(20,24,26,0.10)",
    dots: "#b7bcb6",
    text: "#5a6360",
    rim: new Color("#e3e6e0"),
    rimIntensity: 0.6,
  },
} as const;

let cachedMono: string | null = null;
function monoFamily(): string {
  if (cachedMono) return cachedMono;
  const fallback = "ui-monospace, Menlo, monospace";
  try {
    // next/font defines --font-mono on <body>; resolve it to a concrete family.
    const probe = document.createElement("span");
    probe.style.cssText = "position:absolute;visibility:hidden;font-family:var(--font-mono)";
    document.body.appendChild(probe);
    const family = getComputedStyle(probe).fontFamily;
    probe.remove();
    cachedMono = family && !family.includes("var(") ? `${family}, ${fallback}` : fallback;
  } catch {
    cachedMono = fallback;
  }
  return cachedMono;
}

/** Inject a uniform brightness multiplier into a MeshBasicMaterial. */
function withDim(material: MeshBasicMaterial, uniform: { value: number }) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uDim = uniform;
    shader.fragmentShader =
      "uniform float uDim;\n" +
      shader.fragmentShader.replace(
        "#include <map_fragment>",
        "#include <map_fragment>\n\tdiffuseColor.rgb *= uDim;",
      );
  };
  material.customProgramCacheKey = () => "gwp-dim";
}

/** Crop UVs so the texture covers the plane, anchored to the top (sites read top-down). */
function fitCoverTop(geo: PlaneGeometry, tex: Texture, planeAspect: number) {
  const img = tex.image as { width?: number; height?: number; videoWidth?: number; videoHeight?: number } | null;
  const w = img?.videoWidth || img?.width || 0;
  const h = img?.videoHeight || img?.height || 0;
  const uv = geo.getAttribute("uv");
  // PlaneGeometry (1×1 segments) UV order: TL, TR, BL, BR.
  const base = [0, 1, 1, 1, 0, 0, 1, 0];
  let su = 1;
  let sv = 1;
  let ou = 0;
  let ov = 0;
  if (w > 0 && h > 0) {
    const texAspect = w / h;
    if (texAspect > planeAspect) {
      su = planeAspect / texAspect;
      ou = (1 - su) / 2;
    } else {
      sv = texAspect / planeAspect;
      ov = tex.flipY ? 1 - sv : 0;
    }
  }
  for (let i = 0; i < 4; i++) {
    uv.setXY(i, base[i * 2] * su + ou, base[i * 2 + 1] * sv + ov);
  }
  uv.needsUpdate = true;
}

function roundedRect(shape: Shape, w: number, h: number, r: number) {
  const x = -w / 2;
  const y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

export function createGlassPane(opts: GlassPaneOptions): GlassPane {
  const { width, height, env } = opts;
  const tone: PaneTone = opts.tone ?? "ink";
  const pal = PALETTE[tone];
  const group = new Group();
  group.name = "glass-pane";

  const materials: Material[] = [];
  const geometries: { dispose(): void }[] = [];

  // ── Body: rounded slab with clearcoat and a fresnel rim ─────────────────
  const bodyGeo = new RoundedBoxGeometry(width, height, DEPTH, SEGMENTS, RADIUS);
  const bodyMat = new MeshPhysicalMaterial({
    color: pal.body,
    roughness: 0.08,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    envMap: env,
    envMapIntensity: 1.2,
    transparent: true,
    opacity: 0.92,
  });
  const rimUniforms = {
    uRimColor: { value: pal.rim.clone() },
    uRimIntensity: { value: pal.rimIntensity },
  };
  bodyMat.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = rimUniforms.uRimColor;
    shader.uniforms.uRimIntensity = rimUniforms.uRimIntensity;
    shader.fragmentShader =
      "uniform vec3 uRimColor;\nuniform float uRimIntensity;\n" +
      shader.fragmentShader.replace(
        "#include <opaque_fragment>",
        [
          "float gwpFacing = clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0);",
          "outgoingLight += uRimColor * pow(1.0 - gwpFacing, 3.0) * uRimIntensity;",
          "#include <opaque_fragment>",
        ].join("\n\t"),
      );
  };
  bodyMat.customProgramCacheKey = () => "gwp-glass-rim";
  const body = new Mesh(bodyGeo, bodyMat);
  body.name = "glass-pane-body";
  // An explicit envMap ignores scene.environmentIntensity in three r186, so
  // mirror it here: the hero fades the studio in by tweening that one value.
  body.onBeforeRender = (_renderer, scene) => {
    bodyMat.envMapIntensity = 1.2 * scene.environmentIntensity;
  };
  group.add(body);
  geometries.push(bodyGeo);
  materials.push(bodyMat);

  // ── Chrome strip (dots + domain) and screen, both dimmable ──────────────
  const dim = { value: 1 };
  const innerW = width - INSET * 2;
  const innerH = height - INSET * 2;
  const chromeH = innerW * (CHROME_H / CHROME_W);
  const screenH = Math.max(0.01, innerH - chromeH);

  const chromeCanvas = document.createElement("canvas");
  chromeCanvas.width = CHROME_W;
  chromeCanvas.height = CHROME_H;
  const chromeTex = new CanvasTexture(chromeCanvas);
  chromeTex.colorSpace = SRGBColorSpace;
  chromeTex.anisotropy = 4;
  chromeTex.minFilter = LinearMipmapLinearFilter;
  const chromeMat = new MeshBasicMaterial({ map: chromeTex, toneMapped: false });
  withDim(chromeMat, dim);
  const chromeGeo = new PlaneGeometry(innerW, chromeH);
  const chrome = new Mesh(chromeGeo, chromeMat);
  chrome.position.set(0, height / 2 - INSET - chromeH / 2, Z_FACE + 0.0008);
  group.add(chrome);
  geometries.push(chromeGeo);
  materials.push(chromeMat);

  const screenGeo = new PlaneGeometry(innerW, screenH);
  const screenMat = new MeshBasicMaterial({ toneMapped: false });
  withDim(screenMat, dim);
  const screen = new Mesh(screenGeo, screenMat);
  screen.name = "glass-pane-screen";
  screen.position.set(0, -height / 2 + INSET + screenH / 2, Z_FACE + 0.0008);
  group.add(screen);
  geometries.push(screenGeo);
  materials.push(screenMat);

  // ── Hairline edge just inside the curved border ─────────────────────────
  const ringOuterW = width - 0.044;
  const ringOuterH = height - 0.044;
  const ringT = 0.0045;
  const ringShape = roundedRect(new Shape(), ringOuterW, ringOuterH, 0.014);
  ringShape.holes.push(roundedRect(new Shape(), ringOuterW - ringT * 2, ringOuterH - ringT * 2, 0.01));
  const ringGeo = new ShapeGeometry(ringShape, 6);
  const ringMat = new MeshBasicMaterial({
    color: tone === "ink" ? "#e3e6e0" : "#14181a",
    transparent: true,
    opacity: tone === "ink" ? 0.16 : 0.12,
    depthWrite: false,
    toneMapped: false,
  });
  const ring = new Mesh(ringGeo, ringMat);
  ring.position.z = Z_FACE + 0.0012;
  ring.renderOrder = 1;
  group.add(ring);
  geometries.push(ringGeo);
  materials.push(ringMat);

  // ── Front glass: a 6% reflection of the studio over the screen ─────────
  const glassGeo = new PlaneGeometry(innerW, innerH);
  const glassMat = new MeshStandardMaterial({
    color: "#ffffff",
    metalness: 1,
    roughness: 0.06,
    envMap: env,
    envMapIntensity: 1,
    transparent: true,
    opacity: 0.06,
    depthWrite: false,
  });
  const glass = new Mesh(glassGeo, glassMat);
  glass.onBeforeRender = (_renderer, scene) => {
    glassMat.envMapIntensity = scene.environmentIntensity;
  };
  glass.position.z = Z_FACE + 0.0016;
  glass.renderOrder = 2;
  group.add(glass);
  geometries.push(glassGeo);
  materials.push(glassMat);

  // ── Chrome drawing ──────────────────────────────────────────────────────
  let disposed = false;
  let domain = opts.domain;
  const drawChrome = () => {
    const ctx = chromeCanvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CHROME_W, CHROME_H);
    ctx.fillStyle = pal.chrome;
    ctx.fillRect(0, 0, CHROME_W, CHROME_H);
    ctx.fillStyle = pal.hairline;
    ctx.fillRect(0, CHROME_H - 2, CHROME_W, 2);
    ctx.fillStyle = pal.dots;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(30 + i * 24, CHROME_H / 2, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = pal.text;
    ctx.font = `400 26px ${monoFamily()}`;
    ctx.textBaseline = "middle";
    ctx.fillText(domain, 116, CHROME_H / 2 + 1, CHROME_W - 140);
    chromeTex.needsUpdate = true;
  };
  drawChrome();
  try {
    const font = `400 26px ${monoFamily()}`;
    if (!document.fonts.check(font)) {
      document.fonts.load(font).then(() => {
        if (disposed) return;
        drawChrome();
        opts.invalidate?.();
      }, () => {});
    }
  } catch {
    // FontFaceSet unavailable: the fallback mono is already drawn.
  }

  // ── API ─────────────────────────────────────────────────────────────────
  const setScreen = (t: Texture) => {
    if (t.colorSpace === NoColorSpace) {
      t.colorSpace = SRGBColorSpace;
      t.needsUpdate = true;
    }
    fitCoverTop(screenGeo, t, innerW / screenH);
    screenMat.map = t;
    screenMat.needsUpdate = true;
  };
  setScreen(opts.screen);

  return {
    group,
    body,
    setScreen,
    setDim(v: number) {
      dim.value = Math.max(0, v);
    },
    setDomain(d: string) {
      if (d === domain) return;
      domain = d;
      drawChrome();
    },
    dispose() {
      disposed = true;
      group.removeFromParent();
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      chromeTex.dispose();
      // The screen texture and env belong to the caller.
    },
  };
}
