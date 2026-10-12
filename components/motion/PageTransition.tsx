"use client";

import { ViewTransition, startTransition, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Route-level view transitions (React <ViewTransition>, Next's vendored React
 * 19.3 — no config flag). Import only from app/ code: anything bundled outside
 * Next gets node_modules/react 19.2, which has no ViewTransition.
 *
 * Directional slides play only when a navigation carries a type:
 *   <Link href="/pricing" transitionTypes={["nav-forward"]}>
 *   navForward(router, "/pricing")
 * Browser back and iOS swipe-back carry no type, so only shared morphs play —
 * no double animation on top of Safari's own swipe.
 *
 * Two details that make this work from the root layout:
 * - Layouts persist across navigations, so a boundary there never enters or
 *   exits. Keying it by pathname remounts it per route, which is exactly what
 *   enter/exit need (the same thing a root template.tsx would do).
 * - React writes view-transition-name onto the boundary's top-level DOM
 *   nodes, which would overwrite the SiteHeader's own `site-header` name.
 *   The wrapper div takes the page name instead, and the header inside keeps
 *   its own, so it stays anchored while the page slides.
 */
const DIRECTIONAL = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "none",
};

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition
      key={pathname}
      enter={DIRECTIONAL}
      exit={DIRECTIONAL}
      default="none"
    >
      <div className="vt-page">{children}</div>
    </ViewTransition>
  );
}

/**
 * Marks an element that morphs into its twin on another route
 * (450ms studio-in-out with a 3px blur at 40%, see globals.css).
 * Names must be unique on a page — a duplicate silently cancels the morph.
 * Known names: site-header, pricing-title, work-title, work-{slug}, audit-field.
 */
export function SharedName({ name, children }: { name: string; children: ReactNode }) {
  return (
    <ViewTransition name={name} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}

type AppRouter = ReturnType<typeof useRouter>;

/** Programmatic forward navigation with the directional slide. */
export function navForward(router: AppRouter, href: string): void {
  startTransition(() => {
    router.push(href, { transitionTypes: ["nav-forward"] });
  });
}
