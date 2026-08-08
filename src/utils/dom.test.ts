import { describe, expect, it } from 'bun:test'
import { describeForEachParser, queryElement } from '../tests.js'
import {
  attr,
  bgImage,
  find,
  getElementDimensions,
  getWrapperRatioDimensions,
  hasAncestorWithTagName,
  isElementHidden,
  parseRatioDimensions,
  removeWithEmptyWrappers,
  text,
  textNode,
  walkElements,
} from './dom.js'

describeForEachParser('getElementDimensions', (parseHtml) => {
  it('should return both dimensions from attributes', () => {
    const document = parseHtml('<img width="320" height="240">')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: 320, height: 240 })
  })

  it('should return only width when only width attribute is set', () => {
    const document = parseHtml('<img width="100">')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: 100, height: undefined })
  })

  it('should read px-suffixed dimensions from style when attributes are missing', () => {
    const document = parseHtml('<img style="width: 50px; height: 25px">')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: 50, height: 25 })
  })

  it('should read unitless dimensions from style', () => {
    const document = parseHtml('<img style="width: 10; height: 5">')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: 10, height: 5 })
  })

  it('should ignore em / rem / % units in style', () => {
    const document = parseHtml('<img style="width: 1.5em; height: 100%">')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: undefined, height: undefined })
  })

  it('should fall back to style when attribute is non-numeric', () => {
    const document = parseHtml('<img width="auto" style="width: 200px">')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: 200, height: undefined })
  })

  it('should treat an empty attribute as absent rather than zero', () => {
    const document = parseHtml('<img width="" height="">')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: undefined, height: undefined })
  })

  it('should fall back to style when the attribute is empty', () => {
    const document = parseHtml('<img width="" style="width: 300px; height: 200px">')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: 300, height: 200 })
  })

  it('should read both dimensions from data-image-dimensions', () => {
    const document = parseHtml('<img data-image-dimensions="2500x1695">')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: 2500, height: 1695 })
  })

  it('should prefer real attributes over data-image-dimensions', () => {
    const document = parseHtml('<img width="800" height="600" data-image-dimensions="2500x1695">')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: 800, height: 600 })
  })

  it('should prefer data-image-dimensions over style', () => {
    const document = parseHtml(
      '<img data-image-dimensions="2500x1695" style="width: 300px; height: 200px">',
    )
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: 2500, height: 1695 })
  })

  it('should ignore a malformed data-image-dimensions value', () => {
    const document = parseHtml('<img data-image-dimensions="wide">')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: undefined, height: undefined })
  })

  it('should prefer attribute over style when both are present', () => {
    const document = parseHtml('<img width="100" style="width: 999px">')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: 100, height: undefined })
  })

  it('should return both undefined for an element with neither', () => {
    const document = parseHtml('<img>')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: undefined, height: undefined })
  })

  it('should not backtrack quadratically on a long invalid numeric style value', () => {
    // A long digit run followed by a non-terminator made the old `[0-9]*\.?[0-9]+`
    // form take seconds; this completes instantly and matches nothing.
    const value = `width:${'9'.repeat(50000)}${'a'.repeat(50000)}`
    const document = parseHtml(`<img style="${value}">`)
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: undefined, height: undefined })
  })

  it('should extract the correct property from multi-property style', () => {
    const document = parseHtml('<img style="color: red; width: 10px; height: 20px">')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: 10, height: 20 })
  })

  it('should parse decimal dimensions from style', () => {
    const document = parseHtml('<img style="width: 1.5px; height: 2.5">')
    const image = queryElement(document, 'img')

    expect(getElementDimensions(image)).toEqual({ width: 1.5, height: 2.5 })
  })
})

