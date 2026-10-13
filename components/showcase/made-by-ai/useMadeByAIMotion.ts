"use client";

import type { RefObject } from "react";
import { EASE, ScrollTrigger, gsap, motionMedia, useGSAP } from "@/lib/motion/gsap";
import { METERS_BY_PHASE, PHASES, formatMeter, type MeterId } from "@/lib/showcase/buildLog";
import { BUS_D, EDGES, NODES, NODE_BY_ID, VB_W } from "./geometry";
import { PulseField } from "./pulses";
import { Typewriter } from "./typewriter";
import s from "./MadeByAI.module.css";

const N = PHASES.length; // 8
const HOLD = 0.9; // timeline units of stillness at the end of the scene
const METER_IDS: MeterId[] = ["agents", "minutes", "tokens", "toolCalls"];

/* ------------------------------------------------------------------ */
/* Graph timeline — shared by the scroll scene and the flow "assemble"  */
/* ------------------------------------------------------------------ */

interface GraphRig {
  tl: gsap.core.Timeline;
  /** Edges and lit node groups, tagged with their phase (for dimming the past). */
  parts: { el: Element; phase: number }[];
  edgeStart: number[];
  edgeEnd: number[];
  litAt: Map<string, number>;
  ping: (id: string) => void;
  bloom: () => void;
  headers: HTMLElement[];
  labels: HTMLElement[];
  box: HTMLElement;
  svg: SVGSVGElement;
  canvas: HTMLCanvasElement;
}

const BUS_X0 = (() => {
  const m = /^M([\d.]+)/.exec(BUS_D);
  return m ? Number(m[1]) : 64;
})();
const BUS_X1 = NODE_BY_ID.live.x;

/** How far the oversight line has reached once phase k is drawn. */
function busPct(k: number): number {
  if (k >= N) return 100;
  const xs = NODES.filter((n) => n.phase === k).map((n) => n.x);
  const x = Math.max(...xs);
  return Math.max(0, Math.min(100, ((x - BUS_X0) / (BUS_X1 - BUS_X0)) * 100));
}

