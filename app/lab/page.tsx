import type { Metadata } from "next";
import LabScene from "./LabScene";

export const metadata: Metadata = {
  title: "Lab — GetWebPage",
  robots: { index: false, follow: false },
};

// Temporary smoke test for the real-time 3D stack. Removed once the showcase ships.
export default function LabPage() {
  return (
    <main style={{ height: "100svh", background: "#0d1012" }}>
      <LabScene />
    </main>
  );
}
