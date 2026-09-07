import { describe, expect, it } from 'bun:test'
import { transformContent } from '../../index.js'
import { baseContext, describeForEachParser, html, jsonAttrValue } from '../../tests.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { fixSubstackMentions } from './fixSubstackMentions.js'

// Substack stores the mention payload in a double-quoted data-attrs attribute with the
// inner quotes HTML-encoded, which is what survives a parse and serialise roundtrip.
const makeMention = (attrs: Record<string, unknown> | string): string => {
  return `<span class="mention-wrap" data-attrs="${jsonAttrValue(attrs)}" data-component-name="MentionToDOM"></span>`
}

describeForEachParser('fixSubstackMentions', (parseHtml) => {
  const transform = (value: string) => {
    return applyDomTransforms(parseHtml(value), [fixSubstackMentions(baseContext)])
  }

  describe('happy paths', () => {
    it('should link a user mention to the profile url minted from its id', async () => {
      const mention = makeMention({ name: 'Jane Miller', id: 123456, type: 'user', url: null })
      const value = `<p>Thanks to ${mention} for the idea.</p>`
      const expected = html`
        <p>Thanks to <a href="https://substack.com/profile/123456">@Jane Miller</a> for the idea.</p>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should link a publication mention to its payload url', async () => {
      const mention = makeMention({
        name: 'Morning Letters',
        id: 654321,
        type: 'pub',
        url: 'https://open.substack.com/pub/morningletters',
      })
      const value = `<p>She hosts ${mention} now.</p>`
      const expected = html`
        <p>She hosts <a href="https://open.substack.com/pub/morningletters">@Morning Letters</a> now.</p>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    // The url passes below give the href its scheme and its base, so a payload url that
    // names neither still becomes the link.
    it('should link a publication mention whose payload url is protocol-relative', async () => {
      const mention = makeMention({
        name: 'Morning Letters',
        id: 654321,
        type: 'pub',
        url: '//open.substack.com/pub/morningletters',
      })
      const value = `<p>She hosts ${mention} now.</p>`
      const expected = html`
        <p>She hosts <a href="//open.substack.com/pub/morningletters">@Morning Letters</a> now.</p>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should convert every mention in a paragraph', async () => {
      const first = makeMention({ name: 'Ana', id: 1, type: 'user', url: null })
      const second = makeMention({ name: 'Ben', id: 2, type: 'user', url: null })
      const value = `<p>${first} and ${second}</p>`
      const expected = html`
        <p>
          <a href="https://substack.com/profile/1">@Ana</a> and <a href="https://substack.com/profile/2">@Ben</a>
        </p>
      `

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('fallbacks', () => {
    it('should keep the name as plain text when neither url nor id is usable', async () => {
      const mention = makeMention({ name: 'Sam Fields', id: null, type: 'user', url: null })
      const value = `<p>With ${mention} on stage.</p>`
      const expected = '<p>With @Sam Fields on stage.</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })

    it('should not interpolate an id that is not a positive integer', async () => {
      const mention = makeMention({ name: 'Ana', id: -1, type: 'user', url: null })
      const value = `<p>${mention}</p>`
      const expected = '<p>@Ana</p>'

      expect(await transform(value)).toEqualHtml(expected)
    })
  })

  describe('leave-alone cases', () => {
    it('should leave a span without data-attrs untouched', async () => {
      const value = '<p><span class="mention-wrap" data-component-name="MentionToDOM"></span></p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave a span with malformed data-attrs untouched', async () => {
      const value = `<p>${makeMention('{"name":"Ana"')}</p>`

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should leave a span without a name untouched', async () => {
      const value = `<p>${makeMention({ id: 123456, type: 'user', url: null })}</p>`

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  it('should keep the mention through the default pipeline end to end', async () => {
    const mention = makeMention({ name: 'Jane Miller', id: 123456, type: 'user', url: null })
    const value = `<p>Thanks to ${mention} for the idea.</p>`
    const expected = html`
      <p>Thanks to <a href="https://substack.com/profile/123456">@Jane Miller</a> for the idea.</p>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    expect(result).toEqualHtml(expected)
  })

  it('should resolve a feed-relative payload url against the base url end to end', async () => {
    const mention = makeMention({ name: 'Ana', type: 'pub', url: '/p/a-post' })
    const value = `<p>Thanks to ${mention} for the idea.</p>`
    const expected = html`
      <p>Thanks to <a href="https://example.com/p/a-post">@Ana</a> for the idea.</p>
    `
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    expect(result).toEqualHtml(expected)
  })

  // The scheme floor belongs to neutralizeUnsafeUrls, which runs over every anchor the
  // pipeline builds, and stripDeadAnchors then unwraps the neutralized link.
  it('should render a mention with a dangerous payload url as plain text end to end', async () => {
    const mention = makeMention({ name: 'Ana', id: 42, type: 'user', url: 'javascript:alert(1)' })
    const value = `<p>Thanks to ${mention} for the idea.</p>`
    const expected = html`<p>Thanks to @Ana for the idea.</p>`
    const result = await transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com',
    })

    expect(result).toEqualHtml(expected)
  })

  it('should be idempotent', async () => {
    const mention = makeMention({ name: 'Jane Miller', id: 123456, type: 'user', url: null })
    const value = `<p>Thanks to ${mention} for the idea.</p>`
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toEqualHtml(once)
  })
})