function buildGraph(box: HTMLElement, glow: HTMLElement | null): GraphRig | null {
  const svg = box.querySelector<SVGSVGElement>("[data-graph-svg]");
  const canvas = box.querySelector<HTMLCanvasElement>("[data-pulses]");
  const bus = box.querySelector<SVGPathElement>("[data-bus]");
  const bloomEl = box.querySelector<HTMLElement>("[data-bloom]");
  const scan = box.querySelector<HTMLElement>("[data-scan]");
  if (!svg || !canvas || !bus) return null;

  const sel = (q: string) => box.querySelector<SVGElement>(q);
  const edgeEls = EDGES.map((e) => sel(`[data-edge="${CSS.escape(e.id)}"]`));
  const drops = Array.from(box.querySelectorAll<SVGPathElement>("[data-drop]"));
  const headers = Array.from(box.querySelectorAll<HTMLElement>("[data-head]"));
  const labels = Array.from(box.querySelectorAll<HTMLElement>("[data-label]"));

  const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
  const edgeStart = EDGES.map(() => 0);
  const edgeEnd = EDGES.map(() => 0);
  const litAt = new Map<string, number>();

  // From-states, applied by JS only (SSR shows the finished graph).
  gsap.set(edgeEls.filter(Boolean), { drawSVG: "0% 0%" });
  gsap.set(drops, { drawSVG: "0% 0%" });
  gsap.set(bus, { drawSVG: "0% 0%" });
  const litEls = NODES.filter((n) => n.phase > 0)
    .map((n) => sel(`[data-node="${n.id}"]`))
    .filter(Boolean);
  gsap.set(litEls, { autoAlpha: 0 });

  for (let k = 1; k <= N; k++) {
    const S = k - 1;
    const wave0 = EDGES.map((e, i) => ({ e, i })).filter(({ e }) => e.phase === k && e.wave === 0);
    const wave1 = EDGES.map((e, i) => ({ e, i })).filter(({ e }) => e.phase === k && e.wave === 1);
    const plan = (list: typeof wave0, start: number, dur: number, spread: number) => {
      list.forEach(({ i }, idx) => {
        const st = start + (list.length > 1 ? idx / (list.length - 1) : 0) * spread;
        const el = edgeEls[i];
        if (el) tl.fromTo(el, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: dur, immediateRender: false }, st);
        edgeStart[i] = st;
        edgeEnd[i] = st + dur;
      });
    };
    if (wave1.length) {
      plan(wave0, S + 0.04, 0.34, 0.12);
      plan(wave1, S + 0.52, 0.3, 0.1);
    } else {
      plan(wave0, S + 0.04, 0.46, 0.22);
    }

    for (const d of drops) {
      if (Number(d.dataset.phase) === k) {
        tl.fromTo(d, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.32, immediateRender: false }, S);
      }
    }
    tl.to(bus, { drawSVG: `0% ${busPct(k)}%`, duration: 0.6 }, S);

    for (const n of NODES.filter((x) => x.phase === k)) {
      const incoming = EDGES.map((e, i) => ({ e, i })).filter(({ e }) => e.to === n.id);
      const at = incoming.length ? Math.max(...incoming.map(({ i }) => edgeEnd[i])) : S + 0.3;
      litAt.set(n.id, at);
      const el = sel(`[data-node="${n.id}"]`);
      if (el) tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08, immediateRender: false }, at - 0.06);
    }
  }
  if (glow) tl.fromTo(glow, { opacity: 0.18 }, { opacity: 1, duration: N, immediateRender: true }, 0);

  // The build head: a thin vertical light that sweeps column to column.
  if (scan) {
    const colPct = (k: number) =>
      (Math.max(...NODES.filter((n) => n.phase === k).map((n) => n.x)) / VB_W) * 100;
    gsap.set(scan, { xPercent: colPct(1), autoAlpha: 0 });
    tl.to(scan, { autoAlpha: 1, duration: 0.25 }, 0);
    for (let k = 2; k <= N; k++) tl.to(scan, { xPercent: colPct(k), duration: 0.9 }, k - 1);
    tl.to(scan, { autoAlpha: 0, duration: 0.5 }, N);
  }
  tl.to({}, { duration: HOLD }, N);

  const ping = (id: string) => {
    const p = sel(`[data-ping="${id}"]`);
    if (!p) return;
    gsap.fromTo(
      p,
      { autoAlpha: 0.95, scale: 1 },
      {
        autoAlpha: 0,
        scale: id === "live" ? 1.7 : NODE_BY_ID[id]?.kind === "small" ? 3.4 : 2.7,
        duration: 0.95,
        ease: EASE.out,
        transformOrigin: "50% 50%",
        overwrite: true,
      },
    );
  };

  const bloom = () => {
    if (!bloomEl) return;
    gsap.fromTo(
      bloomEl,
      { opacity: 0.95, scale: 0.25 },
      { opacity: 0, scale: 1.25, duration: 1.6, ease: EASE.out, overwrite: true },
    );
  };

  const parts: { el: Element; phase: number }[] = [];
  EDGES.forEach((e, i) => {
    const el = edgeEls[i];
    if (el) parts.push({ el, phase: e.phase });
  });
  for (const n of NODES) {
    const el = n.phase > 0 ? sel(`[data-node="${n.id}"]`) : null;
    if (el) parts.push({ el, phase: n.phase });
  }

  box.setAttribute("data-js", "");
  return { tl, parts, edgeStart, edgeEnd, litAt, ping, bloom, headers, labels, box, svg, canvas };
}

/** Header and label states for "phase k is the one being built". */
function paintGraphState(rig: GraphRig, k: number, finished: boolean) {
  for (const h of rig.headers) {
    const p = Number(h.dataset.head);
    h.dataset.state = finished || p < k ? "done" : p === k ? "active" : "future";
  }
  for (const l of rig.labels) {
    const p = Number(l.dataset.phase);
    const sticky = l.hasAttribute("data-sticky");
    const show = p === 0 || (finished ? sticky || p === N : sticky ? p <= k : p === k);
    l.toggleAttribute("data-show", show);
  }
  // Earlier phases step back so the one being built reads first; when the
  // build finishes, everything comes back up together.
  for (const { el, phase } of rig.parts) el.toggleAttribute("data-past", !finished && phase < k);
}

/** The finale: every edge flares, then settles. */
function flare(rig: GraphRig) {
  const svg = rig.svg;
  svg.setAttribute("data-flare", "");
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      svg.removeAttribute("data-flare");
      svg.setAttribute("data-afterglow", "");
      window.setTimeout(() => svg.removeAttribute("data-afterglow"), 1600);
    }),
  );
}

