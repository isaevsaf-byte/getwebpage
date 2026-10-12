"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import ThreeStage, { type SceneHandle } from "@/components/three/ThreeStage";
import CssPane from "@/components/showcase/primitives/CssPane";
import DayRail, { type DayRailHandle } from "@/components/showcase/primitives/DayRail";
import StickyOfferBar from "@/components/showcase/primitives/StickyOfferBar";
import { useTier } from "@/lib/showcase/tier";
import styles from "./lab.module.css";

const loadDemo = () => import("./demoScene");

const TICKS = [
  { day: "D1", label: "Brief" },
  { day: "D2", label: "Design" },
  { day: "D3", label: "Design" },
  { day: "D4", label: "Revisions" },
  { day: "D5", label: "Launch" },
  { day: "D6", label: "Launch" },
  { day: "D7", label: "Live" },
];

function PosterFan() {
  return (
    <div className={styles.fan}>
      <CssPane
        className={`${styles.fanBack} ${styles.fanBackL}`}
        domain="bektothefuture.com"
        secure
        tilt={{ x: 2, y: 14 }}
      >
        <Image src="/portfolio/bektothefuture.jpg" alt="" fill sizes="30vw" />
      </CssPane>
      <CssPane
        className={`${styles.fanBack} ${styles.fanBackR}`}
        domain="silkbees.co.uk"
        secure
        tilt={{ x: 2, y: -22 }}
      >
        <Image src="/portfolio/silkbees.jpg" alt="" fill sizes="30vw" />
      </CssPane>
      <CssPane className={styles.fanMain} domain="beautasy.co.uk" secure tilt={{ x: 3, y: -10 }}>
        <Image src="/portfolio/beautasy.jpg" alt="Beautasy home page" fill sizes="40vw" priority />
      </CssPane>
    </div>
  );
}

export default function StageLab() {
  const tier = useTier();
  const [stageState, setStageState] = useState("poster");
  const railRef = useRef<DayRailHandle>(null);
  const weekRef = useRef<HTMLElement>(null);
  const [railVisible, setRailVisible] = useState(false);

  const onReady = useCallback((h: SceneHandle) => {
    setStageState("live");
    (window as unknown as { __stage?: SceneHandle }).__stage = h;
  }, []);
  const onDowngrade = useCallback(() => setStageState("downgraded"), []);

  // DayRail driver: progress through #week, active beat by position.
  useEffect(() => {
    const week = weekRef.current;
    if (!week) return;
    const beats = Array.from(week.querySelectorAll<HTMLElement>("[data-beat]"));
    let raf = 0;
    const tick = () => {
      raf = 0;
      const r = week.getBoundingClientRect();
      const mid = window.innerHeight / 2;
      const p = Math.max(0, Math.min(1, (mid - r.top) / r.height));
      railRef.current?.setProgress(p);
      let active = 0;
      beats.forEach((b, i) => {
        if (b.getBoundingClientRect().top < mid) active = i;
      });
      railRef.current?.setActive(active);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => setRailVisible(e.isIntersecting), { threshold: 0 });
    io.observe(week);
    window.addEventListener("scroll", onScroll, { passive: true });
    tick();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const jump = useCallback((i: number) => {
    weekRef.current?.querySelectorAll<HTMLElement>("[data-beat]")[i]?.scrollIntoView({ block: "center" });
  }, []);

  return (
    <>
      <main className={styles.main}>
        <section id="top" data-ground="ink" className={`${styles.wrap} ${styles.hero}`}>
          <div>
            <p className={styles.mono}>/lab/stage · dev only</p>
            <h1 className={styles.h1}>Stage, panes, rail and offer bar.</h1>
            <p className={styles.lede}>
              The canvas fades in over the CSS fan on the WebGL tier only. Phones, tablets and reduced
              motion keep the CSS fan and never download three.js.
            </p>
            <div className={`${styles.status} ${styles.mono}`}>
              <span>
                tier: <output data-testid="tier">{tier}</output>
              </span>
              <span>
                stage: <output data-testid="stage">{stageState}</output>
              </span>
            </div>
          </div>
          <ThreeStage
            className={styles.stage}
            poster={<PosterFan />}
            load={loadDemo}
            onReady={onReady}
            onDowngrade={onDowngrade}
          />
        </section>

        <section className={`${styles.wrap} ${styles.panes}`} data-ground="ink">
          <p className={styles.mono}>CssPane · ink · draggable (drag sideways)</p>
          <div className={styles.paneGrid}>
            <CssPane domain="beautasy.co.uk" secure draggable tilt={{ x: 4, y: -8 }}>
              <Image src="/portfolio/beautasy.jpg" alt="Beautasy home page" fill sizes="60vw" />
            </CssPane>
            <CssPane domain="safarisaev.ai" secure aspect="9/19.5" label="Sketch" tilt={{ x: 2, y: 10 }}>
              <Image src="/portfolio/safarisaev.jpg" alt="" fill sizes="30vw" />
            </CssPane>
          </div>
        </section>

        <section id="week" ref={weekRef} className={`${styles.wrap} ${styles.week}`} data-ground="ink">
          <p className={styles.mono}>DayRail · desktop rail on the right, segmented bar under the header below 1024px</p>
          {TICKS.map((t, i) => (
            <div key={t.day} data-beat={i} className={styles.beat}>
              <span className={styles.mono}>Day {i + 1}</span>
              <h3>{t.label}</h3>
            </div>
          ))}
        </section>

        <section id="pricing" className={styles.paper} data-ground="paper">
          <div className={`${styles.wrap} ${styles.paperGrid}`}>
            <div>
              <p className={styles.mono}>#pricing · the offer bar hides while this is on screen</p>
              <h2 className={styles.h1}>Paper tone pane.</h2>
            </div>
            <CssPane domain="silkbees.co.uk" secure tone="paper" aspect="4/3" draggable>
              <Image src="/portfolio/silkbees.jpg" alt="Silk Bees home page" fill sizes="45vw" />
            </CssPane>
          </div>
        </section>

        <section id="contact" className={`${styles.wrap} ${styles.contact}`} data-ground="ink">
          <p className={styles.mono}>#contact · focusing the field sets html.input-focused</p>
          <label className={styles.field}>
            <span className={styles.mono}>Your name</span>
            <input type="text" name="lab-name" autoComplete="off" />
          </label>
        </section>

        <div className={styles.tail} />
      </main>

      <DayRail
        ref={railRef}
        ticks={TICKS}
        onJump={jump}
        skipHref="#pricing"
        skipLabel="Skip the week ↓"
        tone="ink"
        visible={railVisible}
      />
      <StickyOfferBar />
    </>
  );
}
