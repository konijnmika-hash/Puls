/* Herbruikbare, geanimeerde Puls-schermen voor in een telefoon (scherm 632 x 1312).
   Elk scherm: const s = Screen(parentEl, opts); s.update(lt) met lt = seconden sinds het scherm begint. */

function mountHTML(parent, html) {
  const d = document.createElement('div');
  d.className = 'scr';
  d.innerHTML = html;
  parent.appendChild(d);
  return d;
}

function TodayScreen(parent, o = {}) {
  const name = o.name || 'Sam';
  const el = mountHTML(parent, `
    <div class="small">${o.date || 'Woensdag 25 november'}</div>
    <div class="h" style="font-size:50px;margin:6px 0 26px">${o.greet || 'Goedemorgen'}, ${name}</div>
    <div class="card" style="background:linear-gradient(135deg,#163d2a,#2b3716);display:flex;align-items:center;gap:30px;border-color:#2f4a36">
      <svg width="230" height="230" viewBox="0 0 230 230" style="flex:none">
        <circle cx="115" cy="115" r="98" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="22"/>
        <circle class="ring" cx="115" cy="115" r="98" fill="none" stroke="#c9f27a" stroke-width="22" stroke-linecap="round" transform="rotate(-90 115 115)" stroke-dasharray="615.75" stroke-dashoffset="615.75"/>
        <text class="ringNum" x="115" y="118" text-anchor="middle" font-family="Brico" font-weight="700" font-size="52" fill="#e6f1ea">0</text>
        <text x="115" y="152" text-anchor="middle" font-family="DM" font-size="20" fill="#a5bbaf">van 2.300 kcal</text>
      </svg>
      <div style="flex:1">
        <div class="small" style="color:#a5bbaf">Nog over</div>
        <div class="h leftNum" style="font-size:58px">2.300</div>
        <div class="small" style="color:#a5bbaf;margin-top:14px">Verbrand</div>
        <div class="h burnNum" style="font-size:40px;color:var(--lime)">0</div>
      </div>
    </div>
    <div class="card" style="margin-top:22px">
      ${[['Koolhydraten', 'var(--carb)', 260], ['Eiwit', 'var(--protein)', 150], ['Vet', 'var(--fat)', 72]].map(([n, c, max], i) => `
        <div class="row" style="font-size:24px;margin:${i ? 20 : 0}px 0 10px"><b>${n}</b><span class="muted mt${i}">0 / ${max} g</span></div>
        <div class="bar"><i class="m${i}" style="background:${c}"></i></div>`).join('')}
    </div>
    <div class="card" style="margin-top:22px;padding:8px 28px">
      ${[['🥣', '#3a2c12', 'Ontbijt', 'Havermout met blauwe bessen', 420], ['🥗', '#123a2a', 'Lunch', 'Kip-quinoa bowl', 610], ['🍓', '#3a1626', 'Snack', 'Kwark met aardbeien', 190]].map(([em, bgc, t, s, k], i) => `
        <div class="meal meal${i}" style="display:flex;align-items:center;gap:20px;padding:20px 0;${i ? 'border-top:1px solid var(--line)' : ''}">
          <div class="dot" style="background:${bgc}">${em}</div><div style="flex:1"><b style="font-size:26px">${t}</b><div class="small">${s}</div></div><b style="font-size:26px">${k}</b></div>`).join('')}
    </div>`);
  const sp = o.speed || 1;
  return {
    el, update(lt) {
      lt *= sp;
      const k = eio(P(lt, .2, 1.8));
      $('.ring', el).style.strokeDashoffset = 615.75 * (1 - k * (1840 / 2300));
      $('.ringNum', el).textContent = nl(1840 * k);
      const burn = 380 * eio(P(lt, .6, 2.0));
      $('.leftNum', el).textContent = nl(2300 - 1840 * k + burn);
      $('.burnNum', el).textContent = nl(burn) + ' kcal';
      [[182, 260], [128, 150], [54, 72]].forEach(([v, max], j) => {
        const m = eo(P(lt, .4 + j * .15, 1.8 + j * .15));
        $('.m' + j, el).style.width = (v / max * 100 * m) + '%';
        $('.mt' + j, el).textContent = `${Math.round(v * m)} / ${max} g`;
      });
      [0, 1, 2].forEach(i => {
        const m = back(P(lt, 1.2 + i * .2, 1.7 + i * .2));
        const e = $('.meal' + i, el); e.style.opacity = P(lt, 1.2 + i * .2, 1.4 + i * .2);
        e.style.transform = `translateX(${(1 - m) * 60}px)`;
      });
    }
  };
}

