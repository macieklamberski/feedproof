import { describe, expect, it } from 'bun:test'
import { parseHtml } from './parsers/linkedom.js'
import { html, queryElement, selectParsers } from './tests.js'

describe('selectParsers', () => {
  it('should return every parser when no library is selected', () => {
    expect(selectParsers(undefined).map(([name]) => name)).toEqual(['linkedom', 'jsdom'])
  })

  it('should narrow to the selected library', () => {
    expect(selectParsers('jsdom').map(([name]) => name)).toEqual(['jsdom'])
  })

  it('should narrow to the linkedom library', () => {
    expect(selectParsers('linkedom').map(([name]) => name)).toEqual(['linkedom'])
  })

  it('should throw on an unknown library', () => {
    const throwing = () => selectParsers('bogus')

    expect(throwing).toThrow('Unknown DOM_LIBRARY "bogus"')
  })
})

describe('queryElement', () => {
  it('should return the element matching the selector', () => {
    const document = parseHtml('<p><img src="photo.jpg"></p>')

    expect(queryElement(document, 'img').getAttribute('src')).toBe('photo.jpg')
  })

  it('should throw when no element matches', () => {
    const document = parseHtml('<p>No media here</p>')
    const throwing = () => queryElement(document, 'video')

    expect(throwing).toThrow('No element matches selector "video".')
  })
})

describe('html', () => {
  it('should join lines with nothing at tag boundaries', () => {
    const value = html`
      <ul>
        <li>a</li>
      </ul>
      <ol>
        <li>b</li>
      </ol>
    `
    const expected = '<ul><li>a</li></ul><ol><li>b</li></ol>'

    expect(value).toBe(expected)
  })

  it('should join attribute lines with a space and glue a standalone closing bracket', () => {
    const value = html`
      <div
        class="card"
        id="post"
      >
        <span>text</span>
      </div>
    `
    const expected = '<div class="card" id="post"><span>text</span></div>'

    expect(value).toBe(expected)
  })

  it('should join a standalone self-closing bracket with a space', () => {
    const value = html`
      <img
        src="photo.jpg"
      />
    `
    const expected = '<img src="photo.jpg" />'

    expect(value).toBe(expected)
  })

  it('should interpolate values', () => {
    const source = 'photo.jpg'
    const value = html`
      <img src="${source}">
    `
    const expected = '<img src="photo.jpg">'

    expect(value).toBe(expected)
  })
})

describe('toEqualHtml', () => {
  it('should pass when HTML is DOM-equal across serializations', () => {
    expect('<img src="u?a=1&b=2">').toEqualHtml('<img src="u?a=1&amp;b=2">')
  })

  it('should pass when only the attribute order differs', () => {
    expect('<img src="photo.jpg" alt="Photo">').toEqualHtml('<img alt="Photo" src="photo.jpg">')
  })

  it('should pass when a boolean attribute is serialized with an empty value', () => {
    expect('<video controls></video>').toEqualHtml('<video controls=""></video>')
  })

  it('should fail with a diff when the DOM differs', () => {
    const throwing = () => expect('<p>a</p>').toEqualHtml('<p>b</p>')

    expect(throwing).toThrow('to equal')
  })

  it('should fail under .not when the HTML is equal', () => {
    const throwing = () => expect('<p>a</p>').not.toEqualHtml('<p>a</p>')

    expect(throwing).toThrow('to equal')
  })

  // Both sides go through a parser to be compared, so anything a parse repairs would otherwise
  // be repaired on both sides and the assertion would pass on malformed output. Each case below
  // is a defect a transform could emit whose expected value is the same markup written correctly.
  describe('malformed received HTML', () => {
    it('should fail on an unclosed tag', () => {
      const throwing = () => expect('<div><span>x</div>').toEqualHtml('<div><span>x</span></div>')

      expect(throwing).toThrow('malformed')
    })

    it('should fail on a stray closing tag', () => {
      const throwing = () => expect('<p>a</p></div>').toEqualHtml('<p>a</p>')

      expect(throwing).toThrow('malformed')
    })

    it('should fail on a block element inside a paragraph', () => {
      const throwing = () => expect('<p>a<div>b</div></p>').toEqualHtml('<p>a</p><div>b</div>')

      expect(throwing).toThrow('malformed')
    })

    it('should fail on a duplicate attribute', () => {
      const throwing = () =>
        expect('<img src="a.jpg" src="b.jpg">').toEqualHtml('<img src="a.jpg">')

      expect(throwing).toThrow('malformed')
    })

    it('should read an attribute value without taking its words for attribute names', () => {
      expect('<div data-title="Sample Title Sample"></div>').toEqualHtml(
        '<div data-title="Sample Title Sample"></div>',
      )
    })

    it('should accept a self-closing foreign element against its expanded spelling', () => {
      expect('<svg><image href="a.png" /></svg>').toEqualHtml(
        '<svg><image href="a.png"></image></svg>',
      )
    })

    it('should accept a void element with no closing tag', () => {
      expect('<p>a<br>b<img src="a.jpg"></p>').toEqualHtml('<p>a<br>b<img src="a.jpg"></p>')
    })
  })
})

describe('toContainHtml', () => {
  it('should pass when the substring is present after normalization', () => {
    expect('<img src="u?a=1&b=2">').toContainHtml('src="u?a=1&b=2"')
  })

  it('should fail when the substring is absent', () => {
    const throwing = () => expect('<p>a</p>').toContainHtml('<span>')

    expect(throwing).toThrow('contain substring')
  })

  it('should fail under .not when the substring is present', () => {
    const throwing = () => expect('<p>a</p>').not.toContainHtml('<p>a</p>')

    expect(throwing).toThrow('contain substring')
  })
})
