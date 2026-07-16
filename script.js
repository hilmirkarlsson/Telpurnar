/* ═══════════════════════════════════════════════════════════════════
   TELPURNAR — Main Script v5
   Light · Natural · Orano-style cinematic transitions
   Hero: WebGL displacement reveal (progressive) → CSS slideshow fallback
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
/* Lang toggle button hidden for now (index.html) — listener disabled until it's back. */

/* ─── NAV scroll state ───────────────────────────────────────────── */
(function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ─── SMOOTH SCROLL (Lenis) + ScrollTrigger integration ──────────── */
(function initLenis() {
  if (REDUCE || typeof Lenis === 'undefined') return;   // CDN blocked → native scroll
  const lenis = new Lenis({
    duration: 1.2,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    smoothTouch: false,
  });

  // Drive Lenis from GSAP's ticker and keep ScrollTrigger in sync (as v3 did)
  if (typeof gsap !== 'undefined' && gsap.ticker) {
    if (typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
      lenis.on('scroll', ScrollTrigger.update);
    }
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })();
  }

  // Anchor links glide via Lenis instead of jumping. Nav clicks that cross
  // the gallery section (in either direction) get a slower glide, long
  // enough that the gallery stills are actually visible mid-scroll instead
  // of blurring past.
  const gallery = document.querySelector('#gallery');
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    const id = a.getAttribute('href');
    if (!id || id.length < 2) return;
    a.addEventListener('click', e => {
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      let crossesGallery = false;
      if (gallery) {
        const galleryTop = gallery.offsetTop;
        const currentY = window.scrollY || window.pageYOffset || 0;
        const targetY = target.offsetTop;
        crossesGallery = (currentY < galleryTop) !== (targetY < galleryTop);
      }
      if (crossesGallery) lenis.scrollTo(target, { duration: 3.6 });
      else lenis.scrollTo(target);
    });
  });
})();

/* ─── STILLS — sticky horizontal scroll-jack (desktop) ───────────── */
/* Deliberately NOT using GSAP ScrollTrigger pinning here. That approach
   computes absolute trigger positions that are only correct when measured at
   scroll-top with a fully settled layout — impossible to guarantee with
   async web fonts + Lenis smooth scroll + an eager scroller, which left the
   pin mis-placed (a big empty gap). CSS `position: sticky` instead lets the
   browser hold the viewport, and we read the pin's LIVE getBoundingClientRect
   each frame — always accurate, immune to font reflow and scroll desync. */
(function initStillsScroll() {
  if (REDUCE) return;
  const pin = document.getElementById('galleryPin');
  const sticky = pin && pin.querySelector('.gallery-sticky');
  const track = document.getElementById('galleryTrack');
  const fill = document.getElementById('galleryProgress');
  if (!pin || !sticky || !track) return;

  const mq = window.matchMedia('(min-width: 768px)');
  let travel = 0, active = false, ticking = false;

  function measure() {
    active = mq.matches;
    if (!active) {                    // mobile → native swipe row; clear jack
      pin.style.height = '';
      track.style.transform = '';
      return;
    }
    // How far the row must slide so its right edge reaches the viewport.
    travel = Math.max(0, track.scrollWidth - sticky.clientWidth);
    // Tall pin = one viewport of scroll (to reach/leave the sticky) + the
    // horizontal travel, so vertical scroll maps 1:1 onto sideways motion.
    pin.style.height = (window.innerHeight + travel) + 'px';
    apply();
  }
  function apply() {
    if (!active) return;
    // While the sticky viewport is engaged, the pin's top edge travels from
    // 0 down to -travel. Normalise that into 0→1 progress.
    const rectTop = pin.getBoundingClientRect().top;
    const p = travel > 0 ? Math.min(Math.max(-rectTop / travel, 0), 1) : 0;
    track.style.transform = 'translate3d(' + (-travel * p).toFixed(1) + 'px,0,0)';
    if (fill) fill.style.width = (p * 100).toFixed(2) + '%';
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { apply(); ticking = false; });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  // Re-measure once the chunky fonts settle the row width (harmless if early).
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  window.addEventListener('load', measure);
  requestAnimationFrame(measure);
})();

