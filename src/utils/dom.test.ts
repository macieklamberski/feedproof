import { describe, expect, it } from 'bun:test'
import { describeForEachParser, html, queryElement } from '../tests.js'
import {
  attr,
  bgImage,
  find,
  findConfigScript,
  flashVars,
  formatRatio,
  getElementDimensions,
  getWrapperRatio,
  hasAncestorWithTagName,
  isElementHidden,
  isEmptyElement,
  keepIfMatches,
  parsePixelSize,
  parseRatio,
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

describeForEachParser('getWrapperRatio reading only the element itself', (parseHtml) => {
  it('should read the aspect-ratio property from the element itself', () => {
    const document = parseHtml('<iframe style="aspect-ratio: 21 / 9"></iframe>')
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatio(iframe, 0)).toBe('21/9')
  })

  it('should read a wp-embed-aspect class from the element itself', () => {
    const document = parseHtml('<figure class="wp-embed-aspect-4-3"></figure>')
    const figure = queryElement(document, 'figure')

    expect(getWrapperRatio(figure, 0)).toBe('4/3')
  })

  it('should read a padding hack from the element itself', () => {
    const document = parseHtml('<div style="padding-bottom:25%"></div>')
    const div = queryElement(document, 'div')

    expect(getWrapperRatio(div, 0)).toBe('100/25')
  })

  it('should read a max-width and max-height pair as a ratio', () => {
    const document = parseHtml('<iframe style="max-width:800px;max-height:600px"></iframe>')
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatio(iframe, 0)).toBe('800/600')
  })

  it('should ignore a lone max-width, which says nothing about shape', () => {
    const document = parseHtml('<iframe style="max-width:800px;min-width:325px"></iframe>')
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatio(iframe, 0)).toBeUndefined()
  })

  it('should ignore a lone max-height', () => {
    const document = parseHtml('<iframe style="max-height:600px"></iframe>')
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatio(iframe, 0)).toBeUndefined()
  })

  // The caps are the weakest source, so a stated ratio on the same element outranks them.
  it('should prefer a stated aspect-ratio over the caps', () => {
    const document = parseHtml(
      '<iframe style="aspect-ratio: 21 / 9;max-width:800px;max-height:600px"></iframe>',
    )
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatio(iframe, 0)).toBe('21/9')
  })

  it('should prefer a padding hack over the caps', () => {
    const document = parseHtml(
      '<div style="padding-bottom:25%;max-width:800px;max-height:600px"></div>',
    )
    const div = queryElement(document, 'div')

    expect(getWrapperRatio(div, 0)).toBe('100/25')
  })

  it('should ignore caps stated in a unit that is not pixels', () => {
    const document = parseHtml('<iframe style="max-width:80em;max-height:60em"></iframe>')
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatio(iframe, 0)).toBeUndefined()
  })

  it('should return undefined when the element declares no ratio', () => {
    const document = parseHtml('<iframe></iframe>')
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatio(iframe, 0)).toBeUndefined()
  })

  it('should return undefined for an out-of-range aspect-ratio value', () => {
    const document = parseHtml('<div style="aspect-ratio: 0 / 0"></div>')
    const div = queryElement(document, 'div')

    expect(getWrapperRatio(div, 0)).toBeUndefined()
  })
})

