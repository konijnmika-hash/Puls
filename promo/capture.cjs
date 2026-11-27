// Neemt echte beelden van de Puls-app op, frame voor frame. Daardoor is elke opname precies gelijk
// en loopt hij vloeiend, hoe snel of traag de computer ook is.
//   node promo/capture.cjs 12-probeer-14-dagen               -> alle clips uit videos/<id>/clips.cjs
//   node promo/capture.cjs 12-probeer-14-dagen scan training -> alleen deze clips
//   node promo/capture.cjs 12-probeer-14-dagen scan --peek   -> alleen voorbereiden en één schermfoto maken (--full: hele pagina)
//   ... --url http://localhost:5173/                         -> een dev-server gebruiken die al draait
//
// Zo werkt het: de app draait in een onzichtbare browser met een nepklok (timers en requestAnimationFrame)
// en een stilgezette animatietijdlijn. Per frame zetten we de klok en alle CSS-animaties 1/30 s verder
// en maken we een schermfoto. Tikken en scrollen staan per clip in videos/<id>/clips.cjs:
//   setup(h)        voorbereiden in echte tijd (naar het juiste scherm gaan)
//   align(h)        na het stilzetten: de nepklok gelijkzetten met iets in de app
//   frame(f, h)     vóór frame f: tikken, scrollen, gegevens toevoegen
//   afterStep(f, h) na de stap van frame f: wachten op iets dat nog moet verschijnen
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const has = name => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };
const urlArg = flag('--url');
const full = has('--full');
const peek = has('--peek') || full;
const id = args.shift();
const dir = path.join(__dirname, 'videos', id || '');
if (!id || !fs.existsSync(path.join(dir, 'clips.cjs'))) { console.error('Geen clips.cjs gevonden voor video:', id); process.exit(1); }
const cfg = require(path.join(dir, 'clips.cjs'));
const only = args.length ? args : Object.keys(cfg.clips);
const FPS = cfg.fps || 30;
const VP = cfg.viewport || { width: 390, height: 844 };
const SCALE = cfg.scale || 2;
const outDir = path.join(dir, 'clips');

/** In de pagina: wacht tot React klaar is en de browser een beeld heeft getekend (echte tijd, niet de nepklok). */
const settle = page => page.evaluate(() => new Promise(r => window.__realRAF(() => window.__realRAF(() => window.__realTimeout(r, 0)))));

