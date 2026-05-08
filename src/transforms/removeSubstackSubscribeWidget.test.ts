import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../common.js'
import type { TransformContext } from '../types.js'
import { removeSubstackSubscribeWidget } from './removeSubstackSubscribeWidget.js'

const context: TransformContext = {}

describe('removeSubstackSubscribeWidget', () => {
  describe('happy paths', () => {
    it('should remove a single SubscribeWidget element with its children', () => {
      const value =
        '<p>Hello</p><div data-component-name="SubscribeWidget"><input type="email"><button>Subscribe</button></div><p>World</p>'
      const expected = '<p>Hello</p><p>World</p>'

      expect(transformHtml(value, removeSubstackSubscribeWidget(context))).toBe(expected)
    })

    it('should remove multiple SubscribeWidget elements', () => {
      const value =
        '<div data-component-name="SubscribeWidget">First</div><p>Content</p><div data-component-name="SubscribeWidget">Second</div>'
      const expected = '<p>Content</p>'

      expect(transformHtml(value, removeSubstackSubscribeWidget(context))).toBe(expected)
    })

    it('should remove SubscribeWidget regardless of element tag', () => {
      const value = '<section data-component-name="SubscribeWidget">Inner</section><p>After</p>'
      const expected = '<p>After</p>'

      expect(transformHtml(value, removeSubstackSubscribeWidget(context))).toBe(expected)
    })

    it('should preserve surrounding content when widget is nested', () => {
      const value =
        '<article><h2>Title</h2><div data-component-name="SubscribeWidget">Subscribe</div><p>Body</p></article>'
      const expected = '<article><h2>Title</h2><p>Body</p></article>'

      expect(transformHtml(value, removeSubstackSubscribeWidget(context))).toBe(expected)
    })
  })

  describe('edge cases', () => {
    it('should leave content unchanged when no SubscribeWidget is present', () => {
      const value = '<p>No widgets here</p>'

      expect(transformHtml(value, removeSubstackSubscribeWidget(context))).toBe(value)
    })

    it('should not match elements with a different data-component-name', () => {
      const value = '<div data-component-name="ShareWidget">Share</div>'

      expect(transformHtml(value, removeSubstackSubscribeWidget(context))).toBe(value)
    })

    it('should handle empty content', () => {
      const value = ''

      expect(transformHtml(value, removeSubstackSubscribeWidget(context))).toBe(value)
    })

    it('should be idempotent', () => {
      const value =
        '<p>Hello</p><div data-component-name="SubscribeWidget">Subscribe</div><p>World</p>'
      const once = transformHtml(value, removeSubstackSubscribeWidget(context))
      const twice = transformHtml(once, removeSubstackSubscribeWidget(context))

      expect(twice).toBe(once)
    })
  })
})
