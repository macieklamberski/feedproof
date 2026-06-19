import { describe, expect, it } from 'bun:test'
import { html, queryElement } from '../tests.js'
import { parseHtml } from './linkedom.js'

describe('parseHtml', () => {
  describe('attribute case normalization', () => {
    it('should lowercase uppercase attribute names', () => {
      const document = parseHtml('<img SRC="https://example.com/photo.jpg">')
      const image = queryElement(document, 'img')

      expect(image.getAttribute('src')).toBe('https://example.com/photo.jpg')
      expect(image.hasAttribute('SRC')).toBe(false)
    })

    it('should lowercase mixed-case attribute names', () => {
      const document = parseHtml('<img SrcSet="a.jpg 1x, b.jpg 2x" Data-Src="c.jpg">')
      const image = queryElement(document, 'img')

      expect(image.getAttribute('srcset')).toBe('a.jpg 1x, b.jpg 2x')
      expect(image.getAttribute('data-src')).toBe('c.jpg')
      expect(image.hasAttribute('SrcSet')).toBe(false)
      expect(image.hasAttribute('Data-Src')).toBe(false)
    })

    it('should lowercase POSTER and SRC on video elements', () => {
      const document = parseHtml(
        '<video SRC="https://example.com/clip.mp4" POSTER="https://example.com/thumb.jpg"></video>',
      )
      const video = queryElement(document, 'video')

      expect(video.getAttribute('src')).toBe('https://example.com/clip.mp4')
      expect(video.getAttribute('poster')).toBe('https://example.com/thumb.jpg')
    })

    it('should keep the first occurrence when duplicates collide after lowercasing', () => {
      const document = parseHtml('<img SRC="first.jpg" src="second.jpg">')
      const image = queryElement(document, 'img')

      expect(image.getAttribute('src')).toBe('first.jpg')
    })

    it('should leave already-lowercase attributes untouched', () => {
      const document = parseHtml('<a href="/about" class="nav">About</a>')
      const anchor = queryElement(document, 'a')

      expect(anchor.getAttribute('href')).toBe('/about')
      expect(anchor.getAttribute('class')).toBe('nav')
    })
  })

  describe('svg self-close expansion', () => {
    // Without expansion, linkedom parses `<path />` as a child of `<title>`
    // because the self-close on a non-void HTML element is ignored. With
    // expansion, path is a sibling of title.
    it('should make svg path a sibling of title, not a child', () => {
      const document = parseHtml('<svg><title /><path d="M0 0" /></svg>')
      const path = queryElement(document, 'path')

      expect(path.parentElement?.tagName.toLowerCase()).toBe('svg')
    })

    it('should expand multiple self-closing tags within a single svg', () => {
      const document = parseHtml('<svg><title /><desc /><path d="M0 0" /></svg>')
      const title = queryElement(document, 'title')
      const desc = queryElement(document, 'desc')
      const path = queryElement(document, 'path')

      expect(title.parentElement?.tagName.toLowerCase()).toBe('svg')
      expect(desc.parentElement?.tagName.toLowerCase()).toBe('svg')
      expect(path.parentElement?.tagName.toLowerCase()).toBe('svg')
    })

    it('should handle nested svg regions independently', () => {
      const document = parseHtml(
        html`
          <svg><circle r="5" /></svg>
          <div><svg><rect width="1" /></svg></div>
        `,
      )

      expect(document.querySelectorAll('circle').length).toBe(1)
      expect(document.querySelectorAll('rect').length).toBe(1)
    })

    it('should preserve self-closing tags outside svg regions', () => {
      const document = parseHtml('<p><br /><img src="a.png" /></p>')
      const paragraph = queryElement(document, 'p')
      const image = queryElement(document, 'img')

      expect(paragraph.querySelector('br')).not.toBeNull()
      expect(image.getAttribute('src')).toBe('a.png')
    })

    it('should expand a self-closing tag with whitespace before the slash', () => {
      const document = parseHtml('<svg><path d="M0 0"   /></svg>')
      const parentTagName = queryElement(document, 'path').parentElement?.tagName.toLowerCase()

      expect(parentTagName).toBe('svg')
    })

    // The svg region regex stops at the first `</svg>`, even inside an attribute
    // value, so expansion is skipped for the rest of the element. Linkedom still
    // nests the unexpanded `<path />` under its anchor parent, so the structure
    // happens to survive. Pinned actual behavior.
    it('should keep the structure when an attribute value contains </svg>', () => {
      const document = parseHtml('<svg><a data-note="</svg>"><path d="M0 0" /></a></svg>')
      const parentTagName = queryElement(document, 'path').parentElement?.tagName.toLowerCase()

      expect(parentTagName).toBe('a')
    })
  })

  describe('attribute serialization', () => {
    it('should escape ampersands in attribute values', () => {
      const document = parseHtml('<a href="?id=1&copy=2">link</a>')

      expect(document.body.innerHTML).toBe('<a href="?id=1&amp;copy=2">link</a>')
    })

    it('should escape ampersands introduced by transforms', () => {
      const document = parseHtml('<a>link</a>')
      queryElement(document, 'a').setAttribute('href', '?a=1&b=2')

      expect(document.body.innerHTML).toBe('<a href="?a=1&amp;b=2">link</a>')
    })

    it('should keep text-node entities escaped exactly once', () => {
      const document = parseHtml('<p>a &amp; b</p>')

      expect(document.body.innerHTML).toBe('<p>a &amp; b</p>')
    })

    it('should serialize the same value on repeated reads', () => {
      const document = parseHtml('<a href="?a=1&b=2">link</a>')
      const first = document.body.innerHTML
      const second = document.body.innerHTML

      expect(second).toBe(first)
    })
  })

  describe('empty input', () => {
    it('should return a document with an empty body', () => {
      const document = parseHtml('')

      expect(document.body.innerHTML).toBe('')
    })
  })
})
