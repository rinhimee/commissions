/* ============================================================
   catalog.js  —  GENERATED FILE, DO NOT EDIT BY HAND.

   This is rewritten from the Google Sheet by tools/sync-catalog.mjs.
   Any edit you make here will be overwritten on the next sync.
   Edit the sheet instead:
   https://docs.google.com/spreadsheets/d/1rOM4CN55lDevXwFhGjBj2n_dXMZftuS5Qk9uyVWhRVI/edit
   ============================================================ */

window.SONGS = [
  {
    id: 1,
    title: "Ah, It's A Wonderful Cat's Life",
    artist: "Nem",
    language: "JP",
    harmony: null,
    arrangements: [
      {
        complexity: "semi-complex",
        client: "Pippa Pipkin & Tenma Maemi (Phase Connect)",
        yt: "IWN_qnDpFA4"
      }
    ]
  },
  {
    id: 2,
    title: "Ai Scream!",
    artist: "AiScReam",
    language: "JP",
    harmony: {
      complexity: "simple"
    },
    arrangements: []
  },
  {
    id: 3,
    title: "Birds Of Time",
    artist: "Enna Alouette",
    language: "EN",
    harmony: {
      complexity: "complex"
    },
    arrangements: []
  },
  {
    id: 4,
    title: "Bow and Arrow",
    artist: "Kenshi Yonezu",
    language: "JP",
    harmony: null,
    arrangements: [
      {
        complexity: "simple",
        tracks: 11,
        client: "Seion Aera",
        yt: "nv16lEAdZH4",
        audio: "audio/bow-and-arrow-1.mp3"
      }
    ]
  },
  {
    id: 5,
    title: "check",
    artist: "bbno$",
    language: "EN",
    harmony: null,
    arrangements: [
      {
        complexity: "simple"
      }
    ]
  },
  {
    id: 6,
    title: "Cherry Pop",
    artist: "DECO*27",
    language: "JP",
    harmony: {
      complexity: "simple"
    },
    arrangements: []
  },
  {
    id: 7,
    title: "Come Play",
    artist: "Stray Kids, Young Miko, and Tom Morello / Arcane",
    language: ["ES", "EN", "KR"],
    harmony: {
      complexity: "simple"
    },
    arrangements: []
  },
  {
    id: 8,
    title: "I Really Want To Stay At Your House",
    artist: "Rosa Walton / Cyberpunk 2077",
    language: "EN",
    harmony: null,
    arrangements: [
      {
        complexity: "simple",
        yt: "UA4P9pZOuHQ"
      }
    ]
  },
  {
    id: 9,
    title: "Kono Yoru Ni Kanpai",
    artist: "Megatera Zero",
    language: "JP",
    harmony: {
      complexity: "semi-complex"
    },
    arrangements: []
  },
  {
    id: 10,
    title: "Like A Sunny Day, Like A Rainy Day",
    artist: "Silence Wang",
    language: "CN",
    harmony: {
      complexity: "semi-complex"
    },
    arrangements: []
  },
  {
    id: 11,
    title: "Risk It All",
    artist: "Bruno Mars",
    language: "EN",
    harmony: null,
    arrangements: [
      {
        complexity: "semi-complex"
      }
    ]
  },
  {
    id: 12,
    title: "Shoujo Rei",
    artist: "mikitoP",
    language: "JP",
    harmony: {
      complexity: "simple"
    },
    arrangements: [
      {
        complexity: "simple",
        yt: "QLo9oX39h00"
      }
    ]
  },
  {
    id: 13,
    title: "Soda Pop",
    artist: "Saja Boys / K-Pop Demon Hunters",
    language: ["KR", "EN"],
    harmony: {
      complexity: "semi-complex"
    },
    arrangements: []
  },
  {
    id: 14,
    title: "The Cruel Angel's Thesis",
    artist: "Yoko Takahashi",
    language: "JP",
    harmony: {
      complexity: "semi-complex"
    },
    arrangements: []
  }
];

/* Add a language by adding a line to the object below.

   flag   the emoji shown next to the song
   short  the little code on each catalog row  ("JP", "ENG", "CN", "KR")
   name   the full word, used in the filter dropdown

   A song can be in more than one language — see "Come Play" below, whose
   `language` is an array. The filter matches if ANY of them is ticked.

   Flag emoji only render as pictures on Windows because index.html loads
   Google's "Noto Color Emoji" webfont — Windows itself ships no flag glyphs
   and would otherwise draw the JP flag as the bare letters "JP".        */
window.LANGUAGES = {
  JP: { flag: "🇯🇵", short: "JP",  name: "japanese" },
  EN: { flag: "🇺🇸", short: "ENG", name: "english"  },
  KR: { flag: "🇰🇷", short: "KR",  name: "korean"   },
  CN: { flag: "🇨🇳", short: "CN",  name: "chinese"  },
  ES: { flag: "🇪🇸", short: "ESP", name: "spanish"  }
};
