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
  function metaLine(entry) {
    var out = entry.complexity || '';
    if (entry.tracks) out += (out ? ' • ' : '') + entry.tracks + ' tracks';
    return out;
  }

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

    modal: null,        // null | 'song' | 'custom'
    song: null,         // the song object when modal === 'song'
    view: 'versions',   // 'versions' | 'form' | 'sent'
    openYt: null,       // key of the expanded youtube embed

    form: {
      song: '', artist: '',
      type: 'harmony',
      melody: 'partial',
      addons: [],
      deadline: '', contact: '',
      range: '', budget: '', complexity: '', notes: ''
    },

    sending: false,
    lastFocused: null
  };

  function blankForm() {
    return {
      song: '', artist: '', type: 'harmony', melody: 'partial', addons: [],
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

  var DD = {
    lang: { allLabel: 'all languages', noun: 'languages', options: [] },
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

    renderDropdown('lang');
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

    if (state.type.length) {
      var okType = state.type.some(function (t) {
        if (t === 'harmony')     return !!song.harmony;
        if (t === 'arrangement') return (song.arrangements || []).length > 0;
        return false;
      });
      if (!okType) return false;
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
      reset.hidden = (state.query === '' && !state.lang.length && !state.type.length);
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
              '<span class="tag tag--plain">' + esc(comps.join(' / ')) + '</span>' +
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
        meta: metaLine(song.harmony),
        client: song.harmony.client || null,
        yt: null,
        audio: song.harmony.audio || null
      });
    }
    (song.arrangements || []).forEach(function (a, i) {
      out.push({
        key: 'a' + i,
        label: a.label || 'Vocal Arrangement (Omakase)',
        meta: metaLine(a),
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
    state.form.type = song.harmony ? 'harmony' : 'arrangement';
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

  function fmtTime(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var m = Math.floor(t / 60), sec = Math.floor(t % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function resetAudioUI() {
    $$('.aplay').forEach(function (box) {
      var b = $('[data-aplay-toggle]', box);
      var f = $('[data-aplay-fill]', box);
      var t = $('[data-aplay-time]', box);
      if (b) { b.innerHTML = '&#9654;'; b.setAttribute('aria-label', 'play preview'); }
      if (f) f.style.width = '0%';
      if (t) t.textContent = '0:00';
    });
  }

  function stopAudio() {
    if (audioEl) { try { audioEl.pause(); } catch (err) {} }
    audioEl = null;
    audioSrc = null;
    resetAudioUI();
  }

  function paintAudio() {
    if (!audioEl || !audioSrc) return;
    var box = $('.aplay[data-aplay="' + audioSrc + '"]');
    if (!box) return;
    var d = audioEl.duration, c = audioEl.currentTime;
    var f = $('[data-aplay-fill]', box);
    var t = $('[data-aplay-time]', box);
    if (f) f.style.width = (isFinite(d) && d > 0 ? (c / d) * 100 : 0) + '%';
    if (t) t.textContent = fmtTime(c) + (isFinite(d) && d > 0 ? ' / ' + fmtTime(d) : '');
  }

  function toggleAudio(box) {
    var src = box.getAttribute('data-aplay');
    var btn = $('[data-aplay-toggle]', box);

    /* same file: just play/pause */
    if (audioSrc === src && audioEl) {
      if (audioEl.paused) {
        var r = audioEl.play(); if (r && r.catch) r.catch(function () {});
        if (btn) { btn.innerHTML = '&#10074;&#10074;'; btn.setAttribute('aria-label', 'pause preview'); }
      } else {
        audioEl.pause();
        if (btn) { btn.innerHTML = '&#9654;'; btn.setAttribute('aria-label', 'play preview'); }
      }
      return;
    }

    stopAudio();
    box.classList.remove('is-missing');
    audioSrc = src;
    audioEl  = new Audio(src);

    audioEl.addEventListener('timeupdate', paintAudio);
    audioEl.addEventListener('loadedmetadata', paintAudio);
    audioEl.addEventListener('ended', stopAudio);
    audioEl.addEventListener('error', function () {
      stopAudio();
      box.classList.add('is-missing');
      var t = $('[data-aplay-time]', box);
      if (t) t.textContent = 'file not found';
    });

    var pr = audioEl.play();
    if (pr && pr.catch) pr.catch(function () {});
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
              '<div class="version__meta">' + esc(v.meta) + '</div>' +
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
                  '</div>' +
                  '<span class="aplay__time" data-aplay-time>0:00</span>' +
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
        if (search) search.value = '';
        closeDropdowns();
        renderDropdown('lang');
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

      /* audio: scrub */
      var bar = e.target.closest('[data-aplay-bar]');
      if (bar) {
        var box = bar.closest('.aplay');
        if (box && audioEl && audioSrc === box.getAttribute('data-aplay') &&
            isFinite(audioEl.duration) && audioEl.duration > 0) {
          var rect = bar.getBoundingClientRect();
          var pct  = (e.clientX - rect.left) / rect.width;
          audioEl.currentTime = Math.max(0, Math.min(1, pct)) * audioEl.duration;
          paintAudio();
        }
        return;
      }

      var btn = e.target.closest('[data-yt]');
      if (!btn) return;
      var key = btn.getAttribute('data-yt');
      state.openYt = state.openYt === key ? null : key;
      renderVersions();
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
  function initScrollSpy() {
    var ids = ['catalog', 'about', 'pricing', 'faq'];
    var sections = ids.map(function (id) { return document.getElementById(id); }).filter(Boolean);
    if (!sections.length || !('IntersectionObserver' in window)) return;

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        $$('.nav__link').forEach(function (a) {
          a.setAttribute('aria-current', a.getAttribute('href') === '#' + entry.target.id ? 'true' : 'false');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { obs.observe(s); });
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
