import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { fixMojibakeEncoding } from './fixMojibakeEncoding.js'

describeForEachParser('fixMojibakeEncoding', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [fixMojibakeEncoding(context)])
  }

  describe('round-trip restoration', () => {
    it('should restore smart apostrophe', async () => {
      const value = '<p>Appleâ€™s</p>'
      const expected = '<p>Apple’s</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should restore en dash', async () => {
      const value = '<p>hello â€“ world</p>'
      const expected = '<p>hello – world</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should restore em dash', async () => {
      const value = '<p>hello â€” world</p>'
      const expected = '<p>hello — world</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should restore ellipsis', async () => {
      const value = '<p>waitâ€¦ what?</p>'
      const expected = '<p>wait… what?</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should restore Spanish é', async () => {
      const value = '<p>cafÃ©</p>'
      const expected = '<p>café</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should restore Portuguese ã', async () => {
      const value = '<p>versÃ£o</p>'
      const expected = '<p>versão</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should restore German ß', async () => {
      const value = '<p>StraÃŸe</p>'
      const expected = '<p>Straße</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should restore Swedish ö', async () => {
      const value = '<p>Ã¶ksarg</p>'
      const expected = '<p>öksarg</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should restore copyright', async () => {
      const value = '<p>Photo Â© 2024</p>'
      const expected = '<p>Photo © 2024</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should restore non-breaking space', async () => {
      // The char after Â is a literal NBSP, the second byte of the 0xC2 0xA0 pair.
      const value = '<p>5Â km</p>'
      const expected = '<p>5&#160;km</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should restore mojibake inside attribute-less inline tags', async () => {
      const value = '<p>This is <em>a cafÃ©</em> note</p>'
      const expected = '<p>This is <em>a café</em> note</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('revert guard (U+FFFD)', () => {
    it('should fix mojibake text node but leave clean Portuguese text node untouched', async () => {
      const value = html`
        <p>cafÃ©</p>
        <p>São Paulo é uma cidade</p>
      `
      const expected = html`
        <p>café</p>
        <p>São Paulo é uma cidade</p>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave mixed mojibake + native Portuguese in same node untouched', async () => {
      const value = '<p>São cafÃ© em coração</p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave pure native Portuguese unchanged', async () => {
      const value = '<p>São Paulo é uma cidade do Brasil</p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave pure native French unchanged', async () => {
      const value = '<p>À la maison Â vivre</p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave document with emoji untouched when mojibake is in same text node', async () => {
      const value = '<p>Hello â€™s 🚀</p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should fix mojibake node and leave separate emoji node alone', async () => {
      const value = html`
        <p>cafÃ©</p>
        <p>Look at this 🚀</p>
      `
      const expected = html`
        <p>café</p>
        <p>Look at this 🚀</p>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should leave Vietnamese native Ã unchanged', async () => {
      const value = '<p>Hoàng Mã tâm cô Ãi</p>'

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  describe('opaque ancestors', () => {
    it('should not fix mojibake-looking byte pairs inside code', async () => {
      const value = '<p>When UTF-8 0xC3 0xA9 is misread it shows as <code>Ã©</code></p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not fix mojibake inside pre', async () => {
      const value = '<pre>Sample bytes: Ã© and â€™</pre>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not fix mojibake inside kbd', async () => {
      const value = '<p>Press <kbd>Ã©</kbd> for what looks like é</p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should fix mojibake outside code while leaving the inside untouched', async () => {
      const value = '<p>The cafÃ© is open. Note: <code>Ã©</code> means é.</p>'
      const expected = '<p>The café is open. Note: <code>Ã©</code> means é.</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should not descend into nested code blocks', async () => {
      const value = '<pre><code>Ã© inside nested code</code></pre>'

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  describe('entity-encoded mojibake', () => {
    it('should fix entity-encoded smart apostrophe', async () => {
      // After parseHtml decodes the entities the text node contains literal â€™ chars.
      const value = '<p>Apple&acirc;&#128;&#153;s</p>'
      const expected = '<p>Apple’s</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should fix entity-encoded Ã© mojibake', async () => {
      const value = '<p>caf&Atilde;&copy;</p>'
      const expected = '<p>café</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should fix entity-encoded Â© mojibake', async () => {
      const value = '<p>Photo &Acirc;&copy; 2024</p>'
      const expected = '<p>Photo © 2024</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('double-encoded mojibake', () => {
    it('should fully fix double-encoded German Müller', async () => {
      const value = '<p>MÃƒÂ¼ller</p>'
      const expected = '<p>Müller</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should fully fix double-encoded smart apostrophe', async () => {
      const value = '<p>AppleÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢s</p>'
      const result = await transform(value)

      expect(result).not.toContain('Ãƒ')
      expect(result).not.toContain('â€š')
    })

    it('should converge in a single pass on cleanly-single-encoded mojibake', async () => {
      const value = '<p>Appleâ€™s cafÃ©</p>'
      const expected = '<p>Apple’s café</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('detection short-circuit', () => {
    it('should leave clean ASCII unchanged', async () => {
      const value = '<p>plain ASCII text only</p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave clean Latin-1 with no mojibake unchanged', async () => {
      const value = '<p>café © 2024</p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave isolated Â without trailing marker unchanged', async () => {
      const value = '<p>Â alone followed by space</p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave isolated Ã without trailing marker unchanged', async () => {
      const value = '<p>Ã alone followed by space</p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave empty document untouched', async () => {
      expect(await transform('')).toBe('')
    })
  })

  describe('mixed content', () => {
    it('should fix mojibake across multiple paragraphs independently', async () => {
      const value = html`
        <p>cafÃ©</p>
        <p>Appleâ€™s</p>
        <p>Photo Â© 2024</p>
      `
      const expected = html`
        <p>café</p>
        <p>Apple’s</p>
        <p>Photo © 2024</p>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should fix mojibake nested in anchor', async () => {
      const value = '<p><a href="/x">Read about cafÃ©s here</a></p>'
      const expected = '<p><a href="/x">Read about cafés here</a></p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should be idempotent', async () => {
      const value = '<p>Appleâ€™s cafÃ©</p>'
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toBe(once)
    })

    it('should leave already-fixed content unchanged', async () => {
      const value = '<p>Apple’s café</p>'

      expect(await transform(value)).toEqualHtml(value)
    })
  })
})
