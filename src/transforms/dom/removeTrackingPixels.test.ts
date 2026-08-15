import { describe, expect, it } from 'bun:test'
import { defaultTrackingHosts, defaultTrackingPathSegments } from '../../defaults.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
import { applyDomTransforms } from '../../utils/transforms.js'
import { removeTrackingPixels } from './removeTrackingPixels.js'

describeForEachParser('removeTrackingPixels', (parseHtml) => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [removeTrackingPixels(context)])
  }

  describe('size-based detection', () => {
    it('should remove 1x1 pixel images', async () => {
      const value = html`
        <p>Text</p>
        <img src="tracker.gif" width="1" height="1">
      `
      const result = await transform(value)

      expect(result).toContain('<p>Text</p>')
      expect(result).not.toContain('tracker.gif')
    })

    it('should remove 2x2 pixel images', async () => {
      const value = '<img src="pixel.png" width="2" height="2">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove image when only width=1 is set', async () => {
      const value = '<img src="icon.png" width="1">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove image when only height=1 is set', async () => {
      const value = '<img src="icon.png" height="1">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove image when only width=0 is set and src is not a real image', async () => {
      const value = '<img src="https://example.com/track?id=1" width="0">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should not remove normal-sized images', async () => {
      const value = '<img src="photo.jpg" width="800" height="600">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not remove image with non-numeric dimensions', async () => {
      const value = '<img src="photo.jpg" width="auto" height="auto">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not remove 3x3 image', async () => {
      const value = '<img src="small.png" width="3" height="3">'

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  describe('content-image guard', () => {
    it('should keep a 0x0 image whose src is a real raster file', async () => {
      const value =
        '<img src="https://img.cdn.example.com/abc.jpg" width="0" height="0" alt="Photo">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should keep a 0x0 image whose src carries a raster format query', async () => {
      const value =
        '<img src="https://img.cdn.example.com/abc?width=1300&format=jpeg" width="0" height="0">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should keep a tiny image that declares a srcset at any size', async () => {
      const value = '<img src="placeholder.gif" srcset="real.jpg 800w" width="1" height="1">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should still remove a 0x0 beacon whose src is not a real image', async () => {
      const value =
        '<img src="https://stat.example.com/piwik.php?idsite=1&rec=1" width="0" height="0">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should still remove a 0x0 gif spacer', async () => {
      const value = '<img src="spacer.gif" width="0" height="0">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should still remove a 1x1 raster pixel without a srcset', async () => {
      const value = '<img src="https://example.com/p.png" width="1" height="1">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should still remove an opacity:0 image even with a real raster src', async () => {
      const value =
        '<img src="https://example.com/photo.jpg" style="opacity:0" width="0" height="0">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should still remove a tracking-host image even with a real raster src', async () => {
      const value = '<img src="https://stats.wordpress.com/b.png" width="0" height="0">'

      expect(await transform(value)).toEqualHtml('')
    })
  })

  describe('inline-style detection', () => {
    it('should remove img with style width:1px;height:1px and no attrs', async () => {
      const value = '<img src="track.gif" style="width:1px;height:1px">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove img with only style width:1px', async () => {
      const value = '<img src="bug.gif" style="width:1px">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove img with only style height:0', async () => {
      const value = '<img src="zero.gif" style="height:0">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove img with spaces in style declaration', async () => {
      const value = '<img src="spaced.gif" style="width: 1px ; height: 1px">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should not remove img with style width:600px;height:400px', async () => {
      const value = '<img src="hero.jpg" style="width:600px;height:400px">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not remove img with non-px width:50%', async () => {
      const value = '<img src="responsive.jpg" style="width:50%">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should detect dimension from style when attribute is auto', async () => {
      const value = '<img src="mixed.gif" width="auto" height="auto" style="width:1px;height:1px">'

      expect(await transform(value)).toEqualHtml('')
    })
  })

  describe('hidden-image detection', () => {
    // stripHiddenElements removes these upstream in the default pipeline, but
    // removeTrackingPixels rechecks via the shared isElementHidden so it stays
    // correct when composed on its own. opacity:0 is image-specific and stays here.
    it('should remove an image hidden via display:none', async () => {
      const value = '<img src="invis.gif" style="display:none">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove an image hidden via visibility:hidden', async () => {
      const value = '<img src="invis.gif" style="visibility:hidden">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove an image carrying the hidden attribute', async () => {
      const value = '<img src="invis.gif" hidden>'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove img with style opacity:0', async () => {
      const value = '<img src="invis.gif" style="opacity:0">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove img with style opacity:0.0', async () => {
      const value = '<img src="invis.gif" style="opacity:0.0">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should not remove img with style opacity:0.5', async () => {
      const value = '<img src="faded.jpg" style="opacity:0.5">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not remove img with style display:block', async () => {
      const value = '<img src="visible.jpg" style="display:block">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not remove img solely on aria-hidden=true', async () => {
      const value = '<img src="decorative.jpg" aria-hidden="true">'

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  describe('host-based detection', () => {
    // Iterates the real default list, so every entry is exercised and a new entry
    // is covered automatically.
    it.each(defaultTrackingHosts)('should remove images from %s', async (host) => {
      const value = `<img src="https://${host}/t.gif?id=abc">`

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove images from tracking-host subdomains', async () => {
      const value = '<img src="https://da.feedsportal.com/c/12345/abc.gif">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should not remove The Conversation content images on other subdomains', async () => {
      const value = '<img src="https://images.theconversation.com/files/1/photo.jpg" alt="Photo">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not remove images from look-alike hosts', async () => {
      const value = '<img src="https://notfeedsportal.com/photo.jpg">'

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  describe('path-based detection', () => {
    it.each(defaultTrackingPathSegments)('should remove images with /%s. path', async (segment) => {
      const value = `<img src="https://example.com/${segment}.gif?id=abc">`

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove images with /pixel/ path', async () => {
      const value = '<img src="https://example.com/pixel/abc.png">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should detect tracking path in relative URLs', async () => {
      const value = '<img src="/pixel.gif?campaign=newsletter">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should not remove track-prefixed paths now that track segment is dropped', async () => {
      const value = '<img src="https://example.com/track/the-song.jpg">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not remove counter-like words that fail boundary check', async () => {
      const value = '<img src="https://example.com/counterfeit.jpg">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should not remove unrelated path segments containing pixel substring', async () => {
      const value = '<img src="https://example.com/pixelated-art-piece.jpg">'

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  describe('combined behavior', () => {
    it('should preserve non-tracking images', async () => {
      const value = '<img src="https://example.com/photo.jpg" alt="Nice photo">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should remove pixel even when src is missing host signal', async () => {
      const value = '<img src="https://cdn.example.com/img.jpg" width="1" height="1">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove tracker-host even when no width/height set', async () => {
      const value = '<img src="https://stats.wordpress.com/b.gif">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should handle html with no images', async () => {
      const value = '<p>No images</p>'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should handle img with malformed src gracefully', async () => {
      const value = '<img src="://broken">'

      expect(await transform(value)).toEqualHtml(value)
    })

    it('should handle img with src that throws on URL parse gracefully', async () => {
      // `http://[invalid` (unclosed IPv6 bracket) makes `new URL()` throw.
      const value = '<img src="http://[invalid">'

      expect(await transform(value)).toEqualHtml(value)
    })
  })

  it('should be idempotent', async () => {
    const value = html`
      <p>Text</p>
      <img src="tracker.gif" width="1" height="1">
    `
    const once = await transform(value)
    const twice = await transform(once)

    expect(twice).toBe(once)
  })
})
