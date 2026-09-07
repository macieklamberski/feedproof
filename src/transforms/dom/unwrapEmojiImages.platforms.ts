// One entry per platform whose emoji markup we recognize. The flat lookups the transform uses
// are derived from this.
//
// Each platform lists the filenames it actually ships, taken from its own distribution. Names
// repeat across platforms on purpose: `smile.png` really is shipped by four of these, and
// recording it four times keeps each list checkable against its source. A repeated name must
// agree on the glyph, which `mergeEmojiNames` asserts, because nothing in the markup says which
// engine produced a given image.
//
// A stock filename we deliberately do not map is left commented out in its own platform, with
// the reason on the same line, so a coverage audit sees the decision instead of an absence.
//
// Each `paths` entry is the narrowest segment that still matches every board of that platform.
// Some can be pinned exactly, others cannot because the directory above the smilies is the
// board's theme name.
//
// Names checked against the whole corpus and left out on purpose, so a later pass does not
// rediscover them as gaps:
//
// - `twisted` 😈, `shock` 😱, `oops` 😳, `roflmao` 🤣, `sleep` 😴, `coffee` ☕, `geek` 🤓,
//   `saint` 😇, `poop` 💩, `thumbsup` 👍, `thumbsdown` 👎. Each already resolves through the
//   shortcode table, so only the filename key is missing and the meaning is not in doubt. A
//   filename is matched across every engine at once, though, and several of these are ordinary
//   words: a `coffee.png` or `sleep.png` sitting in a matched directory would become an emoji.
//   Zero occurrences across 12.7M feeds, so the risk buys nothing.
// - `^^` cannot be mapped at all. It is an alt, and boards bind it to whichever emoticon they
//   like: the same alt appears over `default_cute`, `default_laugh`, `default_happy` and custom
//   uploads. Mapping it would also convert the `default_happy` ones, smuggling back the
//   ambiguity `happy` is excluded for.

export type EmojiPlatform = {
  name: string
  classes?: Array<string | RegExp>
  attributes?: Array<string>
  paths?: Array<string>
  names?: Record<string, string>
}

