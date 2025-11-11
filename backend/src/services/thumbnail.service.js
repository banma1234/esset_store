const puppeteer = require('puppeteer');

let _browser = null;

/**
 * @function getBrowser
 * @description 브라우저 싱글톤을 반환한다.
 * @returns {Promise<import('puppeteer').Browser>}
 */
async function getBrowser() {
  if (_browser && _browser.isConnected()) return _browser;

  _browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
    ],
  });

  const cleanup = async () => {
    try {
      if (_browser) await _browser.close();
    } catch (_) {}
    _browser = null;
  };
  process.once('exit', cleanup);
  process.once('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });
  process.once('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
  });

  return _browser;
}

/**
 * @function newPage
 * @description 새 페이지를 연다. (기본 512x512)
 * @param {{width?:number,height?:number,scale?:number}} [opts]
 * @returns {Promise<import('puppeteer').Page>}
 */
async function newPage(opts = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  const width = Number.isFinite(opts.width) ? opts.width : 512;
  const height = Number.isFinite(opts.height) ? opts.height : 512;
  const dpr = Number.isFinite(opts.scale) ? opts.scale : 1;
  await page.setViewport({ width, height, deviceScaleFactor: dpr });
  return page;
}

/**
 * @function closeBrowser
 * @description 브라우저를 명시적으로 종료한다.
 */
async function closeBrowser() {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}

module.exports = { getBrowser, newPage, closeBrowser };
