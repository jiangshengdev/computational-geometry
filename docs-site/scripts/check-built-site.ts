import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import legacyFragments from './test-data/legacy-fragments.json' with {type: 'json'};

// Exercise the generated reader experience, without starting another application.
const root = fileURLToPath(new URL('../build/', import.meta.url));
const mime: Record<string, string> = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.json': 'application/json'};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url!, 'http://localhost').pathname);
    let path = resolve(root, `.${pathname}`);
    assert(path === resolve(root) || path.startsWith(root.endsWith(sep) ? root : root + sep));
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    response.setHeader('Content-Type', mime[extname(path)] ?? 'application/octet-stream');
    response.end(await readFile(path));
  } catch {
    response.writeHead(404).end('Not found');
  }
});
await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
const address = server.address();
assert(address && typeof address !== 'string');
const origin = `http://127.0.0.1:${address.port}`;
let browser;
try {
  browser = await chromium.launch({executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || process.env.REMOTION_BROWSER_EXECUTABLE || undefined});
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(20000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const sitemap = (await Promise.all(['/sitemap.xml', '/zh-Hans/sitemap.xml'].map(async (path) => {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    return response.text();
  }))).join('');
  const routes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const english = routes.filter((route) => !route.startsWith('/zh-Hans/')).sort();
  const chinese = routes.filter((route) => route.startsWith('/zh-Hans/')).sort();
  for (const route of Object.keys(legacyFragments)) assert(english.includes(route), `Old page URL missing: ${route}`);
  assert.equal(english.length, 19, 'Home, 16 content pages and two chapter indexes');
  assert.deepEqual(chinese.map((route) => route.slice('/zh-Hans'.length)), english);
  let checkedLinks = 0;
  let checkedImages = 0;
  for (const route of routes) {
    const zh = route.startsWith('/zh-Hans/');
    const response = await page.goto(origin + route);
    assert.equal(response?.status(), 200, route);
    await page.locator('main').waitFor();
    await page.waitForFunction(() => document.documentElement.dataset.hasHydrated === 'true');
    assert.equal(await page.locator('html').getAttribute('lang'), zh ? 'zh-Hans' : 'en');
    const article = page.locator('.theme-doc-markdown');
    const text = await (await article.count() ? article : page.locator('main')).innerText();
    assert(zh ? /[\p{Script=Han}]/u.test(text) : !/[\p{Script=Han}]/u.test(text), `Wrong body language: ${route}`);
    assert.match(await page.locator('nav.navbar').innerText(), zh ? /计算几何/ : /Computational Geometry/);
    assert.match(await page.locator('footer.theme-layout-footer').innerText(), zh ? /章节/ : /Chapters/);
    const figureLabels = await page.locator('main [role=group][aria-label]').evaluateAll((groups) => groups.map((group) => group.getAttribute('aria-label')!));
    assert(figureLabels.every((label) => zh ? /[\p{Script=Han}]/u.test(label) : !/[\p{Script=Han}]/u.test(label)), `Wrong figure group language: ${route}`);
    const problems = await page.evaluate(async ({zh, origin}) => {
      const failures: string[] = [];
      const cache = new Map<string, Document>();
      cache.set(location.pathname, document);
      const links = [...document.querySelectorAll<HTMLAnchorElement>('main a[href], nav.navbar a[href], footer a[href], .theme-doc-sidebar-container a[href], .table-of-contents a[href]')];
      for (const link of links) {
        const url = new URL(link.href);
        if (url.origin !== origin || link.closest('.navbar__item.dropdown')) continue;
        if (zh !== url.pathname.startsWith('/zh-Hans/')) failures.push(`Wrong-language link: ${url.pathname}`);
        let doc = cache.get(url.pathname);
        if (!doc) {
          const result = await fetch(url.pathname);
          if (!result.ok) {failures.push(`Broken link: ${url.pathname}`); continue;}
          doc = new DOMParser().parseFromString(await result.text(), 'text/html');
          cache.set(url.pathname, doc);
        }
        if (url.hash && !doc.getElementById(decodeURIComponent(url.hash.slice(1)))) failures.push(`Missing anchor: ${url.pathname}${url.hash}`);
      }
      return {failures, count: links.length};
    }, {zh, origin});
    assert.deepEqual(problems.failures, [], route);
    checkedLinks += problems.count;
    const originalRoute = zh ? route.slice('/zh-Hans'.length) : route;
    const fragments = legacyFragments[originalRoute as keyof typeof legacyFragments] ?? [];
    for (const id of fragments) {
      assert(await page.evaluate((anchor) => Boolean(document.getElementById(anchor)), id), `Legacy fragment missing: ${route}#${id}`);
    }
    const hash = fragments.length ? '#' + encodeURIComponent(fragments[0]) : '';
    if (hash) await page.goto(origin + route + hash);
    // Exercise the framework's actual same-document locale navigation in both directions.
    const otherRoute = zh ? route.slice('/zh-Hans'.length) : `/zh-Hans${route}`;
    const dropdown = page.locator('.navbar__item.dropdown').filter({hasText: zh ? '简体中文' : 'English'});
    await dropdown.locator('a').first().hover();
    const languageLink = dropdown.getByRole('link', {name: zh ? 'English' : '简体中文', exact: true});
    await languageLink.click();
    await page.waitForURL(origin + otherRoute + hash);
    if (hash) assert(await page.evaluate(() => Boolean(document.getElementById(decodeURIComponent(location.hash.slice(1))))), 'Locale switch lost the heading');
    assert.equal(await page.locator('html').getAttribute('lang'), zh ? 'en' : 'zh-Hans');
    await page.goto(origin + route);
    // All themed figures, not just one image, must load in both themes.
    for (const theme of ['light', 'dark']) {
      await page.waitForFunction(() => document.documentElement.dataset.hasHydrated === 'true');
      const toggle = page.getByRole('button', {name: /Switch between dark and light mode|切换浅色\/暗黑模式/});
      for (let attempt = 0; attempt < 3 && await page.locator('html').getAttribute('data-theme') !== theme; attempt++) {
        const previous = await page.locator('html').getAttribute('data-theme-choice');
        await toggle.click();
        await page.waitForFunction((old) => document.documentElement.dataset.themeChoice !== old, previous);
      }
      await page.waitForFunction((value) => document.documentElement.dataset.theme === value, theme);
      const images = page.locator('main img:visible');
      for (const img of await images.all()) {
        await img.scrollIntoViewIfNeeded();
        await img.evaluate((element) => (element as HTMLImageElement).decode());
        assert(await img.getAttribute('alt'), `Missing image alt: ${route}`);
        const alt = (await img.getAttribute('alt'))!;
        assert(zh ? /[\p{Script=Han}]/u.test(alt) : !/[\p{Script=Han}]/u.test(alt), `Wrong image alt language: ${route}`);
        const imageUrl = await img.getAttribute('src');
        if (imageUrl && /\/(?:light|dark)\//.test(imageUrl)) assert(imageUrl.includes(`/${theme}/`), `Wrong themed image: ${imageUrl}`);
        if (imageUrl?.endsWith('.svg')) {
          const svg = await (await fetch(new URL(imageUrl, origin))).text();
          const titles = [...svg.matchAll(/<title[^>]*>(.*?)<\/title>/gs)].map((match) => match[1]);
          if (!zh) assert(titles.every((title) => !/[\p{Script=Han}]/u.test(title)), `Untranslated SVG title: ${imageUrl}`);
        }
        checkedImages++;
      }
    }
    console.log(`Verified ${route}`);
  }
  // The root's chapter cards and chapter article cards are usable navigation, in both locales.
  for (const prefix of ['', '/zh-Hans']) {
    await page.goto(origin + prefix + '/');
    await page.locator('main a[href]').filter({hasText: prefix ? '线段求交' : 'Segment intersection'}).first().click();
    await page.waitForURL(origin + prefix + '/chapters/segment-intersection/');
    await page.locator('main a[href]').filter({hasText: prefix ? '求什么' : /comput/i}).first().click();
    assert.equal(page.url(), origin + prefix + '/docs/segment-intersection/what-we-compute/');
  }
  assert.deepEqual(errors, [], 'Browser errors');
  console.log(`PASS: ${routes.length} pages, ${checkedLinks} links/anchors, ${checkedImages} themed image loads, bidirectional article locale switching and chapter navigation`);
} finally {
  await browser?.close();
  await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done()));
}
