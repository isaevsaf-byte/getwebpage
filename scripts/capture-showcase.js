#!/usr/bin/env node
/**
 * Captures the four live portfolio sites for the showcase home page.
 *
 *   node scripts/capture-showcase.js            # all four sites
 *   node scripts/capture-showcase.js silkbees   # just one (or several) slugs
 *
 * Writes public/showcase/sites/{slug}-{variant}.webp:
 *   1024    1280×800 viewport at 2x, downscaled to 1024×640 (hero fan panes, RealSites)  ≤ 70 KB
 *   2x      1280×800 viewport at 2x, full 2560×1600 (/work morph targets)                ≤ 220 KB
 *   tall    1280 wide, top 4096 CSS px of the page at 1x (RealSites scroll-through)      ≤ 260 KB
 *   mobile  390×844 viewport at 2x → 780×1688 (mobile cards)                             ≤ 120 KB
 *
 * Each variant starts at its spec quality. If the file is over budget, the
 * quality steps down (never below QUALITY_FLOOR) until it fits. Anything still
 * over budget is NOT written and the script exits 1.
 *
 * Notes:
 * - Uses chrome-headless-shell (`headless: 'shell'`). The new headless mode
 *   hung on Page.captureScreenshot on the owner's Mac (Oct 2026).
 * - The tall capture is stitched from viewport-sized slices taken while each
 *   slice is on screen, so "animate when in view" sections are captured in
 *   their finished state instead of blank.
 * - Captures are taken as lossless PNG, then drawn onto a canvas (downscaled
 *   with high-quality smoothing, or stacked) and encoded once as WebP. The
 *   real pixel size of every file is read back from its header and checked.
 * - Cookie / consent banners are hidden before every capture.
 * - Budgets use 1 KB = 1000 bytes.
 *
 * Re-run monthly, and after any of the sites is redesigned.
 */

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const SITES = [
  { slug: "beautasy", url: "https://beautasy.co.uk" },
  { slug: "bektothefuture", url: "https://bektothefuture.com" },
  { slug: "silkbees", url: "https://silkbees.co.uk" },
  { slug: "safarisaev", url: "https://safarisaev.ai" },
];

const KB = 1000;
const VARIANTS = {
  1024: { quality: 82, budget: 70 * KB },
  "2x": { quality: 80, budget: 220 * KB },
  tall: { quality: 72, budget: 260 * KB },
  mobile: { quality: 78, budget: 120 * KB },
};
const QUALITY_STEP = 6;
const QUALITY_FLOOR = 46;

const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };
const TALL_MAX = 4096;
const ATTEMPTS = 3;

const OUT = path.join(__dirname, "../public/showcase/sites");

const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";
const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const kb = (n) => `${(n / KB).toFixed(1)} KB`;

/** Hides cookie/consent UI. Never hides html/body/main or anything holding the page's main content. */
async function hideCookieBanners(page) {
  await page.evaluate(() => {
    const sel = [
      "[class*=cookie i]",
      "[id*=cookie i]",
      "[class*=consent i]",
      "[id*=consent i]",
      "[aria-label*=cookie i]",
      "[class*=gdpr i]",
      "#onetrust-banner-sdk",
      "#onetrust-consent-sdk",
      "#CybotCookiebotDialog",
      ".cc-window",
      ".cky-consent-container",
    ].join(",");
    for (const el of document.querySelectorAll(sel)) {
      if (["HTML", "BODY", "MAIN"].includes(el.tagName)) continue;
      if (el.querySelector("main, h1")) continue;
      el.style.setProperty("display", "none", "important");
    }
    // Banners often lock scrolling while open.
    for (const el of [document.documentElement, document.body]) {
      if (el && getComputedStyle(el).overflow === "hidden") el.style.setProperty("overflow", "visible", "important");
    }
  });
}

/** Waits for web fonts and for every image currently in the viewport. */
async function settle(page, extraMs) {
  await page.evaluate(async () => {
    try {
      await document.fonts.ready;
    } catch {}
    const vh = window.innerHeight;
    const imgs = Array.from(document.images).filter((img) => {
      const r = img.getBoundingClientRect();
      return r.bottom > 0 && r.top < vh && !img.complete;
    });
    await Promise.race([
      Promise.all(
        imgs.map(
          (img) =>
            new Promise((res) => {
              img.addEventListener("load", res, { once: true });
              img.addEventListener("error", res, { once: true });
            }),
        ),
      ),
      new Promise((res) => setTimeout(res, 6000)),
    ]);
  });
  await sleep(extraMs);
}

/**
 * Waits until the visible text stops changing (typewriter headlines, counters),
 * up to maxMs. A looping typewriter never settles; then we just take the frame.
 */
async function waitForStableText(page, quietMs = 1500, maxMs = 10000) {
  const start = Date.now();
  let last = await page.evaluate(() => document.body.innerText);
  let quietSince = Date.now();
  while (Date.now() - start < maxMs) {
    await sleep(250);
    const now = await page.evaluate(() => document.body.innerText);
    if (now !== last) {
      last = now;
      quietSince = Date.now();
    } else if (Date.now() - quietSince >= quietMs) {
      return true;
    }
  }
  return false;
}

