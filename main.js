/* Keming Wu — homepage interactions and the WebGL night sky. */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };

  /* ================= Palettes: one per section, the sky drifts between them ================= */
  var PALETTES = {
    aurora: { name: 'Aurora', neb1: '#0b3d4a', neb2: '#24195a', accent: '#7fe3d1', a: '#7fe3d1', b: '#8fb4ff' },
    nebula: { name: 'Nebula', neb1: '#2a1760', neb2: '#0c3350', accent: '#c3b2ff', a: '#c3b2ff', b: '#7fd6e6' },
    indigo: { name: 'Indigo', neb1: '#172a6b', neb2: '#3a1b5c', accent: '#a9c8ff', a: '#a9c8ff', b: '#d2b8ff' },
    amber:  { name: 'Amber',  neb1: '#1b2560', neb2: '#4d2140', accent: '#f6c98b', a: '#f6c98b', b: '#a9c8ff' },
    jade:   { name: 'Jade',   neb1: '#0c4036', neb2: '#1a2763', accent: '#8fe6c4', a: '#8fe6c4', b: '#b9a2ff' },
    rose:   { name: 'Rose',   neb1: '#3a1a5a', neb2: '#5a2140', accent: '#f6b6c8', a: '#f6b6c8', b: '#c3b2ff' }
  };

  function hexRgb(h) {
    var n = parseInt(h.slice(1), 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }

  var skyState = { a: hexRgb(PALETTES.aurora.a), b: hexRgb(PALETTES.aurora.b), target: PALETTES.aurora, hi: -1 };
  var skyName = $('.sky-name');
  var currentPalette = 'aurora';

  function setPalette(key) {
    if (key === currentPalette || !PALETTES[key]) return;
    currentPalette = key;
    var p = PALETTES[key];
    root.style.setProperty('--neb1', p.neb1);
    root.style.setProperty('--neb2', p.neb2);
    root.style.setProperty('--accent', p.accent);
    if (skyName) skyName.textContent = p.name;
    skyState.target = p;
  }

  /* ================= Papers: filter tabs, counts, hero stats ================= */
  var papers = $$('.paper');
  var tabs = $$('.tab');
  var yearGroups = $$('.year-group');

  function matches(p, f) {
    return f === 'all' || (f === 'first' && p.getAttribute('data-first') === 'true') || p.getAttribute('data-cat') === f;
  }

  tabs.forEach(function (tab) {
    var f = tab.getAttribute('data-filter');
    var sup = document.createElement('sup');
    sup.textContent = papers.filter(function (p) { return matches(p, f); }).length;
    tab.appendChild(sup);
    tab.addEventListener('click', function () { applyFilter(f); });
  });

  function applyFilter(f) {
    tabs.forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-filter') === f); });
    var shown = 0;
    papers.forEach(function (p) {
      var show = matches(p, f);
      p.classList.toggle('hidden', !show);
      p.classList.remove('pop');
      if (show && !reduce) {
        void p.offsetWidth; // restart the animation
        p.style.animationDelay = Math.min(shown++, 10) * 45 + 'ms';
        p.classList.add('pop');
      }
    });
    yearGroups.forEach(function (g) {
      g.classList.toggle('hidden', !$('.paper:not(.hidden)', g));
    });
  }

  $$('[data-filter-target]').forEach(function (el) {
    el.addEventListener('click', function () { applyFilter(el.getAttribute('data-filter-target')); });
  });

  var stats = {
    total: papers.length,
    first: papers.filter(function (p) { return p.getAttribute('data-first') === 'true'; }).length,
    neurips: $$('.paper .venue').filter(function (v) { return v.textContent.trim() === 'NeurIPS 2026'; }).length,
    y2026: $$('.paper .venue:not(.pre)').filter(function (v) { return /2026$/.test(v.textContent.trim()); }).length
  };
  var statEls = $$('.stat-num[data-stat]');
  statEls.forEach(function (el) { el.textContent = stats[el.getAttribute('data-stat')]; });

  function countUp(el) {
    var target = stats[el.getAttribute('data-stat')];
    var t0 = null;
    (function step(ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min((ts - t0) / 1400, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    })(performance.now());
  }
  if (!reduce) setTimeout(function () { statEls.forEach(countUp); }, 700);

  /* ================= News toggle ================= */
  var newsList = $('.news-list');
  var newsBtn = $('.news-toggle');
  if (newsBtn && !$('.news-row.extra')) newsBtn.hidden = true;
  if (newsBtn) {
    newsBtn.addEventListener('click', function () {
      var open = newsList.classList.toggle('expanded');
      newsBtn.setAttribute('aria-expanded', open);
      newsBtn.textContent = newsBtn.getAttribute(open ? 'data-less' : 'data-more');
    });
  }

  /* ================= Copy email ================= */
  $$('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var done = function () {
        btn.textContent = 'Copied';
        btn.classList.add('done');
        setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('done'); }, 1600);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
    });
  });

  /* ================= Research threads light up their lobe of the loop ================= */
  $$('.thread').forEach(function (th) {
    var lobe = +th.getAttribute('data-lobe');
    th.addEventListener('mouseenter', function () { skyState.hi = lobe; th.classList.add('on'); });
    th.addEventListener('mouseleave', function () { skyState.hi = -1; th.classList.remove('on'); });
  });

  /* ================= Nav, scroll spy, palette by section ================= */
  var nav = $('.nav');
  var progress = $('.nav-progress');
  var navLinks = $$('.nav-links a');
  var navTargets = navLinks.map(function (a) { return $(a.getAttribute('href')); });
  var skySections = $$('[data-sky]');
  var ticking = false;

  function onScroll() {
    ticking = false;
    var y = window.scrollY, vh = window.innerHeight;
    var max = document.documentElement.scrollHeight - vh;
    progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    nav.classList.toggle('scrolled', y > 10);

    var cur = -1;
    navTargets.forEach(function (sec, i) { if (sec && sec.getBoundingClientRect().top <= vh * 0.4) cur = i; });
    navLinks.forEach(function (a, i) { a.classList.toggle('active', i === cur); });

    for (var i = skySections.length - 1; i >= 0; i--) {
      if (skySections[i].getBoundingClientRect().top <= vh * 0.5) { setPalette(skySections[i].getAttribute('data-sky')); break; }
    }
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ================= Scroll reveal ================= */
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        e.target.style.transitionDelay = Math.min(n++, 5) * 90 + 'ms';
        e.target.classList.add('in');
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* ================= The sky ================= */
  var pauseBtn = $('.sky-pause');
  var paused = false;
  if (pauseBtn) {
    pauseBtn.addEventListener('click', function () {
      paused = !paused;
      pauseBtn.setAttribute('aria-pressed', paused);
      pauseBtn.setAttribute('aria-label', paused ? 'Resume the sky animation' : 'Pause the sky animation');
    });
  }

  try { initSky(); } catch (err) { root.classList.add('no-gl'); }

  function initSky() {
    var canvas = document.getElementById('sky');
    var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
    if (!gl) { root.classList.add('no-gl'); return; }

    var TAU = Math.PI * 2;
    var small = Math.min(window.innerWidth, window.innerHeight) < 720;
    var N = small ? 2600 : 4600;          // all stars
    var NF = Math.round(N * 0.66);         // stars that leave the sky to form figures
    var rnd = Math.random;
    function gauss() { return (rnd() + rnd() + rnd() - 1.5) / 1.5; }

    /* --- figures: xyz in roughly [-1, 1]; w = colour index (0 world, 1 reward, 2 rl) + brightness in the fraction --- */
    function pack(out, i, x, y, z, idx, lum) {
      out[i * 4] = x; out[i * 4 + 1] = y; out[i * 4 + 2] = z;
      out[i * 4 + 3] = idx + Math.min(Math.max(lum, 0), 0.999);
    }

    // 0: a globe with a graticule and an orbit ring (world modeling)
    function globe() {
      var out = new Float32Array(N * 4), R = 0.78;
      for (var i = 0; i < NF; i++) {
        var r = rnd(), x, y, z, a = rnd() * TAU, j = 0.012;
        if (r < 0.38) {                                   // faint surface dust
          y = rnd() * 2 - 1; var s = Math.sqrt(1 - y * y);
          pack(out, i, s * Math.cos(a) * R, y * R, s * Math.sin(a) * R, 0, 0.12 + rnd() * 0.3);
        } else if (r < 0.62) {                            // latitude lines
          var lat = (Math.floor(rnd() * 5) - 2) * Math.PI / 6, c = Math.cos(lat);
          pack(out, i, c * Math.cos(a) * R + gauss() * j, Math.sin(lat) * R + gauss() * j, c * Math.sin(a) * R + gauss() * j, 0, 0.55 + rnd() * 0.45);
        } else if (r < 0.84) {                            // meridians
          var lon = Math.floor(rnd() * 6) * Math.PI / 6, s2 = Math.sin(a);
          pack(out, i, s2 * Math.cos(lon) * R + gauss() * j, Math.cos(a) * R + gauss() * j, s2 * Math.sin(lon) * R + gauss() * j, 2, 0.5 + rnd() * 0.45);
        } else {                                          // tilted orbit ring
          var Ro = 1.16 + gauss() * 0.02, t = 0.42;
          x = Ro * Math.cos(a); z = Ro * Math.sin(a); y = gauss() * 0.015;
          pack(out, i, x, y * Math.cos(t) - z * Math.sin(t), y * Math.sin(t) + z * Math.cos(t), 1, 0.6 + rnd() * 0.4);
        }
      }
      return out;
    }

    // 1: a trefoil knot, the unified loop; each third of the curve is one research thread.
    //    Here the fraction stores the position along the curve so a pulse can travel around it.
    function trefoil() {
      var out = new Float32Array(N * 4);
      for (var i = 0; i < NF; i++) {
        var u = rnd(), t = u * TAU;
        var x = Math.sin(t) + 2 * Math.sin(2 * t), y = Math.cos(t) - 2 * Math.cos(2 * t), z = -Math.sin(3 * t);
        var spread = rnd() < 0.88 ? 0.05 : 0.2;           // tube + a little dust
        var lobe = Math.min(2, Math.floor(u * 3));        // tips at t = pi/3, pi, 5pi/3
        out[i * 4] = x / 3 + gauss() * spread;
        out[i * 4 + 1] = y / 3 + gauss() * spread;
        out[i * 4 + 2] = z / 3 + gauss() * spread;
        out[i * 4 + 3] = lobe + Math.min(u * 3 - lobe, 0.999);
      }
      return out;
    }

    // KMW: each letter sampled from text drawn on a canvas, one thread colour per letter
    function initials() {
      var out = new Float32Array(N * 4);
      var W = 1024, H = 360, FS = 270, GAP = 10, c = document.createElement('canvas');
      c.width = W; c.height = H;
      var ctx = c.getContext('2d');
      ctx.font = 'italic ' + FS + 'px "Instrument Serif", Georgia, serif';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ctx.strokeStyle = '#fff';
      ctx.lineWidth = 5;                                  // thicken the hairlines so every stroke holds stars
      var letters = ['K', 'M', 'W'], widths = letters.map(function (l) { return ctx.measureText(l).width; });
      var x0 = (W - widths.reduce(function (a, b) { return a + b + GAP; }, -GAP)) / 2;
      var pix = letters.map(function (l, li) {
        ctx.clearRect(0, 0, W, H);
        ctx.fillText(l, x0, H / 2 + 12);
        ctx.strokeText(l, x0, H / 2 + 12);
        x0 += widths[li] + GAP;
        var data = ctx.getImageData(0, 0, W, H).data, px = [];
        for (var k = 0; k < W * H; k++) if (data[k * 4 + 3] > 120) px.push(k);
        return px;
      });
      // normalise so the word spans x in [-1, 1]
      var minX = W, maxX = 0, minY = H, maxY = 0;
      pix.forEach(function (px) {
        px.forEach(function (p) {
          var x = p % W, y = (p / W) | 0;
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        });
      });
      var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, sc = 2 / Math.max(maxX - minX, 1);
      var total = pix[0].length + pix[1].length + pix[2].length;
      for (var i = 0; i < NF; i++) {
        if (total && rnd() < 0.92) {
          var r = rnd() * total, li = r < pix[0].length ? 0 : (r < pix[0].length + pix[1].length ? 1 : 2);
          var p = pix[li][(rnd() * pix[li].length) | 0];
          pack(out, i, ((p % W) + rnd() - cx) * sc, (cy - ((p / W) | 0) - rnd()) * sc, gauss() * 0.03, li, 0.5 + rnd() * 0.5);
        } else {                                          // dust drifting around the word
          var a = rnd() * TAU, rr = 0.75 + rnd() * 0.5, x = Math.cos(a) * rr * 1.15;
          pack(out, i, x, Math.sin(a) * rr * 0.55, gauss() * 0.05, Math.min(2, Math.floor((x + 1.3) / 2.6 * 3)), 0.08 + rnd() * 0.22);
        }
      }
      return out;
    }

    /* --- the free sky: x, y in [0, 1], depth in [0, 1]; seeds; figure flag --- */
    var scat = new Float32Array(N * 3), seed = new Float32Array(N * 4);
    for (var i = 0; i < N; i++) {
      scat[i * 3] = rnd(); scat[i * 3 + 1] = rnd(); scat[i * 3 + 2] = Math.pow(rnd(), 1.7);
      seed[i * 4] = rnd(); seed[i * 4 + 1] = rnd(); seed[i * 4 + 2] = rnd(); seed[i * 4 + 3] = i < NF ? 1 : 0;
    }

    var VS = [
      'precision highp float;',
      'attribute vec3 aScat; attribute vec4 aSeed; attribute vec4 aS0; attribute vec4 aS1; attribute vec4 aS2; attribute vec2 aOff;',
      'uniform vec2 uRes; uniform float uDpr, uTime, uScroll, uHi;',
      'uniform vec3 uW, uC0, uC1, uC2, uColA, uColB, uT0, uT1, uT2;',
      'uniform mat3 uR0, uR1, uR2;',
      'varying vec3 vCol; varying float vA;',
      'vec3 thread(float i) { return i < .5 ? uT0 : (i < 1.5 ? uT1 : uT2); }',
      // project a figure point into the slot's box (css px); z = depth for size / brightness
      'vec3 place(vec3 s, vec3 c, mat3 R) {',
      '  vec3 p = R * s; float k = 1.0 / (1.0 - p.z * 0.3);',
      '  return vec3(c.xy + vec2(p.x, -p.y) * c.z * k, p.z);',
      '}',
      'void main() {',
      '  float d = aScat.z;',
      '  float y = fract(aScat.y - uScroll * (0.06 + 0.3 * d) / uRes.y);',      // parallax drift with scroll
      '  vec2 sky = vec2(aScat.x * uRes.x, y * (uRes.y + 60.0) - 30.0);',
      '  sky += vec2(sin(uTime * .05 + aSeed.x * 40.), cos(uTime * .04 + aSeed.y * 40.)) * 7.0 * d;',
      '  vec3 w = clamp(uW * 1.7 - aSeed.z * 0.7, 0.0, 1.0) * aSeed.w;',         // staggered gathering
      '  w = w * w * (3.0 - 2.0 * w);',
      '  float tot = w.x + w.y + w.z;',
      '  if (tot > 1.0) { w /= tot; tot = 1.0; }',
      '  float inv = 1.0 / max(tot, 1e-4);',
      '  vec3 p0 = place(aS0.xyz + vec3(aOff, 0.0), uC0, uR0), p1 = place(aS1.xyz, uC1, uR1), p2 = place(aS2.xyz, uC2, uR2);',
      '  vec2 fig = (p0.xy * w.x + p1.xy * w.y + p2.xy * w.z) * inv;',
      '  vec2 dir = fig - sky;',
      '  vec2 pos = mix(sky, fig, tot) + vec2(-dir.y, dir.x) * 0.25 * sin(3.14159 * tot) * (aSeed.x - .5);', // curved flight
      '  float tw = 0.7 + 0.3 * sin(uTime * (0.7 + aSeed.y * 2.3) + aSeed.x * 60.0);',
      '  float big = step(0.986, aSeed.x);',
      '  vec3 skyCol = mix(mix(uColA, uColB, aSeed.y), vec3(1.0), 0.45 + 0.4 * aSeed.x);',
      '  float skySize = (1.0 + 2.1 * d * d) * (1.0 + big * 2.4);',
      '  float skyA = (0.22 + 0.6 * d) * tw;',
      // the loop carries a light pulse around its curve
      '  float pulse = pow(0.5 + 0.5 * cos(6.28318 * (aS1.w / 3.0 * 2.0 - uTime * 0.09)), 12.0);',
      '  float kick = min(length(aOff) * 5.0, 1.0);',                         // stars pushed by the cursor flare up
      '  float l0 = fract(aS0.w) + 0.7 * kick, l1 = 0.4 + 0.6 * pulse, l2 = fract(aS2.w);',
      '  float hi = uHi < -0.5 ? 1.0 : (abs(floor(aS1.w) - uHi) < .5 ? 1.6 : 0.3);',
      '  float lum = (l0 * w.x + l1 * w.y * hi + l2 * w.z) * inv;',
      '  vec3 fc = (thread(floor(aS0.w)) * w.x + thread(floor(aS1.w)) * w.y + thread(floor(aS2.w)) * w.z) * inv;',
      '  float z = (p0.z * w.x + p1.z * w.y + p2.z * w.z) * inv;',
      '  vec3 figCol = mix(fc, vec3(1.0), 0.08 + 0.3 * min(lum, 1.0) + 0.25 * kick * w.x * inv);',
      '  float figSize = (1.5 + 1.8 * lum) * (1.0 + 0.4 * z) * (1.0 + big * 1.4);',
      '  float figA = (0.4 + 0.6 * min(lum, 1.4)) * (0.7 + 0.3 * z) * (0.85 + 0.15 * tw);',
      '  vCol = mix(skyCol, figCol, tot);',
      '  vA = mix(skyA, figA, tot);',
      '  gl_PointSize = mix(skySize, figSize, tot) * 2.6 * uDpr;',
      '  gl_Position = vec4(pos.x / uRes.x * 2.0 - 1.0, 1.0 - pos.y / uRes.y * 2.0, 0.0, 1.0);',
      '}'
    ].join('\n');

    var FS = [
      'precision mediump float;',
      'varying vec3 vCol; varying float vA;',
      'void main() {',
      '  vec2 q = gl_PointCoord * 2.0 - 1.0; float r2 = dot(q, q);',
      '  if (r2 > 1.0) discard;',
      '  float a = (exp(-r2 * 16.0) + exp(-r2 * 4.0) * 0.28) * vA;',   // bright core + soft halo
      '  gl_FragColor = vec4(vCol * a, a);',
      '}'
    ].join('\n');

    function compile(type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      return sh;
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);

    function attr(name, data, size) {
      var loc = gl.getAttribLocation(prog, name);
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      }
      return buf;
    }
    attr('aScat', scat, 3);
    attr('aSeed', seed, 4);
    var kmw = initials();
    var kmwBuf = attr('aS0', kmw, 4);
    attr('aS1', trefoil(), 4);
    attr('aS2', globe(), 4);

    // Physics for the KMW stars: an offset from each star's home, pulled back by a spring
    var off = new Float32Array(N * 2), vel = new Float32Array(N * 2);
    var offBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, offBuf);
    gl.bufferData(gl.ARRAY_BUFFER, off, gl.DYNAMIC_DRAW);
    var offLoc = gl.getAttribLocation(prog, 'aOff');
    gl.enableVertexAttribArray(offLoc);
    gl.vertexAttribPointer(offLoc, 2, gl.FLOAT, false, 0, 0);

    // Resample the letters once the display font has loaded
    if (document.fonts && document.fonts.load) {
      document.fonts.load('italic 270px "Instrument Serif"').then(function () {
        kmw = initials();
        gl.bindBuffer(gl.ARRAY_BUFFER, kmwBuf);
        gl.bufferData(gl.ARRAY_BUFFER, kmw, gl.STATIC_DRAW);
      }, function () {});
    }

    var U = {};
    ['uRes', 'uDpr', 'uTime', 'uScroll', 'uHi', 'uW', 'uC0', 'uC1', 'uC2', 'uColA', 'uColB',
     'uT0', 'uT1', 'uT2', 'uR0', 'uR1', 'uR2'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    gl.uniform3fv(U.uT0, hexRgb('#5fe0c8'));
    gl.uniform3fv(U.uT1, hexRgb('#b9a2ff'));
    gl.uniform3fv(U.uT2, hexRgb('#7fb0ff'));
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);   // additive light

    /* --- slots: where each figure lives on the page --- */
    var CONF = [
      { scale: 0.46 },                                        // KMW: faces the viewer, the cursor scatters it
      { scale: 0.44, roll: 0.12, tilt: 0.16, wobble: 0.22 },  // trefoil: turns in its own plane so all three lobes stay visible
      { scale: 0.36, spin: 0.16, tilt: 0.38 }                 // globe
    ];
    var slots = [0, 1, 2].map(function (k) {
      var el = $('.slot[data-shape="' + k + '"]');
      var s = { el: el, conf: CONF[k], w: 0, yaw: 0, pitch: 0, vel: 0, drag: null, cx: -9999, cy: -9999, rad: 0, formedCss: -1 };
      if (el) (k === 0 ? bindScatter : bindDrag)(s);
      return s;
    });

    // The cursor (or a finger) pushes KMW stars aside; a click or tap bursts them outward
    var mouse = null, burst = null;
    function bindScatter(s) {
      window.addEventListener('pointermove', function (e) {
        var t = performance.now();
        if (mouse && t > mouse.t) {
          var k = 1 / Math.max((t - mouse.t) / 1000, 0.008);
          mouse.vx = (e.clientX - mouse.x) * k; mouse.vy = (e.clientY - mouse.y) * k;
        }
        mouse = { x: e.clientX, y: e.clientY, t: t, vx: mouse ? mouse.vx : 0, vy: mouse ? mouse.vy : 0 };
      }, { passive: true });
      document.documentElement.addEventListener('pointerleave', function () { mouse = null; });
      window.addEventListener('blur', function () { mouse = null; });
      s.el.addEventListener('pointerdown', function (e) { burst = { x: e.clientX, y: e.clientY }; });
      s.el.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        burst = { x: s.cx, y: s.cy };
      });
    }

    var settled = true;
    function stepScatter(s, dt) {
      if (reduce || s.w < 0.02 || s.rad <= 0) return;
      var R = 0.3, R2 = R * R;
      var mx = 1e9, my = 1e9, mvx = 0, mvy = 0;
      if (mouse) {
        mx = (mouse.x - s.cx) / s.rad; my = -(mouse.y - s.cy) / s.rad;
        mvx = mouse.vx / s.rad; mvy = -mouse.vy / s.rad;
        mouse.vx *= Math.exp(-dt * 10); mouse.vy *= Math.exp(-dt * 10);   // cursor speed fades when it stops
      }
      var bx = 1e9, by = 1e9;
      if (burst) { bx = (burst.x - s.cx) / s.rad; by = -(burst.y - s.cy) / s.rad; burst = null; }
      var near = mx > -1.6 && mx < 1.6 && my > -1 && my < 1;
      if (settled && !near && bx > 1e8) return;

      var stiff = 26, damp = Math.exp(-dt * 5.5), energy = 0;
      for (var i = 0; i < NF; i++) {
        var j = i * 2, ox = off[j], oy = off[j + 1], vx = vel[j], vy = vel[j + 1];
        var px = kmw[i * 4] + ox, py = kmw[i * 4 + 1] + oy;
        if (near) {
          var dx = px - mx, dy = py - my, d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            var d = Math.sqrt(d2) + 1e-4, f = 1 - d / R;
            f *= f;
            vx += (dx / d * 9 + mvx * 0.9) * f * dt * 6;    // push away + get swept along with the cursor
            vy += (dy / d * 9 + mvy * 0.9) * f * dt * 6;
          }
        }
        if (bx < 1e8) {
          var ex = px - bx, ey = py - by, e = Math.sqrt(ex * ex + ey * ey) + 0.05, kick = (2.6 + rnd() * 2.2) / (0.35 + e * 1.8);
          var a = (rnd() - 0.5) * 0.9, ca = Math.cos(a), sa = Math.sin(a);
          vx += (ex * ca - ey * sa) / e * kick;
          vy += (ex * sa + ey * ca) / e * kick;
        }
        vx = (vx - ox * stiff * dt) * damp;
        vy = (vy - oy * stiff * dt) * damp;
        ox += vx * dt; oy += vy * dt;
        off[j] = ox; off[j + 1] = oy; vel[j] = vx; vel[j + 1] = vy;
        energy += ox * ox + oy * oy + vx * vx * 0.01 + vy * vy * 0.01;
      }
      settled = energy < 1e-6 * NF;
      if (settled) { off.fill(0); vel.fill(0); }
      gl.bindBuffer(gl.ARRAY_BUFFER, offBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, off);
    }

    function bindDrag(s) {
      var el = s.el, lastT = 0;
      el.addEventListener('pointerdown', function (e) {
        s.drag = { x: e.clientX, y: e.clientY };
        lastT = performance.now();
        try { el.setPointerCapture(e.pointerId); } catch (_) {}
      });
      el.addEventListener('pointermove', function (e) {
        if (!s.drag) return;
        var dx = e.clientX - s.drag.x, dy = e.clientY - s.drag.y, now = performance.now();
        s.yaw += dx * 0.01;
        s.pitch = Math.max(-1.1, Math.min(1.1, s.pitch + dy * 0.008));
        s.vel = Math.max(-5, Math.min(5, dx * 0.01 / Math.max((now - lastT) / 1000, 0.008)));
        s.drag = { x: e.clientX, y: e.clientY };
        lastT = now;
      });
      var end = function () { s.drag = null; };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('keydown', function (e) {
        var k = { ArrowLeft: [-0.3, 0], ArrowRight: [0.3, 0], ArrowUp: [0, -0.2], ArrowDown: [0, 0.2] }[e.key];
        if (!k) return;
        e.preventDefault();
        s.yaw += k[0];
        s.pitch = Math.max(-1.1, Math.min(1.1, s.pitch + k[1]));
      });
    }

    // rotation = Rx(pitch) * Ry(yaw) * Rz(roll), uploaded column-major
    function rot(yaw, pitch, roll) {
      var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      var cr = Math.cos(roll || 0), sr = Math.sin(roll || 0);
      var a = [[cy, 0, sy], [sp * sy, cp, -sp * cy], [-cp * sy, sp, cp * cy]];   // Rx * Ry (row-major)
      var m = [0, 1, 2].map(function (r) {
        return [a[r][0] * cr + a[r][1] * sr, -a[r][0] * sr + a[r][1] * cr, a[r][2]];
      });
      return new Float32Array([m[0][0], m[1][0], m[2][0], m[0][1], m[1][1], m[2][1], m[0][2], m[1][2], m[2][2]]);
    }

    var dpr = 1, W = 0, H = 0;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    var time = 0, last = performance.now();
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      var moving = !paused && !reduce;
      if (moving) time += dt;

      var ease = reduce ? 1 : 1 - Math.exp(-dt * 2.2);
      slots.forEach(function (s) {
        if (!s.el) return;
        var r = s.el.getBoundingClientRect();
        var target = 0;
        if (r.width > 0) {
          var cy = r.top + r.height / 2;
          var dist = Math.abs(cy - H / 2) / (H * 0.5 + r.height * 0.35);
          target = Math.max(0, Math.min(1, (1 - dist) * 1.8));
          s.cx = r.left + r.width / 2;
          s.cy = cy;
          s.rad = Math.min(r.width, r.height) * s.conf.scale;
        }
        s.w += (target - s.w) * ease;
        if (Math.abs(s.w - s.formedCss) > 0.02) {
          s.formedCss = s.w;
          s.el.style.setProperty('--formed', s.w.toFixed(2));
        }
        if (!s.drag) {
          s.vel *= Math.exp(-dt * 1.6);
          s.yaw += s.vel * dt;
          if (moving && s.conf.spin) s.yaw += s.conf.spin * dt;
        }
      });

      // palette drift
      var ta = hexRgb(skyState.target.a), tb = hexRgb(skyState.target.b), k = reduce ? 1 : 1 - Math.exp(-dt * 1.2);
      for (var c = 0; c < 3; c++) {
        skyState.a[c] += (ta[c] - skyState.a[c]) * k;
        skyState.b[c] += (tb[c] - skyState.b[c]) * k;
      }

      stepScatter(slots[0], dt);

      var g = slots[0], l = slots[1], m = slots[2];
      gl.uniform2f(U.uRes, W, H);
      gl.uniform1f(U.uDpr, dpr);
      gl.uniform1f(U.uTime, time);
      gl.uniform1f(U.uScroll, window.scrollY);
      gl.uniform1f(U.uHi, skyState.hi);
      gl.uniform3f(U.uW, g.w, l.w, m.w);
      gl.uniform3f(U.uC0, g.cx, g.cy, g.rad);
      gl.uniform3f(U.uC1, l.cx, l.cy, l.rad);
      gl.uniform3f(U.uC2, m.cx, m.cy, m.rad);
      gl.uniformMatrix3fv(U.uR0, false, rot(0, 0));
      gl.uniformMatrix3fv(U.uR1, false, rot(l.yaw + Math.sin(time * 0.23) * l.conf.wobble,
        l.conf.tilt + l.pitch + Math.sin(time * 0.17) * l.conf.wobble * 0.6, time * l.conf.roll));
      gl.uniformMatrix3fv(U.uR2, false, rot(m.yaw, m.conf.tilt + m.pitch));
      gl.uniform3fv(U.uColA, skyState.a);
      gl.uniform3fv(U.uColB, skyState.b);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, N);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
})();
