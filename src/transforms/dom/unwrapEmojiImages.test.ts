import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { unwrapEmojiImages } from './unwrapEmojiImages.js'

describeForEachParser('unwrapEmojiImages', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [unwrapEmojiImages(context)])
  }

  describe('wp-smiley class', () => {
    it('should replace wp-smiley image with alt emoji', async () => {
      const value =
        '<p>Hello <img src="https://s.w.org/images/core/emoji/17.0.2/72x72/1f609.png" alt="😉" class="wp-smiley"></p>'
      const expected = '<p>Hello 😉</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should replace multiple wp-smiley images in the same paragraph', async () => {
      const value = '<p><img alt="😉" class="wp-smiley"> and <img alt="😊" class="wp-smiley"></p>'
      const expected = '<p>😉 and 😊</p>'

      expect(await transform(value)).toBe(expected)
    })

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

    it('should handle wp-smiley alongside additional classes', async () => {
      const value = '<p><img alt="😀" class="wp-smiley emoji extra"></p>'
      const expected = '<p>😀</p>'

      expect(await transform(value)).toBe(expected)
    })
  })

  describe('emoji class (newer WP variant + Discourse)', () => {
    it('should replace newer WP variant with class="emoji"', async () => {
      const value =
        '<p><img class="emoji" role="img" draggable="false" src="https://s.w.org/images/core/emoji/16.0.1/svg/1f914.svg" alt="🤔"></p>'
      const expected = '<p>🤔</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should leave Discourse shortcode-alt with class="emoji" untouched', async () => {
      const value = '<p><img class="emoji" alt=":slight_smile:"></p>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave class="emoji" image with mixed-text alt untouched', async () => {
      const value = '<p><img class="emoji" alt="hello 🐱"></p>'

      expect(await transform(value)).toBe(value)
    })
  })

  describe('configurable host list', () => {
    it('should replace no-class WP variant matched by s.w.org URL', async () => {
      const value =
        '<p><img src="https://s.w.org/images/core/emoji/13.1.0/svg/1f680.svg" alt="🚀"></p>'
      const expected = '<p>🚀</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should replace WordPress.com wpcom-smileys image', async () => {
      const value =
        '<p><img src="https://s0.wp.com/wp-content/mu-plugins/wpcom-smileys/twemoji/2/72x72/1f642.png" alt="🙂"></p>'
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should replace Facebook emoji image', async () => {
      const value =
        '<p><img height="16" width="16" alt="🙂" referrerpolicy="origin-when-cross-origin" src="https://static.xx.fbcdn.net/images/emoji.php/v9/t4c/1/16/1f642.png"></p>'
      const expected = '<p>🙂</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should replace Twitter/X emoji image', async () => {
      const value = '<p><img src="https://abs.twimg.com/emoji/v2/72x72/1f600.png" alt="😀"></p>'
      const expected = '<p>😀</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should replace GitHub gemoji image when alt is the emoji glyph', async () => {
      const value =
        '<p><img src="https://github.githubassets.com/images/icons/emoji/unicode/1f680.png" alt="🚀"></p>'
      const expected = '<p>🚀</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should respect a custom host list override', async () => {
      const context: TransformContext = { ...baseContext, emojiImageHosts: [] }
      const value =
        '<p><img src="https://s.w.org/images/core/emoji/13.1.0/svg/1f680.svg" alt="🚀"></p>'

      expect(await transform(value, context)).toBe(value)
    })
  })

  describe('alt-shape guard', () => {
    it('should leave image untouched when alt is empty', async () => {
      const value = '<p><img src="emoji.png" alt="" class="wp-smiley"></p>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave image untouched when alt is ASCII-only', async () => {
      const value = '<p><img src="emoji.png" alt="x" class="wp-smiley"></p>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave image untouched when alt is a "?" fallback', async () => {
      const value =
        '<p><img src="https://s.w.org/images/core/emoji/2.4/72x72/1f642.png" class="size_orig" alt="?"></p>'

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
    const value =
      '<p>Hello <img src="https://s.w.org/images/core/emoji/17.0.2/72x72/1f609.png" alt="😉" class="wp-smiley"></p>'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
