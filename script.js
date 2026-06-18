/* ═══════════════════════════════════════════════════════════════════
   TELPURNAR — Main Script v4
   Light · Natural. Modules: Lang (IS default) · Loader · Nav ·
   Hero slideshow · Scroll reveal · Gallery · Music
═══════════════════════════════════════════════════════════════════ */

'use strict';

const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ─── LANGUAGE — defaults to Icelandic ───────────────────────────── */
const Lang = (function () {
  let current = 'is';
  function apply(lang) {
    current = lang === 'en' ? 'en' : 'is';
    document.documentElement.lang = current;
    document.querySelectorAll('[data-is][data-en]').forEach(el => {
      const v = el.getAttribute('data-' + current);
      if (v !== null) el.textContent = v;
    });
    const isEl = document.querySelector('.lt-is');
    const enEl = document.querySelector('.lt-en');
    if (isEl) isEl.classList.toggle('active', current === 'is');
    if (enEl) enEl.classList.toggle('active', current === 'en');
  }
  function toggle() { apply(current === 'is' ? 'en' : 'is'); }
  return { apply, toggle, get: () => current };
})();

Lang.apply('is');
document.getElementById('langToggle')?.addEventListener('click', Lang.toggle);

/* ─── NAV scroll state ───────────────────────────────────────────── */
(function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ─── HERO SLIDESHOW — crossfade + clip wipe + Ken Burns ─────────── */
(function initSlideshow() {
  const slides = Array.from(document.querySelectorAll('.hero-slide'));
  const dotsWrap = document.getElementById('heroDots');
  if (slides.length < 2) return;

  let active = 0;
  let timer = null;
  const DWELL = 6500;

  // Build dots
  const dots = slides.map((_, i) => {
    const d = document.createElement('button');
    d.className = 'hero-dot' + (i === 0 ? ' active' : '');
    d.setAttribute('role', 'tab');
    d.setAttribute('aria-label', 'Mynd ' + (i + 1));
    d.addEventListener('click', () => { go(i); restart(); });
    dotsWrap.appendChild(d);
    return d;
  });

  function go(next) {
    if (next === active) return;
    const current = slides[active];
    const incoming = slides[next];

    current.classList.remove('is-active');
    current.classList.add('is-leaving');           // hold fully revealed, fade only
    void incoming.offsetWidth;                      // reflow → restart Ken Burns
    incoming.classList.add('is-active');

    window.setTimeout(() => current.classList.remove('is-leaving'), 1700);

    dots[active].classList.remove('active');
    dots[next].classList.add('active');
    active = next;
  }

  function advance() { go((active + 1) % slides.length); }

  function restart() {
    if (timer) clearInterval(timer);
    if (!REDUCE) timer = setInterval(advance, DWELL);
  }

  // Pause when tab hidden; resume when visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (timer) clearInterval(timer); }
    else restart();
  });

  restart();
})();

/* ─── HERO intro reveal ──────────────────────────────────────────── */
function playHeroIntro() {
  document.querySelector('.hero')?.classList.add('is-ready');
}

/* ─── LOADER ─────────────────────────────────────────────────────── */
window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  window.setTimeout(() => {
    loader?.classList.add('done');
    playHeroIntro();
  }, 350);
});
// Safety net: never let the loader trap the page
window.setTimeout(() => {
  document.getElementById('loader')?.classList.add('done');
  playHeroIntro();
}, 2500);

/* ─── SCROLL REVEAL — gentle, staggered ──────────────────────────── */
(function initReveal() {
  const groups = [
    ['.film-poster-wrap'],
    ['.film-info > *'],
    ['.gallery-header > *'],
    ['.gallery-item'],
    ['.filmmakers-inner > .section-eyebrow'],
    ['.director-card'],
    ['.music-inner > *'],
  ];

  const targets = [];
  groups.forEach(sel => {
    const els = Array.from(document.querySelectorAll(sel[0]));
    els.forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = (i * 90) + 'ms';
      targets.push(el);
    });
  });

  if (REDUCE || !('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('in'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  targets.forEach(el => io.observe(el));
})();

