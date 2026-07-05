import { describe, expect, it } from 'bun:test'
import { getImageFingerprint, getUrlDimensions, getUrlSizeHint } from './images.js'

describe('getImageFingerprint', () => {
  it('should drop the query so resize variants collapse', () => {
    const bare = getImageFingerprint('https://example.com/cover.jpg')
    const sized = getImageFingerprint('https://example.com/cover.jpg?w=300')

    expect(sized).toBe(bare)
  })

  it('should collapse a hyphen -WxH dimension suffix to the base filename', () => {
    const bare = getImageFingerprint('https://example.com/uploads/photo.jpg')
    const scaled = getImageFingerprint('https://example.com/uploads/photo-800x450.jpg')

    expect(scaled).toBe(bare)
  })

  it('should collapse an underscore _WxH dimension suffix to the base filename', () => {
    const bare = getImageFingerprint('https://example.com/uploads/photo.jpg')
    const scaled = getImageFingerprint('https://example.com/uploads/photo_800x450.jpg')

    expect(scaled).toBe(bare)
  })

  it('should drop a size-keyword leaf when a parent path anchors it', () => {
    const large = getImageFingerprint('https://example.com/media/large.jpg')
    const small = getImageFingerprint('https://example.com/media/small.jpg')

    expect(small).toBe(large)
  })

  it('should not collapse root-level size-keyword files', () => {
    const large = getImageFingerprint('https://example.com/large.jpg')
    const small = getImageFingerprint('https://example.com/small.jpg')

    expect(small).not.toBe(large)
  })

  it('should keep distinct filenames apart', () => {
    const one = getImageFingerprint('https://example.com/a/one.jpg')
    const two = getImageFingerprint('https://example.com/a/two.jpg')

    expect(one).not.toBe(two)
  })

  it('should normalize host (drop www, collapse http/https)', () => {
    const secure = getImageFingerprint('https://www.example.com/cover.jpg')
    const insecure = getImageFingerprint('http://example.com/cover.jpg')

    expect(insecure).toBe(secure)
  })

  it('should unwrap an image-proxy URL to its inner source', () => {
    const direct = getImageFingerprint('https://cdn.example.com/photo.jpg')
    const proxied = getImageFingerprint(
      'https://images.weserv.nl/?url=https%3A%2F%2Fcdn.example.com%2Fphoto.jpg&w=200',
    )

    expect(proxied).toBe(direct)
  })

  it('should keep the raw capture when the proxied source is malformed', () => {
    // `%E0%A4%A` is an incomplete percent-escape; decoding throws and the raw value is kept.
    expect(() => getImageFingerprint('https://images.weserv.nl/?url=%E0%A4%A')).not.toThrow()
  })
})

describe('getUrlDimensions', () => {
  it('should read width and height query params', () => {
    const value = 'https://example.com/photo.jpg?width=800&height=600'
    const expected = { width: 800, height: 600 }

    expect(getUrlDimensions(value)).toEqual(expected)
  })

  it('should read a WxH pair from the path', () => {
    const value = 'https://example.com/photo-1280x720.jpg'
    const expected = { width: 1280, height: 720 }

    expect(getUrlDimensions(value)).toEqual(expected)
  })

  it('should require both dimensions', () => {
    const value = 'https://example.com/photo.jpg?w=300'

    expect(getUrlDimensions(value)).toBeUndefined()
  })

  it('should reject sub-threshold sizes', () => {
    const value = 'https://example.com/pixel-1x1.gif'

    expect(getUrlDimensions(value)).toBeUndefined()
  })

  it('should skip data URLs', () => {
    const value = 'data:image/png;base64,iVBORw0KGgo='

    expect(getUrlDimensions(value)).toBeUndefined()
  })
})

describe('getUrlSizeHint', () => {
  it('should return the area when both dimensions are present', () => {
    const value = 'https://example.com/photo-800x600.jpg'
    const expected = 480000

    expect(getUrlSizeHint(value)).toBe(expected)
  })

  it('should fall back to width-only from a query param', () => {
    const value = 'https://example.com/cover.jpg?w=900'
    const expected = 900

    expect(getUrlSizeHint(value)).toBe(expected)
  })

  it('should rank a wider query variant above a narrower one', () => {
    const wide = getUrlSizeHint('https://example.com/cover.jpg?w=900')
    const narrow = getUrlSizeHint('https://example.com/cover.jpg?w=300')

    expect(wide).toBeGreaterThan(narrow)
  })

  it('should return 0 when no size is encoded', () => {
    const value = 'https://example.com/cover.jpg'
    const expected = 0

    expect(getUrlSizeHint(value)).toBe(expected)
  })
})
