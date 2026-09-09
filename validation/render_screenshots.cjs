const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');

const baseUrl = (process.env.ANF3_AUDIT_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const outputDir = path.join(__dirname, 'screenshots');
fs.mkdirSync(outputDir, { recursive: true });

const views = [
  { name: 'home-desktop', route: '/#/', width: 1440, height: 1100 },
  { name: 'home-mobile-375', route: '/#/', width: 375, height: 1100 },
  { name: 'games-desktop', route: '/#/games', width: 1440, height: 1100 },
  { name: 'games-mobile-320', route: '/#/games', width: 320, height: 1000 },
  { name: 'growth-promotion-redirect-desktop', route: '/#/games/growth-promotion', width: 1280, height: 1100 },
  { name: 'growth-promotion-redirect-mobile-375', route: '/#/games/growth-promotion', width: 375, height: 1100 },
  { name: 'sixth-desktop', route: '/#/games/bacterial-identification', width: 1280, height: 1100 },
  { name: 'sixth-mobile-375', route: '/#/games/bacterial-identification', width: 375, height: 1100 }
];

function urlFor(route) {
  return `${baseUrl}${route}`;
}

async function inspectPage(page, name, errors) {
  await page.waitForSelector('h1', { timeout: 20000 });
  await page.waitForTimeout(600);
  const layout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    h1Count: document.querySelectorAll('h1').length,
    mainCount: document.querySelectorAll('main').length
  }));
  if (layout.scrollWidth > layout.clientWidth + 1) errors.push(`${name}: horizontal overflow ${layout.scrollWidth}/${layout.clientWidth}`);
  if (layout.h1Count !== 1) errors.push(`${name}: expected one h1, found ${layout.h1Count}`);
  if (layout.mainCount !== 1) errors.push(`${name}: expected one main landmark, found ${layout.mainCount}`);
  await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true });
}

async function openView(browser, view, errors) {
  const context = await browser.newContext({ viewport: { width: view.width, height: view.height } });
  await context.addInitScript(() => {
    localStorage.setItem('anf3.operator.v2', JSON.stringify({ name: 'Screenshot Audit', code: '0000' }));
  });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${view.name}: console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`${view.name}: pageerror: ${error.message}`));
  await page.goto(urlFor(view.route), { waitUntil: 'domcontentloaded', timeout: 20000 });
  await inspectPage(page, view.name, errors);
  await context.close();
}

async function captureBacterialReport(browser, errors) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
  await context.addInitScript(() => {
    localStorage.setItem('anf3.operator.v2', JSON.stringify({ name: 'Screenshot Audit', code: '0000' }));
  });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`bacterial-report: console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`bacterial-report: pageerror: ${error.message}`));
  await page.goto(urlFor('/#/games/bacterial-identification'), { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'เปิดเคส' }).nth(1).click();
  await page.getByRole('button', { name: 'Build hypotheses' }).click();
  const hypotheses = page.locator('.hypothesis-grid input[type="checkbox"]');
  await hypotheses.nth(0).check();
  await hypotheses.nth(1).check();
  await page.getByRole('button', { name: 'Plan evidence' }).click();
  await page.getByLabel('Positive control ของการเจริญ').check();
  await page.getByLabel('Control อาหารเลี้ยงเชื้อที่ไม่ใส่เชื้อ').check();
  await page.getByRole('button', { name: /^MSA/ }).click();
  await page.getByRole('button', { name: 'Open observation station' }).click();
  await page.getByRole('button', { name: 'บันทึกผล' }).click();
  await page.getByRole('button', { name: 'Draft conclusion report' }).click();
  await page.getByLabel(/Evidence-linked rationale/).fill('[MSA-OBS-01] shows the selected reaction; this supports only a presumptive pattern and requires approved confirmation.');
  await page.getByRole('button', { name: 'Submit to Quinn, QA reviewer' }).click();
  await page.screenshot({ path: path.join(outputDir, 'bacterial-debrief-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'เปิดหน้ารายงาน' }).click();
  await page.waitForSelector('.game-report', { timeout: 20000 });
  await inspectPage(page, 'bacterial-report-desktop', errors);
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    for (const view of views) await openView(browser, view, errors);
    await captureBacterialReport(browser, errors);
  } finally {
    await browser.close();
  }
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`Games screenshot audit passed (${views.length + 1} route/report views)`);
  }
})();
