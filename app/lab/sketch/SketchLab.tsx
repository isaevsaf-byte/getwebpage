"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  drawSketch,
  drawSketchAtlas,
  ensureSketchFonts,
  getSketchLayout,
  sketchToHtml,
  SECTORS,
  type SketchInput,
  type SketchLayoutKind,
  type SketchSector,
  type SketchStage,
} from "@/lib/showcase/sketch";

const SECTOR_IDS: SketchSector[] = ["salon", "cafe", "studio", "trades"];
const STAGES: SketchStage[] = [0, 1, 2, 3, 4];
const STRESS = [
  "Ye Olde King's Head Gastropub & Rooms",
  "Q",
  "Студия Ольги",
  "Bella Hair",
  "🌸💇‍♀️✨",
  "",
];
const SIZE: Record<SketchLayoutKind, { w: number; h: number }> = {
  desktop: { w: 1024, h: 640 },
  mobile: { w: 512, h: 1108 },
};

/** Mirrors the visitor store's slug rule, for realistic domains. */
function domainOf(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 24);
  return `${slug.length >= 2 ? slug : "yourbusiness"}.co.uk`;
}

interface Item {
  id: string;
  label: string;
  input: SketchInput;
  w: number;
  h: number;
  /** CSS width in px. */
  cssW: number;
  showBlocks?: boolean;
}

function inputFor(name: string, sector: SketchSector, layout: SketchLayoutKind, stage: SketchStage, progress?: number): SketchInput {
  return { name, display: name, domain: domainOf(name), sector, layout, stage, progress };
}

interface PerfRow {
  label: string;
  mean: number;
  p95: number;
  max: number;
}

function bench(label: string, n: number, fn: (i: number) => void): PerfRow {
  for (let i = 0; i < 6; i++) fn(i);
  const t: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = performance.now();
    fn(i);
    t.push(performance.now() - a);
  }
  t.sort((a, b) => a - b);
  const mean = t.reduce((a, b) => a + b, 0) / t.length;
  return { label, mean, p95: t[Math.floor(t.length * 0.95)], max: t[t.length - 1] };
}

function runPerf(name: string): PerfRow[] {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 640;
  const ctx = c.getContext("2d")!;
  const rows: PerfRow[] = [];
  for (const sector of SECTOR_IDS) {
    for (const stage of STAGES) {
      rows.push(
        bench(`${sector} · stage ${stage} · 1024×640`, 60, () =>
          drawSketch(ctx, 1024, 640, inputFor(name, sector, "desktop", stage)),
        ),
      );
    }
  }
  // Typing: a new name every frame (no fit cache hits).
  const typed = "Ye Olde King's Head Gastropub & Rooms";
  for (const sector of SECTOR_IDS) {
    rows.push(
      bench(`${sector} · stage 3 · typing (cache miss)`, 36, (i) =>
        drawSketch(ctx, 1024, 640, inputFor(typed.slice(0, 2 + (i % 35)) + " ".repeat(Math.floor(i / 35)), sector, "desktop", 3)),
      ),
    );
  }
  // With a GPU flush, to include raster time.
  rows.push(
    bench(`salon · stage 3 · with flush`, 30, () => {
      drawSketch(ctx, 1024, 640, inputFor(name, "salon", "desktop", 3));
      ctx.getImageData(0, 0, 1, 1);
    }),
  );
  const atlas = document.createElement("canvas");
  rows.push(bench(`atlas · desktop 2048×1280`, 12, () => drawSketchAtlas(atlas, inputFor(name, "salon", "desktop", 1))));
  rows.push(bench(`atlas · mobile 1024×2216`, 12, () => drawSketchAtlas(atlas, inputFor(name, "cafe", "mobile", 1))));
  return rows;
}

function SketchCanvas({ item, ready }: { item: Item; ready: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ready) return;
    const c = ref.current;
    if (!c) return;
    c.width = item.w;
    c.height = item.h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    drawSketch(ctx, item.w, item.h, item.input);
    if (item.showBlocks) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,0,90,0.9)";
      ctx.lineWidth = 1;
      ctx.font = "11px monospace";
      ctx.fillStyle = "rgba(255,0,90,0.95)";
      for (const b of getSketchLayout(item.input.sector, item.input.layout)) {
        ctx.strokeRect(b.x * item.w + 0.5, b.y * item.h + 0.5, b.w * item.w - 1, b.h * item.h - 1);
        ctx.fillText(b.id, b.x * item.w + 3, b.y * item.h + 11);
      }
      ctx.restore();
    }
  }, [item, ready]);
  return (
    <figure style={{ margin: 0 }}>
      <canvas
        ref={ref}
        data-dump={item.id}
        style={{ width: item.cssW, height: (item.cssW * item.h) / item.w, display: "block", borderRadius: 6, boxShadow: "0 1px 0 rgba(255,255,255,.06), 0 8px 24px rgba(0,0,0,.35)" }}
      />
      <figcaption style={{ font: "12px/1.4 var(--font-mono), monospace", color: "#9aa19d", marginTop: 6 }}>{item.label}</figcaption>
    </figure>
  );
}

