const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const root = document.documentElement;

function fit(canvas) {
  const d = Math.min(window.devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect();
  canvas.width = r.width * d;
  canvas.height = r.height * d;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(d, 0, 0, d, 0, 0);
  return { ctx, w: r.width, h: r.height };
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 1800);
}

/* ---------- drifting background art ---------- */
if (!calm) {
  const layer = $('.floaties');
  const bits = ['♡', '✦', '☁', '❄', '♡', '✧', '⛰', '♡'];
  for (let i = 0; i < 22; i++) {
    const s = document.createElement('span');
    s.textContent = pick(bits);
    s.style.cssText = `left:${rand(0, 100)}vw;font-size:${rand(14, 42)}px;--t:${rand(14, 30)}s;--d:${-rand(0, 30)}s;--sway:${rand(-80, 80)}px;--rot:${rand(-200, 200)}deg`;
    layer.append(s);
  }
}

/* ---------- pointer sparkles ---------- */
function burst(x, y, n, glyphs) {
  if (calm) return;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'spark';
    s.textContent = pick(glyphs);
    s.style.cssText = `left:${x}px;top:${y}px;--s:${rand(12, 26)}px;--tx:${rand(-70, 70)}px;--ty:${rand(-70, 70)}px;--c:${pick(['#fff', '#ff4fa3', '#ffe08a', '#cdb4ff'])}`;
    document.body.append(s);
    s.addEventListener('animationend', () => s.remove());
  }
}
let lastSpark = 0;
addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || e.timeStamp - lastSpark < 60) return;
  lastSpark = e.timeStamp;
  burst(e.clientX, e.clientY, 1, ['✦', '✧', '♡']);
});
addEventListener('pointerdown', (e) => burst(e.clientX, e.clientY, 8, ['♡', '✦', '♥']));

