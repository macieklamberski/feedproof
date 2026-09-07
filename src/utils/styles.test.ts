import { expect, it } from 'bun:test'
import { describeForEachParser, queryElement } from '../tests.js'
import * as styles from './styles.js'

describeForEachParser('bgImage', (parseHtml) => {
  it('should return the url from an unquoted background-image', () => {
    const document = parseHtml(
      '<a style="background-image: url(https://example.com/cover.jpg)"></a>',
    )

    expect(styles.bgImage(queryElement(document, 'a'))).toBe('https://example.com/cover.jpg')
  })

  it('should return the url from a quoted background-image', () => {
    const document = parseHtml(
      `<a style="background-image: url('https://example.com/cover.jpg');"></a>`,
    )

    expect(styles.bgImage(queryElement(document, 'a'))).toBe('https://example.com/cover.jpg')
  })

  it('should return the url from a background shorthand', () => {
    const document = parseHtml(
      '<a style="background: #fff url(https://example.com/c.png) no-repeat"></a>',
    )

    expect(styles.bgImage(queryElement(document, 'a'))).toBe('https://example.com/c.png')
  })

  it('should return undefined when the style carries no url', () => {
    const document = parseHtml('<a style="background-color: #fff"></a>')

    expect(styles.bgImage(queryElement(document, 'a'))).toBeUndefined()
  })

  it('should take the url from the background, not from another property', () => {
    const document = parseHtml(
      '<a style="cursor: url(https://example.com/pointer.png); background-image: url(https://example.com/cover.jpg)"></a>',
    )

    expect(styles.bgImage(queryElement(document, 'a'))).toBe('https://example.com/cover.jpg')
  })

  it('should return undefined when the only url paints something other than the background', () => {
    const document = parseHtml('<a style="cursor: url(https://example.com/pointer.png)"></a>')

    expect(styles.bgImage(queryElement(document, 'a'))).toBeUndefined()
  })

  it('should return undefined when there is no style attribute', () => {
    const document = parseHtml('<a></a>')

    expect(styles.bgImage(queryElement(document, 'a'))).toBeUndefined()
  })

  it('should return undefined for a nullish element', () => {
    expect(styles.bgImage(undefined)).toBeUndefined()
  })
})

