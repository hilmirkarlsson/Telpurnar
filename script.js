/* ═══════════════════════════════════════════════════════════════════
   TELPURNAR — Script v5
   Grain · Dust · Nav · Lang · Lenis · Parallax · Reveals · Gallery · Music
═══════════════════════════════════════════════════════════════════ */

'use strict';

/* ─── GRAIN ──────────────────────────────────────────────────────── */
(function () {
  const el = document.getElementById('grain');
  if (!el) return;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 200;
  const ctx = cv.getContext('2d');
  function tick() {
    const d = ctx.createImageData(200, 200);
    const px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      px[i] = px[i + 1] = px[i + 2] = v;
      px[i + 3] = 255;
    }
    ctx.putImageData(d, 0, 0);
    el.style.backgroundImage = `url(${cv.toDataURL()})`;
  }
  tick();
  setInterval(tick, 100);
})();

/* ─── DUST PARTICLES ─────────────────────────────────────────────── */
(function () {
  const cv = document.getElementById('dust');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let W, H;
  function resize() {
    W = cv.width  = window.innerWidth;
    H = cv.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });
  const COLORS = [
    'rgba(212,184,150,0.052)', 'rgba(184,134,90,0.038)',
    'rgba(237,230,217,0.044)', 'rgba(158,144,128,0.036)',
  ];
  function spawn() {
    return {
      x: Math.random() * W, y: H + Math.random() * 80,
      r: Math.random() * 1.4 + 0.3,
      speed: Math.random() * 0.20 + 0.08,
      dx: (Math.random() - 0.5) * 0.12,
      wave: Math.random() * Math.PI * 2,
      color: COLORS[(Math.random() * COLORS.length) | 0],
    };
  }
  const pts = Array.from({ length: 20 }, () => { const p = spawn(); p.y = Math.random() * H; return p; });
  (function tick() {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      p.y -= p.speed; p.wave += 0.009;
      p.x += Math.sin(p.wave) * 0.26 + p.dx;
      if (p.y < -6) pts[i] = spawn();
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      ctx.fillStyle = p.color; ctx.fill();
    }
    requestAnimationFrame(tick);
  })();
})();

/* ─── NAV ────────────────────────────────────────────────────────── */
(function () {
  const nav = document.getElementById('nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 80);
  }, { passive: true });
})();

/* ─── LANGUAGE ───────────────────────────────────────────────────── */
const Lang = (function () {
  let lang = 'is';
  function apply(l) {
    lang = l;
    document.documentElement.lang = l === 'is' ? 'is' : 'en';
    document.querySelectorAll('[data-en][data-is]').forEach(el => {
      const val = el.getAttribute(`data-${l}`);
      if (val !== null) el.innerHTML = val;
    });
    document.querySelector('.lt-en')?.classList.toggle('active', l === 'en');
    document.querySelector('.lt-is')?.classList.toggle('active', l === 'is');
  }
  function toggle() { apply(lang === 'en' ? 'is' : 'en'); }
  apply('is');
  return { toggle };
})();
document.getElementById('langToggle')?.addEventListener('click', Lang.toggle);

