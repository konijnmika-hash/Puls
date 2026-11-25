// Rendert een promo naar MP4 (beeld per frame via Playwright, geluid uit audio.wav).
//   node promo/render.cjs 02-hook               -> promo/out/02-hook.mp4
//   node promo/render.cjs 02-hook --shots 1,4,9 -> contactblad met losse frames (voor controle)
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');

const id = process.argv[2];
const shotsArg = process.argv.indexOf('--shots');
const dir = path.join(__dirname, 'videos', id);
if (!id || !fs.existsSync(dir)) { console.error('Onbekende video:', id); process.exit(1); }

// tijdvervorming (videotijd -> scènetijd), zie sync.json
let warp = null;
const syncFile = path.join(dir, 'sync.json');
if (fs.existsSync(syncFile)) warp = JSON.parse(fs.readFileSync(syncFile, 'utf8')).warp;
const sceneTime = t => {
  if (!warp) return t;
  for (let i = 1; i < warp.length; i++) {
    const [s0, v0] = warp[i - 1], [s1, v1] = warp[i];
    if (t <= v1 || i === warp.length - 1) return s0 + (s1 - s0) * (t - v0) / (v1 - v0);
  }
  return t;
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto('file://' + path.join(dir, 'scene.html'));
  await page.evaluate(() => window.ready);
  const V = await page.evaluate(() => window.VIDEO);
  await page.setViewportSize({ width: V.w, height: V.h });
  const fps = V.fps || 30;

  if (shotsArg > 0) {
    const times = process.argv[shotsArg + 1].split(',').map(Number);
    const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'shots-'));
    const files = [];
    for (const t of times) {
      await page.evaluate(s => window.render(s), sceneTime(t));
      const f = path.join(tmp, `s${files.length}.png`);
      await page.screenshot({ path: f }); files.push(f);
    }
    await browser.close();
    const out = process.argv[shotsArg + 2] || path.join(dir, 'shots.png');
    const cols = Math.min(files.length, V.w > V.h ? 3 : 6);
    const rows = Math.ceil(files.length / cols);
    const w = V.w > V.h ? 640 : 300;
    const args = ['-y', '-loglevel', 'error'];
    files.forEach(f => args.push('-i', f));
    // vul aan tot een volledig raster
    const pad = cols * rows - files.length;
    for (let i = 0; i < pad; i++) args.push('-i', files[files.length - 1]);
    const n = files.length + pad;
    const scaled = Array.from({ length: n }, (_, i) => `[${i}]scale=${w}:-1,drawtext=text='${i < times.length ? times[i] + 's' : ''}':x=8:y=8:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.6[v${i}]`).join(';');
    const layout = Array.from({ length: n }, (_, i) => `${(i % cols) ? Array.from({ length: i % cols }, () => 'w0').join('+') : '0'}_${Math.floor(i / cols) ? Array.from({ length: Math.floor(i / cols) }, () => 'h0').join('+') : '0'}`).join('|');
    args.push('-filter_complex', `${scaled};${Array.from({ length: n }, (_, i) => `[v${i}]`).join('')}xstack=inputs=${n}:layout=${layout}`, out);
    execFileSync('ffmpeg', args);
    console.log('contactblad:', out);
    return;
  }

  const outDir = path.join(__dirname, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `${id}.mp4`);
  const audio = path.join(dir, 'audio.wav');
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-'];
  if (fs.existsSync(audio)) args.push('-i', audio);
  args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart');
  if (fs.existsSync(audio)) args.push('-c:a', 'aac', '-b:a', '256k', '-shortest');
  args.push(out);
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(fps * V.dur);
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    await page.evaluate(s => window.render(s), sceneTime(f / fps));
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`${id}: frame ${f}/${total} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('klaar:', out);
})();
