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
    desc: "As close to 1:1 with the original harmonies and adlibs as possible."
  },
  {
    kicker: "vocal arrangement",
    price: "$40+",
    tone: "rose",
    desc: "Original harmonies and adlibs written with your voice, range, and preferences in consideration."
  },
  {
    kicker: "catalog song",
    price: "10–50% off",
    tone: "rose-deep",
    desc: "Anything in the catalog above will be discounted according to how much work is already done."
  }
];

/* Main melody guide options. `value` is what gets sent in the request. */
window.MELODY_OPTIONS = [
  { value: "full",    label: "Full",    price: "+$20", desc: "The complete lead vocal recorded start to finish." },
  { value: "partial", label: "Partial", price: "+$10", desc: "Lead vocal only in the sections where harmonies happen." },
  { value: "none",    label: "None",    price: "free", desc: "Harmony stems only — you already know the melody!" }
];

/* Add-ons. Multi-select in the form. */
window.ADDONS = [
  { key: "monetized",  label: "Monetized content",          price: "+50%",  desc: "Your cover will be monetized on any platform." },
  { key: "commercial", label: "Commercial / Merchandising", price: "+100%", desc: "The cover is sold, licensed, or used on merch or paid releases." },
  { key: "rush",       label: "Rush delivery",              price: "+100%", desc: "Guaranteed turnaround within 3 days of payment." },
  { key: "anonymity",  label: "Anonymity / No credit",  price: "+100%", desc: "I stay uncredited and won't post the guide anywhere." }
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
    q: "What files do I actually get?",
    a: "Each harmony and adlib is isolated onto individual tracks. You'll receive a zip file of labelled WAV stems, one per layer, as well as an mp3 preview of everything stacked so you can hear how it sounds together."
  },
  {
    q: "Can you write the main melody for a song I'm making?",
    a: "I'm not publicly open for toplining work, but I'm always willing to entertain inquiries for cool projects. Send in a request form under 'something else' and tell me what you're working on!"
  },
  {
    q: "Can I use your vocals?",
    a: "You may not use my vocals as anything other than a guide to reference as you learn and re-record in your own voice. Please inquire about vocal commissions if you'd like me to sing for your song."
  },
  {
    q: "Can you transpose it to my key?",
    a: "Yes, although there may be some distortion depending on the key, as I may have to record in the original key and transpose it artificially. Let me know what key you'd like (e.g. +2, -1) in the request form."
  },
  {
    q: "Do you accept revision requests?",
    a: "For harmony guides, I will happily tweak any missing or incorrect parts if you catch any! For vocal arrangements, things like fixing something that sits awkwardly, adjusting a stack, or even small additions are no issue. However, major additions that weren't requested from the start or significant rewrites may incur an additional cost."
  },
  {
    q: "Do you do discounts for TV-size requests?",
    a: "TV-size requests (under 1:30) will start at 15 USD, but please know that I will be selective with these requests. Generally, I will only accept a 'TV-size' request for pre-cut anime OP/EDs."
  },
  {
    q: "Will you work on just this specific part of a song for my TikTok/YouTube short cover?",
    a: "Generally, no, sorry."
  },
  {
    q: "How much do you charge for songs you've already worked on?",
    a: "Somewhere between 10% and 50% off, depending on how much of the work is already done. For example, if you want to purchase a harmony guide I've already worked on, the discount will be larger. Alternatively, if you want a harmony guide of something I've only done my own arrangement for, or you want a vocal arrangement for something I've only done a 1:1 guide for, the discount will be smaller. I'll tell you the exact number in the quote."
  },
  {
    q: "Can I request a specific cover's arrangement instead of the original?",
    a: "I do not transcribe other people's original vocal arrangements. If you'd like me to record the guides using translyrics someone else has publicly allowed use of, I can do that, but I will base the harmonies and adlibs off of the original song. If you like certain aspects of that cover, you can commission me for a vocal arrangement and I'll do my own take of it and do my best to accommodate your requests."
  },
  {
    q: "Do you take group or collab covers?",
    a: "Yes!"
  },
  {
    q: "Can you split the guides between X people?",
    a: "Yes, but depending on how much additional labor is involved, I may request an additional fee."
  },
  {
    q: "How do I pay?",
    a: "I will send you a PayPal invoice after we've agreed on the quote."
  },
  {
    q: "Do you take partial payment/payment plans?",
    a: "I accept two forms of payment: a 100% upfront deposit, and a 50% deposit + 50% after the guide preview has been approved. Please note that I will not begin work until the first payment has been completed, and I will not send you the files until the final payment has been completed."
  }
];
