/* ═══════════════════════════════════════════════════════════════════
   TELPURNAR — Main Script
   Modules: Grain · Loader · Nav · Hero GSAP · Gallery · Music · Lang
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

    // Re-sync player track name displayed in now-playing
    const activeTrack = document.querySelector('.track.active');
    if (activeTrack) {
      const nameEl = activeTrack.querySelector('.track-name');
      const npEl   = document.getElementById('playerTrackName');
      if (nameEl && npEl) npEl.textContent = nameEl.getAttribute(`data-${lang}`) || nameEl.textContent;
    }
  }

  function toggle() {
    apply(current === 'en' ? 'is' : 'en');
  }

  function get() { return current; }

  return { apply, toggle, get };
})();

document.getElementById('langToggle').addEventListener('click', Lang.toggle);

/* ─── WAIT FOR GSAP ─────────────────────────────────────────────── */
window.addEventListener('load', function () {

  /* ── Loader ──────────────────────────────────────────────────── */
  const loader = document.getElementById('loader');

  function revealPage() {
    if (loader) {
      loader.style.transition = 'opacity 0.6s ease';
      loader.style.opacity = '0';
      setTimeout(() => { loader.style.display = 'none'; }, 700);
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
      // fallback: just show everything
      document.querySelectorAll('.hl').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      document.querySelectorAll('.hero-eyebrow,.hero-line,.hero-meta,.hero-scroll').forEach(el => {
        el.style.opacity = '1';
      });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const tl = gsap.timeline({ delay: 0.1 });

    // Letters burn in, staggered
    tl.to('.hl', {
      y: 0,
      opacity: 1,
      duration: 1.1,
      stagger: 0.055,
      ease: 'expo.out',
    })

    // Eyebrow slides down
    .to('.hero-eyebrow', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'expo.out',
    }, '-=0.9')

    // Amber line draws left-to-right
    .to('.hero-line', {
      scaleX: 1,
      duration: 0.9,
      ease: 'expo.out',
    }, '-=0.5')

    // Meta fades up
    .to('.hero-meta', {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'expo.out',
    }, '-=0.5')

    // Scroll indicator fades in
    .to('.hero-scroll', {
      opacity: 1,
      duration: 0.6,
      ease: 'power2.out',
    }, '-=0.3');

    // ── Scroll-triggered reveals ──────────────────────────────────
    initScrollReveal();
  }

  function initScrollReveal() {
    if (typeof ScrollTrigger === 'undefined') return;

    // Set initial states for scroll reveal elements
    gsap.set('.sr',       { opacity: 0, y: 36 });
    gsap.set('.sr-left',  { opacity: 0, x: -44 });
    gsap.set('.sr-right', { opacity: 0, x: 44 });

    // Film section
    ScrollTrigger.batch('.film-poster-wrap', {
      start: 'top 82%',
      onEnter: els => gsap.to(els, { opacity: 1, x: 0, duration: 1.0, ease: 'expo.out' }),
    });
    gsap.set('.film-poster-wrap', { opacity: 0, x: -44 });

    ScrollTrigger.batch('.film-info > *', {
      start: 'top 85%',
      onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'expo.out' }),
    });
    gsap.set('.film-info > *', { opacity: 0, y: 32 });

    // Gallery header
    ScrollTrigger.batch('.gallery-header > *', {
      start: 'top 88%',
      onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'expo.out' }),
    });
    gsap.set('.gallery-header > *', { opacity: 0, y: 20 });

    // Music section
    ScrollTrigger.batch('.music-left > *', {
      start: 'top 82%',
      onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, stagger: 0.1, ease: 'expo.out' }),
    });
    gsap.set('.music-left > *', { opacity: 0, y: 28 });

    ScrollTrigger.batch('.player-display', {
      start: 'top 80%',
      onEnter: els => gsap.to(els, { opacity: 1, x: 0, duration: 1.0, ease: 'expo.out' }),
    });
    gsap.set('.player-display', { opacity: 0, x: 44 });

    // Track list items stagger
    ScrollTrigger.batch('.track', {
      start: 'top 88%',
      onEnter: els => gsap.to(els, { opacity: 1, x: 0, duration: 0.7, stagger: 0.07, ease: 'expo.out' }),
    });
    gsap.set('.track', { opacity: 0, x: -24 });

    // Team section
    ScrollTrigger.batch('.tm-director', {
      start: 'top 82%',
      onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 1.0, stagger: 0.15, ease: 'expo.out' }),
    });
    gsap.set('.tm-director', { opacity: 0, y: 40 });

    ScrollTrigger.batch('.tm-crew', {
      start: 'top 85%',
      onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'expo.out' }),
    });
    gsap.set('.tm-crew', { opacity: 0, y: 28 });
  }

  /* ── Gallery drag scroll ──────────────────────────────────────── */
  (function initGallery() {
    const track    = document.getElementById('galleryTrack');
    const progress = document.getElementById('galleryProgress');
    if (!track) return;

    let isDown   = false;
    let startX   = 0;
    let scrollLeft = 0;
    let velocity = 0;
    let lastX    = 0;
    let rafId    = null;

    function updateProgress() {
      if (!progress) return;
      const max = track.scrollWidth - track.clientWidth;
      const pct = max > 0 ? (track.scrollLeft / max) * 100 : 0;
      progress.style.width = pct + '%';
    }

    track.addEventListener('mousedown', e => {
      isDown = true;
      track.classList.add('is-dragging');
      startX     = e.pageX - track.offsetLeft;
      scrollLeft = track.scrollLeft;
      lastX      = e.pageX;
      velocity   = 0;
      cancelAnimationFrame(rafId);
    });

    window.addEventListener('mouseup', () => {
      if (!isDown) return;
      isDown = false;
      track.classList.remove('is-dragging');
      applyMomentum();
    });

    window.addEventListener('mousemove', e => {
      if (!isDown) return;
      e.preventDefault();
      const x    = e.pageX - track.offsetLeft;
      const walk = (x - startX) * 1.4;
      velocity   = e.pageX - lastX;
      lastX      = e.pageX;
      track.scrollLeft = scrollLeft - walk;
      updateProgress();
    });

    // Touch
    let touchStartX = 0;
    let touchScrollLeft = 0;

    track.addEventListener('touchstart', e => {
      touchStartX    = e.touches[0].pageX;
      touchScrollLeft = track.scrollLeft;
    }, { passive: true });

    track.addEventListener('touchmove', e => {
      const dx = touchStartX - e.touches[0].pageX;
      track.scrollLeft = touchScrollLeft + dx;
      updateProgress();
    }, { passive: true });

    function applyMomentum() {
      velocity *= 0.92;
      if (Math.abs(velocity) > 0.6) {
        track.scrollLeft -= velocity;
        updateProgress();
        rafId = requestAnimationFrame(applyMomentum);
      }
    }

    track.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  })();

  /* ── Music Player ────────────────────────────────────────────── */
  (function initMusicPlayer() {
    // Web Audio ambient tone engine
    // Each "track" is a set of sine-wave drones in different keys.
    // Volume is intentionally very low — these are ambient mood previews.
    const TRACK_PRESETS = [
      // Track 1 — A minor open fifth drones
      [{ f: 55,    g: 0.040 }, { f: 110,   g: 0.028 }, { f: 165,   g: 0.018 }, { f: 220,   g: 0.010 }],
      // Track 2 — D Dorian
      [{ f: 73.4,  g: 0.038 }, { f: 146.8, g: 0.026 }, { f: 220.0, g: 0.016 }, { f: 293.7, g: 0.010 }],
      // Track 3 — E minor
      [{ f: 82.4,  g: 0.040 }, { f: 164.8, g: 0.028 }, { f: 247.1, g: 0.016 }, { f: 329.6, g: 0.008 }],
      // Track 4 — G pentatonic
      [{ f: 98.0,  g: 0.038 }, { f: 196.0, g: 0.026 }, { f: 294.0, g: 0.018 }, { f: 392.0, g: 0.010 }],
    ];

    let audioCtx   = null;
    let oscs       = [];
    let gainNodes  = [];
    let masterGain = null;
    let lfoOsc     = null;
    let lfoGain    = null;
    let isPlaying  = false;
    let currentTrack = 0;

    // Timer
    let timerInterval = null;
    let elapsed = 0;

    // Waveform
    const waveCanvas = document.getElementById('waveformCanvas');
    const waveCtx    = waveCanvas ? waveCanvas.getContext('2d') : null;
    let waveRaf      = null;
    let waveTime     = 0;

    function ensureContext() {
      if (audioCtx) return;
      audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(audioCtx.destination);

      // Slow LFO for subtle tremolo
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
      oscs       = [];
      gainNodes  = [];
    }

    function playTrack(idx) {
      ensureContext();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      stopTones();

      const preset = TRACK_PRESETS[idx] || TRACK_PRESETS[0];
      preset.forEach(({ f, g }) => {
        const osc    = audioCtx.createOscillator();
        const gNode  = audioCtx.createGain();
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

    // Progress / timer
    function startTimer() {
      clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        elapsed++;
        const mm  = String(Math.floor(elapsed / 60)).padStart(1, '0');
        const ss  = String(elapsed % 60).padStart(2, '0');
        const cur = document.getElementById('playerTimeCurrent');
        if (cur) cur.textContent = `${mm}:${ss}`;

        // Fake progress fills slowly (up to 90% since we don't know real duration)
        const pct = Math.min((elapsed / 180) * 100, 90);
        const fill  = document.getElementById('playerProgressFill');
        const thumb = document.getElementById('playerProgressThumb');
        if (fill) fill.style.width = pct + '%';
        if (thumb) { thumb.style.left = pct + '%'; thumb.style.opacity = '1'; thumb.style.transform = `translateX(-50%) translateY(-50%) scale(1)`; }

        // Update active track bar fill
        const activeTrack = document.querySelector('.track.active .track-bar-fill');
        if (activeTrack) activeTrack.style.width = pct + '%';
      }, 1000);
    }

    function stopTimer() {
      clearInterval(timerInterval);
      elapsed = 0;
      const cur   = document.getElementById('playerTimeCurrent');
      const fill  = document.getElementById('playerProgressFill');
      const thumb = document.getElementById('playerProgressThumb');
      if (cur)   cur.textContent = '0:00';
      if (fill)  fill.style.width = '0%';
      if (thumb) { thumb.style.opacity = '0'; thumb.style.transform = 'translateX(-50%) translateY(-50%) scale(0)'; }
    }

    // Waveform canvas
    function drawWaveform() {
      if (!waveCtx || !waveCanvas) return;
      const W = waveCanvas.width;
      const H = waveCanvas.height;
      waveCtx.clearRect(0, 0, W, H);

      const bars    = 52;
      const barW    = (W / bars) * 0.55;
      const gap     = (W / bars) * 0.45;
      const amber   = 'rgba(196, 126, 46,';

      for (let i = 0; i < bars; i++) {
        const x = i * (barW + gap);
        let h;

        if (isPlaying) {
          const t = waveTime;
          h = Math.abs(
            Math.sin(i * 0.32 + t * 2.1) * 0.45 +
            Math.sin(i * 0.61 + t * 1.4) * 0.25 +
            Math.sin(i * 0.12 + t * 3.0) * 0.18
          );
          h = (h * 0.7 + 0.08) * H * 0.85;
        } else {
          h = (Math.abs(Math.sin(i * 0.5)) * 0.2 + 0.04) * H * 0.4;
        }

        const alpha = isPlaying ? 0.75 : 0.22;
        waveCtx.fillStyle = `${amber} ${alpha})`;
        waveCtx.fillRect(x, (H - h) / 2, barW, h);
      }

      waveTime += 0.016;
      waveRaf = requestAnimationFrame(drawWaveform);
    }

    // Resize waveform canvas to container
    function resizeWaveCanvas() {
      if (!waveCanvas) return;
      const parent = waveCanvas.parentElement;
      if (parent) {
        waveCanvas.width  = parent.clientWidth || 400;
        waveCanvas.height = 56;
      }
    }
    resizeWaveCanvas();
    window.addEventListener('resize', resizeWaveCanvas, { passive: true });

    // Start the continuous waveform draw loop immediately
    drawWaveform();

    // Select a track
    function selectTrack(idx) {
      currentTrack = idx;

      // Update active states
      document.querySelectorAll('.track').forEach((el, i) => {
        const isActive = i === idx;
        el.classList.toggle('active', isActive);
        const barFill = el.querySelector('.track-bar-fill');
        if (barFill && !isActive) barFill.style.width = '0%';
      });

      // Update now-playing name
      const activeEl  = document.querySelector('.track.active .track-name');
      const npEl      = document.getElementById('playerTrackName');
      if (activeEl && npEl) {
        npEl.textContent = activeEl.getAttribute(`data-${Lang.get()}`) || activeEl.textContent;
      }

      stopTimer();
      if (isPlaying) {
        playTrack(idx);
        startTimer();
      }
    }

    // Play / pause
    const btnPlay = document.getElementById('btnPlay');
    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        if (!isPlaying) {
          isPlaying = true;
          btnPlay.classList.add('playing');
          btnPlay.setAttribute('aria-label', 'Pause');
          playTrack(currentTrack);
          startTimer();
        } else {
          isPlaying = false;
          btnPlay.classList.remove('playing');
          btnPlay.setAttribute('aria-label', 'Play');
          stopTones();
          stopTimer();
        }
      });
    }

    // Prev
    const btnPrev = document.getElementById('btnPrev');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        const prev = (currentTrack - 1 + TRACK_PRESETS.length) % TRACK_PRESETS.length;
        selectTrack(prev);
      });
    }

    // Next
    const btnNext = document.getElementById('btnNext');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        const next = (currentTrack + 1) % TRACK_PRESETS.length;
        selectTrack(next);
      });
    }

    // Click on track in list
    document.querySelectorAll('.track').forEach((el, i) => {
      el.addEventListener('click', () => selectTrack(i));
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectTrack(i); }
      });
    });

    // Click on progress bar to scrub (adjusts timer display only)
    const progressBar = document.getElementById('playerProgressBar');
    if (progressBar) {
      progressBar.addEventListener('click', e => {
        const rect = progressBar.getBoundingClientRect();
        const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        elapsed    = Math.round(pct * 180);
        // Force immediate re-render
        const mm = String(Math.floor(elapsed / 60)).padStart(1, '0');
        const ss = String(elapsed % 60).padStart(2, '0');
        const cur = document.getElementById('playerTimeCurrent');
        if (cur) cur.textContent = `${mm}:${ss}`;
        const fill  = document.getElementById('playerProgressFill');
        const thumb = document.getElementById('playerProgressThumb');
        if (fill) fill.style.width = (pct * 100) + '%';
        if (thumb) thumb.style.left = (pct * 100) + '%';
      });
    }
  })();

  /* ── Amber hover glow on portrait fill ──────────────────────── */
  document.querySelectorAll('.member-portrait').forEach(p => {
    p.addEventListener('mouseenter', () => {
      const fill = p.querySelector('.portrait-fill');
      if (fill) fill.style.transition = 'background 0.4s ease';
    });
  });

  /* ── Start page reveal ───────────────────────────────────────── */
  // Small delay so fonts are ready
  setTimeout(revealPage, 300);

});

/* ─── Ambient hover on nav logo ──────────────────────────────────── */
document.querySelector('.nav-logo')?.addEventListener('mouseenter', () => {
  const letter = document.querySelector('.nav-logo-letter');
  if (letter && typeof gsap !== 'undefined') {
    gsap.fromTo(letter, { rotation: -5 }, { rotation: 0, duration: 0.4, ease: 'back.out(2)' });
  }
});
