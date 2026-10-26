/* ============================================================
   sync-catalog.mjs
   Reads the Google Sheet and rewrites data/catalog.js.

   Run it yourself:   node tools/sync-catalog.mjs
   Or let the GitHub Action run it on a schedule.

   The sheet must be shared as "Anyone with the link can view",
   otherwise GitHub's servers can't read it.
   ============================================================ */

const SHEET_ID = '1rOM4CN55lDevXwFhGjBj2n_dXMZftuS5Qk9uyVWhRVI';
const GID      = '0';

/* ---- audio previews -------------------------------------------------
   Files in audio/ are matched to entries by name, so you never have to
   list them anywhere:

     <song-title>.mp3      -> that song's harmony guide
     <song-title>-1.mp3    -> that song's vocal arrangement

   The title is lowercased, apostrophes dropped, everything else that isn't
   a letter or number turned into a dash. "Ah, It's A Wonderful Cat's Life"
   becomes "ah-its-a-wonderful-cats-life".

   An `audio` column in the sheet still wins over any of this.

   For the handful whose filename doesn't match the title, map the FILE name
   (without .mp3) to the name it would have had. The sync logs every file it
   couldn't place, so nothing goes missing silently.                      */
const AUDIO_ALIASES = {
  'i-really-wanna-stay-at-your-house-1': 'i-really-want-to-stay-at-your-house-1',
  'cure-mizisua':                        'cure-ver-mizisua'
};

/* Sheet language wording -> the codes used in window.LANGUAGES */
const LANG_CODES = {
  japanese: 'JP', jp: 'JP', jpn: 'JP',
  english: 'EN', en: 'EN', eng: 'EN',
  chinese: 'CN', cn: 'CN', mandarin: 'CN', chinesemandarin: 'CN',
  korean: 'KR', kr: 'KR', kor: 'KR',
  spanish: 'ES', es: 'ES', esp: 'ES'
};

/* The bare gviz endpoint serves a cached snapshot that can sit stale for
   weeks — rows added to the sheet simply never appear, and the sync happily
   commits the old catalog because nothing "changed". Sending an explicit
   `tq` query forces a fresh evaluation, and the timestamp defeats any
   intermediate cache. */
/* The shop lives on its own tab, found by name so its gid never matters.
   Tab names may be matched case-sensitively, so try the usual spellings. */
const SHOP_TAB = 'shop';
const SHOP_TAB_NAMES = ['shop', 'Shop', 'SHOP'];

const csvUrl = (sheetName) => 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq'
  + '?tqx=out:csv'
  + (sheetName ? '&sheet=' + encodeURIComponent(sheetName) : '&gid=' + GID)
  + '&headers=1'
  + '&tq=' + encodeURIComponent('select *')
  + '&_=' + Date.now();

/* ---------- a real CSV parser (quotes, escaped quotes, newlines) ---------- */
export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;

  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  row.push(field);
  if (row.some(v => v !== '')) rows.push(row);
  return rows;
}

const norm = s => String(s ?? '').trim();
const key  = s => norm(s).toLowerCase().replace(/[^a-z0-9]/g, '');

/* Find a column by any of several header names. An exact header match wins
   over a partial one, so "featured" never grabs "featured order". */
function columnFinder(headerRow) {
  const head = headerRow.map(key);
  return (...names) => {
    for (const n of names) { const i = head.indexOf(key(n)); if (i !== -1) return i; }
    for (const n of names) { const i = head.findIndex(h => h.includes(key(n))); if (i !== -1) return i; }
    return -1;
  };
}

/* checkbox cells come through as TRUE/FALSE; also accept yes/x/1 */
const truthy = v => /^(true|yes|y|x|1|✓|✔)$/i.test(norm(v));

/* youtube URL (any shape) -> bare video id */
/* "Spanish, English, Korean" -> ["ES","EN","KR"];  "Chinese (Mandarin)" -> ["CN"] */
export function langCodes(raw) {
  return String(raw ?? '')
    .split(/[,/]| and /i)
    .map(part => part.replace(/\(.*?\)/g, '').trim())
    .filter(Boolean)
    .map(part => LANG_CODES[key(part)] || part.toUpperCase())
    .filter((v, i, arr) => v && arr.indexOf(v) === i);
}

