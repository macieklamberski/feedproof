import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../common.js'
import type { TransformContext } from '../types.js'
import { removeSubstackSubscribeWidget } from './removeSubstackSubscribeWidget.js'

const context: TransformContext = {}

describe('removeSubstackSubscribeWidget', () => {
  it('should remove a single SubscribeWidget element with its children', () => {
    const html =
      '<p>Hello</p><div data-component-name="SubscribeWidget"><input type="email"><button>Subscribe</button></div><p>World</p>'
    const result = transformHtml(html, removeSubstackSubscribeWidget(context))

    expect(result).toBe('<p>Hello</p><p>World</p>')
  })

  it('should remove multiple SubscribeWidget elements', () => {
    const html =
      '<div data-component-name="SubscribeWidget">First</div><p>Content</p><div data-component-name="SubscribeWidget">Second</div>'
    const result = transformHtml(html, removeSubstackSubscribeWidget(context))

    expect(result).toBe('<p>Content</p>')
  })

  it('should remove SubscribeWidget regardless of element tag', () => {
    const html = '<section data-component-name="SubscribeWidget">Inner</section><p>After</p>'
    const result = transformHtml(html, removeSubstackSubscribeWidget(context))

    expect(result).toBe('<p>After</p>')
  })

  it('should not modify content when no SubscribeWidget is present', () => {
    const html = '<p>No widgets here</p>'
    const result = transformHtml(html, removeSubstackSubscribeWidget(context))

    expect(result).toBe('<p>No widgets here</p>')
  })

  it('should not match elements with a different data-component-name', () => {
    const html = '<div data-component-name="ShareWidget">Share</div>'
    const result = transformHtml(html, removeSubstackSubscribeWidget(context))

    expect(result).toBe('<div data-component-name="ShareWidget">Share</div>')
  })

  it('should preserve surrounding content when widget is nested', () => {
    const html =
      '<article><h2>Title</h2><div data-component-name="SubscribeWidget">Subscribe</div><p>Body</p></article>'
    const result = transformHtml(html, removeSubstackSubscribeWidget(context))

    expect(result).toBe('<article><h2>Title</h2><p>Body</p></article>')
  })

  it('should handle empty content', () => {
    const html = ''
    const result = transformHtml(html, removeSubstackSubscribeWidget(context))

    expect(result).toBe('')
  })
})