describeForEachParser('getWrapperRatio', (parseHtml) => {
  it('should read the ratio from a wp-embed-aspect class on an ancestor', () => {
    const document = parseHtml(
      '<figure class="wp-block-embed wp-embed-aspect-4-3"><div class="wp-block-embed__wrapper"><iframe></iframe></div></figure>',
    )
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatio(iframe)).toBe('4/3')
  })

  it('should read the ratio from an inline aspect-ratio property', () => {
    const document = parseHtml('<div style="aspect-ratio: 16 / 9"><iframe></iframe></div>')
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatio(iframe)).toBe('16/9')
  })

  it('should read a single-number aspect-ratio as width over height', () => {
    const document = parseHtml('<div style="aspect-ratio: 1.5"><iframe></iframe></div>')
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatio(iframe)).toBe('1.5/1')
  })

  it('should read the ratio from an inline padding hack on an ancestor', () => {
    const document = parseHtml('<div style="padding-bottom:50%"><iframe></iframe></div>')
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatio(iframe)).toBe('100/50')
  })

  it('should return undefined when no ancestor carries an aspect signal', () => {
    const document = parseHtml('<p><iframe></iframe></p>')
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatio(iframe)).toBeUndefined()
  })

  it('should return undefined for out-of-range wrapper values', () => {
    const document = parseHtml(
      '<figure class="wp-embed-aspect-0-0"><div style="padding-bottom:0%"><iframe></iframe></div></figure>',
    )
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatio(iframe)).toBeUndefined()
  })

  it('should not look beyond the ancestor depth limit', () => {
    const document = parseHtml(
      '<div style="padding-bottom:50%"><div><div><div><iframe></iframe></div></div></div></div>',
    )
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatio(iframe)).toBeUndefined()
  })

  it('should honor a custom maxDepth argument', () => {
    const document = parseHtml('<div style="padding-bottom:50%"><iframe></iframe></div>')
    const iframe = queryElement(document, 'iframe')

    // maxDepth 0 checks only the element itself; the wrapper is one level up.
    expect(getWrapperRatio(iframe, 0)).toBeUndefined()
    expect(getWrapperRatio(iframe, 1)).toBe('100/50')
  })

  it('should not read a wrapper that holds the element plus siblings', () => {
    const document = parseHtml(
      '<div style="aspect-ratio:16/9"><iframe></iframe><p>caption</p></div>',
    )
    const iframe = queryElement(document, 'iframe')

    expect(getWrapperRatio(iframe)).toBeUndefined()
  })
})

// The lookup several platforms need to reach the inline `<script>` that configures a player:
// Podlove and JW Player both use it, so the branches are pinned here rather than through
// whichever caller happens to exercise them.
describeForEachParser('findConfigScript', (parseHtml) => {
  const find = (markup: string) => {
    const document = parseHtml(markup)

    return findConfigScript(queryElement(document, '.player'))
  }

  it('should take the script sitting directly beside the player', () => {
    const value = html`
      <div>
        <div class="player" id="player"></div>
        <script>config()</script>
      </div>
    `

    expect(find(value)?.textContent).toBe('config()')
  })

  // `wrapBareInlineInParagraphs` runs before the widget pass, so by then a bare script is
  // inside a paragraph and the player's sibling is that paragraph rather than the script.
  it('should look inside a sibling that wraps the script', () => {
    const value = html`
      <div>
        <div class="player" id="player"></div>
        <p><script>config()</script></p>
      </div>
    `

    expect(find(value)?.textContent).toBe('config()')
  })

  // Where one item holds several players, each script names its own container, so the id is
  // what pairs them once they are no longer adjacent.
  it('should match a distant script by the player id it names', () => {
    const value = html`
      <div>
        <div class="player" id="player"></div>
        <p>Prose between the player and its script.</p>
        <script>setup("player")</script>
      </div>
    `

    expect(find(value)?.textContent).toBe('setup("player")')
  })

  it('should state nothing when a distant script names another player', () => {
    const value = html`
      <div>
        <div class="player" id="player"></div>
        <p>Prose.</p>
        <script>setup("other")</script>
      </div>
    `

    expect(find(value)).toBeUndefined()
  })

  // With no id there is nothing to pair a distant script against, so the walk stops.
  it('should state nothing when the player carries no id', () => {
    const value = html`
      <div>
        <div class="player"></div>
        <p>Prose.</p>
        <script>setup("player")</script>
      </div>
    `

    expect(find(value)).toBeUndefined()
  })

  it('should state nothing when there is no script at all', () => {
    const value = '<div><div class="player" id="player"></div></div>'

    expect(find(value)).toBeUndefined()
  })
})

