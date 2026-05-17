import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../../common.js'
import {
  defaultEmbedResolvers,
  defaultLazySrcAttributes,
  defaultLazySrcsetAttributes,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from '../../defaults.js'
import type { TransformContext } from '../../types.js'
import { removeSubstackSubscribeWidget } from './removeSubstackSubscribeWidget.js'

const baseContext: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  lazySrcAttributes: defaultLazySrcAttributes,
  lazySrcsetAttributes: defaultLazySrcsetAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}

describe('removeSubstackSubscribeWidget', () => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return transformHtml(html, removeSubstackSubscribeWidget(context))
  }

  describe('happy paths', () => {
    it('should remove a single SubscribeWidget element with its children', async () => {
      const value =
        '<p>Hello</p><div data-component-name="SubscribeWidget"><input type="email"><button>Subscribe</button></div><p>World</p>'
      const expected = '<p>Hello</p><p>World</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove multiple SubscribeWidget elements', async () => {
      const value =
        '<div data-component-name="SubscribeWidget">First</div><p>Content</p><div data-component-name="SubscribeWidget">Second</div>'
      const expected = '<p>Content</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should remove SubscribeWidget regardless of element tag', async () => {
      const value = '<section data-component-name="SubscribeWidget">Inner</section><p>After</p>'
      const expected = '<p>After</p>'

      expect(await transform(value)).toBe(expected)
    })

    it('should preserve surrounding content when widget is nested', async () => {
      const value =
        '<article><h2>Title</h2><div data-component-name="SubscribeWidget">Subscribe</div><p>Body</p></article>'
      const expected = '<article><h2>Title</h2><p>Body</p></article>'

      expect(await transform(value)).toBe(expected)
    })
  })

  describe('edge cases', () => {
    it('should leave content unchanged when no SubscribeWidget is present', async () => {
      const value = '<p>No widgets here</p>'

      expect(await transform(value)).toBe(value)
    })

    it('should not match elements with a different data-component-name', async () => {
      const value = '<div data-component-name="ShareWidget">Share</div>'

      expect(await transform(value)).toBe(value)
    })

    it('should handle empty content', async () => {
      const value = ''

      expect(await transform(value)).toBe(value)
    })

    it('should be idempotent', async () => {
      const value =
        '<p>Hello</p><div data-component-name="SubscribeWidget">Subscribe</div><p>World</p>'
      const once = await transform(value)
      const twice = await transform(once)

      expect(twice).toBe(once)
    })
  })
})