function ScanScreen(parent, o = {}) {
  const det = o.det ?? 1.6, add = o.add ?? 3.0;
  const el = mountHTML(parent, `
    <div class="fill" style="background:radial-gradient(ellipse at 50% 40%,#22302a,#070c0a 75%)"></div>
    <div class="abs pot" style="left:154px;top:200px;width:300px;height:420px">
      <div style="position:absolute;inset:0;border-radius:40px 40px 70px 70px;background:linear-gradient(90deg,#d9e2dc,#ffffff 40%,#c3cec7);box-shadow:0 40px 80px rgba(0,0,0,.6)"></div>
      <div style="position:absolute;left:0;right:0;top:-24px;height:50px;border-radius:20px;background:linear-gradient(90deg,#4a8bd8,#7fb6f0 45%,#3a74ba)"></div>
      <div style="position:absolute;left:30px;right:30px;top:60px;text-align:center;font-family:Brico;font-weight:800;font-size:46px;color:#1b4f8f;line-height:1">GRIEKSE<br>YOGHURT</div>
      <div style="position:absolute;left:0;right:0;top:170px;text-align:center;font-weight:700;font-size:30px;color:#4a8bd8">0% vet</div>
      <svg class="barcode" style="position:absolute;left:50px;top:240px" width="200" height="120"></svg>
    </div>
    <svg class="abs finder" style="left:94px;top:360px" width="420" height="300" viewBox="0 0 420 300">
      <g class="corners" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round"><path d="M4 60V4h56M360 4h56v56M416 240v56h-56M60 296H4v-56"/></g>
      <rect class="laser" x="20" y="148" width="380" height="4" rx="2" fill="#ff4d5e"/>
    </svg>
    <div class="abs center hint" style="top:700px;font-size:26px;color:#cfd8d3">Richt op de barcode</div>
    <div class="abs flash" style="inset:0;background:#c9f27a;opacity:0"></div>
    <div class="abs sheet" style="left:0;right:0;bottom:0;height:540px;background:#14241d;border-radius:50px 50px 0 0;border-top:1px solid #2f4a3c;padding:26px 40px;z-index:16">
      <div style="width:80px;height:8px;border-radius:4px;background:#2f4a3c;margin:0 auto 26px"></div>
      <div class="row"><div><div class="small">Gevonden · 150 g</div><div class="h" style="font-size:44px">Griekse yoghurt 0%</div></div>
        <div class="ok" style="width:70px;height:70px;border-radius:50%;background:var(--brand);display:grid;place-items:center;color:#04150d;font-size:40px;font-weight:700">✓</div></div>
      <div style="margin:24px 0 30px"><span class="chip">86 kcal</span><span class="chip" style="color:#ff86a6">15 g eiwit</span><span class="chip" style="color:#ffc46b">6 g kh</span></div>
      <div class="btn addBtn" style="height:96px;line-height:96px;font-size:30px">Toevoegen aan ontbijt</div>
    </div>`);
  el.style.padding = '0';
  let x = 12, s = '<rect width="200" height="120" fill="#fff"/>', r = seeded(7);
  while (x < 186) { const w = 1 + Math.floor(r() * 4); if (r() > .45) s += `<rect x="${x}" y="8" width="${w}" height="96" fill="#111"/>`; x += w + 1; }
  $('.barcode', el).innerHTML = s + '<text x="100" y="117" text-anchor="middle" font-size="12" font-family="DejaVu Sans Mono" fill="#111">8 710400 128352</text>';
  return {
    el, update(lt) {
      const potIn = eo(P(lt, 0, .7));
      const pot = $('.pot', el);
      pot.style.transform = `translateY(${(1 - potIn) * 80 + Math.sin(lt * 2.2) * 6}px) rotate(${Math.sin(lt * 1.4) * 1.5 - (1 - potIn) * 6}deg) scale(${lerp(.92, 1, potIn)})`;
      pot.style.opacity = potIn;
      $('.laser', el).setAttribute('y', lt < det ? 148 + Math.sin(lt * 5.5) * 120 : 148);
      $('.laser', el).setAttribute('opacity', lt < det ? .95 : 1 - P(lt, det, det + .2));
      const hit = P(lt, det, det + .35);
      $('.corners', el).setAttribute('stroke', lt < det ? '#fff' : '#c9f27a');
      $('.finder', el).style.transform = `scale(${1 + Math.sin(hit * Math.PI) * .06 - (lt > det ? .06 * eo(P(lt, det, det + .3)) : 0)})`;
      $('.flash', el).style.opacity = lt > det ? .35 * (1 - P(lt, det, det + .35)) : 0;
      $('.hint', el).textContent = lt < det ? 'Richt op de barcode' : 'Gevonden ✓';
      $('.hint', el).style.color = lt < det ? '#cfd8d3' : '#c9f27a';
      $('.sheet', el).style.transform = `translateY(${(1 - eo5(P(lt, det + .2, det + .8))) * 600}px)`;
      const press = P(lt, add - .15, add) - P(lt, add, add + .2), done = lt > add;
      const btn = $('.addBtn', el);
      btn.style.transform = `scale(${1 - press * .05})`;
      btn.textContent = done ? '✓  Toegevoegd · 86 kcal' : 'Toevoegen aan ontbijt';
      btn.style.background = done ? '#c9f27a' : '';
      $('.ok', el).style.transform = `scale(${back(P(lt, det + .5, det + 1))})`;
    }
  };
}