/* ─── HERO PARALLAX (content drifts up + fades on scroll) ────────── */
(function initParallax() {
  if (REDUCE) return;
  const hero = document.querySelector('.hero');
  const content = document.querySelector('.hero-content');
  const cue = document.querySelector('.hero-scroll');
  if (!hero || !content) return;
  let ticking = false;
  function update() {
    const y = window.scrollY || window.pageYOffset || 0;
    const h = hero.offsetHeight || window.innerHeight;
    const p = Math.min(y / h, 1);
    content.style.transform = `translate3d(0, ${y * -0.18}px, 0)`;
    content.style.opacity = String(Math.max(0, 1 - p * 1.15));
    if (cue) cue.style.opacity = String(Math.max(0, 1 - y / 220));
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  // No initial call — let the hero intro animation play first; parallax
  // engages on the first scroll.
})();

/* ─── DRIFTING DUST (ambient particles) ──────────────────────────── */
(function initDust() {
  if (REDUCE) return;
  const cv = document.getElementById('dust');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let W, H;
  function resize() { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize, { passive: true });
  const PAL = ['rgba(194,52,88,0.06)', 'rgba(244,199,64,0.07)', 'rgba(62,27,42,0.04)', 'rgba(255,248,230,0.06)'];
  function spawn() {
    return {
      x: Math.random() * W, y: H + Math.random() * 80,
      r: Math.random() * 1.4 + 0.3,
      speed: Math.random() * 0.20 + 0.08,
      dx: (Math.random() - 0.5) * 0.12,
      wave: Math.random() * Math.PI * 2,
      color: PAL[(Math.random() * PAL.length) | 0],
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

/* ─── HERO DOTS (shared by both renderers) ───────────────────────── */
function buildHeroDots(count, onSelect) {
  const wrap = document.getElementById('heroDots');
  if (!wrap) return { set: () => {} };
  wrap.innerHTML = '';
  const dots = [];
  for (let i = 0; i < count; i++) {
    const d = document.createElement('button');
    d.className = 'hero-dot' + (i === 0 ? ' active' : '');
    d.setAttribute('role', 'tab');
    d.setAttribute('aria-label', 'Mynd ' + (i + 1));
    d.addEventListener('click', () => onSelect(i));
    wrap.appendChild(d);
    dots.push(d);
  }
  return {
    set(active) { dots.forEach((d, i) => d.classList.toggle('active', i === active)); }
  };
}

const DWELL = 6500;        // ms a slide rests
const TRANSITION = 1500;   // ms of the swap

/* ─── HERO — WebGL displacement renderer ─────────────────────────── */
function initHeroGL() {
  const hero = document.querySelector('.hero');
  const canvas = document.getElementById('heroCanvas');
  const slideEls = Array.from(document.querySelectorAll('.hero-slide'));
  if (!hero || !canvas || slideEls.length < 2) return false;

  const sources = slideEls.map(el => el.getAttribute('data-src')).filter(Boolean);
  if (sources.length < 2) return false;

  let gl;
  try {
    gl = canvas.getContext('webgl', { antialias: true, alpha: false, premultipliedAlpha: false })
      || canvas.getContext('experimental-webgl');
  } catch (_) { return false; }
  if (!gl) return false;

  const VERT = `
    attribute vec2 aPos;
    varying vec2 vUv;
    void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FRAG = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexA;
    uniform sampler2D uTexB;
    uniform vec2  uRes;
    uniform vec2  uImgA;
    uniform vec2  uImgB;
    uniform float uProgress;
    uniform float uTime;
    uniform float uZoomA;
    uniform float uZoomB;
    uniform vec2  uPar;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      float a = hash(i), b = hash(i+vec2(1.0,0.0)), c = hash(i+vec2(0.0,1.0)), d = hash(i+vec2(1.0,1.0));
      vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
    }

    // background-cover mapping + zoom (Ken Burns) around centre
    vec2 cover(vec2 uv, vec2 img, float zoom){
      float ar = uRes.x / uRes.y;
      float ir = img.x / img.y;
      vec2 r = vec2(min(ar/ir, 1.0), min(ir/ar, 1.0));
      vec2 cuv = vec2(uv.x*r.x + (1.0-r.x)*0.5, uv.y*r.y + (1.0-r.y)*0.5);
      return (cuv - 0.5) / zoom + 0.5;
    }

    void main(){
      vec2 uv = vUv + uPar;
      float n = noise(uv * 2.6 + uTime * 0.05);

      // subtle liquid displacement that peaks mid-transition
      float bell = uProgress * (1.0 - uProgress) * 4.0;   // 0→1→0
      vec2 dir = vec2(n - 0.5, noise(uv*2.6 - uTime*0.04) - 0.5);
      vec2 uvA = uv + dir * 0.05 * bell;
      vec2 uvB = uv - dir * 0.05 * bell;

      vec4 colA = texture2D(uTexA, cover(uvA, uImgA, uZoomA));
      vec4 colB = texture2D(uTexB, cover(uvB, uImgB, uZoomB));

      // organic, noise-jittered crossfade (soft Orano-style reveal)
      float jitter = (n - 0.5) * 0.28;
      float m = smoothstep(0.0, 1.0, clamp(uProgress * 1.3 - 0.15 + jitter, 0.0, 1.0));
      gl_FragColor = mix(colA, colB, m);
    }`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
    return s;
  }
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return false;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
  gl.useProgram(prog);

  // full-screen triangle pair
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ['uTexA','uTexB','uRes','uImgA','uImgB','uProgress','uTime','uZoomA','uZoomB','uPar']
    .forEach(n => U[n] = gl.getUniformLocation(prog, n));

  // textures (1px placeholder until loaded)
  function makeTex() {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([110,130,120,255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  }

  const textures = sources.map(makeTex);
  const sizes = sources.map(() => [1, 1]);
  const loaded = sources.map(() => false);

  sources.forEach((src, i) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';   // required for WebGL upload (Wikimedia sends CORS)
    img.onload = () => {
      try {
        gl.bindTexture(gl.TEXTURE_2D, textures[i]);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);   // match screen orientation
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        sizes[i] = [img.naturalWidth || 1, img.naturalHeight || 1];
        loaded[i] = true;
        if (!started && loaded[0]) start();
      } catch (_) { /* tainted/CORS → leave placeholder; fallback handles UX */ }
    };
    img.src = src;
  });

  // sizing
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // state
  let current = 0;
  let next = 0;
  let progress = 0;
  let transitioning = false;
  let lastSwap = performance.now();
  let started = false;
  const dots = buildHeroDots(sources.length, (i) => go(i));

  // pointer + scroll parallax
  const par = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    par.tx = ((e.clientX / window.innerWidth) - 0.5) * 0.016;
    par.ty = ((e.clientY / window.innerHeight) - 0.5) * 0.016;
  }, { passive: true });

  function go(target) {
    if (transitioning || target === current) return;
    next = target;
    transitioning = true;
    progress = 0;
    transStart = performance.now();
    dots.set(next);
  }
  function advance() { go((current + 1) % sources.length); }

  let transStart = 0;
  const easeInOut = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;

  function render(now) {
    // parallax smoothing
    par.x += (par.tx - par.x) * 0.06;
    par.y += (par.ty - par.y) * 0.06;

    // transition progress
    if (transitioning) {
      const t = Math.min((now - transStart) / TRANSITION, 1);
      progress = easeInOut(t);
      if (t >= 1) {
        transitioning = false;
        current = next;
        progress = 0;
        lastSwap = now;
      }
    } else if (!REDUCE && now - lastSwap > DWELL && loaded[(current + 1) % sources.length]) {
      advance();
    }

    // Ken Burns zoom per slide (reset on swap)
    const since = (now - lastSwap) / (DWELL + TRANSITION);
    const kb = REDUCE ? 1.02 : 1.0 + Math.min(Math.max(since, 0), 1.3) * 0.085;
    const zoomCur = kb;
    const zoomNext = 1.0 + 0.02;

    gl.useProgram(prog);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, now * 0.001);
    gl.uniform1f(U.uProgress, transitioning ? progress : 0.0);
    gl.uniform2f(U.uPar, par.x, par.y);

    // bind current → A, incoming → B
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, textures[current]);
    gl.uniform1i(U.uTexA, 0);
    gl.uniform2f(U.uImgA, sizes[current][0], sizes[current][1]);
    gl.uniform1f(U.uZoomA, zoomCur);

    const b = transitioning ? next : current;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, textures[b]);
    gl.uniform1i(U.uTexB, 1);
    gl.uniform2f(U.uImgB, sizes[b][0], sizes[b][1]);
    gl.uniform1f(U.uZoomB, zoomNext);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    raf = requestAnimationFrame(render);
  }

  let raf = 0;
  let dead = false;
  function start() {
    if (started || dead) return;
    started = true;
    hero.classList.add('gl-active');
    lastSwap = performance.now();
    raf = requestAnimationFrame(render);
  }

  // Watchdog: if textures haven't uploaded in time (e.g. CORS), abandon
  // WebGL and let the CSS slideshow take over so the hero never sits static.
  window.setTimeout(() => {
    if (!started) { dead = true; initHeroCSS(); }
  }, 3500);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; }
    else if (started && !raf) { lastSwap = performance.now(); raf = requestAnimationFrame(render); }
  });

  return true;
}