/* ─── SCROLL ENGINE ──────────────────────────────────────────────── */
window.addEventListener('load', function () {
  if (typeof gsap === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = window.innerWidth >= 768;

  /* ── Lenis smooth scroll ──────────────────────────────────────── */
  if (typeof Lenis !== 'undefined' && !reduced) {
    const lenis = new Lenis({
      duration:    1.2,
      easing:      t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  if (reduced) return;

  const E = { enter: 'power3.out', soft: 'power2.out' };

  /* Helper: text wipes up from below a mask line */
  function wipeUp(el, opts = {}) {
    const { trigger, delay = 0, duration = 1.0, yStart = 12 } = opts;
    gsap.fromTo(el,
      { clipPath: 'inset(100% 0 0 0)', y: yStart },
      {
        clipPath: 'inset(0% 0 0 0)', y: 0,
        duration, ease: E.enter, delay,
        scrollTrigger: { trigger: trigger || el, start: 'top 86%', once: true },
      }
    );
  }

  /* ══════════════════════════════════════════════════════════════
     HERO PARALLAX — layers move at drastically different rates.
     The title-page is position:sticky so the film section
     physically slides over it as a card as you scroll.
  ══════════════════════════════════════════════════════════════ */
  const heroST = { trigger: '.title-page', start: 'top top', end: 'bottom top', scrub: 1 };
  gsap.to('.title-kicker',  { y: -50,  ease: 'none', scrollTrigger: heroST });
  gsap.to('.title-word',    { y: -130, ease: 'none', scrollTrigger: heroST });
  gsap.to('.title-logline', { y: -30,  ease: 'none', scrollTrigger: heroST });
  gsap.to('.scroll-cue',    { y: -80, opacity: 0, ease: 'none', scrollTrigger: heroST });

  /* ══════════════════════════════════════════════════════════════
     FILM SECTION
  ══════════════════════════════════════════════════════════════ */
  gsap.from('.film-art-wrap', {
    x: 50, opacity: 0, duration: 1.7, ease: E.enter,
    scrollTrigger: { trigger: '.film', start: 'top 78%', once: true },
  });
  if (desktop) {
    gsap.to('.film-art-wrap', {
      y: -70, ease: 'none',
      scrollTrigger: { trigger: '.film', start: 'top bottom', end: 'bottom top', scrub: 1.6 },
    });
  }
  wipeUp('.film-copy .label', { trigger: '.film-copy', duration: 0.85 });
  gsap.from('.film-synopsis', {
    opacity: 0, y: 24, duration: 1.3, ease: E.soft, delay: 0.12,
    scrollTrigger: { trigger: '.film-synopsis', start: 'top 84%', once: true },
  });
  gsap.from('.fact', {
    opacity: 0, x: -18, duration: 0.85, ease: E.soft, stagger: 0.08,
    scrollTrigger: { trigger: '.film-facts', start: 'top 82%', once: true },
  });

  /* ══════════════════════════════════════════════════════════════
     STILLS — horizontal pinned gallery on desktop,
     vertical stagger + parallax on mobile
  ══════════════════════════════════════════════════════════════ */
  wipeUp('.stills-label', { trigger: '.stills', duration: 0.9 });

  if (desktop) {
    const grid = document.querySelector('.stills-grid');
    if (grid) {
      /* Wait one frame so flex layout is calculated */
      requestAnimationFrame(() => {
        const dist = grid.scrollWidth - window.innerWidth;
        if (dist <= 0) return;

        gsap.to(grid, {
          x: () => -(grid.scrollWidth - window.innerWidth),
          ease: 'none',
          scrollTrigger: {
            trigger: '.stills',
            pin: true,
            scrub: 1,
            start: 'top top',
            end:   () => `+=${grid.scrollWidth - window.innerWidth}`,
            invalidateOnRefresh: true,
          },
        });
      });
    }
  } else {
    gsap.utils.toArray('.still').forEach((still, i) => {
      gsap.from(still, {
        opacity: 0, y: 32, duration: 1.1, ease: E.soft, delay: (i % 3) * 0.08,
        scrollTrigger: { trigger: '.stills-grid', start: 'top 80%', once: true },
      });
      gsap.to(still, {
        y: i % 2 === 0 ? -14 : 14, ease: 'none',
        scrollTrigger: { trigger: still, start: 'top bottom', end: 'bottom top', scrub: 1.3 },
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════
     FILMMAKERS — portraits slide in from opposing sides,
     names wipe up, parallax depth on portraits
  ══════════════════════════════════════════════════════════════ */
  wipeUp('.filmmakers-label', { trigger: '.filmmakers', duration: 0.9 });

  document.querySelectorAll('.filmmaker').forEach((fm, i) => {
    const dir      = i === 0 ? -1 : 1;
    const portrait = fm.querySelector('.filmmaker-portrait');
    const role     = fm.querySelector('.filmmaker-role');
    const name     = fm.querySelector('.filmmaker-name');
    const bio      = fm.querySelector('.filmmaker-bio');
    const ST       = { trigger: fm, start: 'top 78%', once: true };

    if (portrait) {
      gsap.from(portrait, { x: 65 * dir, opacity: 0, duration: 1.6, ease: E.enter, scrollTrigger: ST });
      gsap.to(portrait, {
        y: -30, ease: 'none',
        scrollTrigger: { trigger: fm, start: 'top bottom', end: 'bottom top', scrub: 1.4 },
      });
    }
    if (role) wipeUp(role, { trigger: fm, duration: 0.8 });
    if (name) wipeUp(name, { trigger: fm, delay: 0.1, duration: 1.3, yStart: 20 });
    if (bio)  gsap.from(bio, { opacity: 0, y: 20, duration: 1.2, ease: E.soft, delay: 0.22, scrollTrigger: ST });
  });

  /* ══════════════════════════════════════════════════════════════
     SCORE
  ══════════════════════════════════════════════════════════════ */
  wipeUp('.score-inner .label', { trigger: '.score', duration: 0.85 });
  wipeUp('.score-heading', { trigger: '.score-heading', delay: 0.1, duration: 1.4, yStart: 22 });
  gsap.from('.tl-track', {
    opacity: 0, x: 22, duration: 0.85, ease: E.soft, stagger: 0.07,
    scrollTrigger: { trigger: '.tracklist', start: 'top 82%', once: true },
  });
  gsap.from('.score-credit', {
    opacity: 0, y: 12, duration: 1.0, ease: E.soft,
    scrollTrigger: { trigger: '.score-credit', start: 'top 86%', once: true },
  });

  /* ══════════════════════════════════════════════════════════════
     FOOTER
  ══════════════════════════════════════════════════════════════ */
  gsap.from('.footer-inner > *', {
    opacity: 0, y: 10, duration: 0.9, ease: E.soft, stagger: 0.08,
    scrollTrigger: { trigger: '.footer', start: 'top 88%', once: true },
  });
});

/* ─── MUSIC PLAYER ───────────────────────────────────────────────── */
(function () {
  const PRESETS = [
    [{ f: 55,   g: 0.038 }, { f: 110,  g: 0.024 }, { f: 165,  g: 0.015 }],
    [{ f: 73.4, g: 0.036 }, { f: 146.8,g: 0.022 }, { f: 220,  g: 0.013 }],
    [{ f: 82.4, g: 0.038 }, { f: 164.8,g: 0.024 }, { f: 247.1,g: 0.012 }],
    [{ f: 98,   g: 0.036 }, { f: 196,  g: 0.022 }, { f: 294,  g: 0.014 }],
  ];
  let ctx = null, master = null, lfo = null;
  let oscs = [], gains = [];
  let playing = false, current = -1;
  function boot() {
    if (ctx) return;
    ctx    = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
    lfo    = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.07; lfoG.gain.value = 0.007;
    lfo.connect(lfoG); lfoG.connect(master.gain); lfo.start();
  }
  function stop() {
    gains.forEach(g => { g.gain.setValueAtTime(g.gain.value, ctx.currentTime); g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5); });
    const snap = oscs.slice();
    setTimeout(() => snap.forEach(o => { try { o.stop(); } catch (_) {} }), 550);
    oscs = []; gains = [];
  }
  function play(idx) {
    boot();
    if (ctx.state === 'suspended') ctx.resume();
    stop();
    PRESETS[idx].forEach(({ f, g }) => {
      const o = ctx.createOscillator(), gn = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      gn.gain.setValueAtTime(0, ctx.currentTime);
      gn.gain.linearRampToValueAtTime(g, ctx.currentTime + 2.5);
      o.connect(gn); gn.connect(master); o.start();
      oscs.push(o); gains.push(gn);
    });
  }
  function setState(idx, isPlaying) {
    document.querySelectorAll('.tl-track').forEach((el, i) => {
      el.classList.toggle('active',  i === idx);
      el.classList.toggle('playing', i === idx && isPlaying);
    });
  }
  function select(idx) {
    if (idx === current) { playing = !playing; if (playing) play(idx); else stop(); setState(idx, playing); return; }
    current = idx; playing = true; play(idx); setState(idx, true);
  }
  document.querySelectorAll('.tl-track').forEach((el, i) => {
    el.addEventListener('click', () => select(i));
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(i); } });
  });
})();