export const emojiPlatforms: Array<EmojiPlatform> = [
  {
    name: 'WordPress',
    classes: ['wp-smiley'],
    paths: [
      '/smilies/', // Both wp-includes and plugin icon sets sit under this directory.
    ],
    names: {
      icon_smile: '🙂',
      icon_wink: '😉',
      icon_biggrin: '😃',
      icon_sad: '🙁',
      icon_razz: '😛',
      icon_cool: '😎',
      icon_lol: '😄',
      icon_cry: '😢',
      icon_mad: '😠',
      icon_confused: '😕',
      icon_rolleyes: '🙄',
      icon_eek: '😲',
      icon_surprised: '😲',
      icon_neutral: '😐',
      icon_redface: '😳',
      icon_evil: '😈',
      icon_twisted: '😈',
      icon_idea: '💡',
      icon_exclaim: '❗',
      icon_question: '❓',
      // icon_mrgreen: the green is the whole joke, so there is nothing to convert it to.
    },
  },
  {
    name: 'phpBB',
    classes: ['smilies'],
    paths: [
      '/smilies/', // Cannot be narrowed: the theme directory above it differs per board.
    ],
    names: {
      icon_e_smile: '🙂',
      icon_e_wink: '😉',
      icon_e_biggrin: '😃',
      icon_e_sad: '🙁',
      icon_e_tongue: '😛',
      icon_e_cool: '😎',
      icon_e_confused: '😕',
      icon_e_surprised: '😲',
      icon_e_geek: '🤓',
      icon_e_ugeek: '🤓',
      icon_cool: '😎',
      icon_lol: '😄',
      icon_mad: '😠',
      icon_razz: '😛',
      icon_redface: '😳',
      icon_cry: '😢',
      icon_evil: '😈',
      icon_twisted: '😈',
      icon_rolleyes: '🙄',
      icon_eek: '😲',
      icon_exclaim: '❗',
      icon_question: '❓',
      icon_idea: '💡',
      icon_arrow: '➡️',
      icon_neutral: '😐',
      // icon_mrgreen: as above.
    },
  },
  {
    name: 'SMF',
    classes: ['smiley'],
    paths: ['/smileys/'],
    names: {
      smiley: '🙂',
      wink: '😉',
      cheesy: '😁',
      grin: '😁',
      angry: '😠',
      sad: '🙁',
      shocked: '😱',
      cool: '😎',
      huh: '😕',
      rolleyes: '🙄',
      tongue: '😛',
      embarrassed: '😳',
      lipsrsealed: '🤐',
      undecided: '😕',
      kiss: '😘',
      cry: '😢',
      evil: '😈',
      laugh: '😄',
      angel: '😇',
      // afro, azn, police: drawn characters with no Unicode counterpart.
    },
  },
  {
    name: 'MyBB',
    classes: ['smilie'],
    paths: [
      '/smilies/', // Served from images/smilies/, but themes move it.
    ],
    names: {
      smile: '🙂',
      wink: '😉',
      cool: '😎',
      biggrin: '😃',
      tongue: '😛',
      rolleyes: '🙄',
      shy: '😊',
      sad: '🙁',
      angel: '😇',
      angry: '😠',
      blush: '😊',
      confused: '😕',
      exclamation: '❗',
      heart: '❤️',
      huh: '😕',
      lightbulb: '💡',
      sleepy: '😴',
      undecided: '😕',
      cry: '😢',
      sick: '🤢',
      arrow: '➡️',
      // at, my: MyBB-specific oddities with nothing to convert to.
      // dodgy: a shifty look, between 😏 and 😒 with no clear winner.
    },
  },
  {
    name: 'FluxBB and PunBB',
    paths: [
      '/img/smilies/', // Fixed at the install root, so the narrow form is safe here.
    ],
    names: {
      smile: '🙂',
      neutral: '😐',
      sad: '🙁',
      big_smile: '😃',
      yikes: '😱',
      wink: '😉',
      hmm: '🤔',
      tongue: '😛',
      lol: '😄',
      mad: '😠',
      roll: '🙄',
      cool: '😎',
    },
  },
  {
    name: 'DokuWiki',
    classes: ['smiley'],
    paths: [
      '/smileys/', // Served from lib/images/smileys/.
    ],
    names: {
      cool: '😎',
      eek: '😲',
      sad: '🙁',
      smile: '🙂',
      smile2: '🙂',
      doubt: '😕',
      doubt2: '😕',
      confused: '😕',
      biggrin: '😃',
      razz: '😛',
      surprised: '😲',
      silenced: '🤐',
      neutral: '😐',
      wink: '😉',
      facepalm: '🤦',
      fun: '😄',
      question: '❓',
      exclaim: '❗',
      lol: '😄',
      // fixme, deleteme: editorial workflow markers shipped alongside the smilies, not emoji.
    },
  },
  {
    name: 'e107',
    classes: ['e-emoticon'],
    paths: ['/emotes/'],
    names: {
      alien: '👽',
      amazed: '😲',
      angry: '😠',
      biglaugh: '😆',
      cheesey: '😁', // Misspelled in the distribution; keyed as shipped.
      suprised: '😲', // Same.
      confused: '😕',
      cry: '😢',
      frown: '🙁',
      grin: '😁',
      heart: '❤️',
      idea: '💡',
      mad: '😠',
      neutral: '😐',
      question: '❓',
      rolleyes: '🙄',
      sad: '🙁',
      shades: '😎',
      shy: '😊',
      smile: '🙂',
      tongue: '😛',
      wink: '😉',
      // dead, dodge, gah, ill, mistrust, special: no unambiguous counterpart.
    },
  },
  {
    name: 'Serendipity',
    paths: [
      '/emoticons/', // Both the stock template set and the emoticate plugin serve from here.
    ],
    names: {
      normal: '😐', // Its config binds this to `:-|`.
      unhappy: '🙁', // And this to `:(`.
      haha: '😄',
      // happy: bound to `:)` here, but to `;D`, `XD` and `^_^` on other boards. Second engine
      // to confirm the name cannot be resolved from the filename alone.
      // anger, shame: each sits between two glyphs already used for near-synonyms, so the
      // filename does not pick one.
      // grmpf, grrr, hero, ko, safe, still, whistle: no Unicode counterpart.
    },
  },
  {
    name: 'Khoros and Lithium',
    paths: [
      '/i/smilies/', // Fixed across boards, so it narrows where the theme-relative ones cannot.
    ],
    names: {
      '16x16_smiley-happy': '🙂',
      '16x16_smiley-wink': '😉',
      '16x16_smiley-very-happy': '😃',
      '16x16_smiley-tongue': '😛',
      '16x16_smiley-sad': '🙁',
      '16x16_smiley-surprised': '😲',
      '16x16_smiley-lol': '😄',
      '16x16_smiley-embarrassed': '😳',
      '16x16_smiley-indifferent': '😐',
      '16x16_heart': '❤️',
      '16x16_cat-happy': '😺',
      '16x16_cat-very-happy': '😸',
      '16x16_cat-lol': '😹',
      // 16x16_smiley-frustrated: annoyed, weary and pouting are all defensible.
      // 16x16_cat-wink, -tongue, -embarrassed: Unicode's cat faces stop at the three smiles
      // above, so these would change the expression. _woman-*, _man-*, _robot-*: no such faces
      // at all.
    },
  },
  {
    name: 'CKEditor, FCKeditor and TinyMCE',
    paths: [
      '/smiley/', // ProBoards serves the same set from here.
    ],
    names: {
      regular_smile: '🙂',
      teeth_smile: '😃',
      wink_smile: '😉',
      sad_smile: '🙁',
      cry_smile: '😢',
      angry_smile: '😠',
      confused_smile: '😕',
      omg_smile: '😲',
      shades_smile: '😎',
      angel_smile: '😇',
      devil_smile: '😈',
      tongue_smile: '😛',
      tounge_smile: '😛', // Misspelled upstream, and four times rarer than the corrected name.
      embaressed_smile: '😳', // Same.
      embarrassed_smile: '😳',
      broken_heart: '💔',
      envelope: '✉️',
      kiss: '😘',
      lightbulb: '💡',
      thumbs_up: '👍',
      thumbs_down: '👎',
    },
  },
  {
    name: 'Invision Power Board and IPS',
    classes: ['bbc_emoticon'],
    attributes: ['data-emoticon'],
    paths: [
      '/emoticons/',
      '/style_emoticons/', // IPB 2 and 3, which the plural form above misses.
    ],
  },
  {
    name: 'XenForo',
    paths: [
      '/smilies/', // Cannot be narrowed either: styles/<theme>/xenforo/smilies/.
    ],
    classes: [
      'smilie',
      /^mcesmilie/, // 1.x numbers them, as in `mceSmilieSprite mceSmilie7`.
    ],
  },
  {
    name: 'Vanilla',
    paths: [
      '/resources/emoji/', // The only signal, since Vanilla's class is the generic `emoji`.
    ],
    names: {
      'simple-smile': '🙂',
      'tongue-out': '😛',
      'money-mouth': '🤑',
    },
  },
  {
    name: 'ArtStation',
    paths: [
      '/mailer/emoji/', // Also only the generic class, with a stock name in the filename.
    ],
  },
  {
    name: 'Simple:Press',
    paths: [
      'forum-smileys/', // No leading slash before the directory.
    ],
  },
  {
    name: 'Serendipity, Drupal and Kunena',
    paths: ['/emoticons/', '/smileys/'],
    names: {
      unsure: '😕', // Kunena's, seen at /media/kunena/emoticons/unsure.png.
    },
  },
  {
    name: 'phpBB template variable left unsubstituted',
    paths: [
      'SMILIES_PATH', // Raw or percent-encoded, since the braces may arrive escaped.
    ],
  },
  {
    // Filenames observed in real feeds whose engine was never pinned down. Kept apart from the
    // lists above so those stay verifiable against a distribution, and this stays honest about
    // being unattributed.
    name: 'observed in feeds, engine not identified',
    names: {
      clap: '👏', // Boards add it to several engines' sets; 293 feeds, always applause.
      laughing: '😄',
      ohmy: '😲',
      dizzy: '😵',
      thumbup: '👍',
      thumbdown: '👎',
      love: '😍',
      redface: '😳',
      innocent: '😇',
      devil: '😈',
      yell: '😡',
      // happy: means :BOL, ;D, XD, :) and ^_^ on different boards, so it cannot be resolved
      // from the filename alone.
    },
  },
]