describeForEachParser('declarations', (parseHtml) => {
  it('should key each declaration by its property name', () => {
    const document = parseHtml('<div style="color: red; max-width: 800px"></div>')
    const element = queryElement(document, 'div')
    const expected: styles.Declarations = { color: 'red', 'max-width': '800px' }

    expect(styles.declarations(element)).toEqual(expected)
  })

  // CSS property names are case-insensitive, and a browser honours this declaration.
  it('should lowercase the property name', () => {
    const document = parseHtml('<div style="MAX-WIDTH: 800px"></div>')
    const element = queryElement(document, 'div')

    expect(styles.declarations(element)['max-width']).toBe('800px')
  })

  // Custom properties are the one place CSS is case-sensitive, so `--Foo` is not `--foo`.
  it('should keep the case of a custom property', () => {
    const document = parseHtml('<div style="--Foo: 1"></div>')
    const element = queryElement(document, 'div')

    expect(styles.declarations(element)['--Foo']).toBe('1')
    expect(styles.declarations(element)['--foo']).toBeUndefined()
  })

  it('should not read a custom property as the standard one it is named after', () => {
    const document = parseHtml('<div style="--aspect-ratio: 690/362"></div>')
    const element = queryElement(document, 'div')

    expect(styles.declarations(element)['aspect-ratio']).toBeUndefined()
  })

  it('should not end a declaration at a semicolon inside url()', () => {
    const attribute = 'background: url(data:image/png;base64,AA==); max-width: 800px'
    const document = parseHtml(`<div style="${attribute}"></div>`)
    const element = queryElement(document, 'div')
    const expected: styles.Declarations = {
      background: 'url(data:image/png;base64,AA==)',
      'max-width': '800px',
    }

    expect(styles.declarations(element)).toEqual(expected)
  })

  it('should not end a declaration at a semicolon inside a quoted value', () => {
    const document = parseHtml(`<div style="content: 'a;b'; max-width: 800px"></div>`)
    const element = queryElement(document, 'div')
    const expected: styles.Declarations = { content: "'a;b'", 'max-width': '800px' }

    expect(styles.declarations(element)).toEqual(expected)
  })

  // The escaped quote does not close the string, so the semicolon after it is still inside.
  it('should not end a declaration at an escaped quote inside a value', () => {
    const document = parseHtml(String.raw`<div style='content: "a\";b"'></div>`)
    const element = queryElement(document, 'div')
    const expected: styles.Declarations = { content: String.raw`"a\";b"` }

    expect(styles.declarations(element)).toEqual(expected)
  })

  // A browser treats a comment as whitespace, so the declaration beside it is a real one.
  it('should read a declaration a comment sits in front of', () => {
    const document = parseHtml('<div style="/* hi */max-width: 800px"></div>')
    const element = queryElement(document, 'div')
    const expected: styles.Declarations = { 'max-width': '800px' }

    expect(styles.declarations(element)).toEqual(expected)
  })

  it('should not end a declaration at a semicolon inside a comment', () => {
    const document = parseHtml('<div style="color: red /* a; b: c */; max-width: 800px"></div>')
    const element = queryElement(document, 'div')
    const expected: styles.Declarations = { color: 'red', 'max-width': '800px' }

    expect(styles.declarations(element)).toEqual(expected)
  })

  it('should read a declaration a comment splits in two', () => {
    const document = parseHtml('<div style="max-/* hi */width: 800px"></div>')
    const element = queryElement(document, 'div')

    expect(styles.declarations(element)['max- width']).toBe('800px')
  })

  it('should drop an unterminated comment and what follows it', () => {
    const document = parseHtml('<div style="max-width: 800px; color: /* red"></div>')
    const element = queryElement(document, 'div')
    const expected: styles.Declarations = { 'max-width': '800px' }

    expect(styles.declarations(element)).toEqual(expected)
  })

  // Only the scan decides what a comment is, so a quoted value keeps a `/*` it states itself.
  it('should keep comment markers a quoted value states as its content', () => {
    const document = parseHtml(`<div style="content: '/* hi */'"></div>`)
    const element = queryElement(document, 'div')

    expect(styles.declarations(element).content).toBe("'/* hi */'")
  })

  // The shorthand paints its own background, so the image the longhand named is gone.
  it('should drop a longhand the shorthand after it resets', () => {
    const document = parseHtml('<div style="background-image: url(a.png); background: red"></div>')
    const element = queryElement(document, 'div')
    const expected: styles.Declarations = { background: 'red' }

    expect(styles.declarations(element)).toEqual(expected)
  })

  it('should keep a longhand stated after the shorthand', () => {
    const document = parseHtml('<div style="background: red; background-image: url(a.png)"></div>')
    const element = queryElement(document, 'div')
    const expected: styles.Declarations = { background: 'red', 'background-image': 'url(a.png)' }

    expect(styles.declarations(element)).toEqual(expected)
  })

  it('should drop the padding sides the shorthand after them resets', () => {
    const document = parseHtml('<div style="padding-bottom: 10px; padding: 0 0 56.25%"></div>')
    const element = queryElement(document, 'div')
    const expected: styles.Declarations = { padding: '0 0 56.25%' }

    expect(styles.declarations(element)).toEqual(expected)
  })

  it('should drop the important flag from the value', () => {
    const document = parseHtml('<div style="max-width: 800px !important"></div>')
    const element = queryElement(document, 'div')

    expect(styles.declarations(element)['max-width']).toBe('800px')
  })

  // A feed writes the attribute, so the parse has to stay linear in its length. This input took
  // 2 seconds before nothing was matched ahead of the `!` and takes 11 milliseconds now, so the
  // threshold sits well clear of both and a loaded machine cannot flip it.
  it('should parse a value holding a long run of spaces in linear time', () => {
    const document = parseHtml(`<div style="aspect-ratio: 16/9${' '.repeat(120000)}"></div>`)
    const element = queryElement(document, 'div')
    const start = performance.now()

    expect(styles.declarations(element)['aspect-ratio']).toBe('16/9')
    expect(performance.now() - start).toBeLessThan(500)
  })

  // The later declaration is the one a browser applies.
  it('should take the last value of a repeated property', () => {
    const document = parseHtml('<div style="width: 10px; width: 20px"></div>')
    const element = queryElement(document, 'div')

    expect(styles.declarations(element).width).toBe('20px')
  })

  it('should skip a fragment that states no value', () => {
    const document = parseHtml('<div style="color: red;;;nonsense"></div>')
    const element = queryElement(document, 'div')
    const expected: styles.Declarations = { color: 'red' }

    expect(styles.declarations(element)).toEqual(expected)
  })

  it('should read the declarations again after the style attribute changes', () => {
    const document = parseHtml('<div style="width: 10px"></div>')
    const element = queryElement(document, 'div')

    expect(styles.declarations(element).width).toBe('10px')

    element.setAttribute('style', 'width: 20px')

    expect(styles.declarations(element).width).toBe('20px')
  })

  it('should return no declarations when the element has no style', () => {
    const document = parseHtml('<div></div>')
    const element = queryElement(document, 'div')

    expect(Object.keys(styles.declarations(element))).toHaveLength(0)
  })

  it('should return no declarations for a nullish element', () => {
    expect(Object.keys(styles.declarations(undefined))).toHaveLength(0)
  })
})

