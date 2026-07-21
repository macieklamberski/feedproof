import { describe, expect, it } from 'bun:test'
import {
  countSrcsetCandidates,
  getImageFingerprint,
  getUrlDimensions,
  getUrlSizeHint,
  parseSrcset,
} from './images.js'

describe('parseSrcset', () => {
  it('should keep well-formed width and density candidates', () => {
    const value = 'https://example.com/a.jpg 768w, https://example.com/b.jpg 2x'
    const result = parseSrcset(value)

    expect(result.map((candidate) => candidate.url)).toEqual([
      'https://example.com/a.jpg',
      'https://example.com/b.jpg',
    ])
  })

  it('should drop descriptor-only candidates left by a url-less feed srcset', () => {
    // A Jetpack/WordPress bug: only the first candidate keeps its url, the rest are bare
    // width descriptors the parser then reads as candidate urls.
    const value = 'https://example.com/a.jpg 768w,  225w,  563w,  1152w'
    const result = parseSrcset(value)

    expect(result.map((candidate) => candidate.url)).toEqual(['https://example.com/a.jpg'])
  })

  it('should not mistake a filename that merely ends in a descriptor for one', () => {
    const value = 'https://example.com/225w.jpg 768w'
    const result = parseSrcset(value)

    expect(result.map((candidate) => candidate.url)).toEqual(['https://example.com/225w.jpg'])
  })
})

describe('countSrcsetCandidates', () => {
  it('should report more candidates than parseSrcset keeps when descriptors are dropped', () => {
    const value = 'https://example.com/a.jpg 768w,  225w,  563w'

    expect(countSrcsetCandidates(value)).toBeGreaterThan(parseSrcset(value).length)
    expect(parseSrcset(value)).toHaveLength(1)
  })
})

