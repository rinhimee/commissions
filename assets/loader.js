/* ==========================================================
   rin姫 loading screen
   - petals fill with real load progress (images, fonts, window load)
   - plays once per browser session (add ?loader to the URL to force it)
   - honours prefers-reduced-motion
   ========================================================== */
(function () {
  var root = document.documentElement;
  var el = document.getElementById('rin-loader');
  if (!el) return;

  var SEEN_KEY = 'rin-loader-seen';

  function finishPage() {
    root.classList.remove('is-loading');
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) {}
  }

  if (root.classList.contains('loader-skip')) {
    el.remove();
    root.classList.remove('is-loading');
    return;
  }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rects = el.querySelectorAll('.rl-flower clipPath rect');
  var pctEl = el.querySelector('.rl-pct');
  var bar = el.querySelector('.rl-load');

  /* ---------- what counts as "loaded" ---------- */
  var total = 0, done = 0, pageLoaded = false;
  function settle() { done++; }
  function track(promise) { total++; promise.then(settle, settle); }

  Array.prototype.forEach.call(document.images, function (img) {
    if (img.complete) return;
    track(new Promise(function (res) {
      img.addEventListener('load', res, { once: true });
      img.addEventListener('error', res, { once: true });
    }));
  });
  if (document.fonts && document.fonts.ready) track(document.fonts.ready);

  if (document.readyState === 'complete') pageLoaded = true;
  else window.addEventListener('load', function () { pageLoaded = true; }, { once: true });

  /* ---------- timing knobs ---------- */
  var MIN_MS = 1400;   // never flash by faster than this
  var MAX_MS = 8000;   // never trap anyone longer than this
  var start = performance.now();
  var shown = 0;

  function target(now) {
    if (pageLoaded || now - start > MAX_MS) return 100;
    var t = total ? (done / total) * 90 : 0;
    // a gentle creep so it never looks frozen while waiting on window.load
    return Math.max(t, Math.min(90, (now - start) / 40));
  }

  function draw(p) {
    for (var i = 0; i < rects.length; i++) {
      // each petal owns 20% and fills base → tip
      var f = Math.max(0, Math.min(1, (p - i * 20) / 20));
      var h = f === 0 ? 0 : 46 * f + 2;
      rects[i].setAttribute('y', -4 - h);
      rects[i].setAttribute('height', h);
    }
    var n = Math.round(p);
    if (pctEl) pctEl.textContent = n + '%';
    if (bar) bar.setAttribute('aria-valuenow', n);
  }

  function frame(now) {
    var cap = Math.min(100, ((now - start) / MIN_MS) * 100);
    var goal = Math.min(target(now), cap);
    shown += (goal - shown) * 0.12;
    if (goal - shown < 0.4) shown = goal;
    draw(shown);
    if (shown >= 100) return finish();
    requestAnimationFrame(frame);
  }

  function setPhase(p) { el.setAttribute('data-phase', p); }

  function finish() {
    if (reduce) {
      setTimeout(function () { setPhase('exit'); finishPage(); }, 150);
      setTimeout(function () { el.remove(); }, 450);
      return;
    }
    setTimeout(function () { setPhase('bloom'); }, 250);
    setTimeout(function () { setPhase('brand'); }, 750);
    setTimeout(function () { setPhase('exit'); finishPage(); }, 3350);
    setTimeout(function () { el.remove(); }, 4150);
  }

  draw(0);
  requestAnimationFrame(frame);
})();