/* ---------- hero: parallax + draggable stickers ---------- */
const hero = $('.hero');
hero.addEventListener('pointermove', (e) => {
  if (calm) return;
  const r = hero.getBoundingClientRect();
  hero.style.setProperty('--mx', (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
  hero.style.setProperty('--my', (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
});
$$('.sticker').forEach((s) => {
  let ox = 0, oy = 0, sx = 0, sy = 0, drag = false;
  s.addEventListener('pointerdown', (e) => {
    drag = true;
    s.setPointerCapture(e.pointerId);
    sx = e.clientX - ox;
    sy = e.clientY - oy;
    s.classList.add('grab');
  });
  s.addEventListener('pointermove', (e) => {
    if (!drag) return;
    ox = e.clientX - sx;
    oy = e.clientY - sy;
    s.style.setProperty('--dx', ox + 'px');
    s.style.setProperty('--dy', oy + 'px');
  });
  const drop = () => { drag = false; s.classList.remove('grab'); };
  s.addEventListener('pointerup', drop);
  s.addEventListener('pointercancel', drop);
});
$$('.title span').forEach((l) => l.addEventListener('click', () => {
  l.classList.remove('pop');
  void l.offsetWidth;
  l.classList.add('pop');
}));

// mountain layers slide at different speeds while scrolling
const layers = [['.hero .r3', 0.25], ['.hero .r2', 0.15], ['.hero .r1', 0.05]].map(([s, k]) => [$(s), k]);
if (!calm) addEventListener('scroll', () => {
  const y = Math.min(scrollY, innerHeight);
  layers.forEach(([el, k]) => el.setAttribute('transform', `translate(0 ${y * k})`));
}, { passive: true });

/* ---------- reveal + count-up ---------- */
const io = new IntersectionObserver((entries) => entries.forEach((en) => {
  if (!en.isIntersecting) return;
  en.target.classList.add('in');
  io.unobserve(en.target);
  $$('[data-to]', en.target).forEach(countUp);
}), { threshold: 0.15 });
$$('.reveal').forEach((el) => io.observe(el));

function countUp(el) {
  if (calm) return;
  const to = +el.dataset.to, dec = +el.dataset.dec || 0, suf = el.dataset.suffix || '';
  const t0 = performance.now();
  (function tick(t) {
    const p = Math.min((t - t0) / 1400, 1);
    el.textContent = (to * (1 - Math.pow(1 - p, 3))).toFixed(dec) + suf;
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}

/* ---------- glam: makeup mixer ---------- */
const lookA = ['Strawberry', 'Peach', 'Lilac', 'Cherry', 'Glacier', 'Rose', 'Sugar', 'Sunset', 'Mochi', 'Blossom'];
const lookB = ['Cloud', 'Summit', 'Powder', 'Princess', 'Player', 'Dream', 'Bloom', 'Frost', 'Glow', 'Heartbreaker'];
const nameLook = () => { $('#lookName b').textContent = `${pick(lookA)} ${pick(lookB)}`; };
function choose(btn) {
  const set = btn.closest('fieldset');
  $$('button', set).forEach((b) => b.classList.toggle('on', b === btn));
  root.style.setProperty(set.dataset.var, btn.style.getPropertyValue('--c'));
}
$$('.controls fieldset button').forEach((b) => {
  b.type = 'button';
  b.addEventListener('click', () => { choose(b); nameLook(); });
});
$('#shuffle').addEventListener('click', () => {
  $$('.controls fieldset').forEach((set) => choose(pick($$('button', set))));
  nameLook();
});
$('#glitterBtn').addEventListener('click', (e) => {
  const matte = $('.face').classList.toggle('matte');
  e.currentTarget.setAttribute('aria-pressed', String(!matte));
});

/* ---------- play: Heart Catch ---------- */
(() => {
  const canvas = $('#game'), overlay = $('#gOverlay'), msg = $('#gMsg');
  let g = fit(canvas), running = false, raf = 0;
  let items, px, score, lives, last, spawn, speed;
  let best = 0;
  try { best = +localStorage.getItem('elyza-best') || 0; } catch {}
  $('#gBest').textContent = best;
  const keys = {};

  function start() {
    g = fit(canvas);
    items = []; px = g.w / 2; score = 0; lives = 3; spawn = 0; speed = 1;
    last = performance.now();
    running = true;
    overlay.hidden = true;
    hud();
    canvas.focus({ preventScroll: true });
    raf = requestAnimationFrame(loop);
  }
  function hud() {
    $('#gScore').textContent = score;
    $('#gLives').textContent = '♥'.repeat(lives) + '♡'.repeat(3 - lives);
  }
  function over() {
    running = false;
    cancelAnimationFrame(raf);
    if (score > best) {
      best = score;
      try { localStorage.setItem('elyza-best', best); } catch {}
      $('#gBest').textContent = best;
      msg.textContent = `NEW HIGH SCORE\n${score}`;
    } else {
      msg.textContent = `GAME OVER\nscore ${score}`;
    }
    $('#gStart').textContent = '↻ AGAIN';
    overlay.hidden = false;
  }
  function loop(t) {
    if (!running) return;
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;
    const { ctx, w, h } = g;
    if (keys.ArrowLeft) px -= 520 * dt;
    if (keys.ArrowRight) px += 520 * dt;
    px = Math.max(30, Math.min(w - 30, px));
    speed += dt * 0.03;
    spawn -= dt;
    if (spawn <= 0) {
      spawn = rand(0.35, 0.8) / speed;
      const bad = Math.random() < 0.22;
      items.push({ x: rand(24, w - 24), y: -30, v: rand(150, 260) * speed, bad, e: bad ? '👾' : pick(['💖', '💄', '⭐', '🎀', '💖']) });
    }
    ctx.clearRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '30px serif';
    const py = h - 40;
    for (const it of items) {
      it.y += it.v * dt;
      ctx.fillText(it.e, it.x, it.y);
      if (!it.hit && Math.abs(it.x - px) < 38 && Math.abs(it.y - py) < 30) {
        it.hit = true;
        if (it.bad) lives--; else score += it.e === '⭐' ? 3 : 1;
        hud();
      }
    }
    items = items.filter((it) => !it.hit && it.y < h + 40);
    ctx.font = '46px serif';
    ctx.fillText('🎮', px, py);
    if (lives <= 0) return over();
    raf = requestAnimationFrame(loop);
  }
  const move = (e) => { px = e.clientX - canvas.getBoundingClientRect().left; };
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerdown', move);
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { keys[e.key] = true; e.preventDefault(); }
  });
  canvas.addEventListener('keyup', (e) => { keys[e.key] = false; });
  $('#gStart').addEventListener('click', start);
  addEventListener('resize', () => { g = fit(canvas); });
})();

/* ---------- peaks: trail log ---------- */
(() => {
  const stops = [
    { at: 0.36, k: 'stop 1', t: 'Lake Louise', p: "Water so turquoise it looks edited. It isn't. She checked." },
    { at: 0.74, k: 'stop 2', t: 'Mt. Little Arethusa', p: 'A Kananaskis scramble with a ridge walk that earns every photo.' },
    { at: 1, k: 'next up', t: 'Wherever she points', p: 'The next summit is still a secret. Pack snacks and a lip tint.' },
  ];
  const path = $('#trailPath'), hiker = $('#hiker'), card = $('#stopCard');
  const len = path.getTotalLength();
  let pos = 0, anim = 0;
  function place(f) {
    const p = path.getPointAtLength(len * f);
    hiker.setAttribute('x', p.x);
    hiker.setAttribute('y', p.y - 8);
  }
  function go(i) {
    const s = stops[i];
    $$('.pin').forEach((p) => p.classList.toggle('on', +p.dataset.stop === i));
    $('#stopKicker').textContent = s.k;
    $('#stopTitle').textContent = s.t;
    $('#stopText').textContent = s.p;
    card.classList.remove('swap');
    void card.offsetWidth;
    card.classList.add('swap');
    cancelAnimationFrame(anim);
    if (calm) { pos = s.at; return place(pos); }
    const from = pos, t0 = performance.now();
    (function step(t) {
      const k = Math.min((t - t0) / 900, 1);
      pos = from + (s.at - from) * (1 - Math.pow(1 - k, 3));
      place(pos);
      if (k < 1) anim = requestAnimationFrame(step);
    })(t0);
  }
  $$('.pin').forEach((p) => {
    p.addEventListener('click', () => go(+p.dataset.stop));
    p.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(+p.dataset.stop); }
    });
  });
  new IntersectionObserver((en, o) => {
    if (en[0].isIntersecting) { go(0); o.disconnect(); }
  }, { threshold: 0.4 }).observe($('.trail'));
})();

/* ---------- shred: carving toy ---------- */
(() => {
  const canvas = $('#slope');
  let g = fit(canvas), visible = false, raf = 0, last = 0;
  let x = g.w / 2, target = x, trail = [], trees = [], dist = 0, streak = 0, spawn = 0, bump = 0;
  const SPEED = 230, RY = 110;

  function draw() {
    const { ctx, w, h } = g;
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    ctx.lineWidth = 9;
    ctx.strokeStyle = 'rgba(255, 79, 163, .35)';
    ctx.beginPath();
    trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '40px serif';
    trees.forEach((t) => ctx.fillText('🌲', t.x, t.y));
    ctx.save();
    ctx.translate(x + (bump > 0 ? rand(-4, 4) : 0), RY);
    ctx.rotate(Math.max(-0.5, Math.min(0.5, (target - x) / 160)));
    ctx.font = '48px serif';
    ctx.fillText('🏂', 0, 0);
    ctx.restore();
  }
  function loop(t) {
    if (!visible) return;
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;
    const { w, h } = g;
    x += (target - x) * Math.min(1, dt * 6);
    trail.push({ x, y: RY + 18 });
    trail.forEach((p) => { p.y -= SPEED * dt; });
    trail = trail.filter((p) => p.y > -10);
    spawn -= dt;
    if (spawn <= 0) { spawn = rand(0.5, 1.1); trees.push({ x: rand(30, w - 30), y: h + 40 }); }
    bump -= dt;
    for (const tr of trees) {
      tr.y -= SPEED * dt;
      if (!tr.done && tr.y < RY + 20) {
        tr.done = true;
        if (Math.abs(tr.x - x) < 34) { streak = 0; bump = 0.35; } else streak++;
        $('#sStreak').textContent = streak;
      }
    }
    trees = trees.filter((tr) => tr.y > -40);
    dist += SPEED * dt / 20;
    $('#sDist').textContent = Math.floor(dist);
    draw();
    raf = requestAnimationFrame(loop);
  }
  const steer = (e) => { target = e.clientX - canvas.getBoundingClientRect().left; };
  canvas.addEventListener('pointermove', steer);
  canvas.addEventListener('pointerdown', steer);
  new IntersectionObserver((en) => {
    visible = en[0].isIntersecting && !calm;
    cancelAnimationFrame(raf);
    if (visible) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }, { threshold: 0.2 }).observe(canvas);
  addEventListener('resize', () => { g = fit(canvas); draw(); });
  draw();
})();

/* ---------- site-wide snowfall ---------- */
(() => {
  const canvas = $('#snowfall'), btn = $('#snowBtn');
  let g, flakes = [], on = false, raf = 0;
  function loop() {
    if (!on) return;
    const { ctx, w, h } = g;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    for (const f of flakes) {
      f.y += f.v;
      f.x += Math.sin((f.y + f.o) / 40) * 0.6;
      if (f.y > h + 5) { f.y = -5; f.x = rand(0, w); }
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, 6.3);
      ctx.fill();
    }
    raf = requestAnimationFrame(loop);
  }
  function set(state) {
    on = state;
    canvas.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.textContent = on ? '☀ stop the snow' : '❄ let it snow';
    cancelAnimationFrame(raf);
    if (!on) return;
    g = fit(canvas);
    flakes = Array.from({ length: 120 }, () => ({ x: rand(0, g.w), y: rand(0, g.h), r: rand(1.5, 4.5), v: rand(0.6, 2.2), o: rand(0, 300) }));
    loop();
  }
  btn.addEventListener('click', () => set(!on));
  addEventListener('resize', () => { if (on) g = fit(canvas); });
})();

/* ---------- faves: copy code + tilt cards ---------- */
$('#codeBtn').addEventListener('click', async (e) => {
  try {
    await navigator.clipboard.writeText('ELYZA00');
    toast('ELYZA00 copied ♡');
  } catch {
    toast('code: ELYZA00');
  }
  burst(e.clientX, e.clientY, 16, ['♡', '✦', '♥', '✧']);
});
if (!calm) $$('.card').forEach((c) => {
  c.addEventListener('pointermove', (e) => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 14 + 'deg');
    c.style.setProperty('--rx', ((e.clientY - r.top) / r.height - 0.5) * -14 + 'deg');
  });
  c.addEventListener('pointerleave', () => { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); });
});
