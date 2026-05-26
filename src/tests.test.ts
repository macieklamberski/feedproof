import { describe, expect, it } from 'bun:test'
import { selectParsers } from './tests.js'

describe('selectParsers', () => {
  it('should return every parser when no library is selected', () => {
    expect(selectParsers(undefined).map(([name]) => name)).toEqual(['linkedom', 'jsdom'])
  })

  it('should narrow to the selected library', () => {
    expect(selectParsers('jsdom').map(([name]) => name)).toEqual(['jsdom'])
  })

  it('should throw on an unknown library', () => {
    expect(() => selectParsers('bogus')).toThrow('Unknown DOM_LIBRARY "bogus"')
  })
})

describe('toEqualHtml', () => {
  it('should pass when HTML is DOM-equal across serializations', () => {
    expect('<img src="u?a=1&b=2">').toEqualHtml('<img src="u?a=1&amp;b=2">')
  })

  it('should fail with a diff when the DOM differs', () => {
    expect(() => expect('<p>a</p>').toEqualHtml('<p>b</p>')).toThrow('to equal')
  })

  it('should fail under .not when the HTML is equal', () => {
    expect(() => expect('<p>a</p>').not.toEqualHtml('<p>a</p>')).toThrow('to equal')
  })
})

describe('toContainHtml', () => {
  it('should pass when the substring is present after normalization', () => {
    expect('<img src="u?a=1&b=2">').toContainHtml('src="u?a=1&b=2"')
  })

  it('should fail when the substring is absent', () => {
    expect(() => expect('<p>a</p>').toContainHtml('<span>')).toThrow('contain substring')
  })

  it('should fail under .not when the substring is present', () => {
    expect(() => expect('<p>a</p>').not.toContainHtml('<p>a</p>')).toThrow('contain substring')
  })
})
