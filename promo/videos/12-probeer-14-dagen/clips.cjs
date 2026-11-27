// Clips voor "Probeer dit 14 dagen": echte beelden van de app, opgenomen met promo/capture.cjs.
// Het verhaal: de eerste 14 dagen van Sam. Dag 1 is maandag 16 november 2026, dag 14 is zondag 29 november.
// Elke clip krijgt de app zoals hij er op die dag uitziet (alleen de dagen daarvóór zijn ingevuld).

const DAG1 = '2026-11-16';
const day = (n, hhmm) => { const d = new Date(`${DAG1}T${hhmm}:00+01:00`); d.setDate(d.getDate() + n - 1); return d.toISOString(); };
const EAN = '8712345678906';

/** Wat Sam eet: drie varianten per maaltijd, [product, aantal porties]. */
const MEALS = {
  ontbijt: [
    [['Havermout', 1.5], ['Halfvolle melk', 1], ['Banaan', 1], ['Blauwe bessen', 1]],
    [['Magere kwark', 2], ['Havermout', 1], ['Banaan', 1]],
    [['Volkorenbrood', 2], ['Ei (gekookt)', 2], ['Avocado', 1]],
  ],
  lunch: [
    [['Zilvervliesrijst (gekookt)', 1.5], ['Kipfilet (gebakken)', 1], ['Broccoli', 1]],
    [['Volkorenbrood', 3], ['Kipfilet (beleg)', 4], ['Jonge kaas 48+', 2], ['Tomaat', 1]],
    [['Volkorenbrood', 2], ['Pindakaas', 2], ['Appel', 1], ['Halfvolle melk', 1]],
  ],
  diner: [
    [['Zalm (gebakken)', 1], ['Aardappelen (gekookt)', 2], ['Sperziebonen', 1]],
    [['Pasta (gekookt)', 2], ['Rundergehakt (gebakken)', 1], ['Tomaat', 2], ['Paprika', 1]],
    [['Zilvervliesrijst (gekookt)', 1.5], ['Kipfilet (gebakken)', 1.5], ['Paprika', 1], ['Broccoli', 1]],
  ],
  snacks: [
    [['Magere kwark', 1], ['Aardbeien', 1], ['Banaan', 1], ['Pindakaas', 1]],
    [['Griekse yoghurt 0%', 1], ['Amandelen', 1], ['Appel', 1]],
    [['Magere kwark', 1], ['Blauwe bessen', 1], ['Walnoten', 1]],
  ],
};

