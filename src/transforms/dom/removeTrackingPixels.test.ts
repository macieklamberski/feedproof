import { describe, expect, it } from 'bun:test'
import { applyDomTransforms } from '../../common.js'
import {
  defaultEmbedResolvers,
  defaultLazySrcAttributes,
  defaultLazySrcsetAttributes,
  defaultResolveUrlFn,
  defaultTrackingHosts,
  defaultTrackingPathSegments,
  defaultUrlUnwrappers,
} from '../../defaults.js'
import { parseHtml } from '../../parsers/linkedom.js'
import type { TransformContext } from '../../types.js'
import { removeTrackingPixels } from './removeTrackingPixels.js'

const baseContext: TransformContext = {
  embedResolvers: defaultEmbedResolvers,
  lazySrcAttributes: defaultLazySrcAttributes,
  lazySrcsetAttributes: defaultLazySrcsetAttributes,
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
  urlUnwrappers: defaultUrlUnwrappers,
  resolveUrlFn: defaultResolveUrlFn,
}

describe('removeTrackingPixels', () => {
  const transform = (html: string, context: TransformContext = baseContext) => {
    return applyDomTransforms(parseHtml(html), [removeTrackingPixels(context)])
  }

  describe('size-based detection', () => {
    it('should remove 1x1 pixel images', async () => {
      const value = '<p>Text</p><img src="tracker.gif" width="1" height="1">'
      const result = await transform(value)

      expect(result).toContain('<p>Text</p>')
      expect(result).not.toContain('tracker.gif')
    })

    it('should remove 2x2 pixel images', async () => {
      const value = '<img src="pixel.png" width="2" height="2">'
      const result = await transform(value)

      expect(result).not.toContain('pixel.png')
    })

    it('should remove image when only width=1 is set', async () => {
      const value = '<img src="icon.png" width="1">'
      const result = await transform(value)

      expect(result).not.toContain('icon.png')
    })

    it('should remove image when only height=1 is set', async () => {
      const value = '<img src="icon.png" height="1">'
      const result = await transform(value)

      expect(result).not.toContain('icon.png')
    })

    it('should remove image when only width=0 is set', async () => {
      const value = '<img src="icon.png" width="0">'
      const result = await transform(value)

      expect(result).not.toContain('icon.png')
    })

    it('should not remove normal-sized images', async () => {
      const value = '<img src="photo.jpg" width="800" height="600">'
      const result = await transform(value)

      expect(result).toContain('src="photo.jpg"')
    })

    it('should not remove image with non-numeric dimensions', async () => {
      const value = '<img src="photo.jpg" width="auto" height="auto">'
      const result = await transform(value)

      expect(result).toContain('src="photo.jpg"')
    })

    it('should not remove 3x3 image', async () => {
      const value = '<img src="small.png" width="3" height="3">'
      const result = await transform(value)

      expect(result).toContain('src="small.png"')
    })
  })

  describe('inline-style detection', () => {
    it('should remove img with style width:1px;height:1px and no attrs', async () => {
      const value = '<img src="track.gif" style="width:1px;height:1px">'
      const result = await transform(value)

      expect(result).not.toContain('track.gif')
    })

    it('should remove img with only style width:1px', async () => {
      const value = '<img src="bug.gif" style="width:1px">'
      const result = await transform(value)

      expect(result).not.toContain('bug.gif')
    })

    it('should remove img with only style height:0', async () => {
      const value = '<img src="zero.gif" style="height:0">'
      const result = await transform(value)

      expect(result).not.toContain('zero.gif')
    })

    it('should remove img with spaces in style declaration', async () => {
      const value = '<img src="spaced.gif" style="width: 1px ; height: 1px">'
      const result = await transform(value)

      expect(result).not.toContain('spaced.gif')
    })

    it('should not remove img with style width:600px;height:400px', async () => {
      const value = '<img src="hero.jpg" style="width:600px;height:400px">'
      const result = await transform(value)

      expect(result).toContain('hero.jpg')
    })

    it('should not remove img with non-px width:50%', async () => {
      const value = '<img src="responsive.jpg" style="width:50%">'
      const result = await transform(value)

      expect(result).toContain('responsive.jpg')
    })

    it('should detect dimension from style when attribute is auto', async () => {
      const value = '<img src="mixed.gif" width="auto" height="auto" style="width:1px;height:1px">'
      const result = await transform(value)

      expect(result).not.toContain('mixed.gif')
    })
  })

  describe('hidden-style detection', () => {
    it('should remove img with hidden attribute', async () => {
      const value = '<img src="ghost.gif" hidden>'
      const result = await transform(value)

      expect(result).not.toContain('ghost.gif')
    })

    it('should remove img with style display:none', async () => {
      const value = '<img src="invis.gif" style="display:none">'
      const result = await transform(value)

      expect(result).not.toContain('invis.gif')
    })

    it('should remove img with style visibility:hidden', async () => {
      const value = '<img src="invis.gif" style="visibility:hidden">'
      const result = await transform(value)

      expect(result).not.toContain('invis.gif')
    })

    it('should remove img with style opacity:0', async () => {
      const value = '<img src="invis.gif" style="opacity:0">'
      const result = await transform(value)

      expect(result).not.toContain('invis.gif')
    })

    it('should remove img with style opacity:0.0', async () => {
      const value = '<img src="invis.gif" style="opacity:0.0">'
      const result = await transform(value)

      expect(result).not.toContain('invis.gif')
    })

    it('should not remove img with style opacity:0.5', async () => {
      const value = '<img src="faded.jpg" style="opacity:0.5">'
      const result = await transform(value)

      expect(result).toContain('faded.jpg')
    })

    it('should not remove img with style display:block', async () => {
      const value = '<img src="visible.jpg" style="display:block">'
      const result = await transform(value)

      expect(result).toContain('visible.jpg')
    })

    it('should not remove img solely on aria-hidden=true', async () => {
      const value = '<img src="decorative.jpg" aria-hidden="true">'
      const result = await transform(value)

      expect(result).toContain('decorative.jpg')
    })
  })

  describe('host-based detection', () => {
    it('should remove images from feedsportal.com', async () => {
      const value = '<img src="https://feedsportal.com/c/12345/abc.gif">'
      const result = await transform(value)

      expect(result).not.toContain('feedsportal.com')
    })

    it('should remove images from feedsportal.com subdomains', async () => {
      const value = '<img src="https://da.feedsportal.com/c/12345/abc.gif">'
      const result = await transform(value)

      expect(result).not.toContain('feedsportal.com')
    })

    it('should remove images from stats.wordpress.com', async () => {
      const value = '<img src="https://stats.wordpress.com/b.gif?v=noscript">'
      const result = await transform(value)

      expect(result).not.toContain('stats.wordpress.com')
    })

    it('should remove images from pixel.wp.com', async () => {
      const value = '<img src="https://pixel.wp.com/g.gif?v=ext&blog=12345">'
      const result = await transform(value)

      expect(result).not.toContain('pixel.wp.com')
    })

    it('should remove images from doubleclick.net', async () => {
      const value = '<img src="https://ad.doubleclick.net/ddm/trackimp/N123">'
      const result = await transform(value)

      expect(result).not.toContain('doubleclick.net')
    })

    it('should remove images from google-analytics.com', async () => {
      const value = '<img src="https://www.google-analytics.com/collect?v=1&tid=UA-1">'
      const result = await transform(value)

      expect(result).not.toContain('google-analytics.com')
    })

    it('should remove images from list-manage.com (Mailchimp)', async () => {
      const value = '<img src="https://example.list-manage.com/track/open.php?u=1&id=2">'
      const result = await transform(value)

      expect(result).not.toContain('list-manage.com')
    })

    it('should remove images from feedburner.com', async () => {
      const value = '<img src="https://feeds.feedburner.com/~ff/MyFeed?d=abc123">'
      const result = await transform(value)

      expect(result).not.toContain('feedburner.com')
    })

    it('should remove images from mailerlite.com', async () => {
      const value = '<img src="https://track.mailerlite.com/o/abc123">'
      const result = await transform(value)

      expect(result).not.toContain('mailerlite.com')
    })

    it('should remove images from email.medium.com', async () => {
      const value = '<img src="https://email.medium.com/o/eJw_/abc.gif">'
      const result = await transform(value)

      expect(result).not.toContain('email.medium.com')
    })

    it('should remove images from stat-c.medium.com', async () => {
      const value = '<img src="https://stat-c.medium.com/track?u=abc">'
      const result = await transform(value)

      expect(result).not.toContain('stat-c.medium.com')
    })

    it('should remove images from taboola.com', async () => {
      const value = '<img src="https://trc.taboola.com/123/log/3/click?article=abc">'
      const result = await transform(value)

      expect(result).not.toContain('taboola.com')
    })

    it('should remove images from scorecardresearch.com', async () => {
      const value = '<img src="https://b.scorecardresearch.com/p?c1=2&c2=12345">'
      const result = await transform(value)

      expect(result).not.toContain('scorecardresearch.com')
    })

    it('should remove images from googlesyndication.com', async () => {
      const value = '<img src="https://pagead2.googlesyndication.com/pagead/gen_204?id=trc">'
      const result = await transform(value)

      expect(result).not.toContain('googlesyndication.com')
    })

    it('should remove images from sentry.io beacons', async () => {
      const value = '<img src="https://o123.ingest.sentry.io/api/0/envelope/?sentry_key=abc">'
      const result = await transform(value)

      expect(result).not.toContain('sentry.io')
    })

    it('should not remove images from look-alike hosts', async () => {
      const value = '<img src="https://notfeedsportal.com/photo.jpg">'
      const result = await transform(value)

      expect(result).toContain('notfeedsportal.com')
    })
  })

  describe('path-based detection', () => {
    it('should remove images with /pixel. path', async () => {
      const value = '<img src="https://example.com/pixel.gif?id=abc">'
      const result = await transform(value)

      expect(result).not.toContain('pixel.gif')
    })

    it('should remove images with /pixel/ path', async () => {
      const value = '<img src="https://example.com/pixel/abc.png">'
      const result = await transform(value)

      expect(result).not.toContain('pixel/abc.png')
    })

    it('should remove images with /beacon path', async () => {
      const value = '<img src="https://example.com/beacon.gif">'
      const result = await transform(value)

      expect(result).not.toContain('beacon.gif')
    })

    it('should remove images with /count path', async () => {
      const value = '<img src="https://example.com/count.gif">'
      const result = await transform(value)

      expect(result).not.toContain('count.gif')
    })

    it('should detect tracking path in relative URLs', async () => {
      const value = '<img src="/pixel.gif?campaign=newsletter">'
      const result = await transform(value)

      expect(result).not.toContain('pixel.gif')
    })

    it('should not remove track-prefixed paths now that track segment is dropped', async () => {
      const value = '<img src="https://example.com/track/the-song.jpg">'
      const result = await transform(value)

      expect(result).toContain('track/the-song.jpg')
    })

    it('should not remove counter-like words that fail boundary check', async () => {
      const value = '<img src="https://example.com/counterfeit.jpg">'
      const result = await transform(value)

      expect(result).toContain('counterfeit.jpg')
    })

    it('should not remove unrelated path segments containing pixel substring', async () => {
      const value = '<img src="https://example.com/pixelated-art-piece.jpg">'
      const result = await transform(value)

      expect(result).toContain('pixelated-art-piece.jpg')
    })
  })

  describe('combined behavior', () => {
    it('should preserve non-tracking images', async () => {
      const value = '<img src="https://example.com/photo.jpg" alt="Nice photo">'
      const result = await transform(value)

      expect(result).toContain('src="https://example.com/photo.jpg"')
    })

    it('should remove pixel even when src is missing host signal', async () => {
      const value = '<img src="https://cdn.example.com/img.jpg" width="1" height="1">'
      const result = await transform(value)

      expect(result).not.toContain('cdn.example.com')
    })

    it('should remove tracker-host even when no width/height set', async () => {
      const value = '<img src="https://stats.wordpress.com/b.gif">'
      const result = await transform(value)

      expect(result).not.toContain('stats.wordpress.com')
    })

    it('should handle html with no images', async () => {
      const value = '<p>No images</p>'
      const result = await transform(value)

      expect(result).toContain('<p>No images</p>')
    })

    it('should handle img with malformed src gracefully', async () => {
      const value = '<img src="://broken">'
      const result = await transform(value)

      expect(result).toContain('://broken')
    })

    it('should handle img with src that throws on URL parse gracefully', async () => {
      // `http://[invalid` (unclosed IPv6 bracket) makes `new URL()` throw.
      const value = '<img src="http://[invalid">'
      const result = await transform(value)

      expect(result).toContain('http://[invalid')
    })
  })

  describe('overrides', () => {
    it('should ignore default trackingHosts when override is provided', async () => {
      const customContext: TransformContext = {
        ...baseContext,
        trackingHosts: ['my-tracker.example'],
      }
      const value = '<img src="https://stats.wordpress.com/b.gif">'
      const result = await transform(value, customContext)

      expect(result).toContain('stats.wordpress.com')
    })

    it('should use the provided trackingHosts', async () => {
      const customContext: TransformContext = {
        ...baseContext,
        trackingHosts: ['my-tracker.example'],
      }
      const value = '<img src="https://my-tracker.example/p.gif">'
      const result = await transform(value, customContext)

      expect(result).not.toContain('my-tracker.example')
    })

    it('should ignore default trackingPathSegments when override is provided', async () => {
      const customContext: TransformContext = { ...baseContext, trackingPathSegments: ['ping'] }
      const value = '<img src="https://example.com/pixel.gif">'
      const result = await transform(value, customContext)

      expect(result).toContain('pixel.gif')
    })

    it('should use the provided trackingPathSegments', async () => {
      const customContext: TransformContext = { ...baseContext, trackingPathSegments: ['ping'] }
      const value = '<img src="https://example.com/ping.gif">'
      const result = await transform(value, customContext)

      expect(result).not.toContain('ping.gif')
    })

    it('should disable path-based detection when trackingPathSegments is empty', async () => {
      const customContext: TransformContext = { ...baseContext, trackingPathSegments: [] }
      const value = '<img src="https://example.com/pixel.gif">'
      const result = await transform(value, customContext)

      expect(result).toContain('pixel.gif')
    })

    it('should still apply size check when overrides are set', async () => {
      const customContext: TransformContext = {
        ...baseContext,
        trackingHosts: [],
        trackingPathSegments: [],
      }
      const value = '<img src="https://example.com/p.gif" width="1" height="1">'
      const result = await transform(value, customContext)

      expect(result).not.toContain('<img')
    })

    it('should still apply hidden-style check when overrides are set', async () => {
      const customContext: TransformContext = {
        ...baseContext,
        trackingHosts: [],
        trackingPathSegments: [],
      }
      const value = '<img src="https://example.com/p.gif" style="display:none">'
      const result = await transform(value, customContext)

      expect(result).not.toContain('<img')
    })

    it('should escape special regex characters in trackingPathSegments', async () => {
      const customContext: TransformContext = { ...baseContext, trackingPathSegments: ['p.x'] }
      const value = '<img src="https://example.com/pax.gif">'
      const result = await transform(value, customContext)

      expect(result).toContain('pax.gif')
    })
  })
})
