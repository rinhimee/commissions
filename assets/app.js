/* ============================================================
   harmony guides — app.js
   ------------------------------------------------------------
   Vanilla JS, no build step. Reads:
     config.js        → window.SITE_CONFIG
     data/catalog.js  → window.SONGS, window.LANGUAGES
     data/catalog.js  → also window.SHOP (the sheet's "shop" tab)
     data/content.js  → window.PRICE_TIERS, MELODY_OPTIONS,
                        ADDONS, TURNAROUND, FAQS, TERMS
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
  var TERMS    = window.TERMS         || [];
  var SHOP     = (window.SHOP || []).filter(function (it) { return it && it.title && !it.sold; });

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
    released: false,   // only songs with a released cover (a yt link)
    limit: 10,         // phones show this many rows, "show more" adds 10

    modal: null,        // null | 'song' | 'custom'
    song: null,         // the song object when modal === 'song'
    shop: null,         // the shop item being ordered, if any
    view: 'versions',   // 'versions' | 'form' | 'sent'
    openYt: null,       // key of the expanded youtube embed

    form: {
      kind: 'song',      // 'song' = the structured form, 'open' = free-text
      brief: '',
      name: '', paypal: '', onvocal: '', offvocal: '', customInstr: false, extra: '',
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
      kind: 'song', brief: '',
      name: '', paypal: '', onvocal: '', offvocal: '', customInstr: false, extra: '',
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

    /* the hero's released-projects button opens the playlist directly when
       one is configured; without a URL it jumps to the featured section */
    var heroPl = $('[data-hero-playlist]');
    if (heroPl && links.playlist) {
      heroPl.href = links.playlist;
      heroPl.target = '_blank';
      heroPl.rel = 'noopener noreferrer';
      if (!$('.social__ext', heroPl)) {
        heroPl.insertAdjacentHTML('beforeend', ' <span class="social__ext" aria-hidden="true">\u2197</span>');
      }
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
        if (!$('.social__ext', playlist)) {
          playlist.insertAdjacentHTML('beforeend', ' <span class="social__ext" aria-hidden="true">\u2197</span>');
        }
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

  /* The terms pop-up: one card per topic with its short line, and the full
     wording a click away. The note field is the only place raw markup is
     allowed through, and it's authored by Lindsey in content.js, not by
     anything user-supplied. */
  function renderTerms() {
    var list = $('#terms-list');
    if (!list) return;
    if (!TERMS.length) {
      $$('[data-open-terms]').forEach(function (b) {
        var line = b.closest('.form-note--terms'); (line || b).hidden = true;
      });
      return;
    }

    list.innerHTML = TERMS.map(function (g) {
      var full = (g.items || []).length || g.note;
      return '' +
        '<div class="tcard">' +
          '<h3 class="tcard__h">' + esc(g.h) + '</h3>' +
          '<p class="tcard__line">' + esc(g.short || (g.items || [])[0] || '') + '</p>' +
          (full
            ? '<details class="tcard__more"><summary>the full wording</summary>' +
                '<ul class="terms__list">' +
                  (g.items || []).map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') +
                '</ul>' +
                (g.note ? '<p class="terms__note">' + g.note + '</p>' : '') +
              '</details>'
            : '') +
        '</div>';
    }).join('');
  }

  /* ---------- the terms pop-up sits above everything, even the request form */
  var termsReturn = null;
  function termsOpen() { var t = $('#terms-backdrop'); return !!t && !t.hidden; }

  function openTerms(from) {
    termsReturn = from || document.activeElement;
    var t = $('#terms-backdrop');
    t.hidden = false;
    document.body.classList.add('modal-open');
    /* from inside the request form, jumping to the FAQ would throw the form away */
    $('#terms-to-faq').hidden = !$('#modal-backdrop').hidden;
    var close = $('.tmodal__close', t);
    if (close) close.focus();
  }

  function closeTerms() {
    $('#terms-backdrop').hidden = true;
    if ($('#modal-backdrop').hidden) document.body.classList.remove('modal-open');
    if (termsReturn && termsReturn.focus) termsReturn.focus();
    termsReturn = null;
  }

  function renderFaq() {
    var list = $('#faq-list');
    if (!list) return;

    /* the first answer starts open, so the panel never looks empty */
    list.innerHTML = FAQS.map(function (f, i) {
      return '' +
        '<div class="faq__item' + (i === 0 ? ' is-open' : '') + '">' +
          '<button class="faq__q" type="button" aria-expanded="' + (i === 0) + '" aria-controls="faq-a-' + i + '">' +
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

  /* a song counts as released if any of its guides has a video */
  function isReleased(song) {
    if (song.harmony && song.harmony.yt) return true;
    return (song.arrangements || []).some(function (a) { return a.yt; });
  }

  var PAGE = 10;
  var phoneMq = window.matchMedia ? window.matchMedia('(max-width: 720px)') : null;
  function isPhone() { return !!(phoneMq && phoneMq.matches); }

  function matches(song) {
    if (state.released && !isReleased(song)) return false;
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

  /* Any search or filter change starts the phone list back at 10; only the
     "show more" button and a resize pass keepLimit. */
  function renderCatalog(keepLimit) {
    var list = $('#song-list');
    var count = $('#count');
    var reset = $('#reset-filters');
    var more = $('#cat-more');
    if (!list) return;
    if (keepLimit !== true) state.limit = PAGE;

    var visible = SONGS.filter(matches);
    var total = visible.length;
    if (isPhone()) visible = visible.slice(0, state.limit);
    if (more) {
      var left = total - visible.length;
      more.hidden = left <= 0;
      more.textContent = 'show more songs (' + left + ' more)';
    }
    var rel = $('#filter-released');
    if (rel) {
      rel.setAttribute('aria-pressed', String(state.released));
      rel.classList.toggle('is-on', state.released);
    }

    if (count) {
      count.textContent = total + (total === 1 ? ' song' : ' songs');
    }
    if (reset) {
      reset.hidden = (state.query === '' && !state.lang.length &&
                      !state.type.length && !state.cx.length && !state.released);
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
      var hasYt = isReleased(song);

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
            (hasYt ? '<span class="song__released"><span class="song__released-dot" aria-hidden="true">&#9654;</span>released</span>' : '') +
            '<span class="song__chev" aria-hidden="true">&rsaquo;</span>' +
          '</span>' +
        '</button>';
    }).join('');
  }



  /* ============================================================
     FEATURED WORKS + ARRANGEMENT SHOP
     ============================================================ */

  var REDUCE_MOTION = !!(window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* Every sheet row ticked "featured" that has a video. Numbered rows come
     first (lowest first); plain ticks keep their catalog order after them. */
  function featuredWorks() {
    var out = [];
    SONGS.forEach(function (song) {
      var ents = [];
      if (song.harmony) ents.push({ e: song.harmony, kind: 'harmony' });
      (song.arrangements || []).forEach(function (a) { ents.push({ e: a, kind: 'arrangement' }); });
      ents.forEach(function (x) {
        if (!x.e.featured || !x.e.yt) return;
        out.push({
          song: song, kind: x.kind, yt: x.e.yt, client: x.e.client || '',
          order: typeof x.e.featured === 'number' ? x.e.featured : Infinity,
          seq: out.length
        });
      });
    });
    return out.sort(function (a, b) { return (a.order - b.order) || (a.seq - b.seq); });
  }

  var FEAT_TINTS = ['feat-card--teal', 'feat-card--rose', 'feat-card--sand'];

  function renderFeatured() {
    var section = $('#featured');
    if (!section) return;
    var works = featuredWorks();
    var strip = $('#feat-strip');

    strip.innerHTML = works.map(function (w, i) {
      var title = w.song.title;
      var tag = w.kind === 'harmony' ? 'harmony guide' : 'vocal arrangement';
      return '' +
        '<div class="feat-card ' + FEAT_TINTS[i % FEAT_TINTS.length] + '" data-feat="' + i + '">' +
          '<div class="feat-card__media">' +
            '<button class="feat-card__thumb" type="button" data-play-yt="' + esc(w.yt) + '" ' +
                    'aria-label="play ' + esc(title) + ' on YouTube">' +
              '<img src="https://i.ytimg.com/vi/' + esc(w.yt) + '/hqdefault.jpg" alt="" ' +
                   'width="480" height="360" loading="lazy" decoding="async" draggable="false">' +
              '<span class="feat-card__play" aria-hidden="true">&#9654;</span>' +
            '</button>' +
          '</div>' +
          '<button class="feat-card__info" type="button" data-feat-song="' + esc(w.song.id) + '" ' +
                  'aria-label="' + esc(title) + ' — see the guides">' +
            '<span class="feat-card__tag feat-card__tag--' + w.kind + '">' + tag + '</span>' +
            '<span class="feat-card__title">' + esc(title) + '</span>' +
            (w.client ? '<span class="feat-card__for">for <strong>' + esc(w.client) + '</strong></span>' : '') +
            (w.song.artist ? '<span class="feat-card__orig">orig. ' + esc(w.song.artist) + '</span>' : '') +
          '</button>' +
        '</div>';
    }).join('');

    renderShop();

    var hasWorks = works.length > 0, hasShop = SHOP.length > 0;
    document.documentElement.classList.toggle('has-featured', hasWorks);
    document.documentElement.classList.toggle('has-shop', hasShop);
    section.hidden = !hasWorks && !hasShop;
    /* the nav link goes with it */
    $$('.nav__link[href="#featured"]').forEach(function (a) { a.hidden = section.hidden; });
    if (section.hidden) return;

    /* tabs only when there's a shop to switch to */
    $('.ftabs', section).hidden = !(hasWorks && hasShop);
    var count = $('#shop-count');
    if (count) count.textContent = SHOP.length;
    setFeatTab(hasWorks ? 'works' : 'shop');
    updateArrows();
  }

  function setFeatTab(which, focus) {
    var section = $('#featured');
    var isShop = which === 'shop';
    section.classList.toggle('is-shop', isShop);
    var tw = $('#ftab-works'), ts = $('#ftab-shop');
    tw.setAttribute('aria-selected', String(!isShop)); tw.tabIndex = isShop ? -1 : 0;
    ts.setAttribute('aria-selected', String(isShop));  ts.tabIndex = isShop ? 0 : -1;
    $('#fpanel-works').hidden = isShop;
    $('#fpanel-shop').hidden = !isShop;
    $('.feat__kicker', section).innerHTML = isShop ? '&#10022; arrangement shop' : '&#10022; featured works';
    $('#feat-prev').hidden = $('#feat-next').hidden = isShop;
    if (isShop) { stopFeatVideo(); primeShopAudio(); } else stopAudio();
    if (focus) (isShop ? ts : tw).focus();
    if (!isShop) updateArrows();
  }

  /* ---------- lite YouTube: the iframe only exists after a click ---------- */
  function stopFeatVideo() {
    $$('.feat-card.is-playing').forEach(function (card) {
      var media = $('.feat-card__media', card);
      var frame = $('iframe', media);
      if (frame) media.removeChild(frame);
      $('.feat-card__thumb', media).hidden = false;
      card.classList.remove('is-playing');
    });
  }

  function playFeatVideo(btn) {
    stopFeatVideo();
    stopAudio();
    var card = btn.closest('.feat-card');
    var media = $('.feat-card__media', card);
    var id = btn.getAttribute('data-play-yt');
    var frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0';
    frame.title = (btn.getAttribute('aria-label') || 'video').replace(/^play /, '');
    frame.allow = 'autoplay; encrypted-media; picture-in-picture';
    frame.setAttribute('allowfullscreen', '');
    btn.hidden = true;
    media.appendChild(frame);
    card.classList.add('is-playing');
    frame.focus();
  }

  /* ---------- carousel: arrows, drag, snap ---------- */
  /* scrollLeft at which each card sits snapped at the start edge */
  function cardStops(strip) {
    var base = strip.getBoundingClientRect().left - strip.scrollLeft +
               (parseFloat(getComputedStyle(strip).paddingLeft) || 0);
    return $$('.feat-card', strip).map(function (c) {
      return Math.round(c.getBoundingClientRect().left - base);
    });
  }

  function nearestStop(strip, x) {
    var stops = cardStops(strip), best = 0;
    stops.forEach(function (v, i) { if (Math.abs(v - x) < Math.abs(stops[best] - x)) best = i; });
    return { i: best, stops: stops };
  }

  function updateArrows() {
    var strip = $('#feat-strip'), prev = $('#feat-prev'), next = $('#feat-next');
    if (!strip || !prev) return;
    var max = strip.scrollWidth - strip.clientWidth;
    prev.disabled = strip.scrollLeft <= 2;
    next.disabled = strip.scrollLeft >= max - 2;
    /* nothing to scroll at all: the arrows are just noise */
    var none = max <= 2;
    prev.classList.toggle('is-idle', none);
    next.classList.toggle('is-idle', none);
  }

  /* one page = however many whole cards fit */
  function pageStrip(dir) {
    var strip = $('#feat-strip');
    var at = nearestStop(strip, strip.scrollLeft), stops = at.stops;
    if (!stops.length) return;
    var step = stops.length > 1 ? stops[1] - stops[0] : strip.clientWidth;
    var per = Math.max(1, Math.floor((strip.clientWidth + 1) / step));
    var to = Math.max(0, Math.min(stops.length - 1, at.i + dir * per));
    strip.scrollTo({ left: stops[to], behavior: REDUCE_MOTION ? 'auto' : 'smooth' });
  }

  function bindFeatured() {
    var section = $('#featured');
    if (!section) return;
    var strip = $('#feat-strip');

    $('#feat-prev').addEventListener('click', function () { pageStrip(-1); });
    $('#feat-next').addEventListener('click', function () { pageStrip(1); });
    strip.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);

    /* tabs: click, arrows, Home/End */
    var tabs = [$('#ftab-works'), $('#ftab-shop')];
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { setFeatTab(i ? 'shop' : 'works'); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, to = null;
        if (k === 'ArrowRight' || k === 'ArrowLeft') to = i ? 0 : 1;
        else if (k === 'Home') to = 0;
        else if (k === 'End') to = 1;
        if (to === null) return;
        e.preventDefault();
        setFeatTab(to ? 'shop' : 'works', true);
      });
    });

    /* card clicks: the thumbnail plays, the text opens the song's guides */
    strip.addEventListener('click', function (e) {
      if (suppressClick) { e.preventDefault(); e.stopPropagation(); return; }
      var play = e.target.closest('[data-play-yt]');
      if (play) { playFeatVideo(play); return; }
      var info = e.target.closest('[data-feat-song]');
      if (info) {
        var id = info.getAttribute('data-feat-song');
        var song = SONGS.filter(function (x) { return String(x.id) === id; })[0];
        if (song) { stopFeatVideo(); openSong(song); }
      }
    }, true);

    /* click-and-drag with a mouse; touch keeps native swiping */
    var drag = null, suppressClick = false;
    strip.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: strip.scrollLeft, moved: false, id: e.pointerId };
    });
    strip.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 5) {
        drag.moved = true;
        strip.classList.add('is-dragging');
        try { strip.setPointerCapture(drag.id); } catch (err) {}
      }
      if (drag.moved) { e.preventDefault(); strip.scrollLeft = drag.left - dx; }
    });
    function endDrag() {
      if (!drag) return;
      var moved = drag.moved;
      drag = null;
      if (!moved) return;
      /* the click that ends a drag must not play or open anything */
      suppressClick = true;
      setTimeout(function () { suppressClick = false; }, 0);
      var at = nearestStop(strip, strip.scrollLeft);
      strip.classList.remove('is-dragging');
      strip.scrollTo({ left: at.stops[at.i] || 0, behavior: REDUCE_MOTION ? 'auto' : 'smooth' });
    }
    strip.addEventListener('pointerup', endDrag);
    strip.addEventListener('pointercancel', endDrag);
    strip.addEventListener('lostpointercapture', endDrag);
    /* a thumbnail that fails to load leaves the tinted card + play button
       rather than a broken-image icon */
    strip.addEventListener('error', function (e) {
      if (e.target && e.target.tagName === 'IMG') e.target.hidden = true;
    }, true);

    /* images and links inside would otherwise start a native drag */
    strip.addEventListener('dragstart', function (e) { e.preventDefault(); });

    /* shop: order buttons */
    $('#shop-grid').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-shop-order]');
      if (!btn) return;
      var item = SHOP[+btn.getAttribute('data-shop-order')];
      if (item) openShopOrder(item);
    });
  }

  /* ---------- the shop ---------- */
  function priceNum(p) {
    var m = String(p || '').replace(/,/g, '').match(/\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : NaN;
  }

  function renderShop() {
    var grid = $('#shop-grid');
    if (!grid) return;
    grid.innerHTML = SHOP.map(function (it, i) {
      var now = priceNum(it.price), was = priceNum(it.was);
      var off = (isFinite(now) && isFinite(was) && was > now) ? Math.round((1 - now / was) * 100) : 0;
      return '' +
        '<div class="shop-card">' +
          '<div class="shop-card__top">' +
            '<span class="shop-card__ready">&#10022; ready now</span>' +
            (off ? '<span class="shop-card__off">&minus;' + off + '%</span>' : '') +
          '</div>' +
          '<div class="shop-card__name">' +
            '<span class="shop-card__title">' + esc(it.title) + '</span>' +
            (it.artist ? '<span class="shop-card__orig">orig. ' + esc(it.artist) + '</span>' : '') +
          '</div>' +
          '<div class="shop-card__chips">' +
            '<span class="tag tag--arr">vocal arrangement</span>' +
            (it.complexity ? '<span class="shop-card__chip">' + esc(it.complexity) + '</span>' : '') +
            (it.tracks ? '<span class="shop-card__chip">' + esc(it.tracks) + ' tracks</span>' : '') +
          '</div>' +
          (it.audio ? playerHtml(it.audio) : '') +
          '<div class="shop-card__buy">' +
            '<span class="shop-card__prices">' +
              (it.price ? '<span class="shop-card__price">' + esc(it.price) + '</span>' : '') +
              (it.was && off ? '<s class="shop-card__was"><span class="visually-hidden">was </span>' + esc(it.was) + '</s>' : '') +
            '</span>' +
            '<button class="shop-card__order" type="button" data-shop-order="' + i + '" ' +
                    'aria-label="order ' + esc(it.title) + '">order this &#9829;</button>' +
          '</div>' +
        '</div>';
    }).join('');
    $$('.aplay', grid).forEach(paintVolume);
    shopPrimed = false;
  }

  /* Reading each clip's length means requesting the file, so the shop waits
     until it's actually opened — and until the page itself has loaded — so
     those requests never compete with the first paint. */
  var shopPrimed = false;
  function primeShopAudio() {
    if (shopPrimed) return;
    shopPrimed = true;
    var go = function () { $$('#shop-grid .aplay').forEach(primeDuration); };
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
  }

  function openShopOrder(item) {
    stopAudio();
    var song = item.songId ? SONGS.filter(function (x) { return x.id === item.songId; })[0] : null;
    state.modal = 'shop';
    state.song = song || null;
    state.shop = item;
    state.view = 'form';
    state.openYt = null;
    state.form = blankForm();
    state.form.song = item.title;
    state.form.artist = item.artist || (song ? song.artist : '');
    state.form.type = 'arrangement';
    showModal();
  }


  /* ============================================================
     ABOUT / PRICING / FAQ TABS
     ============================================================ */

  var INFO_TABS = ['about', 'pricing', 'faq'];
  var infoTab = 'about';
  var onInfoTab = function () {};   // the scroll-spy hooks in here

  function selectInfoTab(id, focus) {
    var section = $('#info');
    if (!section || INFO_TABS.indexOf(id) === -1) return;
    var changed = id !== infoTab;
    infoTab = id;
    section.setAttribute('data-tab', id);
    INFO_TABS.forEach(function (t) {
      var tab = $('#itab-' + t), on = t === id;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      $('#' + t).hidden = !on;
    });
    if (focus) $('#itab-' + id).focus();
    /* the CD hops up whenever the tab changes */
    var pop = $('.info__cd-pop', section);
    if (changed && pop && !REDUCE_MOTION) {
      pop.classList.remove('is-pop');
      void pop.offsetWidth;            // restart the animation
      pop.classList.add('is-pop');
    }
    onInfoTab(id);
  }

  /* open a tab from anywhere (nav, hero, terms) and bring the section into view */
  function goToInfoTab(id) {
    selectInfoTab(id);
    var section = $('#info');
    if (section) section.scrollIntoView({ block: 'start' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  }

  function initInfoTabs() {
    var section = $('#info');
    if (!section) return;
    section.classList.add('is-tabbed');
    $('.itabs', section).hidden = false;

    INFO_TABS.forEach(function (t, i) {
      var tab = $('#itab-' + t);
      tab.addEventListener('click', function () { selectInfoTab(t); });
      tab.addEventListener('keydown', function (e) {
        var k = e.key, to = null;
        if (k === 'ArrowRight') to = (i + 1) % INFO_TABS.length;
        else if (k === 'ArrowLeft') to = (i + INFO_TABS.length - 1) % INFO_TABS.length;
        else if (k === 'Home') to = 0;
        else if (k === 'End') to = INFO_TABS.length - 1;
        if (to === null) return;
        e.preventDefault();
        selectInfoTab(INFO_TABS[to], true);
      });
    });

    /* links to #about / #pricing / #faq open the matching tab */
    $$('[data-tab-link]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        goToInfoTab(a.getAttribute('data-tab-link'));
      });
    });

    /* arriving on /#pricing etc. opens that tab */
    var hash = (location.hash || '').slice(1);
    selectInfoTab(INFO_TABS.indexOf(hash) !== -1 ? hash : 'about');
    if (INFO_TABS.indexOf(hash) !== -1) {
      window.addEventListener('load', function () { section.scrollIntoView({ block: 'start' }); }, { once: true });
    }
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
        yt: song.harmony.yt || null,
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
    state.shop  = null;
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
    state.shop = null;
    state.view = 'choose';
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
    state.shop = null;
    state.view = 'versions';
    state.sending = false;
    if (state.lastFocused && state.lastFocused.focus) state.lastFocused.focus();
  }

  function turnaround() {
    if (state.shop) return TAT.shop || TAT.catalog;
    if (state.song) return TAT.catalog;
    if (state.form.type === 'arrangement') return TAT.arrangement;
    return TAT.harmony;
  }

  /* Swap modal views with a height tween instead of an instant jump.
     Measures before and after, animates between, then hands height control
     back to the layout so nothing stays pinned. */
  /* view swaps are instant — the height tween stuttered too much */
  function swapView(mutate) { mutate(); }

  function renderModal() {
    var song = state.song;

    /* --- header --- */
    var isOpenReq = state.modal === 'custom' && state.form.kind === 'open';
    /* the chooser itself stays neutral — only tint once you're on the open form */
    $('#modal-backdrop').classList.toggle('is-open-request', isOpenReq && state.view !== 'choose');
    var kicker = $('#modal-kicker');
    kicker.textContent = state.modal === 'custom'
      ? (state.view === 'choose' ? '✦ request' : (isOpenReq ? '✦ open request' : '✦ custom request'))
      : '';
    kicker.hidden = state.modal !== 'custom';

    var langLine = $('#modal-lang');
    if (langLine) {
      if (song) { langLine.innerHTML = langChips(song); langLine.hidden = false; }
      else { langLine.innerHTML = ''; langLine.hidden = true; }
    }
    if (state.modal === 'shop') {
      var it = state.shop || {};
      kicker.textContent = '✦ arrangement shop';
      kicker.hidden = false;
      $('#modal-title').textContent = it.title || '';
      $('#modal-sub').textContent = 'ready-made vocal arrangement' +
        (it.artist ? ' · orig. ' + it.artist : '') + (it.price ? ' · ' + it.price : '');
      $('#view-choose').hidden = true;
      $('#view-versions').hidden = true;
      $('#view-form').hidden = state.view !== 'form';
      $('#view-sent').hidden = state.view !== 'sent';
      if (state.view === 'form') renderForm();
      return;
    }

    $('#modal-title').textContent = state.modal === 'custom'
      ? (state.view === 'choose' ? 'send a request'
         : (isOpenReq ? "let's talk about it" : 'request a song'))
      : (song ? song.title : '');
    $('#modal-sub').textContent = state.modal === 'custom'
      ? (state.view === 'choose'
          ? 'two ways in — pick whichever fits.'
          : (isOpenReq
              ? "no set format. tell me what you're thinking and i'll come back to you."
              : "not in the catalog — tell me what you need and i'll quote it."))
      : (song ? song.artist : '');

    /* --- which view --- */
    $('#view-choose').hidden   = state.view !== 'choose';
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
  var audioBox = null;      // the player that owns the audio (a src can appear twice)
  var pendingSeek = null;   // scrub target set before metadata arrived
  /* Volume starts at 2 of the 4 ticks and is remembered across visits.
     Private-mode browsers throw on storage, so every touch is guarded. */
  var VOL_KEY = 'rh:preview-volume';
  var DEFAULT_VOLUME = 0.75;

  function storedVolume() {
    try {
      var raw = window.localStorage.getItem(VOL_KEY);
      if (raw === null) return DEFAULT_VOLUME;
      var v = parseFloat(raw);
      return (isFinite(v) && v >= 0 && v <= 1) ? v : DEFAULT_VOLUME;
    } catch (err) { return DEFAULT_VOLUME; }
  }

  var volume  = storedVolume();  // shared by every preview, survives re-renders
  var muted   = (volume === 0);
  var preMute = volume || DEFAULT_VOLUME;   // what unmuting restores

  var ICON_NOTE = '\u266A';   /* the draft's note; muted state is a CSS slash */

  /* Read just the duration up front so the player reads "0:00 / 3:24" at
     rest instead of waiting for the first play. Metadata only — no audio
     data is fetched, and the probe is thrown away once it reports. */
  function primeDuration(box) {
    var src = box.getAttribute('data-aplay');
    if (!src) return;
    var probe = new Audio(), settled = false;
    probe.preload = 'metadata';
    probe.addEventListener('loadedmetadata', function () {
      settled = true;
      /* if it started playing in the meantime, paintAudio owns the label */
      if (audioBox !== box) paintTime($('[data-aplay-time]', box), 0, probe.duration);
    });
    probe.addEventListener('error', function () {
      /* tearing the probe down also fires 'error' — only the first one is real */
      if (settled) return;
      settled = true;
      box.classList.add('is-missing');
      var t = $('[data-aplay-time]', box);
      if (t) t.textContent = 'file not found';
    });
    probe.src = src;
  }

  /* elapsed and total are tinted differently, so they're separate spans */
  function paintTime(el, cur, dur) {
    if (!el) return;
    var html = '<b class="aplay__now">' + fmtTime(cur) + '</b>';
    if (isFinite(dur) && dur > 0) {
      html += '<i class="aplay__slash">/</i><b class="aplay__dur">' + fmtTime(dur) + '</b>';
    }
    el.innerHTML = html;
  }

  function paintVolume(box) {
    var v = muted ? 0 : volume;
    var btn  = $('[data-aplay-mute]', box);

    /* four stepped ticks instead of a fill bar; tick n lights at n/4 */
    var ticks = $$('.aplay__tick', box);
    ticks.forEach(function (t, i) {
      t.classList.toggle('is-on', v >= (i + 1) / ticks.length - 0.001);
    });
    var vb = $('[data-aplay-volbar]', box);
    if (vb) vb.setAttribute('aria-valuenow', Math.round(v * 100));

    if (btn) {
      btn.innerHTML = ICON_NOTE;
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
    try { window.localStorage.setItem(VOL_KEY, String(volume)); } catch (err) {}
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
      if (t) paintTime(t, 0, 0);
    });
  }

  function stopAudio() {
    if (audioEl) { try { audioEl.pause(); } catch (err) {} }
    audioEl = null;
    audioSrc = null;
    audioBox = null;
    pendingSeek = null;
    resetAudioUI();
  }

  function paintAudio() {
    if (!audioEl || !audioBox) return;
    var box = audioBox;
    var d = audioEl.duration, c = audioEl.currentTime;
    var f = $('[data-aplay-fill]', box);
    var k = $('[data-aplay-knob]', box);
    var t = $('[data-aplay-time]', box);
    var pct = (isFinite(d) && d > 0 ? (c / d) * 100 : 0);
    if (f) f.style.width = pct + '%';
    if (k) k.style.left = pct + '%';
    if (t) paintTime(t, c, d);
    box.classList.toggle('is-playing', !audioEl.paused);
  }

  /* Load (but don't start) the track for a player. Splitting this out is what
     lets you scrub before pressing play — previously the seek handler bailed
     out because no Audio object existed yet. */
  function ensureAudio(box) {
    var src = box.getAttribute('data-aplay');
    if (audioEl && audioBox === box) return audioEl;

    stopAudio();
    box.classList.remove('is-missing');
    audioSrc = src;
    audioBox = box;
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
    var btn = $('[data-aplay-toggle]', box);

    /* already loaded: just play/pause */
    if (audioBox === box && audioEl) {
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

  /* the preview player — the song popup and the shop cards share it */
  function playerHtml(src) {
    return '' +
      '<div class="aplay" data-aplay="' + esc(src) + '">' +
        '<button class="aplay__btn" type="button" data-aplay-toggle ' +
                'aria-label="play preview">&#9654;</button>' +
        '<div class="aplay__bar" data-aplay-bar>' +
          '<div class="aplay__fill" data-aplay-fill></div>' +
          '<div class="aplay__knob" data-aplay-knob></div>' +
        '</div>' +
        '<span class="aplay__time" data-aplay-time><b class="aplay__now">0:00</b></span>' +
        '<div class="aplay__vol">' +
          '<button class="aplay__volbtn" type="button" data-aplay-mute aria-label="mute"></button>' +
          '<div class="aplay__volbar" data-aplay-volbar ' +
               'role="slider" tabindex="0" aria-label="volume" ' +
               'aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">' +
            '<i class="aplay__tick"></i><i class="aplay__tick"></i>' +
            '<i class="aplay__tick"></i><i class="aplay__tick"></i>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function renderVersions() {
    stopAudio();               /* the old player nodes are about to be replaced */
    var wrap = $('#version-list');
    var list = versionsOf(state.song);

    wrap.innerHTML = list.map(function (v) {
      var open = state.openYt === v.key;
      return '' +
        '<div class="version">' +
          '<span class="version__spark" aria-hidden="true">\u2727</span>' +
          '<div class="version__row">' +
            '<div class="version__main">' +
              '<div class="version__label">' + esc(v.label) + '</div>' +
              '<div class="version__meta">' +
                '<span class="vtag vtag--' + cxClass(v.cx) + '">' +
                  '<i class="vtag__dot" aria-hidden="true"></i>' + esc(v.cx) +
                '</span>' +
                (v.tracks
                  ? '<span class="vtag vtag--tracks">' +
                      '<i class="vtag__dot" aria-hidden="true"></i>' + esc(v.tracks) + ' tracks' +
                    '</span>'
                  : '') +
              '</div>' +
              (v.client ? '<div class="version__client">for ' + esc(v.client) + '</div>' : '') +
            '</div>' +
            (v.yt
              ? '<button class="version__yt-btn" type="button" data-yt="' + esc(v.key) + '" aria-expanded="' + open + '">' +
                  '<span>yt</span><span style="font-size:10px;">' + (open ? '\u25B2' : '\u25BC') + '</span>' +
                '</button>'
              : '') +
          '</div>' +
          (v.audio
            ? '<div class="version__audio">' +
                playerHtml(v.audio) +
                '<div class="version__foot">' +
                  '<span class="version__note" aria-hidden="true">\u266A</span>' +
                  '<span>preview clip \u2014 full guide delivered as isolated stems</span>' +
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
    $$('.aplay', wrap).forEach(primeDuration);
  }

  /* ---------- the request form ------------------------------ */

  function pillClass(on, tone) {
    if (!on) return 'pill-btn';
    return 'pill-btn is-on' + (tone === 'teal' ? ' is-on--teal' : '');
  }

  function renderForm() {
    var f = state.form;

    var isOpen = f.kind === 'open';

    /* An open request shares only the contact / deadline / budget fields —
       guide type, melody and add-ons are all priced per song, so they'd be
       meaningless (and intimidating) on a "let's talk" enquiry. */
    /* The original link is only worth asking for on a song I haven't already
       worked on — from the catalog I know exactly which version it is. */
    var isShop = state.modal === 'shop';
    $('#field-links').hidden   = isOpen || !!state.song || isShop;
    /* The instrumental question applies to any song request: even a catalog
       guide may not line up against a commissioned backing track. */
    $('#field-instr').hidden     = isOpen;
    $('#f-custom-instr').checked = !!f.customInstr;
    /* On a song I haven't done before the instrumental box sits open but
       optional — if they happen to have one it saves me hunting for it.
       From the catalog it stays collapsed, because I already have what I
       need. Ticking "custom instrumental" opens it and makes it required
       either way: that's the case where I can't go and find it myself. */
    var newSong = !state.song && !isShop;
    $('#instr-detail').hidden = !(f.customInstr || newSong);
    var ovReq = $('#offvocal-req'), ovOpt = $('#offvocal-opt');
    if (ovReq) ovReq.hidden = !f.customInstr;
    if (ovOpt) ovOpt.hidden = !!f.customInstr;
    var ovLabel = $('#offvocal-label');
    if (ovLabel) {
      ovLabel.textContent = f.customInstr
        ? 'Link to your instrumental'
        : 'Link to the instrumental';
    }
    /* deadline + paypal show on every request; paypal is only required for songs */
    var ppReq = $('#paypal-req'), ppOpt = $('#paypal-opt');
    if (ppReq) ppReq.hidden = isOpen;
    if (ppOpt) ppOpt.hidden = !isOpen;
    $('#f-name').value     = f.name;
    $('#f-paypal').value   = f.paypal;
    $('#f-onvocal').value  = f.onvocal;
    $('#f-offvocal').value = f.offvocal;
    $('#f-extra').value    = f.extra;
    $('#open-fields').hidden   = !isOpen;
    $('#custom-fields').hidden = isOpen || state.modal !== 'custom';
    $('#field-type').hidden    = isOpen || isShop;
    var shopNote = $('#shop-note');
    if (shopNote) {
      shopNote.hidden = !isShop;
      if (isShop) {
        var it = state.shop;
        shopNote.innerHTML = 'You&rsquo;re ordering the ready-made arrangement of <strong>' +
          esc(it.title) + '</strong>' + (it.price ? ' for <strong>' + esc(it.price) + '</strong>' : '') +
          '. Add a melody guide or add-ons below if you want them.';
      }
    }
    $('#field-melody').hidden  = isOpen;
    $('#field-addons').hidden  = isOpen;
    $('#tat-note').hidden      = isOpen;
    /* From a catalog song the same link walks back to that song's guides,
       so you can re-check what's on hand without losing the modal. */
    var back = $('#back-to-choose');
    back.hidden = isShop;
    back.innerHTML = state.modal === 'song'
      ? '\u2190 Back to this song\u2019s guides'
      : '\u2190 Pick a different request type';
    $('#f-brief').value = f.brief;
    /* budget lives inside the arrangement-only block, so the open form needs
       its own input — both write to the same state key */
    $('#f-open-budget').value = f.budget;
    $('#form-note').textContent = isOpen
      ? "no commitment — this just starts a conversation."
      : "i'll follow up with a quote, then invoice through paypal.";
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
      { value: 'arrangement', label: 'Vocal arrangement' }
    ].map(function (o) {
      return '<button class="' + pillClass(f.type === o.value) + '" type="button" ' +
             'data-set="type" data-value="' + o.value + '" aria-pressed="' + (f.type === o.value) + '">' +
             esc(o.label) + '</button>';
    }).join('');

    /* melody guide */
    $('#melody-row').innerHTML = MELODY.map(function (o) {
      /* label and price in separate spans so the price can sit apart and
         italic — "Full  +$20" ran together as one word before */
      return '<button class="' + pillClass(f.melody === o.value) + '" type="button" ' +
             'data-set="melody" data-value="' + esc(o.value) + '" aria-pressed="' + (f.melody === o.value) + '">' +
               '<span class="pill-btn__label">' + esc(o.label) + '</span>' +
               '<span class="pill-btn__price">' + esc(o.price) + '</span>' +
             '</button>';
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
    $('#arr-only').hidden = !isArr || isOpen || isShop;
    $('#complexity-row').innerHTML = [
      { value: 'simple',       label: 'Simple' },
      { value: 'semi',         label: 'Semi-complex' },
      { value: 'complex',      label: 'Complex' }
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
      : (isOpen ? 'send it over ♡' : 'send request ♡');
  }


  /* ============================================================
     SUBMIT
     ============================================================ */

  function summaryLines() {
    var f = state.form;

    if (f.kind === 'open') {
      return [
        'Open request',
        'name:      ' + (f.name || '—'),
        'contact:   ' + (f.contact || '—'),
        'paypal:    ' + (f.paypal || '—'),
        'deadline:  ' + (f.deadline || 'flexible'),
        'budget:    ' + (f.budget || '—'),
        '',
        (f.brief || '—'),
        (f.extra ? '\n' + f.extra : '')
      ].join('\n');
    }

    var melodyLabel = (MELODY.filter(function (m) { return m.value === f.melody; })[0] || {}).label || f.melody;
    var addonLabels = f.addons.map(function (k) {
      var a = ADDONS.filter(function (x) { return x.key === k; })[0];
      return a ? a.label + ' (' + a.price + ')' : k;
    });

    var lines = [].concat(state.shop ? [
      'SHOP ORDER:  ready-made arrangement — ' + (state.shop.price || 'price on site') +
        (state.shop.was ? ' (was ' + state.shop.was + ')' : '')
    ] : [], [
      'song:        ' + (f.song || '—'),
      'artist:      ' + (f.artist || '—'),
      'on-vocal:    ' + (f.onvocal || '—'),
      'off-vocal:   ' + (f.offvocal || '—'),
      'name:        ' + (f.name || '—'),
      'paypal:      ' + (f.paypal || '—'),
      'guide type:  ' + (f.type === 'harmony' ? '1:1 harmony guide' : 'vocal arrangement'),
      'melody:      ' + melodyLabel,
      'add-ons:     ' + (addonLabels.length ? addonLabels.join(', ') : 'none'),
      'deadline:    ' + (f.deadline || 'flexible'),
      'contact:     ' + (f.contact || '—'),
      'in catalog:  ' + (state.song ? 'yes' : 'no'),
      'instrumental:' + (f.customInstr ? ' CUSTOM — ' + (f.offvocal || 'no link given') : ' official off-vocal')
    ]);
    if (f.extra) lines.push('details:     ' + f.extra);

    if (f.type === 'arrangement' && !state.shop) {
      lines.push('range:       ' + (f.range || '—'));
      lines.push('budget:      ' + (f.budget || '—'));
      lines.push('complexity:  ' + (f.complexity || 'let me pitch'));
      if (f.notes) lines.push('notes:       ' + f.notes);
    }
    return lines.join('\n');
  }

  function discordPayload() {
    var f = state.form;

    /* open requests get their own shape — a different colour and title so
       they're obvious at a glance in the channel */
    if (f.kind === 'open') {
      var openPayload = {
        embeds: [{
          title: 'open request',
          description: (f.brief || '—').slice(0, 4000),
          color: 0x1E6E70,
          fields: [
            { name: 'name',     value: (f.name || '—').slice(0, 1024), inline: true },
            { name: 'contact',  value: (f.contact || '—').slice(0, 1024), inline: true },
            { name: 'paypal',   value: (f.paypal || 'not given').slice(0, 1024), inline: true },
            { name: 'deadline', value: (f.deadline || 'flexible').slice(0, 1024), inline: true },
            { name: 'budget',   value: (f.budget || 'not given').slice(0, 1024), inline: true }
          ].concat(f.extra ? [{ name: 'details', value: f.extra.slice(0, 1024), inline: false }] : []),
          footer: { text: (CFG.brandName || 'harmony guides') + ' · open request' },
          timestamp: new Date().toISOString()
        }]
      };
      var openPing = String(CFG.discordPingUserId || '').trim();
      if (/^\d{15,25}$/.test(openPing)) {
        openPayload.content = '<@' + openPing + '> open request';
        openPayload.allowed_mentions = { users: [openPing] };
      }
      return openPayload;
    }

    var melodyOpt = MELODY.filter(function (m) { return m.value === f.melody; })[0] || {};
    var addonLabels = f.addons.map(function (k) {
      var a = ADDONS.filter(function (x) { return x.key === k; })[0];
      return a ? '• ' + a.label + ' (' + a.price + ')' : '• ' + k;
    });

    var fields = [
      { name: 'name', value: f.name || '—', inline: true },
      { name: 'paypal', value: f.paypal || '—', inline: true },
      { name: 'on-vocal', value: f.onvocal || '—', inline: false },
      { name: 'instrumental',
        value: f.customInstr ? '**custom** — ' + (f.offvocal || 'no link given') : 'official off-vocal',
        inline: false },
      { name: 'guide type', value: f.type === 'harmony' ? '1:1 harmony guide' : 'vocal arrangement', inline: true },
      { name: 'in catalog', value: state.shop ? 'shop item' : (state.song ? 'yes — discounted' : 'no — new request'), inline: true },
      { name: 'melody guide', value: (melodyOpt.label || f.melody) + ' (' + (melodyOpt.price || '') + ')', inline: true },
      { name: 'deadline', value: f.deadline || 'flexible', inline: true },
      { name: 'contact', value: f.contact || '—', inline: true },
      { name: 'add-ons', value: addonLabels.length ? addonLabels.join('\n') : 'none', inline: false }
    ];
    if (f.extra) fields.push({ name: 'details', value: f.extra.slice(0, 1024), inline: false });

    if (state.shop) {
      fields.unshift({ name: 'shop order',
        value: 'ready-made arrangement — ' + (state.shop.price || 'price on site') +
               (state.shop.was ? ' (was ' + state.shop.was + ')' : ''),
        inline: false });
    } else if (f.type === 'arrangement') {
      fields.push({ name: 'vocal range', value: f.range || 'not given', inline: true });
      fields.push({ name: 'budget', value: f.budget || 'not given', inline: true });
      fields.push({ name: 'complexity', value: f.complexity || 'let me pitch directions', inline: true });
      if (f.notes) fields.push({ name: 'notes', value: f.notes.slice(0, 1020), inline: false });
    }

    /* Any over-length value makes Discord 400 the request, so clamp to its
       documented limits rather than trusting whatever got typed in. */
    fields = fields.map(function (fd) {
      return {
        name: String(fd.name).slice(0, 256),
        value: (String(fd.value).trim() || '—').slice(0, 1024),
        inline: fd.inline
      };
    }).slice(0, 25);

    var payload = {
      embeds: [{
        title: ((state.shop ? '[shop] ' : '') + (f.song || 'untitled') + ' — ' + (f.artist || 'unknown artist')).slice(0, 256),
        description: state.shop ? 'shop order from the site' : 'new commission request from the site',
        color: state.shop ? 0xC4577C : 0xA8455F,
        fields: fields,
        footer: { text: (CFG.brandName || 'harmony guides') + ' · request form' },
        timestamp: new Date().toISOString()
      }]
    };

    /* Discord validates allowed_mentions.users as snowflakes — a username in
       here makes the whole POST fail with a 400, which silently drops every
       request into the copy-paste fallback. Only ping with a numeric ID. */
    var pingId = String(CFG.discordPingUserId || '').trim();
    if (/^\d{15,25}$/.test(pingId)) {
      payload.content = '<@' + pingId + '> new request';
      payload.allowed_mentions = { users: [pingId] };
    } else if (pingId && window.console) {
      console.warn('[' + (CFG.brandName || 'site') + '] discordPingUserId must be your ' +
        'numeric Discord user ID, not your username — turn on Settings > Advanced > ' +
        'Developer Mode, then right-click your name and Copy User ID. Ignoring ' +
        JSON.stringify(pingId) + ' so requests still go through.');
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
      $('#sent-title').innerHTML = f.kind === 'open' ? 'got it ♡' : 'request sent ♡';
      $('#sent-note').textContent = f.kind === 'open'
        ? "i'll get back to you at " + (f.contact || 'your contact') +
          " once i've had a read — usually within a day."
        : "i'll reach out at " + (f.contact || 'your contact') +
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

    /* One required-field table, checked in visual order, so the first empty
       one is the one that gets the error and the focus. */
    var required = f.kind === 'open'
      ? [['#f-brief',  'brief',  "Tell me a bit about what you're after \u2014 even a sentence helps."],
         ['#f-name',   'name',   'What should I call you?'],
         ['#f-contact','contact','I need a Discord handle or email to reply to.']]
      : [['#f-song',   'song',   'What song is it? Add a title so I know what to quote.'],
         ['#f-onvocal','onvocal','Drop a link to the original so I know the version you mean.'],
         ['#f-name',   'name',   'What should I call you?'],
         ['#f-contact','contact','I need a Discord handle or email to reply to.'],
         ['#f-paypal', 'paypal', 'I invoice through PayPal \u2014 which email should I send it to?']];

    /* ticking the custom-instrumental box makes its link required */
    if (f.kind !== 'open' && f.customInstr) {
      required.splice(1, 0,
        ['#f-offvocal','offvocal','Pop in a link to your custom instrumental so I can work against it.']);
    }

    /* a catalog song already filled these in, so don't demand them again */
    if (state.song || state.shop) required = required.filter(function (r) {
      return r[1] !== 'song' && r[1] !== 'onvocal';
    });

    var missing = null;
    required.forEach(function (r) {
      var el = $(r[0]);
      if (el) el.removeAttribute('aria-invalid');
      if (!missing && !String(f[r[1]] || '').trim()) missing = r;
    });
    if (missing) {
      showError(missing[2]);
      var badEl = $(missing[0]);
      if (badEl) { badEl.setAttribute('aria-invalid', 'true'); badEl.focus(); }
      return;
    }

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
        state.released = false;
        if (search) search.value = '';
        closeDropdowns();
        renderDropdown('lang');
        renderDropdown('cx');
        renderDropdown('type');
        renderCatalog();
        if (search) search.focus();
      });
    }

    /* --- "has a released cover" toggle --- */
    var relBtn = $('#filter-released');
    if (relBtn) {
      relBtn.addEventListener('click', function () {
        state.released = !state.released;
        renderCatalog();
      });
    }

    /* --- phones: show 10 more, and move focus to the first new row --- */
    var moreBtn = $('#cat-more');
    if (moreBtn) {
      moreBtn.addEventListener('click', function () {
        var from = state.limit;
        state.limit += PAGE;
        renderCatalog(true);
        var rows = $$('#song-list .song');
        if (rows[from]) rows[from].focus();
      });
    }
    /* crossing the phone breakpoint changes how many rows show */
    if (phoneMq) {
      var onMq = function () { renderCatalog(true); };
      if (phoneMq.addEventListener) phoneMq.addEventListener('change', onMq);
      else if (phoneMq.addListener) phoneMq.addListener(onMq);
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

    /* --- terms pop-up --- */
    $$('[data-open-terms]').forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); openTerms(b); });
    });
    var tback = $('#terms-backdrop');
    if (tback) {
      tback.addEventListener('click', function (e) {
        if (e.target === tback || e.target.closest('[data-close-terms]')) closeTerms();
      });
      $('#terms-to-faq').addEventListener('click', function () {
        termsReturn = null;
        closeTerms();
        goToInfoTab('faq');
        var t = $('#itab-faq'); if (t) t.focus({ preventScroll: true });
      });
    }

    /* --- modal chrome --- */
    var backdrop = $('#modal-backdrop');
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) closeModal();
      if (e.target.closest('[data-close]')) closeModal();
    });

    document.addEventListener('keydown', function (e) {
      /* the terms pop-up is always the top layer, so it goes first */
      if (termsOpen()) {
        if (e.key === 'Escape') { closeTerms(); return; }
        if (e.key === 'Tab') trapFocus(e, $('#terms-backdrop .modal'));
        return;
      }
      if (e.key === 'Escape' && anyDropdownOpen()) { closeDropdowns(); return; }
      if (e.key === 'Escape' && !backdrop.hidden) { closeModal(); return; }
      if (e.key === 'Tab' && !backdrop.hidden) trapFocus(e);
    });

    /* --- versions view --- */
    bindPlayers($('#version-list'));
    bindPlayers($('#shop-grid'));

    $('#version-list').addEventListener('click', function (e) {
      /* the player's own clicks are handled by bindPlayers */
      if (e.target.closest('.aplay')) return;

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
      ['#f-notes', 'notes'], ['#f-brief', 'brief'], ['#f-open-budget', 'budget'],
      ['#f-name', 'name'], ['#f-paypal', 'paypal'],
      ['#f-onvocal', 'onvocal'], ['#f-offvocal', 'offvocal'],
      ['#f-extra', 'extra']
    ].forEach(function (pair) {
      var node = $(pair[0]);
      if (!node) return;
      node.addEventListener('input', function (e) { state.form[pair[1]] = e.target.value; });
    });

    /* the custom-instrumental toggle reveals its own link field */
    var instr = $('#f-custom-instr');
    if (instr) {
      instr.addEventListener('change', function (e) {
        state.form.customInstr = e.target.checked;
        /* only discard the link if unticking also hides the field —
           on a new song the box stays open, so whatever they typed stands */
        if (!e.target.checked && state.song) state.form.offvocal = '';
        renderForm();
        if (e.target.checked) { var l = $('#f-offvocal'); if (l) l.focus(); }
      });
    }

    /* --- the request-type chooser --- */
    var choose = $('#view-choose');
    if (choose) {
      choose.addEventListener('click', function (e) {
        var card = e.target.closest('[data-kind]');
        if (!card) return;
        var kind = card.getAttribute('data-kind');
        swapView(function () {
          state.form.kind = kind;
          state.view = 'form';
          renderModal();
        });
        var first = kind === 'open' ? $('#f-brief') : $('#f-song');
        if (first) first.focus({ preventScroll: true });
      });
    }

    var back = $('#back-to-choose');
    if (back) {
      back.addEventListener('click', function () {
        clearError();
        var toVersions = state.modal === 'song';
        swapView(function () {
          state.view = toVersions ? 'versions' : 'choose';
          renderModal();
        });
        var card = $('#view-choose [data-kind]');
        if (card) card.focus();
      });
    }

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

  /* Wire up every preview player inside `root` (delegated, so players
     rendered later still work). Used for the song popup and the shop. */
  function bindPlayers(root) {
    if (!root) return;

    root.addEventListener('click', function (e) {
      /* audio: play / pause */
      var play = e.target.closest('[data-aplay-toggle]');
      if (play) { toggleAudio(play.closest('.aplay')); return; }

      /* audio: mute toggle */
      var mute = e.target.closest('[data-aplay-mute]');
      if (mute) {
        if (volume === 0) setVolume(preMute || DEFAULT_VOLUME);
        else { preMute = volume; setVolume(0); }
      }
      /* scrubbing and volume are handled on pointerdown below, so they drag */
    });

    /* the volume ticks are a real slider: arrows nudge, home/end pin it */
    root.addEventListener('keydown', function (e) {
      var vb = e.target.closest && e.target.closest('[data-aplay-volbar]');
      if (!vb) return;
      var step = 0.25, v = muted ? 0 : volume, k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowUp')        v += step;
      else if (k === 'ArrowLeft' || k === 'ArrowDown')  v -= step;
      else if (k === 'Home')                            v = 0;
      else if (k === 'End')                             v = 1;
      else return;
      e.preventDefault();
      setVolume(v);
    });

    /* press-and-drag scrubbing */
    root.addEventListener('pointerdown', function (e) {
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

  }

  /* keep Tab inside the modal while it's open */
  function trapFocus(e, modal) {
    modal = modal || $('#modal-backdrop .modal');
    var focusable = $$(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      modal
    ).filter(function (n) { return n.offsetParent !== null; });

    if (!focusable.length) return;
    /* focus that has slipped outside (e.g. after a click on the backdrop) comes back in */
    if (!modal.contains(document.activeElement)) { e.preventDefault(); focusable[0].focus(); return; }
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

    var infoEl = document.getElementById('info');
    var targets = links.map(function (a) {
      var id = (a.getAttribute('href') || '').slice(1);
      var tab = a.getAttribute('data-tab-link');
      return { id: id, tab: tab, el: tab ? infoEl : document.getElementById(id) };
    }).filter(function (t) { return t.id && t.el; });
    if (!targets.length) return;

    /* what counts right now: skip hidden sections and the closed tabs */
    function live() {
      return targets.filter(function (t) {
        if (t.el.hidden) return false;
        return !t.tab || t.tab === infoTab;
      });
    }

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
      var list = live();
      var best = list[0].id;

      list.forEach(function (t) {
        if (t.el.getBoundingClientRect().top <= line) best = t.id;
      });

      /* at the very bottom nothing further can cross the line, so make sure
         the last section wins rather than whatever happened to be closest */
      var atBottom = window.innerHeight + window.pageYOffset >=
                     document.documentElement.scrollHeight - 4;
      if (atBottom) best = list[list.length - 1].id;

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

    /* the sticky nav gains a shadow once it starts overlapping content */
    var navEl = $('.nav');
    function navShadow() {
      if (navEl) navEl.classList.toggle('is-stuck', window.pageYOffset > 8);
    }
    navShadow();
    window.addEventListener('scroll', navShadow, { passive: true });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('scrollend', onScrollEnd);

    /* switching tabs moves the highlight to the newly opened tab's link */
    onInfoTab = function () { if (!locked()) setActive(currentId()); };

    setActive(currentId());
  }


  /* ============================================================
     GO
     ============================================================ */

  /* ============================================================
     SPARKLE  (decorative, additive — touches no markup)
     ============================================================ */

  /* Finds the word in the hero headline at runtime and decorates it, rather
     than wrapping it in index.html. That keeps the copy editable: reword the
     headline freely and this still finds "sparkle" (or gives up quietly). */
  function initSparkle() {
    var title = $('#hero-title');
    if (!title) return;

    var word = $$('span', title).filter(function (el) {
      return /sparkl/i.test(el.textContent || '');
    })[0];
    if (!word) return;

    word.classList.add('sparkle-word');

    /* The shimmer goes on an inner wrapper, not on the word span itself:
       that span already carries the .rise entrance animation, and an
       `animation` shorthand here would silently replace it. */
    var ink = document.createElement('span');
    ink.className = 'sparkle-ink';
    ink.textContent = word.textContent;
    word.textContent = '';
    word.appendChild(ink);

    /* a few stars that twinkle around the word, on their own offsets */
    var stars = [
      { x: -4,  y: -22, s: 13, d: 0    },
      { x: 34,  y: 62,  s: 10, d: 0.7  },
      { x: 78,  y: -10, s: 15, d: 1.35 },
      { x: 104, y: 44,  s:  9, d: 2.05 }
    ];
    stars.forEach(function (st) {
      var el = document.createElement('span');
      el.className = 'sparkle-star';
      el.setAttribute('aria-hidden', 'true');
      el.textContent = '\u2726';
      el.style.left = st.x + '%';
      el.style.top = st.y + '%';
      el.style.fontSize = st.s + 'px';
      el.style.animationDelay = st.d + 's';
      word.appendChild(el);
    });
  }


  /* ============================================================
     CURSOR GLITTER
     ============================================================ */

  function initGlitter() {
    /* skip where it would be unwanted or pointless: reduced motion, and
       touch screens (no cursor to trail) */
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    var fine   = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)');
    if ((reduce && reduce.matches) || (fine && !fine.matches)) return;

    var layer = document.createElement('div');
    layer.className = 'glitter-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);

    var GLYPHS = ['\u2726', '\u2727', '\u00b7'];
    var TINTS  = ['var(--rose)', 'var(--rose-line)', 'var(--teal)', 'var(--rose-soft)'];
    var MAX    = 28;          /* hard ceiling on live particles */
    var GAP    = 45;          /* ms between spawns */
    var MOVE   = 9;           /* px the pointer must travel to earn one */

    var live = 0, lastAt = 0, lastX = null, lastY = null;

    function spawn(x, y) {
      if (live >= MAX) return;
      live++;

      var bit = document.createElement('span');
      bit.className = 'glitter';
      bit.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0];
      bit.style.left = x + 'px';
      bit.style.top  = y + 'px';
      bit.style.color = TINTS[(Math.random() * TINTS.length) | 0];
      bit.style.fontSize = (7 + Math.random() * 8).toFixed(1) + 'px';
      /* drift a little sideways and down, and spin a bit, so no two match */
      bit.style.setProperty('--dx', ((Math.random() - 0.5) * 26).toFixed(1) + 'px');
      bit.style.setProperty('--dy', (16 + Math.random() * 20).toFixed(1) + 'px');
      bit.style.setProperty('--rot', ((Math.random() - 0.5) * 140).toFixed(0) + 'deg');
      bit.style.animationDuration = (750 + Math.random() * 450).toFixed(0) + 'ms';

      layer.appendChild(bit);
      bit.addEventListener('animationend', function () {
        if (bit.parentNode) bit.parentNode.removeChild(bit);
        live--;
      });
    }

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;

      var now = e.timeStamp || Date.now();
      if (now - lastAt < GAP) return;

      if (lastX !== null) {
        var dx = e.clientX - lastX, dy = e.clientY - lastY;
        if (dx * dx + dy * dy < MOVE * MOVE) return;
      }
      lastAt = now; lastX = e.clientX; lastY = e.clientY;
      spawn(e.clientX, e.clientY);
    }, { passive: true });

    /* don't leave a frozen trail behind when the tab is hidden */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { layer.innerHTML = ''; live = 0; }
    });
  }


  /* The catalog renders after paint, so the page is short when the browser
     restores a saved scroll position — you land in the middle of nowhere on
     every refresh. Take the wheel: honour a #hash, otherwise start at the top. */
  function initScrollStart() {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (window.location.hash) return;
    window.scrollTo(0, 0);
    /* one more after layout settles, in case the browser got there first */
    window.addEventListener('load', function () {
      if (!window.location.hash) window.scrollTo(0, 0);
    }, { once: true });
  }

  function init() {
    initScrollStart();
    initBranding();
    renderPricing();
    renderFaq();
    renderTerms();
    initFilters();
    renderCatalog();
    renderFeatured();
    initInfoTabs();
    bindEvents();
    bindFeatured();
    initScrollSpy();
    initSparkle();
    initGlitter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
