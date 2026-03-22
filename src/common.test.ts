import { describe, expect, it } from 'bun:test'
import { applyDomTransforms, stripOversizedBase64Sources, transformHtml } from './common.js'

describe('transformHtml', () => {
  it('should preserve content when transform is a no-op', () => {
    const html = '<p>Hello world</p>'

    expect(transformHtml(html, () => {})).toContain('<p>Hello world</p>')
  })

  it('should allow modifying the DOM', () => {
    const html = '<p><img data-src="img.jpg"></p>'
    const result = transformHtml(html, (document) => {
      for (const image of document.querySelectorAll('img[data-src]')) {
        const dataSrc = image.getAttribute('data-src')

        if (dataSrc) {
          image.setAttribute('src', dataSrc)
          image.removeAttribute('data-src')
        }
      }
    })

    expect(result).toContain('src="img.jpg"')
    expect(result).not.toContain('data-src')
  })

  it('should handle empty string', () => {
    expect(transformHtml('', () => {})).toBeDefined()
  })
})

describe('stripOversizedBase64Sources', () => {
  it('should strip base64 src exceeding max size', () => {
    const largeData = 'A'.repeat(100)
    const value = `<img src="data:image/png;base64,${largeData}">`

    expect(stripOversizedBase64Sources(value, 50)).toBe('<img src="">')
  })

  it('should preserve base64 src under max size', () => {
    const value = '<img src="data:image/png;base64,iVBOR=">'

    expect(stripOversizedBase64Sources(value, 50 * 1024)).toBe(value)
  })

  it('should strip base64 srcset exceeding max size', () => {
    const largeData = 'A'.repeat(100)
    const value = `<source srcset="data:image/webp;base64,${largeData}">`

    expect(stripOversizedBase64Sources(value, 50)).toBe('<source srcset="">')
  })

  it('should strip base64 poster exceeding max size', () => {
    const largeData = 'A'.repeat(100)
    const value = `<video poster="data:image/jpeg;base64,${largeData}">`

    expect(stripOversizedBase64Sources(value, 50)).toBe('<video poster="">')
  })

  it('should strip only oversized sources when mixed with small ones', () => {
    const largeData = 'A'.repeat(100)
    const value = `<img src="data:image/png;base64,small="><img src="data:image/png;base64,${largeData}">`

    const result = stripOversizedBase64Sources(value, 50)

    expect(result).toContain('data:image/png;base64,small=')
    expect(result).not.toContain(largeData)
  })

  it('should not modify regular url src attributes', () => {
    const value = '<img src="https://example.com/image.png">'

    expect(stripOversizedBase64Sources(value, 50)).toBe(value)
  })

  it('should not modify data uris without base64 encoding', () => {
    const value = '<img src="data:image/svg+xml,%3Csvg%3E%3C/svg%3E">'

    expect(stripOversizedBase64Sources(value, 50)).toBe(value)
  })

  it('should return html unchanged when no base64 present', () => {
    const value = '<p>Hello world</p>'

    expect(stripOversizedBase64Sources(value, 50)).toBe(value)
  })

  it('should handle single-quoted attributes', () => {
    const largeData = 'A'.repeat(100)
    const value = `<img src='data:image/png;base64,${largeData}'>`

    expect(stripOversizedBase64Sources(value, 50)).toBe("<img src=''>")
  })
})

describe('applyDomTransforms base64 stripping', () => {
  it('should preserve small base64 images through dom transforms', () => {
    const value = '<p>Text</p><img src="data:image/png;base64,iVBORw0KGgo=">'

    expect(applyDomTransforms(value, [])).toContain('data:image/png;base64,iVBORw0KGgo=')
  })

  it('should strip oversized base64 images during dom transforms', () => {
    const largeData = 'A'.repeat(100 * 1024)
    const value = `<p>Text</p><img src="data:image/png;base64,${largeData}">`
    const result = applyDomTransforms(value, [])

    expect(result).toContain('<p>Text</p>')
    expect(result).not.toContain(largeData)
  })
})
