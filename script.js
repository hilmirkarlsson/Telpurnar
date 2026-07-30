/* ═══════════════════════════════════════════════════════════════════
   TELPURNAR — Main Script v5
   Light · Natural · Orano-style cinematic transitions
   Hero: WebGL displacement reveal (progressive) → CSS slideshow fallback
═══════════════════════════════════════════════════════════════════ */

'use strict';

const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ─── SCROLL LOCK — shared by the director cards and the lightbox ── */
/* With Lenis running, the only correct way to freeze scrolling is its own
   stop()/start() — it owns the scroll position. We also snap it back to the
   exact offset on release so nothing can drift while an overlay is up.
   Without Lenis (reduced-motion, or the CDN blocked) fall back to the
   position:fixed technique, which preserves the offset by construction —
   plain overflow:hidden does not, and setting body overflow collapses the
   document's scrollable height, which makes Lenis clamp and then glide back. */
const ScrollLock = (function () {
  let lockedY = 0;
  let depth = 0;

  function lock() {
    if (depth++ > 0) return;                    // already locked — don't re-measure
    const lenis = window.__lenis;
    lockedY = lenis ? lenis.scroll : window.scrollY;
    if (lenis) { lenis.stop(); return; }
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
  }

  function unlock() {
    depth = Math.max(0, depth - 1);
    if (depth > 0) return;
    const lenis = window.__lenis;
    if (lenis) {
      lenis.start();
      const restore = () => lenis.scrollTo(lockedY, { immediate: true, force: true });
      restore();
      // Re-assert once more on the next frame: start() resyncs Lenis from the
      // window's own offset, and anything that touched it during teardown
      // would otherwise win the last write.
      requestAnimationFrame(restore);
      return;
    }
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    window.scrollTo(0, lockedY);
  }

  return { lock, unlock };
})();

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

  // Exposed so modal-style overlays can stop/start Lenis properly instead of
  // slapping overflow:hidden on <body>. Body overflow collapses the document's
  // scrollable height, Lenis clamps its internal position toward 0, and on
  // release it glides all the way back — which looks like the page falling
  // and then rewinding.
  window.__lenis = lenis;

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
/* Runs for EVERY .gallery section (Framleiðslumyndir + Stillur úr myndinni),
   so both bands get exactly the same scroll experience. */
(function initStillsScroll() {
  if (REDUCE) return;
  const jacks = [];

  document.querySelectorAll('.gallery').forEach(section => {
    const pin = section.querySelector('.gallery-pin');
    const sticky = pin && pin.querySelector('.gallery-sticky');
    const track = section.querySelector('.gallery-track');
    const fill = section.querySelector('.gallery-progress-fill');
    if (!pin || !sticky || !track) return;

    let travel = 0;

    function measure() {
      // How far the row must slide so its right edge reaches the viewport.
      travel = Math.max(0, track.scrollWidth - sticky.clientWidth);
      // Pin height = the sticky viewport's OWN height + the horizontal travel,
      // so vertical scroll maps 1:1 onto sideways motion.
      //
      // Measure the sticky rather than window.innerHeight — this is what made
      // phone scrolling feel broken. The sticky is 100svh on phones, and `svh`
      // is the SMALL viewport: a constant that assumes the URL bar is showing.
      // window.innerHeight is the LIVE visual viewport, ~60-110px taller the
      // moment the URL bar collapses. Two bugs came out of that gap:
      //   1. Each band ended with innerHeight-svh of scrolling where the row
      //      had already finished moving — scroll appeared to go dead.
      //   2. Showing/hiding the URL bar fires resize, so both pins were
      //      rewritten mid-scroll and the document breathed by ~200px. Near
      //      the bottom the document could shrink past the current offset, and
      //      Lenis then clamped and glided you back up — the weird bottom.
      // The sticky's height is stable across URL-bar changes, and it makes the
      // progress below hit exactly 1 as the sticky releases. On desktop it is
      // 100vh, i.e. innerHeight, so nothing changes there.
      const viewport = sticky.offsetHeight || window.innerHeight;
      pin.style.height = (viewport + travel) + 'px';
      apply();
    }
    function apply() {
      // While the sticky viewport is engaged, the pin's top edge travels from
      // 0 down to -travel. Normalise that into 0→1 progress.
      const rectTop = pin.getBoundingClientRect().top;
      const p = travel > 0 ? Math.min(Math.max(-rectTop / travel, 0), 1) : 0;
      track.style.transform = 'translate3d(' + (-travel * p).toFixed(1) + 'px,0,0)';
      if (fill) fill.style.width = (p * 100).toFixed(2) + '%';
    }
    jacks.push({ measure, apply });
  });
  if (!jacks.length) return;

  let ticking = false;
  const measureAll = () => jacks.forEach(j => j.measure());
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { jacks.forEach(j => j.apply()); ticking = false; });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', measureAll, { passive: true });
  // Re-measure once the chunky fonts settle the row width (harmless if early).
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureAll);
  window.addEventListener('load', measureAll);
  requestAnimationFrame(measureAll);
})();