function clearGraph(rig: GraphRig) {
  rig.box.removeAttribute("data-js");
  for (const { el } of rig.parts) el.removeAttribute("data-past");
  rig.svg.removeAttribute("data-flare");
  rig.svg.removeAttribute("data-afterglow");
  for (const h of rig.headers) delete h.dataset.state;
  for (const l of rig.labels) l.removeAttribute("data-show");
  const pings = rig.box.querySelectorAll("[data-ping]");
  gsap.killTweensOf(pings);
  gsap.set(pings, { clearProps: "all" });
  const bloom = rig.box.querySelector("[data-bloom]");
  if (bloom) {
    gsap.killTweensOf(bloom);
    gsap.set(bloom, { clearProps: "opacity,transform,scale" });
  }
}

/** Crossing logic shared by both modes: pings, pulse bursts, the bloom. */
function makeCrossing(rig: GraphRig, pulses: PulseField) {
  let last = 0;
  return (t: number) => {
    // A jump (anchor link, fast fling) skips the fireworks.
    if (t > last && t - last < 1.6) {
      for (const [id, at] of rig.litAt) {
        if (at > last && at <= t) {
          rig.ping(id);
          if (id === "live") rig.bloom();
        }
      }
      rig.edgeEnd.forEach((end, i) => {
        if (end > last && end <= t) pulses.burst(i);
      });
    }
    last = t;
    pulses.wake();
  };
}

/* ------------------------------------------------------------------ */
/* Meters                                                              */
/* ------------------------------------------------------------------ */

function meterRig(root: HTMLElement) {
  const items = METER_IDS.map((id) => {
    const box = root.querySelector<HTMLElement>(`[data-meter="${id}"]`);
    return {
      id,
      box,
      num: box?.querySelector<HTMLElement>("[data-meter-num]") ?? null,
      plus: box?.querySelector<HTMLElement>("[data-meter-plus]") ?? null,
      proxy: { v: 0 },
    };
  });
  const finalText = items.map((m) => m.num?.textContent ?? "");
  const finalPlus = items.map((m) => (m.plus ? m.plus.hidden : true));

  const set = (k: number, opts: { duration: number; stagger?: number }) => {
    const target = METERS_BY_PHASE[k];
    items.forEach((m, i) => {
      if (!m.num) return;
      const goal = target[m.id];
      // The "+" only shows on a settled number, so it never slides along.
      if (m.plus) m.plus.hidden = true;
      gsap.to(m.proxy, {
        v: goal.value,
        duration: opts.duration,
        delay: (opts.stagger ?? 0) * i,
        ease: EASE.out,
        overwrite: true,
        onUpdate: () => {
          if (m.num) m.num.textContent = formatMeter(m.id, m.proxy.v);
        },
        onComplete: () => {
          if (m.plus) m.plus.hidden = !(goal.partial && goal.value > 0);
        },
      });
      m.box?.toggleAttribute("data-zero", goal.value === 0);
    });
  };

  const zero = () => {
    items.forEach((m) => {
      m.proxy.v = 0;
      if (m.num) m.num.textContent = formatMeter(m.id, 0);
      if (m.plus) m.plus.hidden = true;
      m.box?.setAttribute("data-zero", "");
    });
  };

  const restore = () => {
    items.forEach((m, i) => {
      gsap.killTweensOf(m.proxy);
      if (m.num) m.num.textContent = finalText[i];
      if (m.plus) m.plus.hidden = finalPlus[i];
      m.box?.removeAttribute("data-zero");
    });
  };

  return { set, zero, restore };
}

/* ------------------------------------------------------------------ */
/* Text bookkeeping: everything we blank, we can put back               */
/* ------------------------------------------------------------------ */

function textKeeper() {
  const saved = new Map<HTMLElement, string>();
  return {
    full(el: HTMLElement): string {
      if (!saved.has(el)) saved.set(el, el.textContent ?? "");
      return saved.get(el) as string;
    },
    restore() {
      for (const [el, text] of saved) el.textContent = text;
    },
  };
}

const typewriter = (host: HTMLElement) =>
  new Typewriter({ host, caretClass: s.caret, ghostClass: s.ghostText, cps: 95 });

/* ------------------------------------------------------------------ */
/* SCENE — sticky stage scrubbed by the scroll                          */
/* ------------------------------------------------------------------ */

