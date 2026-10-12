"use client";

import {
  startTransition,
  useEffect,
  useEffectEvent,
  useState,
  useSyncExternalStore,
  ViewTransition,
} from "react";
import Link from "next/link";
import { SharedName } from "@/components/motion/PageTransition";
import { consumeAuditHandoff } from "@/lib/showcase/auditHandoff";

type Lang = "en" | "ru";

interface AuditItem {
  title: string;
  detail: string;
}

interface AuditState {
  status: "idle" | "loading" | "done" | "unlocked" | "error";
  error?: string;
  good?: AuditItem[];
  critical?: AuditItem[];
  important?: AuditItem[];
  criticalCount?: number;
  importantCount?: number;
  /** The language the cached report was generated in — not whatever the toggle now reads. */
  reportLang?: Lang;
}

const DEFAULT_LIMIT = 20;

const T = {
  en: {
    eyebrow: "Free AI audit",
    headline: "93% of small business websites are losing customers.",
    subheadline: "Is yours?",
    description:
      "Paste your URL below. Our AI scans your site in ~30 seconds and shows exactly what's costing you customers.",
    placeholder: "https://yourbusiness.co.uk",
    cta: "Audit my website",
    loading: "Analysing your site…",
    unlocking: "Unlocking…",
    goodTitle: "What's working",
    criticalTitle: "Critical issues",
    importantTitle: "Important issues",
    gateHeadline: "Unlock the full report",
    gateSub: "Enter your email to see every issue and exactly how to fix it.",
    emailPlaceholder: "your@email.com",
    unlockBtn: "Show me the issues",
    nextStep: "Next step",
    ctaBlock: "Want us to fix it?",
    ctaSub: "We rebuild or repair small business sites from £500.",
    ctaBtn: "Get a free quote →",
    seePrices: "See prices",
    hiddenBody: "████████ ████ ████████████ ████ ████ ██████ ████████ ██.",
    hiddenTitle: (i: number) => `Issue ${i} — hidden until email provided`,
    criticalBadge: (n: number) => `${n === 1 ? "critical issue" : "critical issues"}`,
    importantBadge: (n: number) => `${n === 1 ? "important issue" : "important issues"}`,
    errors: {
      bad_url: "That doesn't look like a valid URL. Try https://yourbusiness.co.uk",
      fetch_failed: "We couldn't reach that site. Check the URL and try again.",
      limit: (n: number) => `You've used your ${n} free audits today. Come back tomorrow.`,
      busy: "We're at capacity for today. Please try again tomorrow.",
      ai_failed: "Something went wrong on our end. Please try again.",
      cache_expired: "Your session expired. Run the audit again to get a fresh report.",
      bad_email: "Please enter a valid email address.",
      generic: "Something went wrong. Please try again.",
      network: "We couldn't reach our server. Check your connection and try again.",
    },
  },
  ru: {
    eyebrow: "Бесплатный AI-аудит",
    headline: "93% сайтов малого бизнеса теряют клиентов.",
    subheadline: "Ваш тоже?",
    description:
      "Вставьте URL ниже. Наш ИИ проверит сайт за ~30 секунд и покажет, что именно отпугивает клиентов.",
    placeholder: "https://вашбизнес.ru",
    cta: "Проверить мой сайт",
    loading: "Анализируем ваш сайт…",
    unlocking: "Открываем…",
    goodTitle: "Что работает",
    criticalTitle: "Критические проблемы",
    importantTitle: "Важные проблемы",
    gateHeadline: "Откройте полный отчёт",
    gateSub: "Введите email, чтобы увидеть все проблемы и как их исправить.",
    emailPlaceholder: "ваш@email.ru",
    unlockBtn: "Показать проблемы",
    nextStep: "Следующий шаг",
    ctaBlock: "Хотите, мы исправим?",
    ctaSub: "Мы перестраиваем и чиним сайты малого бизнеса от £500.",
    ctaBtn: "Получить расчёт →",
    seePrices: "Посмотреть цены",
    hiddenBody: "████████ ████ ████████████ ████ ████ ██████ ████████ ██.",
    hiddenTitle: (i: number) => `Проблема ${i} — скрыта до ввода email`,
    criticalBadge: (n: number) =>
      plural(n, "критическая проблема", "критические проблемы", "критических проблем"),
    importantBadge: (n: number) =>
      plural(n, "важная проблема", "важные проблемы", "важных проблем"),
    errors: {
      bad_url: "Не похоже на корректный URL. Попробуйте https://вашбизнес.ru",
      fetch_failed: "Не удалось загрузить сайт. Проверьте URL и попробуйте снова.",
      limit: (n: number) => `Вы использовали ${n} бесплатных аудитов сегодня. Вернитесь завтра.`,
      busy: "Мы достигли лимита на сегодня. Попробуйте завтра.",
      ai_failed: "Что-то пошло не так. Попробуйте ещё раз.",
      cache_expired: "Сессия истекла. Запустите аудит заново.",
      bad_email: "Введите корректный email.",
      generic: "Что-то пошло не так. Попробуйте ещё раз.",
      network: "Не удалось связаться с сервером. Проверьте соединение.",
    },
  },
} as const;