/** Draait in de app: vult de winkel met voorbeeldgegevens tot en met dag `opt.day`. */
async function seed(opt) {
  const { useStore } = await import('/src/lib/store.ts');
  const { FOODS } = await import('/src/data/foods.ts');
  const { dateKey, addDays } = await import('/src/lib/date.ts');
  const { ALL_EQUIP } = await import('/src/data/exercises.ts');
  const { buildPlan, workoutKcal } = await import('/src/lib/workout.ts');
  const byName = Object.fromEntries(FOODS.map(f => [f.name, f]));
  const today = dateKey();
  const dk = k => addDays(today, k - opt.day);          // datum van dag k
  let s = 20261116; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;

  useStore.getState().reset();
  const profile = {
    name: 'Sam', sex: 'man', age: 28, heightCm: 181, weightKg: 86, goalWeightKg: 78, startWeightKg: 86,
    activity: 'licht', goal: 'afvallen', pace: 'normaal', trainDays: [0, 2, 4], focus: 'spiermassa', experience: 'gemiddeld',
    place: 'gym', equipment: [...ALL_EQUIP], excluded: [], swaps: {}, fat: 6, muscle: 5,
    createdAt: new Date(new Date(dk(1) + 'T07:40:00').getTime()).toISOString(),
  };
  useStore.getState().setProfile(profile);
  useStore.setState({ weights: [], theme: 'donker', premium: true });
  const A = useStore.getState();
  const add = (d, meal, name, n) => {
    const f = byName[name];
    if (!f) throw new Error('Product bestaat niet: ' + name);
    const p = f.portions[0];
    A.addFood(d, meal, f, p.g * n, `${String(n).replace('.', ',')} × ${p.label}`);
  };
  const MEALS = opt.MEALS;
  const logMeal = (d, meal, i) => MEALS[meal][i % 3].forEach(([n, q]) => add(d, meal, n, q));

  // trainingen: dubbele progressie. De eerste keer haalde Sam bij bankdrukken alle herhalingen, dus mag er gewicht bij.
  const plan = buildPlan(profile);
  const LIFT = {
    bench: [70, [10, 10, 10]], inclinebench: [50, [10, 9, 8]], ohp: [40, [9, 8, 8]], lateral: [8, [12, 12, 11]], pushdown: [27.5, [12, 11, 10]], skullcrusher: [22.5, [11, 10, 10]],
    pullup: [0, [8, 7, 6]], row: [55, [10, 9, 8]], dbrow: [24, [10, 10, 9]], facepull: [20, [12, 12, 12]], barbellcurl: [27.5, [11, 10, 9]], hammer: [12, [12, 11, 10]],
    squat: [80, [9, 8, 8]], rdl: [70, [10, 9, 9]], bulgarian: [14, [10, 9, 8]], legcurl: [40, [12, 11, 10]], legext: [50, [12, 12, 11]], calf: [0, [12, 12, 12]],
  };
  const sessions = {};          // per trainingsdag-id: hoe vaak gedaan
  const workout = (d, wd) => {
    const nth = (sessions[wd.id] = (sessions[wd.id] ?? 0) + 1);
    const ex = wd.exercises.map(pe => {
      const [kg, reps] = LIFT[pe.exercise.id] ?? [20, [10, 10, 10]];
      return { id: pe.exercise.id, sets: reps.slice(0, pe.sets).map(r => ({ kg, reps: Math.min(12, r + (nth - 1)) })) };
    });
    const volume = ex.reduce((a, e) => a + e.sets.reduce((b, x) => b + x.kg * x.reps, 0), 0);
    const kcal = workoutKcal(wd, 86);
    const lifts = Object.fromEntries(ex.filter(e => e.sets[0].kg > 0).map(e => [e.id, e.sets[0].kg]));
    useStore.setState(st => ({
      lifts: { ...st.lifts, ...lifts },
      workoutLog: [...st.workoutLog, { date: d, id: wd.id, name: wd.name, emoji: wd.emoji, minutes: wd.estMinutes, kcal, volume, sets: ex.reduce((a, e) => a + e.sets.length, 0), ex }],
      days: { ...st.days, [d]: { ...(st.days[d] ?? { meals: { ontbijt: [], lunch: [], diner: [], snacks: [] }, waterMl: 0, steps: 0, activities: [], workoutsDone: [] }),
        workoutsDone: [wd.id], activities: [...(st.days[d]?.activities ?? []), { id: 'w' + d, name: wd.name, emoji: wd.emoji, minutes: wd.estMinutes, kcal, workout: wd.id }] } },
    }));
  };
  const WEIGHT = [86.0, 85.9, 86.1, 85.7, 85.8, 85.5, 85.6, 85.4, 85.5, 85.2, 85.3, 85.1, 85.3, 85.0];
  const WATER = [2750, 2500, 3000, 2250, 2750, 2500, 2000, 3000, 2750, 2500, 3000, 2750, 2250, 2500];
  const STEPS = [8420, 9310, 7650, 10240, 8890, 11520, 6480, 9130, 8240, 9870, 7930, 10410, 12180, 8760];

  for (let k = 1; k <= opt.day; k++) {
    const d = dk(k), last = k === opt.day, t = opt.today ?? {};
    const want = meal => !last || (t.meals ?? []).includes(meal);
    if (want('ontbijt')) logMeal(d, 'ontbijt', k + 2);
    if (want('lunch')) logMeal(d, 'lunch', k + 2);
    if (want('diner')) logMeal(d, 'diner', k);
    if (want('snacks')) logMeal(d, 'snacks', k + 2);
    if (!last) A.setWater(d, WATER[k - 1]);
    else for (let i = 0; i < (t.glasses ?? 0); i++) A.addWater(d, 250);
    A.setSteps(d, last ? (t.steps ?? 0) : STEPS[k - 1]);
    const wd = plan.find(p => p.weekday === (k - 1) % 7);
    if (wd && (!last || t.trained)) workout(d, wd);
    if (!wd && (k === 6 || k === 13) && !last) A.addActivity(d, { name: 'Wandelen', emoji: '🚶', minutes: 50, kcal: 240, kind: 'wandelen' });
    if (last && t.walk) A.addActivity(d, { name: 'Wandelen', emoji: '🚶', minutes: 35, kcal: 168, kind: 'wandelen' });
    if (!last || t.weighed !== false) A.logWeight(d, WEIGHT[k - 1]);
    const habits = ['groente', 'fruit', 'slaap'].filter(() => rnd() < 0.78);
    useStore.setState(st => ({ habitLog: { ...st.habitLog, [d]: last ? (t.habits ?? []) : habits } }));
  }
  // geen herinneringen of felicitaties die midden in de opname in beeld schuiven
  useStore.setState({
    cheered: { [today]: ['water', 'protein', 'steps', 'workout'] },
    fired: { [today]: ['water-10', 'water-12', 'water-14', 'water-16', 'water-18', 'water-20', 'meal-ontbijt', 'meal-lunch', 'meal-diner', 'training', 'evening'] },
  });
  return Object.keys(useStore.getState().days).length;
}