function setupScene(root: HTMLElement): () => void {
  const sceneEl = root.querySelector<HTMLElement>("[data-scene]");
  const box = root.querySelector<HTMLElement>("[data-graph]");
  const glow = root.querySelector<HTMLElement>("[data-glow]");
  if (!sceneEl || !box) return () => {};
  const rig = buildGraph(box, glow);
  if (!rig) return () => {};

  const pulses = new PulseField(rig.canvas, rig.svg);
  const tl = rig.tl;
  pulses.isOn = (i) => tl.time() >= rig.edgeEnd[i];
  pulses.tip = (i) => {
    const t = tl.time();
    const a = rig.edgeStart[i];
    const b = rig.edgeEnd[i];
    return t > a && t < b ? (t - a) / (b - a) : -1;
  };
  const cross = makeCrossing(rig, pulses);

  /* Phase title */
  const headItems = Array.from(root.querySelectorAll<HTMLElement>("[data-head-item]"));
  gsap.set(headItems, { autoAlpha: 0 });
  gsap.set(headItems[0], { autoAlpha: 1 });
  let shownHead = 1;
  const swapHead = (k: number) => {
    const next = Math.max(1, k);
    if (next === shownHead) return;
    const dir = next > shownHead ? 1 : -1;
    const from = headItems[shownHead - 1];
    const to = headItems[next - 1];
    gsap.to(from, { autoAlpha: 0, y: -14 * dir, duration: 0.26, ease: EASE.out, overwrite: true });
    gsap.fromTo(
      to,
      { autoAlpha: 0, y: 20 * dir },
      { autoAlpha: 1, y: 0, duration: 0.6, delay: 0.06, ease: EASE.out, overwrite: true },
    );
    shownHead = next;
  };

  /* Ledger — every line is always laid out; the list glides on a transform
     so the newest line sits at the bottom of the panel. No layout shift. */
  const keep = textKeeper();
  const scroller = root.querySelector<HTMLElement>("[data-log-scroll]");
  const list = root.querySelector<HTMLElement>("[data-log-list]");
  const tw = typewriter(list ?? root);
  const prompt = root.querySelector<HTMLElement>("[data-log-prompt]");
  const stateEl = root.querySelector<HTMLElement>("[data-log-state]");
  const logPhases = Array.from(root.querySelectorAll<HTMLElement>("[data-log-phase]"));
  const msgsOf = (p: HTMLElement) => Array.from(p.querySelectorAll<HTMLElement>("[data-msg]"));
  const typed = new Set<number>();
  for (const p of logPhases) {
    for (const m of msgsOf(p)) keep.full(m);
    p.setAttribute("data-future", "");
  }
  const stateText = stateEl?.textContent ?? "";

  const LIST_PAD = 14;
  const listY = (k: number) => {
    if (!list) return 0;
    const el = k > 0 ? logPhases[k - 1] : prompt;
    if (!el) return 0;
    return Math.max(0, list.offsetHeight - (el.offsetTop + el.offsetHeight) - LIST_PAD);
  };
  if (list) gsap.set(list, { y: listY(0) });
  let logActive = 0;
  const ro = new ResizeObserver(() => {
    if (list) gsap.set(list, { y: listY(logActive) });
  });
  if (scroller) ro.observe(scroller);

  const setLog = (next: number, prev: number) => {
    logActive = next;
    tw.flush();
    if (next > prev) {
      for (let k = prev + 1; k <= next; k++) {
        const p = logPhases[k - 1];
        if (!p) continue;
        p.removeAttribute("data-future");
        const msgs = msgsOf(p);
        if (k === next && !typed.has(k)) {
          typed.add(k);
          tw.add(msgs.map((el) => ({ el, text: keep.full(el) })));
        } else {
          for (const m of msgs) m.textContent = keep.full(m);
        }
      }
      if (!tw.busy) {
        const lastMsg = msgsOf(logPhases[next - 1]).pop();
        if (lastMsg) tw.park(lastMsg);
      }
    } else {
      for (let k = prev; k > next; k--) logPhases[k - 1]?.setAttribute("data-future", "");
      const lastVisible = next > 0 ? msgsOf(logPhases[next - 1]).pop() : null;
      if (lastVisible) tw.park(lastVisible);
      else tw.detach();
    }
    if (list) gsap.to(list, { y: listY(next), duration: 0.6, ease: EASE.out, overwrite: true });
  };

  const paintState = (k: number, done: boolean) => {
    if (!stateEl) return;
    stateEl.textContent = done ? "done" : k === 0 ? "ready" : `running · ${k}/${N}`;
    stateEl.toggleAttribute("data-done", done);
  };

  /* Meters */
  const meters = meterRig(root);
  meters.zero();

  /* Phase driver */
  let active = 0;
  paintGraphState(rig, 0, false);
  paintState(0, false);

  const phaseOf = (t: number) => (t <= 0.001 ? 0 : Math.min(N, Math.floor(t) + 1));
  let finished = false;
  const onUpdate = () => {
    const t = tl.time();
    cross(t);
    const k = phaseOf(t);
    const done = t >= N - 0.02;
    if (done !== finished) {
      finished = done;
      paintGraphState(rig, k, done);
      paintState(k, done);
      if (done) flare(rig);
    }
    if (k === active) return;
    const prev = active;
    active = k;
    paintGraphState(rig, k, finished);
    paintState(k, finished);
    swapHead(k);
    setLog(k, prev);
    meters.set(k, { duration: 0.9 });
  };
  tl.eventCallback("onUpdate", onUpdate);

  ScrollTrigger.create({
    trigger: sceneEl,
    start: "top 14%",
    end: "bottom bottom",
    scrub: true,
    animation: tl,
    // The scrubbed glow gets its own layer only while the scene is live.
    onToggle: (self) => {
      if (glow) glow.style.willChange = self.isActive ? "opacity" : "";
    },
  });

  return () => {
    tl.eventCallback("onUpdate", null);
    pulses.destroy();
    ro.disconnect();
    tw.destroy();
    keep.restore();
    for (const p of logPhases) p.removeAttribute("data-future");
    if (stateEl) {
      stateEl.textContent = stateText;
      stateEl.removeAttribute("data-done");
    }
    gsap.killTweensOf([...headItems, list]);
    gsap.set([...headItems, list], { clearProps: "all" });
    if (glow) {
      glow.style.willChange = "";
      gsap.set(glow, { clearProps: "opacity" });
    }
    meters.restore();
    clearGraph(rig);
  };
}

