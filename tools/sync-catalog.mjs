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

/* Audio previews aren't in the sheet. Either add an "audio" column to the
   sheet, or list files here keyed by "song title :: type".
   type is "harmony" or "arrangement".                                   */
const EXTRA_AUDIO = {
  'Bow and Arrow :: arrangement': 'audio/bow-and-arrow-1.mp3'
};

/* Sheet language wording -> the codes used in window.LANGUAGES */
const LANG_CODES = {
  japanese: 'JP', jp: 'JP', jpn: 'JP',
  english: 'EN', en: 'EN', eng: 'EN',
  chinese: 'CN', cn: 'CN', mandarin: 'CN', chinesemandarin: 'CN',
  korean: 'KR', kr: 'KR', kor: 'KR',
  spanish: 'ES', es: 'ES', esp: 'ES'
};

const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;

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

  const head = rows[headerAt].map(key);
  const col = (...names) => {
    for (const n of names) {
      const i = head.findIndex(h => h === key(n) || h.includes(key(n)));
      if (i !== -1) return i;
    }
    return -1;
  };
  const iSong = col('songname', 'song', 'title');
  const iArt  = col('artist');
  const iLang = col('language', 'lang');
  const iType = col('type');
  const iCplx = col('complexity');
  const iClient = col('client');
  const iTracks = col('tracks');
  const iYt   = col('ytlink', 'yt', 'youtube', 'link');
  const iAudio = col('audio', 'preview', 'mp3');

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

    const kind = isHarmony ? 'harmony' : 'arrangement';
    const audio = (iAudio !== -1 && norm(r[iAudio])) || EXTRA_AUDIO[`${title} :: ${kind}`] || '';
    if (audio) entry.audio = audio;

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

/* ---------- emit data/catalog.js ---------- */
const q = s => JSON.stringify(String(s));

function entryJs(e, indent) {
  const p = ' '.repeat(indent);
  const parts = [`${p}complexity: ${q(e.complexity)}`];
  if (e.tracks) parts.push(`${p}tracks: ${e.tracks}`);
  if (e.client) parts.push(`${p}client: ${q(e.client)}`);
  if (e.yt)     parts.push(`${p}yt: ${q(e.yt)}`);
  if (e.audio)  parts.push(`${p}audio: ${q(e.audio)}`);
  return parts.join(',\n');
}

export function render(songs, languages) {
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

  const res = await fetch(CSV_URL, { redirect: 'follow' });
  if (!res.ok) throw new Error(`sheet fetch failed: HTTP ${res.status}. Is it shared as "anyone with the link can view"?`);
  const songs = buildSongs(parseCsv(await res.text()));
  if (!songs.length) throw new Error('parsed 0 songs — refusing to write an empty catalog');

  writeFileSync(out, render(songs, languages));
  console.log(`wrote data/catalog.js — ${songs.length} songs`);
}
