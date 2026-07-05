import { describe, expect, it } from 'bun:test'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { IsSafeUrlFn, TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { neutralizeUnsafeUrls } from './neutralizeUnsafeUrls.js'

describeForEachParser('neutralizeUnsafeUrls', (parseHtml) => {
  const transform = (value: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(value), [neutralizeUnsafeUrls(context)])
  }

  describe('dangerous-scheme floor (no isSafeUrlFn)', () => {
    it('should neutralize a javascript: link to the link sentinel', async () => {
      const value = '<a href="javascript:alert(1)">x</a>'

      expect(await transform(value)).toBe('<a href="#unsafe-link">x</a>')
    })

    it('should neutralize a vbscript: link', async () => {
      const value = '<a href="vbscript:msgbox(1)">x</a>'

      expect(await transform(value)).toBe('<a href="#unsafe-link">x</a>')
    })

    it('should neutralize a data:text/html link', async () => {
      const value = '<a href="data:text/html,hello">x</a>'

      expect(await transform(value)).toBe('<a href="#unsafe-link">x</a>')
    })

    it('should neutralize a javascript: image to the media sentinel', async () => {
      const value = '<img src="javascript:alert(1)">'

      expect(await transform(value)).toBe('<img src="about:blank">')
    })

    it('should see through leading whitespace and control chars in the scheme', async () => {
      const value = '<a href="  java\tscript:alert(1)">x</a>'

      expect(await transform(value)).toBe('<a href="#unsafe-link">x</a>')
    })

    it('should see through a leading C0 control byte that \\s does not match', async () => {
      // A leading \x01 survives HTML parsing and a browser strips it before reading the
      // scheme, so `\x01javascript:` runs — but \s never matched it.
      const value = '<a href="\x01javascript:alert(1)">x</a>'

      expect(await transform(value)).toBe('<a href="#unsafe-link">x</a>')
    })

    it('should match the scheme case-insensitively', async () => {
      const value = '<a href="JaVaScRiPt:alert(1)">x</a>'

      expect(await transform(value)).toBe('<a href="#unsafe-link">x</a>')
    })

    it('should leave a safe http link untouched', async () => {
      const value = '<a href="https://example.com/page">x</a>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave mailto, tel and fragment links untouched', async () => {
      const value =
        '<a href="mailto:a@b.com">mail</a><a href="tel:+123">call</a><a href="#section">jump</a>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave template-shielded URLs alone, like querySelectorAll does', async () => {
      const value = '<template><a href="javascript:alert(1)">x</a></template><p>keep</p>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave a data:image url untouched', async () => {
      const value = '<img src="data:image/png;base64,iVBORw0KGgo=">'

      expect(await transform(value)).toBe(value)
    })

    it('should not neutralize data:image/svg+xml at the floor', async () => {
      const value = '<img src="data:image/svg+xml;base64,PHN2Zy8+">'

      expect(await transform(value)).toBe(value)
    })

    it('should neutralize a data:image/svg+xml link', async () => {
      const value = '<a href="data:image/svg+xml;base64,PHN2Zy8+">x</a>'

      expect(await transform(value)).toBe('<a href="#unsafe-link">x</a>')
    })

    it('should neutralize a javascript: xlink:href on an svg anchor', async () => {
      const result = await transform(
        '<svg><a xlink:href="javascript:alert(1)"><text>x</text></a></svg>',
      )

      expect(result).toContain('#unsafe-link')
      expect(result).not.toContain('javascript:')
    })

    it('should neutralize a javascript: href on an svg anchor', async () => {
      const result = await transform('<svg><a href="javascript:alert(1)"><text>x</text></a></svg>')

      expect(result).toContain('#unsafe-link')
      expect(result).not.toContain('javascript:')
    })

    it('should neutralize a javascript: formaction', async () => {
      const value = '<button formaction="javascript:alert(1)">go</button>'

      expect(await transform(value)).toBe('<button formaction="#unsafe-link">go</button>')
    })
  })

  describe('with a caller isSafeUrlFn', () => {
    const blockHost =
      (host: string): IsSafeUrlFn =>
      (url) =>
        !url.includes(host)

    it('should neutralize a link the policy rejects', async () => {
      const context: TransformContext = { ...baseContext, isSafeUrlFn: blockHost('evil.test') }
      const value = '<a href="https://evil.test/x">x</a>'

      expect(await transform(value, context)).toBe('<a href="#unsafe-link">x</a>')
    })

    it('should neutralize an image the policy rejects', async () => {
      const context: TransformContext = { ...baseContext, isSafeUrlFn: blockHost('evil.test') }
      const value = '<img src="https://evil.test/p.jpg">'

      expect(await transform(value, context)).toBe('<img src="about:blank">')
    })

    it('should keep a url the policy allows', async () => {
      const context: TransformContext = { ...baseContext, isSafeUrlFn: blockHost('evil.test') }
      const value = '<a href="https://ok.test/x">x</a>'

      expect(await transform(value, context)).toBe(value)
    })

    it('should pass the url role to the policy', async () => {
      const seen: Array<[string, string]> = []
      const isSafeUrlFn: IsSafeUrlFn = (url, type) => {
        seen.push([url, type])
        return true
      }
      const context: TransformContext = { ...baseContext, isSafeUrlFn }
      await transform('<a href="https://a.test"></a><img src="https://b.test">', context)

      expect(seen).toContainEqual(['https://a.test', 'link'])
      expect(seen).toContainEqual(['https://b.test', 'media'])
    })
  })

  describe('srcset', () => {
    const blockHost =
      (host: string): IsSafeUrlFn =>
      (url) =>
        !url.includes(host)

    it('should drop only the unsafe candidates', async () => {
      const context: TransformContext = { ...baseContext, isSafeUrlFn: blockHost('evil.test') }
      const value = '<img srcset="https://ok.test/a.jpg 1x, https://evil.test/b.jpg 2x">'

      expect(await transform(value, context)).toBe('<img srcset="https://ok.test/a.jpg 1x">')
    })

    it('should fall back to the media sentinel when every candidate is unsafe', async () => {
      const value = '<img srcset="javascript:a 1x, javascript:b 2x">'

      expect(await transform(value)).toBe('<img srcset="about:blank">')
    })

    it('should leave an empty srcset untouched', async () => {
      const value = '<img srcset="">'

      expect(await transform(value)).toBe(value)
    })
  })

  describe('coverage', () => {
    it('should neutralize across iframe, poster, embed data-* and bookmark attributes', async () => {
      const context: TransformContext = {
        ...baseContext,
        isSafeUrlFn: (url) => !url.includes('evil.test'),
      }
      const value = html`
        <iframe src="https://evil.test/e"></iframe>
        <video poster="https://evil.test/p.jpg"></video>
        <div data-embed-thumbnail="https://evil.test/t.jpg"></div>
        <div data-bookmark-icon="https://evil.test/i.ico"></div>
      `
      const expected = html`
        <iframe src="about:blank"></iframe>
        <video poster="about:blank"></video>
        <div data-embed-thumbnail="about:blank"></div>
        <div data-bookmark-icon="about:blank"></div>
      `

      expect(await transform(value, context)).toBe(expected)
    })

    it('should neutralize unsafe embed and bookmark target urls with the link sentinel', async () => {
      const value = html`
        <div data-embed-url="javascript:alert(1)"></div>
        <div data-bookmark-url="javascript:alert(1)"></div>
      `
      const expected = html`
        <div data-embed-url="#unsafe-link"></div>
        <div data-bookmark-url="#unsafe-link"></div>
      `

      expect(await transform(value)).toBe(expected)
    })

    it('should leave a safe embed target url untouched', async () => {
      const value = '<div data-embed-url="https://example.com/watch"></div>'

      expect(await transform(value)).toBe(value)
    })

    it('should leave a document with no url attributes untouched', async () => {
      const value = '<p>text</p>'

      expect(await transform(value)).toBe(value)
    })
  })

  describe('svg image', () => {
    it('should neutralize a javascript: href on an svg image', async () => {
      const result = await transform('<svg><image href="javascript:alert(1)"></image></svg>')

      expect(result).toContain('about:blank')
      expect(result).not.toContain('javascript:')
    })

    it('should neutralize a javascript: xlink:href on an svg image', async () => {
      const result = await transform('<svg><image xlink:href="javascript:alert(1)"></image></svg>')

      expect(result).toContain('about:blank')
      expect(result).not.toContain('javascript:')
    })

    it('should neutralize an svg image the policy rejects', async () => {
      const context: TransformContext = {
        ...baseContext,
        isSafeUrlFn: (url) => !url.includes('evil.test'),
      }
      const result = await transform(
        '<svg><image href="https://evil.test/a.png"></image></svg>',
        context,
      )

      expect(result).toContain('about:blank')
    })

    it('should keep a safe svg image href', async () => {
      const result = await transform('<svg><image href="https://ok.test/a.png"></image></svg>')

      expect(result).toContain('https://ok.test/a.png')
    })
  })

  it('should be idempotent', async () => {
    const value = '<a href="javascript:alert(1)">x</a><img src="javascript:alert(1)">'
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
