/* Gedeelde motor voor de Puls-promo's. Elke video definieert window.VIDEO en een render(t),
   deze helpers regelen tekst-animaties, scènes, achtergrond, logo, telefoon, figuurtjes en confetti. */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const P = (t, a, b) => cl((t - a) / (b - a));
const eo = x => 1 - Math.pow(1 - x, 3);
const eo5 = x => 1 - Math.pow(1 - x, 5);
const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const back = (x, c = 1.6) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
const lerp = (a, b, k) => a + (b - a) * k;
const nl = (n, d = 0) => Number(n).toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d });
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
/** beat -> seconden (VIDEO.bpm, VIDEO.beat0) */
const b = n => (window.VIDEO.beat0 || 0) + n * 60 / window.VIDEO.bpm;
/** pulsje op de beat: 1 op de tel, zakt snel weg */
const beatPulse = (t, from = 0, pow = 8) => t < from ? 0 : Math.pow(Math.max(0, Math.cos(((t - (window.VIDEO.beat0 || 0)) * window.VIDEO.bpm / 60) * Math.PI)), pow);

function stage() {
  const V = window.VIDEO, st = $('#stage');
  document.documentElement.style.width = document.body.style.width = st.style.width = V.w + 'px';
  document.documentElement.style.height = document.body.style.height = st.style.height = V.h + 'px';
}

