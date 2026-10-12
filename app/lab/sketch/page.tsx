import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SketchLab from "./SketchLab";

export const metadata: Metadata = {
  title: "Sketch lab — GetWebPage",
  robots: { index: false, follow: false },
};

// Dev-only review page for the sketch renderer: every sector × stage ×
// layout, the stress names, the atlas and a draw-time benchmark.
export default async function SketchLabPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  return (
    <SketchLab
      initialName={one("name") ?? "Bella Hair"}
      view={one("view") ?? "grid"}
      sector={one("sector")}
    />
  );
}