describeForEachParser('isElementHidden', (parseHtml) => {
  it('should return true for the hidden attribute', () => {
    const document = parseHtml('<div hidden>x</div>')
    const element = queryElement(document, 'div')

    expect(isElementHidden(element)).toBe(true)
  })

  it('should return true for inline display:none', () => {
    const document = parseHtml('<div style="display: none">x</div>')
    const element = queryElement(document, 'div')

    expect(isElementHidden(element)).toBe(true)
  })

  it('should return true for inline visibility:hidden', () => {
    const document = parseHtml('<div style="visibility: hidden">x</div>')
    const element = queryElement(document, 'div')

    expect(isElementHidden(element)).toBe(true)
  })

  it('should match display:none among other declarations', () => {
    const document = parseHtml('<div style="color: red; display: none">x</div>')
    const element = queryElement(document, 'div')

    expect(isElementHidden(element)).toBe(true)
  })

  it('should not treat opacity:0 as hidden', () => {
    const document = parseHtml('<div style="opacity: 0">x</div>')
    const element = queryElement(document, 'div')

    expect(isElementHidden(element)).toBe(false)
  })

  it('should not treat a 0×0 size as hidden', () => {
    const document = parseHtml('<div style="width: 0; height: 0">x</div>')
    const element = queryElement(document, 'div')

    expect(isElementHidden(element)).toBe(false)
  })

  it('should return false for a visible element', () => {
    const document = parseHtml('<div style="color: red">x</div>')
    const element = queryElement(document, 'div')

    expect(isElementHidden(element)).toBe(false)
  })
})

describeForEachParser('getWrapperRatioDimensions reading only the element itself', (parseHtml) => {
  it('should read the aspect-ratio property from the element itself', () => {
    const document = parseHtml('<iframe style="aspect-ratio: 21 / 9"></iframe>')
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatioDimensions(iframe, 0)).toEqual({ width: 100, height: 43 })
  })

  it('should read a wp-embed-aspect class from the element itself', () => {
    const document = parseHtml('<figure class="wp-embed-aspect-4-3"></figure>')
    const figure = queryElement(document, 'figure')

    expect(getWrapperRatioDimensions(figure, 0)).toEqual({ width: 100, height: 75 })
  })

  it('should read a padding hack from the element itself', () => {
    const document = parseHtml('<div style="padding-bottom:25%"></div>')
    const div = queryElement(document, 'div')

    expect(getWrapperRatioDimensions(div, 0)).toEqual({ width: 100, height: 25 })
  })

  it('should return undefined when the element declares no ratio', () => {
    const document = parseHtml('<iframe></iframe>')
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatioDimensions(iframe, 0)).toBeUndefined()
  })

  it('should return undefined for an out-of-range aspect-ratio value', () => {
    const document = parseHtml('<div style="aspect-ratio: 0 / 0"></div>')
    const div = queryElement(document, 'div')

    expect(getWrapperRatioDimensions(div, 0)).toBeUndefined()
  })
})

