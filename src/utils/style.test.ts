import { expect, it } from 'bun:test'
import { describeForEachParser, queryElement } from '../tests.js'
import {
  bgImage,
  type ElementStyles,
  getElementStyles,
  styleKeyword,
  styleLength,
} from './style.js'

describeForEachParser('bgImage', (parseHtml) => {
  it('should return the url from an unquoted background-image', () => {
    const document = parseHtml(
      '<a style="background-image: url(https://example.com/cover.jpg)"></a>',
    )

    expect(bgImage(queryElement(document, 'a'))).toBe('https://example.com/cover.jpg')
  })

  it('should return the url from a quoted background-image', () => {
    const document = parseHtml(
      `<a style="background-image: url('https://example.com/cover.jpg');"></a>`,
    )

    expect(bgImage(queryElement(document, 'a'))).toBe('https://example.com/cover.jpg')
  })

  it('should return the url from a background shorthand', () => {
    const document = parseHtml(
      '<a style="background: #fff url(https://example.com/c.png) no-repeat"></a>',
    )

    expect(bgImage(queryElement(document, 'a'))).toBe('https://example.com/c.png')
  })

  it('should return undefined when the style carries no url', () => {
    const document = parseHtml('<a style="background-color: #fff"></a>')

    expect(bgImage(queryElement(document, 'a'))).toBeUndefined()
  })

  it('should take the url from the background, not from another property', () => {
    const document = parseHtml(
      '<a style="cursor: url(https://example.com/pointer.png); background-image: url(https://example.com/cover.jpg)"></a>',
    )

    expect(bgImage(queryElement(document, 'a'))).toBe('https://example.com/cover.jpg')
  })

  it('should return undefined when the only url paints something other than the background', () => {
    const document = parseHtml('<a style="cursor: url(https://example.com/pointer.png)"></a>')

    expect(bgImage(queryElement(document, 'a'))).toBeUndefined()
  })

  it('should return undefined when there is no style attribute', () => {
    const document = parseHtml('<a></a>')

    expect(bgImage(queryElement(document, 'a'))).toBeUndefined()
  })

  it('should return undefined for a nullish element', () => {
    expect(bgImage(undefined)).toBeUndefined()
  })
})

