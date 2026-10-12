/**
 * Owner alerts. Telegram first — it reaches the phone instantly — with email
 * still sent by the individual routes. Every function here swallows its own
 * errors: a failed alert must never break a visitor's request.
 */

const TG_API = "https://api.telegram.org";

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

/** Sends a plain-text Telegram message to the owner. Plain text on purpose —
 *  visitor-supplied strings can't inject formatting or links. */
export async function telegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  try {
    const res = await fetch(`${TG_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.slice(0, 4000),
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error("Telegram send failed:", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (err) {
    console.error("Telegram send error:", err);
    return false;
  }
}

/** Shortens visitor text for a notification preview. */
export function clip(value: unknown, max = 280): string {
  const s = String(value ?? "").replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/**
 * Lists chats that have messaged the bot, so the owner can find their chat id
 * without touching the Telegram API by hand. Used by the /admin setup panel.
 */
export async function telegramRecentChats(): Promise<{ id: number; name: string }[]> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return [];
  try {
    const res = await fetch(`${TG_API}/bot${token}/getUpdates`, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    const data = await res.json();
    const seen = new Map<number, string>();
    for (const u of data?.result ?? []) {
      const chat = u.message?.chat ?? u.my_chat_member?.chat;
      if (chat?.id) {
        seen.set(chat.id, [chat.first_name, chat.last_name, chat.username && `@${chat.username}`, chat.title]
          .filter(Boolean).join(" "));
      }
    }
    return [...seen].map(([id, name]) => ({ id, name }));
  } catch {
    return [];
  }
}