/* ─── LIGHTBOX — tap a still to see the whole frame ──────────────── */
/* Runs for BOTH horizontal bands. The stills are deliberately cropped in the
   filmstrip (16/10 on desktop, a frame wider than the screen on phones), so a
   tap has to be able to show the picture whole and uncropped. Phone-first:
   that's where the crop hides the most. */
(function initLightbox() {
  // The stills are background-image divs, not <img> — read the URL back out.
  const urlOf = el => {
    const m = /url\((['"]?)(.*?)\1\)/.exec(el.style.backgroundImage || '');
    return m ? m[2] : '';
  };

  // Capture the description now: the trigger's own aria-label gains an
  // "— opna í fullri stærð" suffix below, and that suffix must not end up in
  // the lightbox caption (it's an instruction, not a description).
  const stills = Array.from(document.querySelectorAll('.gallery-still'))
    .map(el => ({ el, src: urlOf(el), label: el.getAttribute('aria-label') || '' }))
    .filter(s => s.src && !s.el.classList.contains('is-empty'));
  if (!stills.length) return;   // nothing to open yet (empty Stillur band)

  /* ---- build the overlay once ---- */
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Mynd í fullri stærð');
  // Picture before controls in the DOM: on a phone the arrows then sit BELOW
  // the frame (source order = single-column order), and a screen reader reads
  // the image before the paging buttons.
  box.innerHTML = `
    <button class="lightbox-btn lightbox-close" type="button" aria-label="Loka">&times;</button>
    <figure class="lightbox-figure">
      <img class="lightbox-img" alt="" decoding="async">
      <figcaption class="lightbox-caption"></figcaption>
      <p class="lightbox-count" aria-hidden="true"></p>
    </figure>
    <div class="lightbox-nav-row">
      <button class="lightbox-btn lightbox-prev" type="button" aria-label="Fyrri mynd">&#8249;</button>
      <button class="lightbox-btn lightbox-next" type="button" aria-label="Næsta mynd">&#8250;</button>
    </div>`;
  document.body.appendChild(box);

  const img     = box.querySelector('.lightbox-img');
  const caption = box.querySelector('.lightbox-caption');
  const count   = box.querySelector('.lightbox-count');
  const closeBtn = box.querySelector('.lightbox-close');
  const prevBtn = box.querySelector('.lightbox-prev');
  const nextBtn = box.querySelector('.lightbox-next');

  let index = -1;
  let lastTrigger = null;

  function show(i) {
    // Wrap around — with only a handful of stills, a dead end at either edge
    // is more annoying than useful.
    index = (i + stills.length) % stills.length;
    const { src, label } = stills[index];
    img.src = src;
    img.alt = label;
    caption.textContent = label;
    count.textContent = `${index + 1} / ${stills.length}`;
    // Warm the neighbours so paging feels instant.
    [index - 1, index + 1].forEach(n => {
      const s = stills[(n + stills.length) % stills.length];
      if (s) { const p = new Image(); p.src = s.src; }
    });
  }

  function open(i, trigger) {
    lastTrigger = trigger || null;
    show(i);
    ScrollLock.lock();
    box.classList.add('is-open');
    closeBtn.focus({ preventScroll: true });
  }

  function close() {
    if (!box.classList.contains('is-open')) return;
    box.classList.remove('is-open');
    ScrollLock.unlock();
    // Send focus back where it came from, or a keyboard user is dumped at the
    // top of the document.
    lastTrigger?.focus({ preventScroll: true });
    lastTrigger = null;
  }

  const isOpen = () => box.classList.contains('is-open');

  /* ---- triggers on the stills ---- */
  stills.forEach(({ el }, i) => {
    el.classList.add('is-zoomable');
    // Reachable by keyboard, and announced as the action it now performs.
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    const label = el.getAttribute('aria-label') || 'Mynd';
    el.setAttribute('aria-label', `${label} — opna í fullri stærð`);

    // Tap, not drag. The phone band is carried sideways by vertical scroll, so
    // a click can land at the end of a flick; ignore anything that moved.
    let down = null;
    el.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointercancel', () => { down = null; });
    el.addEventListener('click', e => {
      if (down) {
        const moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y);
        down = null;
        if (moved > 10) return;
      }
      open(i, el);
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i, el); }
    });
  });

  /* ---- overlay controls ---- */
  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => show(index - 1));
  nextBtn.addEventListener('click', () => show(index + 1));
  // Clicking the dark surround closes; clicking the picture itself does not.
  box.addEventListener('click', e => { if (e.target === box) close(); });

  window.addEventListener('keydown', e => {
    if (!isOpen()) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); show(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
    // Keep Tab inside the dialog — it's modal, so focus must not wander off
    // to the page behind it.
    if (e.key === 'Tab') {
      const stops = [closeBtn, prevBtn, nextBtn];
      const at = stops.indexOf(document.activeElement);
      e.preventDefault();
      const next = e.shiftKey ? at - 1 : at + 1;
      stops[(next + stops.length) % stops.length].focus();
    }
  });

  // Swipe to page on touch — a supplement to the arrows, never the only way.
  let touchX = null;
  box.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 45) show(index + (dx < 0 ? 1 : -1));
  }, { passive: true });

  // Only one still? Paging controls would be dead weight.
  if (stills.length < 2) { prevBtn.hidden = true; nextBtn.hidden = true; }
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
    // Idle while a director card is open. The canvas is hidden by CSS then,
    // so this work would be invisible anyway — and leaving a full-viewport
    // repaint running competes with the card's transition for frame budget.
    if (document.body.classList.contains('team-card-open')) {
      requestAnimationFrame(tick);
      return;
    }
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

