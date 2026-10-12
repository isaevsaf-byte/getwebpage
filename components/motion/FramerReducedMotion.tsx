"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";

/**
 * Pages that still animate with framer-motion honour the OS reduced-motion
 * setting: transform and layout animations are skipped, opacity still fades.
 * The home page no longer uses framer-motion; this only covers the rest.
 */
export default function FramerReducedMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