async function open(browser, url, viewport, ua, attempt) {
  const page = await browser.newPage();
  await page.setUserAgent(ua);
  await page.setExtraHTTPHeaders({ "Accept-Language": "en-GB,en;q=0.9" });
  await page.setViewport(viewport);
  let res;
  try {
    res = await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 + attempt * 15000 });
  } catch (err) {
    // Sites with long-polling never reach networkidle0. Fall back to "load" + a wait.
    if (!/timeout/i.test(String(err && err.message))) throw err;
    console.log(`    networkidle0 timed out, continuing after load`);
    res = await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await sleep(3000);
  }
  if (!res || res.status() >= 400) throw new Error(`HTTP ${res ? res.status() : "no response"}`);
  await hideCookieBanners(page);
  // Let hero intros, typewriters and fades finish. Longer on each retry.
  await settle(page, 3500 + attempt * 2000);
  if (!(await waitForStableText(page))) console.log(`    text still changing after 10s (looping animation?)`);
  await hideCookieBanners(page);
  return page;
}

/**
 * The encoder: a blank page with one <canvas>. Every variant is drawn onto it
 * from lossless PNG captures (scaled with high-quality smoothing, or stacked
 * for the tall scroll-through), then screenshotted once as WebP.
 *
 * Why not Puppeteer's clip.scale? It is silently ignored when
 * captureBeyondViewport is false, and with it true Chrome re-lays-out the live
 * site. Drawing from the PNG keeps the pane and 2x files from one frame.
 */
async function openEncoder(browser) {
  const page = await browser.newPage();
  await page.setContent(
    `<!doctype html><html><head><style>html,body{margin:0;padding:0;background:#fff}canvas{display:block}</style></head><body><canvas id="c"></canvas></body></html>`,
  );
  return page;
}

/** parts: [{ png, dy, dh }] — each PNG is drawn at y=dy, scaled to width × dh. */
async function compose(encoder, parts, width, height) {
  await encoder.setViewport({ width, height, deviceScaleFactor: 1 });
  await encoder.evaluate(
    async (parts, width, height) => {
      const c = document.getElementById("c");
      c.width = width;
      c.height = height;
      c.style.width = `${width}px`;
      c.style.height = `${height}px`;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
      for (const part of parts) {
        const img = new Image();
        img.src = `data:image/png;base64,${part.b64}`;
        await img.decode();
        ctx.drawImage(img, 0, part.dy, width, part.dh);
      }
    },
    parts.map((p) => ({ b64: p.png.toString("base64"), dy: p.dy, dh: p.dh })),
    width,
    height,
  );
}

/** Encodes the composed canvas at the spec quality, stepping down until it fits the budget. */
async function encodeWithinBudget(encoder, variant, width, height) {
  const { quality: start, budget } = VARIANTS[variant];
  let quality = start;
  for (;;) {
    const buf = Buffer.from(
      await encoder.screenshot({
        type: "webp",
        quality,
        clip: { x: 0, y: 0, width, height },
        captureBeyondViewport: false,
      }),
    );
    if (buf.length <= budget || quality - QUALITY_STEP < QUALITY_FLOOR) {
      return { buf, quality, ok: buf.length <= budget, budget, expected: [width, height] };
    }
    quality -= QUALITY_STEP;
  }
}

/** Reads the real pixel size from a WebP header (VP8, VP8L or VP8X). */
function webpSize(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X") return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
  if (chunk === "VP8 ") return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  if (chunk === "VP8L") {
    const b = buf.readUInt32LE(21);
    return [1 + (b & 0x3fff), 1 + ((b >> 14) & 0x3fff)];
  }
  return null;
}

/** Scrolls slice by slice, capturing each slice while it is in view; returns PNG slices. */
async function captureTallSlices(page) {
  const docHeight = await page.evaluate(() =>
    Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0),
  );
  const total = Math.min(docHeight, TALL_MAX);
  const vh = DESKTOP.height;
  const slices = [];
  for (let top = 0; top < total; top += vh) {
    const height = Math.min(vh, total - top);
    // The last slice scrolls only as far as the page allows, then crops.
    const scrollTo = Math.min(top, Math.max(0, docHeight - vh));
    await page.evaluate((y) => window.scrollTo({ top: y, left: 0, behavior: "instant" }), scrollTo);
    if (top > 0) {
      // Fixed and sticky chrome (headers, chat buttons) would repeat in every slice.
      await page.evaluate(() => {
        for (const el of document.querySelectorAll("body *")) {
          const pos = getComputedStyle(el).position;
          if (pos === "fixed" || pos === "sticky") el.style.setProperty("visibility", "hidden", "important");
        }
      });
    }
    await hideCookieBanners(page);
    await settle(page, 900);
    // Clip coordinates are document-relative; the slice is on screen now, so
    // captureBeyondViewport:false keeps Chrome from resizing the viewport.
    const png = await page.screenshot({
      type: "png",
      clip: { x: 0, y: top, width: DESKTOP.width, height },
      captureBeyondViewport: false,
    });
    slices.push({ png: Buffer.from(png), dy: top, dh: height });
  }
  return { slices, total };
}