describeForEachParser('getElementStyles', (parseHtml) => {
  it('should key each declaration by its property name', () => {
    const document = parseHtml('<div style="color: red; max-width: 800px"></div>')
    const element = queryElement(document, 'div')
    const expected: ElementStyles = { color: 'red', 'max-width': '800px' }

    expect(getElementStyles(element)).toEqual(expected)
  })

  // CSS property names are case-insensitive, and a browser honours this declaration.
  it('should lowercase the property name', () => {
    const document = parseHtml('<div style="MAX-WIDTH: 800px"></div>')
    const element = queryElement(document, 'div')

    expect(getElementStyles(element)['max-width']).toBe('800px')
  })

  // Custom properties are the one place CSS is case-sensitive, so `--Foo` is not `--foo`.
  it('should keep the case of a custom property', () => {
    const document = parseHtml('<div style="--Foo: 1"></div>')
    const element = queryElement(document, 'div')

    expect(getElementStyles(element)['--Foo']).toBe('1')
    expect(getElementStyles(element)['--foo']).toBeUndefined()
  })

  it('should not read a custom property as the standard one it is named after', () => {
    const document = parseHtml('<div style="--aspect-ratio: 690/362"></div>')
    const element = queryElement(document, 'div')

    expect(getElementStyles(element)['aspect-ratio']).toBeUndefined()
  })

  it('should not end a declaration at a semicolon inside url()', () => {
    const style = 'background: url(data:image/png;base64,AA==); max-width: 800px'
    const document = parseHtml(`<div style="${style}"></div>`)
    const element = queryElement(document, 'div')
    const expected: ElementStyles = {
      background: 'url(data:image/png;base64,AA==)',
      'max-width': '800px',
    }

    expect(getElementStyles(element)).toEqual(expected)
  })

  it('should not end a declaration at a semicolon inside a quoted value', () => {
    const document = parseHtml(`<div style="content: 'a;b'; max-width: 800px"></div>`)
    const element = queryElement(document, 'div')
    const expected: ElementStyles = { content: "'a;b'", 'max-width': '800px' }

    expect(getElementStyles(element)).toEqual(expected)
  })

  // The escaped quote does not close the string, so the semicolon after it is still inside.
  it('should not end a declaration at an escaped quote inside a value', () => {
    const document = parseHtml(String.raw`<div style='content: "a\";b"'></div>`)
    const element = queryElement(document, 'div')
    const expected: ElementStyles = { content: String.raw`"a\";b"` }

    expect(getElementStyles(element)).toEqual(expected)
  })

  // A browser treats a comment as whitespace, so the declaration beside it is a real one.
  it('should read a declaration a comment sits in front of', () => {
    const document = parseHtml('<div style="/* hi */max-width: 800px"></div>')
    const element = queryElement(document, 'div')
    const expected: ElementStyles = { 'max-width': '800px' }

    expect(getElementStyles(element)).toEqual(expected)
  })

  it('should not end a declaration at a semicolon inside a comment', () => {
    const document = parseHtml('<div style="color: red /* a; b: c */; max-width: 800px"></div>')
    const element = queryElement(document, 'div')
    const expected: ElementStyles = { color: 'red', 'max-width': '800px' }

    expect(getElementStyles(element)).toEqual(expected)
  })

  it('should read a declaration a comment splits in two', () => {
    const document = parseHtml('<div style="max-/* hi */width: 800px"></div>')
    const element = queryElement(document, 'div')

    expect(getElementStyles(element)['max- width']).toBe('800px')
  })

  it('should drop an unterminated comment and what follows it', () => {
    const document = parseHtml('<div style="max-width: 800px; color: /* red"></div>')
    const element = queryElement(document, 'div')
    const expected: ElementStyles = { 'max-width': '800px' }

    expect(getElementStyles(element)).toEqual(expected)
  })

  // Only the scan decides what a comment is, so a quoted value keeps a `/*` it states itself.
  it('should keep comment markers a quoted value states as its content', () => {
    const document = parseHtml(`<div style="content: '/* hi */'"></div>`)
    const element = queryElement(document, 'div')

    expect(getElementStyles(element).content).toBe("'/* hi */'")
  })

  it('should drop the important flag from the value', () => {
    const document = parseHtml('<div style="max-width: 800px !important"></div>')
    const element = queryElement(document, 'div')

    expect(getElementStyles(element)['max-width']).toBe('800px')
  })

  // The later declaration is the one a browser applies.
  it('should take the last value of a repeated property', () => {
    const document = parseHtml('<div style="width: 10px; width: 20px"></div>')
    const element = queryElement(document, 'div')

    expect(getElementStyles(element).width).toBe('20px')
  })

  it('should skip a fragment that states no value', () => {
    const document = parseHtml('<div style="color: red;;;nonsense"></div>')
    const element = queryElement(document, 'div')
    const expected: ElementStyles = { color: 'red' }

    expect(getElementStyles(element)).toEqual(expected)
  })

  it('should read the declarations again after the style attribute changes', () => {
    const document = parseHtml('<div style="width: 10px"></div>')
    const element = queryElement(document, 'div')

    expect(getElementStyles(element).width).toBe('10px')

    element.setAttribute('style', 'width: 20px')

    expect(getElementStyles(element).width).toBe('20px')
  })

  it('should return no declarations when the element has no style', () => {
    const document = parseHtml('<div></div>')
    const element = queryElement(document, 'div')

    expect(Object.keys(getElementStyles(element))).toHaveLength(0)
  })

  it('should return no declarations for a nullish element', () => {
    expect(Object.keys(getElementStyles(undefined))).toHaveLength(0)
  })
})