/* ------------------------------------------------------------------ */
/* FLOW — phones, tablets, touch desktops (motion allowed)              */
/* ------------------------------------------------------------------ */

function setupFlow(root: HTMLElement, desktop: boolean): () => void {
  const cleanups: (() => void)[] = [];
  const keep = textKeeper();
  const tw = typewriter(root.querySelector<HTMLElement>("[data-timeline]") ?? root);
  const vh = window.innerHeight;

  /* Static graph (≥1024): assemble once in ~3s when it arrives, then live pulses. */
  const box = desktop ? root.querySelector<HTMLElement>("[data-graph]") : null;
  if (box && box.getBoundingClientRect().top > vh * 0.8) {
    const rig = buildGraph(box, null);
    if (rig) {
      const pulses = new PulseField(rig.canvas, rig.svg);
      pulses.isOn = (i) => rig.tl.time() >= rig.edgeEnd[i];
      const cross = makeCrossing(rig, pulses);
      paintGraphState(rig, 0, false);
      let active = 0;
      rig.tl.eventCallback("onUpdate", () => {
        const t = rig.tl.time();
        cross(t);
        const k = t <= 0.001 ? 0 : Math.min(N, Math.floor(t) + 1);
        if (k !== active) {
          active = k;
          paintGraphState(rig, k, k >= N && t >= N);
        }
      });
      rig.tl.eventCallback("onComplete", () => {
        paintGraphState(rig, N, true);
        flare(rig);
      });
      ScrollTrigger.create({
        trigger: box,
        start: "top 72%",
        once: true,
        onEnter: () => {
          rig.tl.timeScale(2.6).play(0);
        },
      });
      cleanups.push(() => {
        rig.tl.eventCallback("onUpdate", null);
        rig.tl.eventCallback("onComplete", null);
        pulses.destroy();
        clearGraph(rig);
      });
    }
  } else if (box) {
    // Already on screen: keep it finished, just alive.
    const svg = box.querySelector<SVGSVGElement>("[data-graph-svg]");
    const canvas = box.querySelector<HTMLCanvasElement>("[data-pulses]");
    if (svg && canvas) {
      const pulses = new PulseField(canvas, svg);
      cleanups.push(() => pulses.destroy());
    }
  }

  /* Timeline rows: draw the mini fan, type the lines, once each. */
  const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-phase-row]"));
  for (const row of rows) {
    if (row.getBoundingClientRect().top < vh * 0.85) continue; // already seen: leave final
    const msgs = Array.from(row.querySelectorAll<HTMLElement>("[data-msg]"));
    // Only lines this layout shows (phones hide the non-key ones).
    const shown = msgs.filter((m) => m.offsetParent !== null);
    const jobs = shown.map((el) => ({ el, text: keep.full(el) }));
    tw.prime(jobs);

    const fan = row.querySelector<SVGSVGElement>("[data-fan]");
    const tl = gsap.timeline({ paused: true });
    if (fan) {
      const e1 = fan.querySelectorAll('[data-fan-edge="1"]');
      const e2 = fan.querySelectorAll('[data-fan-edge="2"]');
      const n1 = fan.querySelectorAll('[data-fan-node="1"]');
      const n2 = fan.querySelectorAll('[data-fan-node="2"]');
      const p1 = fan.querySelectorAll('[data-fan-pulse="1"]');
      const p2 = fan.querySelectorAll('[data-fan-pulse="2"]');
      gsap.set([...e1, ...e2], { drawSVG: "0% 0%" });
      gsap.set([...n1, ...n2], { opacity: 0.12 });
      tl.to(e1, { drawSVG: "0% 100%", duration: 0.5, ease: EASE.inOut, stagger: { amount: 0.18 } }, 0);
      tl.to(n1, { opacity: 1, duration: 0.25, ease: "none", stagger: { amount: 0.16 } }, 0.38);
      // The work arrives: a run of light travels each new edge, top to bottom.
      const pulse = (els: NodeListOf<Element>, at: number) => {
        if (!els.length) return;
        tl.fromTo(
          els,
          { drawSVG: "0% 0%", opacity: 1 },
          {
            keyframes: { drawSVG: ["0% 0%", "0% 34%", "66% 100%", "100% 100%"], easeEach: "none" },
            duration: 0.62,
            ease: EASE.inOut,
            stagger: { amount: 0.16 },
            immediateRender: false,
          },
          at,
        );
        tl.set(els, { opacity: 0 }, at + 0.8);
      };
      pulse(p1, 0.28);
      if (e2.length) {
        tl.to(e2, { drawSVG: "0% 100%", duration: 0.42, ease: EASE.inOut, stagger: { amount: 0.14 } }, 0.62);
        tl.to(n2, { opacity: 1, duration: 0.25, ease: "none" }, 0.98);
        pulse(p2, 0.86);
      }
    }
    row.setAttribute("data-off", "");
    ScrollTrigger.create({
      trigger: row,
      start: "top 80%",
      once: true,
      onEnter: () => {
        row.removeAttribute("data-off");
        row.setAttribute("data-ping", "");
        tl.play();
        // The newest row types; anything still typing above just completes.
        tw.flush();
        tw.add(jobs);
      },
    });
    cleanups.push(() => {
      row.removeAttribute("data-off");
      row.removeAttribute("data-ping");
    });
  }

  /* The spine fills with the scroll, a bead of light riding its tip. */
  const spine = root.querySelector<HTMLElement>("[data-spine]");
  const head = root.querySelector<HTMLElement>("[data-spine-head]");
  const timeline = root.querySelector<HTMLElement>("[data-timeline]");
  if (spine && timeline) {
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: timeline,
        start: "top 78%",
        end: "bottom 70%",
        scrub: true,
        invalidateOnRefresh: true,
        onToggle: (self) => {
          if (head) head.style.willChange = self.isActive ? "transform" : "";
        },
      },
    });
    tl.fromTo(spine, { scaleY: 0 }, { scaleY: 1 }, 0);
    if (head) {
      const track = head.parentElement ?? spine;
      tl.fromTo(head, { y: 0 }, { y: () => track.offsetHeight }, 0);
      timeline.setAttribute("data-flow", "");
      cleanups.push(() => timeline.removeAttribute("data-flow"));
    }
  }

  /* Meters roll up once. */
  const metersEl = root.querySelector<HTMLElement>("[data-meters]");
  if (metersEl && metersEl.getBoundingClientRect().top > vh * 0.9) {
    const meters = meterRig(root);
    meters.zero();
    ScrollTrigger.create({
      trigger: metersEl,
      start: "top 88%",
      once: true,
      onEnter: () => meters.set(N, { duration: 1.6, stagger: 0.09 }),
    });
    cleanups.push(() => meters.restore());
  }

  return () => {
    tw.destroy();
    keep.restore();
    cleanups.forEach((f) => f());
  };
}

