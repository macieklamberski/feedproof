import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { stripEmptyTags } from './stripEmptyTags.js'

describeForEachParser('stripEmptyTags', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [stripEmptyTags(context)])
  }

  it('should strip empty div', async () => {
    expect(await transform('<div></div>')).toBe('')
  })

  it('should strip empty paragraph', async () => {
    expect(await transform('<p></p>')).toBe('')
  })

  it('should strip empty span', async () => {
    expect(await transform('<span></span>')).toBe('')
  })

  it('should strip empty heading tags', async () => {
    expect(await transform('<h1></h1>')).toBe('')
    expect(await transform('<h3></h3>')).toBe('')
  })

  it('should strip empty table elements', async () => {
    expect(await transform('<table></table>')).toBe('')
    expect(await transform('<tr></tr>')).toBe('')
    expect(await transform('<td></td>')).toBe('')
  })

  it('should remove whitespace-only block elements', async () => {
    expect(await transform('<div>   </div>')).toBe('')
  })

  it('should remove block elements with only newlines', async () => {
    expect(await transform('<div>\n</div>')).toBe('')
  })

  it('should remove block elements containing only a non-breaking space', async () => {
    // After DOM parse `&nbsp;` is the U+00A0 character, which JS treats as
    // whitespace. A whitespace-only block (a spacer) is dropped entirely.
    expect(await transform('<p>&nbsp;</p>')).toBe('')
  })

  it('should collapse whitespace-only inline elements to a space', async () => {
    expect(await transform('<span>\u00A0</span>')).toBe(' ')
  })

  it('should preserve inline word boundaries via the collapsed space', async () => {
    expect(await transform('a<span> </span>b')).toBe('a b')
  })

  it('should not drop whitespace-only table cells', async () => {
    const value = '<table><tbody><tr><td>   </td><td>x</td></tr></tbody></table>'
    const expected = '<table><tbody><tr> <td>x</td></tr></tbody></table>'

    expect(await transform(value)).toBe(expected)
  })

  it('should collapse whitespace-only table header cells to a space', async () => {
    const value = '<table><tbody><tr><th>   </th><td>x</td></tr></tbody></table>'
    const expected = '<table><tbody><tr> <td>x</td></tr></tbody></table>'

    expect(await transform(value)).toBe(expected)
  })

  it('should collapse whitespace-only table rows to a space', async () => {
    const value = '<table><tbody><tr>   </tr><tr><td>x</td></tr></tbody></table>'
    const expected = '<table><tbody> <tr><td>x</td></tr></tbody></table>'

    expect(await transform(value)).toBe(expected)
  })

  it('should collapse whitespace-only definition terms to a space', async () => {
    const value = '<dl><dt>   </dt><dd>Definition</dd></dl>'
    const expected = '<dl> <dd>Definition</dd></dl>'

    expect(await transform(value)).toBe(expected)
  })

  it('should collapse whitespace-only definition descriptions to a space', async () => {
    const value = '<dl><dt>Term</dt><dd>   </dd></dl>'
    const expected = '<dl><dt>Term</dt> </dl>'

    expect(await transform(value)).toBe(expected)
  })

  it('should strip tags with attributes but no content', async () => {
    expect(await transform('<div class="wrapper"></div>')).toBe('')
  })

  it('should strip nested empty tags', async () => {
    expect(await transform('<div><p></p></div>')).toBe('')
  })

  it('should strip deeply nested empty tags', async () => {
    expect(await transform('<section><div><p></p></div></section>')).toBe('')
  })

  it('should strip multiple empty tags', async () => {
    expect(
      await transform(html`
      <div></div>
      <p></p>
      <span></span>
    `),
    ).toBe('')
  })

  it('should strip empty tags around content', async () => {
    expect(
      await transform(html`
      <div></div>
      <p>Keep</p>
      <div></div>
    `),
    ).toBe('<p>Keep</p>')
  })

  it('should preserve tags with text content', async () => {
    expect(await transform('<div>Hello</div>')).toBe('<div>Hello</div>')
  })

  it('should preserve tags with child elements', async () => {
    expect(await transform('<div><img src="x.jpg"></div>')).toBe('<div><img src="x.jpg"></div>')
  })

  it('should preserve paragraph with br', async () => {
    expect(await transform('<p><br></p>')).toBe('<p><br></p>')
  })

  it('should preserve paragraph with br and newline', async () => {
    expect(await transform('<p><br>\n</p>')).toBe('<p><br>\n</p>')
  })

  it('should preserve void elements', async () => {
    expect(await transform('<br>')).toBe('<br>')
    expect(await transform('<hr>')).toBe('<hr>')
    expect(await transform('<img src="x.jpg">')).toBe('<img src="x.jpg">')
  })

  it('should handle empty string', async () => {
    expect(await transform('')).toBe('')
  })

  it('should handle plain text without tags', async () => {
    expect(await transform('just text')).toBe('just text')
  })

  it('should strip empty div but preserve the trailing newline text node', async () => {
    const value = '<div></div>\n<p>Article text with <strong>formatting</strong></p>'
    const expected = '\n<p>Article text with <strong>formatting</strong></p>'

    expect(await transform(value)).toBe(expected)
  })

  it('should preserve empty iframe with src', async () => {
    const value =
      '<iframe src="https://www.youtube-nocookie.com/embed/abc123" frameborder="0"></iframe>'

    expect(await transform(value)).toBe(value)
  })

  it('should preserve empty video tag', async () => {
    const value = '<video src="https://example.com/video.mp4" controls></video>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should preserve empty audio tag', async () => {
    const value = '<audio src="https://example.com/audio.mp3" controls></audio>'

    expect(await transform(value)).toEqualHtml(value)
  })

  it('should preserve source element (void in HTML5) without closing tag', async () => {
    const value = '<source src="https://example.com/video.mp4" type="video/mp4"></source>'
    const expected = '<source src="https://example.com/video.mp4" type="video/mp4">'

    expect(await transform(value)).toBe(expected)
  })

  it('should preserve div that wraps an iframe (div is non-empty)', async () => {
    const value = '<div><iframe src="https://www.youtube-nocookie.com/embed/abc123"></iframe></div>'

    expect(await transform(value)).toBe(value)
  })

  it('should strip empty div but preserve adjacent iframe', async () => {
    const value = html`
      <div></div>
      <iframe src="https://example.com/embed"></iframe>
    `
    const expected = '<iframe src="https://example.com/embed"></iframe>'

    expect(await transform(value)).toBe(expected)
  })

  it('should preserve div with anchor child regardless of data-* attributes', async () => {
    // The anchor child makes the div non-empty; data-embed attributes are not
    // special-cased here, they just survive because their host element does.
    const value = html`
      <div data-embed-src="https://example.com/embed">
        <a href="https://example.com/embed">https://example.com/embed</a>
      </div>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should strip empty sibling and preserve div with anchor child', async () => {
    const value = html`
      <p></p>
      <div data-embed="audio" data-embed-src="https://example.com/episode.mp3">
        <a href="https://example.com/episode.mp3">https://example.com/episode.mp3</a>
      </div>
    `
    const expected = html`
      <div data-embed="audio" data-embed-src="https://example.com/episode.mp3">
        <a href="https://example.com/episode.mp3">https://example.com/episode.mp3</a>
      </div>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should not strip tag-shaped strings inside <script>', async () => {
    // <script> is a raw-text element — its body is one text node, not parsed
    // elements. The empty-tag walk skips it naturally without explicit guards.
    const value = html`
      <p>before</p>
      <script>document.write("<div></div>")</script>
      <p>after</p>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should not strip tag-shaped strings inside <style>', async () => {
    const value = html`
      <style>.x { background: url("data:image/svg+xml,<svg></svg>") }</style>
      <p>x</p>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should not strip tag-shaped strings inside HTML comments', async () => {
    const value = '<!-- <div></div> --><p>x</p>'

    expect(await transform(value)).toBe(value)
  })

  it('should strip truly empty <textarea> (not in preserve set)', async () => {
    const value = html`
      <p>a</p>
      <textarea></textarea>
      <p>b</p>
    `
    const expected = html`
      <p>a</p>
      <p>b</p>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should treat <noscript> body as regular HTML and strip empties inside', async () => {
    // <noscript> is NOT a raw-text element in HTML5 (it's only raw-text when
    // scripting is enabled in the consumer). linkedom parses it as normal
    // HTML, so the walk visits its descendants.
    const value = '<noscript><div></div></noscript>'

    expect(await transform(value)).toBe('')
  })

  it('should preserve <noscript> with meaningful children', async () => {
    const value = '<noscript><p>fallback</p></noscript>'

    expect(await transform(value)).toBe(value)
  })

  it('should reparse <br></br> as two <br> elements (HTML5 spec)', async () => {
    // Per HTML5 the `</br>` end tag is reparsed as a `<br>` start tag, so the
    // pair becomes two `<br>` elements. Either way the line break survives —
    // the old regex destroyed the pair entirely.
    const value = 'line 1<br></br>line 2'
    const expected = 'line 1<br><br>line 2'

    expect(await transform(value)).toBe(expected)
  })

  it('should normalize <hr></hr> by dropping the redundant close tag', async () => {
    const value = html`
      <p>a</p>
      <hr></hr>
      <p>b</p>
    `
    const expected = html`
      <p>a</p>
      <hr>
      <p>b</p>
    `

    expect(await transform(value)).toBe(expected)
  })

  it('should normalize <input></input> and <wbr></wbr> by dropping close tags', async () => {
    const value = '<input></input> word<wbr></wbr>break'
    const expected = '<input> word<wbr>break'

    expect(await transform(value)).toBe(expected)
  })

  it('should preserve empty custom elements (tag name with hyphen)', async () => {
    const value = '<my-widget></my-widget>'

    expect(await transform(value)).toBe(value)
  })

  it('should preserve empty custom elements between regular content', async () => {
    const value = html`
      <p>before</p>
      <app-embed data-id="42"></app-embed>
      <p>after</p>
    `

    expect(await transform(value)).toBe(value)
  })

  it('should be idempotent', async () => {
    const value = html`
      <div></div>
      <p>Keep</p>
      <div></div>
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })

  describe('anchor targets', () => {
    it('should preserve an empty named anchor', async () => {
      const value = '<a name="section"></a>'

      expect(await transform(value)).toBe(value)
    })

    it('should preserve an empty anchor with an id', async () => {
      const value = '<a id="section"></a>'

      expect(await transform(value)).toBe(value)
    })

    it('should preserve an empty span carrying an id', async () => {
      const value = '<span id="mark"></span>'

      expect(await transform(value)).toBe(value)
    })

    it('should preserve an empty block element carrying an id', async () => {
      const value = '<div id="mark"></div>'

      expect(await transform(value)).toBe(value)
    })

    it('should preserve a whitespace-only block element carrying an id', async () => {
      const value = '<div id="mark">   </div>'

      expect(await transform(value)).toBe(value)
    })

    it('should keep an anchor target between content so in-page links resolve', async () => {
      const value = html`
        <p>before</p>
        <a name="section"></a>
        <p>after</p>
      `

      expect(await transform(value)).toBe(value)
    })

    it('should still strip an empty element without id or name', async () => {
      const value = html`
        <p>before</p>
        <span></span>
        <p>after</p>
      `
      const expected = html`
        <p>before</p>
        <p>after</p>
      `

      expect(await transform(value)).toBe(expected)
    })
  })
})
