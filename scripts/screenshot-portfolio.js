const puppeteer = require('puppeteer');
const path = require('path');

const sites = [
  { url: 'https://safarisaev.ai', file: 'safarisaev.jpg' },
  { url: 'https://beautasy.co.uk', file: 'beautasy.jpg' },
  { url: 'https://bektothefuture.com', file: 'bektothefuture.jpg' },
  { url: 'https://silkbees.co.uk', file: 'silkbees.jpg' },
  { url: 'https://vedovec.vercel.app', file: 'vedovec.jpg' },
];

const OUT = path.join(__dirname, '../public/portfolio');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });

  for (const site of sites) {
    console.log(`Capturing ${site.url}...`);
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 960 });
      await page.goto(site.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 1500)); // let fonts/animations settle
      await page.screenshot({
        path: `${OUT}/${site.file}`,
        type: 'jpeg',
        quality: 88,
        clip: { x: 0, y: 0, width: 1280, height: 960 },
      });
      await page.close();
      console.log(`  ✓ saved ${site.file}`);
    } catch (err) {
      console.error(`  ✗ failed ${site.url}: ${err.message}`);
    }
  }

  await browser.close();
  console.log('Done.');
})();