function save(slug, variant, result, report) {
  const file = `${slug}-${variant}.webp`;
  const size = webpSize(result.buf);
  const dims = size ? `${size[0]}×${size[1]}` : "?";
  const line = `${file.padEnd(28)} ${dims.padEnd(10)} q${String(result.quality).padEnd(3)} ${kb(result.buf.length).padStart(9)} / ${kb(result.budget)}`;
  if (!size || size[0] !== result.expected[0] || size[1] !== result.expected[1]) {
    console.log(`  ✗ ${line}  WRONG SIZE (expected ${result.expected.join("×")}) — not written`);
    report.failures.push(`${file} has the wrong size (${dims})`);
    return;
  }
  if (!result.ok) {
    console.log(`  ✗ ${line}  OVER BUDGET — not written`);
    report.failures.push(`${file} over budget (${kb(result.buf.length)} at q${result.quality})`);
    return;
  }
  fs.writeFileSync(path.join(OUT, file), result.buf);
  console.log(`  ✓ ${line}`);
  report.written.push({ file, bytes: result.buf.length, quality: result.quality });
}

async function captureSite(browser, site, report) {
  // Desktop viewport at 2x: one lossless frame feeds both the 2x and the 1024 file.
  const desktop = await open(browser, site.url, { ...DESKTOP, deviceScaleFactor: 2 }, DESKTOP_UA, site.attempt);
  const desktopPng = Buffer.from(
    await desktop.screenshot({ type: "png", clip: { x: 0, y: 0, ...DESKTOP }, captureBeyondViewport: false }),
  );
  await desktop.close();

  // Tall scroll-through at 1x.
  const tallPage = await open(browser, site.url, { ...DESKTOP, deviceScaleFactor: 1 }, DESKTOP_UA, site.attempt);
  const { slices, total } = await captureTallSlices(tallPage);
  await tallPage.close();

  // Phone viewport at 2x.
  const mobilePage = await open(
    browser,
    site.url,
    { ...MOBILE, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    MOBILE_UA,
    site.attempt,
  );
  const mobilePng = Buffer.from(
    await mobilePage.screenshot({ type: "png", clip: { x: 0, y: 0, ...MOBILE }, captureBeyondViewport: false }),
  );
  await mobilePage.close();

  const encoder = await openEncoder(browser);
  await compose(encoder, [{ png: desktopPng, dy: 0, dh: 1600 }], 2560, 1600);
  const large = await encodeWithinBudget(encoder, "2x", 2560, 1600);
  await compose(encoder, [{ png: desktopPng, dy: 0, dh: 640 }], 1024, 640);
  const pane = await encodeWithinBudget(encoder, "1024", 1024, 640);
  await compose(encoder, slices, DESKTOP.width, total);
  const tall = await encodeWithinBudget(encoder, "tall", DESKTOP.width, total);
  await compose(encoder, [{ png: mobilePng, dy: 0, dh: 1688 }], 780, 1688);
  const mobile = await encodeWithinBudget(encoder, "mobile", 780, 1688);
  await encoder.close();

  // Only write once every capture of the site succeeded, so a half-failed run
  // never leaves a mix of old and new frames for one slug.
  save(site.slug, "1024", pane, report);
  save(site.slug, "2x", large, report);
  save(site.slug, "tall", tall, report);
  save(site.slug, "mobile", mobile, report);
}

(async () => {
  const only = process.argv.slice(2);
  const sites = only.length ? SITES.filter((s) => only.includes(s.slug)) : SITES;
  if (!sites.length) {
    console.error(`Unknown slug. Choose from: ${SITES.map((s) => s.slug).join(", ")}`);
    process.exit(2);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    headless: "shell",
    args: ["--hide-scrollbars", "--force-color-profile=srgb", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
  });
  const report = { written: [], failures: [], down: [] };

  for (const site of sites) {
    console.log(`Capturing ${site.url}`);
    let done = false;
    for (let attempt = 0; attempt < ATTEMPTS && !done; attempt++) {
      try {
        await captureSite(browser, { ...site, attempt }, report);
        done = true;
      } catch (err) {
        console.log(`  attempt ${attempt + 1}/${ATTEMPTS} failed: ${err && err.message}`);
        for (const p of await browser.pages()) if (p.url() !== "about:blank") await p.close().catch(() => {});
        if (attempt + 1 < ATTEMPTS) await sleep(3000 * (attempt + 1));
      }
    }
    if (!done) {
      report.down.push(site.slug);
      console.log(`  ✗ ${site.slug}: could not capture — keep using public/portfolio/${site.slug}.jpg`);
    }
  }

  await browser.close();

  console.log("");
  console.log(`Written: ${report.written.length} file(s)`);
  if (report.down.length) console.log(`Unreachable: ${report.down.join(", ")}`);
  if (report.failures.length) console.log(`Over budget:\n  ${report.failures.join("\n  ")}`);
  process.exit(report.down.length || report.failures.length ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