/** Nepcamera voor de barcodescanner: een getekend pak kwark met een echte EAN-13-streepjescode. */
function fakeCamera(EAN) {
  const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
  const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
  const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
  const PAR = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
  const dig = [...EAN].map(Number);
  let bits = '101';
  for (let i = 1; i <= 6; i++) bits += (PAR[dig[0]][i - 1] === 'L' ? L : G)[dig[i]];
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += R[dig[i]];
  bits += '101';

  const W = 1280, H = 960;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const rr = (x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
  /** k = 0..1: hoe ver het pak in beeld is (0 = komt eraan, onscherp) ; t = seconden voor de handbeweging */
  function draw(k, t) {
    c.setTransform(1, 0, 0, 1, 0, 0); c.filter = 'none';
    // aanrecht, onscherp
    const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#b9b2a6'); bg.addColorStop(.55, '#d8d0c2'); bg.addColorStop(.56, '#8d7b66'); bg.addColorStop(1, '#6b5a47');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.filter = 'blur(38px)';
    [[170, 250, 150, '#5d8a54'], [1120, 210, 190, '#f3ead8'], [980, 640, 120, '#b9552e'], [260, 760, 150, '#3f3428']].forEach(([x, y, r, col]) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); });
    c.filter = 'none';
    // het pak
    const e = 1 - Math.pow(1 - k, 3);
    const cx = W / 2 + (1 - e) * 420 + Math.sin(t * 2.1) * 9, cy = H / 2 - 20 + (1 - e) * 130 + Math.cos(t * 1.7) * 7;
    const sc = 0.82 + 0.2 * e + Math.sin(t * 1.3) * 0.008;
    c.translate(cx, cy); c.rotate(((1 - e) * 9 + Math.sin(t * 1.9) * 1.1) * Math.PI / 180); c.scale(sc, sc);
    if (k < 1) c.filter = `blur(${(1 - e) * 9}px)`;
    c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 60; c.shadowOffsetY = 30;
    const body = c.createLinearGradient(-330, 0, 330, 0); body.addColorStop(0, '#dfe6e1'); body.addColorStop(.35, '#ffffff'); body.addColorStop(.7, '#f4f7f5'); body.addColorStop(1, '#cdd6d0');
    c.fillStyle = body; rr(-330, -400, 660, 800, [46, 46, 90, 90]); c.fill();
    c.shadowColor = 'transparent';
    const lid = c.createLinearGradient(-340, 0, 340, 0); lid.addColorStop(0, '#1f7a4c'); lid.addColorStop(.4, '#48c486'); lid.addColorStop(1, '#17603b');
    c.fillStyle = lid; rr(-342, -430, 684, 96, 34); c.fill();
    c.fillStyle = '#17603b'; c.textAlign = 'center';
    c.font = "800 118px 'Bricolage Grotesque', sans-serif"; c.fillText('MAGERE', 0, -208);
    c.fillText('KWARK', 0, -100);
    c.font = "700 44px 'DM Sans', sans-serif"; c.fillStyle = '#48a876'; c.fillText('naturel · 500 g', 0, -40);
    // streepjescode
    c.fillStyle = '#fff'; rr(-262, 20, 524, 300, 14); c.fill();
    c.strokeStyle = '#d7ded9'; c.lineWidth = 3; c.stroke();
    const m = 4.6, x0 = -(95 * m) / 2;
    c.fillStyle = '#111';
    for (let i = 0; i < 95; i++) if (bits[i] === '1') {
      const guard = i < 3 || (i >= 45 && i < 50) || i >= 92;
      c.fillRect(x0 + i * m, 44, m + 0.4, guard ? 228 : 204);
    }
    // cijfers onder de streepjes: elk cijfer onder zijn eigen zeven streepjes, zoals op een echt pak
    c.font = "500 34px 'DejaVu Sans Mono', monospace"; c.textAlign = 'center';
    c.fillText(EAN[0], x0 - 22, 290);
    for (let i = 0; i < 6; i++) { c.fillText(EAN[1 + i], x0 + (3 + 7 * i + 3.5) * m, 290); c.fillText(EAN[7 + i], x0 + (50 + 7 * i + 3.5) * m, 290); }
    c.setTransform(1, 0, 0, 1, 0, 0); c.filter = 'none';
    // lichte vignettering zoals een cameralens
    const v = c.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 860); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.42)');
    c.fillStyle = v; c.fillRect(0, 0, W, H);
  }
  draw(0, 0);
  const stream = cv.captureStream(30);
  window.__cam = { draw, hit: false, code: EAN };
  if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => stream;
  // de app leest met BarcodeDetector; wij bepalen zelf op welk moment de code "scherp" in beeld is
  window.BarcodeDetector = class {
    static async getSupportedFormats() { return ['ean_13', 'ean_8', 'upc_a', 'upc_e']; }
    async detect() { window.__cam.last = Date.now(); return window.__cam.hit ? [{ rawValue: EAN }] : []; }
  };
}

