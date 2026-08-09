/* ============================================================
   harmony guides — app.js
   ------------------------------------------------------------
   Vanilla JS, no build step. Reads:
     config.js        → window.SITE_CONFIG
     data/catalog.js  → window.SONGS, window.LANGUAGES
     data/content.js  → window.PRICE_TIERS, MELODY_OPTIONS,
                        ADDONS, TURNAROUND, FAQS
   ============================================================ */

(function () {
  'use strict';

  /* ---------- shorthands ------------------------------------ */

  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var CFG      = window.SITE_CONFIG   || {};
  var SONGS    = window.SONGS         || [];
  var LANGS    = window.LANGUAGES     || {};
  var TIERS    = window.PRICE_TIERS   || [];
  var MELODY   = window.MELODY_OPTIONS|| [];
  var ADDONS   = window.ADDONS        || [];
  var TAT      = window.TURNAROUND    || {};
  var FAQS     = window.FAQS          || [];

  /* Escape anything that came from a data file before it touches innerHTML. */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function flagOf(code) { return (LANGS[code] && LANGS[code].flag) || '🌐'; }
  function langName(code) { return (LANGS[code] && LANGS[code].name) || String(code).toLowerCase(); }
  function langShort(code) { return (LANGS[code] && LANGS[code].short) || String(code).toUpperCase(); }

  /* "semi-complex" or "semi-complex • 11 tracks" */
  /* flag + short code, e.g.  🇯🇵 JP  — the flag needs its own span so the
     emoji webfont applies to it and only it. */
  /* a song can be in more than one language: "KR, EN" or ["KR","EN"] */
  function langsOf(song) {
    var v = song && song.language;
    if (Array.isArray(v)) return v.filter(Boolean);
    return String(v == null ? '' : v).split(',')
      .map(function (x) { return x.trim(); })
      .filter(Boolean);
  }

  function langChips(song) {
    var codes = langsOf(song);
    if (!codes.length) return '';
    return '<span class="lang-pills">' + codes.map(langChip).join('') + '</span>';
  }

  function langChip(code) {
    return '<span class="lang-pill">' +
             '<span class="flag">' + flagOf(code) + '</span> ' + esc(langShort(code)) +
           '</span>';
  }


  /* ---------- state ----------------------------------------- */

  var state = {
    query: '',
    lang: [],          // [] = no filter; otherwise a list of language codes
    type: [],          // [] = no filter; otherwise 'harmony' / 'arrangement'
    cx:   [],          // [] = no filter; otherwise complexity strings

    modal: null,        // null | 'song' | 'custom'
    song: null,         // the song object when modal === 'song'
    view: 'versions',   // 'versions' | 'form' | 'sent'
    openYt: null,       // key of the expanded youtube embed

    form: {
      song: '', artist: '',
      type: 'harmony',      // 1:1 harmony guide
      melody: 'none',
      addons: [],
      deadline: '', contact: '',
      range: '', budget: '', complexity: '', notes: ''
    },

    sending: false,
    lastFocused: null
  };

  function blankForm() {
    return {
      song: '', artist: '', type: 'harmony', melody: 'none', addons: [],
      deadline: '', contact: '', range: '', budget: '', complexity: '', notes: ''
    };
  }


  /* ============================================================
     BRANDING / LINKS
     ============================================================ */

  function initBranding() {
    if (CFG.brandName) {
      var brand = $('[data-brand]');
      if (brand) brand.textContent = CFG.brandName;
    }

    /* hero art */
    if (CFG.heroImage) {
      var frame = $('[data-hero-frame]');
      if (frame) {
        frame.innerHTML = '';
        frame.classList.add('hero__frame--has-img');
        var img = document.createElement('img');
        img.src = CFG.heroImage;
        img.alt = CFG.heroImageAlt || '';
        frame.appendChild(img);
      }
    }

    /* social buttons — only render the ones with a URL set */
    var socials = $('#socials');
    var links = CFG.links || {};
    var defs = [
      { key: 'youtube', label: '▶ youtube' },
      { key: 'twitter', label: '✦ twitter' }
    ];
    /* Always render these. An unset link shows a dimmed, dashed, non-clickable
       button so it's obvious the slot exists and just needs a URL. */
    if (socials) {
      socials.innerHTML = defs.map(function (d) {
        var arrow = '<span class="social__ext" aria-hidden="true">↗</span>';
        if (links[d.key]) {
          return '<a class="social" href="' + esc(links[d.key]) +
                 '" target="_blank" rel="noopener noreferrer">' + d.label + arrow + '</a>';
        }
        return '<span class="social social--unset" aria-disabled="true" ' +
               'title="add links.' + esc(d.key) + ' in config.js">' + d.label + arrow + '</span>';
      }).join('');
    }

    var playlist = $('#playlist-link');
    if (playlist) {
      playlist.hidden = false;
      if (links.playlist) {
        playlist.href = links.playlist;
        playlist.target = '_blank';
        playlist.rel = 'noopener noreferrer';
        playlist.classList.remove('is-unset');
        playlist.removeAttribute('title');
      } else {
        /* no href = not clickable, not focusable */
        playlist.removeAttribute('href');
        playlist.classList.add('is-unset');
        playlist.title = 'add links.playlist in config.js';
      }
    }
  }


  /* ============================================================
     STATIC-ISH SECTIONS (pricing, melody, add-ons, faq)
     ============================================================ */

  function renderPricing() {
    var grid = $('#price-grid');
    if (grid) {
      grid.innerHTML = TIERS.map(function (t) {
        return '' +
          '<div class="price-card price-card--' + esc(t.tone || 'rose') + '">' +
            '<div class="kicker price-card__kicker">' + esc(t.kicker) + '</div>' +
            '<div class="price-card__price">' + esc(t.price) + '</div>' +
            '<p>' + esc(t.desc) + '</p>' +
          '</div>';
      }).join('');
    }

    var melody = $('#melody-grid');
    if (melody) {
      melody.innerHTML = MELODY.map(function (m) {
        return '' +
          '<div class="melody-card">' +
            '<div class="melody-card__head">' +
              '<span class="melody-card__label">' + esc(m.label) + '</span>' +
              '<span class="melody-card__price">' + esc(m.price) + '</span>' +
            '</div>' +
            '<p>' + esc(m.desc) + '</p>' +
          '</div>';
      }).join('');
    }

    var addons = $('#addon-list');
    if (addons) {
      addons.innerHTML = ADDONS.map(function (a) {
        return '' +
          '<div class="addon-row">' +
            '<div>' +
              '<div class="addon-row__label">' + esc(a.label) + '</div>' +
              '<div class="addon-row__desc">' + esc(a.desc) + '</div>' +
            '</div>' +
            '<span class="addon-row__price">' + esc(a.price) + '</span>' +
          '</div>';
      }).join('');
    }
  }

  function renderFaq() {
    var list = $('#faq-list');
    if (!list) return;

    list.innerHTML = FAQS.map(function (f, i) {
      return '' +
        '<div class="faq__item">' +
          '<button class="faq__q" type="button" aria-expanded="false" aria-controls="faq-a-' + i + '">' +
            '<span class="faq__q-text">' + esc(f.q) + '</span>' +
            '<span class="faq__icon" aria-hidden="true"></span>' +
          '</button>' +
          '<div class="faq__a-wrap" id="faq-a-' + i + '">' +
            '<div class="faq__a-clip">' +
              '<div class="faq__a">' + esc(f.a) + '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    }).join('');

    $$('.faq__q', list).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var isOpen = btn.getAttribute('aria-expanded') === 'true';
        /* accordion: close everything, then open the clicked one.
           Open state lives on .faq__item as a class so CSS can animate it —
           `hidden` would snap instead of transition. */
        $$('.faq__q', list).forEach(function (b) {
          b.setAttribute('aria-expanded', 'false');
          b.parentNode.classList.remove('is-open');
        });
        if (!isOpen) {
          btn.setAttribute('aria-expanded', 'true');
          btn.parentNode.classList.add('is-open');
        }
      });
    });
  }


  /* ============================================================
     CATALOG
     ============================================================ */

  /* ---------- filter dropdowns -------------------------------
     Custom multi-select dropdowns rather than native <select>s:
     native selects can't do checkboxes, can't be styled on Windows,
     and render their popup as a detached grey rectangle.           */

  /* every entry a song has, flattened, so the type and complexity filters can
     be reasoned about together */
  function entriesOf(song) {
    var out = [];
    if (song.harmony) out.push({ kind: 'harmony', cx: song.harmony.complexity });
    (song.arrangements || []).forEach(function (a) {
      out.push({ kind: 'arrangement', cx: a.complexity });
    });
    return out;
  }

  function cxClass(c) {
    return String(c || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  var DD = {
    lang: { allLabel: 'all languages', noun: 'languages', options: [] },
    cx:   { allLabel: 'all complexities', noun: 'complexities', options: [] },
    type: {
      allLabel: 'all guide types', noun: 'guide types',
      options: [
        { value: 'harmony',     text: 'harmony guide' },
        { value: 'arrangement', text: 'vocal arrangement' }
      ]
    }
  };

  function initFilters() {
    var present = [];
    SONGS.forEach(function (s) {
      langsOf(s).forEach(function (code) {
        if (present.indexOf(code) === -1) present.push(code);
      });
    });
    DD.lang.options = present.map(function (code) {
      return { value: code, text: langName(code), chip: langChip(code) };
    });

    /* complexity options come from the data, in the order they first appear
       when sorted simple -> complex where we can tell */
    var order = ['simple', 'semi-complex', 'complex'];
    var found = [];
    SONGS.forEach(function (s) {
      entriesOf(s).forEach(function (e) {
        if (e.cx && found.indexOf(e.cx) === -1) found.push(e.cx);
      });
    });
    found.sort(function (a, b) {
      var ia = order.indexOf(a), ib = order.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    DD.cx.options = found.map(function (c) { return { value: c, text: c }; });

    renderDropdown('lang');
    renderDropdown('cx');
    renderDropdown('type');
  }


  function renderDropdown(key) {
    var def   = DD[key];
    var wrap  = $('.dd[data-dd="' + key + '"]');
    var panel = $('#dd-' + key + '-panel');
    if (!def || !wrap || !panel) return;

    var sel = state[key];

    panel.innerHTML = def.options.map(function (o) {
      var on = sel.indexOf(o.value) !== -1;
      return '<button class="dd__opt' + (on ? ' is-on' : '') + '" type="button" role="option" ' +
             'aria-selected="' + on + '" data-dd-val="' + esc(o.value) + '">' +
               '<span class="dd__check" aria-hidden="true"></span>' +
               '<span class="dd__opt-text">' + (o.chip || esc(o.text)) + '</span>' +
             '</button>';
    }).join('');

    var label = $('[data-dd-label]', wrap);
    if (label) {
      if (!sel.length) {
        label.textContent = def.allLabel;
      } else if (sel.length === 1) {
        var one = def.options.filter(function (o) { return o.value === sel[0]; })[0];
        if (one) {
          label.innerHTML = one.chip || esc(one.text);
        } else {
          label.textContent = def.allLabel;
        }
      } else {
        label.textContent = sel.length + ' ' + def.noun;
      }
    }
    wrap.classList.toggle('has-value', sel.length > 0);
  }

  function closeDropdowns() {
    $$('.dd').forEach(function (wrap) {
      wrap.classList.remove('is-open');
      var t = $('.dd__trigger', wrap); if (t) t.setAttribute('aria-expanded', 'false');
      var pn = $('.dd__panel', wrap);  if (pn) pn.hidden = true;
    });
  }

  function openDropdown(wrap) {
    closeDropdowns();
    wrap.classList.add('is-open');
    var t = $('.dd__trigger', wrap); if (t) t.setAttribute('aria-expanded', 'true');
    var pn = $('.dd__panel', wrap);  if (pn) pn.hidden = false;

    /* the panel's top-right corner may only be rounded when it actually
       overhangs the trigger, otherwise the curve notches the right stroke */
    if (t && pn) {
      var over = pn.getBoundingClientRect().width - t.getBoundingClientRect().width;
      wrap.classList.toggle('is-wide', over > 1);
    }
  }

  function anyDropdownOpen() { return !!$('.dd.is-open'); }

  function matches(song) {
    var q = state.query.trim().toLowerCase();
    if (q && (song.title + ' ' + song.artist).toLowerCase().indexOf(q) === -1) return false;
    if (state.lang.length) {
      var songLangs = langsOf(song);
      var langHit = state.lang.some(function (c) { return songLangs.indexOf(c) !== -1; });
      if (!langHit) return false;
    }

    /* Type and complexity are checked against the SAME entry, so
       "harmony guide" + "complex" means a song with a complex harmony guide —
       not a song with a simple harmony and a complex arrangement. */
    var ents = entriesOf(song);
    if (state.type.length) {
      ents = ents.filter(function (e) { return state.type.indexOf(e.kind) !== -1; });
      if (!ents.length) return false;
    }
    if (state.cx.length) {
      if (!ents.some(function (e) { return state.cx.indexOf(e.cx) !== -1; })) return false;
    }
    return true;
  }

  function renderCatalog() {
    var list = $('#song-list');
    var count = $('#count');
    var reset = $('#reset-filters');
    if (!list) return;

    var visible = SONGS.filter(matches);

    if (count) {
      count.textContent = visible.length + (visible.length === 1 ? ' song' : ' songs');
    }
    if (reset) {
      reset.hidden = (state.query === '' && !state.lang.length &&
                      !state.type.length && !state.cx.length);
    }

    if (!visible.length) {
      list.innerHTML = '<div class="empty">nothing matching that yet &#9825;</div>';
      return;
    }

    list.innerHTML = visible.map(function (song) {
      var comps = [];
      if (song.harmony) comps.push(song.harmony.complexity);
      (song.arrangements || []).forEach(function (a) {
        if (comps.indexOf(a.complexity) === -1) comps.push(a.complexity);
      });

      var n = (song.arrangements || []).length;
      var hasYt = (song.arrangements || []).some(function (a) { return a.yt; });

      return '' +
        '<button class="song" type="button" data-song-id="' + esc(song.id) + '">' +
          '<span class="song__main">' +
            '<span class="song__line">' +
              '<span class="song__title">' + esc(song.title) + '</span>' +
              '<span class="song__artist">' + esc(song.artist) + '</span>' +
              langChips(song) +
            '</span>' +
            '<span class="song__tags">' +
              (song.harmony ? '<span class="tag tag--harmony">harmony guide</span>' : '') +
              (n ? '<span class="tag tag--arr">' + (n > 1 ? n + ' vocal arrangements' : 'vocal arrangement') + '</span>' : '') +
              comps.map(function (c) {
                return '<span class="tag tag--cx tag--cx-' + cxClass(c) + '">' + esc(c) + '</span>';
              }).join('') +
            '</span>' +
          '</span>' +
          '<span class="song__right">' +
            (hasYt ? '<span class="song__yt">▶ on yt</span>' : '') +
            '<span class="song__chev" aria-hidden="true">&rsaquo;</span>' +
          '</span>' +
        '</button>';
    }).join('');
  }


  /* ============================================================
     MODAL
     ============================================================ */

  function versionsOf(song) {
    var out = [];
    if (song.harmony) {
      out.push({
        key: 'h',
        label: song.harmony.label || 'Harmony Guide (1:1)',
        cx: song.harmony.complexity,
        tracks: song.harmony.tracks || 0,
        client: song.harmony.client || null,
        yt: null,
        audio: song.harmony.audio || null
      });
    }
    (song.arrangements || []).forEach(function (a, i) {
      out.push({
        key: 'a' + i,
        label: a.label || 'Vocal Arrangement (Omakase)',
        cx: a.complexity,
        tracks: a.tracks || 0,
        client: a.client || null,
        yt: a.yt || null,
        audio: a.audio || null
      });
    });
    return out;
  }

  function openSong(song) {
    state.modal = 'song';
    state.song  = song;
    state.view  = 'versions';
    /* open the first youtube preview straight away */
    var withYt = versionsOf(song).filter(function (v) { return v.yt; })[0];
    state.openYt = withYt ? withYt.key : null;
    state.form = blankForm();
    state.form.song = song.title;
    state.form.artist = song.artist;
    /* always start on the 1:1 harmony guide, even when the only thing on hand
       for this song is an arrangement — people can switch if they want one */
    state.form.type = 'harmony';
    showModal();
  }

  function openCustom() {
    state.modal = 'custom';
    state.song = null;
    state.view = 'form';
    state.openYt = null;
    state.form = blankForm();
    showModal();
  }

  function showModal() {
    state.lastFocused = document.activeElement;
    $('#modal-backdrop').hidden = false;
    document.body.classList.add('modal-open');
    renderModal();
    var focusTarget = $('#modal-backdrop .modal__close');
    if (focusTarget) focusTarget.focus();
  }

  function closeModal() {
    stopAudio();
    $('#modal-backdrop').hidden = true;
    document.body.classList.remove('modal-open');
    state.modal = null;
    state.view = 'versions';
    state.sending = false;
    if (state.lastFocused && state.lastFocused.focus) state.lastFocused.focus();
  }

  function turnaround() {
    if (state.song) return TAT.catalog;
    if (state.form.type === 'arrangement') return TAT.arrangement;
    return TAT.harmony;
  }

  function renderModal() {
    var song = state.song;

    /* --- header --- */
    var kicker = $('#modal-kicker');
    kicker.textContent = state.modal === 'custom' ? '✦ custom request' : '';
    kicker.hidden = state.modal !== 'custom';

    var langLine = $('#modal-lang');
    if (langLine) {
      if (song) { langLine.innerHTML = langChips(song); langLine.hidden = false; }
      else { langLine.innerHTML = ''; langLine.hidden = true; }
    }
    $('#modal-title').textContent = state.modal === 'custom'
      ? 'request a song'
      : (song ? song.title : '');
    $('#modal-sub').textContent = state.modal === 'custom'
      ? "not in the catalog — tell me what you need and i'll quote it."
      : (song ? song.artist : '');

    /* --- which view --- */
    $('#view-versions').hidden = !(state.modal === 'song' && state.view === 'versions');
    $('#view-form').hidden     = state.view !== 'form';
    $('#view-sent').hidden     = state.view !== 'sent';

    if (state.modal === 'song' && state.view === 'versions') renderVersions();
    if (state.view === 'form') renderForm();
  }

  /* ---------- inline audio preview ---------------------------
     One shared Audio object; only one preview plays at a time.    */

  var audioEl  = null;
  var audioSrc = null;
  var pendingSeek = null;   // scrub target set before metadata arrived
  var volume = 1;           // shared by every preview, survives re-renders
  var muted  = false;

  var ICON_SPK = '<svg viewBox="0 0 18 16" width="14" height="13" aria-hidden="true">' +
      '<path d="M8 1.5 4.2 4.8H1.6v6.4h2.6L8 14.5z" fill="currentColor"/>' +
      '<path d="M11 5.4a3.4 3.4 0 0 1 0 5.2" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M13.4 3.2a6.6 6.6 0 0 1 0 9.6" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>';
  var ICON_MUTE = '<svg viewBox="0 0 18 16" width="14" height="13" aria-hidden="true">' +
      '<path d="M8 1.5 4.2 4.8H1.6v6.4h2.6L8 14.5z" fill="currentColor"/>' +
      '<path d="M11.4 5.6 15.8 10.4M15.8 5.6 11.4 10.4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>';

  function paintVolume(box) {
    var v = muted ? 0 : volume;
    var btn  = $('[data-aplay-mute]', box);
    var fill = $('[data-aplay-volfill]', box);
    if (fill) fill.style.width = (v * 100) + '%';
    if (btn) {
      btn.innerHTML = v === 0 ? ICON_MUTE : ICON_SPK;
      btn.setAttribute('aria-label', v === 0 ? 'unmute' : 'mute');
    }
    box.classList.toggle('is-muted', v === 0);
  }

  function applyVolume() {
    if (audioEl) audioEl.volume = muted ? 0 : volume;
    $$('.aplay').forEach(paintVolume);
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    muted  = (volume === 0);
    applyVolume();
  }

  function fmtTime(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var m = Math.floor(t / 60), sec = Math.floor(t % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function resetAudioUI() {
    $$('.aplay').forEach(function (box) {
      var b = $('[data-aplay-toggle]', box);
      var f = $('[data-aplay-fill]', box);
      var k = $('[data-aplay-knob]', box);
      var t = $('[data-aplay-time]', box);
      box.classList.remove('is-playing');
      if (b) { b.innerHTML = '&#9654;'; b.setAttribute('aria-label', 'play preview'); }
      if (f) f.style.width = '0%';
      if (k) k.style.left = '0%';
      if (t) t.textContent = '0:00';
    });
  }

  function stopAudio() {
    if (audioEl) { try { audioEl.pause(); } catch (err) {} }
    audioEl = null;
    audioSrc = null;
    pendingSeek = null;
    resetAudioUI();
  }

  function paintAudio() {
    if (!audioEl || !audioSrc) return;
    var box = $('.aplay[data-aplay="' + audioSrc + '"]');
    if (!box) return;
    var d = audioEl.duration, c = audioEl.currentTime;
    var f = $('[data-aplay-fill]', box);
    var k = $('[data-aplay-knob]', box);
    var t = $('[data-aplay-time]', box);
    var pct = (isFinite(d) && d > 0 ? (c / d) * 100 : 0);
    if (f) f.style.width = pct + '%';
    if (k) k.style.left = pct + '%';
    if (t) t.textContent = fmtTime(c) + (isFinite(d) && d > 0 ? ' / ' + fmtTime(d) : '');
    box.classList.toggle('is-playing', !audioEl.paused);
  }

  /* Load (but don't start) the track for a player. Splitting this out is what
     lets you scrub before pressing play — previously the seek handler bailed
     out because no Audio object existed yet. */
  function ensureAudio(box) {
    var src = box.getAttribute('data-aplay');
    if (audioEl && audioSrc === src) return audioEl;

    stopAudio();
    box.classList.remove('is-missing');
    audioSrc = src;
    audioEl  = new Audio(src);
    audioEl.preload = 'metadata';
    audioEl.volume  = muted ? 0 : volume;

    audioEl.addEventListener('timeupdate', paintAudio);
    audioEl.addEventListener('loadedmetadata', function () {
      if (pendingSeek != null && isFinite(audioEl.duration) && audioEl.duration > 0) {
        audioEl.currentTime = pendingSeek * audioEl.duration;
        pendingSeek = null;
      }
      paintAudio();
    });
    audioEl.addEventListener('ended', stopAudio);
    audioEl.addEventListener('error', function () {
      stopAudio();
      box.classList.add('is-missing');
      var t = $('[data-aplay-time]', box);
      if (t) t.textContent = 'file not found';
    });
    return audioEl;
  }

  /* Scrub to a fraction of the track. Works whether or not it's playing, and
     whether or not the duration is known yet. */
  function seekAudio(box, frac) {
    var a = ensureAudio(box);
    frac = Math.max(0, Math.min(1, frac));

    if (isFinite(a.duration) && a.duration > 0) {
      a.currentTime = frac * a.duration;
      paintAudio();
      return;
    }
    /* metadata hasn't landed — remember it and move the UI now anyway */
    pendingSeek = frac;
    var f = $('[data-aplay-fill]', box);
    var k = $('[data-aplay-knob]', box);
    if (f) f.style.width = frac * 100 + '%';
    if (k) k.style.left  = frac * 100 + '%';
  }

  function toggleAudio(box) {
    var src = box.getAttribute('data-aplay');
    var btn = $('[data-aplay-toggle]', box);

    /* already loaded: just play/pause */
    if (audioSrc === src && audioEl) {
      if (audioEl.paused) {
        var r = audioEl.play(); if (r && r.catch) r.catch(function () {});
        box.classList.add('is-playing');
        if (btn) { btn.innerHTML = '&#10074;&#10074;'; btn.setAttribute('aria-label', 'pause preview'); }
      } else {
        audioEl.pause();
        box.classList.remove('is-playing');   /* timeupdate stops firing, so set it here */
        if (btn) { btn.innerHTML = '&#9654;'; btn.setAttribute('aria-label', 'play preview'); }
      }
      return;
    }

    ensureAudio(box);
    var pr = audioEl.play();
    if (pr && pr.catch) pr.catch(function () {});
    box.classList.add('is-playing');
    if (btn) { btn.innerHTML = '&#10074;&#10074;'; btn.setAttribute('aria-label', 'pause preview'); }
  }

  function renderVersions() {
    stopAudio();               /* the old player nodes are about to be replaced */
    var wrap = $('#version-list');
    var list = versionsOf(state.song);

    wrap.innerHTML = list.map(function (v) {
      var open = state.openYt === v.key;
      return '' +
        '<div class="version">' +
          '<div class="version__row">' +
            '<div class="version__main">' +
              '<div class="version__label">' + esc(v.label) + '</div>' +
              '<div class="version__meta">' +
                '<span class="version__cx version__cx--' + cxClass(v.cx) + '">' + esc(v.cx) + '</span>' +
                (v.tracks ? '<span class="version__tracks">' + esc(v.tracks) + ' tracks</span>' : '') +
              '</div>' +
              (v.client ? '<div class="version__client">for ' + esc(v.client) + '</div>' : '') +
            '</div>' +
            (v.yt
              ? '<button class="version__yt-btn" type="button" data-yt="' + esc(v.key) + '" aria-expanded="' + open + '">' +
                  '<span>yt</span><span style="font-size:10px;">' + (open ? '▲' : '▼') + '</span>' +
                '</button>'
              : '') +
          '</div>' +
          (v.audio
            ? '<div class="version__audio">' +
                '<div class="aplay" data-aplay="' + esc(v.audio) + '">' +
                  '<button class="aplay__btn" type="button" data-aplay-toggle ' +
                          'aria-label="play preview">&#9654;</button>' +
                  '<div class="aplay__bar" data-aplay-bar>' +
                    '<div class="aplay__fill" data-aplay-fill></div>' +
                    '<div class="aplay__knob" data-aplay-knob></div>' +
                  '</div>' +
                  '<span class="aplay__time" data-aplay-time>0:00</span>' +
                  '<div class="aplay__vol">' +
                    '<button class="aplay__volbtn" type="button" data-aplay-mute aria-label="mute"></button>' +
                    '<div class="aplay__volbar" data-aplay-volbar>' +
                      '<div class="aplay__volfill" data-aplay-volfill></div>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</div>'
            : '') +
          (v.yt
            ? '<div class="version__embed"' + (open ? '' : ' hidden') + '>' +
                (open
                  ? '<iframe src="https://www.youtube-nocookie.com/embed/' + esc(v.yt) + '" ' +
                    'title="youtube preview of ' + esc(v.label) + '" loading="lazy" ' +
                    'allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture" ' +
                    'allowfullscreen></iframe>'
                  : '') +
              '</div>'
            : '') +
        '</div>';
    }).join('');

    $$('.aplay', wrap).forEach(paintVolume);
  }

  /* ---------- the request form ------------------------------ */

  function pillClass(on, tone) {
    if (!on) return 'pill-btn';
    return 'pill-btn is-on' + (tone === 'teal' ? ' is-on--teal' : '');
  }

  function renderForm() {
    var f = state.form;

    /* song / artist fields only for custom requests */
    $('#custom-fields').hidden = state.modal !== 'custom';
    $('#f-song').value    = f.song;
    $('#f-artist').value  = f.artist;
    $('#f-deadline').value = f.deadline;
    $('#f-contact').value = f.contact;
    $('#f-range').value   = f.range;
    $('#f-budget').value  = f.budget;
    $('#f-notes').value   = f.notes;

    /* guide type */
    $('#type-row').innerHTML = [
      { value: 'harmony',     label: '1:1 harmony guide' },
      { value: 'arrangement', label: 'vocal arrangement' }
    ].map(function (o) {
      return '<button class="' + pillClass(f.type === o.value) + '" type="button" ' +
             'data-set="type" data-value="' + o.value + '" aria-pressed="' + (f.type === o.value) + '">' +
             esc(o.label) + '</button>';
    }).join('');

    /* melody guide */
    $('#melody-row').innerHTML = MELODY.map(function (o) {
      return '<button class="' + pillClass(f.melody === o.value) + '" type="button" ' +
             'data-set="melody" data-value="' + esc(o.value) + '" aria-pressed="' + (f.melody === o.value) + '">' +
             esc(o.label) + '  ' + esc(o.price) + '</button>';
    }).join('');
    $('#melody-warn').hidden = f.melody !== 'partial';

    /* add-ons */
    $('#addon-row').innerHTML = ADDONS.map(function (a) {
      var on = f.addons.indexOf(a.key) !== -1;
      return '' +
        '<button class="addon-btn' + (on ? ' is-on' : '') + '" type="button" ' +
        'data-addon="' + esc(a.key) + '" aria-pressed="' + on + '">' +
          '<span>' +
            '<span class="addon-btn__label">' + esc(a.label) + '</span>' +
            '<span class="addon-btn__desc">' + esc(a.desc) + '</span>' +
          '</span>' +
          '<span class="addon-btn__price">' + esc(a.price) + '</span>' +
        '</button>';
    }).join('');

    /* turnaround note */
    $('#tat-note').textContent = turnaround();

    /* arrangement-only block */
    var isArr = f.type === 'arrangement';
    $('#arr-only').hidden = !isArr;
    $('#complexity-row').innerHTML = [
      { value: 'simple',       label: 'simple' },
      { value: 'semi',         label: 'semi-complex' },
      { value: 'complex',      label: 'complex' }
    ].map(function (o) {
      return '<button class="' + pillClass(f.complexity === o.value) + '" type="button" ' +
             'data-set="complexity" data-value="' + o.value + '" aria-pressed="' + (f.complexity === o.value) + '">' +
             esc(o.label) + '</button>';
    }).join('');

    /* submit button state */
    var btn = $('#submit-btn');
    btn.disabled = state.sending;
    btn.innerHTML = state.sending
      ? '<span class="spinner" aria-hidden="true"></span>sending&hellip;'
      : 'send request ♡';
  }


  /* ============================================================
     SUBMIT
     ============================================================ */

  function summaryLines() {
    var f = state.form;
    var melodyLabel = (MELODY.filter(function (m) { return m.value === f.melody; })[0] || {}).label || f.melody;
    var addonLabels = f.addons.map(function (k) {
      var a = ADDONS.filter(function (x) { return x.key === k; })[0];
      return a ? a.label + ' (' + a.price + ')' : k;
    });

    var lines = [
      'song:        ' + (f.song || '—'),
      'artist:      ' + (f.artist || '—'),
      'guide type:  ' + (f.type === 'harmony' ? '1:1 harmony guide' : 'vocal arrangement'),
      'melody:      ' + melodyLabel,
      'add-ons:     ' + (addonLabels.length ? addonLabels.join(', ') : 'none'),
      'deadline:    ' + (f.deadline || 'flexible'),
      'contact:     ' + (f.contact || '—'),
      'in catalog:  ' + (state.song ? 'yes' : 'no')
    ];

    if (f.type === 'arrangement') {
      lines.push('range:       ' + (f.range || '—'));
      lines.push('budget:      ' + (f.budget || '—'));
      lines.push('complexity:  ' + (f.complexity || 'let me pitch'));
      if (f.notes) lines.push('notes:       ' + f.notes);
    }
    return lines.join('\n');
  }

  function discordPayload() {
    var f = state.form;
    var melodyOpt = MELODY.filter(function (m) { return m.value === f.melody; })[0] || {};
    var addonLabels = f.addons.map(function (k) {
      var a = ADDONS.filter(function (x) { return x.key === k; })[0];
      return a ? '• ' + a.label + ' (' + a.price + ')' : '• ' + k;
    });

    var fields = [
      { name: 'guide type', value: f.type === 'harmony' ? '1:1 harmony guide' : 'vocal arrangement', inline: true },
      { name: 'in catalog', value: state.song ? 'yes — discounted' : 'no — new request', inline: true },
      { name: 'melody guide', value: (melodyOpt.label || f.melody) + ' (' + (melodyOpt.price || '') + ')', inline: true },
      { name: 'deadline', value: f.deadline || 'flexible', inline: true },
      { name: 'contact', value: f.contact || '—', inline: true },
      { name: 'add-ons', value: addonLabels.length ? addonLabels.join('\n') : 'none', inline: false }
    ];

    if (f.type === 'arrangement') {
      fields.push({ name: 'vocal range', value: f.range || 'not given', inline: true });
      fields.push({ name: 'budget', value: f.budget || 'not given', inline: true });
      fields.push({ name: 'complexity', value: f.complexity || 'let me pitch directions', inline: true });
      if (f.notes) fields.push({ name: 'notes', value: f.notes.slice(0, 1020), inline: false });
    }

    var payload = {
      embeds: [{
        title: (f.song || 'untitled') + ' — ' + (f.artist || 'unknown artist'),
        description: 'new commission request from the site',
        color: 0xA8455F,
        fields: fields,
        footer: { text: (CFG.brandName || 'harmony guides') + ' · request form' },
        timestamp: new Date().toISOString()
      }]
    };

    if (CFG.discordPingUserId) {
      payload.content = '<@' + CFG.discordPingUserId + '> new request';
      payload.allowed_mentions = { users: [CFG.discordPingUserId] };
    }

    return payload;
  }

  function showError(msg) {
    var box = $('#form-error');
    box.textContent = msg;
    box.hidden = false;
  }

  function clearError() { $('#form-error').hidden = true; }

  function goSent(usedWebhook) {
    state.view = 'sent';
    var f = state.form;

    if (usedWebhook) {
      $('#sent-title').innerHTML = 'request sent ♡';
      $('#sent-note').textContent =
        "i'll reach out at " + (f.contact || 'your contact') +
        ' with a quote and timeline, usually within a day.';
      $('#sent-summary').hidden = true;
      $('#copy-summary').hidden = true;
    } else {
      $('#sent-title').innerHTML = 'almost there ♡';
      $('#sent-note').textContent =
        'copy the summary below and send it to ' + (CFG.contactHandle || 'me') +
        " — i'll reply with a quote and timeline.";
      $('#sent-summary').textContent = summaryLines();
      $('#sent-summary').hidden = false;
      $('#copy-summary').hidden = false;
      $('#copy-summary').textContent = 'copy the summary';
    }

    renderModal();
    $('#view-sent').scrollIntoView({ block: 'nearest' });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (state.sending) return;
    clearError();

    /* honeypot — a bot filled the field humans can't see */
    if ($('#f-website').value) { goSent(true); return; }

    var f = state.form;

    if (state.modal === 'custom' && !f.song.trim()) {
      showError('what song is it? add a title so i know what to quote.');
      $('#f-song').setAttribute('aria-invalid', 'true');
      $('#f-song').focus();
      return;
    }
    $('#f-song').removeAttribute('aria-invalid');

    if (!f.contact.trim()) {
      showError('i need a discord handle or email to send the quote to.');
      $('#f-contact').setAttribute('aria-invalid', 'true');
      $('#f-contact').focus();
      return;
    }
    $('#f-contact').removeAttribute('aria-invalid');

    var url = CFG.discordWebhookUrl;
    if (!url) { goSent(false); return; }

    state.sending = true;
    renderForm();

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload())
    })
      .then(function (res) {
        if (!res.ok) throw new Error('discord responded ' + res.status);
        state.sending = false;
        goSent(true);
      })
      .catch(function (err) {
        state.sending = false;
        renderForm();
        showError("couldn't send that automatically — copy the summary below and send it over instead.");
        goSent(false);
        if (window.console) console.warn('[harmony guides] webhook failed:', err);
      });
  }


  /* ============================================================
     EVENTS
     ============================================================ */

  function bindEvents() {

    /* --- search + filters --- */
    var search = $('#search');
    if (search) {
      search.addEventListener('input', function (e) {
        state.query = e.target.value;
        renderCatalog();
      });
    }
    /* --- filter dropdowns --- */
    $$('.dd').forEach(function (wrap) {
      var key     = wrap.getAttribute('data-dd');
      var trigger = $('.dd__trigger', wrap);
      var panel   = $('.dd__panel', wrap);
      if (!key || !trigger || !panel) return;

      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        if (wrap.classList.contains('is-open')) closeDropdowns();
        else openDropdown(wrap);
      });

      trigger.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'Down') {
          e.preventDefault();
          openDropdown(wrap);
          var first = $('.dd__opt', panel);
          if (first) first.focus();
        }
      });

      /* toggling an option keeps the panel open — it's multi-select */
      panel.addEventListener('click', function (e) {
        var opt = e.target.closest('.dd__opt');
        if (!opt) return;
        /* Must stop here. Re-rendering below detaches this button, and a
           detached node's .closest('.dd') is null — so the document-level
           outside-click handler would think the click landed outside and
           slam the panel shut on every pick. */
        e.stopPropagation();
        var val = opt.getAttribute('data-dd-val');
        var arr = state[key];
        var at  = arr.indexOf(val);
        if (at === -1) arr.push(val); else arr.splice(at, 1);

        var pos = $$('.dd__opt', panel).indexOf(opt);
        renderDropdown(key);
        renderCatalog();
        var again = $$('.dd__opt', panel)[pos];
        if (again) again.focus();
      });

      panel.addEventListener('keydown', function (e) {
        var opts = $$('.dd__opt', panel);
        var i = opts.indexOf(document.activeElement);
        if (e.key === 'ArrowDown' || e.key === 'Down') {
          e.preventDefault(); (opts[i + 1] || opts[0]).focus();
        } else if (e.key === 'ArrowUp' || e.key === 'Up') {
          e.preventDefault(); (opts[i - 1] || opts[opts.length - 1]).focus();
        } else if (e.key === 'Escape' || e.key === 'Esc') {
          e.preventDefault(); closeDropdowns(); trigger.focus();
        }
      });
    });

    /* click anywhere else closes an open dropdown */
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.dd')) closeDropdowns();
    });

    var reset = $('#reset-filters');
    if (reset) {
      reset.addEventListener('click', function () {
        state.query = '';
        state.lang = [];
        state.type = [];
        state.cx   = [];
        if (search) search.value = '';
        closeDropdowns();
        renderDropdown('lang');
        renderDropdown('cx');
        renderDropdown('type');
        renderCatalog();
        if (search) search.focus();
      });
    }

    /* --- catalog rows (delegated) --- */
    var list = $('#song-list');
    if (list) {
      list.addEventListener('click', function (e) {
        var row = e.target.closest('[data-song-id]');
        if (!row) return;
        var id = row.getAttribute('data-song-id');
        var song = SONGS.filter(function (s) { return String(s.id) === id; })[0];
        if (song) openSong(song);
      });
    }

    /* --- open custom request --- */
    $$('[data-open-custom]').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.preventDefault(); openCustom(); });
    });

    /* --- modal chrome --- */
    var backdrop = $('#modal-backdrop');
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) closeModal();
      if (e.target.closest('[data-close]')) closeModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && anyDropdownOpen()) { closeDropdowns(); return; }
      if (e.key === 'Escape' && !backdrop.hidden) { closeModal(); return; }
      if (e.key === 'Tab' && !backdrop.hidden) trapFocus(e);
    });

    /* --- versions view --- */
    $('#version-list').addEventListener('click', function (e) {
      /* audio: play / pause */
      var play = e.target.closest('[data-aplay-toggle]');
      if (play) { toggleAudio(play.closest('.aplay')); return; }

      /* audio: mute toggle */
      var mute = e.target.closest('[data-aplay-mute]');
      if (mute) {
        muted = !muted;
        if (!muted && volume === 0) volume = 1;   // unmuting from zero
        applyVolume();
        return;
      }

      /* scrubbing and volume are handled on pointerdown below, so they drag */
      if (e.target.closest('[data-aplay-bar]') || e.target.closest('[data-aplay-volbar]')) return;

      var btn = e.target.closest('[data-yt]');
      if (!btn) return;
      var key = btn.getAttribute('data-yt');
      state.openYt = state.openYt === key ? null : key;
      renderVersions();
    });

    /* press-and-drag scrubbing */
    $('#version-list').addEventListener('pointerdown', function (e) {
      var vol = e.target.closest('[data-aplay-volbar]');
      var bar = vol || e.target.closest('[data-aplay-bar]');
      if (!bar) return;
      var box = bar.closest('.aplay');
      if (!box) return;

      e.preventDefault();                     // don't start a text selection
      var rect  = bar.getBoundingClientRect();
      var startX = e.clientX, dragged = false;
      var at = vol
        ? function (ev) { setVolume((ev.clientX - rect.left) / rect.width); }
        : function (ev) { seekAudio(box, (ev.clientX - rect.left) / rect.width); };

      at(e);
      var move = function (ev) {
        if (Math.abs(ev.clientX - startX) > 3) dragged = true;
        at(ev);
      };
      var up = function (ev) {
        at(ev);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);

        /* A drag released outside the modal lands a click on the backdrop,
           which would close the whole popup mid-scrub. Swallow that one
           click (and only if we actually dragged). */
        if (!dragged) return;
        var swallow = function (ce) { ce.stopPropagation(); done(); };
        var done = function () { window.removeEventListener('click', swallow, true); };
        window.addEventListener('click', swallow, true);
        setTimeout(done, 300);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });

    $('#to-form').addEventListener('click', function () {
      state.view = 'form';
      state.openYt = null;
      renderModal();
    });

    /* --- form: pill buttons (delegated on the form) --- */
    var form = $('#request-form');

    form.addEventListener('click', function (e) {
      var pill = e.target.closest('[data-set]');
      if (pill) {
        var key = pill.getAttribute('data-set');
        var val = pill.getAttribute('data-value');
        /* clicking an already-selected optional complexity clears it */
        if (key === 'complexity' && state.form.complexity === val) val = '';
        state.form[key] = val;
        renderForm();
        return;
      }

      var addon = e.target.closest('[data-addon]');
      if (addon) {
        var k = addon.getAttribute('data-addon');
        var i = state.form.addons.indexOf(k);
        if (i === -1) state.form.addons.push(k);
        else state.form.addons.splice(i, 1);
        renderForm();
      }
    });

    /* --- form: text inputs --- */
    [
      ['#f-song', 'song'], ['#f-artist', 'artist'], ['#f-deadline', 'deadline'],
      ['#f-contact', 'contact'], ['#f-range', 'range'], ['#f-budget', 'budget'],
      ['#f-notes', 'notes']
    ].forEach(function (pair) {
      var node = $(pair[0]);
      if (!node) return;
      node.addEventListener('input', function (e) { state.form[pair[1]] = e.target.value; });
    });

    form.addEventListener('submit', handleSubmit);

    /* --- copy summary fallback --- */
    var copyBtn = $('#copy-summary');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var text = $('#sent-summary').textContent;
        var done = function () { copyBtn.textContent = 'copied ✓'; };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, fallbackCopy);
        } else {
          fallbackCopy();
        }
        function fallbackCopy() {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); done(); } catch (err) { copyBtn.textContent = 'select it above to copy'; }
          document.body.removeChild(ta);
        }
      });
    }
  }

  /* keep Tab inside the modal while it's open */
  function trapFocus(e) {
    var modal = $('#modal-backdrop .modal');
    var focusable = $$(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      modal
    ).filter(function (n) { return n.offsetParent !== null; });

    if (!focusable.length) return;
    var first = focusable[0];
    var last  = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* highlight the nav link for the section you're looking at */
  /* Highlight the section you're actually looking at.

     The old version used an IntersectionObserver with a percentage
     rootMargin. That misfired in three ways: it lit up "catalog" on load
     instead of "home", it credited the *next* section (clicking "about" lit
     "pricing"), and because smooth-scrolling flies through every section on
     the way, each one lit up in turn like a progress bar.

     This walks the sections in document order and takes the last one whose
     top has passed a line just under the sticky nav — and ignores scroll
     entirely while a click-jump is in flight. */
  function initScrollSpy() {
    var links = $$('.nav__link');
    if (!links.length) return;

    var ids = links.map(function (a) { return (a.getAttribute('href') || '').slice(1); })
                   .filter(function (id) { return id && document.getElementById(id); });
    if (!ids.length) return;

    var lockedId  = null;   // the link we're jumping to
    var lockUntil = 0;      // hard deadline so a lock can never get stuck

    function setActive(id) {
      links.forEach(function (a) {
        a.setAttribute('aria-current', a.getAttribute('href') === '#' + id ? 'true' : 'false');
      });
    }

    function currentId() {
      var nav  = $('.nav');
      var line = (nav ? nav.getBoundingClientRect().bottom : 0) + 28;
      var best = ids[0];

      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) best = id;
      });

      /* at the very bottom nothing further can cross the line, so make sure
         the last section wins rather than whatever happened to be closest */
      var atBottom = window.innerHeight + window.pageYOffset >=
                     document.documentElement.scrollHeight - 4;
      if (atBottom) best = ids[ids.length - 1];

      return best;
    }

    function locked() {
      if (!lockedId) return false;
      if (Date.now() >= lockUntil) { lockedId = null; return false; }
      return true;
    }

    function onScroll() {
      if (locked()) { setActive(lockedId); return; }   // hold the target
      setActive(currentId());
    }

    /* `scrollend` fires for ANY scroll, including one that happened just
       before our jump began. Clearing the lock on every scrollend let the
       smooth-scroll fly-through relight each link in turn — the exact bug
       this lock exists to prevent. Only release once we've actually landed. */
    function onScrollEnd() {
      if (locked()) {
        if (currentId() === lockedId) lockedId = null;
        else { setActive(lockedId); return; }
      }
      setActive(currentId());
    }

    links.forEach(function (a) {
      a.addEventListener('click', function () {
        var id = (a.getAttribute('href') || '').slice(1);
        if (!id) return;
        lockedId  = id;
        lockUntil = Date.now() + 1800;
        setActive(id);
      });
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('scrollend', onScrollEnd);

    setActive(currentId());
  }


  /* ============================================================
     GO
     ============================================================ */

  function init() {
    initBranding();
    renderPricing();
    renderFaq();
    initFilters();
    renderCatalog();
    bindEvents();
    initScrollSpy();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
