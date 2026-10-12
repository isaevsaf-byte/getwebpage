import type { Metadata } from "next";
import { connection } from "next/server";
import { dailyCounts, recent, EVENTS, type EventName } from "@/lib/stats";
import { telegramConfigured, telegramRecentChats } from "@/lib/notify";

export const metadata: Metadata = {
  title: "Пульт — GetWebPage",
  robots: { index: false, follow: false },
};

/* Labels are Russian on purpose — this page has exactly one reader. */
const LABELS: Record<EventName, { title: string; hint: string; tone: "warm" | "hot" | "money" | "cold" }> = {
  audit_run: { title: "Аудиты", hint: "кто-то проверил свой сайт", tone: "warm" },
  audit_lead: { title: "Лиды с аудита", hint: "оставили email", tone: "hot" },
  enquiry: { title: "Заявки", hint: "форма «Got a complex project?»", tone: "hot" },
  checkout_started: { title: "Открыли оплату", hint: "нажали Get started", tone: "warm" },
  order_paid: { title: "Оплатили депозит", hint: "деньги пришли", tone: "money" },
  checkout_abandoned: { title: "Бросили оплату", hint: "дошли до Stripe и ушли", tone: "cold" },
};

interface AuditLead { email: string; url: string; ts: number }
interface Enquiry { name: string; email: string; businessType: string; brief: string; ts: number }
interface Order { tier: string; name: string; email: string; deposit: number; full: number; ts: number }
interface Abandoned { email: string; tier: string; ts: number }