const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const P = (f, a, b) => Math.min(1, Math.max(0, (f - a) / (b - a)));
const S = o => ({ ...o, MEALS });

/** Draait in de app: log één maaltijd op vandaag (zoals de gebruiker dat met een eigen maaltijd in één tik doet). */
async function logMeal({ meal, items }) {
  const { useStore } = await import('/src/lib/store.ts');
  const { FOODS } = await import('/src/data/foods.ts');
  const { dateKey } = await import('/src/lib/date.ts');
  for (const [name, n] of items) {
    const f = FOODS.find(x => x.name === name), p = f.portions[0];
    useStore.getState().addFood(dateKey(), meal, f, p.g * n, `${String(n).replace('.', ',')} × ${p.label}`);
  }
}

module.exports = {
  viewport: { width: 390, height: 800 },
  scale: 3,
  fps: 30,
  theme: 'dark',
  time: day(1, '13:05'),
  seed,
  /** per browser: nepcamera en een vaste uitkomst van de online productdatabase */
  async prepare(ctx) {
    await ctx.addInitScript(fakeCamera, EAN);
    await ctx.route(/openfoodfacts\.org/, route => {
      if (!route.request().url().includes('/api/v2/product/')) return route.fulfill({ json: { hits: [], products: [] } });
      return route.fulfill({ json: { status: 1, product: {
        product_name_nl: 'Magere kwark', quantity: '500 g', serving_size: '150 g', serving_quantity: 150,
        nutriments: { 'energy-kcal_100g': 55, proteins_100g: 10, carbohydrates_100g: 3.5, fat_100g: 0.1, fiber_100g: 0 },
      } } });
    });
  },
  // De video loopt op 128 bpm: 1 tel = 14 frames. Frame 4 van elke clip valt op de eerste tel van het shot
  // (LEAD in scene.html), dus tel 2 = frame 18, tel 3 = frame 32, tel 4 = frame 46. Handelingen vallen op de tel.
  clips: {
    // Dag 1: het dashboard. De dag vult zich: ontbijt, lunch en een snack, de ring loopt mee.
    dash: {
      time: day(1, '13:05'), seed: S({ day: 1, today: { meals: [], glasses: 5, steps: 4380, walk: true } }), frames: 72,
      async frame(f, h) {
        if (f === 0) await h.box('ring', '.daycard');
        if (f === 11) { await h.eval(logMeal, { meal: 'ontbijt', items: MEALS.ontbijt[0] }); h.mark('log1'); }
        if (f === 25) { await h.eval(logMeal, { meal: 'lunch', items: MEALS.lunch[0] }); h.mark('log2'); }
        if (f === 39) { await h.eval(logMeal, { meal: 'snacks', items: MEALS.snacks[0] }); h.mark('log3'); }
      },
    },
    // Dag 2: barcodescanner (Premium). Scannen, gevonden op tel 2, toevoegen op tel 4.
    scan: {
      time: day(2, '12:38'), seed: S({ day: 2, today: { meals: ['ontbijt'], glasses: 3, steps: 4120 } }), frames: 72,
      async setup(h) {
        await h.eval(() => Promise.all([document.fonts.load("800 118px 'Bricolage Grotesque'"), document.fonts.load("700 44px 'DM Sans'")]));
        await h.eval(async () => { const { useUI } = await import('/src/lib/ui.ts'); useUI.getState().open({ type: 'addFood', meal: 'lunch' }); });
        await h.wait(700);
        await h.click('.quickbtn:has-text("Scannen")');
        await h.wait(1200);
      },
      // de app leest elke 250 ms het camerabeeld: zet de klok zo dat er precies in frame 18 een leespoging valt
      async align(h) {
        const { last, now } = await h.eval(() => ({ last: window.__cam.last, now: Date.now() }));
        await h.page.clock.runFor((((last - now - 616) % 250) + 250) % 250);
      },
      async frame(f, h) {
        await h.eval(([k, t]) => window.__cam.draw(k, t), [P(f, 0, 16), f / 30]);
        if (f === 0) { await h.box('camera', '.video-box'); await h.box('sheet', '.sheet'); }
        if (f === 18) await h.eval(() => { window.__cam.hit = true; });
        if (f === 30) { await h.box('product', '.fd-head'); await h.box('addbtn', '.sheet .btn.block:has-text("Toevoegen")'); }
        if (f === 56) await h.box('toast', '.toast');
        if (f === 43) { await h.tap('.sheet .btn.block:has-text("Toevoegen")'); h.mark('add'); }
      },
      async afterStep(f, h) { if (f === 18) { await h.page.waitForSelector('.fd-name', { timeout: 5000 }); h.mark('found'); } },
    },
    // Dag 5: recepten die bij je doel passen. Van de suggesties voor vanavond naar alle 146 recepten.
    recipes: {
      time: day(5, '17:42'), seed: S({ day: 5, today: { meals: ['ontbijt', 'lunch', 'snacks'], glasses: 7, steps: 7340, trained: true } }), frames: 72,
      async setup(h) { await h.click('nav.tabbar button.tab:has-text("Recepten")'); await h.wait(900); },
      async frame(f, h) {
        if (f === 0) await h.box('tips', 'section:has-text("Wat ga je nu eten?")');
        await h.eval(y => window.scrollTo(0, y), Math.round(1236 * eio(P(f, 11, 41)) + 150 * P(f, 41, 72)));
        if (f === 42) await h.box('grid', '.recipe-grid');
      },
    },
    // Dag 8: training volgens schema, met het voorstel om zwaarder te gaan. Sets afvinken op tel 2, 3 en 4.
    training: {
      time: day(8, '18:04'), seed: S({ day: 8, today: { meals: ['ontbijt', 'lunch', 'snacks'], glasses: 7, steps: 6890 } }), frames: 72,
      async setup(h) {
        await h.click('nav.tabbar button.tab:has-text("Training")'); await h.wait(700);
        await h.click('button:has-text("Start training")'); await h.wait(900);
      },
      async frame(f, h) {
        if (f === 0) await h.box('exercise', '.tr-cur');
        const i = [15, 29, 43].indexOf(f);
        if (i >= 0) { await h.tap(h.page.locator('.tr-set .tr-check').nth(i)); h.mark('set' + (i + 1)); }
      },
    },
    // Dag 14: statistieken, en dan door naar je gewichtstrend.
    stats: {
      time: day(14, '20:31'), seed: S({ day: 14, today: { meals: ['ontbijt', 'lunch', 'diner', 'snacks'], glasses: 10, steps: 8760, habits: ['groente', 'fruit', 'slaap'] } }), frames: 72,
      async setup(h) {
        await h.click('nav.tabbar button.tab:has-text("Voortgang")'); await h.wait(900);
        h.target = await h.eval(() => { const c = [...document.querySelectorAll('.card, section')].find(e => /Trendgewicht/.test(e.textContent) && e.getBoundingClientRect().height < 700); return c ? Math.round(c.getBoundingClientRect().top + scrollY - 64) : 2500; });
      },
      async frame(f, h) {
        await h.eval(y => window.scrollTo(0, y), Math.round(h.target * eio(P(f, 11, 39))));
        if (f === 39) h.mark('weight');
        if (f === 41) await h.box('weight', h.page.locator('.card, section').filter({ hasText: 'Trendgewicht' }).last());
      },
    },
  },
};