describeForEachParser('getWrapperRatioDimensions', (parseHtml) => {
  it('should read the ratio from a wp-embed-aspect class on an ancestor', () => {
    const document = parseHtml(
      '<figure class="wp-block-embed wp-embed-aspect-4-3"><div class="wp-block-embed__wrapper"><iframe></iframe></div></figure>',
    )
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatioDimensions(iframe)).toEqual({ width: 100, height: 75 })
  })

  it('should read the ratio from an inline aspect-ratio property', () => {
    const document = parseHtml('<div style="aspect-ratio: 16 / 9"><iframe></iframe></div>')
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatioDimensions(iframe)).toEqual({ width: 100, height: 56 })
  })

  it('should read a single-number aspect-ratio as width over height', () => {
    const document = parseHtml('<div style="aspect-ratio: 1.5"><iframe></iframe></div>')
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatioDimensions(iframe)).toEqual({ width: 100, height: 67 })
  })

  it('should read the ratio from an inline padding hack on an ancestor', () => {
    const document = parseHtml('<div style="padding-bottom:50%"><iframe></iframe></div>')
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatioDimensions(iframe)).toEqual({ width: 100, height: 50 })
  })

  it('should return undefined when no ancestor carries an aspect signal', () => {
    const document = parseHtml('<p><iframe></iframe></p>')
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatioDimensions(iframe)).toBeUndefined()
  })

  it('should return undefined for out-of-range wrapper values', () => {
    const document = parseHtml(
      '<figure class="wp-embed-aspect-0-0"><div style="padding-bottom:0%"><iframe></iframe></div></figure>',
    )
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatioDimensions(iframe)).toBeUndefined()
  })

  it('should not look beyond the ancestor depth limit', () => {
    const document = parseHtml(
      '<div style="padding-bottom:50%"><div><div><div><iframe></iframe></div></div></div></div>',
    )
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatioDimensions(iframe)).toBeUndefined()
  })

  it('should honor a custom maxDepth argument', () => {
    const document = parseHtml('<div style="padding-bottom:50%"><iframe></iframe></div>')
    const iframe = queryElement(document, 'iframe')

    // maxDepth 0 checks only the element itself; the wrapper is one level up.
    expect(getWrapperRatioDimensions(iframe, 0)).toBeUndefined()
    expect(getWrapperRatioDimensions(iframe, 1)).toEqual({ width: 100, height: 50 })
  })

  it('should not read a wrapper that holds the element plus siblings', () => {
    const document = parseHtml(
      '<div style="aspect-ratio:16/9"><iframe></iframe><p>caption</p></div>',
    )
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatioDimensions(iframe)).toBeUndefined()
  })
})

describe('parseRatioDimensions', () => {
  it('should parse the colon form', () => {
    expect(parseRatioDimensions('16:9')).toEqual({ width: 100, height: 56 })
  })

  it('should parse the slash form', () => {
    expect(parseRatioDimensions('16/9')).toEqual({ width: 100, height: 56 })
  })

  it('should allow spaces around the separator', () => {
    expect(parseRatioDimensions('16 : 9')).toEqual({ width: 100, height: 56 })
    expect(parseRatioDimensions('690 / 362')).toEqual({ width: 100, height: 52 })
  })

  it('should parse a bare decimal as width over height', () => {
    expect(parseRatioDimensions('1.77777777777778')).toEqual({ width: 100, height: 56 })
    expect(parseRatioDimensions('1.5')).toEqual({ width: 100, height: 67 })
  })

  it('should encode a portrait ratio with a height above 100', () => {
    expect(parseRatioDimensions('9:16')).toEqual({ width: 100, height: 178 })
  })

  it('should reject a zero part', () => {
    expect(parseRatioDimensions('0:9')).toBeUndefined()
    expect(parseRatioDimensions('0')).toBeUndefined()
  })

  it('should reject a non-numeric value', () => {
    expect(parseRatioDimensions('wide')).toBeUndefined()
    expect(parseRatioDimensions('1.2.3')).toBeUndefined()
  })

  it('should reject an empty string', () => {
    expect(parseRatioDimensions('')).toBeUndefined()
  })
})

describeForEachParser('hasAncestorWithTagName', (parseHtml) => {
  const tagSet = new Set(['pre', 'code'])

  it('should return true when direct parent matches', () => {
    const document = parseHtml('<pre><span>x</span></pre>')
    const span = queryElement(document, 'span')

    expect(hasAncestorWithTagName(span, tagSet)).toBe(true)
  })

  it('should return true when a deeply nested ancestor matches', () => {
    const document = parseHtml('<pre><div><section><span>x</span></section></div></pre>')
    const span = queryElement(document, 'span')

    expect(hasAncestorWithTagName(span, tagSet)).toBe(true)
  })

  it('should return false when no ancestor matches', () => {
    const document = parseHtml('<div><p><span>x</span></p></div>')
    const span = queryElement(document, 'span')

    expect(hasAncestorWithTagName(span, tagSet)).toBe(false)
  })

  it('should return false when node has no parent', () => {
    const document = parseHtml('')
    const orphan = document.createElement('span')

    expect(hasAncestorWithTagName(orphan, tagSet)).toBe(false)
  })

  it('should return false for an empty Set', () => {
    const document = parseHtml('<pre><span>x</span></pre>')
    const span = queryElement(document, 'span')

    expect(hasAncestorWithTagName(span, new Set())).toBe(false)
  })

  it('should stop walking at the stopAt boundary', () => {
    const document = parseHtml('<pre><div><span>x</span></div></pre>')
    const span = queryElement(document, 'span')
    const div = queryElement(document, 'div')

    expect(hasAncestorWithTagName(span, tagSet, div)).toBe(false)
  })

  it('should not check the stopAt boundary itself', () => {
    const document = parseHtml('<pre><span>x</span></pre>')
    const span = queryElement(document, 'span')
    const pre = queryElement(document, 'pre')

    expect(hasAncestorWithTagName(span, tagSet, pre)).toBe(false)
  })
})

