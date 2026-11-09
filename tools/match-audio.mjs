/* ============================================================
   match-audio.mjs  —  why didn't my audio file attach?

   Run it:   node tools/match-audio.mjs

   For every file in audio/ that the sync couldn't place, this
   prints the catalog entries whose expected filename comes
   closest, so you can see whether it's a typo, a spacing
   difference, or a song that simply isn't on the sheet.

   Read-only. It changes nothing.
   ============================================================ */

import { readdirSync, readFileSync } from 'node:fs';
import { audioSlug } from './sync-catalog.mjs';

/* ---- load the generated catalog ---- */
const catalogPath = new URL('../data/catalog.js', import.meta.url);
const sandbox = {};
new Function('window', readFileSync(catalogPath, 'utf8'))(sandbox);
const SONGS = sandbox.SONGS || [];

/* ---- every filename the sync would accept ---- */
const expected = new Map();           // slug -> description
for (const s of SONGS) {
  const base = audioSlug(s.title);
  if (s.harmony) expected.set(base, `${s.title} — harmony guide`);
  (s.arrangements || []).forEach((a, i) => {
    expected.set(`${base}-${i + 1}`, `${s.title} — vocal arrangement${s.arrangements.length > 1 ? ' ' + (i + 1) : ''}`);
  });
  /* a song with no harmony entry still can't use the bare slug */
  if (!s.harmony) expected.set(base + '\u0000none', `${s.title} — (no harmony guide on the sheet)`);
}

/* ---- similarity, so near-misses float to the top ---- */
function distance(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1,
                        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}
const score = (a, b) => 1 - distance(a, b) / Math.max(a.length, b.length, 1);

/* ---- walk the folder ---- */
const files = readdirSync(new URL('../audio/', import.meta.url))
  .filter(f => /\.(mp3|wav|m4a|ogg)$/i.test(f));

const unmatched = files.filter(f => !expected.has(f.replace(/\.[^.]+$/, '')));

console.log(`${files.length} audio file(s), ${files.length - unmatched.length} attached, ${unmatched.length} unplaced\n`);
if (!unmatched.length) { console.log('everything is attached.'); process.exit(0); }

const titles = [...expected.entries()].filter(([k]) => !k.includes('\u0000'));

for (const file of unmatched) {
  const slug = file.replace(/\.[^.]+$/, '');
  const near = titles
    .map(([k, label]) => ({ k, label, s: score(slug, k) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .filter(x => x.s > 0.45);

  console.log(`  ${file}`);
  if (!near.length) {
    console.log('     no close title — this song probably isn\'t on the sheet yet');
  } else {
    for (const n of near) {
      const verdict = n.s > 0.92 ? 'almost certainly this — rename the file'
                    : n.s > 0.70 ? 'likely this'
                    : 'possibly this';
      console.log(`     ${(n.s * 100).toFixed(0)}%  ${n.k}.mp3`);
      console.log(`           ${n.label}  (${verdict})`);
    }
  }
  console.log('');
}

/* ---- titles the slug rule can't express at all ---- */
const unslugglable = SONGS.filter(s => !audioSlug(s.title).replace(/-/g, ''));
if (unslugglable.length) {
  console.log('These titles produce an empty slug, so NO filename can ever match them.');
  console.log('Give them an "audio" column on the sheet instead — the sync reads it:');
  unslugglable.forEach(s => console.log(`  - ${s.title}`));
}
