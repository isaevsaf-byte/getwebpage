"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";

/**
 * Pages that still animate with framer-motion honour the OS reduced-motion
 * setting: transform and layout animations are skipped, opacity still fades.
 * Mounted only around the two legacy sections that still use it (/work,
 * /contact), so framer-motion never ships on the home page.
 */
export default function FramerReducedMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