/* ─── HERO — CSS fallback slideshow ──────────────────────────────── */
function initHeroCSS() {
  const slides = Array.from(document.querySelectorAll('.hero-slide'));
  if (slides.length < 2) return;
  let active = 0, timer = null;
  const dots = buildHeroDots(slides.length, (i) => { go(i); restart(); });

  function go(nextIdx) {
    if (nextIdx === active) return;
    const cur = slides[active], inc = slides[nextIdx];
    cur.classList.remove('is-active');
    cur.classList.add('is-leaving');
    void inc.offsetWidth;
    inc.classList.add('is-active');
    window.setTimeout(() => cur.classList.remove('is-leaving'), 1700);
    dots.set(nextIdx);
    active = nextIdx;
  }
  function advance() { go((active + 1) % slides.length); }
  function restart() { if (timer) clearInterval(timer); if (!REDUCE) timer = setInterval(advance, DWELL); }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (timer) clearInterval(timer); } else restart();
  });
  restart();
}

/* Choose renderer: WebGL if possible, else CSS */
(function initHero() {
  let ok = false;
  try { ok = initHeroGL(); } catch (_) { ok = false; }
  if (!ok) initHeroCSS();
})();

/* ─── HERO intro reveal ──────────────────────────────────────────── */
function playHeroIntro() { document.querySelector('.hero')?.classList.add('is-ready'); }

