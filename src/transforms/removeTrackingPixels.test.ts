import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../common.js'
import type { TransformContext } from '../types.js'
import { removeTrackingPixels } from './removeTrackingPixels.js'

const context: TransformContext = {}

describe('removeTrackingPixels', () => {
  it('should remove 1x1 pixel images', () => {
    const html = '<p>Text</p><img src="tracker.gif" width="1" height="1">'
    const result = transformHtml(html, removeTrackingPixels(context))

    expect(result).toContain('<p>Text</p>')
    expect(result).not.toContain('tracker.gif')
  })

  it('should remove 2x2 pixel images', () => {
    const html = '<img src="pixel.png" width="2" height="2">'
    const result = transformHtml(html, removeTrackingPixels(context))

    expect(result).not.toContain('pixel.png')
  })

  it('should not remove normal-sized images', () => {
    const html = '<img src="photo.jpg" width="800" height="600">'
    const result = transformHtml(html, removeTrackingPixels(context))

    expect(result).toContain('src="photo.jpg"')
  })

  it('should preserve non-tracking images', () => {
    const html = '<img src="https://example.com/photo.jpg" alt="Nice photo">'
    const result = transformHtml(html, removeTrackingPixels(context))

    expect(result).toContain('src="https://example.com/photo.jpg"')
  })

  it('should not remove image with only one dimension set', () => {
    const html = '<img src="icon.png" width="1">'
    const result = transformHtml(html, removeTrackingPixels(context))

    expect(result).toContain('src="icon.png"')
  })

  it('should not remove image with non-numeric dimensions', () => {
    const html = '<img src="photo.jpg" width="auto" height="auto">'
    const result = transformHtml(html, removeTrackingPixels(context))

    expect(result).toContain('src="photo.jpg"')
  })

  it('should not remove 3x3 image', () => {
    const html = '<img src="small.png" width="3" height="3">'
    const result = transformHtml(html, removeTrackingPixels(context))

    expect(result).toContain('src="small.png"')
  })

  it('should handle html with no images', () => {
    const html = '<p>No images</p>'
    const result = transformHtml(html, removeTrackingPixels(context))

    expect(result).toContain('<p>No images</p>')
  })
})