export default function SketchLab({ initialName, view, sector }: { initialName: string; view: string; sector?: string }) {
  const [name, setName] = useState(initialName);
  const [progress, setProgress] = useState(1);
  const [ready, setReady] = useState(0);
  const [perf, setPerf] = useState<PerfRow[] | null>(null);
  const atlasRef = useRef<HTMLCanvasElement>(null);
  const atlasMobileRef = useRef<HTMLCanvasElement>(null);
  const sectors = useMemo<SketchSector[]>(
    () => (sector && sector in SECTORS ? [sector as SketchSector] : SECTOR_IDS),
    [sector],
  );

  useEffect(() => {
    let live = true;
    ensureSketchFonts([name, ...STRESS].join(" ")).then(() => {
      if (live) setReady((r) => r + 1);
    });
    return () => {
      live = false;
    };
  }, [name]);

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    if (view === "grid" || view === "all") {
      for (const s of sectors) {
        for (const layout of ["desktop", "mobile"] as const) {
          for (const stage of STAGES) {
            const { w, h } = SIZE[layout];
            out.push({
              id: `${s}-${layout}-s${stage}`,
              label: `${s} · ${layout} · stage ${stage}`,
              input: inputFor(name, s, layout, stage, stage === 0 || stage === 4 ? progress : undefined),
              w,
              h,
              cssW: layout === "desktop" ? 512 : 180,
            });
          }
        }
      }
    }
    if (view === "stress" || view === "all") {
      for (const n of STRESS) {
        for (const s of sectors) {
          for (const layout of ["desktop", "mobile"] as const) {
            const { w, h } = SIZE[layout];
            const tag = n === "" ? "empty" : n.startsWith("Ye") ? "long" : n === "Q" ? "q" : n.startsWith("С") ? "cyrillic" : n.startsWith("Bella") ? "bella" : "emoji";
            out.push({
              id: `stress-${tag}-${s}-${layout}`,
              label: `“${n}” · ${s} · ${layout}`,
              input: inputFor(n, s, layout, 4),
              w,
              h,
              cssW: layout === "desktop" ? 512 : 180,
            });
          }
        }
      }
    }
    if (view === "blocks" || view === "all") {
      for (const s of sectors) {
        for (const layout of ["desktop", "mobile"] as const) {
          const { w, h } = SIZE[layout];
          out.push({
            id: `blocks-${s}-${layout}`,
            label: `${s} · ${layout} · stage 3 with block rects`,
            input: inputFor(name, s, layout, 3),
            w,
            h,
            cssW: layout === "desktop" ? 512 : 180,
            showBlocks: true,
          });
        }
      }
    }
    if (view === "sizes" || view === "all") {
      for (const s of sectors) {
        for (const [w, h] of [
          [320, 200],
          [640, 400],
          [780, 488],
        ] as const) {
          out.push({ id: `size-${s}-${w}`, label: `${s} · ${w}×${h} · stage 4`, input: inputFor(name, s, "desktop", 4), w, h, cssW: w / 2 });
        }
      }
    }
    return out;
  }, [name, progress, view, sectors]);

  useEffect(() => {
    if (!ready) return;
    if (atlasRef.current) drawSketchAtlas(atlasRef.current, inputFor(name, sectors[0], "desktop", 1));
    if (atlasMobileRef.current) drawSketchAtlas(atlasMobileRef.current, inputFor(name, sectors[0], "mobile", 1));
  }, [ready, name, sectors]);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__sketchDump = () =>
      Array.from(document.querySelectorAll<HTMLCanvasElement>("canvas[data-dump]")).map((c) => ({
        id: c.dataset.dump,
        url: c.toDataURL("image/png"),
      }));
    w.__sketchReady = ready > 0;
    w.__sketchPerf = perf;
  }, [ready, perf]);

  return (
    <main style={{ minHeight: "100svh", background: "#14181a", color: "#e3e6e0", padding: "32px 24px 96px" }}>
      <div style={{ maxWidth: 1600, margin: "0 auto" }}>
        <h1 style={{ font: "560 28px/1.1 var(--font-display), Georgia, serif", margin: "0 0 4px" }}>Sketch lab</h1>
        <p style={{ font: "13px/1.5 var(--font-mono), monospace", color: "#9aa19d", margin: "0 0 20px" }}>
          Dev only. Views: <a href="?view=grid" style={{ color: "#cf8794" }}>grid</a> · <a href="?view=stress" style={{ color: "#cf8794" }}>stress</a> ·{" "}
          <a href="?view=blocks" style={{ color: "#cf8794" }}>blocks</a> · <a href="?view=sizes" style={{ color: "#cf8794" }}>sizes</a> ·{" "}
          <a href="?view=atlas" style={{ color: "#cf8794" }}>atlas</a> · <a href="?view=perf" style={{ color: "#cf8794" }}>perf</a>
        </p>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 28 }}>
          <label style={{ font: "13px var(--font-mono), monospace", color: "#c0c6c2" }}>
            Name{" "}
            <input
              value={name}
              maxLength={60}
              onChange={(ev) => setName(ev.target.value)}
              style={{ font: "16px var(--font-sans), sans-serif", padding: "8px 10px", width: 340, background: "#1b2023", color: "#e3e6e0", border: "1px solid #3a4245", borderRadius: 4 }}
            />
          </label>
          <label style={{ font: "13px var(--font-mono), monospace", color: "#c0c6c2" }}>
            Typing progress (stages 0 and 4){" "}
            <input type="range" min={0} max={1} step={0.01} value={progress} onChange={(ev) => setProgress(Number(ev.target.value))} />
          </label>
          <button
            type="button"
            onClick={() => setPerf(runPerf(name))}
            style={{ font: "500 14px var(--font-sans), sans-serif", padding: "9px 14px", background: "#7d2436", color: "#eaece7", border: 0, borderRadius: 2, cursor: "pointer" }}
          >
            Run draw benchmark
          </button>
        </div>

        {(view === "perf" || perf) && <PerfTable rows={perf} onRun={() => setPerf(runPerf(name))} auto={view === "perf"} />}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
          {items.map((it) => (
            <SketchCanvas key={it.id} item={it} ready={ready} />
          ))}
        </div>

        {(view === "atlas" || view === "all") && (
          <section style={{ marginTop: 32 }}>
            <h2 style={{ font: "500 18px var(--font-sans)", margin: "0 0 12px" }}>Atlas (stages 1–4)</h2>
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
              <canvas ref={atlasRef} data-dump={`atlas-desktop-${sectors[0]}`} style={{ width: 1024, maxWidth: "100%" }} />
              <canvas ref={atlasMobileRef} data-dump={`atlas-mobile-${sectors[0]}`} style={{ width: 360 }} />
            </div>
          </section>
        )}

        <section style={{ marginTop: 32 }}>
          <h2 style={{ font: "500 18px var(--font-sans)", margin: "0 0 12px" }}>sketchToHtml</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(460px, 1fr))", gap: 16 }}>
            {sectors.map((s) => (
              <pre key={s} style={{ font: "12px/1.6 var(--font-mono), monospace", color: "#c0c6c2", background: "#1b2023", padding: 16, borderRadius: 6, overflow: "auto", margin: 0 }}>
                {sketchToHtml(name, s)}
              </pre>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function PerfTable({ rows, onRun, auto }: { rows: PerfRow[] | null; onRun: () => void; auto: boolean }) {
  const ran = useRef(false);
  useEffect(() => {
    if (auto && !rows && !ran.current) {
      ran.current = true;
      const t = setTimeout(onRun, 600);
      return () => clearTimeout(t);
    }
  }, [auto, rows, onRun]);
  if (!rows) return <p style={{ font: "13px var(--font-mono), monospace", color: "#9aa19d" }}>Benchmark running…</p>;
  return (
    <table id="perf" style={{ font: "12px/1.6 var(--font-mono), monospace", color: "#c0c6c2", borderCollapse: "collapse", marginBottom: 28 }}>
      <thead>
        <tr>
          {["case", "mean ms", "p95 ms", "max ms"].map((h) => (
            <th key={h} style={{ textAlign: "left", padding: "4px 16px 4px 0", color: "#9aa19d", fontWeight: 400 }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <td style={{ padding: "2px 16px 2px 0" }}>{r.label}</td>
            <td style={{ color: r.mean < 4 ? "#9fd3b4" : "#cf8794" }}>{r.mean.toFixed(2)}</td>
            <td>{r.p95.toFixed(2)}</td>
            <td>{r.max.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
