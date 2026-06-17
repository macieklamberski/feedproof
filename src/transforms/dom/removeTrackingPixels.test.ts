import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import { baseContext, describeForEachParser, html } from '../../tests.js'
import type { TransformContext } from '../../types.js'
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

  describe('opacity-beacon detection', () => {
    // display:none / visibility:hidden / [hidden] images are removed upstream by
    // stripHiddenElements (see its tests); removeTrackingPixels owns opacity:0.
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
    it('should remove images from feedsportal.com', async () => {
      const value = '<img src="https://feedsportal.com/c/12345/abc.gif">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove images from feedsportal.com subdomains', async () => {
      const value = '<img src="https://da.feedsportal.com/c/12345/abc.gif">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove images from stats.wordpress.com', async () => {
      const value = '<img src="https://stats.wordpress.com/b.gif?v=noscript">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove images from pixel.wp.com', async () => {
      const value = '<img src="https://pixel.wp.com/g.gif?v=ext&blog=12345">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove images from doubleclick.net', async () => {
      const value = '<img src="https://ad.doubleclick.net/ddm/trackimp/N123">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove images from google-analytics.com', async () => {
      const value = '<img src="https://www.google-analytics.com/collect?v=1&tid=UA-1">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove images from list-manage.com (Mailchimp)', async () => {
      const value = '<img src="https://example.list-manage.com/track/open.php?u=1&id=2">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove images from feedburner.com', async () => {
      const value = '<img src="https://feeds.feedburner.com/~ff/MyFeed?d=abc123">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove images from mailerlite.com', async () => {
      const value = '<img src="https://track.mailerlite.com/o/abc123">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove images from email.medium.com', async () => {
      const value = '<img src="https://email.medium.com/o/eJw_/abc.gif">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove images from stat-c.medium.com', async () => {
      const value = '<img src="https://stat-c.medium.com/track?u=abc">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove images from taboola.com', async () => {
      const value = '<img src="https://trc.taboola.com/123/log/3/click?article=abc">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove images from scorecardresearch.com', async () => {
      const value = '<img src="https://b.scorecardresearch.com/p?c1=2&c2=12345">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove images from googlesyndication.com', async () => {
      const value = '<img src="https://pagead2.googlesyndication.com/pagead/gen_204?id=trc">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove images from sentry.io beacons', async () => {
      const value = '<img src="https://o123.ingest.sentry.io/api/0/envelope/?sentry_key=abc">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove images from assoc-amazon.com', async () => {
      const value = '<img src="https://www.assoc-amazon.com/e/ir?t=tag&l=as2&o=1&a=B001">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove images from statcounter.com', async () => {
      const value = '<img src="https://c.statcounter.com/counter.php?sc_project=123">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove images from a8.net affiliate pixels', async () => {
      const value = '<img src="https://www12.a8.net/0.gif?a=1&p=2">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove The Conversation counter subdomain only', async () => {
      const value = '<img src="https://counter.theconversation.com/content/82899/count.gif">'

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
    it('should remove images with /pixel. path', async () => {
      const value = '<img src="https://example.com/pixel.gif?id=abc">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove images with /pixel/ path', async () => {
      const value = '<img src="https://example.com/pixel/abc.png">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove images with /beacon path', async () => {
      const value = '<img src="https://example.com/beacon.gif">'

      expect(await transform(value)).toEqualHtml('')
    })

    it('should remove images with /count path', async () => {
      const value = '<img src="https://example.com/count.gif">'

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

  describe('overrides', () => {
    it('should ignore default trackingHosts when override is provided', async () => {
      const customContext: TransformContext = {
        ...baseContext,
        trackingHosts: ['my-tracker.example'],
      }
      const value = '<img src="https://stats.wordpress.com/b.gif">'

      expect(await transform(value, customContext)).toEqualHtml(value)
    })

    it('should use the provided trackingHosts', async () => {
      const customContext: TransformContext = {
        ...baseContext,
        trackingHosts: ['my-tracker.example'],
      }
      const value = '<img src="https://my-tracker.example/p.gif">'

      expect(await transform(value, customContext)).toEqualHtml('')
    })

    it('should ignore default trackingPathSegments when override is provided', async () => {
      const customContext: TransformContext = { ...baseContext, trackingPathSegments: ['ping'] }
      const value = '<img src="https://example.com/pixel.gif">'

      expect(await transform(value, customContext)).toEqualHtml(value)
    })

    it('should use the provided trackingPathSegments', async () => {
      const customContext: TransformContext = { ...baseContext, trackingPathSegments: ['ping'] }
      const value = '<img src="https://example.com/ping.gif">'

      expect(await transform(value, customContext)).toEqualHtml('')
    })

    it('should disable path-based detection when trackingPathSegments is empty', async () => {
      const customContext: TransformContext = { ...baseContext, trackingPathSegments: [] }
      const value = '<img src="https://example.com/pixel.gif">'

      expect(await transform(value, customContext)).toEqualHtml(value)
    })

    it('should still apply size check when overrides are set', async () => {
      const customContext: TransformContext = {
        ...baseContext,
        trackingHosts: [],
        trackingPathSegments: [],
      }
      const value = '<img src="https://example.com/p.gif" width="1" height="1">'

      expect(await transform(value, customContext)).toEqualHtml('')
    })

    it('should still apply the opacity check when overrides are set', async () => {
      const customContext: TransformContext = {
        ...baseContext,
        trackingHosts: [],
        trackingPathSegments: [],
      }
      const value = '<img src="https://example.com/p.gif" style="opacity:0">'

      expect(await transform(value, customContext)).toEqualHtml('')
    })

    it('should escape special regex characters in trackingPathSegments', async () => {
      const customContext: TransformContext = { ...baseContext, trackingPathSegments: ['p.x'] }
      const value = '<img src="https://example.com/pax.gif">'

      expect(await transform(value, customContext)).toEqualHtml(value)
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