/* ---------- tekst die woord voor woord binnenkomt ---------- */
function splitReveal(root = document) {
  $$('.rv', root).forEach(el => {
    if (el.dataset.split) return; el.dataset.split = 1;
    const letters = el.hasAttribute('data-letters');
    const walk = node => {
      [...node.childNodes].forEach(c => {
        if (c.nodeType === 3) {
          const parts = letters ? [...c.textContent] : c.textContent.split(/(\s+)/).filter(Boolean);
          const frag = document.createDocumentFragment();
          parts.forEach(p => {
            if (/^\s+$/.test(p) && !letters) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span'); s.className = 'w'; s.textContent = p; frag.appendChild(s);
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
      });
    };
    walk(el);
  });
}

function reveal(t) {
  $$('.rv').forEach(el => {
    const a = +el.dataset.a, s = +(el.dataset.s || .07), fx = el.dataset.fx || 'up', dur = +(el.dataset.d || .7);
    el.querySelectorAll('.w').forEach((w, i) => {
      const x = P(t, a + i * s, a + i * s + dur);
      if (fx === 'slam') {
        const k = eo5(P(t, a + i * s, a + i * s + .28));
        w.style.opacity = k > 0 ? 1 : 0;
        w.style.transform = `scale(${lerp(1.9, 1, k)})`;
        w.style.filter = k < 1 ? `blur(${(1 - k) * 18}px)` : '';
      } else if (fx === 'pop') {
        const k = back(x);
        w.style.opacity = cl(x * 3);
        w.style.transform = `translateY(${(1 - k) * 30}px) scale(${lerp(.6, 1, k)})`;
        w.style.filter = '';
      } else if (fx === 'type') {
        w.style.opacity = t >= a + i * s ? 1 : 0; w.style.transform = ''; w.style.filter = '';
      } else {
        const k = eo5(x);
        w.style.opacity = k;
        w.style.transform = `translateY(${(1 - k) * 46}px)`;
        w.style.filter = k < 1 ? `blur(${(1 - k) * 14}px)` : '';
      }
    });
  });
}

/* ---------- scènes met data-in / data-out ---------- */
function scenes(t) {
  $$('.scene').forEach(el => {
    const a = +el.dataset.in, z = +el.dataset.out, fo = +(el.dataset.fo || .35);
    const on = t >= a - .01 && t <= z;
    el.style.display = on ? '' : 'none';
    if (!on) return;
    const k = eo(P(t, z - fo, z));
    const fx = el.dataset.outfx || 'up';
    el.style.opacity = 1 - k;
    el.style.transform = fx === 'zoom' ? `scale(${1 + k * .15})` : fx === 'none' ? '' : `translateY(${-40 * k}px)`;
    el.style.filter = k > 0 ? `blur(${k * 12}px)` : '';
  });
}

/* ---------- achtergrond ---------- */
function bgHTML(c1 = 'rgba(72,196,134,.30)', c2 = 'rgba(201,242,122,.16)') {
  return `<div class="glow" id="g1" style="width:1400px;height:1400px;background:radial-gradient(circle,${c1},rgba(0,0,0,0) 62%)"></div>
  <div class="glow" id="g2" style="width:1200px;height:1200px;background:radial-gradient(circle,${c2},rgba(0,0,0,0) 62%)"></div>
  <div class="grid" id="grid"></div>`;
}
function bg(t, boost = 0) {
  const V = window.VIDEO, g1 = $('#g1'), g2 = $('#g2'), gr = $('#grid');
  if (g1) { g1.style.transform = `translate(${V.w * .5 - 700 + Math.sin(t * .35) * 140}px, ${V.h * .25 - 500 + Math.cos(t * .28) * 160}px)`; g1.style.opacity = .8 + boost * .5; }
  if (g2) g2.style.transform = `translate(${V.w * .5 - 300 + Math.cos(t * .3) * 160}px, ${V.h * .62 - 300 + Math.sin(t * .4) * 180}px)`;
  if (gr) gr.style.backgroundPosition = `36px ${-t * 18}px`;
}

/* ---------- logo ---------- */
let _uid = 0;
function logoSVG(size, opts = {}) {
  const id = 'lg' + (++_uid);
  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" ${opts.attrs || ''}>
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2f9a62"/><stop offset="1" stop-color="#0f3a26"/></linearGradient></defs>
    ${opts.noBg ? '' : `<rect width="512" height="512" rx="112" fill="url(#${id})"/>`}
    <path class="logo-path" d="M80 280h80l42-96 67 176 51-136 26 56h86" fill="none" stroke="${opts.stroke || '#c9f27a'}" stroke-width="${opts.sw || 40}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
const LOGO_LEN = 670;
/** teken het lijntje in het logo: k = 0..1 */
function logoDraw(el, k) { const p = $('.logo-path', el); p.style.strokeDasharray = LOGO_LEN; p.style.strokeDashoffset = LOGO_LEN * (1 - k); }

/* ---------- telefoon ---------- */
function phoneHTML(id, inner, { w = 660, h = 1340, x = 0, y = 0, time = '9:41' } = {}) {
  return `<div class="phone" id="${id}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"><div class="screen">
    <div class="island"></div><div class="status"><span class="ptime">${time}</span><span style="letter-spacing:4px">▮▮▮ ◔</span></div>
    ${inner}</div></div>`;
}

/* ---------- sportfiguurtje (overgenomen uit src/components/Figure.tsx) ---------- */
const FIG = { torso: 25, neck: 9.5, arm: 14, fore: 13, thigh: 19, shin: 19, foot: 7 };
const rad = a => a * Math.PI / 180;
const dir = (a, l) => [Math.sin(rad(a)) * l, -Math.cos(rad(a)) * l];
const add2 = (p, q) => [p[0] + q[0], p[1] + q[1]];
function solvePose(p) {
  const hip = [0, 0];
  const sh = add2(hip, dir(p.torso, FIG.torso));
  const head = add2(sh, dir(p.neck ?? p.torso, FIG.neck));
  const elbow = add2(sh, dir(p.arm, FIG.arm)), wrist = add2(elbow, dir(p.fore, FIG.fore));
  const elbow2 = add2(sh, dir(p.arm2 ?? p.arm, FIG.arm)), wrist2 = add2(elbow2, dir(p.fore2 ?? p.fore, FIG.fore));
  const knee = add2(hip, dir(p.thigh, FIG.thigh)), ankle = add2(knee, dir(p.shin, FIG.shin));
  const toe = add2(ankle, dir(p.foot ?? p.shin - 90, FIG.foot));
  const knee2 = add2(hip, dir(p.thigh2 ?? p.thigh, FIG.thigh)), ankle2 = add2(knee2, dir(p.shin2 ?? p.shin, FIG.shin));
  const toe2 = add2(ankle2, dir(p.foot2 ?? p.foot ?? (p.shin2 ?? p.shin) - 90, FIG.foot));
  const pts = { head, shoulder: sh, elbow, wrist, elbow2, wrist2, hip, knee, ankle, toe, knee2, ankle2, toe2 };
  const ref = { foot: ankle, hip, hand: wrist }[p.anchor];
  const dx = p.at[0] - ref[0], dy = p.at[1] - ref[1];
  for (const k in pts) pts[k] = [pts[k][0] + dx, pts[k][1] + dy];
  return pts;
}
const lerpAng = (a, b2, t) => a + (((b2 - a + 540) % 360) - 180) * t;
function mixPose(a, b2, t) {
  const out = { ...a, at: [lerp(a.at[0], b2.at[0], t), lerp(a.at[1], b2.at[1], t)] };
  for (const k of ['torso', 'thigh', 'shin', 'arm', 'fore', 'thigh2', 'shin2', 'arm2', 'fore2', 'foot', 'foot2', 'neck']) {
    const va = a[k] ?? a[k.replace('2', '')], vb = b2[k] ?? b2[k.replace('2', '')];
    if (va === undefined || vb === undefined) continue;
    out[k] = lerpAng(va, vb, t);
  }
  return out;
}
const STAND = { anchor: 'foot', at: [58, 89.5], torso: 0, thigh: 180, shin: 180, arm: 180, fore: 180 };
const ANIMS = {
  squat: { a: { ...STAND, arm: 215, fore: 340 }, b: { ...STAND, torso: 38, thigh: 98, shin: 205, arm: 250, fore: 10 }, hi: ['thigh'], plate: 'shoulder' },
  bench: { a: { anchor: 'hip', at: [72, 65], torso: 270, thigh: 105, shin: 180, arm: 0, fore: 0 }, b: { anchor: 'hip', at: [72, 65], torso: 270, thigh: 105, shin: 180, arm: 135, fore: 0 }, hi: ['arm', 'torso'], plate: 'wrist', bench: true },
};
function figureSVG(name, k, { body = '#e6f1ea', far = '#5c7468', hi = '#c9f27a', prop = '#3b5348', plate = '#a5bbaf', bgc = '#14241d', ground = '#2a4136' } = {}) {
  const A = ANIMS[name], p = solvePose(mixPose(A.a, A.b, k));
  const c = s => A.hi.includes(s) ? hi : body, cf = s => A.hi.includes(s) ? '#2f7a55' : far;
  const L = (q, r, w, col) => `<line x1="${q[0]}" y1="${q[1]}" x2="${r[0]}" y2="${r[1]}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
  let s = `<line x1="4" y1="92.5" x2="116" y2="92.5" stroke="${ground}" stroke-width="1.2" stroke-linecap="round"/>`;
  if (A.bench) s += `<rect x="22" y="69" width="56" height="5" rx="2" fill="${prop}"/><rect x="25" y="74" width="2.5" height="18" fill="${prop}"/><rect x="72.5" y="74" width="2.5" height="18" fill="${prop}"/>`;
  s += L(p.hip, p.knee2, 6.5, cf('thigh')) + L(p.knee2, p.ankle2, 6, cf('shin')) + L(p.ankle2, p.toe2, 4.5, far);
  s += L(p.shoulder, p.elbow2, 5.2, cf('arm')) + L(p.elbow2, p.wrist2, 4.6, cf('fore'));
  s += L(p.hip, p.shoulder, 9.5, c('torso')) + `<circle cx="${p.head[0]}" cy="${p.head[1]}" r="6.2" fill="${body}"/>`;
  s += L(p.hip, p.knee, 7, c('thigh')) + L(p.knee, p.ankle, 6.2, c('shin')) + L(p.ankle, p.toe, 4.8, body);
  s += L(p.shoulder, p.elbow, 5.6, c('arm')) + L(p.elbow, p.wrist, 5, c('fore'));
  const pl = p[A.plate];
  s += `<circle cx="${pl[0]}" cy="${pl[1]}" r="7.5" fill="${plate}"/><circle cx="${pl[0]}" cy="${pl[1]}" r="2.1" fill="${bgc}"/>`;
  return s;
}
/** heen-en-weer beweging zoals in de app: periode in seconden */
const repK = (t, period, t0 = 0) => { const ph = (((t - t0) % period) + period) % period / period; const x = ph < .45 ? ph / .45 : ph < .55 ? 1 : 1 - (ph - .55) / .45; return .5 - Math.cos(Math.PI * x) / 2; };

/* ---------- silhouet (overgenomen uit src/components/Body.tsx) ---------- */
function bodySVG(fat, muscle, sex = 'man', fill = 'url(#bodyfill)') {
  const f = (fat - 1) / 9, m = (muscle - 1) / 9, fem = sex === 'vrouw' ? 1 : 0, cx = 60;
  const sh = 21 + m * 9 + f * 4 - fem * 3, waist = 12 + f * 15 + m * 2 - fem * 1.5, hip = 15 + f * 11 + fem * 5 + m * 1.5;
  const belly = f > .35 ? (f - .35) * 22 : 0, arm = 6.5 + m * 4.5 + f * 3.5, leg = 10 + m * 3.5 + f * 6 + fem, neck = 6 + m * 2.5 + f * 1.5;
  const yS = 46, yW = 86, yH = 106;
  const torso = `M ${cx - neck} 36 C ${cx - neck} 41, ${cx - sh + 4} 41, ${cx - sh} ${yS} C ${cx - sh - 2} ${yS + 14}, ${cx - waist - belly} ${yW - 16}, ${cx - waist - belly * .8} ${yW} C ${cx - waist - belly * .6} ${yW + 10}, ${cx - hip} ${yH - 6}, ${cx - hip} ${yH} C ${cx - hip + 2} ${yH + 9}, ${cx + hip - 2} ${yH + 9}, ${cx + hip} ${yH} C ${cx + hip} ${yH - 6}, ${cx + waist + belly * .6} ${yW + 10}, ${cx + waist + belly * .8} ${yW} C ${cx + waist + belly} ${yW - 16}, ${cx + sh + 2} ${yS + 14}, ${cx + sh} ${yS} C ${cx + sh - 4} 41, ${cx + neck} 41, ${cx + neck} 36 Z`;
  const armP = s => { const x0 = cx + s * (sh - arm * .35), x1 = cx + s * (sh + 4 + f * 4), x2 = cx + s * (hip + 6 + f * 2); return `M ${x0} ${yS + 2} Q ${x1} ${yS + 26} ${x2} ${yH + 6}`; };
  const legP = s => `M ${cx + s * (hip * .48)} ${yH - 4} L ${cx + s * (hip * .42 + 2)} 162`;
  let o = `<ellipse cx="60" cy="166" rx="34" ry="4" fill="#253b31"/>`;
  [1, -1].forEach(s => o += `<path d="${legP(s)}" stroke="${fill}" stroke-width="${leg}" stroke-linecap="round" fill="none"/>`);
  [1, -1].forEach(s => o += `<path d="${armP(s)}" stroke="${fill}" stroke-width="${arm}" stroke-linecap="round" fill="none"/>`);
  o += `<path d="${torso}" fill="${fill}"/><circle cx="60" cy="23" r="13" fill="${fill}"/>`;
  if (m > .45) {
    const op = Math.min(1, (m - .45) * 2.5) * (1 - f * .8);
    o += `<g stroke="rgba(255,255,255,.35)" stroke-width="1.4" fill="none" stroke-linecap="round" opacity="${op}"><path d="M ${cx - sh + 7} ${yS + 9} Q ${cx - 6} ${yS + 16} ${cx} ${yS + 12} Q ${cx + 6} ${yS + 16} ${cx + sh - 7} ${yS + 9}"/>`;
    if (f < .5) o += `<path d="M ${cx} ${yS + 20} L ${cx} ${yW + 6}"/><path d="M ${cx - 7} ${yS + 27} L ${cx + 7} ${yS + 27} M ${cx - 7} ${yS + 36} L ${cx + 7} ${yS + 36}"/>`;
    o += `</g>`;
  }
  return o;
}

/* ---------- confetti op een canvas ---------- */
function makeConfetti(n = 90, seed = 42) {
  const r = seeded(seed), cols = ['#c9f27a', '#48c486', '#5fd49a', '#2b97e6', '#e5527a', '#f0a03a', '#ffffff'];
  return Array.from({ length: n }, () => ({ a: -Math.PI / 2 + (r() - .5) * 2.4, v: 700 + r() * 900, c: cols[Math.floor(r() * cols.length)], w: 10 + r() * 12, h: 6 + r() * 8, spin: (r() - .5) * 18, rot: r() * 6 }));
}
function drawConfetti(cv, parts, dt, x0, y0, g = 900) {
  const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, cv.width, cv.height);
  if (dt <= 0 || dt > 2.6) return;
  parts.forEach(p => {
    const x = x0 + Math.cos(p.a) * p.v * dt * .55, y = y0 + Math.sin(p.a) * p.v * dt + g * dt * dt;
    ctx.save(); ctx.globalAlpha = cl(1.8 - dt * .8); ctx.translate(x, y); ctx.rotate(p.rot + p.spin * dt);
    ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
  });
}

/* ---------- hulpjes voor elementen ---------- */
function show(el, k, { y = 40, s = null, blur = 10 } = {}) {
  if (typeof el === 'string') el = $(el);
  el.style.opacity = cl(k);
  el.style.transform = `translateY(${(1 - k) * y}px)` + (s !== null ? ` scale(${lerp(s, 1, k)})` : '');
  el.style.filter = k < 1 && blur ? `blur(${(1 - cl(k)) * blur}px)` : '';
}
/** render(t) mag een Promise teruggeven (bijv. om eerst een beeld te laden); de renderer wacht daarop. */
function boot(render) {
  stage(); splitReveal();
  window.render = t => render(t);
  window.ready = document.fonts.ready.then(() => render(0)).then(() => true);
}