describeForEachParser('keyword', (parseHtml) => {
  // CSS keywords are case-insensitive, and the caller compares against a lowercase one.
  it('should lowercase the value', () => {
    const document = parseHtml('<div style="display: NONE"></div>')
    const element = queryElement(document, 'div')

    expect(styles.keyword(element, 'display')).toBe('none')
  })

  it('should read a keyword the publisher marked important', () => {
    const document = parseHtml('<div style="visibility: Hidden !important"></div>')
    const element = queryElement(document, 'div')

    expect(styles.keyword(element, 'visibility')).toBe('hidden')
  })

  it('should return undefined when the property is not stated', () => {
    const document = parseHtml('<div style="color: red"></div>')
    const element = queryElement(document, 'div')

    expect(styles.keyword(element, 'display')).toBeUndefined()
  })

  it('should return undefined for a nullish element', () => {
    expect(styles.keyword(undefined, 'display')).toBeUndefined()
  })
})

describeForEachParser('number', (parseHtml) => {
  it('should read a plain number', () => {
    const document = parseHtml('<div style="opacity: 0.5"></div>')
    const element = queryElement(document, 'div')

    expect(styles.number(element, 'opacity')).toBe(0.5)
  })

  it('should read a number written with an exponent', () => {
    const document = parseHtml('<div style="opacity: 5e-1"></div>')
    const element = queryElement(document, 'div')

    expect(styles.number(element, 'opacity')).toBe(0.5)
  })

  // Opacity states half as `50%`, which is the same as `0.5`.
  it('should read a percentage as the fraction it names', () => {
    const document = parseHtml('<div style="opacity: 50%"></div>')
    const element = queryElement(document, 'div')

    expect(styles.number(element, 'opacity')).toBe(0.5)
  })

  // Number.parseFloat reads this as zero, and CSS has no such spelling for a number.
  it('should ignore a value CSS cannot state', () => {
    const document = parseHtml('<div style="opacity: 0x0"></div>')
    const element = queryElement(document, 'div')

    expect(styles.number(element, 'opacity')).toBeUndefined()
  })

  it('should ignore a number carrying a unit', () => {
    const document = parseHtml('<div style="opacity: 5px"></div>')
    const element = queryElement(document, 'div')

    expect(styles.number(element, 'opacity')).toBeUndefined()
  })

  it('should return undefined when the property is not stated', () => {
    const document = parseHtml('<div style="color: red"></div>')
    const element = queryElement(document, 'div')

    expect(styles.number(element, 'opacity')).toBeUndefined()
  })

  it('should return undefined for a nullish element', () => {
    expect(styles.number(undefined, 'opacity')).toBeUndefined()
  })
})

