import { describe, expect, it } from 'bun:test'
import { defaultEmojiImageHosts } from '../../defaults.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { unwrapEmojiImages } from './unwrapEmojiImages.js'
import vocabularies from './unwrapEmojiImages.json' with { type: 'json' }

const { shortcodes } = vocabularies

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

    it('should leave a sprite smilie without data-shortname untouched', async () => {
      const value = `<p><img src="${spriteSource}" class="smilie smilie--sprite" alt=":D"></p>`

      expect(await transform(value)).toBe(value)
    })

    it('should leave an inlined data-URI image untouched when it is too long to be a spacer', async () => {
      const value = `<p><img src="data:image/png;base64,${'A'.repeat(300)}" data-shortname=":D"></p>`

      expect(await transform(value)).toBe(value)
    })

    it('should leave a hosted XenForo smilie with a shortcode alt untouched', async () => {
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

      expect(await transform(value)).toBe(value)
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

  describe('JoyPixels CDN (codepoint filenames)', () => {
    it('should decode a codepoint filename when the alt is a shortcode', async () => {
      const value = html`
        <p>
          <img
            src="https://cdn.jsdelivr.net/joypixels/assets/6.6/png/unicode/64/1f642.png"
            class="smilie smilie--emoji"
            loading="lazy"
            width="64"
            height="64"
            alt=":)"
            title="Smile    :)"
            data-shortname=":)"
          >
        </p>
      `
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should decode a flag built from regional indicators', async () => {
      const value =
        '<p><img src="https://cdn.jsdelivr.net/joypixels/assets/6.6/png/unicode/64/1f1fa-1f1f8.png" alt=":us:"></p>'
      const expected = '<p>🇺🇸</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should decode a skin-tone and gender ZWJ sequence', async () => {
      const value =
        '<p><img src="https://cdn.jsdelivr.net/joypixels/assets/6.6/png/unicode/64/1f926-1f3fb-200d-2640-fe0f.png" alt=":facepalm:"></p>'
      const expected = '<p>🤦🏻‍♀️</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should restore the variation selector a keycap filename omits', async () => {
      const value =
        '<p><img src="https://cdn.jsdelivr.net/joypixels/assets/6.6/png/unicode/64/0031-20e3.png" alt=":one:"></p>'
      const result = await transform(value)

      expect(result).toBe('<p>1️⃣</p>')
      expect(result).not.toBe('<p>1⃣</p>')
    })

    it('should pin a lone text-presentation symbol to its emoji form', async () => {
      const value =
        '<p><img src="https://cdn.jsdelivr.net/joypixels/assets/6.6/png/unicode/64/2764.png" alt=":heart:"></p>'
      const expected = '<p>❤️</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should prefer a glyph alt over the filename codepoints', async () => {
      const value =
        '<p><img src="https://cdn.jsdelivr.net/joypixels/assets/6.6/png/unicode/64/0031-20e3.png" alt="1️⃣"></p>'
      const expected = '<p>1️⃣</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should decode past a query string', async () => {
      const value =
        '<p><img src="https://cdn.jsdelivr.net/joypixels/assets/6.6/png/unicode/64/1f642.png?v=2" alt=":)"></p>'
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should leave a filename that is hexadecimal only by coincidence untouched', async () => {
      const context: TransformContext = { ...baseContext, emojiImageHosts: ['cdn.example.com'] }
      const value = '<p><img src="https://cdn.example.com/photo-1920.png" alt="a photo"></p>'

      expect(await transform(value, context)).toBe(value)
    })

    it('should leave a filename decoding outside the emoji ranges untouched', async () => {
      const context: TransformContext = { ...baseContext, emojiImageHosts: ['cdn.example.com'] }
      const value = '<p><img src="https://cdn.example.com/1920.png" alt=":x:"></p>'

      expect(await transform(value, context)).toBe(value)
    })

    // Twemoji, which WordPress core and WordPress.com both serve, strips leading zeros.
    it('should decode a short-hex filename that drops leading zeros', async () => {
      const value =
        '<p><img src="https://s.w.org/images/core/emoji/15.0.3/72x72/a9.png" alt="?" class="wp-smiley"></p>'
      const expected = '<p>©️</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should decode a short-hex keycap filename', async () => {
      const value =
        '<p><img src="https://s.w.org/images/core/emoji/15.0.3/72x72/23-20e3.png" alt="?" class="wp-smiley"></p>'
      const expected = '<p>#️⃣</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should leave a filename decoding to a bare digit untouched', async () => {
      const context: TransformContext = { ...baseContext, emojiImageHosts: ['cdn.example.com'] }
      const value = '<p><img src="https://cdn.example.com/30.png" alt=":x:"></p>'

      expect(await transform(value, context)).toBe(value)
    })

    it('should leave a filename with more segments than any emoji sequence untouched', async () => {
      const segments = Array.from({ length: 9 }, () => '1f642').join('-')
      const value = `<p><img src="https://cdn.jsdelivr.net/joypixels/assets/6.6/png/unicode/64/${segments}.png" alt=":x:"></p>`

      expect(await transform(value)).toBe(value)
    })

    it('should leave an unhosted image with a codepoint filename untouched', async () => {
      const value = '<p><img src="https://forum.example.com/smilies/1f642.png" alt=":)"></p>'

      expect(await transform(value)).toBe(value)
    })

    it('should be idempotent', async () => {
      const value =
        '<p>Hi <img src="https://cdn.jsdelivr.net/joypixels/assets/6.6/png/unicode/64/1f642.png" alt=":)"></p>'
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toBe(once)
    })
  })

  describe('shortcode table', () => {
    const shortcodeEntries = Object.entries(shortcodes)

    // Iterates the real table, so every entry is exercised and a new entry is covered
    // automatically. A value carrying ASCII letters would inject a word into the document,
    // and an empty one would strand the wrapper it sat in for stripEmptyTags to delete.
    it.each(shortcodeEntries)('should map %s to a bare glyph', (_shortcode, glyph) => {
      expect(glyph).not.toBe('')
      expect(glyph).not.toMatch(asciiLetterRegex)
    })

    it('should key every entry in lower case so lookups can normalize', () => {
      const keys = Object.keys(shortcodes)

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

    // A "?" alt is WordPress failing to encode the emoji it meant. The filename still names
    // the codepoint, so on a known emoji host the glyph is recovered rather than the image
    // being left with an alt that says nothing.
    it('should recover the glyph from the filename when the alt is a "?" fallback', async () => {
      const value = html`
        <p>
          <img
            src="https://s.w.org/images/core/emoji/2.4/72x72/1f642.png"
            class="size_orig"
            alt="?"
          >
        </p>
      `
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toBe(expected)
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
