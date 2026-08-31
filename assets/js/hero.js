/* ============================================================
   Navamika Arpan - Section 01
   The wire carries the idea. Everything else waits its turn.
   ============================================================ */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  var svg       = $('#wirelayer');
  var wireLine  = $('#wireLine');
  var wireHalo  = $('#wireHalo');
  var wirePulse = $('#wirePulse');
  var ringSend  = $('#ringSend');
  var ringRecv  = $('#ringRecv');
  var stage     = $('#stage');
  var media     = $('#media');
  var photo     = $('#photo');
  var copy      = $('.stage__copy');
  var runway    = $('.hero-runway');
  var findhow   = $('#findhow');

  /* ----------------------------------------------------------
     1. THE WIRE
     Points traced from the photograph itself, in the image's own
     coordinate space (1536 x 1024). The <svg> uses the same
     viewBox with preserveAspectRatio="slice", so it stays locked
     to the photographed wire at every screen size.
     ---------------------------------------------------------- */

  var BASE = [
    [170, 374], [300, 400], [420, 432], [540, 454], [660, 467],
    [780, 471], [900, 468], [1020, 457], [1140, 438], [1235, 419]
  ];

  // live copy that the cursor is allowed to bend
  var live = BASE.map(function (p) { return [p[0], p[1]]; });
  var goal = BASE.map(function (p) { return [p[0], p[1]]; });

  // Catmull-Rom through the points -> one smooth cubic path
  function toPath(pts) {
    var d = 'M' + pts[0][0].toFixed(2) + ' ' + pts[0][1].toFixed(2);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i + 2] || pts[i + 1];
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += 'C' + c1x.toFixed(2) + ' ' + c1y.toFixed(2) + ',' +
                 c2x.toFixed(2) + ' ' + c2y.toFixed(2) + ',' +
                 p2[0].toFixed(2) + ' ' + p2[1].toFixed(2);
    }
    return d;
  }

  function paintWire() {
    wireLine.setAttribute('d', toPath(live));
  }
  paintWire();

  var LEN = wireLine.getTotalLength();
  var SEG = 86;                       // length of the travelling light

  /* ----------------------------------------------------------
     2. TENSION
     The wire answers the cursor the way a real thread would:
     a little, and only near the hand. Both ends stay pinned.
     ---------------------------------------------------------- */

  var REACH   = 300;   // viewBox units of influence
  var MAX_PX  = 7;     // hard ceiling on displacement, in screen pixels
  var pointer = null;
  var raf     = null;

  function vbScale() {
    var m = svg.getScreenCTM();
    return m ? m.a : 1;              // screen px per viewBox unit
  }

  function toViewBox(clientX, clientY) {
    var m = svg.getScreenCTM();
    if (!m) return null;
    var pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    return pt.matrixTransform(m.inverse());
  }

  function retarget() {
    var maxVB = MAX_PX / (vbScale() || 1);
    for (var i = 0; i < BASE.length; i++) {
      var bx = BASE[i][0], by = BASE[i][1];
      var dx = 0, dy = 0;

      if (pointer) {
        var vx = pointer.x - bx, vy = pointer.y - by;
        var dist = Math.sqrt(vx * vx + vy * vy);
        if (dist < REACH && dist > 0.001) {
          var fall = Math.exp(-(dist / REACH) * (dist / REACH) * 3.2);
          // a string is fixed at both ends: no pull at the cans
          var t    = i / (BASE.length - 1);
          var pin  = Math.sin(Math.PI * t);
          var amp  = maxVB * fall * pin;
          dx = (vx / dist) * amp * 0.35;   // threads give vertically, mostly
          dy = (vy / dist) * amp;
        }
      }
      goal[i][0] = bx + dx;
      goal[i][1] = by + dy;
    }
  }

  function settle() {
    var moved = false;
    for (var i = 0; i < live.length; i++) {
      var ox = live[i][0], oy = live[i][1];
      live[i][0] += (goal[i][0] - ox) * 0.12;
      live[i][1] += (goal[i][1] - oy) * 0.12;
      if (Math.abs(live[i][0] - ox) > 0.01 || Math.abs(live[i][1] - oy) > 0.01) moved = true;
    }
    paintWire();
    if (moved || pointer) {
      raf = requestAnimationFrame(settle);
    } else {
      raf = null;
    }
  }

  function wake() { if (raf === null) raf = requestAnimationFrame(settle); }

  if (!REDUCED && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    stage.addEventListener('pointermove', function (e) {
      pointer = toViewBox(e.clientX, e.clientY);
      retarget();
      wake();
    }, { passive: true });

    stage.addEventListener('pointerleave', function () {
      pointer = null;
      retarget();
      wake();
    }, { passive: true });
  }

  /* ----------------------------------------------------------
     2b. THE SWASH
     The drawn line belongs to the photograph - it leaves the boy
     and points at the girl - but it has to thread the gap between
     the dash and the whisper, and that gap moves with the layout.
     So: anchored to the photograph, nudged by the type.
     ---------------------------------------------------------- */

  var swash     = $('#swash');
  var swashLine = $('#swashLine');
  var ruleEl    = $('#rule');
  var whisperEl = $('.whisper');
  var statement = $('.statement');
  var swashBox  = null;

  function placeSwash() {
    if (!swash || !ruleEl || !whisperEl || !statement) return;
    var m = svg.getScreenCTM();
    if (!m || !m.d) return;
    // below 900px the swash is display:none and getBBox reports nothing;
    // don't cache that, or widening the window would keep the empty box
    if (!swashBox || !swashBox.height) {
      var b = swashLine.getBBox();
      if (!b.height) return;
      swashBox = b;
    }

    var r  = ruleEl.getBoundingClientRect();
    var w  = whisperEl.getBoundingClientRect();
    var st = statement.getBoundingClientRect();

    // the arc's lowest point threads the gap between the dash and the whisper
    var lo = r.bottom + 5, hi = w.top - 4;
    var lowTarget = hi > lo ? lo + (hi - lo) * 0.7 : hi;
    // ...and the loop's top rides just above the headline
    var topTarget = st.top - st.height * 0.08;

    var lowVB = (lowTarget - m.f) / m.d;
    var topVB = (topTarget - m.f) / m.d;

    // stretch vertically to span that band; the photo's crop scale varies a
    // lot with viewport aspect, so a plain translate cannot hold both ends
    var sy = clamp((lowVB - topVB) / swashBox.height, 0.55, 1.9);
    var ty = lowVB - sy * (swashBox.y + swashBox.height);

    swash.setAttribute('transform',
      'translate(0 ' + ty.toFixed(1) + ') scale(1 ' + sy.toFixed(3) + ')');
  }

  /* ----------------------------------------------------------
     3. THE SEQUENCE
     One child speaks. The wire carries it. Only then does the
     sentence appear. Meaning first, words second.
     ---------------------------------------------------------- */

  var timers = [];
  var done   = false;

  function at(ms, fn) { timers.push(setTimeout(fn, ms)); }

  function ripple(node) {
    if (REDUCED || !node.animate) return;
    node.animate(
      [{ transform: 'scale(.55)', opacity: 0 },
       { transform: 'scale(1.15)', opacity: .85, offset: .22 },
       { transform: 'scale(3.6)', opacity: 0 }],
      { duration: 1150, easing: 'cubic-bezier(.2,.7,.2,1)' }
    );
  }

  /* The lit length of wire is rebuilt from the wire itself every frame,
     so it bends with the wire and needs no dash trickery. */
  function litSegment(head) {
    var a = clamp(head, 0, LEN);
    var b = clamp(head + SEG, 0, LEN);
    if (b - a < 0.5) return '';
    var d = '', N = 16, pt;
    for (var i = 0; i <= N; i++) {
      pt = wireLine.getPointAtLength(a + (b - a) * (i / N));
      d += (i ? 'L' : 'M') + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1);
    }
    return d;
  }

  function clearPulse() {
    wirePulse.style.opacity = 0; wireHalo.style.opacity = 0;
    wirePulse.removeAttribute('d'); wireHalo.removeAttribute('d');
  }

  function sendPulse(duration) {
    if (REDUCED) return;
    var t0 = null;
    requestAnimationFrame(function step(now) {
      if (t0 === null) t0 = now;
      var p = clamp((now - t0) / duration, 0, 1);
      // ease in, ease out - the way a sound leaves and lands
      var e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

      // it leaves the girl (the far end) and arrives at the boy (the near end)
      var d = litSegment(LEN * (1 - e) - SEG / 2);
      wirePulse.setAttribute('d', d);
      wireHalo.setAttribute('d', d);

      var fade = p < .1 ? p / .1 : p > .86 ? (1 - p) / .14 : 1;
      wirePulse.style.opacity = fade;
      wireHalo.style.opacity  = fade * .55;

      if (p < 1) requestAnimationFrame(step);
      else clearPulse();
    });
  }

  function show(sel) {
    var n = typeof sel === 'string' ? $(sel) : sel;
    if (n) n.classList.add('is-revealed');
  }

  /* A non-scaling stroke measures its dash pattern in screen pixels, so the
     reveal length has to be measured there too, not in user units. */
  function screenLength(node) {
    var m = node.getScreenCTM();
    if (!m) return node.getTotalLength();
    var L = node.getTotalLength(), N = 48, total = 0, prev = null, p;
    for (var i = 0; i <= N; i++) {
      p = node.getPointAtLength(L * i / N).matrixTransform(m);
      if (prev) total += Math.sqrt((p.x - prev.x) * (p.x - prev.x) + (p.y - prev.y) * (p.y - prev.y));
      prev = p;
    }
    return total || L;
  }

  /* pen-stroke draw-in for the hand-drawn marks */
  function prepDraw(node) {
    if (!node.getTotalLength) return null;
    var scaled = getComputedStyle(node).vectorEffect === 'non-scaling-stroke';
    var len = scaled ? screenLength(node) : node.getTotalLength();
    if (!len) return null;
    node.style.strokeDasharray  = len;
    node.style.strokeDashoffset = len;
    return len;
  }
  function draw(node, duration, delay) {
    var len = prepDraw(node);
    if (len === null) return;
    if (REDUCED) { node.style.strokeDashoffset = 0; return; }
    node.style.transition = 'stroke-dashoffset ' + duration + 'ms cubic-bezier(.3,.7,.25,1) ' + delay + 'ms';
    requestAnimationFrame(function () { node.style.strokeDashoffset = 0; });
  }

  var inkMarks = $$('#swashLine, #swashHead, .dd');
  inkMarks.forEach(prepDraw);

  function finish() {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    timers = [];
    $$('.line, .w').forEach(function (n) { n.classList.add('is-revealed'); });
    show('#rule');
    if (findhow) findhow.classList.add('is-revealed');
    inkMarks.forEach(function (n) {
      n.style.transition = 'stroke-dashoffset 700ms ease';
      n.style.strokeDashoffset = 0;
    });
  }

  function run() {
    document.body.classList.add('is-ready');
    $('#masthead').classList.add('is-in');
    placeSwash();
    window.addEventListener('resize', placeSwash, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeSwash);

    // reduced motion, or the visitor already moved on while the photo loaded
    if (REDUCED || done) { done = false; finish(); return; }

    var TRAVEL = 1400;
    var lines  = $$('.line');
    var whisps = $$('.w');

    /* --- first message --- */
    at(1200, function () { ripple(ringSend); sendPulse(TRAVEL); });
    at(1200 + TRAVEL, function () { ripple(ringRecv); });
    at(1200 + TRAVEL + 150, function () { lines[0].classList.add('is-revealed'); });

    /* --- a small pause, then it travels again --- */
    var second = 1200 + TRAVEL + 150 + 1250;           // ~4000ms
    at(second, function () { ripple(ringSend); sendPulse(TRAVEL); });
    at(second + TRAVEL, function () { ripple(ringRecv); });
    at(second + TRAVEL + 150, function () { lines[1].classList.add('is-revealed'); });

    /* --- and only now, the quiet detail --- */
    var after = second + TRAVEL + 150;                  // ~5550ms
    at(after + 700,  function () { show('#rule'); });
    at(after + 850,  function () { draw($('#swashLine'), 1600, 0); draw($('#swashHead'), 320, 1500); });
    at(after + 950,  function () { whisps[0].classList.add('is-revealed'); });
    at(after + 1160, function () { whisps[1].classList.add('is-revealed'); });
    at(after + 1370, function () { whisps[2].classList.add('is-revealed'); });
    at(after + 1750, function () {
      $$('.dd').forEach(function (n, i) { draw(n, 620, i * 130); });
    });
    at(after + 2050, function () {
      if (findhow) findhow.classList.add('is-revealed');
      timers.push(setTimeout(function () { done = true; }, 1000));
    });
  }

  /* if the visitor is ready before the story is, let them through */
  ['wheel', 'touchmove', 'keydown', 'pointerdown'].forEach(function (ev) {
    window.addEventListener(ev, function once() {
      window.removeEventListener(ev, once);
      finish();
    }, { passive: true, once: true });
  });

  if (photo && !photo.complete) {
    var started = false;
    var go = function () { if (!started) { started = true; run(); } };
    photo.addEventListener('load', go);
    photo.addEventListener('error', go);
    setTimeout(go, 1400);
  } else {
    run();
  }

  /* ----------------------------------------------------------
     4. THE LINGER
     The photograph holds its ground. The words drift up and out.
     ---------------------------------------------------------- */

  if (!REDUCED && runway) {
    var ticking = false;

    var frame = function () {
      ticking = false;
      var span = runway.offsetHeight - window.innerHeight;
      var p = span > 0 ? clamp(window.scrollY / span, 0, 1) : 0;
      var e = p * p * (3 - 2 * p);                       // smoothstep

      var fade = clamp(1 - p * 1.18, 0, 1);
      copy.style.transform = 'translateY(' + (-e * 20).toFixed(2) + 'vh)';
      copy.style.opacity   = fade.toFixed(3);
      // the drawn line belongs to the message, so it leaves with it
      if (swash) swash.style.opacity = fade.toFixed(3);
      media.style.transform = 'translateY(' + (e * 1.6).toFixed(2) + 'vh) scale(' + (1 + e * 0.045).toFixed(4) + ')';

      if (findhow) findhow.style.pointerEvents = p > 0.5 ? 'none' : '';
    };

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }, { passive: true });
    window.addEventListener('resize', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }, { passive: true });
    frame();
  }

  /* ----------------------------------------------------------
     5. THE CARDS
     They arrive; then each bookmark slides into its card.
     ---------------------------------------------------------- */

  var targets = $$('.reveal').concat($$('#deck'));

  if (!('IntersectionObserver' in window) || REDUCED) {
    targets.forEach(function (n) { n.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
          if (en.target.id === 'deck') {
            $$('.cf', en.target).forEach(function (n, i) { draw(n, 700, 500 + i * 60); });
          }
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (n) { io.observe(n); });
  }
})();