/* ------------------------------------------------------------------ */
/* Hover (fine pointers): who is this node, and what is it wired to     */
/* ------------------------------------------------------------------ */

function setupHover(box: HTMLElement): () => void {
  const svg = box.querySelector<SVGSVGElement>("[data-graph-svg]");
  const tip = box.querySelector<HTMLElement>("[data-tip]");
  if (!svg || !tip) return () => {};
  const byNode = new Map<string, Element[]>();
  for (const e of EDGES) {
    const el = box.querySelector(`[data-edge="${CSS.escape(e.id)}"]`);
    if (!el) continue;
    for (const id of [e.from, e.to]) byNode.set(id, [...(byNode.get(id) ?? []), el]);
  }
  let hot: Element[] = [];
  let current: string | null = null;
  const clear = () => {
    for (const h of hot) h.removeAttribute("data-hot");
    hot = [];
    current = null;
    tip.removeAttribute("data-show");
    box.removeAttribute("data-hovering");
  };
  const show = (id: string) => {
    const n = NODE_BY_ID[id];
    if (!n || id === current) return;
    clear();
    current = id;
    const k = box.clientWidth / VB_W;
    tip.textContent = n.role;
    // Transform only — a moving tooltip must never count as a layout shift.
    tip.style.transform = `translate(${Math.round(n.x * k)}px, ${Math.round((n.y - n.r - 8) * k)}px)`;
    tip.setAttribute("data-show", "");
    hot = byNode.get(n.id) ?? [];
    for (const h of hot) h.setAttribute("data-hot", "");
    box.setAttribute("data-hovering", "");
  };
  // Only a pointer that really moves counts. While the page scrolls under a
  // resting cursor, nodes must not light up at random mid-story.
  const move = (ev: PointerEvent) => {
    if (!ev.movementX && !ev.movementY) return;
    const id = (ev.target as Element | null)?.closest?.("[data-hit]")?.getAttribute("data-hit");
    if (id) show(id);
    else if (current) clear();
  };
  const leave = () => {
    if (current) clear();
  };
  const onScroll = () => {
    if (current) clear();
  };
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerleave", leave);
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    svg.removeEventListener("pointermove", move);
    svg.removeEventListener("pointerleave", leave);
    window.removeEventListener("scroll", onScroll);
    clear();
    tip.style.transform = "";
  };
}