describeForEachParser('removeWithEmptyWrappers', (parseHtml) => {
  it('should remove a bare element with no wrapper', () => {
    const document = parseHtml('<p>Keep</p><img src="https://example.com/a.jpg">')
    removeWithEmptyWrappers(queryElement(document, 'img'))

    expect(document.body.innerHTML).toBe('<p>Keep</p>')
  })

  it('should remove an empty wrapping figure', () => {
    const document = parseHtml('<figure><img src="https://example.com/a.jpg"></figure>')
    removeWithEmptyWrappers(queryElement(document, 'img'))

    expect(document.body.innerHTML).toBe('')
  })

  it('should remove an empty wrapping anchor', () => {
    const document = parseHtml(
      '<a href="https://example.com"><img src="https://example.com/a.jpg"></a>',
    )
    removeWithEmptyWrappers(queryElement(document, 'img'))

    expect(document.body.innerHTML).toBe('')
  })

  it('should remove nested empty wrappers', () => {
    const document = parseHtml(
      '<figure><a href="https://example.com"><img src="https://example.com/a.jpg"></a></figure>',
    )
    removeWithEmptyWrappers(queryElement(document, 'img'))

    expect(document.body.innerHTML).toBe('')
  })

  it('should keep a wrapper that still has other content', () => {
    const document = parseHtml(
      '<figure><img src="https://example.com/a.jpg"><figcaption>Caption</figcaption></figure>',
    )
    removeWithEmptyWrappers(queryElement(document, 'img'))

    expect(document.body.innerHTML).toBe('<figure><figcaption>Caption</figcaption></figure>')
  })

  it('should not unwrap a non-anchor/figure parent', () => {
    const document = parseHtml('<div><img src="https://example.com/a.jpg"></div>')
    removeWithEmptyWrappers(queryElement(document, 'img'))

    expect(document.body.innerHTML).toBe('<div></div>')
  })
})

describeForEachParser('walkElements', (parseHtml) => {
  it('should visit elements in document order', () => {
    const document = parseHtml('<div><p>one</p><span>two</span></div><section>three</section>')
    const visited: Array<string> = []

    walkElements(document, (element) => {
      visited.push(element.localName)
    })

    expect(visited).toEqual(['html', 'head', 'body', 'div', 'p', 'span', 'section'])
  })

  it('should stop the walk when the visitor returns true', () => {
    const document = parseHtml('<p>one</p><span>two</span><p>three</p>')
    const visited: Array<string> = []

    const stopped = walkElements(document, (element) => {
      visited.push(element.localName)
      return element.localName === 'span'
    })

    expect(stopped).toBe(true)
    expect(visited).toEqual(['html', 'head', 'body', 'p', 'span'])
  })

  it('should return false when the walk completes without stopping', () => {
    const document = parseHtml('<p>one</p>')

    expect(walkElements(document, () => undefined)).toBe(false)
  })

  it('should skip template subtrees, matching querySelectorAll traversal', () => {
    const document = parseHtml('<template><p class="inside">x</p></template><p>outside</p>')
    const visited: Array<string> = []

    walkElements(document, (element) => {
      visited.push(element.localName)
    })

    // Only the <p> outside the template is seen.
    expect(visited.filter((name) => name === 'p')).toHaveLength(1)
    expect(document.querySelectorAll('.inside')).toHaveLength(0)
  })
})

