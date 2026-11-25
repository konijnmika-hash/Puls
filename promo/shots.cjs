const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + __dirname + '/scene.html'); await p.evaluate(() => window.ready);
  const ts = process.argv.slice(3).map(Number);
  for (const t of ts) { await p.evaluate(t => render(t), t); await p.screenshot({ path: `${process.argv[2]}/f_${t}.png` }); }
  await b.close();
})();
