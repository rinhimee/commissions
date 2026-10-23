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
  { value: "none",    label: "None",    price: "free", desc: "Harms only — you already know the melody!" }
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
  catalog:     "Estimated turnaround time: 1–5 days.",
  arrangement: "Estimated turnaround time: 2–4 weeks.",
  harmony:     "Estimated turnaround time: 1–2 weeks."
};

/* FAQ accordion. Add or remove entries freely. */
window.FAQS = [
  {
    q: "How will I receive the guides?",
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
    q: "Can you record the guides with these translyrics?",
    a: "As long as you have permission! However, I will base the harmonies and adlibs off of the original song."
  },
  {
    q: "Can you split the guides between X people?",
    a: "Yes, and I can customize them to your ranges, too, upon request. However, depending how much extra labor is involved, I may request an additional fee."
  },
  {
    q: "How do I pay?",
    a: "I will provide a PayPal invoice after a quote has been approved."
  },
  {
    q: "Do you take partial payment/payment plans?",
    a: "I accept two forms of payment: (1) a 100% upfront deposit, and (2) a 50% upfront deposit / 50% remainder after the guide preview has been approved. Please note that I will begin work only after the first payment has been completed, and I will not send you the files until the final payment has been sent."
  }
];


/* ============================================================
   TERMS
   Rendered under the FAQ. Where these overlap with an FAQ answer,
   the FAQ is the fuller version and wins — the entries here stay
   deliberately short and point at it rather than restating numbers
   that would then have two sources of truth.
   ============================================================ */
window.TERMS = [
  {
    h: "general",
    items: [
      "I may turn down a commission if I don't feel I'm the right fit for the project.",
      "Please pass the harmony guides on to whoever is tuning your vocals \u2014 every zip includes a readme with the tuning and timing notes below."
    ],
    note: "<strong>Tuning.</strong> Tune to the guides exactly 1:1. There are often crunchy chords that sound wrong if one note is slightly off.<br><br><strong>Timing.</strong> The guides are rough-timed \u2014 close enough to decipher, but there may be syncopated or rhythmic adlibs, adlibs moving in opposition to each other, or staggered / waterfall adlibs. If you're unsure about timing, check the full-guide preview to hear how it all sits together."
  },
  {
    h: "payments",
    items: [
      "Quotes are non-committal. If one lands outside your budget, just say so \u2014 it's genuinely not a problem.",
      "For complex or original arrangements you're welcome to name your budget instead, and we'll scope the complexity to fit it.",
      "Two ways to pay: the full amount upfront, or 50% deposit and 50% on completion.",
      "Invoicing is through PayPal."
    ]
  },
  {
    h: "deadlines and delivery",
    items: [
      "Turnaround depends on what's being made \u2014 the estimate shown on the request form is the one that applies to your project.",
      "If you have a hard deadline, put it in the request form so I can tell you upfront whether it's doable.",
      "Everything is recorded rather than programmed, so timing or pronunciation may be very slightly off."
    ]
  },
  {
    h: "revisions",
    items: [
      "Revisions are welcome \u2014 see the FAQ for what's included free and what counts as a major revision.",
      "Major additions that weren't part of the original request, or significant rewrites, may incur an additional fee."
    ]
  },
  {
    h: "use and credit",
    items: [
      "Unless a no-credit fee has been paid, please credit me in the upload description as \u201cHarmony Guides: rin\u59EB\u201d or \u201cVocal Arrangement: rin\u59EB\u201d, depending on what was commissioned, along with a link to my Twitter.",
      "My vocals are a reference for you to learn and re-record in your own voice \u2014 they may not be used as anything else. If you'd like me to actually sing on your track, ask about vocal commissions."
    ]
  },
  {
    h: "intellectual property",
    items: [
      "Please don't share or redistribute my guides to anyone else. Doing so will result in being blacklisted.",
      "Songs I've already worked on are discounted \u2014 the FAQ explains how the discount is worked out."
    ]
  },
  {
    h: "refunds",
    items: [
      "Full refund, no questions, if I haven't started your commission yet.",
      "Once I've started, up to 50% can be refunded depending on how far along it is.",
      "Completed commissions can't be refunded."
    ]
  },
  {
    h: "communication",
    items: [
      "I'll reach out on whichever you gave me in the form \u2014 Discord or email.",
      "Please allow 1\u20133 days for a reply to an initial commission request. After that I'll do my best to answer within 24 hours.",
      "If I've gone quiet for too long, please bump your message \u2014 I'd much rather that than have you waiting.",
      "I'll expect replies from you within about 24 hours too, so nothing stalls mid-project."
    ]
  }
];
