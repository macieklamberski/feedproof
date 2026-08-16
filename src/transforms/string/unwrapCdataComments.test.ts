import { describe, expect, it } from 'bun:test'
import { baseContext, html } from '../../tests.js'
import { unwrapCdataComments } from './unwrapCdataComments.js'

describe('unwrapCdataComments', () => {
  const transform = unwrapCdataComments(baseContext)

  it('should unwrap a basic CDATA wrapper', () => {
    expect(transform('<!--[CDATA[<p>article</p>]]-->')).toBe('<p>article</p>')
  })

  it('should unwrap with whitespace inside the wrapper', () => {
    expect(transform('<!-- [CDATA[ <p>article</p> ]] -->')).toBe(' <p>article</p> ')
  })

  it('should unwrap alongside real content', () => {
    expect(transform('<h1>title</h1><!--[CDATA[<p>body</p>]]-->')).toBe(html`
      <h1>title</h1>
      <p>body</p>
    `)
  })

  it('should leave regular HTML comments alone', () => {
    const value = html`
      <p>First paragraph</p>
      <!-- not CDATA -->
      <p>Second paragraph</p>
    `

    expect(transform(value)).toBe(value)
  })

  it('should leave conditional IE comments alone', () => {
    const value = '<!--[if IE]><p>legacy</p><![endif]-->'

    expect(transform(value)).toBe(value)
  })

  // The wrapper regex matches uppercase CDATA only, so a lowercase [cdata[ shape
  // passes through. Pinned so making it case-insensitive must update this test deliberately.
  it('should leave a lowercase [cdata[ wrapper alone', () => {
    const value = '<!--[cdata[<p>article</p>]]-->'

    expect(transform(value)).toBe(value)
  })

  it('should unwrap split-CDATA where the article contains internal -->', () => {
    // The non-greedy regex matches up to the FIRST `]]-->` regardless of
    // intermediate `<!--…-->` sequences. At the string level there's no
    // parser to confuse with internal `-->` boundaries.
    const value = '<!--[CDATA[<p>before</p><!--StartFragment--><p>after</p>]]-->'
    const expected = html`
      <p>before</p>
      <!--StartFragment-->
      <p>after</p>
    `

    expect(transform(value)).toBe(expected)
  })

  it('should unwrap CDATA with multiple internal --> markers', () => {
    const value = html`
      <!--[CDATA[<p>one</p><!--StartFragment--><p>two</p><!--EndFragment--><p>three</p>]]-->
    `
    const expected = html`
      <p>one</p>
      <!--StartFragment-->
      <p>two</p>
      <!--EndFragment-->
      <p>three</p>
    `

    expect(transform(value)).toBe(expected)
  })

  it('should unwrap multiple CDATA wrappers in one pass', () => {
    const value = '<!--[CDATA[<p>intro</p>]]--><!--[CDATA[<p>outro</p>]]-->'
    const expected = html`
      <p>intro</p>
      <p>outro</p>
    `

    expect(transform(value)).toBe(expected)
  })

  it('should unwrap a CDATA wrapper inside an attribute value', () => {
    // Real-world case (Prestige Magazine in the audit corpus): an editor
    // wrote `<a href="<![CDATA[...]]>">` and the browser round-tripped it
    // into a bogus-comment shape baked into the attribute. Recovering the
    // bare URL keeps the link clickable.
    const value = '<a href="<!--[CDATA[https://example.com/post]]-->">link</a>'
    const expected = '<a href="https://example.com/post">link</a>'

    expect(transform(value)).toBe(expected)
  })

  it('should leave unterminated CDATA shape alone', () => {
    // No matching `]]-->` — leave verbatim; the HTML parser will treat it
    // as a bogus/unterminated comment.
    const value = '<!--[CDATA[unterminated'

    expect(transform(value)).toBe(value)
  })

  it('should handle empty CDATA wrapper', () => {
    expect(transform('<!--[CDATA[]]-->')).toBe('')
  })

  it('should handle empty input', () => {
    expect(transform('')).toBe('')
  })

  it('should be idempotent on already-unwrapped content', async () => {
    const value = '<p>plain content</p>'

    expect(await transform(await transform(value))).toBe(value)
  })

  it('should be idempotent after unwrapping a wrapper', async () => {
    const once = await transform('<!--[CDATA[<p>article</p>]]-->')

    expect(await transform(once)).toBe(once)
  })
})
