/* ============================================================
   Navamika Arpan - Section 01
   The page uncovers itself, one line at a time.
   ============================================================ */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  var svg       = $('#wirelayer');
  var media     = $('#media');
  var photo     = $('#photo');
  var copy      = $('.stage__copy');
  var runway    = $('.hero-runway');
  var findhow   = $('#findhow');

  /* ----------------------------------------------------------
     1. THE DRAWN LINE
     It belongs to the photograph - it leaves the boy's face and
     points at the girl's can - so it lives in the image's own
     coordinate space (1536 x 1024). The <svg> shares the photo's
     viewBox and preserveAspectRatio, so it stays locked to the
     picture at every screen size.

     Vertically it also has to thread the gap between the dash and
     the whisper, and that gap moves with the layout. So it is
     shifted - never scaled, or the hand-drawn stroke would warp.
     ---------------------------------------------------------- */

  var swashWrap  = $('#swashWrap');
  var swashShift = $('#swashShift');
  var swashLine  = $('#swashLine');
  var swashTail  = $('#swashTail');
  var ruleEl    = $('#rule');
  var whisperEl = $('.whisper');
  var swashBox  = null;

  function placeSwash() {
    if (!swashShift || !swashLine || !ruleEl || !whisperEl) return;
    var m = svg.getScreenCTM();
    if (!m || !m.d) return;

    // below 900px the line is display:none and getBBox reports nothing;
    // don't cache that, or widening the window would keep the empty box
    if (!swashBox || !swashBox.height) {
      var b = swashLine.getBBox();
      if (!b.height) return;
      swashBox = b;
    }

    var r = ruleEl.getBoundingClientRect();
    var w = whisperEl.getBoundingClientRect();
    var lo = r.bottom + 5, hi = w.top - 4;
    var target = hi > lo ? lo + (hi - lo) * 0.7 : hi;

    var low   = swashBox.y + swashBox.height;    // the arc's lowest point
    var nowY  = m.f + low * m.d;
    var shift = clamp((target - nowY) / m.d, -140, 140);

    swashShift.setAttribute('transform', 'translate(0 ' + shift.toFixed(1) + ')');

    // the tail leaves the shifted line and comes back down onto the wire
    var sy = 396 + shift;
    swashTail.setAttribute('d',
      'M1128 ' + sy.toFixed(1) +
      ' C1162 ' + (sy - 7).toFixed(1) + ' 1164 436 1206 424');
  }

  /* ----------------------------------------------------------
     2. THE SEQUENCE
     Soft clipping masks, one line after another, like a printed
     page being uncovered.
     ---------------------------------------------------------- */

  var timers = [];
  var done   = false;

  function at(ms, fn) { timers.push(setTimeout(fn, ms)); }

  function show(sel) {
    var n = typeof sel === 'string' ? $(sel) : sel;
    if (n) n.classList.add('is-revealed');
  }

  /* A non-scaling stroke measures its dash pattern in screen pixels,
     so the reveal length has to be measured there too. */
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

  var inkMarks = $$('#swashLine, #swashTail, #swashHead, .dd');
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

    var lines  = $$('.line');
    var whisps = $$('.w');

    at(700,  function () { lines[0].classList.add('is-revealed'); });
    at(1600, function () { lines[1].classList.add('is-revealed'); });

    at(2500, function () { show('#rule'); });
    at(2650, function () {
      draw($('#swashLine'), 1500, 0);
      draw($('#swashTail'), 320, 1450);
      draw($('#swashHead'), 260, 1730);
    });
    at(2800, function () { whisps[0].classList.add('is-revealed'); });
    at(3010, function () { whisps[1].classList.add('is-revealed'); });
    at(3220, function () { whisps[2].classList.add('is-revealed'); });
    at(3900, function () {
      $$('.dd').forEach(function (n, i) { draw(n, 620, i * 140); });
    });
    at(4200, function () {
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
     3. THE LINGER
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
      if (swashWrap) swashWrap.style.opacity = fade.toFixed(3);
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
     4. THE CARDS
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