describeForEachParser('styleKeyword', (parseHtml) => {
  // CSS keywords are case-insensitive, and the caller compares against a lowercase one.
  it('should lowercase the value', () => {
    const document = parseHtml('<div style="display: NONE"></div>')
    const element = queryElement(document, 'div')

    expect(styleKeyword(element, 'display')).toBe('none')
  })

  it('should read a keyword the publisher marked important', () => {
    const document = parseHtml('<div style="visibility: Hidden !important"></div>')
    const element = queryElement(document, 'div')

    expect(styleKeyword(element, 'visibility')).toBe('hidden')
  })

  it('should return undefined when the property is not stated', () => {
    const document = parseHtml('<div style="color: red"></div>')
    const element = queryElement(document, 'div')

    expect(styleKeyword(element, 'display')).toBeUndefined()
  })

  it('should return undefined for a nullish element', () => {
    expect(styleKeyword(undefined, 'display')).toBeUndefined()
  })
})

describeForEachParser('styleLength', (parseHtml) => {
  it('should read the digits of the named property', () => {
    const document = parseHtml('<div style="max-width: 605px; min-width: 325px"></div>')
    const element = queryElement(document, 'div')

    expect(styleLength(element, 'max-width')).toBe('605')
  })

  it('should read a unitless value and a fraction', () => {
    const document = parseHtml('<div style="height: 758.53"></div>')
    const element = queryElement(document, 'div')

    expect(styleLength(element, 'height')).toBe('758.53')
  })

  // The value is returned as digits, not a number, so each caller picks its own parser:
  // getElementDimensions needs 0 to come through for removeTrackingPixels, and a resolver
  // reading a player's own size runs it through parsePixelSize, which would reject 0.
  it('should return the digits unparsed', () => {
    const document = parseHtml('<img style="width: 0">')
    const element = queryElement(document, 'img')

    expect(styleLength(element, 'width')).toBe('0')
  })

  it('should not confuse a property with a longer one that contains it', () => {
    const document = parseHtml('<div style="max-width: 605px"></div>')
    const element = queryElement(document, 'div')

    expect(styleLength(element, 'width')).toBeUndefined()
  })

  it('should match a property name whatever its case', () => {
    const document = parseHtml('<div style="MAX-WIDTH: 605px"></div>')
    const element = queryElement(document, 'div')

    expect(styleLength(element, 'max-width')).toBe('605')
  })

  it('should read a length carrying the sign CSS allows', () => {
    const document = parseHtml('<div style="width: +800px"></div>')
    const element = queryElement(document, 'div')

    expect(styleLength(element, 'width')).toBe('800')
  })

  it('should ignore a negative length, which is not a size', () => {
    const document = parseHtml('<div style="width: -800px"></div>')
    const element = queryElement(document, 'div')

    expect(styleLength(element, 'width')).toBeUndefined()
  })

  it('should ignore a value in a unit that is not pixels', () => {
    const document = parseHtml('<div style="max-width: 80em"></div>')
    const element = queryElement(document, 'div')

    expect(styleLength(element, 'max-width')).toBeUndefined()
  })

  it('should not backtrack quadratically on a long invalid numeric value', () => {
    // A long digit run followed by a non-terminator made the ambiguous `[0-9]*\.?[0-9]+`
    // form take seconds. This completes instantly and matches nothing.
    const value = `width:${'9'.repeat(50000)}${'a'.repeat(50000)}`
    const document = parseHtml(`<img style="${value}">`)
    const element = queryElement(document, 'img')

    expect(styleLength(element, 'width')).toBeUndefined()
  })

  it('should read a length the publisher marked important', () => {
    const document = parseHtml('<div style="width: 640px!important; height: 360px"></div>')
    const element = queryElement(document, 'div')

    expect(styleLength(element, 'width')).toBe('640')
  })

  it('should return undefined when the element has no style', () => {
    const document = parseHtml('<div></div>')
    const element = queryElement(document, 'div')

    expect(styleLength(element, 'width')).toBeUndefined()
  })

  it('should return undefined for a nullish element', () => {
    expect(styleLength(undefined, 'width')).toBeUndefined()
  })
})
