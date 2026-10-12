"use client";

import { Analytics } from "@vercel/analytics/react";

/** Vercel Analytics, minus the owner's own visits to the dashboard. */
export default function SiteAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => (new URL(event.url).pathname.startsWith("/admin") ? null : event)}
    />
  );
}
