# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Run production build
npm run lint     # ESLint
```

No test suite is configured.

## Architecture

**GetWebPage** is a Next.js marketing site + AI website audit tool for UK small businesses.

### App Router Structure

- `app/page.tsx` — Home page (assembles section components)
- `app/layout.tsx` — Root layout: fonts (Cormorant, DM Sans), GA4/Google Ads scripts, metadata
- `app/audit/page.tsx` — AI audit tool (complex client component with EN/RU language toggle)
- `app/api/` — Serverless API routes (see below)

### API Routes

| Route | Purpose |
|---|---|
| `POST /api/audit` | Fetch target URL HTML (SSRF-guarded) → Claude Sonnet → cache in KV → return partial report |
| `POST /api/unlock` | Email gate: retrieve cached report, save lead to KV, send emails |
| `POST /api/checkout` | Create Stripe checkout session (3 tiers: £500/£800/£1200) |
| `POST /api/contact` | Contact form → Resend email |
| `POST /api/webhook` | Stripe webhook: send order notification emails |

### Audit Tool Data Flow

```
URL input → /api/audit (fetch HTML + Cheerio parse + Claude) → KV cache (24h TTL)
  → partial report shown (good items only, critical/important locked behind email gate)
  → email entered → /api/unlock → full report + lead saved to KV + emails sent
```

Rate limiting: 20 audits per IP per 24h, plus a global daily ceiling
(`AUDIT_GLOBAL_DAILY_LIMIT`, default 500) so rotating IPs cannot run up the
Anthropic bill. Both tracked in KV.

### Key Files

- `lib/audit-prompts.ts` — Claude system/user prompts and TypeScript types for audit results
- `lib/url.ts` — URL validation, SSRF guards (`assertPublicHost`, `fetchPageSafely`), KV cache keys
- `lib/rate-limit.ts` — Shared KV rate limiting used by every public API route
- `components/sections/` — Page sections (Hero, Pricing, Process, Work, AuditBand, Testimonials, Contact)
- `components/ConsentBanner.tsx` — Cookie gate. GA4 and Google Ads load **only** after acceptance
- `app/globals.css` — Design system. Tailwind 4 reads `@theme` from CSS; there is no `tailwind.config.ts`

### Design system

Tokens live in the `@theme` block of `app/globals.css` — Tailwind 4 ignores a JS
config unless pointed at with `@config`, so do not reintroduce `tailwind.config.ts`.

Palette: paper `#eaece7` (cool bone), ink `#14181a`, accent oxblood `#7d2436`,
muted `#636b67`. Display face is Literata, body DM Sans, utility DM Mono.
All text pairs meet WCAG AA — check any new colour before adding it.

### Rules that are easy to break

- **Analytics must stay behind consent.** The privacy policy states GA4 and Google
  Ads do not load until the visitor accepts. Adding a tag to `layout.tsx` directly
  would make that statement false again.
- **Never fetch a user-supplied URL with plain `fetch`.** Use `fetchPageSafely`,
  which re-validates every redirect hop and caps the response body.
- **Every public API route needs a rate limit** via `lib/rate-limit.ts`.
- **Every business event goes through `lib/stats.ts` + `lib/notify.ts`**, inside
  `after()` so the visitor never waits on Telegram. New lead type → add it to
  `EVENTS` and the `LABELS` map in `app/admin/page.tsx`.

### Owner dashboard ("Пульт")

- `/admin` — Basic Auth via `proxy.ts` (Next 16 renamed middleware → proxy). Returns
  404 until `ADMIN_PASSWORD` is set. Russian UI on purpose: one reader.
- Alerts → Telegram (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`): audit run, audit lead,
  enquiry, checkout opened, deposit paid, checkout abandoned.
- Abandoned-checkout alerts need `checkout.session.expired` enabled on the Stripe webhook.
- Daily digest: Vercel Cron → `GET /api/digest` at 08:00 UTC with `Bearer CRON_SECRET`.
  Sends even on a quiet day, as a heartbeat.
- Visitor counts live in Vercel Analytics (cookieless — counts everyone); `/admin`
  page views are excluded via `components/SiteAnalytics.tsx`.

### Environment Variables

See `.env.example`. Required:
- `ANTHROPIC_API_KEY` — Claude API (audit uses claude-sonnet-4-6)
- `KV_REST_API_URL` + `KV_REST_API_TOKEN` — Vercel KV (report cache + leads)
- `RESEND_API_KEY` — Email (contact form, order confirmations, lead notifications)
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` — Payments
- `NEXT_PUBLIC_BASE_URL` — Set to `https://getwebpage.co.uk` in production

### Stack

- Next.js 16.3 (App Router, Turbopack) + React 19 (Next bundles React canary with <ViewTransition>) + TypeScript 5
- Tailwind CSS 4, Framer Motion 12, GSAP 3.15 (all plugins free), Lenis, three.js + R3F
- Anthropic SDK, Vercel KV, Stripe, Resend, Cheerio
