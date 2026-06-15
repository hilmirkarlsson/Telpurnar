/* ═══════════════════════════════════════════════════════════════════
   TELPURNAR — Main Script v2
   Modules: Grain · Cursor · Loader · Nav · Hero GSAP · Parallax
            Gallery · Music · Lang · ScrollReveal
═══════════════════════════════════════════════════════════════════ */

'use strict';

/* ─── GRAIN ──────────────────────────────────────────────────────── */
(function initGrain() {
  const grainEl = document.getElementById('grain');
  if (!grainEl) return;

  const canvas = document.createElement('canvas');
  canvas.width  = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  function drawNoise() {
    const img = ctx.createImageData(256, 256);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    grainEl.style.backgroundImage = `url(${canvas.toDataURL()})`;
  }

  drawNoise();
  setInterval(drawNoise, 80);
})();

/* ─── CUSTOM CURSOR ──────────────────────────────────────────────── */
(function initCursor() {
  const dot  = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  if (!dot || !ring) return;
  if (window.matchMedia('(pointer: coarse)').matches) return;

  let mx = window.innerWidth  / 2;
  let my = window.innerHeight / 2;
  let rx = mx, ry = my;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
  }, { passive: true });

  (function moveCursor() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    requestAnimationFrame(moveCursor);
  })();

  document.querySelectorAll('a, button, .tl-track, .gallery-item, .gallery-arrow, .film-poster-art').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hovered'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hovered'));
  });
})();

/* ─── LANGUAGE ───────────────────────────────────────────────────── */
const Lang = (function () {
  let current = 'en';

  function apply(lang) {
    current = lang;
    document.documentElement.lang = lang === 'is' ? 'is' : 'en';

    document.querySelectorAll('[data-en][data-is]').forEach(el => {
      el.textContent = el.getAttribute(`data-${lang}`);
    });

    const enEl = document.querySelector('.lt-en');
    const isEl = document.querySelector('.lt-is');
    if (enEl) enEl.classList.toggle('active', lang === 'en');
    if (isEl) isEl.classList.toggle('active', lang === 'is');
  }

  function toggle() { apply(current === 'en' ? 'is' : 'en'); }
  function get()    { return current; }

  return { apply, toggle, get };
})();

document.getElementById('langToggle').addEventListener('click', Lang.toggle);

