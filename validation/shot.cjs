const { chromium } = require('playwright');
const path = require('path');

const BASE = process.env.SHOT_BASE || 'http://127.0.0.1:4173';
const OUT = process.env.SHOT_OUT || path.join(__dirname, '..', 'shots');
const routes = (process.env.SHOT_ROUTES || '/,/games').split(',');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  });
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.addInitScript((t) => localStorage.setItem('anf3.theme', t), theme);
    for (const route of routes) {
      const name = route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
      await page.goto(`${BASE}/#${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3200);
      await page.screenshot({ path: path.join(OUT, `${name}-${theme}.png`) });
      console.log('shot', name, theme);
    }
    await context.close();
  }
  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });
