import { gsap } from "@/lib/motion/gsap";
import { EDGES, NODE_BY_ID, VB_W } from "./geometry";

/**
 * Oxblood-light pulses travelling along the graph's edges, on one 2D canvas
 * laid over the SVG (same viewBox, so coordinates are shared).
 *
 * - Pulses only ride edges that are fully drawn (`isOn`), hop onward from
 *   node to node, and flash softly when they arrive — data moving through
 *   the build, left to right.
 * - An edge being drawn by the scroll gets a bright spark at its tip (`tip`).
 * - One pre-rendered glow sprite, additive blending, no shadowBlur: a few
 *   hundred drawImage calls a frame at most.
 * - Runs on GSAP's ticker only while the canvas is on screen; sleeps when
 *   there is nothing to draw.
 */

const SAMPLES = 40;
const SPEED = 300; // viewBox units per second
const TRAIL = 7;

interface EdgeRT {
  lut: Float32Array;
  len: number;
  to: string;
}

interface Pulse {
  e: number;
  t: number;
  v: number;
  hops: number;
}

interface Flash {
  x: number;
  y: number;
  life: number;
}

function makeSprite(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,246,247,1)");
    grad.addColorStop(0.18, "rgba(244,196,205,0.9)");
    grad.addColorStop(0.45, "rgba(207,135,148,0.35)");
    grad.addColorStop(1, "rgba(125,36,54,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  }
  return c;
}