// Nothing is reduced or approximated: the numbers a source stated are the numbers written, so a
// reader can trace the value back. CSS renders every spelling of a shape identically.
describe('formatRatio', () => {
  it('should write a pair as stated, without reducing it', () => {
    expect(formatRatio(800, 600)).toBe('800/600')
    expect(formatRatio(16, 9)).toBe('16/9')
  })

  it('should keep the padding hack percentage as a decimal denominator', () => {
    expect(formatRatio(100, 56.25)).toBe('100/56.25')
  })

  it('should write a bare decimal over one', () => {
    expect(formatRatio(1.33333333333333)).toBe('1.33333333333333/1')
    expect(formatRatio(4)).toBe('4/1')
  })

  it('should state a portrait ratio with the larger number second', () => {
    expect(formatRatio(9, 16)).toBe('9/16')
  })
})

describe('parseRatio', () => {
  it('should parse the colon form', () => {
    expect(parseRatio('16:9')).toBe('16/9')
  })

  it('should parse the slash form', () => {
    expect(parseRatio('16/9')).toBe('16/9')
  })

  it('should allow spaces around the separator', () => {
    expect(parseRatio('16 : 9')).toBe('16/9')
    expect(parseRatio('690 / 362')).toBe('690/362')
  })

  // A short decimal still reduces, since scaling it up stays inside the bound: 1.5 becomes
  // 15/10 and then 3/2. A long one does not, and is written over one as stated.
  it('should parse a bare decimal as width over height', () => {
    expect(parseRatio('1.5')).toBe('1.5/1')
    expect(parseRatio('1.77777777777778')).toBe('1.77777777777778/1')
  })

  it('should keep a portrait ratio in the order it was stated', () => {
    expect(parseRatio('9:16')).toBe('9/16')
  })

  it('should reject a zero part', () => {
    expect(parseRatio('0:9')).toBeUndefined()
    expect(parseRatio('0')).toBeUndefined()
  })

  it('should reject a non-numeric value', () => {
    expect(parseRatio('wide')).toBeUndefined()
    expect(parseRatio('1.2.3')).toBeUndefined()
  })

  it('should reject an empty string', () => {
    expect(parseRatio('')).toBeUndefined()
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

describeForEachParser('isEmptyElement', (parseHtml) => {
  it('should treat an element with no children and no text as empty', () => {
    const document = parseHtml('<div></div>')
    const element = queryElement(document, 'div')

    expect(isEmptyElement(element)).toBe(true)
  })

  it('should treat an element carrying only attributes as empty', () => {
    const document = parseHtml('<div id="embed-1" data-src="https://example.com/post"></div>')
    const element = queryElement(document, 'div')

    expect(isEmptyElement(element)).toBe(true)
  })

  it('should treat whitespace-only text as empty', () => {
    const document = parseHtml('<div>\n  \n</div>')
    const element = queryElement(document, 'div')

    expect(isEmptyElement(element)).toBe(true)
  })

  it('should treat an element holding text as not empty', () => {
    const document = parseHtml('<div>Example</div>')
    const element = queryElement(document, 'div')

    expect(isEmptyElement(element)).toBe(false)
  })

  it('should treat an element holding a child element as not empty', () => {
    const document = parseHtml('<div><img src="https://example.com/a.jpg"></div>')
    const element = queryElement(document, 'div')

    expect(isEmptyElement(element)).toBe(false)
  })

  it('should treat an element whose only child is itself empty as not empty', () => {
    const document = parseHtml('<div><span></span></div>')
    const element = queryElement(document, 'div')

    expect(isEmptyElement(element)).toBe(false)
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

describeForEachParser('flashVars', (parseHtml) => {
  // `<embed>` spells the config as its own attribute and `<object>` as a sibling `<param>`,
  // and the same snippet often carries both so a reader of one dialect sees half the markup.
  it('should read the value off the carrier itself', () => {
    const document = parseHtml('<embed src="player.swf" flashvars="config=1&id=2">')
    const element = queryElement(document, 'embed')

    expect(flashVars(element)).toBe('config=1&id=2')
  })

  it('should read the value from a sibling param', () => {
    const document = parseHtml(html`
      <object>
        <param name="flashvars" value="config=1&id=2" />
        <embed src="player.swf" />
      </object>
    `)
    const element = queryElement(document, 'embed')

    expect(flashVars(element)).toBe('config=1&id=2')
  })

  // Brightcove writes `flashVars` and Archive writes `flashvars`, on the same attribute.
  it('should match the param name whatever its casing', () => {
    const document = parseHtml(html`
      <object>
        <param name="flashVars" value="config=1" />
        <embed src="player.swf" />
      </object>
    `)
    const element = queryElement(document, 'embed')

    expect(flashVars(element)).toBe('config=1')
  })

  it('should prefer the carrier own attribute over a sibling param', () => {
    const document = parseHtml(html`
      <object>
        <param name="flashvars" value="config=sibling" />
        <embed src="player.swf" flashvars="config=own" />
      </object>
    `)
    const element = queryElement(document, 'embed')

    expect(flashVars(element)).toBe('config=own')
  })

  it('should ignore a param that names something else', () => {
    const document = parseHtml(html`
      <object>
        <param name="movie" value="player.swf" />
        <embed src="player.swf" />
      </object>
    `)
    const element = queryElement(document, 'embed')

    expect(flashVars(element)).toBeUndefined()
  })

  it('should return undefined when nothing carries the config', () => {
    const document = parseHtml('<embed src="player.swf">')
    const element = queryElement(document, 'embed')

    expect(flashVars(element)).toBeUndefined()
  })

  it('should return undefined for a nullish element', () => {
    expect(flashVars(undefined)).toBeUndefined()
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

describe('parsePixelSize', () => {
  it('should read a bare pixel count', () => {
    expect(parsePixelSize('200')).toBe(200)
  })

  // Publishers write the unit as often as not, and coerceNumber alone rejects it.
  it('should read a count carrying the px unit', () => {
    expect(parsePixelSize('350px')).toBe(350)
  })

  it('should ignore surrounding whitespace', () => {
    expect(parsePixelSize('  90  ')).toBe(90)
  })

  it('should return undefined for another unit', () => {
    expect(parsePixelSize('100%')).toBeUndefined()
    expect(parsePixelSize('10em')).toBeUndefined()
  })

  // A stated player height of zero or five digits is a mistake, not a size. One pixel is a
  // typo too, unlike an image attribute where it is a tracking pixel.
  it('should return undefined outside the plausible range', () => {
    expect(parsePixelSize('0')).toBeUndefined()
    expect(parsePixelSize('1')).toBeUndefined()
    expect(parsePixelSize('9')).toBeUndefined()
    expect(parsePixelSize('99999')).toBeUndefined()
  })

  // A digit count reads `007` as three digits and lets 7 through, which is what the resolvers
  // were doing before the bound became a range.
  it('should apply the range to the value, not to how it was written', () => {
    expect(parsePixelSize('007')).toBeUndefined()
    expect(parsePixelSize('0000')).toBeUndefined()
    expect(parsePixelSize('09')).toBeUndefined()
    expect(parsePixelSize('0200')).toBe(200)
  })

  it('should return undefined for a fractional size', () => {
    expect(parsePixelSize('350.5')).toBeUndefined()
  })

  it('should return undefined for nothing at all', () => {
    expect(parsePixelSize(undefined)).toBeUndefined()
    expect(parsePixelSize('')).toBeUndefined()
    expect(parsePixelSize('abc')).toBeUndefined()
  })
})

const safeIdRegex = /^\d+$/

describe('keepIfMatches', () => {
  it('should keep a value that fits the shape', () => {
    expect(keepIfMatches('12345', safeIdRegex)).toBe('12345')
  })

  it('should drop a value that does not fit', () => {
    expect(keepIfMatches('12a45', safeIdRegex)).toBeUndefined()
  })

  it('should drop an empty or nullish value', () => {
    expect(keepIfMatches('', safeIdRegex)).toBeUndefined()
    expect(keepIfMatches(null, safeIdRegex)).toBeUndefined()
    expect(keepIfMatches(undefined, safeIdRegex)).toBeUndefined()
  })
})