function TrainScreen(parent, o = {}) {
  const sets = o.sets || [1.0, 1.5, 2.0, 2.5], restAt = o.rest ?? 2.8, speed = o.timerSpeed || 12;
  const el = mountHTML(parent, `
    <div class="small">Vandaag · Push</div>
    <div class="h" style="font-size:54px;margin:6px 0 8px">Borst &amp; triceps</div>
    <div class="small" style="margin-bottom:22px">4 oefeningen · ± 50 min · Gym</div>
    <div class="row" style="font-size:22px;margin-bottom:10px"><span class="muted">Sessie</span><b class="sessPct" style="color:var(--lime)">0%</b></div>
    <div class="bar" style="margin-bottom:24px"><i class="sessBar" style="background:linear-gradient(90deg,#48c486,#c9f27a)"></i></div>
    <div class="card" style="padding:6px 28px">
      <div style="display:flex;align-items:center;gap:22px;padding:22px 0;flex-wrap:wrap">
        <svg width="64" height="64" viewBox="0 -10 120 110" class="fig" style="background:#1d3a2c;border-radius:18px;flex:none"></svg>
        <div style="flex:1"><b style="font-size:28px">Bankdrukken</b><div class="small">4 × 8 · 60 kg</div></div>
        <div style="width:100%;display:flex;gap:14px;padding-left:86px;margin-top:6px">
          ${[1, 2, 3, 4].map(i => `<div class="set set${i}" style="width:46px;height:46px;border-radius:50%;border:3px solid var(--line);display:grid;place-items:center;font-size:22px;font-weight:700">${i}</div>`).join('')}
        </div>
      </div>
      ${[['💪', '#1d2c3a', 'Incline dumbbell press', '3 × 10 · 22 kg'], ['🔗', '#2c1d3a', 'Cable fly', '3 × 12 · 15 kg'], ['⚡', '#3a2a1d', 'Triceps pushdown', '3 × 12 · 25 kg']].map(([em, c, n, d]) => `
        <div style="display:flex;align-items:center;gap:22px;padding:22px 0;border-top:1px solid var(--line)"><div class="dot" style="background:${c}">${em}</div><div style="flex:1"><b style="font-size:28px">${n}</b><div class="small">${d}</div></div></div>`).join('')}
    </div>
    <div class="abs rest" style="left:40px;right:40px;top:905px;height:110px;border-radius:30px;background:#1c3128;border:1px solid #2f4a3c;display:flex;align-items:center;padding:0 30px;gap:24px">
      <svg width="70" height="70" viewBox="0 0 70 70"><circle cx="35" cy="35" r="29" fill="none" stroke="#253b31" stroke-width="8"/><circle class="restRing" cx="35" cy="35" r="29" fill="none" stroke="#c9f27a" stroke-width="8" stroke-linecap="round" transform="rotate(-90 35 35)" stroke-dasharray="182.2"/></svg>
      <div style="flex:1"><div class="small">Rusttimer</div><b style="font-size:30px">Volgende oefening</b></div>
      <b class="h restNum tab-num" style="font-size:48px">1:30</b>
    </div>`);
  return {
    el, update(lt) {
      $('.fig', el).innerHTML = figureSVG('bench', repK(lt, 1.6));
      sets.forEach((s, i) => {
        const e = $('.set' + (i + 1), el), on = lt >= s, k = P(lt, s, s + .25);
        e.style.background = on ? '#c9f27a' : 'transparent';
        e.style.borderColor = on ? '#c9f27a' : '#253b31';
        e.style.color = on ? '#06100c' : '#6c8478';
        e.textContent = on ? '✓' : String(i + 1);
        e.style.transform = `scale(${on ? 1 + Math.sin(k * Math.PI) * .25 : 1})`;
      });
      const pct = eo(P(lt, sets[0], sets[3] + .3)) * 25;
      $('.sessPct', el).textContent = Math.round(pct) + '%';
      $('.sessBar', el).style.width = pct + '%';
      const rk = eo5(P(lt, restAt, restAt + .5));
      $('.rest', el).style.transform = `translateY(${(1 - rk) * 200}px)`;
      $('.rest', el).style.opacity = rk;
      const remain = 90 - Math.max(0, lt - restAt - .3) * speed, sec = Math.max(0, Math.ceil(remain));
      $('.restNum', el).textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
      $('.restRing', el).style.strokeDashoffset = 182.2 * (1 - remain / 90);
    }
  };
}