export class PulseField {
  /** Is edge i fully drawn? Owner decides (scroll time, or always). */
  isOn: (i: number) => boolean = () => true;
  /** Tip fraction 0..1 of an edge being drawn right now, or -1. */
  tip: (i: number) => number = () => -1;
  /** Pulses alive at most when the whole graph is lit. */
  density = 1;

  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly sprite: HTMLCanvasElement;
  private readonly edges: EdgeRT[] = [];
  private readonly out = new Map<string, number[]>();
  private pulses: Pulse[] = [];
  private flashes: Flash[] = [];
  private scale = 1;
  private dpr = 1;
  private running = false;
  private visible = false;
  private spawnAcc = 0;
  private dirty = true;
  private readonly io: IntersectionObserver;
  private readonly ro: ResizeObserver;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    svg: SVGSVGElement,
  ) {
    this.ctx = canvas.getContext("2d");
    this.sprite = makeSprite();

    EDGES.forEach((e, i) => {
      const path = svg.querySelector<SVGPathElement>(`[data-edge="${CSS.escape(e.id)}"]`);
      const lut = new Float32Array(SAMPLES * 2);
      let len = 1;
      if (path) {
        len = path.getTotalLength();
        for (let k = 0; k < SAMPLES; k++) {
          const p = path.getPointAtLength((k / (SAMPLES - 1)) * len);
          lut[k * 2] = p.x;
          lut[k * 2 + 1] = p.y;
        }
      }
      this.edges.push({ lut, len, to: e.to });
      const list = this.out.get(e.from) ?? [];
      list.push(i);
      this.out.set(e.from, list);
    });

    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.io = new IntersectionObserver(
      (entries) => {
        this.visible = entries[entries.length - 1].isIntersecting;
        this.wake();
      },
      { rootMargin: "80px 0px" },
    );
    this.io.observe(canvas);
  }

  /** Send one pulse down edge i right now. */
  burst(i: number) {
    if (this.pulses.length > 90) return;
    this.pulses.push({ e: i, t: 0, v: SPEED / this.edges[i].len, hops: 0 });
    this.wake();
  }

  /** Something changed (scroll moved a tip): draw at least one frame. */
  wake() {
    this.dirty = true;
    if (this.visible && !this.running) {
      this.running = true;
      gsap.ticker.add(this.tick);
    }
  }

  destroy() {
    this.io.disconnect();
    this.ro.disconnect();
    if (this.running) gsap.ticker.remove(this.tick);
    this.running = false;
    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.scale = w / VB_W;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.wake();
  }

  private at(e: EdgeRT, t: number, out: [number, number]) {
    const f = Math.min(Math.max(t, 0), 1) * (SAMPLES - 1);
    const k = Math.min(Math.floor(f), SAMPLES - 2);
    const r = f - k;
    out[0] = e.lut[k * 2] + (e.lut[k * 2 + 2] - e.lut[k * 2]) * r;
    out[1] = e.lut[k * 2 + 1] + (e.lut[k * 2 + 3] - e.lut[k * 2 + 1]) * r;
  }

  private tick = (_time: number, deltaMs: number) => {
    const ctx = this.ctx;
    if (!ctx || !this.visible) {
      gsap.ticker.remove(this.tick);
      this.running = false;
      return;
    }
    const dt = Math.min(deltaMs, 50) / 1000;

    // Which edges can carry pulses right now?
    const on: number[] = [];
    for (let i = 0; i < this.edges.length; i++) if (this.isOn(i)) on.push(i);

    // Ambient spawning, scaled to how much of the graph is lit.
    const target = Math.round(Math.min(34, 3 + on.length * 0.5) * this.density);
    this.spawnAcc += dt;
    if (on.length && this.pulses.length < target && this.spawnAcc > 0.09) {
      this.spawnAcc = 0;
      const i = on[(Math.random() * on.length) | 0];
      this.pulses.push({ e: i, t: 0, v: (SPEED / this.edges[i].len) * (0.8 + Math.random() * 0.4), hops: 0 });
    }

    // Advance.
    const next: Pulse[] = [];
    for (const p of this.pulses) {
      if (!this.isOn(p.e)) continue;
      p.t += p.v * dt;
      if (p.t < 1) {
        next.push(p);
        continue;
      }
      const edge = this.edges[p.e];
      const node = NODE_BY_ID[edge.to];
      if (node) this.flashes.push({ x: node.x, y: node.y, life: 1 });
      const outs = (this.out.get(edge.to) ?? []).filter((i) => this.isOn(i));
      if (outs.length && p.hops < 10 && Math.random() < 0.72) {
        const ni = outs[(Math.random() * outs.length) | 0];
        next.push({ e: ni, t: 0, v: (SPEED / this.edges[ni].len) * (0.8 + Math.random() * 0.4), hops: p.hops + 1 });
      }
    }
    this.pulses = next;

    // Draw.
    const k = this.dpr * this.scale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.globalCompositeOperation = "lighter";

    const pt: [number, number] = [0, 0];
    const sprite = this.sprite;
    let drew = false;

    for (const p of this.pulses) {
      const edge = this.edges[p.e];
      const step = 9 / edge.len; // trail spacing ≈ 9 units
      for (let j = TRAIL - 1; j >= 0; j--) {
        const t = p.t - j * step;
        if (t < 0) continue;
        this.at(edge, t, pt);
        const fade = 1 - j / TRAIL;
        const size = 16 * (0.45 + 0.55 * fade);
        ctx.globalAlpha = 0.85 * fade * fade;
        ctx.drawImage(sprite, pt[0] - size / 2, pt[1] - size / 2, size, size);
      }
      drew = true;
    }

    // Sparks at the tips of edges being drawn by the scroll.
    for (let i = 0; i < this.edges.length; i++) {
      const f = this.tip(i);
      if (f < 0) continue;
      this.at(this.edges[i], f, pt);
      ctx.globalAlpha = 1;
      ctx.drawImage(sprite, pt[0] - 13, pt[1] - 13, 26, 26);
      drew = true;
    }

    const flashes: Flash[] = [];
    for (const f of this.flashes) {
      f.life -= dt * 2.4;
      if (f.life <= 0) continue;
      const size = 26 + (1 - f.life) * 22;
      ctx.globalAlpha = 0.5 * f.life;
      ctx.drawImage(sprite, f.x - size / 2, f.y - size / 2, size, size);
      flashes.push(f);
      drew = true;
    }
    this.flashes = flashes;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // Nothing alive and nothing lit: sleep until woken.
    if (!drew && !on.length && !this.dirty) {
      gsap.ticker.remove(this.tick);
      this.running = false;
    }
    this.dirty = false;
  };
}
