import { describe, expect, it } from 'bun:test'
import { defaultEmojiImageHosts } from '../../defaults.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { unwrapEmojiImages } from './unwrapEmojiImages.js'
import vocabularies from './unwrapEmojiImages.json' with { type: 'json' }

const asciiLetterRegex = /[a-zA-Z]/

describeForEachParser('unwrapEmojiImages', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [unwrapEmojiImages(context)])
  }

  describe('WordPress (wp-smiley class + s.w.org host)', () => {
    it('should replace wp-smiley image with alt emoji', async () => {
      const value = html`
        <p>Hello
        <img
          src="https://s.w.org/images/core/emoji/17.0.2/72x72/1f609.png"
          alt="😉"
          class="wp-smiley"
        >
        </p>
      `
      const expected = '<p>Hello 😉</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should replace multiple wp-smiley images in the same paragraph', async () => {
      const value = html`
        <p>
          <img alt="😉" class="wp-smiley"> and <img alt="😊" class="wp-smiley">
        </p>
      `
      const expected = '<p>😉 and 😊</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should handle wp-smiley alongside additional classes', async () => {
      const value = '<p><img alt="😀" class="wp-smiley emoji extra"></p>'
      const expected = '<p>😀</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should replace newer WP variant with class="emoji"', async () => {
      const value = html`
        <p>
          <img
            class="emoji"
            role="img"
            draggable="false"
            src="https://s.w.org/images/core/emoji/16.0.1/svg/1f914.svg"
            alt="🤔"
          >
        </p>
      `
      const expected = '<p>🤔</p>'

      expect(await transform(value)).toBe(expected)
    })

    // WordPress does not always put the glyph in the alt: a shortcode outside our table and a
    // mis-encoded "?" both occur, and neither resolves. The image renders, so it stays.
    it('should leave a wp-smiley whose alt is an untabled shortcode alone', async () => {
      const value = html`
        <p>
          <img
            src="https://s.w.org/images/core/emoji/12.0.0-1/72x72/1f40d.png"
            alt=":snake:"
            class="wp-smiley"
          >
        </p>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should replace no-class WP variant matched by s.w.org URL', async () => {
      const value =
        '<p><img src="https://s.w.org/images/core/emoji/13.1.0/svg/1f680.svg" alt="🚀"></p>'
      const expected = '<p>🚀</p>'

      expect(await transform(value)).toBe(expected)
    })
  })

  describe('WordPress.com (wpcom-smileys Twemoji)', () => {
    it('should replace WordPress.com wpcom-smileys image', async () => {
      const value = html`
        <p>
          <img
            src="https://s0.wp.com/wp-content/mu-plugins/wpcom-smileys/twemoji/2/72x72/1f642.png"
            alt="🙂"
          >
        </p>
      `
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toBe(expected)
    })
  })

  describe('XenForo (sprite smilies: data-URI src + data-shortname)', () => {
    // The src is the 1x1 transparent GIF XenForo paints its sprite sheet behind, so these
    // render as nothing in a reader. Kept verbatim from a real feed.
    const spriteSource =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

    it('should replace a mapped sprite smilie with its glyph', async () => {
      const value = html`
        <p>Eigenwerbung...
          <img
            src="${spriteSource}"
            class="smilie smilie--sprite smilie--sprite8"
            alt=":D"
            title="Big grin    :D"
            loading="lazy"
            data-shortname=":D"
          >
        </p>
      `
      const expected = '<p>Eigenwerbung... 😃</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should match the shortname case-insensitively', async () => {
      const value = `<p><img src="${spriteSource}" data-shortname=":ROFLMAO:" alt=":ROFLMAO:"></p>`
      const expected = '<p>🤣</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should replace an unmapped sprite smilie with its literal shortname', async () => {
      const value = `<p><img src="${spriteSource}" data-shortname=":sk21_d1:" alt=":sk21_d1:"></p>`
      const expected = '<p>:sk21_d1:</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should never emit the title, which pads the name onto the shortcode', async () => {
      const value = html`
        <p>
          <img
            src="${spriteSource}"
            data-shortname=":confused:"
            alt=":confused:"
            title="Confused    :confused:"
          >
        </p>
      `
      const result = await transform(value)

      expect(result).toBe('<p>😕</p>')
      expect(result).not.toContain('Confused')
    })

    // Pre-2.2 boards and modified templates omit data-shortname. The image still paints
    // nothing, so the smilie class plus a mapped alt is what rescues it.
    it('should replace a sprite smilie that has no data-shortname', async () => {
      const value = `<p><img src="${spriteSource}" class="smilie smilie--sprite" alt=":D"></p>`
      const expected = '<p>😃</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should leave a sprite smilie untouched when nothing names it', async () => {
      const value = `<p><img src="${spriteSource}" class="smilie smilie--sprite"></p>`

      expect(await transform(value)).toBe(value)
    })

    it('should leave an inlined data-URI image untouched when it is too long to be a spacer', async () => {
      const value = `<p><img src="data:image/png;base64,${'A'.repeat(300)}" data-shortname=":D"></p>`

      expect(await transform(value)).toBe(value)
    })

    // The theme directory differs per board, so the `smilies` directory is what identifies a
    // self-hosted set. Converting these matches how phpBB's are already treated.
    it('should replace a self-hosted XenForo smilie from its theme directory', async () => {
      const value = html`
        <p>
          <img
            src="https://example.com/styles/default/xenforo/smilies/smile.png"
            class="smilie"
            alt=":)"
            data-shortname=":)"
          >
        </p>
      `
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should preserve position when the sprite is nested inside an anchor', async () => {
      const value = `<p><a href="/x">nice <img src="${spriteSource}" data-shortname=":)"> work</a></p>`
      const expected = '<p><a href="/x">nice 🙂 work</a></p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should be idempotent', async () => {
      const value = `<p>Hi <img src="${spriteSource}" data-shortname=":D" alt=":D"></p>`
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toBe(once)
    })
  })

  describe('JoyPixels CDN (host list)', () => {
    it('should replace an image whose alt is already the glyph', async () => {
      const value =
        '<p><img src="https://cdn.jsdelivr.net/joypixels/assets/6.6/png/unicode/64/1f642.png" alt="🙂"></p>'
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should replace an image whose alt is a shortcode in the table', async () => {
      const value = html`
        <p>
          <img
            src="https://cdn.jsdelivr.net/joypixels/assets/6.6/png/unicode/64/1f642.png"
            class="smilie smilie--emoji"
            alt=":)"
            data-shortname=":)"
          >
        </p>
      `
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toBe(expected)
    })

    // A known gap, kept deliberately. These CDNs name each file after the codepoints it
    // depicts, so this flag could be recovered from `1f1fa-1f1f8`. Decoding them cost about a
    // quarter of the transform and, measured on a 1/64 corpus sample of 18,225 CDN images, was
    // the only route for 0.36% of them. The image renders, so it is left alone instead.
    it('should leave an image with no usable alt alone rather than decode its filename', async () => {
      const value =
        '<p><img src="https://cdn.jsdelivr.net/joypixels/assets/6.6/png/unicode/64/1f1fa-1f1f8.png" alt=""></p>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave an unhosted image with a codepoint filename untouched', async () => {
      const value = '<p><img src="https://forum.example.com/assets/1f642.png" alt=":nope:"></p>'

      expect(await transform(value)).toBe(value)
    })
  })

  describe('phpBB (smilies class + /images/smilies/ path)', () => {
    it('should replace a smilie whose alt is a shortcode', async () => {
      const value = html`
        <p>
          <img
            class="smilies"
            src="https://example.com/images/smilies/icon_e_smile.gif"
            width="15"
            height="17"
            alt=":)"
            title="Smile"
          >
        </p>
      `
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should replace several smilies in one sentence', async () => {
      const value =
        '<p>See <img class="smilies" src="/images/smilies/icon_arrow.gif" alt=":arrow:"> and <img class="smilies" src="/images/smilies/icon_cool.gif" alt="8-)"></p>'
      const expected = '<p>See ➡️ and 😎</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should fall back to the filename when the alt is empty', async () => {
      const value = '<p><img class="smilies" src="/images/smilies/icon_wink.gif" alt=""></p>'
      const expected = '<p>😉</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should leave an unmapped smilie with its working image', async () => {
      const value =
        '<p><img class="smilies" src="/images/smilies/icon_mrgreen.gif" alt=":mrgreen:"></p>'

      expect(await transform(value)).toBe(value)
    })

    // The parent of the smilies directory is the theme name and differs per board, so these
    // are all the same set under different skins.
    it.each([
      '/themes/default/smilies/smile.png',
      '/dc2themes/mrvb6_sobre/smilies/smile.png',
      '/plxeditor/smilies/smile.png',
      '/style/BlueSky/smilies/smile.png',
    ])('should replace a smilie served from the theme directory %s', async (path) => {
      const value = `<p><img src="https://example.com${path}" alt=":)" class="smiley"></p>`

      expect(await transform(value)).toBe('<p>🙂</p>')
    })

    it.each([
      'smiley',
      'smilie',
      'mceSmilie',
    ])('should recognize the singular %s class other engines use', async (className) => {
      const value = `<p><img src="/x/smilies/wink.png" alt=";)" class="${className}"></p>`

      expect(await transform(value)).toBe('<p>😉</p>')
    })

    it('should leave a non-smilie image served from the smilies folder untouched', async () => {
      const value = '<p><img src="https://example.com/images/smilies/banner.png" alt="Banner"></p>'

      expect(await transform(value)).toBe(value)
    })
  })

  describe('IPS / Invision (data-emoticon + /uploads/emoticons/ path)', () => {
    it('should replace an emoticon whose alt is a shortcode', async () => {
      const value = html`
        <p>
          <img
            alt=":)"
            data-emoticon=""
            height="20"
            src="https://example.com/uploads/emoticons/default_smile.png"
            srcset="https://example.com/uploads/emoticons/smile@2x.png 2x"
            title=":)"
            width="20"
          >
        </p>
      `
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should resolve a stock filename once the default_ prefix is dropped', async () => {
      const value =
        '<p><img data-emoticon="true" src="https://example.com/uploads/emoticons/default_wink.png" alt=""></p>'
      const expected = '<p>😉</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should resolve a filename carrying a resolution variant suffix', async () => {
      const value =
        '<p><img data-emoticon="" src="https://example.com/uploads/emoticons/biggrin@2x.png" alt=""></p>'
      const expected = '<p>😃</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should leave a site-custom emoticon with its working image', async () => {
      const value =
        '<p><img alt=":yahoo:" data-emoticon="" src="https://example.com/uploads/emoticons/yahoo.png"></p>'

      expect(await transform(value)).toBe(value)
    })
  })

  describe('FluxBB / PunBB (/img/smilies/ path with word names)', () => {
    it('should replace a smilie named by a word rather than a shortcode', async () => {
      const value = html`
        <p>Compare the files
          <img src="https://example.com/forum/img/smilies/wink.png" width="15" height="15" alt="wink">
        </p>
      `
      const expected = '<p>Compare the files 😉</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should resolve from the filename when the alt is empty', async () => {
      const value = '<p><img src="https://example.com/forum/img/smilies/big_smile.png" alt=""></p>'
      const expected = '<p>😃</p>'

      expect(await transform(value)).toBe(expected)
    })

    // Forums translate the alt but keep the stock English filename, so a localized board
    // resolves through the filename and the table needs no translations of its own.
    it('should replace a smilie whose alt is localized but filename is not', async () => {
      const value = '<p><img src="https://example.com/forum/img/smilies/love.gif" alt="Hjärta"></p>'
      const expected = '<p>😍</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should replace a French-labelled smilie from its stock filename', async () => {
      const value =
        '<p><img src="https://example.com/img/smilies/big_smile.png" alt="fou" width="15"></p>'
      const expected = '<p>😃</p>'

      expect(await transform(value)).toBe(expected)
    })

    // base64 may contain `/`, so a stem parsed out of a data URI is a slice of the payload.
    it('should not answer an unmapped sprite from its own base64 payload', async () => {
      const value =
        '<p><img src="data:image/gif;base64,AAA/smile" data-shortname=":totally_custom:"></p>'
      const expected = '<p>:totally_custom:</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should leave a smilie from a custom theme pack with its working image', async () => {
      const value =
        '<p><img src="https://example.com/forum/img/smilies/haku/haku-smirk.svg" alt="壞笑"></p>'

      expect(await transform(value)).toBe(value)
    })
  })

  describe('WordPress (legacy wp-includes smilies)', () => {
    it('should replace a legacy smilie whose alt is a shortcode', async () => {
      const value = html`
        <p>
          <img
            src="https://example.com/wp-includes/images/smilies/icon_smile.gif"
            alt=":)"
            class="wp-smiley"
          >
        </p>
      `
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should leave the lossy mrgreen smilie with its working image', async () => {
      const value =
        '<p><img src="https://example.com/wp-includes/images/smilies/mrgreen.gif" alt=":mrgreen:" class="wp-smiley"></p>'

      expect(await transform(value)).toBe(value)
    })
  })

  describe('Serendipity and other engines named only by their path', () => {
    // None of these carry a usable class, so the smilie directory is the only signal. All three
    // spellings are in use in the wild.
    const pathCases: Array<[string, string, string]> = [
      ['Serendipity', 'http://example.com/templates/default/img/emoticons/wink.png', '😉'],
      [
        'Serendipity custom theme',
        'http://example.com/templates/schluetersde/img/emoticons/smile.png',
        '🙂',
      ],
      ['Drupal smileys module', 'http://example.com/misc/smileys/smile.png', '🙂'],
      ['blog smileys directory', 'http://example.com/images/smileys/big_smile.gif', '😃'],
    ]

    it.each(pathCases)('should replace a %s smilie', async (_engine, source, expected) => {
      const value = `<p><img src="${source}" alt=""></p>`

      expect(await transform(value)).toBe(`<p>${expected}</p>`)
    })

    it('should resolve a Tango icon-set filename once the face- prefix is dropped', async () => {
      const value =
        '<p><img class="wp-smiley" src="/wp-content/plugins/tango-smilies/tango/face-smile.png" alt=":)"></p>'

      expect(await transform(value)).toBe('<p>🙂</p>')
    })
  })

  describe('forum engines recognized by class, attribute or path', () => {
    // Each entry is markup as the engine actually emits it into feed content, so the awkward
    // parts are deliberate: MyBB's alt is an English name, vBulletin's is empty, FCKeditor
    // ships neither alt nor class, and IPB 2 puts the filename in the alt.
    const engineCases: Array<[string, string, string]> = [
      [
        'XenForo 1.x sprite',
        '<img src="styles/default/xenforo/clear.png" class="mceSmilieSprite mceSmilie7" alt=":p" title="Stick Out Tongue :p">',
        '😛',
      ],
      [
        'SMF',
        '<img src="https://example.com/forum/Smileys/default/wink.gif" alt=";)" title="Wink" class="smiley">',
        '😉',
      ],
      [
        'MyBB',
        '<img src="https://example.com/images/smilies/angry.gif" alt="Angry" title="Angry" class="smilie smilie_26">',
        '😠',
      ],
      [
        'vBulletin',
        '<img src="https://example.com/images/smilies/smile.gif" border="0" alt="" title="Smile" class="inlineimg">',
        '🙂',
      ],
      [
        'DokuWiki',
        '<img src="https://example.com/lib/images/smileys/smile.svg" class="icon smiley" alt=":-)">',
        '🙂',
      ],
      [
        'Vanilla',
        '<img class="emoji" src="https://example.com/resources/emoji/smile.png" title=":smile:" alt=":smile:" height="20">',
        '🙂',
      ],
      [
        'CKEditor',
        '<img src="/ckeditor/plugins/smiley/images/regular_smile.gif" title="smiley" alt="smiley">',
        '🙂',
      ],
      ['FCKeditor', '<img src="/editor/images/smiley/msn/wink_smile.gif">', '😉'],
      ['TinyMCE 4', '<img src="/tinymce/plugins/emoticons/img/smiley-cool.gif" alt="cool">', '😎'],
      [
        'Invision Power Board 3',
        '<img src="/public/style_emoticons/default/smile.png" class="bbc_emoticon" alt=":)">',
        '🙂',
      ],
      [
        'Invision Power Board 2',
        '<img src="/style_emoticons/default/smile.gif" emoid=":)" alt="smile.gif">',
        '🙂',
      ],
      [
        'e107',
        '<img class="e-emoticon" src="/e107_images/emotes/default/smile.png" alt="smile">',
        '🙂',
      ],
      [
        'Simple:Press',
        '<img src="/wp-content/forum-smileys/sf-wink.gif" width="15" class="sfimageleft" title="wink" alt="wink">',
        '😉',
      ],
    ]

    it.each(engineCases)('should replace a %s smilie', async (_engine, tag, expected) => {
      expect(await transform(`<p>${tag}</p>`)).toBe(`<p>${expected}</p>`)
    })
  })

  describe('Telegram (tg-emoji element)', () => {
    it('should replace the element with the glyph it wraps', async () => {
      const value = '<p>Nice work <tg-emoji emoji-id="5368324170671202286">👍</tg-emoji> today</p>'
      const expected = '<p>Nice work 👍 today</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should replace several elements in one paragraph', async () => {
      const value =
        '<p><tg-emoji emoji-id="1">🔥</tg-emoji><tg-emoji emoji-id="2">🎉</tg-emoji></p>'
      const expected = '<p>🔥🎉</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should preserve position inside a link', async () => {
      const value = '<p><a href="/x">go <tg-emoji emoji-id="1">👍</tg-emoji></a></p>'
      const expected = '<p><a href="/x">go 👍</a></p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should keep a multi-codepoint fallback intact', async () => {
      const value = '<p><tg-emoji emoji-id="1">👨‍👩‍👧</tg-emoji></p>'
      const expected = '<p>👨‍👩‍👧</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should emit the text of a fallback that is not an emoji', async () => {
      const value = '<p><tg-emoji emoji-id="1">[cat]</tg-emoji></p>'
      const expected = '<p>[cat]</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should flatten a fallback wrapped in another element', async () => {
      const value = '<p><tg-emoji emoji-id="1"><span>👍</span></tg-emoji></p>'
      const expected = '<p>👍</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should leave an empty element untouched', async () => {
      const value = '<p>a <tg-emoji emoji-id="1"></tg-emoji> b</p>'

      expect(await transform(value)).toBe(value)
    })

    // The facades this package rebuilds into real iframes are custom elements too, so the tag
    // list stays explicit rather than unwrapping anything hyphenated that wraps text.
    it('should leave other custom elements untouched', async () => {
      const value = html`
        <p>
          <lite-youtube videoid="dQw4w9WgXcQ"></lite-youtube>
          <my-widget>text</my-widget>
        </p>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should be idempotent', async () => {
      const value = '<p>Hi <tg-emoji emoji-id="1">👍</tg-emoji></p>'
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toBe(once)
    })
  })

  describe('images that must keep their picture', () => {
    // Custom emoji have no Unicode counterpart at all, so there is nothing to convert them to.
    it('should leave a Mastodon custom emoji untouched', async () => {
      const value = html`
        <p>
          <img
            rel="emoji"
            class="emojione"
            alt=":catjam:"
            src="https://files.mastodon.social/custom_emojis/images/000/224/097/original/d9c.gif"
          >
        </p>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should leave a Weibo emoticon with a bracketed localized alt untouched', async () => {
      const value =
        '<p><span class="url-icon"><img alt="[围观]" src="https://h5.sinaimg.cn/m/emoticon/icon/others/o_weiguan.png"></span></p>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave a site-custom smilie set untouched', async () => {
      const value = '<p><img src="http://example.com/smilies/yahoo_laughloud.gif" alt=":))"></p>'

      expect(await transform(value)).toBe(value)
    })
  })

  describe('shortcode table', () => {
    const shortcodeEntries = Object.entries(vocabularies.shortcodes)

    // Iterates the real table, so every entry is exercised and a new entry is covered
    // automatically. A value carrying ASCII letters would inject a word into the document,
    // and an empty one would strand the wrapper it sat in for stripEmptyTags to delete.
    it.each(shortcodeEntries)('should map %s to a bare glyph', (_shortcode, glyph) => {
      expect(glyph).not.toBe('')
      expect(glyph).not.toMatch(asciiLetterRegex)
    })

    it('should key every entry in lower case so lookups can normalize', () => {
      const keys = Object.keys(vocabularies.shortcodes)

      expect(keys).toEqual(keys.map((key) => key.toLowerCase()))
    })
  })

  describe('Discourse (emoji class with shortcode alt)', () => {
    it('should leave Discourse shortcode-alt with class="emoji" untouched', async () => {
      const value = '<p><img class="emoji" alt=":slight_smile:"></p>'

      expect(await transform(value)).toBe(value)
    })
  })

  describe('Facebook (embedded posts)', () => {
    it('should replace Facebook emoji image', async () => {
      const value = html`
        <p>
          <img
            height="16"
            width="16"
            alt="🙂"
            referrerpolicy="origin-when-cross-origin"
            src="https://static.xx.fbcdn.net/images/emoji.php/v9/t4c/1/16/1f642.png"
          >
        </p>
      `
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toBe(expected)
    })
  })

  describe('Twitter / X (embedded tweets)', () => {
    it('should replace Twitter/X emoji image', async () => {
      const value = '<p><img src="https://abs.twimg.com/emoji/v2/72x72/1f600.png" alt="😀"></p>'
      const expected = '<p>😀</p>'

      expect(await transform(value)).toBe(expected)
    })
  })

  describe('GitHub (gemoji README scrapings)', () => {
    it('should replace GitHub gemoji image when alt is the emoji glyph', async () => {
      const value = html`
        <p>
          <img
            src="https://github.githubassets.com/images/icons/emoji/unicode/1f680.png"
            alt="🚀"
          >
        </p>
      `
      const expected = '<p>🚀</p>'

      expect(await transform(value)).toBe(expected)
    })
  })

  describe('configurable host list', () => {
    // Iterates the real default list, so every entry is exercised and a new entry
    // is covered automatically.
    it.each(defaultEmojiImageHosts)('should replace an emoji image from %s', async (host) => {
      const value = `<p>Hi <img src="https://${host}1f642.png" alt="🙂"></p>`
      const expected = '<p>Hi 🙂</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should respect a custom host list override', async () => {
      const context: TransformContext = { ...baseContext, emojiImageHosts: [] }
      const value =
        '<p><img src="https://s.w.org/images/core/emoji/13.1.0/svg/1f680.svg" alt="🚀"></p>'

      expect(await transform(value, context)).toBe(value)
    })

    it('should replace images from a caller-added custom host', async () => {
      const context: TransformContext = { ...baseContext, emojiImageHosts: ['cdn.example.com'] }
      const value = '<p><img src="https://cdn.example.com/emoji/1f389.png" alt="🎉"></p>'
      const expected = '<p>🎉</p>'

      expect(await transform(value, context)).toBe(expected)
    })
  })

  describe('alt-shape guard', () => {
    it('should preserve multi-codepoint alt (ZWJ sequence)', async () => {
      const value = '<p><img alt="👨‍👩‍👧" class="wp-smiley"></p>'
      const expected = '<p>👨‍👩‍👧</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should preserve skin-tone modifier alt', async () => {
      const value = '<p><img alt="👋🏽" class="wp-smiley"></p>'
      const expected = '<p>👋🏽</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should preserve BMP-only emoji (length 1 in JS)', async () => {
      const value = '<p><img class="wp-smiley" alt="✔"></p>'
      const expected = '<p>✔</p>'

      expect(await transform(value)).toBe(expected)
    })

    // These are real alts from localized boards. The old guard accepted anything non-ASCII
    // without ASCII letters, so each was injected into the text in place of its image.
    it.each([
      '壞笑',
      'улыбка',
      '笑顔',
      'χαμόγελο',
    ])('should leave image untouched when alt is the localized word %s', async (alt) => {
      const value = `<p><img src="emoji.png" alt="${alt}" class="wp-smiley"></p>`

      expect(await transform(value)).toBe(value)
    })

    // A subdivision flag is a base flag plus tag characters spelling the region code, so the
    // guard has to accept a class of character that appears in nothing else.
    it.each([
      '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
      '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
    ])('should replace image when alt is the subdivision flag %s', async (flag) => {
      const value = `<p><img class="wp-smiley" src="/f.png" alt="${flag}"></p>`

      expect(await transform(value)).toBe(`<p>${flag}</p>`)
    })

    it('should leave image untouched when alt is a lone digit without a keycap', async () => {
      const value = '<p><img src="emoji.png" alt="7" class="wp-smiley"></p>'

      expect(await transform(value)).toBe(value)
    })

    it('should replace image when alt is several emoji separated by a space', async () => {
      const value = '<p><img src="emoji.png" alt="🙂 🎉" class="wp-smiley"></p>'
      const expected = '<p>🙂 🎉</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should leave image untouched when alt has mixed text', async () => {
      const value = '<p><img class="emoji" alt="hello 🐱"></p>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave image untouched when alt is empty', async () => {
      const value = '<p><img src="emoji.png" alt="" class="wp-smiley"></p>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave image untouched when alt is ASCII-only', async () => {
      const value = '<p><img src="emoji.png" alt="x" class="wp-smiley"></p>'

      expect(await transform(value)).toBe(value)
    })

    it('should never emit a "?" fallback alt as text', async () => {
      const value = '<p><img src="smilies/broken.png" alt="?" class="wp-smiley"></p>'

      expect(await transform(value)).toBe(value)
    })

    // A "?" alt is WordPress failing to encode the emoji it meant. The filename still names the
    // codepoint, but decoding it is not worth its cost, so the image is left as it is.
    it('should leave an image with a "?" fallback alt alone', async () => {
      const value = html`
        <p>
          <img
            src="https://s.w.org/images/core/emoji/2.4/72x72/1f642.png"
            class="size_orig"
            alt="?"
          >
        </p>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should leave image untouched when alt attribute is missing', async () => {
      const value = '<p><img src="emoji.png" class="wp-smiley"></p>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave non-emoji images untouched', async () => {
      const value = '<p><img src="photo.jpg" alt="cat photo"></p>'

      expect(await transform(value)).toBe(value)
    })
  })

  describe('positional preservation', () => {
    it('should preserve position when emoji is nested inside an anchor', async () => {
      const value = '<p><a href="/x">click <img alt="🚀" class="wp-smiley"> here</a></p>'
      const expected = '<p><a href="/x">click 🚀 here</a></p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should preserve position when emoji is nested inside strong', async () => {
      const value = '<p><strong>wow <img alt="🎉" class="wp-smiley"></strong></p>'
      const expected = '<p><strong>wow 🎉</strong></p>'

      expect(await transform(value)).toBe(expected)
    })
  })

  it('should be idempotent', async () => {
    const value = html`
      <p>Hello
        <img
          src="https://s.w.org/images/core/emoji/17.0.2/72x72/1f609.png"
          alt="😉"
          class="wp-smiley"
        >
      </p>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
