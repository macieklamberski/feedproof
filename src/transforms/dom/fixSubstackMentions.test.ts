import { describe, expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html, substackAttrs } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { fixSubstackMentions } from './fixSubstackMentions.js'

// Substack stores the mention payload in a double-quoted data-attrs attribute with the
// inner quotes HTML-encoded, which is what survives a parse and serialise roundtrip.
const makeMention = (attrs: Record<string, unknown> | string): string => {
  return `<span class="mention-wrap" data-attrs="${substackAttrs(attrs)}" data-component-name="MentionToDOM"></span>`
}

describeForEachParser('fixSubstackMentions', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [fixSubstackMentions(baseContext)])
  }

  describe('happy paths', () => {
    it('should link a user mention to the profile url minted from its id', async () => {
      const mention = makeMention({ name: 'Jane Miller', id: 123456, type: 'user', url: null })
      const value = html`<p>Thanks to ${mention} for the idea.</p>`
      const result = await transform(value)

      expect(result).toBe(
        html`<p>Thanks to <a href="https://substack.com/profile/123456">@Jane Miller</a> for the idea.</p>`,
      )
    })

    it('should link a publication mention to its payload url', async () => {
      const mention = makeMention({
        name: 'Morning Letters',
        id: 654321,
        type: 'pub',
        url: 'https://open.substack.com/pub/morningletters',
      })
      const value = html`<p>She hosts ${mention} now.</p>`
      const result = await transform(value)

      expect(result).toBe(
        html`<p>She hosts <a href="https://open.substack.com/pub/morningletters">@Morning Letters</a> now.</p>`,
      )
    })

    it('should convert every mention in a paragraph', async () => {
      const first = makeMention({ name: 'Ana', id: 1, type: 'user', url: null })
      const second = makeMention({ name: 'Ben', id: 2, type: 'user', url: null })
      const value = html`<p>${first} and ${second}</p>`
      const result = await transform(value)

      expect(result).toBe(
        html`
          <p>
            <a href="https://substack.com/profile/1">@Ana</a> and <a href="https://substack.com/profile/2">@Ben</a>
          </p>
        `,
      )
    })
  })

  describe('fallbacks', () => {
    it('should keep the name as plain text when neither url nor id is usable', async () => {
      const mention = makeMention({ name: 'Sam Fields', id: null, type: 'user', url: null })
      const value = html`<p>With ${mention} on stage.</p>`
      const result = await transform(value)

      expect(result).toBe(html`<p>With @Sam Fields on stage.</p>`)
    })

    it('should fall back to the profile url when the payload url is not http', async () => {
      const mention = makeMention({
        name: 'Ana',
        id: 42,
        type: 'user',
        url: 'javascript:alert(1)',
      })
      const value = html`<p>${mention}</p>`
      const result = await transform(value)

      expect(result).toBe(html`<p><a href="https://substack.com/profile/42">@Ana</a></p>`)
    })

    it('should not interpolate an id that is not a positive integer', async () => {
      const mention = makeMention({ name: 'Ana', id: -1, type: 'user', url: null })
      const value = html`<p>${mention}</p>`
      const result = await transform(value)

      expect(result).toBe(html`<p>@Ana</p>`)
    })
  })

  describe('leave-alone cases', () => {
    it('should leave a span without data-attrs untouched', async () => {
      const value = html`<p><span class="mention-wrap" data-component-name="MentionToDOM"></span></p>`
      const result = await transform(value)

      expect(result).toContain('mention-wrap')
    })

    it('should leave a span with malformed data-attrs untouched', async () => {
      const value = html`<p>${makeMention('{"name":"Ana"')}</p>`
      const result = await transform(value)

      expect(result).toContain('mention-wrap')
    })

    it('should leave a span without a name untouched', async () => {
      const value = html`<p>${makeMention({ id: 123456, type: 'user', url: null })}</p>`
      const result = await transform(value)

      expect(result).toContain('mention-wrap')
    })
  })

  it('should keep the mention through the default pipeline end to end', async () => {
    const mention = makeMention({ name: 'Jane Miller', id: 123456, type: 'user', url: null })
    const value = html`<p>Thanks to ${mention} for the idea.</p>`
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    expect(result).toContain('<a href="https://substack.com/profile/123456">@Jane Miller</a>')
  })

  it('should be idempotent', async () => {
    const mention = makeMention({ name: 'Jane Miller', id: 123456, type: 'user', url: null })
    const value = html`<p>Thanks to ${mention} for the idea.</p>`
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
