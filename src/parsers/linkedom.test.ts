import { describe, expect, it } from 'bun:test'
import { parseHtml } from './linkedom.js'

describe('parseHtml', () => {
  describe('attribute case normalization', () => {
    it('should lowercase uppercase attribute names', () => {
      const document = parseHtml('<img SRC="https://example.com/photo.jpg">')
      const image = document.querySelector('img')

      expect(image?.getAttribute('src')).toBe('https://example.com/photo.jpg')
      expect(image?.hasAttribute('SRC')).toBe(false)
    })

    it('should lowercase mixed-case attribute names', () => {
      const document = parseHtml('<img SrcSet="a.jpg 1x, b.jpg 2x" Data-Src="c.jpg">')
      const image = document.querySelector('img')

      expect(image?.getAttribute('srcset')).toBe('a.jpg 1x, b.jpg 2x')
      expect(image?.getAttribute('data-src')).toBe('c.jpg')
      expect(image?.hasAttribute('SrcSet')).toBe(false)
      expect(image?.hasAttribute('Data-Src')).toBe(false)
    })

    it('should lowercase POSTER and SRC on video elements', () => {
      const document = parseHtml(
        '<video SRC="https://example.com/clip.mp4" POSTER="https://example.com/thumb.jpg"></video>',
      )
      const video = document.querySelector('video')

      expect(video?.getAttribute('src')).toBe('https://example.com/clip.mp4')
      expect(video?.getAttribute('poster')).toBe('https://example.com/thumb.jpg')
    })

    it('should keep the first occurrence when duplicates collide after lowercasing', () => {
      const document = parseHtml('<img SRC="first.jpg" src="second.jpg">')
      const image = document.querySelector('img')

      expect(image?.getAttribute('src')).toBe('first.jpg')
    })

    it('should leave already-lowercase attributes untouched', () => {
      const document = parseHtml('<a href="/about" class="nav">About</a>')
      const anchor = document.querySelector('a')

      expect(anchor?.getAttribute('href')).toBe('/about')
      expect(anchor?.getAttribute('class')).toBe('nav')
    })
  })

  describe('svg self-close expansion', () => {
    // Without expansion, linkedom parses `<path />` as a child of `<title>`
    // because the self-close on a non-void HTML element is ignored. With
    // expansion, path is a sibling of title.
    it('should make svg path a sibling of title, not a child', () => {
      const document = parseHtml('<svg><title /><path d="M0 0" /></svg>')
      const svg = document.querySelector('svg')
      const path = svg?.querySelector('path')

      expect(path?.parentElement?.tagName.toLowerCase()).toBe('svg')
    })

    it('should expand multiple self-closing tags within a single svg', () => {
      const document = parseHtml('<svg><title /><desc /><path d="M0 0" /></svg>')
      const svg = document.querySelector('svg')

      expect(svg?.querySelector('title')?.parentElement?.tagName.toLowerCase()).toBe('svg')
      expect(svg?.querySelector('desc')?.parentElement?.tagName.toLowerCase()).toBe('svg')
      expect(svg?.querySelector('path')?.parentElement?.tagName.toLowerCase()).toBe('svg')
    })

    it('should handle nested svg regions independently', () => {
      const document = parseHtml(
        '<svg><circle r="5" /></svg><div><svg><rect width="1" /></svg></div>',
      )

      expect(document.querySelectorAll('circle').length).toBe(1)
      expect(document.querySelectorAll('rect').length).toBe(1)
    })

    it('should preserve self-closing tags outside svg regions', () => {
      const document = parseHtml('<p><br /><img src="a.png" /></p>')
      const paragraph = document.querySelector('p')

      expect(paragraph?.querySelector('br')).not.toBeNull()
      expect(paragraph?.querySelector('img')?.getAttribute('src')).toBe('a.png')
    })
  })

  describe('empty input', () => {
    it('should return a document with an empty body', () => {
      const document = parseHtml('')

      expect(document.body.innerHTML).toBe('')
    })
  })
})