function CoachScreen(parent, o = {}) {
  const taps = o.taps || [.7, 1.3], bubbles = o.bubbles || [1.8, 2.7], boom = o.confetti ?? 2.8;
  const el = mountHTML(parent, `
    <div class="small">Vandaag</div>
    <div class="h" style="font-size:54px;margin:6px 0 26px">Water</div>
    <div class="card" style="display:flex;align-items:center;gap:34px">
      <svg width="190" height="250" viewBox="0 0 190 250" style="flex:none">
        <defs><clipPath id="glassclip"><path d="M18 10h154l-18 226a10 10 0 0 1-10 9H46a10 10 0 0 1-10-9z"/></clipPath></defs>
        <g clip-path="url(#glassclip)"><rect width="190" height="250" fill="#10202a"/><path class="wave2" fill="#1f6fb0" opacity=".6"/><path class="wave" fill="#2b97e6"/></g>
        <path d="M18 10h154l-18 226a10 10 0 0 1-10 9H46a10 10 0 0 1-10-9z" fill="none" stroke="#3b5348" stroke-width="5"/>
      </svg>
      <div style="flex:1">
        <div class="h" style="font-size:70px"><span class="waterNum">1,2</span><span style="font-size:36px;color:var(--ink2)"> / 2,8 L</span></div>
        <div class="btn plusBtn" style="height:80px;line-height:80px;font-size:28px;margin-top:22px;background:#2b97e6;color:#fff">+ 250 ml</div>
      </div>
    </div>
    <div style="margin-top:34px;display:flex;align-items:center;gap:16px">
      <div style="width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#2f9a62,#0f3a26);display:grid;place-items:center">${logoSVG(34, { noBg: true, sw: 48 })}</div>
      <b style="font-size:26px">Je coach</b>
    </div>
    <div class="bubble b1" style="margin-top:18px;background:var(--surface2);border:1px solid var(--line);border-radius:30px 30px 30px 10px;padding:24px 28px;font-size:27px;line-height:1.35">Lekker bezig! Nog <b style="color:#6cc0ff">2 glazen</b> en je haalt je waterdoel. 💧</div>
    <div class="bubble b2" style="margin-top:16px;background:linear-gradient(135deg,#163d2a,#2b3716);border:1px solid #3c5a3a;border-radius:30px 30px 30px 10px;padding:24px 28px;font-size:27px;line-height:1.35">Eiwitdoel gehaald! 💪<br><span style="color:var(--lime);font-weight:700">12 dagen op rij</span> ingevuld.</div>
    <canvas class="abs conf" width="632" height="1312" style="left:0;top:0;pointer-events:none;z-index:18"></canvas>`);
  const parts = makeConfetti(80, 9);
  const wave = (level, t, ph, amp) => {
    const y0 = 250 - level * 235; let d = `M0 ${y0}`;
    for (let x = 0; x <= 190; x += 10) d += ` L${x} ${y0 + Math.sin(x / 26 + t * 4 + ph) * amp}`;
    return d + ' L190 250 L0 250Z';
  };
  return {
    el, update(lt) {
      let level = .43;
      taps.forEach(s => level += .107 * eo(P(lt, s + .05, s + .7)));
      const wob = 2 + 10 * Math.max(0, ...taps.map(s => lt > s ? Math.exp(-(lt - s) * 2) : 0));
      $('.wave', el).setAttribute('d', wave(level, lt, 0, wob));
      $('.wave2', el).setAttribute('d', wave(level + .02, lt, 2, wob * 1.2));
      $('.waterNum', el).textContent = nl(level * 2.8, 1);
      const press = Math.max(0, ...taps.map(s => P(lt, s - .1, s) - P(lt, s, s + .15)));
      $('.plusBtn', el).style.transform = `scale(${1 - press * .06})`;
      ['.b1', '.b2'].forEach((c, i) => {
        const s = bubbles[i], k = back(P(lt, s, s + .5)), e = $(c, el);
        e.style.opacity = P(lt, s, s + .2);
        e.style.transform = `translateY(${(1 - k) * 40}px) scale(${lerp(.85, 1, k)})`; e.style.transformOrigin = '0 100%';
      });
      drawConfetti($('.conf', el), parts, lt - boom, 300, 1000);
    }
  };
}

/** wissel tussen schermen: [[scherm, start, eind], ...] met schuif-overgang */
function screenSwitch(list, t, slide = 120) {
  list.forEach(([s, a, z], i) => {
    const first = i === 0, last = i === list.length - 1;
    const kin = first ? 1 : eo5(P(t, a - .05, a + .4));
    const kout = last ? 0 : eo(P(t, z - .05, z + .3));
    const on = t >= a - .06 && (last || t <= z + .3);
    s.el.style.display = on ? '' : 'none';
    if (!on) return;
    s.el.style.opacity = Math.min(kin, 1 - kout);
    s.el.style.transform = `translateX(${(1 - kin) * slide - kout * slide}px)`;
    s.update(t - a);
  });
}
