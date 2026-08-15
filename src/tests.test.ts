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
      <ul><li>a</li></ul>
      <ol><li>b</li></ol>
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