// Each case is [CDN label, wrapped input URL, expected inner-source key].
const imageProxyCases: Array<[string, string, string]> = [
  [
    'Cloudflare image',
    'https://files.zhedge.com/cdn-cgi/image/width=1080/https://assets.zerohedge.com/s3fs/photo.jpg',
    'assets.zerohedge.com/s3fs/photo.jpg',
  ],
  [
    'Cloudflare plain',
    'https://assets.thelocal.com/cdn-cgi/plain/https://apiwp.thelocal.com/wp-content/uploads/photo.jpg',
    'apiwp.thelocal.com/wp-content/uploads/photo.jpg',
  ],
  [
    'Next.js image',
    'https://x.com.br/_next/image?url=https%3A%2F%2Fx.com.br%2Ffotos%2Fphoto.jpg&w=384',
    'x.com.br/fotos/photo.jpg',
  ],
  [
    'Brightspot dims',
    'https://npr.brightspotcdn.com/dims4/default/f008/resize/300x169!/quality/90/?url=https%3A%2F%2Fmedia.npr.org%2Fphoto.jpg',
    'media.npr.org/photo.jpg',
  ],
  [
    'ImageKit',
    'https://ik.imagekit.io/demo/tr:w-200/https://cdn.example.com/photo.jpg',
    'cdn.example.com/photo.jpg',
  ],
  [
    'dev.to',
    'https://media2.dev.to/dynamic/image/width=800/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fphoto.png',
    'dev-to-uploads.s3.amazonaws.com/photo.png',
  ],
  [
    'Yahoo image API',
    'https://s.yimg.com/ny/api/res/1.2/As60/YXBw/https://d29szjachogqwa.cloudfront.net/images/photo.jpg',
    'd29szjachogqwa.cloudfront.net/images/photo.jpg',
  ],
  [
    'podigee',
    'https://images.podigee-cdn.net/0x,siN6/https://main.podigee-cdn.net/uploads/u17132/photo.jpg',
    'main.podigee-cdn.net/uploads/u17132/photo.jpg',
  ],
]

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
    expect(() =>
      getImageFingerprint('https://images.weserv.nl/?url=https%3A%2F%2F%E0%A4%A'),
    ).not.toThrow()
  })

  it('should return the input unchanged when it is not a parseable URL', () => {
    expect(getImageFingerprint('not-a-url')).toBe('not-a-url')
  })

  it('should unwrap a WordPress Photon URL, re-adding the stripped scheme', () => {
    const value = 'https://i0.wp.com/cdn.example.com/photo.jpg'
    const expected = 'cdn.example.com/photo.jpg'

    expect(getImageFingerprint(value)).toBe(expected)
  })

  it('should drop a whole leaf that is only dimensions', () => {
    const one = 'https://example.com/gallery/640x360.jpg'
    const two = 'https://example.com/gallery/1280x720.jpg'
    const expected = 'example.com/gallery'

    expect(getImageFingerprint(one)).toBe(expected)
    expect(getImageFingerprint(two)).toBe(expected)
  })

  it('should unwrap the Blogger opensocial proxy, keeping distinct images distinct', () => {
    const first =
      'https://images-blogger-opensocial.googleusercontent.com/gadgets/proxy?url=https%3A%2F%2Fcdn.example.com%2Fa.jpg'
    const second =
      'https://images-blogger-opensocial.googleusercontent.com/gadgets/proxy?url=https%3A%2F%2Fcdn.example.com%2Fb.jpg'

    expect(getImageFingerprint(first)).toBe('cdn.example.com/a.jpg')
    expect(getImageFingerprint(second)).toBe('cdn.example.com/b.jpg')
  })

  it('should unwrap the Hatena image scaler to its inner source', () => {
    const value =
      'https://cdn.image.st-hatena.com/image/scale/abc/width=1300/https%3A%2F%2Fcdn.example.com%2Fphoto.jpg'
    const expected = 'cdn.example.com/photo.jpg'

    expect(getImageFingerprint(value)).toBe(expected)
  })

  it.each(
    imageProxyCases,
  )('should unwrap the %s image proxy to its inner source', (_name, url, expected) => {
    expect(getImageFingerprint(url)).toBe(expected)
  })

  it('should unwrap then strip a Cloudinary fetch of an upload URL', () => {
    const value =
      'https://assets.example.com/x/image/fetch/c_fill,q_75/https://res.cloudinary.com/y/image/upload/v161/clients/a/DSC_0326.jpg'
    const expected = 'res.cloudinary.com/y/image/upload/v161/clients/a/DSC_0326.jpg'

    expect(getImageFingerprint(value)).toBe(expected)
  })

  it('should collapse Blogger size segments to the base image', () => {
    const large = 'https://2.bp.blogspot.com/-a/b/c/d/s1600/photo.jpg'
    const small = 'https://2.bp.blogspot.com/-a/b/c/d/s400/photo.jpg'
    const expected = '2.bp.blogspot.com/-a/b/c/d/photo.jpg'

    expect(getImageFingerprint(large)).toBe(expected)
    expect(getImageFingerprint(small)).toBe(expected)
  })

  it('should collapse Wix render variants to the media id', () => {
    const fit =
      'https://static.wixstatic.com/media/0037b6_abc~mv2.jpg/v1/fit/w_1000,h_1000/file.png'
    const fill =
      'https://static.wixstatic.com/media/0037b6_abc~mv2.jpg/v1/fill/w_500,h_500/file.png'
    const expected = 'static.wixstatic.com/media/0037b6_abc~mv2.jpg'

    expect(getImageFingerprint(fit)).toBe(expected)
    expect(getImageFingerprint(fill)).toBe(expected)
  })

  it('should drop the Ghost size directory', () => {
    const small = 'https://blog.example.com/content/images/size/w600/2024/04/photo.png'
    const large = 'https://blog.example.com/content/images/size/w1000/2024/04/photo.png'
    const expected = 'blog.example.com/content/images/2024/04/photo.png'

    expect(getImageFingerprint(small)).toBe(expected)
    expect(getImageFingerprint(large)).toBe(expected)
  })

  it('should strip Cloudinary upload transforms', () => {
    const one = 'https://cdn.example.com/x/image/upload/c_fill,h_104,w_300/v1/folder/id.jpg'
    const two = 'https://cdn.example.com/x/image/upload/c_fill,h_112,w_172/v1/folder/id.jpg'
    const expected = 'cdn.example.com/x/image/upload/v1/folder/id.jpg'

    expect(getImageFingerprint(one)).toBe(expected)
    expect(getImageFingerprint(two)).toBe(expected)
  })

  it('should collapse Medium render and format variants to the id', () => {
    const webp = 'https://miro.medium.com/v2/resize:fit:1006/format:webp/1*abcDEF-1400.webp'
    const jpeg = 'https://miro.medium.com/v2/resize:fit:1100/1*abcDEF.jpeg'
    const expected = 'miro.medium.com/1*abcDEF'

    expect(getImageFingerprint(webp)).toBe(expected)
    expect(getImageFingerprint(jpeg)).toBe(expected)
  })

  it('should unwrap a Cloudinary fetch URL to its inner source', () => {
    const value =
      'https://res.cloudinary.com/demo/image/fetch/w_200/https://cdn.example.com/photo.jpg'
    const expected = 'cdn.example.com/photo.jpg'

    expect(getImageFingerprint(value)).toBe(expected)
  })

  it('should unwrap a Cloudflare cdn-cgi image URL relative to the proxy host', () => {
    const value = 'https://example.com/cdn-cgi/image/width=200/uploads/photo.jpg'
    const expected = 'example.com/uploads/photo.jpg'

    expect(getImageFingerprint(value)).toBe(expected)
  })

  it('should unwrap an ImageKit URL to its inner source', () => {
    const value = 'https://ik.imagekit.io/demo/tr:w-200/https://cdn.example.com/photo.jpg'
    const expected = 'cdn.example.com/photo.jpg'

    expect(getImageFingerprint(value)).toBe(expected)
  })

  it('should unwrap a WordPress Photon URL, re-adding the stripped scheme', () => {
    const value = 'https://i0.wp.com/cdn.example.com/photo.jpg'
    const expected = 'cdn.example.com/photo.jpg'

    expect(getImageFingerprint(value)).toBe(expected)
  })

  it('should unwrap a Next.js image optimizer URL to its inner source', () => {
    const value =
      'https://example.com/_next/image?url=https%3A%2F%2Fcdn.example.com%2Fphoto.jpg&w=200'
    const expected = 'cdn.example.com/photo.jpg'

    expect(getImageFingerprint(value)).toBe(expected)
  })

  it('should drop a whole leaf that is only dimensions', () => {
    const value = 'https://example.com/gallery/640x360.jpg'
    const expected = 'example.com/gallery'

    expect(getImageFingerprint(value)).toBe(expected)
  })

  it('should drop a whole leaf that is a crop name plus dimensions', () => {
    const value = 'https://example.com/gallery/original__640x360.jpg'
    const expected = 'example.com/gallery'

    expect(getImageFingerprint(value)).toBe(expected)
  })

  it('should drop the hash fragment', () => {
    const value = 'https://example.com/photo.jpg#section'
    const expected = 'example.com/photo.jpg'

    expect(getImageFingerprint(value)).toBe(expected)
  })

  it('should keep the opaque path id in the key when the file name is constant', () => {
    const first = 'https://media.example.com/media/GypVyX5Nw0R2g/clip.gif'
    const second = 'https://media.example.com/media/l0IyhVkiQ1IBQSCwU/clip.gif'
    const firstExpected = 'media.example.com/media/GypVyX5Nw0R2g/clip.gif'
    const secondExpected = 'media.example.com/media/l0IyhVkiQ1IBQSCwU/clip.gif'

    expect(getImageFingerprint(first)).toBe(firstExpected)
    expect(getImageFingerprint(second)).toBe(secondExpected)
  })

  it('should keep the path id in the key when a templated slug is shared', () => {
    const first = 'https://cdn.example.com/img/AAA111/match-report.jpg'
    const second = 'https://cdn.example.com/img/BBB222/match-report.jpg'
    const firstExpected = 'cdn.example.com/img/AAA111/match-report.jpg'
    const secondExpected = 'cdn.example.com/img/BBB222/match-report.jpg'

    expect(getImageFingerprint(first)).toBe(firstExpected)
    expect(getImageFingerprint(second)).toBe(secondExpected)
  })

  it('should keep the preview and original rendition segment in the key', () => {
    const preview = 'https://cdn.example.com/pics/pics_preview/9/2/0/17577029.jpg'
    const original = 'https://cdn.example.com/pics/pics_original/9/2/0/17577029.jpg'
    const previewExpected = 'cdn.example.com/pics/pics_preview/9/2/0/17577029.jpg'
    const originalExpected = 'cdn.example.com/pics/pics_original/9/2/0/17577029.jpg'

    expect(getImageFingerprint(preview)).toBe(previewExpected)
    expect(getImageFingerprint(original)).toBe(originalExpected)
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