/* ─── TEAM CARDS — click-to-reveal role + bio ────────────────────── */
/* Confirmed change: text only appears when a person is clicked/tapped.
   One card open at a time; Enter/Space work because cards are
   role="button" + tabindex="0". */
(function initTeamCards() {
  const cards = Array.from(document.querySelectorAll('.team-card'));
  if (!cards.length) return;
  const layout = document.getElementById('teamGrid');
  const backdrop = document.createElement('div');
  backdrop.className = 'team-card-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.appendChild(backdrop);

  let activeCard = null;
  let originRect = null;
  let placeholder = null;

  /* Scroll lock lives in the shared ScrollLock (top of file) — the lightbox
     needs exactly the same Lenis-aware behaviour, and two copies of it would
     drift apart. */
  const lockScroll = () => ScrollLock.lock();
  const unlockScroll = () => ScrollLock.unlock();

  /* One easing in both directions — an open that glides and a close that
     snaps back on a different curve reads as two unrelated animations.
     This is the standard "smooth" decelerate curve, same as --ease-soft.
     Exit is a touch quicker than entry: leaving should never feel slower
     than arriving. */
  const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const OPEN_MS = 380;
  const CLOSE_MS = 280;

  /* NOT a rigid FLIP — deliberately.
     A FLIP only looks right when the element keeps its aspect ratio. This
     one does not: a 320x503 portrait card becomes an 860x720 landscape
     panel. Scaling x and y independently matches the footprint but visibly
     squashes the portrait and text; scaling uniformly keeps proportions but
     starts the card at 320x268 inside a 320x503 slot — a 236px collapse on
     the first frame. Both are the same bug wearing different clothes.

     So: emerge from the card instead of pretending to BE the card. A small
     scale-up plus a fade, nudged partway toward where you clicked, keeps
     the spatial link without ever claiming the two boxes are the same
     shape. The fade is what absorbs the geometry difference. */
  const DRIFT = 0.4;   // how far toward the origin card it starts (0..1)
  const FROM_SCALE = 0.94;

  function entryTransform(from, to) {
    const dx = ((from.left + from.width / 2) - (to.left + to.width / 2)) * DRIFT;
    const dy = ((from.top + from.height / 2) - (to.top + to.height / 2)) * DRIFT;
    return `translate(${dx}px, ${dy}px) scale(${FROM_SCALE})`;
  }

  function run(card, keyframes, duration, fill = 'none') {
    card.style.willChange = 'transform, opacity';
    const anim = card.animate(keyframes, { duration, easing: EASE, fill });
    const clear = () => { card.style.willChange = ''; };
    anim.finished.then(clear).catch(clear);
    return anim;
  }

  function closeCard(animate = true) {
    if (!activeCard) return;
    const card = activeCard;
    const current = card.getBoundingClientRect();
    const target = originRect;

    const finish = (anim) => {
      // Collapse and un-fix the card in ONE style change with transitions
      // suppressed, so the row collapse and text fade never get to play out
      // with the card back in flow (see .is-closing in style.css).
      card.classList.add('is-closing');
      card.classList.remove('is-open', 'is-featured');
      card.setAttribute('aria-expanded', 'false');
      placeholder?.remove();
      placeholder = null;
      layout?.classList.remove('has-open');
      document.body.classList.remove('team-card-open');
      activeCard = null;
      originRect = null;
      // Force the collapsed geometry to commit while transitions are still
      // off. Only then drop the fade-out hold and re-enable transitions —
      // the values already match, so nothing animates.
      void card.offsetHeight;
      anim?.cancel();
      // Next frame normally; the timer is a fallback because rAF is paused in
      // a hidden tab, and the class must never get stuck (it mutes the card's
      // transitions). Removal is idempotent, so both firing is harmless.
      const release = () => card.classList.remove('is-closing');
      requestAnimationFrame(release);
      setTimeout(release, 80);
      // Focus BEFORE restoring scroll, never after. Returning focus to an
      // element that was just reinserted into flow can nudge the native
      // scroll offset even with preventScroll, and Lenis resyncs from it on
      // start(). Restoring last means the offset always gets the final say.
      card.focus({ preventScroll: true });
      unlockScroll();
    };

    // Dim the backdrop WITH the card, not after it. Releasing this inside
    // finish() left the scrim at full strength for the whole return trip
    // and then snapped it away once the card had already landed.
    backdrop.classList.remove('is-visible');

    if (!animate || REDUCE || !target || !card.animate) {
      finish();
      return;
    }

    // fill: 'forwards' matters here. With the default fill the effect is
    // dropped the instant the animation ends, so the card snapped back to
    // opacity 1 for the frame before teardown ran — a fully opaque card
    // flashing in flow. Holding the last keyframe keeps it invisible until
    // finish() has collapsed it, then cancels the hold.
    const closing = run(card, [
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: entryTransform(target, current), opacity: 0 }
    ], CLOSE_MS, 'forwards');
    closing.finished.then(() => finish(closing)).catch(() => finish(closing));
  }

  function openCard(card) {
    // A card reopened inside the same frame it closed would still be carrying
    // the teardown class, and would open with its transitions muted.
    card.classList.remove('is-closing');
    // Measure before locking — the no-Lenis fallback repositions <body>.
    originRect = card.getBoundingClientRect();
    lockScroll();
    placeholder = document.createElement('div');
    placeholder.className = 'team-card-placeholder';
    placeholder.style.height = `${originRect.height}px`;
    card.before(placeholder);
    cards.forEach(c => {
      c.classList.toggle('is-open', c === card);
      c.classList.toggle('is-featured', c === card);
      c.setAttribute('aria-expanded', String(c === card));
    });
    activeCard = card;
    layout?.classList.add('has-open');
    backdrop.classList.add('is-visible');
    document.body.classList.add('team-card-open');

    if (REDUCE || !card.animate) return;
    requestAnimationFrame(() => {
      const target = card.getBoundingClientRect();
      run(card, [
        { transform: entryTransform(originRect, target), opacity: 0 },
        { transform: 'translate(0, 0) scale(1)', opacity: 1 }
      ], OPEN_MS);
    });
  }

  function toggle(card) {
    if (card === activeCard) closeCard();
    else {
      if (activeCard) closeCard(false);
      openCard(card);
    }
  }

  backdrop.addEventListener('click', () => closeCard());
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && activeCard) closeCard();
  });
  cards.forEach(card => {
    card.addEventListener('click', () => toggle(card));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(card); }
    });
  });
})();

/* ─── SCROLL REVEAL — gentle, staggered ──────────────────────────── */
(function initReveal() {
  const groups = [
    '.team-inner > .section-eyebrow', '.director-card',
    '.gallery-header > *',
    '.projects-inner > .section-eyebrow', '.project-card',
    '.film-poster-wrap', '.film-info > *',
    '.people-inner > *', '.music-inner > *', '.contact-inner > *',
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
(function initGalleries() {
  document.querySelectorAll('.gallery').forEach(initGallery);
})();

function initGallery(section) {
  const track = section.querySelector('.gallery-track');
  const prev = section.querySelector('[data-gallery-prev]');
  const next = section.querySelector('[data-gallery-next]');
  const progress = section.querySelector('.gallery-progress-fill');
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
}

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