/* ─── WAIT FOR GSAP ─────────────────────────────────────────────── */
window.addEventListener('load', function () {

  /* ── Loader ──────────────────────────────────────────────────── */
  const loader = document.getElementById('loader');

  function revealPage() {
    if (loader) {
      loader.style.transition = 'opacity 0.7s ease';
      loader.style.opacity = '0';
      setTimeout(() => { loader.style.display = 'none'; }, 800);
    }
    startHeroAnimation();
  }

  /* ── Nav scroll ──────────────────────────────────────────────── */
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', function () {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });

  /* ── Hero GSAP animation ─────────────────────────────────────── */
  function startHeroAnimation() {
    if (typeof gsap === 'undefined') {
      document.querySelectorAll('.hl').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      document.querySelectorAll('.hero-eyebrow,.hero-line,.hero-meta,.hero-scroll').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const tl = gsap.timeline({ delay: 0.15 });

    tl.to('.hl', {
      y: 0,
      scaleY: 1,
      opacity: 1,
      duration: 0.9,
      stagger: 0.045,
      ease: 'expo.out',
    })

    .to('.hero-eyebrow', {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'expo.out',
    }, '-=0.85')

    .to('.hero-line', {
      scaleX: 1,
      duration: 0.9,
      ease: 'expo.out',
    }, '-=0.4')

    .to('.hero-meta', {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'expo.out',
    }, '-=0.55')

    .to('.hero-scroll', {
      opacity: 1,
      duration: 0.5,
      ease: 'power2.out',
    }, '-=0.3')

    .call(() => {
      setTimeout(() => {
        const title = document.querySelector('.hero-title');
        if (title) {
          title.classList.add('glitch-once');
          setTimeout(() => title.classList.remove('glitch-once'), 600);
        }
      }, 1000);
    }, null, '+=0.2');

    initHeroParallax();
    initScrollReveal();
  }

  /* ── Orb parallax ────────────────────────────────────────────── */
  function initHeroParallax() {
    if (typeof ScrollTrigger === 'undefined') return;

    gsap.to('.orb-1', {
      y: -120,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 2 },
    });
    gsap.to('.orb-2', {
      y: -80,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 3 },
    });
    gsap.to('.orb-3', {
      y: -60,
      x: 30,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 2.5 },
    });

    gsap.to('.hero-title', {
      y: 80,
      opacity: 0.4,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.5 },
    });
  }

  /* ── Scroll reveals ──────────────────────────────────────────── */
  function initScrollReveal() {
    if (typeof ScrollTrigger === 'undefined') return;

    /* Film poster — clip-path wipe */
    gsap.set('.film-poster-wrap', { clipPath: 'inset(0 100% 0 0)', opacity: 1 });
    ScrollTrigger.batch('.film-poster-wrap', {
      start: 'top 80%',
      onEnter: els => gsap.to(els, { clipPath: 'inset(0 0% 0 0)', duration: 1.1, ease: 'expo.out' }),
    });

    /* Film info */
    gsap.set('.film-info > *', { opacity: 0, y: 36 });
    ScrollTrigger.batch('.film-info > *', {
      start: 'top 84%',
      onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, stagger: 0.11, ease: 'expo.out' }),
    });

    /* Gallery header */
    gsap.set('.gallery-header > *', { opacity: 0, y: 20 });
    ScrollTrigger.batch('.gallery-header > *', {
      start: 'top 88%',
      onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'expo.out' }),
    });

    /* Director cards — stagger in */
    gsap.set('.director-card', { opacity: 0, y: 50 });
    ScrollTrigger.batch('.director-card', {
      start: 'top 82%',
      onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 1.0, stagger: 0.18, ease: 'expo.out' }),
    });

    /* Filmmakers eyebrow */
    gsap.set('.filmmakers-inner > .section-eyebrow', { opacity: 0, y: 20 });
    ScrollTrigger.batch('.filmmakers-inner > .section-eyebrow', {
      start: 'top 86%',
      onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' }),
    });

    /* Tracklist rows */
    gsap.set('.tl-track', { opacity: 0, x: -20 });
    ScrollTrigger.batch('.tl-track', {
      start: 'top 88%',
      onEnter: els => gsap.to(els, { opacity: 1, x: 0, duration: 0.65, stagger: 0.07, ease: 'expo.out' }),
    });

    /* Music heading + composer */
    gsap.set('.music-heading, .music-composer', { opacity: 0, y: 24 });
    ScrollTrigger.batch('.music-heading, .music-composer', {
      start: 'top 86%',
      onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'expo.out' }),
    });
  }

  /* ── Gallery — arrow navigation ──────────────────────────────── */
  (function initGallery() {
    const track = document.getElementById('galleryTrack');
    const prev  = document.getElementById('galleryPrev');
    const next  = document.getElementById('galleryNext');
    const progress = document.getElementById('galleryProgress');
    if (!track) return;

    function itemWidth() {
      const item = track.querySelector('.gallery-item');
      if (!item) return track.clientWidth * 0.8;
      const gap = parseInt(getComputedStyle(track).gap) || 24;
      return item.offsetWidth + gap;
    }

    if (prev) {
      prev.addEventListener('click', () => {
        track.scrollBy({ left: -itemWidth(), behavior: 'smooth' });
      });
    }
    if (next) {
      next.addEventListener('click', () => {
        track.scrollBy({ left: itemWidth(), behavior: 'smooth' });
      });
    }

    function updateProgress() {
      if (!progress) return;
      const max = track.scrollWidth - track.clientWidth;
      const pct = max > 0 ? (track.scrollLeft / max) * 100 : 0;
      progress.style.width = pct + '%';
    }

    track.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  })();

  /* ── Music Player ────────────────────────────────────────────── */
  (function initMusicPlayer() {
    const TRACK_PRESETS = [
      [{ f: 55,    g: 0.040 }, { f: 110,   g: 0.028 }, { f: 165,   g: 0.018 }, { f: 220,   g: 0.010 }],
      [{ f: 73.4,  g: 0.038 }, { f: 146.8, g: 0.026 }, { f: 220.0, g: 0.016 }, { f: 293.7, g: 0.010 }],
      [{ f: 82.4,  g: 0.040 }, { f: 164.8, g: 0.028 }, { f: 247.1, g: 0.016 }, { f: 329.6, g: 0.008 }],
      [{ f: 98.0,  g: 0.038 }, { f: 196.0, g: 0.026 }, { f: 294.0, g: 0.018 }, { f: 392.0, g: 0.010 }],
    ];

    let audioCtx    = null;
    let oscs        = [];
    let gainNodes   = [];
    let masterGain  = null;
    let lfoOsc      = null;
    let lfoGain     = null;
    let isPlaying   = false;
    let currentTrack = -1;

    function ensureContext() {
      if (audioCtx) return;
      audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(audioCtx.destination);

      lfoOsc  = audioCtx.createOscillator();
      lfoGain = audioCtx.createGain();
      lfoOsc.frequency.value = 0.08;
      lfoGain.gain.value     = 0.008;
      lfoOsc.connect(lfoGain);
      lfoGain.connect(masterGain.gain);
      lfoOsc.start();
    }

    function stopTones() {
      gainNodes.forEach(g => {
        if (!audioCtx) return;
        g.gain.setValueAtTime(g.gain.value, audioCtx.currentTime);
        g.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4);
      });
      const snapshot = oscs.slice();
      setTimeout(() => snapshot.forEach(o => { try { o.stop(); } catch (_) {} }), 450);
      oscs      = [];
      gainNodes = [];
    }

    function playTones(idx) {
      ensureContext();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      stopTones();

      const preset = TRACK_PRESETS[idx] || TRACK_PRESETS[0];
      preset.forEach(({ f, g }) => {
        const osc   = audioCtx.createOscillator();
        const gNode = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        gNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gNode.gain.linearRampToValueAtTime(g, audioCtx.currentTime + 2.0);
        osc.connect(gNode);
        gNode.connect(masterGain);
        osc.start();
        oscs.push(osc);
        gainNodes.push(gNode);
      });
    }

    function setTrackState(idx, playing) {
      document.querySelectorAll('.tl-track').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
        el.classList.toggle('playing', i === idx && playing);
      });
    }

    function selectTrack(idx) {
      /* Clicking the active playing track pauses; clicking again resumes */
      if (idx === currentTrack) {
        if (isPlaying) {
          isPlaying = false;
          stopTones();
          setTrackState(idx, false);
        } else {
          isPlaying = true;
          playTones(idx);
          setTrackState(idx, true);
        }
        return;
      }

      currentTrack = idx;
      isPlaying = true;
      playTones(idx);
      setTrackState(idx, true);
    }

    document.querySelectorAll('.tl-track').forEach((el, i) => {
      el.addEventListener('click', () => selectTrack(i));
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectTrack(i); }
      });
    });
  })();

  /* ── Ambient section-color shift on scroll ───────────────────── */
  (function initAmbientShift() {
    if (typeof ScrollTrigger === 'undefined') return;

    const sections = [
      { el: document.querySelector('.film'),        bg: '#0c0822' },
      { el: document.querySelector('.gallery'),     bg: '#07060e' },
      { el: document.querySelector('.filmmakers'),  bg: '#0a0720' },
      { el: document.querySelector('.music'),       bg: '#060d18' },
    ];

    sections.forEach(({ el, bg }) => {
      if (!el) return;
      ScrollTrigger.create({
        trigger: el,
        start: 'top 55%',
        end: 'bottom 55%',
        onEnter:     () => document.body.style.setProperty('--ambient-bg', bg),
        onEnterBack: () => document.body.style.setProperty('--ambient-bg', bg),
        onLeaveBack: () => document.body.style.removeProperty('--ambient-bg'),
      });
    });
  })();

  /* ── Nav logo hover ──────────────────────────────────────────── */
  document.querySelector('.nav-logo')?.addEventListener('mouseenter', () => {
    const letter = document.querySelector('.nav-logo-letter');
    if (letter && typeof gsap !== 'undefined') {
      gsap.fromTo(letter, { rotation: -8 }, { rotation: 0, duration: 0.45, ease: 'back.out(2)' });
    }
  });

  /* ── Start page reveal ───────────────────────────────────────── */
  setTimeout(revealPage, 320);

});
