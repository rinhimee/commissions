/* ============================================================
   content.js  —  pricing, add-ons, and FAQ copy.
   ------------------------------------------------------------
   These lists are the single source of truth: the pricing
   section and the request form both read from them, so
   editing here updates both places at once.
   ============================================================ */

/* The three headline price cards. */
window.PRICE_TIERS = [
  {
    kicker: "harmony guide",
    price: "$20+",
    tone: "teal",
    desc: "1:1 with the original, each part on its own track. final price scales with complexity."
  },
  {
    kicker: "vocal arrangement",
    price: "$40+",
    tone: "rose",
    desc: "original harmonies and adlibs written for your range. quoted per song."
  },
  {
    kicker: "catalog song",
    price: "10–50% off",
    tone: "rose-deep",
    desc: "anything in the catalog above. the discount depends on how much is already done."
  }
];

/* Main melody guide options. `value` is what gets sent in the request. */
window.MELODY_OPTIONS = [
  { value: "full",    label: "full",    price: "+$20", desc: "the complete lead vocal recorded start to finish." },
  { value: "partial", label: "partial", price: "+$10", desc: "lead vocal only in the sections where harmonies happen." },
  { value: "none",    label: "none",    price: "free", desc: "harmony stems only — you already know the melody." }
];

/* Add-ons. Multi-select in the form. */
window.ADDONS = [
  { key: "monetized",  label: "monetized content",          price: "+50%",  desc: "your cover will run ads or be monetized on any platform." },
  { key: "commercial", label: "commercial / merchandising", price: "+100%", desc: "the cover is sold, licensed, or used on merch or paid releases." },
  { key: "rush",       label: "rush delivery",              price: "+100%", desc: "guaranteed turnaround within 3 days of payment." },
  { key: "anonymity",  label: "anonymity fee / no credit",  price: "+100%", desc: "i stay uncredited and won't post the guide anywhere." }
];

/* Turnaround copy shown in the form, depending on what's being requested. */
window.TURNAROUND = {
  catalog:     "already in the catalog — usually 1–5 days, at 10–50% off the normal rate.",
  arrangement: "new vocal arrangement — estimated 2–4 weeks.",
  harmony:     "new harmony guide — estimated 1–2 weeks."
};

/* FAQ accordion. Add or remove entries freely. */
window.FAQS = [
  {
    q: "can you write the main melody for a song i'm making?",
    a: "that's a topline commission, not a harmony guide — different service, and this catalog isn't set up for it. reach out to me directly and we can talk about it separately."
  },
  {
    q: "what files do i actually get?",
    a: "labelled WAV stems, one per harmony part, plus an mp3 of everything stacked so you can hear the intended blend. if you want a different format or a rough mix, just ask."
  },
  {
    q: "do you sing on my cover?",
    a: "no — the guides are reference tracks for you to learn and re-record in your own voice. they're not meant to be used as the final vocals."
  },
  {
    q: "can you transpose it to my key?",
    a: "yes, tell me your key or your comfortable range in the request form and i'll chart it there from the start."
  },
  {
    q: "how many revisions do i get?",
    a: "one round of tweaks is included — fixing a part that sits awkwardly, adjusting a stack, that kind of thing. bigger rewrites get quoted as a new arrangement."
  },
  {
    q: "my song's already in the catalog — how much cheaper is it?",
    a: "somewhere between 10% and 50% off, depending on how much of the work is already done. a song with a finished arrangement on hand is the cheapest; one where i only have a partial chart is closer to full price. i'll tell you the exact number in the quote."
  },
  {
    q: "can i request a specific cover's arrangement instead of the original?",
    a: "yes, link the cover in your request. transcribing someone else's arrangement takes about the same effort as the original, so it's priced the same."
  },
  {
    q: "do you take group or collab covers?",
    a: "absolutely — tell me how many singers and roughly who's taking which part, and i'll chart the stacks so each person has their own track."
  },
  {
    q: "how do i pay?",
    a: "paypal invoice after we've agreed on the quote. files go out once it's paid."
  }
];