/* ─── GALLERY — arrows + progress ────────────────────────────────── */
(function initGallery() {
  const track = document.getElementById('galleryTrack');
  const prev = document.getElementById('galleryPrev');
  const next = document.getElementById('galleryNext');
  const progress = document.getElementById('galleryProgress');
  if (!track) return;

  function step() {
    const item = track.querySelector('.gallery-item');
    if (!item) return track.clientWidth * 0.8;
    const gap = parseInt(getComputedStyle(track).gap) || 16;
    return item.offsetWidth + gap;
  }

  prev?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  next?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));

  function updateProgress() {
    if (!progress) return;
    const max = track.scrollWidth - track.clientWidth;
    progress.style.width = (max > 0 ? (track.scrollLeft / max) * 100 : 0) + '%';
  }
  track.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
})();

/* ─── MUSIC — ambient Web Audio preview ──────────────────────────── */
(function initMusicPlayer() {
  const TRACK_PRESETS = [
    [{ f: 55,   g: 0.040 }, { f: 110,   g: 0.028 }, { f: 165,   g: 0.018 }, { f: 220,   g: 0.010 }],
    [{ f: 73.4, g: 0.038 }, { f: 146.8, g: 0.026 }, { f: 220.0, g: 0.016 }, { f: 293.7, g: 0.010 }],
    [{ f: 82.4, g: 0.040 }, { f: 164.8, g: 0.028 }, { f: 247.1, g: 0.016 }, { f: 329.6, g: 0.008 }],
    [{ f: 98.0, g: 0.038 }, { f: 196.0, g: 0.026 }, { f: 294.0, g: 0.018 }, { f: 392.0, g: 0.010 }],
  ];

  let audioCtx = null, oscs = [], gains = [], master = null, lfo = null, lfoGain = null;
  let isPlaying = false, currentTrack = -1;

  function ensureContext() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    master = audioCtx.createGain();
    master.gain.value = 1;
    master.connect(audioCtx.destination);
    lfo = audioCtx.createOscillator();
    lfoGain = audioCtx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 0.008;
    lfo.connect(lfoGain);
    lfoGain.connect(master.gain);
    lfo.start();
  }

  function stopTones() {
    gains.forEach(g => {
      if (!audioCtx) return;
      g.gain.setValueAtTime(g.gain.value, audioCtx.currentTime);
      g.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4);
    });
    const snap = oscs.slice();
    setTimeout(() => snap.forEach(o => { try { o.stop(); } catch (_) {} }), 450);
    oscs = []; gains = [];
  }

  function playTones(idx) {
    ensureContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    stopTones();
    (TRACK_PRESETS[idx] || TRACK_PRESETS[0]).forEach(({ f, g }) => {
      const osc = audioCtx.createOscillator();
      const gn = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gn.gain.setValueAtTime(0, audioCtx.currentTime);
      gn.gain.linearRampToValueAtTime(g, audioCtx.currentTime + 2.0);
      osc.connect(gn); gn.connect(master); osc.start();
      oscs.push(osc); gains.push(gn);
    });
  }

  function setState(idx, playing) {
    document.querySelectorAll('.tl-track').forEach((el, i) => {
      el.classList.toggle('active', i === idx);
      el.classList.toggle('playing', i === idx && playing);
    });
  }

  function select(idx) {
    if (idx === currentTrack) {
      isPlaying = !isPlaying;
      if (isPlaying) { playTones(idx); setState(idx, true); }
      else { stopTones(); setState(idx, false); }
      return;
    }
    currentTrack = idx; isPlaying = true;
    playTones(idx); setState(idx, true);
  }

  document.querySelectorAll('.tl-track').forEach((el, i) => {
    el.addEventListener('click', () => select(i));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(i); }
    });
  });
})();