async function record(browser, base, name) {
  const clip = cfg.clips[name];
  if (!clip) throw new Error('Onbekende clip: ' + name);
  const ctx = await browser.newContext({
    viewport: VP, deviceScaleFactor: SCALE, colorScheme: cfg.theme || 'dark', locale: 'nl-NL', timezoneId: 'Europe/Amsterdam',
    hasTouch: true, isMobile: true, permissions: ['camera'],
  });
  // de echte timers bewaren we, zodat we kunnen wachten terwijl de nepklok stilstaat
  await ctx.addInitScript(() => {
    window.__realRAF = window.requestAnimationFrame.bind(window);
    window.__realTimeout = window.setTimeout.bind(window);
  });
  if (cfg.prepare) await cfg.prepare(ctx);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log(`  [${name}] paginafout:`, e.message));
  page.on('console', m => { if (m.type() === 'error') console.log(`  [${name}] console:`, m.text().slice(0, 160)); });
  await page.clock.install({ time: new Date(clip.time || cfg.time) });
  await page.goto(base);
  await page.waitForLoadState('networkidle');
  if (cfg.seed) {
    await page.evaluate(cfg.seed, clip.seed ?? null);
    await page.reload();
    await page.waitForLoadState('networkidle');
  }
  await page.evaluate(() => document.fonts.ready);

  // tik-stip: laat zien waar er getikt wordt
  await page.evaluate(() => {
    const d = document.createElement('div');
    d.id = '__tap';
    d.style.cssText = 'position:fixed;left:0;top:0;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;pointer-events:none;z-index:2147483647;opacity:0;' +
      'background:rgba(255,255,255,.34);border:2px solid rgba(255,255,255,.8);box-shadow:0 2px 14px rgba(0,0,0,.35)';
    document.documentElement.appendChild(d);
  });

  let frame = 0;
  const later = [];           // [frame, fn]
  const taps = [];            // { x, y, f0 }
  const marks = {}, boxes = {};
  const h = {
    page,
    get frame() { return frame; },
    /** echte tijd wachten (alleen in setup) */
    wait: ms => page.waitForTimeout(ms),
    eval: (fn, arg) => page.evaluate(fn, arg),
    /** klik zonder stip (direct) */
    click: sel => page.locator(sel).first().evaluate(el => el.click()),
    /** tik met zichtbare stip; de klik zelf volgt `lead` frames later */
    async tap(target, { lead = 3, dx = 0, dy = 0 } = {}) {
      const loc = typeof target === 'string' ? page.locator(target).first() : target;
      const box = await loc.boundingBox();
      if (!box) throw new Error('tap: element niet gevonden of niet zichtbaar: ' + target);
      taps.push({ x: box.x + box.width / 2 + dx, y: box.y + box.height / 2 + dy, f0: frame });
      later.push([frame + lead, () => loc.evaluate(el => el.click())]);
    },
    /** doe iets een paar frames later */
    after: (frames, fn) => later.push([frame + frames, fn]),
    /** onthoud dit frame onder een naam (komt in het manifest, voor beeld en geluid) */
    mark: n => { if (!(n in marks)) marks[n] = frame; },
    marks,
    /** onthoud waar een onderdeel op het scherm staat [x, y, breedte, hoogte], zodat de video erop kan inzoomen */
    async box(n, sel) {
      const bb = await (typeof sel === 'string' ? page.locator(sel).first() : sel).boundingBox();
      if (!bb) throw new Error('box: element niet gevonden: ' + sel);
      boxes[n] = [bb.x, bb.y, bb.width, bb.height].map(v => Math.round(v * 10) / 10);
    },
    settle: () => settle(page),
    /** laad alle foto's nu al (ook die pas bij het scrollen zouden laden), zodat er tijdens de opname niets inspringt */
    images: () => page.evaluate(() => {
      document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; });
      return Promise.race([
        Promise.all([...document.images].filter(i => !i.complete).map(i => new Promise(r => { i.onload = i.onerror = r; }))),
        new Promise(r => window.__realTimeout(r, 6000)),
      ]);
    }),
  };

  if (clip.setup) await clip.setup(h);
  await h.images();
  await settle(page);

  if (peek) {
    fs.mkdirSync(outDir, { recursive: true });
    const f = path.join(outDir, `${name}-peek.png`);
    await page.screenshot({ path: f, fullPage: full });
    console.log('  schermfoto:', f);
    await ctx.close();
    return null;
  }

  // klok en animaties stilzetten
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Animation.enable');
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 34));
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 });
  await settle(page);
  if (clip.align) await clip.align(h);

  const clipDir = path.join(outDir, name);
  fs.rmSync(clipDir, { recursive: true, force: true });
  fs.mkdirSync(clipDir, { recursive: true });
  const t0 = Date.now();
  for (frame = 0; frame < clip.frames; frame++) {
    if (clip.frame) await clip.frame(frame, h);
    for (let i = later.length - 1; i >= 0; i--) if (later[i][0] <= frame) { const [, fn] = later.splice(i, 1)[0]; await fn(); }
    await settle(page);
    const dt = Math.round((frame + 1) * 1000 / FPS) - Math.round(frame * 1000 / FPS);
    await page.clock.runFor(dt);
    await page.evaluate(({ dt, taps, frame }) => {
      for (const a of document.getAnimations()) { try { a.currentTime = (Number(a.currentTime) || 0) + dt; } catch (e) { /* al afgelopen */ } }
      const d = document.getElementById('__tap');
      const t = taps.filter(x => frame >= x.f0 && frame - x.f0 < 14).pop();
      if (!t) { d.style.opacity = 0; return; }
      const n = frame - t.f0;                                  // 0..2 neerkomen, 3..5 drukken, daarna uitdijen
      const press = Math.min(1, n / 2), rel = Math.max(0, (n - 4) / 9);
      d.style.left = t.x + 'px'; d.style.top = t.y + 'px';
      d.style.opacity = String((0.35 + 0.65 * press) * (1 - rel));
      d.style.transform = `scale(${1.25 - 0.4 * press + rel * 0.9})`;
    }, { dt, taps, frame });
    await settle(page);
    if (clip.afterStep) { await clip.afterStep(frame, h); await settle(page); }
    await page.screenshot({ path: path.join(clipDir, String(frame).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 95 });
  }
  console.log(`  ${name}: ${clip.frames} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`, Object.keys(marks).length ? JSON.stringify(marks) : '', Object.keys(boxes).length ? JSON.stringify(boxes) : '');
  await ctx.close();

  // contactblad om snel te controleren
  const cols = 10, stepN = Math.max(1, Math.ceil(clip.frames / cols));
  try {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(clipDir, '%04d.jpg'),
      '-vf', `select='not(mod(n\\,${stepN}))',scale=234:-1,tile=${cols}x1`, '-frames:v', '1', path.join(outDir, `${name}-blad.jpg`)]);
  } catch (e) { console.log('  (contactblad mislukt)', e.message.split('\n')[0]); }
  return { frames: clip.frames, marks, boxes };
}

(async () => {
  let server = null, base = urlArg;
  if (!base) {
    const { createServer } = await import('vite');
    server = await createServer({ root: ROOT, logLevel: 'error', clearScreen: false, server: { host: '127.0.0.1', port: 5183 } });
    await server.listen();
    base = server.resolvedUrls.local[0];
  }
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  try {
    // opwarmen: de eerste keer bundelt de dev-server de afhankelijkheden en herlaadt hij de pagina
    const warm = await browser.newPage();
    await warm.goto(base); await warm.waitForLoadState('networkidle'); await warm.waitForTimeout(1500); await warm.close();

    const manifestFile = path.join(outDir, 'manifest.json');
    const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : { clips: {} };
    Object.assign(manifest, { fps: FPS, w: VP.width * SCALE, h: VP.height * SCALE });
    for (const name of only) {
      console.log('clip', name);
      const res = await record(browser, base, name);
      if (res) manifest.clips[name] = res;
    }
    if (!peek) {
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 1));
      fs.writeFileSync(path.join(outDir, 'manifest.js'), 'window.CLIPS = ' + JSON.stringify(manifest) + ';\n');
      console.log('klaar:', outDir);
    }
  } finally {
    await browser.close();
    if (server) await server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
