/* ═══════════════════════════════════════════════════════════════════
   TELPURNAR — Script v3
   Grain · Nav · Lang · Reveals · Music
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
    const d = ctx.createImageData(200, 200).data.constructor
      ? ctx.createImageData(200, 200)
      : null;
    if (!d) return;
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
  let lang = 'en';

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

  return { toggle };
})();

document.getElementById('langToggle')?.addEventListener('click', Lang.toggle);

/* ─── SCROLL REVEALS ─────────────────────────────────────────────── */
window.addEventListener('load', function () {
  if (typeof gsap === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  /* Mark elements as reveal targets */
  const targets = [
    '.film-copy > *',
    '.film-art-wrap',
    '.stills-label',
    '.still',
    '.filmmaker-text',
    '.filmmaker-portrait',
    '.score-inner > *',
  ].join(', ');

  gsap.utils.toArray(targets).forEach(el => {
    gsap.fromTo(el,
      { opacity: 0, y: 14 },
      {
        opacity: 1,
        y: 0,
        duration: 1.4,
        ease: 'power1.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          once: true,
        },
      }
    );
  });

  /* Stills stagger */
  gsap.utils.toArray('.still').forEach((el, i) => {
    gsap.fromTo(el,
      { opacity: 0 },
      {
        opacity: 1,
        duration: 1.6,
        delay: i * 0.08,
        ease: 'power1.out',
        scrollTrigger: {
          trigger: '.stills-grid',
          start: 'top 85%',
          once: true,
        },
      }
    );
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
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoG.gain.value = 0.007;
    lfo.connect(lfoG);
    lfoG.connect(master.gain);
    lfo.start();
  }

  function stop() {
    gains.forEach(g => {
      g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    });
    const snap = oscs.slice();
    setTimeout(() => snap.forEach(o => { try { o.stop(); } catch (_) {} }), 550);
    oscs = []; gains = [];
  }

  function play(idx) {
    boot();
    if (ctx.state === 'suspended') ctx.resume();
    stop();
    PRESETS[idx].forEach(({ f, g }) => {
      const o = ctx.createOscillator();
      const gn = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      gn.gain.setValueAtTime(0, ctx.currentTime);
      gn.gain.linearRampToValueAtTime(g, ctx.currentTime + 2.5);
      o.connect(gn); gn.connect(master);
      o.start();
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
    if (idx === current) {
      playing = !playing;
      if (playing) play(idx); else stop();
      setState(idx, playing);
      return;
    }
    current = idx;
    playing = true;
    play(idx);
    setState(idx, true);
  }

  document.querySelectorAll('.tl-track').forEach((el, i) => {
    el.addEventListener('click', () => select(i));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(i); }
    });
  });
})();