export function ytId(raw) {
  const v = norm(raw);
  if (!v) return '';
  const m = v.match(/[?&]v=([\w-]{6,})/) || v.match(/youtu\.be\/([\w-]{6,})/)
         || v.match(/\/embed\/([\w-]{6,})/);
  if (m) return m[1];
  return /^[\w-]{6,}$/.test(v) ? v : '';
}

export function buildSongs(rows) {
  if (!rows.length) throw new Error('sheet came back empty');

  /* find the header row — the one containing a "song" column */
  const headerAt = rows.findIndex(r => r.some(c => key(c).includes('song')));
  if (headerAt === -1) throw new Error('no header row with a "song name" column');

  const col = columnFinder(rows[headerAt]);
  const iSong = col('songname', 'song', 'title');
  const iArt  = col('artist');
  const iLang = col('language', 'lang');
  const iType = col('type');
  const iCplx = col('complexity');
  const iClient = col('client');
  const iTracks = col('tracks');
  const iYt   = col('ytlink', 'yt', 'youtube', 'link');
  const iAudio = col('audio', 'preview', 'mp3');
  const iFeat  = col('featured');
  const iFeatOrder = col('featuredorder', 'featureorder');

  if (iSong === -1 || iType === -1) throw new Error('sheet needs at least "song name" and "type" columns');

  const songs = [];
  const byKey = new Map();

  rows.slice(headerAt + 1).forEach((r, n) => {
    const line = headerAt + n + 2;                     // 1-indexed sheet row
    const title = norm(r[iSong]);
    if (!title) return;                                 // blank spacer row

    /* A cell with a line break means two entries crammed into one row —
       the client / yt / tracks columns then can't be matched up reliably.
       Refuse rather than guess. */
    for (const cell of r) {
      if (String(cell ?? '').includes('\n')) {
        throw new Error(
          `sheet row ${line} ("${title.split('\n')[0]}") has a line break inside a cell.\n` +
          `Put one entry per row — otherwise there's no way to tell which entry the ` +
          `client / yt link / track count belongs to.`);
      }
    }

    const artist = norm(r[iArt]);
    const langs = langCodes(r[iLang]);
    const lang = langs.length > 1 ? langs : (langs[0] || 'JP');
    const isHarmony = key(r[iType]).includes('harmony');

    const entry = { complexity: norm(r[iCplx]).toLowerCase() || 'simple' };
    const tracks = parseInt(norm(r[iTracks]), 10);
    if (Number.isFinite(tracks) && tracks > 0) entry.tracks = tracks;
    const client = norm(r[iClient]); if (client) entry.client = client;
    const yt = ytId(r[iYt]);         if (yt) entry.yt = yt;

    const audio = iAudio !== -1 ? norm(r[iAudio]) : '';
    if (audio) entry.audio = audio;

    /* featured: a ticked box, or a number typed straight into the cell.
       The "featured order" number sets the carousel position; ticked rows
       without one go after the numbered ones. */
    const featCell  = iFeat !== -1 ? norm(r[iFeat]) : '';
    const orderCell = iFeatOrder !== -1 ? norm(r[iFeatOrder]) : '';
    const orderNum  = parseFloat(orderCell || featCell);
    if (truthy(featCell) || Number.isFinite(parseFloat(featCell)) || Number.isFinite(parseFloat(orderCell))) {
      entry.featured = Number.isFinite(orderNum) && orderNum > 0 ? orderNum : true;
    }

    const k = `${title.toLowerCase()}::${artist.toLowerCase()}`;
    let song = byKey.get(k);
    if (!song) {
      song = { id: songs.length + 1, title, artist, language: lang, harmony: null, arrangements: [] };
      byKey.set(k, song); songs.push(song);
    }
    if (isHarmony) song.harmony = entry;
    else song.arrangements.push(entry);
  });

  songs.sort((a, b) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }));
  songs.forEach((s, i) => { s.id = i + 1; });
  return songs;
}