describeForEachParser('find', (parseHtml) => {
  it('should return the first matching descendant', () => {
    const document = parseHtml('<div><p class="a">first</p><p class="a">second</p></div>')
    const element = queryElement(document, 'div')

    expect(find(element, '.a')?.textContent).toBe('first')
  })

  it('should return the first descendant satisfying the predicate', () => {
    const document = parseHtml('<div><p class="a">skip</p><p class="a" data-keep>keep</p></div>')
    const element = queryElement(document, 'div')
    const predicate = (node: Element) => node.hasAttribute('data-keep')

    expect(find(element, '.a', predicate)?.textContent).toBe('keep')
  })

  it('should return undefined when nothing matches the predicate', () => {
    const document = parseHtml('<div><p class="a">only</p></div>')
    const element = queryElement(document, 'div')

    expect(find(element, '.a', () => false)).toBeUndefined()
  })

  it('should return undefined for a nullish element', () => {
    expect(find(undefined, '.a')).toBeUndefined()
  })
})

describeForEachParser('text', (parseHtml) => {
  it('should return the trimmed text of a descendant', () => {
    const document = parseHtml('<div><p class="a"> spaced </p></div>')
    const element = queryElement(document, 'div')

    expect(text(element, '.a')).toBe('spaced')
  })

  it('should return the trimmed text of the element itself without a selector', () => {
    const document = parseHtml('<p> spaced </p>')
    const element = queryElement(document, 'p')

    expect(text(element)).toBe('spaced')
  })

  it('should return undefined for blank text', () => {
    const document = parseHtml('<div><p class="a">   </p></div>')
    const element = queryElement(document, 'div')

    expect(text(element, '.a')).toBeUndefined()
  })

  it('should return undefined for a nullish element', () => {
    expect(text(undefined)).toBeUndefined()
  })
})

describeForEachParser('textNode', (parseHtml) => {
  it('should read only the direct text-node children', () => {
    const document = parseHtml('<div><img src="i.png"> example.com <span>ignored</span></div>')
    const element = queryElement(document, 'div')

    expect(textNode(element)).toBe('example.com')
  })

  it('should return undefined when there is no direct text', () => {
    const document = parseHtml('<div><span>nested only</span></div>')
    const element = queryElement(document, 'div')

    expect(textNode(element)).toBeUndefined()
  })

  it('should return undefined for a nullish element', () => {
    expect(textNode(null)).toBeUndefined()
  })
})

describeForEachParser('attr', (parseHtml) => {
  it('should return the trimmed attribute value', () => {
    const document = parseHtml('<a href=" https://example.com "></a>')
    const element = queryElement(document, 'a')

    expect(attr(element, 'href')).toBe('https://example.com')
  })

  it('should return undefined for a blank attribute', () => {
    const document = parseHtml('<a href="  "></a>')
    const element = queryElement(document, 'a')

    expect(attr(element, 'href')).toBeUndefined()
  })

  it('should return undefined for a missing attribute', () => {
    const document = parseHtml('<a></a>')
    const element = queryElement(document, 'a')

    expect(attr(element, 'href')).toBeUndefined()
  })

  it('should return undefined for a nullish element', () => {
    expect(attr(undefined, 'href')).toBeUndefined()
  })
})

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

  it('should return undefined when there is no style attribute', () => {
    const document = parseHtml('<a></a>')

    expect(bgImage(queryElement(document, 'a'))).toBeUndefined()
  })

  it('should return undefined for a nullish element', () => {
    expect(bgImage(undefined)).toBeUndefined()
  })
})