/* ─── LOADER ─────────────────────────────────────────────────────── */
window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  window.setTimeout(() => { loader?.classList.add('done'); playHeroIntro(); }, 350);
});
window.setTimeout(() => {
  document.getElementById('loader')?.classList.add('done');
  playHeroIntro();
}, 2500);

/* ─── SCROLL REVEAL — gentle, staggered ──────────────────────────── */
(function initReveal() {
  const groups = [
    '.film-poster-wrap', '.film-info > *', '.gallery-header > *',
    '.filmmakers-inner > .section-eyebrow',
    '.director-card', '.music-inner > *',
  ];
  const targets = [];
  groups.forEach(sel => {
    Array.from(document.querySelectorAll(sel)).forEach((el, i) => {
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
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  targets.forEach(el => io.observe(el));
})();

/* ─── GALLERY — arrows, progress + subtle parallax drift ─────────── */
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

  const stills = Array.from(track.querySelectorAll('.gallery-still'));
  function update() {
    // On desktop the sticky scroll-jack (initStillsScroll) owns the row
    // transform + progress bar; this native-scroll path is mobile-only.
    if (window.matchMedia('(min-width: 768px)').matches) return;
    if (progress) {
      const max = track.scrollWidth - track.clientWidth;
      progress.style.width = (max > 0 ? (track.scrollLeft / max) * 100 : 0) + '%';
    }
    // refined parallax: background drifts opposite to scroll within each frame
    if (!REDUCE) {
      const vw = track.clientWidth;
      stills.forEach(s => {
        const r = s.getBoundingClientRect();
        const rel = (r.left + r.width / 2 - vw / 2) / vw;     // -1..1
        s.style.backgroundPosition = (50 + rel * 12) + '% center';
      });
    }
  }
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();
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
    master = audioCtx.createGain(); master.gain.value = 1; master.connect(audioCtx.destination);
    lfo = audioCtx.createOscillator(); lfoGain = audioCtx.createGain();
    lfo.frequency.value = 0.08; lfoGain.gain.value = 0.008;
    lfo.connect(lfoGain); lfoGain.connect(master.gain); lfo.start();
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
      const osc = audioCtx.createOscillator(); const gn = audioCtx.createGain();
      osc.type = 'sine'; osc.frequency.value = f;
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
    currentTrack = idx; isPlaying = true; playTones(idx); setState(idx, true);
  }
  document.querySelectorAll('.tl-track').forEach((el, i) => {
    el.addEventListener('click', () => select(i));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(i); }
    });
  });
})();