/** Russian needs three forms: 1 проблема / 2–4 проблемы / 5+ проблем. */
function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

// Site palette
const C = {
  bg: "#eaece7",
  text: "#14181a",
  muted: "#5a6360",
  border: "#d5d9d2",
  accent: "#7d2436",
  accentHover: "#93293e",
  card: "#fff",
  cardBorder: "#d5d9d2",
  good: "#186449",
  goodBg: "#e6f2ed",
  goodBorder: "#a9cfc0",
  critical: "#7a1a0a",
  criticalBg: "#fdf2f0",
  criticalBorder: "#f0c0b0",
  important: "#6a4a0a",
  importantBg: "#fdf8f0",
  importantBorder: "#e8d0a0",
};

const subscribeNoop = () => () => {};
/** Browser language, resolved once. English on the server so markup matches. */
const browserLang = (): Lang =>
  typeof navigator !== "undefined" &&
  navigator.language.toLowerCase().startsWith("ru")
    ? "ru"
    : "en";
const serverLang = (): Lang => "en";

export default function AuditTool() {
  const detected = useSyncExternalStore(subscribeNoop, browserLang, serverLang);
  const [chosen, setChosen] = useState<Lang | null>(null);
  const lang = chosen ?? detected;
  const setLang = setChosen;
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [unlocking, setUnlocking] = useState(false);
  const [audit, setAudit] = useState<AuditState>({ status: "idle" });

  const t = T[lang];

  function messageFor(key: string, n: number): string {
    const table = t.errors as Record<string, unknown>;
    const entry = table[key];
    if (typeof entry === "function") return (entry as (n: number) => string)(n);
    if (typeof entry === "string") return entry;
    return t.errors.generic;
  }

  /** `override` is the URL handed over from the home page (see the effect below). */
  async function runAudit(override?: string) {
    const target = (override ?? url).trim();
    if (!target || audit.status === "loading") return;
    setAudit({ status: "loading" });

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target, lang }),
      });

      // A gateway timeout returns HTML, not JSON — never assume a parse succeeds.
      const data = await res.json().catch(() => ({}));

      if (typeof data.limit === "number") setLimit(data.limit);

      if (!res.ok) {
        setAudit({
          status: "error",
          error: messageFor(String(data.error), data.limit ?? limit),
        });
        return;
      }

      // A transition so the report slides in (<ViewTransition enter="slide-up">).
      startTransition(() => {
        setAudit({
          status: "done",
          good: data.good ?? [],
          criticalCount: data.criticalCount ?? 0,
          importantCount: data.importantCount ?? 0,
          reportLang: lang,
        });
      });
    } catch {
      setAudit({ status: "error", error: t.errors.network });
    }
  }

  async function unlock() {
    if (!email.trim() || unlocking) return;
    setUnlocking(true);
    setAudit((prev) => ({ ...prev, error: undefined }));

    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          url: url.trim(),
          // The report was cached under the language it ran in. Sending the
          // current toggle value would look up a key that does not exist.
          lang: audit.reportLang ?? lang,
          company,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAudit((prev) => ({
          ...prev,
          error: messageFor(String(data.error), limit),
        }));
        return;
      }

      startTransition(() => {
        setAudit({
          status: "unlocked",
          good: data.good ?? [],
          critical: data.critical ?? [],
          important: data.important ?? [],
          reportLang: audit.reportLang,
        });
      });
    } catch {
      setAudit((prev) => ({ ...prev, error: t.errors.network }));
    } finally {
      setUnlocking(false);
    }
  }

  // Home-page handoff: a URL typed into the home AuditBand / hero runs once on
  // arrival. Read-once, 120s expiry, never from the query string — see
  // lib/showcase/auditHandoff. An effect event, so it sees the current lang.
  const runHandoff = useEffectEvent((handedOver: string) => {
    setUrl(handedOver);
    runAudit(handedOver);
  });
  useEffect(() => {
    const handedOver = consumeAuditHandoff();
    if (handedOver) queueMicrotask(() => runHandoff(handedOver));
  }, []);

  const showResults = audit.status === "done" || audit.status === "unlocked";

  return (
    <main id="main" style={{ background: C.bg, minHeight: "100vh", color: C.text }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 24px 120px" }}>

        {/* Lang toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 40 }}>
          {(["en", "ru"] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              style={{
                padding: "4px 14px",
                borderRadius: 4,
                border: `1px solid ${lang === l ? C.accent : C.border}`,
                background: lang === l ? C.accent : "transparent",
                color: lang === l ? "#fff" : C.muted,
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "var(--font-sans)",
                fontWeight: 500,
                letterSpacing: "0.08em",
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Eyebrow */}
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: C.accent,
            marginBottom: 20,
          }}
        >
          {t.eyebrow}
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 4.6vw, 3.2rem)",
            fontWeight: 300,
            lineHeight: 1.14,
            letterSpacing: "-0.02em",
            color: C.text,
            marginBottom: 8,
          }}
        >
          {t.headline}
          <br />
          <em>{t.subheadline}</em>
        </h1>

        <p
          style={{
            color: C.muted,
            fontSize: 16,
            lineHeight: 1.7,
            marginBottom: 40,
            maxWidth: 520,
            fontFamily: "var(--font-sans)",
            fontWeight: 300,
          }}
        >
          {t.description}
        </p>

        {/* URL input */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 48 }}>
          <label htmlFor="audit-url" style={{ position: "absolute", left: -9999 }}>
            {t.placeholder}
          </label>
          <SharedName name="audit-field">
            <input
              id="audit-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runAudit()}
              placeholder={t.placeholder}
              style={{
                flex: 1,
                minWidth: 220,
                padding: "13px 16px",
                borderRadius: 4,
                border: `1px solid ${C.cardBorder}`,
                background: "#fff",
                color: C.text,
                fontSize: 16,
                fontFamily: "var(--font-sans)",
              }}
            />
          </SharedName>
          <button
            onClick={() => runAudit()}
            disabled={audit.status === "loading"}
            style={{
              padding: "13px 24px",
              borderRadius: 4,
              border: "none",
              background: audit.status === "loading" ? "#b07886" : C.accent,
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: audit.status === "loading" ? "not-allowed" : "pointer",
              fontFamily: "var(--font-sans)",
              letterSpacing: "0.01em",
              whiteSpace: "nowrap",
              transition: "background 200ms",
            }}
          >
            {audit.status === "loading" ? t.loading : t.cta}
          </button>
        </div>

        {/* Error */}
        {audit.status === "error" && (
          <div
            role="alert"
            style={{
              padding: "14px 18px",
              borderRadius: 4,
              background: C.criticalBg,
              border: `1px solid ${C.criticalBorder}`,
              color: C.critical,
              marginBottom: 32,
              fontSize: 14,
              fontFamily: "var(--font-sans)",
            }}
          >
            {audit.error}
          </div>
        )}

        {/* Results */}
        {showResults && (
          <ViewTransition enter="slide-up" default="none">
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

            {/* Good — always visible */}
            <Section
              title={t.goodTitle}
              items={audit.good ?? []}
              accent={C.good}
              bg={C.goodBg}
              border={C.goodBorder}
              dot="#3f8f6d"
            />

            {audit.status === "done" ? (
              <div style={{ position: "relative" }}>
                <div
                  aria-hidden="true"
                  style={{
                    filter: "blur(5px)",
                    pointerEvents: "none",
                    userSelect: "none",
                    opacity: 0.55,
                  }}
                >
                  <Section
                    title={t.criticalTitle}
                    items={hiddenItems(audit.criticalCount ?? 3, t)}
                    accent={C.critical}
                    bg={C.criticalBg}
                    border={C.criticalBorder}
                    dot="#d05030"
                  />
                  <div style={{ marginTop: 24 }} />
                  <Section
                    title={t.importantTitle}
                    items={hiddenItems(audit.importantCount ?? 3, t)}
                    accent={C.important}
                    bg={C.importantBg}
                    border={C.importantBorder}
                    dot="#c09030"
                  />
                </div>

                {/* Gate */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(234,236,231,0.6)",
                    zIndex: 10,
                    borderRadius: 8,
                  }}
                >
                  <div
                    style={{
                      background: "#fff",
                      border: `1px solid ${C.cardBorder}`,
                      borderRadius: 8,
                      padding: "32px 28px",
                      maxWidth: 400,
                      width: "90%",
                      boxShadow: "0 4px 24px rgba(20,24,26,0.08)",
                    }}
                  >
                    {/* Issue counts */}
                    <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                      <Badge
                        count={audit.criticalCount ?? 0}
                        label={t.criticalBadge(audit.criticalCount ?? 0)}
                        color="#a83f22"
                        bg={C.criticalBg}
                        border={C.criticalBorder}
                      />
                      <Badge
                        count={audit.importantCount ?? 0}
                        label={t.importantBadge(audit.importantCount ?? 0)}
                        color="#8a6410"
                        bg={C.importantBg}
                        border={C.importantBorder}
                      />
                    </div>

                    <h2
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1.6rem",
                        fontWeight: 400,
                        color: C.text,
                        marginBottom: 8,
                        lineHeight: 1.24,
                      }}
                    >
                      {t.gateHeadline}
                    </h2>
                    <p style={{ color: C.muted, fontSize: 14, marginBottom: 20, fontFamily: "var(--font-sans)", lineHeight: 1.6 }}>
                      {t.gateSub}
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <label htmlFor="audit-email" style={{ position: "absolute", left: -9999 }}>
                        {t.emailPlaceholder}
                      </label>
                      <input
                        id="audit-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && unlock()}
                        placeholder={t.emailPlaceholder}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 4,
                          border: `1px solid ${C.cardBorder}`,
                          background: C.bg,
                          color: C.text,
                          fontSize: 16,
                          fontFamily: "var(--font-sans)",
                        }}
                      />
                      {/* Honeypot — hidden from people, irresistible to bots */}
                      <input
                        type="text"
                        name="company"
                        tabIndex={-1}
                        autoComplete="off"
                        aria-hidden="true"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        style={{ position: "absolute", left: -9999, width: 1, height: 1 }}
                      />
                      <button
                        onClick={unlock}
                        disabled={unlocking}
                        style={{
                          padding: "12px 20px",
                          borderRadius: 4,
                          border: "none",
                          background: unlocking ? "#b07886" : C.accent,
                          color: "#fff",
                          fontSize: 14,
                          fontWeight: 500,
                          cursor: unlocking ? "not-allowed" : "pointer",
                          fontFamily: "var(--font-sans)",
                          letterSpacing: "0.01em",
                          transition: "background 200ms",
                        }}
                      >
                        {unlocking ? t.unlocking : t.unlockBtn}
                      </button>
                      {audit.error && (
                        <p role="alert" style={{ color: C.critical, fontSize: 13, marginTop: 2, fontFamily: "var(--font-sans)" }}>
                          {audit.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <Section
                  title={t.criticalTitle}
                  items={audit.critical ?? []}
                  accent={C.critical}
                  bg={C.criticalBg}
                  border={C.criticalBorder}
                  dot="#d05030"
                />
                <Section
                  title={t.importantTitle}
                  items={audit.important ?? []}
                  accent={C.important}
                  bg={C.importantBg}
                  border={C.importantBorder}
                  dot="#c09030"
                />
              </>
            )}
          </div>
          </ViewTransition>
        )}

        {/* CTA after unlock */}
        {audit.status === "unlocked" && (
          <ViewTransition enter="slide-up" default="none">
          <div
            style={{
              marginTop: 56,
              padding: "40px 32px",
              borderRadius: 8,
              border: `1px solid ${C.cardBorder}`,
              background: "#fff",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: C.accent,
                marginBottom: 12,
              }}
            >
              {t.nextStep}
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.9rem",
                fontWeight: 300,
                color: C.text,
                marginBottom: 10,
              }}
            >
              {t.ctaBlock}
            </h2>
            <p style={{ color: C.muted, marginBottom: 24, fontSize: 15, fontFamily: "var(--font-sans)", fontWeight: 300 }}>
              {t.ctaSub}
            </p>
            <a
              href="/contact"
              style={{
                display: "inline-block",
                padding: "13px 28px",
                borderRadius: 4,
                background: C.accent,
                color: "#fff",
                fontWeight: 500,
                fontSize: 14,
                textDecoration: "none",
                fontFamily: "var(--font-sans)",
                letterSpacing: "0.01em",
              }}
            >
              {t.ctaBtn}
            </a>
            <Link
              href="/pricing"
              transitionTypes={["nav-forward"]}
              style={{
                display: "inline-block",
                marginLeft: 20,
                padding: "13px 0",
                color: C.text,
                fontWeight: 500,
                fontSize: 14,
                textDecoration: "underline",
                textUnderlineOffset: 4,
                fontFamily: "var(--font-sans)",
              }}
            >
              {t.seePrices}
            </Link>
          </div>
          </ViewTransition>
        )}
      </div>
      {/* The report slides up as it appears (React <ViewTransition enter="slide-up">).
          Reduced motion keeps the global ::view-transition crossfade override. */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          ::view-transition-new(.slide-up):only-child {
            animation: audit-slide-up 320ms cubic-bezier(0.16, 1, 0.3, 1) both;
          }
        }
        @keyframes audit-slide-up {
          from { opacity: 0; transform: translateY(16px); }
        }
      `}</style>
    </main>
  );
}

// --- Sub-components ---

function Section({
  title,
  items,
  accent,
  bg,
  border,
  dot,
}: {
  title: string;
  items: AuditItem[];
  accent: string;
  bg: string;
  border: string;
  dot: string;
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: dot,
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        <h3
          style={{
            fontSize: 11,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: accent,
            fontFamily: "var(--font-sans)",
            margin: 0,
          }}
        >
          {title}
        </h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              padding: "16px 18px",
              borderRadius: 6,
              background: bg,
              border: `1px solid ${border}`,
            }}
          >
            <div
              style={{
                fontWeight: 500,
                marginBottom: item.detail ? 4 : 0,
                fontSize: 14,
                color: accent,
                fontFamily: "var(--font-sans)",
              }}
            >
              {item.title}
            </div>
            {item.detail && (
              <div
                style={{
                  fontSize: 14,
                  color: C.muted,
                  lineHeight: 1.65,
                  fontFamily: "var(--font-sans)",
                  fontWeight: 300,
                }}
              >
                {item.detail}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Badge({
  count,
  label,
  color,
  bg,
  border,
}: {
  count: number;
  label: string;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 20,
        background: bg,
        border: `1px solid ${border}`,
        color,
        fontSize: 12,
        fontWeight: 500,
        fontFamily: "var(--font-sans)",
      }}
    >
      <strong>{count}</strong> {label}
    </span>
  );
}

function hiddenItems(count: number, t: (typeof T)[Lang]): AuditItem[] {
  return Array.from({ length: Math.max(count, 1) }, (_, i) => ({
    title: t.hiddenTitle(i + 1),
    detail: t.hiddenBody,
  }));
}
