import { describe, expect, it } from 'bun:test'
import { baseContext } from '../../tests.js'
import { paragraphizePlainText } from './paragraphizePlainText.js'

describe('paragraphizePlainText', () => {
  const paragraphize = paragraphizePlainText(baseContext)

  it('should wrap plain text in paragraph tags', () => {
    const value = 'Hello world'
    const expected = '<p>Hello world</p>\n'

    expect(paragraphize(value)).toBe(expected)
  })

  it('should wrap multiple paragraphs separated by double newlines', () => {
    const result = paragraphize('First paragraph\n\nSecond paragraph')

    expect(result).toContain('<p>First paragraph</p>')
    expect(result).toContain('<p>Second paragraph</p>')
  })

  it('should convert single newlines to line breaks', () => {
    const value = 'Line one\nLine two'
    const expected = '<p>Line one<br />\nLine two</p>\n'

    expect(paragraphize(value)).toBe(expected)
  })

  it('should not modify content that already has HTML', () => {
    const value = '<p>Already HTML</p>\n\nMore text'

    expect(paragraphize(value)).toBe(value)
  })

  it('should not modify content with block-level HTML', () => {
    const value = '<div>Content</div>'

    expect(paragraphize(value)).toBe(value)
  })

  it('should not modify content with self-closing HTML', () => {
    const value = '<img src="photo.jpg">'

    expect(paragraphize(value)).toBe(value)
  })

  it('should not autop content containing XHTML-style <br/> (no space)', () => {
    // Podcast feeds commonly emit `<br/>` separators without a space. The
    // regex must treat this as HTML so autop doesn't wrap & re-serialize it,
    // which inserts paragraph-boundary whitespace not present in the source.
    const value = 'Episode 1: intro<br/>Episode 2: deep dive<br/>End'

    expect(paragraphize(value)).toBe(value)
  })

  it('should not autop content containing <br /> (with space)', () => {
    const value = 'Line one<br />Line two'

    expect(paragraphize(value)).toBe(value)
  })

  it('should handle empty string', () => {
    expect(paragraphize('')).toBe('')
  })

  it('should pass through a wholly escaped HTML fragment', () => {
    // A double-escaping feed generator ships its HTML as entity text. The fragment must
    // stay intact so decodeDoubleEncodedTags sees it as one text node; paragraphizing
    // would cut it line-by-line and only complete-tag-pair lines would decode.
    const value = [
      '&lt;p&gt;A &lt;a href="https://example.com/about"&gt;now page&lt;/a&gt;',
      ': what has my attention this month.&lt;/p&gt;',
      '&lt;h2 id="building"&gt;',
      'Building',
      '&lt;/h2&gt;',
      '&lt;ul&gt;',
      '&lt;li&gt;first&lt;/li&gt;',
      '&lt;/ul&gt;',
    ].join('\n')

    expect(paragraphize(value)).toBe(value)
  })

  it('should paragraphize prose that mentions an escaped tag', () => {
    const value = 'Use the &lt;img&gt; tag for images\n\nMore text'
    const expected = '<p>Use the &lt;img&gt; tag for images</p>\n<p>More text</p>\n'

    expect(paragraphize(value)).toBe(expected)
  })

  it('should paragraphize escaped non-HTML markup', () => {
    const value =
      '&lt;dependency&gt;\n&lt;groupId&gt;org.example&lt;/groupId&gt;\n&lt;/dependency&gt;'
    const expected =
      '<p>&lt;dependency&gt;<br />\n&lt;groupId&gt;org.example&lt;/groupId&gt;<br />\n&lt;/dependency&gt;</p>\n'

    expect(paragraphize(value)).toBe(expected)
  })

  // Exact-output fixtures pinned to @wordpress/autop behavior on plain text,
  // captured before the dependency was inlined.
  describe('autop-compatible output', () => {
    it('should wrap a single chunk', () => {
      const value = 'Hello world'
      const expected = '<p>Hello world</p>\n'

      expect(paragraphize(value)).toBe(expected)
    })

    it('should split paragraphs and break lines', () => {
      const value = 'Multi\n\nMid\nLine\n\nLast'
      const expected = '<p>Multi</p>\n<p>Mid<br />\nLine</p>\n<p>Last</p>\n'

      expect(paragraphize(value)).toBe(expected)
    })

    it('should normalize Windows and bare carriage returns', () => {
      const value = 'A\r\nB\r\n\r\nC'
      const expected = '<p>A<br />\nB</p>\n<p>C</p>\n'

      expect(paragraphize(value)).toBe(expected)
    })

    it('should collapse runs of blank lines into one paragraph break', () => {
      const value = 'One\n\n\n\nTwo'
      const expected = '<p>One</p>\n<p>Two</p>\n'

      expect(paragraphize(value)).toBe(expected)
    })

    it('should drop whitespace-only chunks', () => {
      const value = 'Leading\n\n   \n\nTrailing\n'
      const expected = '<p>Leading</p>\n<p>Trailing</p>\n'

      expect(paragraphize(value)).toBe(expected)
    })

    it('should return an empty string for whitespace-only input', () => {
      const value = '  \n \n  '
      const expected = ''

      expect(paragraphize(value)).toBe(expected)
    })

    it('should consume whitespace before a line break', () => {
      const value = 'Line one \nLine two'
      const expected = '<p>Line one<br />\nLine two</p>\n'

      expect(paragraphize(value)).toBe(expected)
    })

    it('should keep whitespace after a line break', () => {
      const value = 'Line one\n  Line two'
      const expected = '<p>Line one<br />\n  Line two</p>\n'

      expect(paragraphize(value)).toBe(expected)
    })

    it('should not break on trailing newline and whitespace', () => {
      const value = 'X\n\nTrailing \n '
      const expected = '<p>X</p>\n<p>Trailing </p>\n'

      expect(paragraphize(value)).toBe(expected)
    })

    it('should not break on a single trailing newline', () => {
      const value = 'Solo\n'
      const expected = '<p>Solo</p>\n'

      expect(paragraphize(value)).toBe(expected)
    })

    it('should leave lone angle brackets untouched', () => {
      const value = 'a < b and c > d'
      const expected = '<p>a < b and c > d</p>\n'

      expect(paragraphize(value)).toBe(expected)
    })
  })

  it('should be idempotent', async () => {
    const value = 'First paragraph\n\nSecond paragraph'
    const once = await paragraphize(value)
    const twice = await paragraphize(once)

    expect(twice).toBe(once)
  })
})