/* Title -> the filename stem we'd expect for it. */
export function audioSlug(title) {
  return String(title ?? '')
    .toLowerCase()
    .replace(/['\u2019]/g, '')      // it's -> its
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* Attach every file in audio/ to the entry it belongs to.
   Returns { attached, unmatched } so the caller can report. */
export function attachAudio(songs, files) {
  const slots = new Map();          // expected stem -> entry
  for (const s of songs) {
    const base = audioSlug(s.title);
    if (s.harmony) slots.set(base, s.harmony);
    s.arrangements.forEach((a, i) => slots.set(base + '-' + (i + 1), a));
  }

  const unmatched = [];
  let attached = 0;

  for (const file of files) {
    if (!/\.(mp3|m4a|ogg|wav)$/i.test(file)) continue;
    const stem = file.replace(/\.[^.]+$/, '');
    if (/-shop$/.test(stem)) continue;          // shop previews are placed by buildShop
    /* Direct match wins; an alias is only a fallback. Otherwise correcting a
       title in the sheet would make its alias point at a song that no longer
       exists and silently drop the audio — which is exactly what happened when
       "Widflower" was fixed to "Wildflower". */
    const entry = slots.get(stem) || slots.get(AUDIO_ALIASES[stem] || stem);
    if (!entry) { unmatched.push(file); continue; }
    if (!entry.audio) { entry.audio = 'audio/' + file; attached++; }
  }
  return { attached, unmatched };
}

/* ---------- the arrangement shop tab ----------
   One row per arrangement for sale: song name, artist, price, original
   price, sold. Complexity and tracks can be typed here, or are taken from a
   matching *unreleased* vocal-arrangement row on the main sheet (no client,
   no yt link) — never from a released one, whose clip is a different take.
   The preview clip: an `audio` column, else audio/<song-title>-shop.mp3,
   else that unreleased row's clip. */
const money = v => {
  const t = norm(v);
  if (!t) return '';
  return /^\d+(\.\d+)?$/.test(t) ? '$' + t : t;
};

export function buildShop(rows, songs, files = []) {
  const headerAt = rows.findIndex(r => r.some(c => key(c).includes('song')) && r.some(c => key(c).includes('price')));
  /* No header with both a song and a price column means this isn't the shop
     tab (gviz falls back to the first tab when a name doesn't exist). */
  if (headerAt === -1) return null;

  const col = columnFinder(rows[headerAt]);
  const iSong = col('songname', 'song', 'title');
  const iArt  = col('artist');
  const iPrice = col('price', 'saleprice', 'newprice');
  const iWas  = col('originalprice', 'original', 'was', 'oldprice', 'regularprice');
  const iSold = col('sold');
  const iCplx = col('complexity');
  const iTracks = col('tracks');
  const iAudio = col('audio', 'preview', 'mp3');
  const get = (r, i) => (i === -1 ? '' : norm(r[i]));

  const out = [];
  const missing = [];
  rows.slice(headerAt + 1).forEach(r => {
    const title = get(r, iSong);
    if (!title || truthy(get(r, iSold))) return;
    const artist = get(r, iArt);

    const tk = key(title), ak = key(artist);
    const song = songs.find(s => key(s.title) === tk && (!ak || key(s.artist) === ak))
              || songs.find(s => key(s.title) === tk);
    /* only an arrangement nobody's attached to can stand in for the shop item */
    const arrs = song ? song.arrangements : [];
    const arr = arrs.find(a => !a.client && !a.yt) || null;
    if (!song) missing.push(title);

    const item = {
      title: song ? song.title : title,
      artist: artist || (song ? song.artist : ''),
      complexity: (get(r, iCplx) || (arr && arr.complexity) || '').toLowerCase(),
      price: money(get(r, iPrice)),
      was: money(get(r, iWas))
    };
    const tracks = parseInt(get(r, iTracks), 10) || (arr && arr.tracks) || 0;
    if (tracks) item.tracks = tracks;
    const shopFile = files.find(f => f.replace(/\.[^.]+$/, '') === audioSlug(title) + '-shop');
    const audio = get(r, iAudio) || (shopFile ? 'audio/' + shopFile : '') || (arr && arr.audio) || '';
    if (audio) item.audio = audio;
    if (song) item.songId = song.id;
    out.push(item);
  });
  return { items: out, missing };
}

/* ---------- emit data/catalog.js ---------- */
const q = s => JSON.stringify(String(s));

function entryJs(e, indent) {
  const p = ' '.repeat(indent);
  const parts = [`${p}complexity: ${q(e.complexity)}`];
  if (e.tracks) parts.push(`${p}tracks: ${e.tracks}`);
  if (e.client) parts.push(`${p}client: ${q(e.client)}`);
  if (e.yt)     parts.push(`${p}yt: ${q(e.yt)}`);
  if (e.audio)  parts.push(`${p}audio: ${q(e.audio)}`);
  if (e.featured) parts.push(`${p}featured: ${e.featured === true ? 'true' : e.featured}`);
  return parts.join(',\n');
}

function shopJs(items) {
  if (!items.length) return '[]';
  return '[\n' + items.map(it => {
    const bits = [`title: ${q(it.title)}`, `artist: ${q(it.artist)}`];
    if (it.songId) bits.push(`songId: ${it.songId}`);
    if (it.complexity) bits.push(`complexity: ${q(it.complexity)}`);
    if (it.tracks) bits.push(`tracks: ${it.tracks}`);
    if (it.audio) bits.push(`audio: ${q(it.audio)}`);
    bits.push(`price: ${q(it.price)}`);
    if (it.was) bits.push(`was: ${q(it.was)}`);
    return '    { ' + bits.join(', ') + ' }';
  }).join(',\n') + '\n]';
}

export function render(songs, languages, shop = []) {
  const body = songs.map(s => {
    const bits = [
      `    id: ${s.id}`,
      `    title: ${q(s.title)}`,
      `    artist: ${q(s.artist)}`,
      `    language: ${Array.isArray(s.language)
              ? '[' + s.language.map(q).join(', ') + ']'
              : q(s.language)}`,
      s.harmony ? `    harmony: {\n${entryJs(s.harmony, 6)}\n    }` : `    harmony: null`,
      s.arrangements.length
        ? `    arrangements: [\n${s.arrangements.map(a => `      {\n${entryJs(a, 8)}\n      }`).join(',\n')}\n    ]`
        : `    arrangements: []`
    ];
    return `  {\n${bits.join(',\n')}\n  }`;
  }).join(',\n');

  return `/* ============================================================
   catalog.js  —  GENERATED FILE, DO NOT EDIT BY HAND.

   This is rewritten from the Google Sheet by tools/sync-catalog.mjs.
   Any edit you make here will be overwritten on the next sync.
   Edit the sheet instead:
   https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit
   ============================================================ */

window.SONGS = [
${body}
];

/* arrangement shop — from the "${SHOP_TAB}" tab; sold rows are left out */
window.SHOP = ${shopJs(shop)};

${languages}`;
}

/* ---------- run ---------- */
const isMain = process.argv[1] && process.argv[1].endsWith('sync-catalog.mjs');
if (isMain) {
  const { readFileSync, writeFileSync } = await import('node:fs');
  const out = new URL('../data/catalog.js', import.meta.url);

  /* keep whatever window.LANGUAGES block is already in the file */
  let languages = '';
  try {
    const cur = readFileSync(out, 'utf8');
    const at = cur.indexOf('window.LANGUAGES');
    if (at !== -1) {
      const cStart = cur.lastIndexOf('/*', at);
      languages = cur.slice(cStart !== -1 && cStart > cur.indexOf('window.SONGS') ? cStart : at).trimEnd() + '\n';
    }
  } catch {}
  if (!languages) {
    languages = `window.LANGUAGES = {
  JP: { flag: "🇯🇵", short: "JP",  name: "japanese" },
  EN: { flag: "🇺🇸", short: "ENG", name: "english"  },
  CN: { flag: "🇨🇳", short: "CN",  name: "chinese"  },
  KR: { flag: "🇰🇷", short: "KR",  name: "korean"   }
};
`;
  }

  const res = await fetch(csvUrl(''), {
    redirect: 'follow',
    headers: { 'cache-control': 'no-cache', pragma: 'no-cache' }
  });
  if (!res.ok) throw new Error(`sheet fetch failed: HTTP ${res.status}. Is it shared as "anyone with the link can view"?`);
  const songs = buildSongs(parseCsv(await res.text()));
  if (!songs.length) throw new Error('parsed 0 songs — refusing to write an empty catalog');

  /* A silently shrinking catalog means we read a stale or truncated sheet.
     Losing songs should be loud, not committed. */
  let previous = 0;
  try {
    const cur = readFileSync(out, 'utf8');
    const start = cur.indexOf('window.SONGS');
    const end = cur.indexOf('\n];', start);
    previous = (cur.slice(start, end === -1 ? undefined : end).match(/^\s{2}\{$/gm) || []).length;
  } catch {}
  /* `node tools/sync-catalog.mjs --allow-shrink` when you removed rows on purpose */
  const allowShrink = process.argv.includes('--allow-shrink');
  if (previous && songs.length < previous && allowShrink) {
    console.log(`--allow-shrink: catalog goes from ${previous} to ${songs.length} songs`);
  } else if (previous && songs.length < previous) {
    throw new Error(
      `the sheet produced ${songs.length} songs but data/catalog.js already has ` +
      `${previous}. Refusing to drop ${previous - songs.length} — the sheet read ` +
      `is probably stale or truncated. Re-run once the sheet loads normally. If you ` +
      `removed rows on purpose, run: node tools/sync-catalog.mjs --allow-shrink`);
  }

  /* pick up whatever is sitting in audio/ */
  const { readdirSync } = await import('node:fs');
  let files = [];
  try { files = readdirSync(new URL('../audio/', import.meta.url)); } catch {}
  const audio = attachAudio(songs, files);
  console.log(`attached ${audio.attached} audio preview(s)`);
  if (audio.unmatched.length) {
    console.log('audio files that matched no song (check the spelling):');
    audio.unmatched.forEach(f => console.log('  - ' + f));
  }

  /* the shop tab is optional: missing or unreadable just means no shop */
  let shop = [];
  try {
    let built = null;
    for (const name of SHOP_TAB_NAMES) {
      const sres = await fetch(csvUrl(name), {
        redirect: 'follow',
        headers: { 'cache-control': 'no-cache', pragma: 'no-cache' }
      });
      built = sres.ok ? buildShop(parseCsv(await sres.text()), songs, files) : null;
      if (built) break;
    }
    if (!built) console.log(`no "${SHOP_TAB}" tab with song + price columns — shop left empty`);
    else {
      shop = built.items;
      console.log(`shop: ${shop.length} item(s) for sale`);
      built.missing.forEach(t => console.log(`  - shop item "${t}" matched no song on the main sheet`));
    }
  } catch (err) {
    console.log('could not read the shop tab (' + err.message + ') — shop left empty');
  }

  writeFileSync(out, render(songs, languages, shop));
  const withYt = songs.reduce((n, sg) =>
    n + (sg.harmony && sg.harmony.yt ? 1 : 0)
      + (sg.arrangements || []).filter(a => a.yt).length, 0);
  const featured = songs.reduce((n, sg) =>
    n + (sg.harmony && sg.harmony.featured ? 1 : 0)
      + (sg.arrangements || []).filter(a => a.featured).length, 0);
  console.log(`wrote data/catalog.js — ${songs.length} songs, ${withYt} youtube link(s), ${featured} featured`);
}
