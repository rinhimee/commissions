# harmony guides — commission site

A static site for harmony guide and vocal arrangement commissions. Plain HTML,
CSS, and JavaScript — no build step, no dependencies, no npm. Edit a file, save,
refresh the browser.

```
index.html            the page itself
config.js             ← your links, your Discord webhook, your art
assets/styles.css     all styling (design tokens live at the top)
assets/app.js         catalog, filters, modal, and the request form
data/catalog.js       ← your songs
data/content.js       ← pricing, add-ons, FAQ copy
audio/                ← song preview mp3s
.github/workflows/    auto-deploy to GitHub Pages on push
```

The three files with a ← are the ones you'll actually touch.

---

## Running it locally

Just double-click `index.html`. Everything works from the filesystem — there's no
server needed and no fetch calls to blocked local files.

If you'd rather have a proper local server (nicer for testing the Discord form):

```bash
python -m http.server 8000
# then open http://localhost:8000
```

---

## Setting up the request form

Requests post straight into a Discord channel as a formatted embed.

1. In Discord: **Server Settings → Integrations → Webhooks → New Webhook**
2. Pick the channel you want requests to land in, then **Copy Webhook URL**
3. Open `config.js` and paste it in:

```js
discordWebhookUrl: "https://discord.com/api/webhooks/....",
```

Optionally add your Discord user ID to `discordPingUserId` so each request pings
you. (Discord **Settings → Advanced → Developer Mode**, then right-click your own
name → **Copy User ID**.)

### Until you add a webhook

The form still works. With `discordWebhookUrl` left empty, submitting builds a
clean text summary the visitor can copy and DM you. It also falls back to this
automatically if Discord is ever unreachable, so a request is never just lost.

### About webhook security

`config.js` ships to the browser, so anyone who views source can read the webhook
URL. In practice this is fine for a commission site — the worst case is someone
posts junk into that one channel, and you delete the webhook and make a new one.
Two things to keep in mind:

- Point the webhook at a **channel you don't mind being public-ish** — not a
  private admin channel.
- Don't reuse a webhook that's doing anything else.

If it ever becomes a problem, the standard fix is a tiny Cloudflare Worker that
holds the URL server-side and forwards requests; then `discordWebhookUrl` points
at the Worker instead. Not needed on day one.

---

## Adding a song to the catalog

Open `data/catalog.js` and copy an existing block:

```js
{
  id: 11,                          // any number no other song uses
  title: "Song Title",
  artist: "Artist Name",
  language: "JP",                  // JP | EN | CN | KR
  harmony: { complexity: "simple" },   // or null if you don't have one
  arrangements: [
    {
      complexity: "simple",
      client: "someone",              // optional, shows as "for someone"
      yt: "dQw4w9WgXcQ",              // optional YouTube preview
      audio: "audio/my-song.mp3",     // optional audio preview
      label: "Custom name"            // optional, overrides the default title
    }
  ]
}
```

- `complexity` is free text — `"simple"`, `"semi-complex"`, `"complex"`, whatever
  you use. It shows on the row as-is.
- `yt` is the YouTube **video ID** only — the part after `v=` in the URL. Leave it
  out and the row just won't show a preview button.
- In the song popup each entry is titled **"Harmony Guide (1:1)"** or
  **"Vocal Arrangement (Omakase)"** automatically, with just the complexity on
  the line underneath. Set `label` on an entry to override that title.
- `tracks` is optional and works on both `harmony` and `arrangements`. Set it
  and the line reads "simple • 11 tracks"; leave it off and it's just the
  complexity.
- `client` is optional and renders as a small italic "for <name>" line under the
  complexity. Leave it off and nothing shows.
- If an entry has a `yt` link, its preview **opens automatically** when the song
  popup opens. The first one with a video wins if there are several.
- `audio` plays an inline preview inside the song popup. Drop the file in the
  `audio/` folder and point at it, e.g. `audio: "audio/bow-and-arrow-1.mp3"`.
  Works on `harmony` too, not just arrangements. MP3 is the safest format — every
  browser plays it. A song can have both `yt` and `audio`.
- To add a language, add a line to `window.LANGUAGES` at the bottom of the file:

  ```js
  CN: { flag: "🇨🇳", short: "CN", name: "chinese" }
  ```

  `short` is the little code on each catalog row and in the song popup;
  `name` is the full word used in the filter dropdown. The dropdown builds
  itself from whatever languages your songs actually use, so adding a language
  here doesn't clutter the filter until a song uses it.
- Flag emoji work **because `index.html` loads Google's "Noto Color Emoji"
  webfont.** Windows ships no flag glyphs of its own, so without that font
  Chrome and Edge on Windows draw 🇯🇵 as the bare letters "JP". If you ever
  strip that font out, switch these to non-flag emoji.

## The catalog filters

Both filter dropdowns are multi-select — tick as many boxes as you like.
Nothing ticked means no filter. Ticking *japanese* and *english* shows songs in
either; ticking *harmony guide* and *vocal arrangement* shows songs that have
either. "clear filters" resets everything including the search box.

## Changing prices, add-ons, or the FAQ

All in `data/content.js`. The pricing section and the request form read from the
same lists, so an edit updates both at once — they can't drift apart.

## Your links and art

In `config.js`: `links.youtube`, `links.twitter`, `links.playlist` — all three
are filled in and live.

These buttons **always show**. While a URL is still `""` the button appears
dimmed with a dashed outline and does nothing when clicked — that's the visual
reminder that the slot needs a link. Paste a URL in and it turns into a normal
working button. To remove a button entirely rather than fill it, delete its
entry from the `defs` list in `initBranding()` in `assets/app.js`.

For the hero art, drop the image into `assets/` and set:

```js
heroImage: "assets/oc.png",
```

## Colors and fonts

Every color is a CSS custom property at the top of `assets/styles.css` under
`:root`. Change `--rose` in one place and every rose element follows.

---

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` is already set up. One-time setup on GitHub:

1. Push this repo to GitHub
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**
3. Push to `main`

Every push to `main` redeploys automatically. The Actions tab shows the run and
the live URL.

### Custom domain

Add a file named `CNAME` at the repo root containing just your domain
(`harmonyguides.com`), then set the domain under **Settings → Pages**.

---

## Notes on what's built in

- Live search across song title and artist, plus language and guide-type filters
- Song modal listing what's already on hand, with collapsible YouTube previews
  (privacy-friendly `youtube-nocookie` embeds, loaded only when opened)
- Request form that pre-fills song and artist from the catalog, and shows
  arrangement-only fields (range, budget, complexity, notes) only when relevant
- Keyboard accessible throughout: Escape closes the modal, Tab stays inside it,
  focus returns where it started
- Honeypot field to catch naive form bots
- Respects `prefers-reduced-motion` — animations switch off for anyone who's
  asked their OS for less motion
- Responsive down to phone widths; the modal goes full-screen on small screens