describeForEachParser('pixels', (parseHtml) => {
  it('should read the digits of the named property', () => {
    const document = parseHtml('<div style="max-width: 605px; min-width: 325px"></div>')
    const element = queryElement(document, 'div')

    expect(styles.pixels(element, 'max-width')).toBe('605')
  })

  it('should read a unitless value and a fraction', () => {
    const document = parseHtml('<div style="height: 758.53"></div>')
    const element = queryElement(document, 'div')

    expect(styles.pixels(element, 'height')).toBe('758.53')
  })

  // The value is returned as digits, not a number, so each caller picks its own parser:
  // getElementDimensions needs 0 to come through for removeTrackingPixels, and a resolver
  // reading a player's own size runs it through parsePixelSize, which would reject 0.
  it('should return the digits unparsed', () => {
    const document = parseHtml('<img style="width: 0">')
    const element = queryElement(document, 'img')

    expect(styles.pixels(element, 'width')).toBe('0')
  })

  it('should not confuse a property with a longer one that contains it', () => {
    const document = parseHtml('<div style="max-width: 605px"></div>')
    const element = queryElement(document, 'div')

    expect(styles.pixels(element, 'width')).toBeUndefined()
  })

  it('should match a property name whatever its case', () => {
    const document = parseHtml('<div style="MAX-WIDTH: 605px"></div>')
    const element = queryElement(document, 'div')

    expect(styles.pixels(element, 'max-width')).toBe('605')
  })

  it('should read a length carrying the sign CSS allows', () => {
    const document = parseHtml('<div style="width: +800px"></div>')
    const element = queryElement(document, 'div')

    expect(styles.pixels(element, 'width')).toBe('800')
  })

  it('should ignore a negative length, which is not a size', () => {
    const document = parseHtml('<div style="width: -800px"></div>')
    const element = queryElement(document, 'div')

    expect(styles.pixels(element, 'width')).toBeUndefined()
  })

  it('should ignore a value in a unit that is not pixels', () => {
    const document = parseHtml('<div style="max-width: 80em"></div>')
    const element = queryElement(document, 'div')

    expect(styles.pixels(element, 'max-width')).toBeUndefined()
  })

  it('should not backtrack quadratically on a long invalid numeric value', () => {
    // A long digit run followed by a non-terminator made the ambiguous `[0-9]*\.?[0-9]+`
    // form take seconds. This completes instantly and matches nothing.
    const value = `width:${'9'.repeat(50000)}${'a'.repeat(50000)}`
    const document = parseHtml(`<img style="${value}">`)
    const element = queryElement(document, 'img')

    expect(styles.pixels(element, 'width')).toBeUndefined()
  })

  it('should read a length the publisher marked important', () => {
    const document = parseHtml('<div style="width: 640px!important; height: 360px"></div>')
    const element = queryElement(document, 'div')

    expect(styles.pixels(element, 'width')).toBe('640')
  })

  it('should return undefined when the element has no style', () => {
    const document = parseHtml('<div></div>')
    const element = queryElement(document, 'div')

    expect(styles.pixels(element, 'width')).toBeUndefined()
  })

  it('should return undefined for a nullish element', () => {
    expect(styles.pixels(undefined, 'width')).toBeUndefined()
  })
})
