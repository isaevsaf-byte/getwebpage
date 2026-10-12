/**
 * Procedural sector imagery. Each painter draws an art-directed "photo" of
 * still-life objects from gradients and shapes — no network, no files.
 *
 * Paintings are expensive-ish (wood grain, soft shadows), so each one is
 * rendered once per pixel size into an offscreen canvas and reused with a
 * single drawImage. That keeps a full sketch draw well under 4ms.
 */
import { fontGeneration, fontString } from "./fonts";
import type { SketchLayoutKind, SketchSector } from "./types";

type C2D = CanvasRenderingContext2D;

// ── helpers ────────────────────────────────────────────────────────────────

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function roundRectPath(
  ctx: C2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

/** Arch: a rectangle whose top is a full semicircle. */
export function archPath(ctx: C2D, x: number, y: number, w: number, h: number): void {
  const r = w / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, 0);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

function ellipse(ctx: C2D, cx: number, cy: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
}

/** A soft elliptical shadow made of a radial gradient (no shadowBlur cost). */
function softShadow(
  ctx: C2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rgb: string,
  alpha: number,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(0.55, `rgba(${rgb},${alpha * 0.55})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

let grainTile: HTMLCanvasElement | null = null;

function grain(ctx: C2D, w: number, h: number, alpha: number) {
  if (!grainTile) {
    grainTile = document.createElement("canvas");
    grainTile.width = grainTile.height = 128;
    const g = grainTile.getContext("2d");
    if (!g) return;
    const img = g.createImageData(128, 128);
    const r = rng(7);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 96 + Math.floor(r() * 64);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  const pat = ctx.createPattern(grainTile, "repeat");
  if (!pat) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function vignette(ctx: C2D, w: number, h: number, rgb: string, alpha: number) {
  const g = ctx.createRadialGradient(w * 0.45, h * 0.42, Math.min(w, h) * 0.25, w * 0.5, h * 0.5, Math.hypot(w, h) * 0.62);
  g.addColorStop(0, `rgba(${rgb},0)`);
  g.addColorStop(1, `rgba(${rgb},${alpha})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// ── salon: soft still life inside an arch ──────────────────────────────────

function paintSalon(ctx: C2D, w: number, h: number, layout: SketchLayoutKind) {
  ctx.save();
  archPath(ctx, 0, 0, w, h);
  ctx.clip();

  // Wall, warm blush, lit from the top left.
  const wall = ctx.createLinearGradient(0, 0, w * 0.3, h);
  wall.addColorStop(0, "#efe1dc");
  wall.addColorStop(0.5, "#e4cdc8");
  wall.addColorStop(1, "#d6b9b7");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, w, h);

  const light = ctx.createRadialGradient(w * 0.12, h * 0.08, 0, w * 0.12, h * 0.08, w * 1.05);
  light.addColorStop(0, "rgba(255,248,244,0.75)");
  light.addColorStop(0.45, "rgba(255,246,241,0.25)");
  light.addColorStop(1, "rgba(255,246,241,0)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, w, h);

  // Window light falling across the wall in two slanted panes.
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "#fff8f4";
  for (const [x0, ww] of [
    [0.06, 0.2],
    [0.32, 0.14],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(w * x0, 0);
    ctx.lineTo(w * (x0 + ww), 0);
    ctx.lineTo(w * (x0 + ww + 0.34), h * 0.7);
    ctx.lineTo(w * (x0 + 0.34), h * 0.7);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const shelfY = h * (layout === "mobile" ? 0.74 : 0.71);

  // Mirror, standing on the counter.
  const mr = w * (layout === "mobile" ? 0.27 : 0.3);
  const mcx = w * 0.57;
  const mcy = shelfY - mr * 0.98;
  softShadow(ctx, mcx + mr * 0.25, mcy + mr * 0.15, mr * 1.15, mr * 1.05, "120,70,80", 0.16);
  // Rim.
  const rim = ctx.createLinearGradient(mcx - mr, mcy - mr, mcx + mr, mcy + mr);
  rim.addColorStop(0, "#c49a9e");
  rim.addColorStop(0.5, "#a77a80");
  rim.addColorStop(1, "#8c6168");
  ctx.fillStyle = rim;
  ellipse(ctx, mcx, mcy, mr, mr);
  ctx.fill();
  // Glass reflecting the room.
  const glass = ctx.createRadialGradient(mcx - mr * 0.35, mcy - mr * 0.4, mr * 0.05, mcx, mcy, mr * 0.95);
  glass.addColorStop(0, "#f7ece8");
  glass.addColorStop(0.55, "#e2c9c7");
  glass.addColorStop(1, "#c6a2a6");
  ctx.fillStyle = glass;
  ellipse(ctx, mcx, mcy, mr * 0.9, mr * 0.9);
  ctx.fill();
  ctx.save();
  ellipse(ctx, mcx, mcy, mr * 0.9, mr * 0.9);
  ctx.clip();
  // A reflected window and a soft diagonal sheen.
  ctx.fillStyle = "rgba(255,250,247,0.35)";
  ctx.fillRect(mcx - mr * 0.62, mcy - mr * 0.75, mr * 0.34, mr * 0.9);
  ctx.fillRect(mcx - mr * 0.2, mcy - mr * 0.75, mr * 0.2, mr * 0.9);
  const sheen = ctx.createLinearGradient(mcx - mr, mcy - mr, mcx + mr, mcy + mr);
  sheen.addColorStop(0.35, "rgba(255,255,255,0)");
  sheen.addColorStop(0.48, "rgba(255,255,255,0.28)");
  sheen.addColorStop(0.56, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(mcx - mr, mcy - mr, mr * 2, mr * 2);
  // The far wall of the room, seen in the glass.
  ctx.fillStyle = "rgba(150,105,112,0.18)";
  ctx.fillRect(mcx - mr, mcy + mr * 0.42, mr * 2, mr);
  ctx.restore();

  // Counter.
  const counter = ctx.createLinearGradient(0, shelfY, 0, h);
  counter.addColorStop(0, "#d3b3b2");
  counter.addColorStop(0.25, "#c8a3a5");
  counter.addColorStop(1, "#ad8187");
  ctx.fillStyle = counter;
  ctx.fillRect(0, shelfY, w, h - shelfY);
  ctx.fillStyle = "rgba(255,242,238,0.55)";
  ctx.fillRect(0, shelfY, w, Math.max(1, h * 0.004));
  const lip = ctx.createLinearGradient(0, shelfY, 0, shelfY + h * 0.05);
  lip.addColorStop(0, "rgba(90,50,60,0.18)");
  lip.addColorStop(1, "rgba(90,50,60,0)");
  ctx.fillStyle = lip;
  ctx.fillRect(0, shelfY + 1, w, h * 0.05);

  // Folded towels, stacked on the left.
  const tw = w * 0.4;
  const th = h * (layout === "mobile" ? 0.06 : 0.052);
  const tx = w * 0.08;
  const towelColours = [
    ["#f4ebe7", "#e3d2cd"],
    ["#e7cdca", "#d1aeac"],
    ["#f1e5e0", "#ddc9c4"],
  ];
  softShadow(ctx, tx + tw * 0.55, shelfY + th * 0.15, tw * 0.62, th * 0.5, "90,45,55", 0.32);
  for (let i = 0; i < 3; i++) {
    const y = shelfY - th * (i + 1) + i * th * 0.04;
    const xo = tx + (i === 1 ? w * 0.015 : 0) - (i === 2 ? w * 0.01 : 0);
    const g = ctx.createLinearGradient(0, y, 0, y + th);
    g.addColorStop(0, towelColours[i][0]);
    g.addColorStop(1, towelColours[i][1]);
    ctx.fillStyle = g;
    roundRectPath(ctx, xo, y, tw, th * 0.98, th * 0.48);
    ctx.fill();
    // The folded edge.
    ctx.strokeStyle = "rgba(120,80,88,0.18)";
    ctx.lineWidth = Math.max(1, w * 0.003);
    ctx.beginPath();
    ctx.moveTo(xo + tw * 0.08, y + th * 0.52);
    ctx.lineTo(xo + tw * 0.86, y + th * 0.52);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(xo + tw * 0.08, y + th * 0.12, tw * 0.78, Math.max(1, th * 0.08));
  }

  // Two pebble-like vessels in front: berry and bone, overlapping.
  const pcx = w * 0.79;
  const pcy = shelfY - w * 0.055;
  softShadow(ctx, pcx + w * 0.02, shelfY + 2, w * 0.13, h * 0.016, "80,30,45", 0.4);
  const berry = ctx.createRadialGradient(pcx - w * 0.03, pcy - w * 0.04, w * 0.01, pcx, pcy, w * 0.1);
  berry.addColorStop(0, "#b46476");
  berry.addColorStop(0.6, "#8e3f52");
  berry.addColorStop(1, "#6a2a3b");
  ctx.fillStyle = berry;
  ellipse(ctx, pcx, pcy, w * 0.085, w * 0.065);
  ctx.fill();
  const bcx = pcx - w * 0.1;
  const bcy = shelfY - w * 0.035;
  const bone = ctx.createRadialGradient(bcx - w * 0.02, bcy - w * 0.025, w * 0.005, bcx, bcy, w * 0.07);
  bone.addColorStop(0, "#fbf4f1");
  bone.addColorStop(0.7, "#eadbd6");
  bone.addColorStop(1, "#d4bdb9");
  ctx.fillStyle = bone;
  ellipse(ctx, bcx, bcy, w * 0.058, w * 0.042);
  ctx.fill();

  vignette(ctx, w, h, "70,35,45", 0.22);
  grain(ctx, w, h, 0.07);
  ctx.restore();

  // Hairline on the arch edge so it sits crisply on any ground.
  ctx.save();
  archPath(ctx, 0.5, 0.5, w - 1, h - 1);
  ctx.strokeStyle = "rgba(42,29,34,0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

// ── café: a table seen from above ──────────────────────────────────────────

function paintCafe(ctx: C2D, w: number, h: number) {
  const r = rng(11);
  const m = Math.min(w, h);

  // Oak planks.
  const planks = 5;
  const ph = h / planks;
  const tones = ["#c9ae8b", "#c2a581", "#cdb391", "#bfa07b", "#c7ab87"];
  for (let i = 0; i < planks; i++) {
    const g = ctx.createLinearGradient(0, i * ph, w, (i + 1) * ph);
    g.addColorStop(0, tones[i]);
    g.addColorStop(1, tones[(i + 2) % planks]);
    ctx.fillStyle = g;
    ctx.fillRect(0, i * ph, w, ph + 1);
    // Grain lines.
    ctx.lineWidth = Math.max(0.6, m * 0.0016);
    for (let k = 0; k < 16; k++) {
      const y0 = i * ph + ph * (0.05 + 0.9 * r());
      const amp = ph * (0.02 + r() * 0.05);
      const freq = 1.2 + r() * 2.4;
      const phase = r() * 6.28;
      ctx.strokeStyle = `rgba(${r() > 0.5 ? "96,62,34" : "120,82,48"},${0.08 + r() * 0.12})`;
      ctx.beginPath();
      for (let x = 0; x <= w; x += w / 24) {
        const y = y0 + Math.sin((x / w) * freq * 6.28 + phase) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Seam.
    if (i > 0) {
      ctx.fillStyle = "rgba(70,44,22,0.45)";
      ctx.fillRect(0, i * ph - 1, w, Math.max(1, m * 0.003));
      ctx.fillStyle = "rgba(255,240,215,0.25)";
      ctx.fillRect(0, i * ph + Math.max(1, m * 0.003) - 1, w, 1);
    }
  }

  // Morning light from the top left.
  const light = ctx.createRadialGradient(w * 0.1, h * 0.05, 0, w * 0.1, h * 0.05, Math.hypot(w, h) * 0.85);
  light.addColorStop(0, "rgba(255,244,222,0.42)");
  light.addColorStop(0.5, "rgba(255,240,215,0.1)");
  light.addColorStop(1, "rgba(40,22,10,0.18)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, w, h);

  // Old cup rings on the wood.
  ctx.lineCap = "round";
  for (const [cx, cy, rr, a0] of [
    [0.84, 0.16, 0.11, 0.4],
    [0.14, 0.84, 0.09, 2.2],
    [0.2, 0.8, 0.085, 4.1],
  ] as const) {
    ctx.strokeStyle = "rgba(111,67,34,0.22)";
    ctx.lineWidth = Math.max(1, m * 0.006);
    ctx.beginPath();
    ctx.arc(w * cx, h * cy, m * rr, a0, a0 + 4.6);
    ctx.stroke();
    ctx.strokeStyle = "rgba(111,67,34,0.1)";
    ctx.lineWidth = Math.max(1, m * 0.012);
    ctx.beginPath();
    ctx.arc(w * cx, h * cy, m * rr * 0.97, a0 + 0.6, a0 + 2.4);
    ctx.stroke();
  }

  // Linen napkin, folded, under the espresso.
  ctx.save();
  ctx.translate(w * 0.26, h * 0.27);
  ctx.rotate(-0.22);
  const nw = m * 0.36;
  const nh = m * 0.3;
  softShadow(ctx, m * 0.02, m * 0.03, nw * 0.62, nh * 0.6, "60,35,15", 0.3);
  const ng = ctx.createLinearGradient(-nw / 2, -nh / 2, nw / 2, nh / 2);
  ng.addColorStop(0, "#f6f1e8");
  ng.addColorStop(1, "#e7dfd1");
  ctx.fillStyle = ng;
  ctx.fillRect(-nw / 2, -nh / 2, nw, nh);
  ctx.strokeStyle = "rgba(120,100,80,0.18)";
  ctx.lineWidth = Math.max(1, m * 0.003);
  ctx.beginPath();
  ctx.moveTo(-nw / 2, nh * 0.1);
  ctx.lineTo(nw / 2, nh * 0.1);
  ctx.stroke();
  ctx.restore();

  const cup = (cx: number, cy: number, sr: number, cr: number, coffee: number, art: boolean, handleAng: number) => {
    // Saucer.
    softShadow(ctx, cx + sr * 0.12, cy + sr * 0.16, sr * 1.12, sr * 1.08, "55,32,14", 0.42);
    const sg = ctx.createRadialGradient(cx - sr * 0.4, cy - sr * 0.45, sr * 0.1, cx, cy, sr);
    sg.addColorStop(0, "#fbf8f2");
    sg.addColorStop(0.75, "#efe8dc");
    sg.addColorStop(1, "#ddd2c1");
    ctx.fillStyle = sg;
    ellipse(ctx, cx, cy, sr, sr);
    ctx.fill();
    ctx.strokeStyle = "rgba(90,70,50,0.12)";
    ctx.lineWidth = Math.max(1, sr * 0.012);
    ellipse(ctx, cx, cy, sr * 0.7, sr * 0.7);
    ctx.stroke();
    // Handle.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(handleAng);
    softShadow(ctx, cr * 1.25, cr * 0.12, cr * 0.42, cr * 0.2, "55,32,14", 0.3);
    const hg = ctx.createLinearGradient(cr * 0.8, -cr * 0.14, cr * 0.8, cr * 0.14);
    hg.addColorStop(0, "#fbf8f2");
    hg.addColorStop(1, "#e2d8c8");
    ctx.fillStyle = hg;
    roundRectPath(ctx, cr * 0.82, -cr * 0.13, cr * 0.55, cr * 0.26, cr * 0.13);
    ctx.fill();
    ctx.restore();
    // Cup body.
    softShadow(ctx, cx + cr * 0.12, cy + cr * 0.16, cr * 1.08, cr * 1.04, "55,32,14", 0.35);
    const cg = ctx.createRadialGradient(cx - cr * 0.4, cy - cr * 0.45, cr * 0.1, cx, cy, cr);
    cg.addColorStop(0, "#fffdf8");
    cg.addColorStop(0.8, "#f1ebe0");
    cg.addColorStop(1, "#d9cdb9");
    ctx.fillStyle = cg;
    ellipse(ctx, cx, cy, cr, cr);
    ctx.fill();
    // Coffee.
    const cf = ctx.createRadialGradient(cx - coffee * 0.25, cy - coffee * 0.3, coffee * 0.05, cx, cy, coffee);
    cf.addColorStop(0, art ? "#8a5a33" : "#6b3f1f");
    cf.addColorStop(0.7, art ? "#6e4423" : "#4a2911");
    cf.addColorStop(1, "#3b1f0c");
    ctx.fillStyle = cf;
    ellipse(ctx, cx, cy, coffee, coffee);
    ctx.fill();
    ctx.strokeStyle = "rgba(186,134,86,0.55)";
    ctx.lineWidth = Math.max(1, coffee * 0.06);
    ellipse(ctx, cx, cy, coffee * 0.94, coffee * 0.94);
    ctx.stroke();
    if (art) {
      // A poured heart with two ripples above it.
      ctx.save();
      ctx.translate(cx + coffee * 0.04, cy + coffee * 0.06);
      ctx.rotate(-0.25);
      ctx.fillStyle = "rgba(240,222,198,0.92)";
      const s = coffee * 0.5;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.75);
      ctx.bezierCurveTo(-s * 1.1, s * 0.05, -s * 0.85, -s * 0.85, 0, -s * 0.38);
      ctx.bezierCurveTo(s * 0.85, -s * 0.85, s * 1.1, s * 0.05, 0, s * 0.75);
      ctx.fill();
      ctx.strokeStyle = "rgba(240,222,198,0.55)";
      ctx.lineWidth = Math.max(1, coffee * 0.07);
      for (const k of [0.62, 0.8]) {
        ctx.beginPath();
        ctx.arc(0, s * 0.1, coffee * k, Math.PI * 1.18, Math.PI * 1.82);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // Crema speckle.
      ctx.fillStyle = "rgba(196,140,86,0.35)";
      ellipse(ctx, cx - coffee * 0.2, cy - coffee * 0.2, coffee * 0.42, coffee * 0.36, 0.6);
      ctx.fill();
    }
    // Rim highlight.
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = Math.max(1, cr * 0.03);
    ctx.beginPath();
    ctx.arc(cx, cy, cr * 0.96, Math.PI * 1.05, Math.PI * 1.55);
    ctx.stroke();
  };

  // Espresso on the napkin, flat white at the centre.
  cup(w * 0.26, h * 0.27, m * 0.12, m * 0.075, m * 0.056, false, 0.5);
  const bx = w * 0.6;
  const by = h * 0.6;
  cup(bx, by, m * 0.26, m * 0.165, m * 0.135, true, 0.75);

  // Teaspoon resting on the saucer.
  ctx.save();
  ctx.translate(bx + m * 0.155, by - m * 0.16);
  ctx.rotate(1.05);
  softShadow(ctx, m * 0.012, m * 0.014, m * 0.08, m * 0.02, "55,32,14", 0.3);
  const steel = ctx.createLinearGradient(0, -m * 0.02, 0, m * 0.02);
  steel.addColorStop(0, "#e9e7e2");
  steel.addColorStop(0.5, "#b9b5ac");
  steel.addColorStop(1, "#d8d5ce");
  ctx.fillStyle = steel;
  ellipse(ctx, 0, 0, m * 0.032, m * 0.021);
  ctx.fill();
  roundRectPath(ctx, m * 0.026, -m * 0.006, m * 0.13, m * 0.012, m * 0.006);
  ctx.fill();
  ctx.restore();

  // Two sugar cubes.
  for (const [sx, sy, rot] of [
    [0.47, 0.17, 0.3],
    [0.515, 0.2, -0.2],
  ] as const) {
    ctx.save();
    ctx.translate(w * sx, h * sy);
    ctx.rotate(rot);
    const s = m * 0.04;
    softShadow(ctx, s * 0.25, s * 0.35, s * 0.8, s * 0.7, "55,32,14", 0.35);
    const sg = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
    sg.addColorStop(0, "#fffefb");
    sg.addColorStop(1, "#e9e3d8");
    ctx.fillStyle = sg;
    roundRectPath(ctx, -s / 2, -s / 2, s, s, s * 0.12);
    ctx.fill();
    ctx.restore();
  }

  vignette(ctx, w, h, "45,25,10", 0.28);
  grain(ctx, w, h, 0.09);
}

// ── studio: prints hung on a seamless backdrop ─────────────────────────────

type Frame = {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "landscape" | "still" | "stairs" | "dusk";
  style: "black" | "mat" | "bare";
};

function paintPrint(ctx: C2D, kind: Frame["kind"], x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (kind === "landscape") {
    const sky = ctx.createLinearGradient(0, y, 0, y + h);
    sky.addColorStop(0, "#8d9db2");
    sky.addColorStop(0.55, "#dfe3e8");
    sky.addColorStop(1, "#c3cad3");
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(250,247,240,0.85)";
    ellipse(ctx, x + w * 0.7, y + h * 0.36, h * 0.08, h * 0.08);
    ctx.fill();
    const hills = [
      ["#7a8aa0", 0.56, 0.05],
      ["#4b5d75", 0.66, 0.08],
      ["#34465f", 0.78, 0.06],
    ] as const;
    for (const [c, base, amp] of hills) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      for (let i = 0; i <= 12; i++) {
        const px = x + (w * i) / 12;
        const py = y + h * (base - amp * Math.sin(i * 0.9 + base * 10) - amp * 0.5 * Math.sin(i * 2.3));
        ctx.lineTo(px, py);
      }
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
      ctx.fill();
    }
  } else if (kind === "still") {
    const bg = ctx.createLinearGradient(x, y, x, y + h);
    bg.addColorStop(0, "#cfd4db");
    bg.addColorStop(0.68, "#b9c0ca");
    bg.addColorStop(0.68, "#a7afba");
    bg.addColorStop(1, "#949dab");
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    // Tall vase.
    const vx = x + w * 0.3;
    const vw = w * 0.24;
    const vt = y + h * 0.28;
    const vb = y + h * 0.72;
    softShadow(ctx, vx + vw * 0.9, vb, vw * 0.9, h * 0.03, "20,24,30", 0.4);
    const vg = ctx.createLinearGradient(vx, 0, vx + vw, 0);
    vg.addColorStop(0, "#4a5d78");
    vg.addColorStop(0.35, "#34465f");
    vg.addColorStop(1, "#1f2a3a");
    ctx.fillStyle = vg;
    roundRectPath(ctx, vx, vt, vw, vb - vt, vw * 0.18);
    ctx.fill();
    // Sphere.
    const sx = x + w * 0.68;
    const sr = w * 0.13;
    const sy = vb - sr;
    softShadow(ctx, sx + sr * 0.4, vb, sr * 1.2, h * 0.025, "20,24,30", 0.45);
    const sg = ctx.createRadialGradient(sx - sr * 0.4, sy - sr * 0.4, sr * 0.1, sx, sy, sr);
    sg.addColorStop(0, "#f6f7f8");
    sg.addColorStop(0.7, "#c9ced6");
    sg.addColorStop(1, "#8e97a5");
    ctx.fillStyle = sg;
    ellipse(ctx, sx, sy, sr, sr);
    ctx.fill();
  } else if (kind === "stairs") {
    ctx.fillStyle = "#23272e";
    ctx.fillRect(x, y, w, h);
    const steps = 7;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      ctx.fillStyle = `rgba(233,234,236,${0.18 + t * 0.5})`;
      ctx.fillRect(x + w * t, y + h * (1 - t) - h / steps, w * (1 - t), h / steps - Math.max(1, h * 0.012));
    }
    const lg = ctx.createLinearGradient(x, y, x + w, y + h);
    lg.addColorStop(0, "rgba(255,255,255,0.12)");
    lg.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = lg;
    ctx.fillRect(x, y, w, h);
  } else {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, "#3a4a63");
    g.addColorStop(0.6, "#8b97a8");
    g.addColorStop(1, "#d9dce1");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "rgba(255,250,240,0.8)";
    ellipse(ctx, x + w * 0.5, y + h * 0.62, w * 0.12, w * 0.12);
    ctx.fill();
    ctx.fillStyle = "#1f2733";
    ctx.fillRect(x, y + h * 0.78, w, h * 0.22);
  }
  ctx.restore();
}

function paintStudio(ctx: C2D, w: number, h: number) {
  // Seamless paper backdrop with a soft floor curve.
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#c9ced5");
  bg.addColorStop(0.7, "#d9dce1");
  bg.addColorStop(0.86, "#e2e4e8");
  bg.addColorStop(1, "#cdd1d7");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const key = ctx.createRadialGradient(w * 0.78, -h * 0.3, 0, w * 0.78, -h * 0.3, Math.hypot(w, h) * 0.75);
  key.addColorStop(0, "rgba(255,255,255,0.55)");
  key.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = key;
  ctx.fillRect(0, 0, w, h);

  const wide = w / h > 1.8;
  const frames: Frame[] = wide
    ? [
        { x: 0.07, y: 0.17, w: 0.25, h: 0.6, kind: "landscape", style: "mat" },
        { x: 0.37, y: 0.1, w: 0.14, h: 0.7, kind: "still", style: "bare" },
        { x: 0.56, y: 0.28, w: 0.13, h: 0.52, kind: "stairs", style: "black" },
        { x: 0.75, y: 0.14, w: 0.17, h: 0.48, kind: "dusk", style: "mat" },
      ]
    : [
        { x: 0.07, y: 0.08, w: 0.52, h: 0.4, kind: "landscape", style: "mat" },
        { x: 0.65, y: 0.13, w: 0.28, h: 0.5, kind: "still", style: "bare" },
        { x: 0.12, y: 0.56, w: 0.3, h: 0.32, kind: "stairs", style: "black" },
        { x: 0.48, y: 0.7, w: 0.24, h: 0.2, kind: "dusk", style: "mat" },
      ];

  for (const f of frames) {
    const x = f.x * w;
    const y = f.y * h;
    const fw = f.w * w;
    const fh = f.h * h;
    // Cast shadow, offset down-left from the key light.
    softShadow(ctx, x + fw * 0.46, y + fh * 0.56, fw * 0.62, fh * 0.6, "20,24,30", 0.28);
    if (f.style === "black") {
      ctx.fillStyle = "#16181d";
      ctx.fillRect(x, y, fw, fh);
      const b = Math.max(2, Math.min(fw, fh) * 0.045);
      ctx.fillStyle = "#f2f3f4";
      ctx.fillRect(x + b, y + b, fw - 2 * b, fh - 2 * b);
      const mat = Math.min(fw, fh) * 0.1;
      paintPrint(ctx, f.kind, x + b + mat, y + b + mat, fw - 2 * (b + mat), fh - 2 * (b + mat));
    } else if (f.style === "mat") {
      ctx.fillStyle = "#f4f4f2";
      ctx.fillRect(x, y, fw, fh);
      ctx.strokeStyle = "rgba(22,24,29,0.22)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, fw - 1, fh - 1);
      const mat = Math.min(fw, fh) * 0.09;
      paintPrint(ctx, f.kind, x + mat, y + mat, fw - 2 * mat, fh - 2 * mat);
    } else {
      paintPrint(ctx, f.kind, x, y, fw, fh);
    }
  }

  // Floor shadow line where wall meets floor.
  const floor = ctx.createLinearGradient(0, h * 0.86, 0, h);
  floor.addColorStop(0, "rgba(22,24,29,0)");
  floor.addColorStop(1, "rgba(22,24,29,0.08)");
  ctx.fillStyle = floor;
  ctx.fillRect(0, h * 0.86, w, h * 0.14);
  grain(ctx, w, h, 0.06);
}

// ── trades: a technical drawing on a green board ──────────────────────────

function paintTrades(ctx: C2D, w: number, h: number) {
  const m = Math.min(w, h);
  const board = ctx.createRadialGradient(w * 0.45, h * 0.4, 0, w * 0.5, h * 0.5, Math.hypot(w, h) * 0.7);
  board.addColorStop(0, "#2c5a4d");
  board.addColorStop(1, "#21463c");
  ctx.fillStyle = board;
  ctx.fillRect(0, 0, w, h);

  // Grid.
  const cell = m / 22;
  ctx.lineWidth = 1;
  for (let i = 0, x = 0; x <= w; i++, x += cell) {
    ctx.strokeStyle = i % 4 === 0 ? "rgba(226,236,230,0.13)" : "rgba(226,236,230,0.055)";
    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, h);
    ctx.stroke();
  }
  for (let i = 0, y = 0; y <= h; i++, y += cell) {
    ctx.strokeStyle = i % 4 === 0 ? "rgba(226,236,230,0.13)" : "rgba(226,236,230,0.055)";
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(w, Math.round(y) + 0.5);
    ctx.stroke();
  }

  const ink = "rgba(236,242,238,0.92)";
  const faint = "rgba(236,242,238,0.38)";
  const lw = Math.max(1, m * 0.0055);

  // Sheet border.
  const pad = m * 0.05;
  ctx.strokeStyle = "rgba(236,242,238,0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(pad + 0.5, pad + 0.5, w - 2 * pad - 1, h - 2 * pad - 1);

  // Elevation: house with a single-storey extension.
  const gx0 = w * 0.12;
  const gx1 = w * 0.88;
  const gy = h * 0.7;
  const hx0 = w * 0.18;
  const hx1 = w * 0.56;
  const eaves = h * 0.38;
  const ridge = h * 0.17;
  const ex1 = w * 0.8;
  const ey = h * 0.5;

  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Brick coursing (faint).
  ctx.strokeStyle = "rgba(236,242,238,0.12)";
  ctx.lineWidth = 1;
  for (let y = eaves + cell; y < gy; y += cell * 0.5) {
    ctx.beginPath();
    ctx.moveTo(hx0, y);
    ctx.lineTo(hx1, y);
    ctx.stroke();
  }

  ctx.strokeStyle = ink;
  ctx.lineWidth = lw;
  // Main walls + roof.
  ctx.beginPath();
  ctx.moveTo(hx0, gy);
  ctx.lineTo(hx0, eaves);
  ctx.lineTo(hx1, eaves);
  ctx.lineTo(hx1, gy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hx0 - w * 0.035, eaves + h * 0.012);
  ctx.lineTo((hx0 + hx1) / 2, ridge);
  ctx.lineTo(hx1 + w * 0.035, eaves + h * 0.012);
  ctx.stroke();
  // Chimney.
  ctx.beginPath();
  ctx.moveTo(hx1 - w * 0.1, ridge + h * 0.08);
  ctx.lineTo(hx1 - w * 0.1, ridge - h * 0.005);
  ctx.lineTo(hx1 - w * 0.06, ridge - h * 0.005);
  ctx.lineTo(hx1 - w * 0.06, ridge + h * 0.115);
  ctx.stroke();
  // Extension with parapet and rooflight.
  ctx.beginPath();
  ctx.moveTo(hx1, ey);
  ctx.lineTo(ex1, ey);
  ctx.lineTo(ex1, gy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hx1, ey + h * 0.025);
  ctx.lineTo(ex1, ey + h * 0.025);
  ctx.strokeStyle = faint;
  ctx.stroke();
  ctx.strokeStyle = ink;
  ctx.strokeRect(hx1 + (ex1 - hx1) * 0.32, ey - h * 0.035, (ex1 - hx1) * 0.36, h * 0.035);

  // Windows with glazing bars.
  const win = (x: number, y: number, ww: number, wh: number) => {
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    ctx.strokeRect(x, y, ww, wh);
    ctx.lineWidth = Math.max(1, lw * 0.6);
    ctx.strokeStyle = faint;
    ctx.beginPath();
    ctx.moveTo(x + ww / 2, y);
    ctx.lineTo(x + ww / 2, y + wh);
    ctx.moveTo(x, y + wh * 0.4);
    ctx.lineTo(x + ww, y + wh * 0.4);
    ctx.stroke();
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x - ww * 0.08, y + wh);
    ctx.lineTo(x + ww * 1.08, y + wh);
    ctx.stroke();
  };
  const ww = (hx1 - hx0) * 0.22;
  win(hx0 + (hx1 - hx0) * 0.14, eaves + h * 0.055, ww, h * 0.11);
  win(hx1 - (hx1 - hx0) * 0.14 - ww, eaves + h * 0.055, ww, h * 0.11);
  // Front door.
  const dx = hx0 + (hx1 - hx0) * 0.42;
  ctx.strokeRect(dx, gy - h * 0.15, (hx1 - hx0) * 0.16, h * 0.15);
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(dx + (hx1 - hx0) * 0.13, gy - h * 0.075, Math.max(1, lw * 0.9), 0, Math.PI * 2);
  ctx.fill();
  // Bifold doors in the extension.
  const bx0 = hx1 + (ex1 - hx1) * 0.14;
  const bx1 = ex1 - (ex1 - hx1) * 0.14;
  ctx.strokeRect(bx0, ey + h * 0.05, bx1 - bx0, gy - ey - h * 0.05);
  ctx.strokeStyle = faint;
  for (let i = 1; i < 3; i++) {
    const x = bx0 + ((bx1 - bx0) * i) / 3;
    ctx.beginPath();
    ctx.moveTo(x, ey + h * 0.05);
    ctx.lineTo(x, gy);
    ctx.stroke();
  }

  // Ground line + hatch.
  ctx.strokeStyle = ink;
  ctx.lineWidth = lw * 1.3;
  ctx.beginPath();
  ctx.moveTo(gx0, gy);
  ctx.lineTo(gx1, gy);
  ctx.stroke();
  ctx.strokeStyle = "rgba(236,242,238,0.3)";
  ctx.lineWidth = 1;
  for (let x = gx0; x < gx1; x += cell * 0.6) {
    ctx.beginPath();
    ctx.moveTo(x, gy + 2);
    ctx.lineTo(x - cell * 0.5, gy + cell * 0.55);
    ctx.stroke();
  }

  // Dimension lines.
  const dim = (x0: number, y0: number, x1: number, y1: number, label: string, vertical: boolean) => {
    ctx.strokeStyle = "rgba(236,242,238,0.75)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    const t = cell * 0.35;
    for (const [px, py] of [
      [x0, y0],
      [x1, y1],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(px - t, py + t);
      ctx.lineTo(px + t, py - t);
      ctx.stroke();
      ctx.beginPath();
      if (vertical) {
        ctx.moveTo(px - t * 1.6, py);
        ctx.lineTo(px + t * 1.6, py);
      } else {
        ctx.moveTo(px, py - t * 1.6);
        ctx.lineTo(px, py + t * 1.6);
      }
      ctx.stroke();
    }
    ctx.save();
    ctx.fillStyle = "rgba(236,242,238,0.85)";
    ctx.font = fontString("mono", 400, Math.max(6, m * 0.036));
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    if (vertical) {
      ctx.translate((x0 + x1) / 2 - cell * 0.25, (y0 + y1) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(label, 0, 0);
    } else {
      ctx.fillText(label, (x0 + x1) / 2, y0 - cell * 0.2);
    }
    ctx.restore();
  };
  dim(hx0, gy + cell * 1.6, ex1, gy + cell * 1.6, "7 200", false);
  dim(hx0, gy + cell * 2.9, hx1, gy + cell * 2.9, "4 800", false);
  dim(ex1 + cell * 1.1, ey, ex1 + cell * 1.1, gy, "2 700", true);

  // Title block.
  const tbw = w * 0.3;
  const tbh = h * 0.1;
  const tbx = w - pad - tbw;
  const tby = pad;
  ctx.strokeStyle = "rgba(236,242,238,0.4)";
  ctx.strokeRect(tbx + 0.5, tby + 0.5, tbw, tbh);
  ctx.fillStyle = "rgba(236,242,238,0.8)";
  ctx.font = fontString("mono", 400, Math.max(6, m * 0.032));
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Elevation A", tbx + tbw * 0.08, tby + tbh * 0.34);
  ctx.fillStyle = "rgba(236,242,238,0.55)";
  ctx.fillText("Scale 1:50", tbx + tbw * 0.08, tby + tbh * 0.72);

  grain(ctx, w, h, 0.05);
}

// ── cache ──────────────────────────────────────────────────────────────────

const cache = new Map<string, HTMLCanvasElement>();

/**
 * Draws the sector image into (x, y, w, h) of ctx. Rendered once per device
 * pixel size and reused.
 */
export function drawSectorImage(
  ctx: C2D,
  sector: SketchSector,
  layout: SketchLayoutKind,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  if (typeof document === "undefined") return;
  const t = ctx.getTransform();
  const scaleX = Math.hypot(t.a, t.b) || 1;
  const scaleY = Math.hypot(t.c, t.d) || 1;
  const pw = Math.max(2, Math.round(w * scaleX));
  const ph = Math.max(2, Math.round(h * scaleY));
  const key = `${sector}:${layout}:${pw}x${ph}:${fontGeneration()}`;
  let img = cache.get(key);
  if (!img) {
    img = document.createElement("canvas");
    img.width = pw;
    img.height = ph;
    const c = img.getContext("2d");
    if (!c) return;
    if (sector === "salon") paintSalon(c, pw, ph, layout);
    else if (sector === "cafe") paintCafe(c, pw, ph);
    else if (sector === "studio") paintStudio(c, pw, ph);
    else paintTrades(c, pw, ph);
    if (cache.size > 24) {
      const first = cache.keys().next().value;
      if (first !== undefined) cache.delete(first);
    }
    cache.set(key, img);
  }
  ctx.drawImage(img, x, y, w, h);
}
