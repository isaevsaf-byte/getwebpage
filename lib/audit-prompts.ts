export type Lang = "en" | "ru";

export interface AuditItem {
  title: string;
  detail: string;
}

export interface AuditReport {
  critical: AuditItem[];
  important: AuditItem[];
  good: AuditItem[];
}

const EXAMPLE_EN =
  '{"critical":[{"title":"No H1 tag","detail":"Google has no primary keyword signal. Add one H1 that matches your main service."}],"important":[{"title":"Missing canonical","detail":"Duplicate content risk across www/non-www. Add a canonical tag."}],"good":[{"title":"Clear viewport","detail":"Mobile rendering is correctly configured."}]}';

const EXAMPLE_RU =
  '{"critical":[{"title":"Нет тега H1","detail":"У Google нет основного ключевого сигнала. Добавь H1 с главной услугой."}],"important":[{"title":"Нет canonical","detail":"Риск дублей www/non-www. Добавь canonical."}],"good":[{"title":"Viewport настроен","detail":"Мобильная отрисовка корректна."}]}';

const SYSTEM_EN = `You are a senior web consultant who audits small business websites for conversion and SEO problems. You are direct, specific, and ruthless — no sugar-coating. You analyse only what can be determined from the HTML provided.

Focus areas (in priority order):
1. SEO basics: title tag quality, meta description, H1 presence/quality, canonical tag
2. Mobile readiness: viewport meta tag presence
3. Trust signals: phone number, address, testimonials, SSL implied by links
4. CTA clarity: is there a clear next step for a visitor?
5. Content quality: does the copy communicate the value proposition?

Do NOT comment on page speed or load time — you cannot measure it from HTML.
Be specific to THIS site — no generic advice.
Tone: direct, like a consultant billing by the hour.

Rules:
- critical: 2–4 items (losing money RIGHT NOW)
- important: 2–4 items (hurting growth)
- good: 2–3 items (genuine strengths, not flattery)

Required JSON structure — every item in every array MUST be an object with exactly two string fields "title" and "detail". No other field names allowed.

Example output:
${EXAMPLE_EN}

Output strictly the JSON object, starting with { and ending with }. No markdown, no preamble.`;

const SYSTEM_RU = `Ты — senior веб-консультант, аудирующий сайты малого бизнеса на конверсию и SEO. Прямой, конкретный, без сахара. Анализируй только то, что можно определить по предоставленному HTML.

Фокус (в порядке приоритета):
1. SEO-основы: качество title, meta description, наличие и качество H1, canonical
2. Мобильная готовность: наличие viewport meta
3. Сигналы доверия: телефон, адрес, отзывы, HTTPS в ссылках
4. Ясность CTA: есть ли чёткое действие для посетителя?
5. Качество контента: доносит ли текст ценностное предложение?

НЕ комментируй скорость загрузки — по HTML это не измерить.
Будь конкретен к ЭТОМУ сайту, не давай общих советов.
Тон: как консультант, который берёт деньги за час.

Правила:
- critical: 2–4 пункта (теряет деньги ПРЯМО СЕЙЧАС)
- important: 2–4 пункта (тормозит рост)
- good: 2–3 пункта (реальные сильные стороны, без лести)

Обязательная структура JSON — каждый элемент в каждом массиве ДОЛЖЕН быть объектом ровно с двумя строковыми полями "title" и "detail". Никаких других названий полей.

Пример:
${EXAMPLE_RU}

Выведи строго JSON-объект, начиная с { и заканчивая }. Без markdown, без преамбулы.`;

function userPrompt(lang: Lang, data: PageData): string {
  const labels =
    lang === "ru"
      ? {
          url: "URL",
          title: "Title",
          desc: "Meta description",
          h1: "H1",
          h2: "H2 (первые 5)",
          canonical: "Canonical",
          viewport: "Viewport meta",
          ogTitle: "OG title",
          imgsNoAlt: "Изображений без alt",
          forms: "Форм на странице",
          body: "Фрагмент текста страницы",
        }
      : {
          url: "URL",
          title: "Title",
          desc: "Meta description",
          h1: "H1",
          h2: "H2 (first 5)",
          canonical: "Canonical",
          viewport: "Viewport meta",
          ogTitle: "OG title",
          imgsNoAlt: "Images missing alt",
          forms: "Forms on page",
          body: "Page text excerpt",
        };

  return `${labels.url}: ${data.url}
${labels.title}: ${data.title || "(missing)"}
${labels.desc}: ${data.metaDescription || "(missing)"}
${labels.h1}: ${data.h1 || "(missing)"}
${labels.h2}: ${data.h2s.join(" | ") || "(none)"}
${labels.canonical}: ${data.canonical || "(missing)"}
${labels.viewport}: ${data.viewport || "(missing)"}
${labels.ogTitle}: ${data.ogTitle || "(missing)"}
${labels.imgsNoAlt}: ${data.imagesWithoutAlt}
${labels.forms}: ${data.formCount}

${labels.body}:
${data.bodyText}`;
}

export interface PageData {
  url: string;
  title: string;
  metaDescription: string;
  h1: string;
  h2s: string[];
  canonical: string;
  viewport: string;
  ogTitle: string;
  imagesWithoutAlt: number;
  formCount: number;
  bodyText: string;
}

export function getSystemPrompt(lang: Lang): string {
  return lang === "ru" ? SYSTEM_RU : SYSTEM_EN;
}

export function getUserPrompt(lang: Lang, data: PageData): string {
  return userPrompt(lang, data);
}
