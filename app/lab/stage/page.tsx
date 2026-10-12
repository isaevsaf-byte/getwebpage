import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StageLab from "./StageLab";

export const metadata: Metadata = {
  title: "Stage lab — GetWebPage",
  robots: { index: false, follow: false },
};

// Dev-only test bench for ThreeStage, CssPane, DayRail and StickyOfferBar.
export default function StageLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StageLab />;
}