/* ------------------------------------------------------------------ */
/* Closing line — masked rise, once                                     */
/* ------------------------------------------------------------------ */

function setupClosing(root: HTMLElement) {
  const closing = root.querySelector<HTMLElement>("[data-closing]");
  const lines = closing ? Array.from(closing.querySelectorAll<HTMLElement>("[data-close-line]")) : [];
  if (!closing || !lines.length) return;
  if (closing.getBoundingClientRect().top < window.innerHeight * 0.9) return;
  gsap.from(lines, {
    yPercent: 108,
    duration: 0.85,
    stagger: 0.09,
    ease: EASE.out,
    scrollTrigger: { trigger: closing, start: "top 85%", once: true },
  });
}

/* ------------------------------------------------------------------ */

export function useMadeByAIMotion(root: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = motionMedia(({ ok, desktop, fine }) => {
        // Hover is information, not motion: fine pointers get it either way.
        const box = el.querySelector<HTMLElement>("[data-graph]");
        const offHover = desktop && fine && box ? setupHover(box) : () => {};
        // Reduced motion: the server-rendered final state is the experience.
        if (!ok) return offHover;
        // The rec dot and caret loop forever; run them only near the viewport.
        const live = new IntersectionObserver(
          (entries) => el.toggleAttribute("data-live", entries[entries.length - 1].isIntersecting),
          { rootMargin: "100px 0px" },
        );
        live.observe(el);
        setupClosing(el);
        const scene =
          desktop && fine && document.documentElement.classList.contains("fine-desktop");
        const offMode = scene ? setupScene(el) : setupFlow(el, desktop);
        return () => {
          live.disconnect();
          el.removeAttribute("data-live");
          offHover();
          offMode();
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );
}
