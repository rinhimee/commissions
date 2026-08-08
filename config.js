/* ============================================================
   config.js  —  everything you'll want to change lives here.
   Edit this file, save, refresh. No build step.
   ============================================================ */

window.SITE_CONFIG = {

  /* ---- your name / branding ---------------------------------- */
  brandName: "rin姫",

  /* ---- links ------------------------------------------------- */
  /* Put your real URLs here. Leave a value as "" to hide that
     button entirely.                                             */
  links: {
    youtube:  "https://www.youtube.com/@rinhimee",
    twitter:  "https://twitter.com/rinhimeee",
    playlist: "https://www.youtube.com/playlist?list=PLuz26oh3FO6bmhE8yucWBNGczYidPLaG9"
  },

  /* ---- where requests go ------------------------------------- */
  /* Paste your Discord webhook URL between the quotes.
     Discord → Server Settings → Integrations → Webhooks → New Webhook
     → Copy Webhook URL.

     IMPORTANT: this file ships to the browser, so the webhook URL is
     public — anyone who views source can see it. That's normally fine
     (worst case someone spams that one channel and you delete + remake
     the webhook), but never reuse a webhook that posts anywhere
     sensitive. See README.md for a hardened option.

     Leave it as "" and the form falls back to a copy-to-clipboard
     summary the visitor can DM you — so the site still works today.  */
  discordWebhookUrl: "",

  /* Optional: ping yourself when a request lands.
     Your Discord user ID (Settings → Advanced → Developer Mode,
     then right-click your name → Copy User ID). Leave "" for no ping. */
  discordPingUserId: "",

  /* ---- hero art ---------------------------------------------- */
  /* Drop your OC art into assets/ and put the filename here,
     e.g. "assets/oc.png". Leave "" to show the placeholder.       */
  heroImage: "assets/oc.png",
  heroImageAlt: "rin姫’s original character",

  /* ---- contact fallback (used in the no-webhook copy summary) -- */
  contactHandle: "@yourhandle on discord"
};