function when(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString("ru-RU", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminPage() {
  await connection(); // always live — never a cached snapshot

  const [days, leads, enquiries, orders, abandoned, chats] = await Promise.all([
    dailyCounts(30),
    recent<AuditLead>("leads:all", 15),
    recent<Enquiry>("leads:enquiries", 15),
    recent<Order>("leads:orders", 15),
    recent<Abandoned>("leads:abandoned", 15),
    process.env.TELEGRAM_CHAT_ID ? Promise.resolve([]) : telegramRecentChats(),
  ]);

  const names = Object.keys(EVENTS) as EventName[];
  const sum = (n: EventName, last: number) =>
    days.slice(-last).reduce((s, d) => s + d.counts[n], 0);

  const tg = telegramConfigured();
  const tokenOnly = Boolean(process.env.TELEGRAM_BOT_TOKEN) && !tg;

  return (
    <main className="adm">
      <style>{CSS}</style>

      <header className="adm-head">
        <div>
          <div className="adm-eyebrow">GetWebPage · пульт</div>
          <h1>Что происходит на сайте</h1>
        </div>
        <div className={`adm-status ${tg ? "ok" : "warn"}`}>
          <span className="dot" />
          {tg ? "Telegram-алерты включены" : "Telegram не подключён"}
        </div>
      </header>

      {!tg && (
        <section className="adm-setup">
          <h2>Подключить уведомления в Telegram — 3 минуты</h2>
          <ol>
            <li>В Telegram открой <b>@BotFather</b> → <code>/newbot</code> → получи токен.</li>
            <li>
              В Vercel → getwebpage → Settings → Environment Variables добавь{" "}
              <code>TELEGRAM_BOT_TOKEN</code> и сделай Redeploy.
            </li>
            <li>Напиши своему боту любое сообщение и обнови эту страницу.</li>
            <li>
              Ниже появится твой chat id — добавь его как <code>TELEGRAM_CHAT_ID</code> и снова Redeploy.
            </li>
          </ol>
          {tokenOnly && (
            <div className="adm-chats">
              {chats.length === 0 ? (
                <p>Токен на месте. Теперь напиши боту любое сообщение и обнови страницу.</p>
              ) : (
                <>
                  <p>Боту писали из этих чатов — скопируй свой id:</p>
                  <ul>
                    {chats.map((c) => (
                      <li key={c.id}>
                        <code>{c.id}</code> — {c.name || "без имени"}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </section>
      )}

      <section className="adm-grid" aria-label="Счётчики событий">
        {names.map((n) => {
          const series = days.map((d) => d.counts[n]);
          const max = Math.max(1, ...series);
          const l = LABELS[n];
          return (
            <article key={n} className={`adm-card tone-${l.tone}`}>
              <div className="adm-card-top">
                <h3>{l.title}</h3>
                <span className="adm-hint">{l.hint}</span>
              </div>
              <div className="adm-nums">
                <div><b>{sum(n, 1)}</b><span>сегодня</span></div>
                <div><b>{sum(n, 7)}</b><span>7 дней</span></div>
                <div><b>{sum(n, 30)}</b><span>30 дней</span></div>
              </div>
              <svg className="adm-spark" viewBox="0 0 300 40" preserveAspectRatio="none" aria-hidden="true">
                {series.map((v, i) => {
                  const h = v === 0 ? 2 : Math.max(4, (v / max) * 38);
                  return (
                    <rect
                      key={i}
                      x={i * 10 + 1}
                      y={40 - h}
                      width={8}
                      height={h}
                      rx={1.5}
                      className={v === 0 ? "zero" : ""}
                    />
                  );
                })}
              </svg>
            </article>
          );
        })}
      </section>

      <section className="adm-visitors">
        <div>
          <h2>Посетители</h2>
          <p>
            Сколько людей зашло, откуда, с каких устройств и на какие страницы — считает Vercel Analytics.
            Он без cookies, поэтому видит <b>всех</b>, а не только тех, кто нажал Accept.
          </p>
        </div>
        <div className="adm-links">
          <a href="https://vercel.com/isaevsaf-bytes-projects/getwebpage/analytics" target="_blank" rel="noopener noreferrer">
            Vercel Analytics →
          </a>
          <a href="https://dashboard.stripe.com/payments" target="_blank" rel="noopener noreferrer">
            Stripe →
          </a>
          <a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer">
            Google Analytics →
          </a>
          <a href="https://resend.com/emails" target="_blank" rel="noopener noreferrer">
            Письма (Resend) →
          </a>
        </div>
      </section>

      <div className="adm-lists">
        <List title="Оплаты" empty="Пока ни одной.">
          {orders.map((o) => (
            <li key={o.ts}>
              <div className="row1"><b>{o.tier}</b> · £{o.deposit} из £{o.full}<time>{when(o.ts)}</time></div>
              <div className="row2">{o.name} · <a href={`mailto:${o.email}`}>{o.email}</a></div>
            </li>
          ))}
        </List>

        <List title="Заявки" empty="Пока ни одной.">
          {enquiries.map((e) => (
            <li key={e.ts}>
              <div className="row1"><b>{e.name}</b> · {e.businessType}<time>{when(e.ts)}</time></div>
              <div className="row2"><a href={`mailto:${e.email}`}>{e.email}</a></div>
              <p className="brief">{e.brief}</p>
            </li>
          ))}
        </List>

        <List title="Лиды с аудита" empty="Пока ни одного.">
          {leads.map((l) => (
            <li key={l.ts}>
              <div className="row1"><a href={`mailto:${l.email}`}>{l.email}</a><time>{when(l.ts)}</time></div>
              <div className="row2">{l.url}</div>
            </li>
          ))}
        </List>

        <List title="Бросили оплату" empty="Никто не бросал — или не вводил email.">
          {abandoned.map((a) => (
            <li key={a.ts}>
              <div className="row1"><a href={`mailto:${a.email}`}>{a.email}</a><time>{when(a.ts)}</time></div>
              <div className="row2">Пакет: {a.tier}</div>
            </li>
          ))}
        </List>
      </div>

      <footer className="adm-foot">
        Время — по Лондону. Счётчики хранятся 13 месяцев. Утренняя сводка приходит в Telegram в 08:00 UTC.
      </footer>
    </main>
  );
}

function List({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="adm-list">
      <h2>
        {title} <span>{children.length}</span>
      </h2>
      {children.length === 0 ? <p className="empty">{empty}</p> : <ul>{children}</ul>}
    </section>
  );
}

const CSS = `
.adm{min-height:100vh;background:#101416;color:#e3e6e0;font-family:var(--font-sans),system-ui,sans-serif;
  padding:40px clamp(16px,4vw,48px) 64px;max-width:1280px;margin:0 auto}
.adm a{color:#cf8794;text-decoration:none}
.adm a:hover{text-decoration:underline}
.adm code{font-family:var(--font-mono),monospace;font-size:.85em;background:#1c2326;padding:2px 6px;border-radius:3px;color:#e3e6e0}
.adm-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;
  border-bottom:1px solid #242a2c;padding-bottom:20px;margin-bottom:28px}
.adm-eyebrow{font-family:var(--font-mono),monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#cf8794;margin-bottom:8px}
.adm h1{font-family:var(--font-display),Georgia,serif;font-weight:400;font-size:clamp(1.6rem,3.4vw,2.4rem);letter-spacing:-.015em}
.adm-status{display:flex;align-items:center;gap:8px;font-size:13px;padding:8px 14px;border:1px solid #2c3437;border-radius:999px}
.adm-status .dot{width:8px;height:8px;border-radius:50%}
.adm-status.ok .dot{background:#5ec49c;box-shadow:0 0 0 3px rgba(94,196,156,.18)}
.adm-status.warn .dot{background:#dda44f;box-shadow:0 0 0 3px rgba(221,164,79,.18)}
.adm-setup{border:1px solid #57411d;background:#1d1810;border-radius:6px;padding:20px 22px;margin-bottom:28px}
.adm-setup h2{font-size:15px;font-weight:600;margin-bottom:12px;color:#f0c27a}
.adm-setup ol{padding-left:20px;list-style:decimal;display:grid;gap:8px;font-size:14px;line-height:1.55;color:#d8dcd6}
.adm-chats{margin-top:14px;padding-top:14px;border-top:1px solid #3a2f1c;font-size:14px}
.adm-chats ul{list-style:none;margin-top:8px;display:grid;gap:6px}
.adm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;margin-bottom:28px}
.adm-card{background:#161c1f;border:1px solid #242a2c;border-radius:6px;padding:16px 16px 12px;display:flex;flex-direction:column;gap:12px}
.adm-card-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.adm-card h3{font-size:14px;font-weight:600}
.adm-hint{font-size:11px;color:#8a918d;text-align:right}
.adm-nums{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.adm-nums b{display:block;font-family:var(--font-display),Georgia,serif;font-size:28px;font-weight:400;line-height:1;font-variant-numeric:tabular-nums}
.adm-nums span{font-size:11px;color:#8a918d}
.adm-spark{width:100%;height:40px}
.adm-spark rect{fill:currentColor}
.adm-spark rect.zero{fill:#2a3134}
.tone-hot{color:#e3e6e0}.tone-hot .adm-spark{color:#cf8794}.tone-hot{border-color:#3d2a2f}
.tone-money .adm-spark{color:#5ec49c}.tone-money{border-color:#24513f}
.tone-warm .adm-spark{color:#c0c6c2}
.tone-cold .adm-spark{color:#dda44f}
.adm-visitors{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;align-items:center;
  background:#161c1f;border:1px solid #242a2c;border-radius:6px;padding:20px 22px;margin-bottom:28px}
.adm-visitors h2{font-size:15px;font-weight:600;margin-bottom:6px}
.adm-visitors p{font-size:14px;line-height:1.6;color:#c0c6c2;max-width:62ch}
.adm-links{display:flex;flex-wrap:wrap;gap:8px}
.adm-links a{border:1px solid #2c3437;border-radius:4px;padding:8px 12px;font-size:13px;color:#e3e6e0}
.adm-links a:hover{border-color:#cf8794;text-decoration:none}
.adm-lists{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}
.adm-list{background:#161c1f;border:1px solid #242a2c;border-radius:6px;padding:16px}
.adm-list h2{font-size:14px;font-weight:600;margin-bottom:10px;display:flex;justify-content:space-between}
.adm-list h2 span{font-family:var(--font-mono),monospace;color:#8a918d;font-weight:400}
.adm-list ul{list-style:none;display:grid}
.adm-list li{padding:10px 0;border-top:1px solid #222a2d;font-size:13px;line-height:1.5}
.adm-list .row1{display:flex;gap:8px;justify-content:space-between;align-items:baseline}
.adm-list time{color:#8a918d;font-size:11px;white-space:nowrap;margin-left:auto}
.adm-list .row2{color:#9aa19d;word-break:break-all}
.adm-list .brief{color:#c0c6c2;margin-top:4px;white-space:pre-wrap}
.adm-list .empty{font-size:13px;color:#8a918d}
.adm-foot{margin-top:28px;font-size:12px;color:#8a918d}
`;
