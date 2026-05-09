import { describe, expect, it } from 'bun:test'
import { transformHtml } from '../../common.js'
import { defaultTrackingHosts, defaultTrackingPathSegments } from '../../defaults.js'
import type { TransformContext } from '../../types.js'
import { removeTrackingPixels } from './removeTrackingPixels.js'

const context: TransformContext = {
  trackingHosts: defaultTrackingHosts,
  trackingPathSegments: defaultTrackingPathSegments,
}

describe('removeTrackingPixels', () => {
  describe('size-based detection', () => {
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

    it('should remove image when only width=1 is set', () => {
      const html = '<img src="icon.png" width="1">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('icon.png')
    })

    it('should remove image when only height=1 is set', () => {
      const html = '<img src="icon.png" height="1">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('icon.png')
    })

    it('should remove image when only width=0 is set', () => {
      const html = '<img src="icon.png" width="0">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('icon.png')
    })

    it('should not remove normal-sized images', () => {
      const html = '<img src="photo.jpg" width="800" height="600">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).toContain('src="photo.jpg"')
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
  })

  describe('inline-style detection', () => {
    it('should remove img with style width:1px;height:1px and no attrs', () => {
      const html = '<img src="track.gif" style="width:1px;height:1px">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('track.gif')
    })

    it('should remove img with only style width:1px', () => {
      const html = '<img src="bug.gif" style="width:1px">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('bug.gif')
    })

    it('should remove img with only style height:0', () => {
      const html = '<img src="zero.gif" style="height:0">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('zero.gif')
    })

    it('should remove img with spaces in style declaration', () => {
      const html = '<img src="spaced.gif" style="width: 1px ; height: 1px">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('spaced.gif')
    })

    it('should not remove img with style width:600px;height:400px', () => {
      const html = '<img src="hero.jpg" style="width:600px;height:400px">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).toContain('hero.jpg')
    })

    it('should not remove img with non-px width:50%', () => {
      const html = '<img src="responsive.jpg" style="width:50%">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).toContain('responsive.jpg')
    })

    it('should detect dimension from style when attribute is auto', () => {
      const html = '<img src="mixed.gif" width="auto" height="auto" style="width:1px;height:1px">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('mixed.gif')
    })
  })

  describe('hidden-style detection', () => {
    it('should remove img with hidden attribute', () => {
      const html = '<img src="ghost.gif" hidden>'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('ghost.gif')
    })

    it('should remove img with style display:none', () => {
      const html = '<img src="invis.gif" style="display:none">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('invis.gif')
    })

    it('should remove img with style visibility:hidden', () => {
      const html = '<img src="invis.gif" style="visibility:hidden">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('invis.gif')
    })

    it('should remove img with style opacity:0', () => {
      const html = '<img src="invis.gif" style="opacity:0">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('invis.gif')
    })

    it('should remove img with style opacity:0.0', () => {
      const html = '<img src="invis.gif" style="opacity:0.0">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('invis.gif')
    })

    it('should not remove img with style opacity:0.5', () => {
      const html = '<img src="faded.jpg" style="opacity:0.5">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).toContain('faded.jpg')
    })

    it('should not remove img with style display:block', () => {
      const html = '<img src="visible.jpg" style="display:block">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).toContain('visible.jpg')
    })

    it('should not remove img solely on aria-hidden=true', () => {
      const html = '<img src="decorative.jpg" aria-hidden="true">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).toContain('decorative.jpg')
    })
  })

  describe('host-based detection', () => {
    it('should remove images from feedsportal.com', () => {
      const html = '<img src="https://feedsportal.com/c/12345/abc.gif">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('feedsportal.com')
    })

    it('should remove images from feedsportal.com subdomains', () => {
      const html = '<img src="https://da.feedsportal.com/c/12345/abc.gif">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('feedsportal.com')
    })

    it('should remove images from stats.wordpress.com', () => {
      const html = '<img src="https://stats.wordpress.com/b.gif?v=noscript">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('stats.wordpress.com')
    })

    it('should remove images from pixel.wp.com', () => {
      const html = '<img src="https://pixel.wp.com/g.gif?v=ext&blog=12345">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('pixel.wp.com')
    })

    it('should remove images from doubleclick.net', () => {
      const html = '<img src="https://ad.doubleclick.net/ddm/trackimp/N123">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('doubleclick.net')
    })

    it('should remove images from google-analytics.com', () => {
      const html = '<img src="https://www.google-analytics.com/collect?v=1&tid=UA-1">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('google-analytics.com')
    })

    it('should remove images from list-manage.com (Mailchimp)', () => {
      const html = '<img src="https://example.list-manage.com/track/open.php?u=1&id=2">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('list-manage.com')
    })

    it('should remove images from feedburner.com', () => {
      const html = '<img src="https://feeds.feedburner.com/~ff/MyFeed?d=abc123">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('feedburner.com')
    })

    it('should remove images from mailerlite.com', () => {
      const html = '<img src="https://track.mailerlite.com/o/abc123">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('mailerlite.com')
    })

    it('should remove images from email.medium.com', () => {
      const html = '<img src="https://email.medium.com/o/eJw_/abc.gif">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('email.medium.com')
    })

    it('should remove images from stat-c.medium.com', () => {
      const html = '<img src="https://stat-c.medium.com/track?u=abc">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('stat-c.medium.com')
    })

    it('should not remove images from look-alike hosts', () => {
      const html = '<img src="https://notfeedsportal.com/photo.jpg">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).toContain('notfeedsportal.com')
    })
  })

  describe('path-based detection', () => {
    it('should remove images with /pixel. path', () => {
      const html = '<img src="https://example.com/pixel.gif?id=abc">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('pixel.gif')
    })

    it('should remove images with /pixel/ path', () => {
      const html = '<img src="https://example.com/pixel/abc.png">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('pixel/abc.png')
    })

    it('should remove images with /beacon path', () => {
      const html = '<img src="https://example.com/beacon.gif">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('beacon.gif')
    })

    it('should remove images with /count path', () => {
      const html = '<img src="https://example.com/count.gif">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('count.gif')
    })

    it('should detect tracking path in relative URLs', () => {
      const html = '<img src="/pixel.gif?campaign=newsletter">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('pixel.gif')
    })

    it('should not remove track-prefixed paths now that track segment is dropped', () => {
      const html = '<img src="https://example.com/track/the-song.jpg">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).toContain('track/the-song.jpg')
    })

    it('should not remove counter-like words that fail boundary check', () => {
      const html = '<img src="https://example.com/counterfeit.jpg">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).toContain('counterfeit.jpg')
    })

    it('should not remove unrelated path segments containing pixel substring', () => {
      const html = '<img src="https://example.com/pixelated-art-piece.jpg">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).toContain('pixelated-art-piece.jpg')
    })
  })

  describe('combined behavior', () => {
    it('should preserve non-tracking images', () => {
      const html = '<img src="https://example.com/photo.jpg" alt="Nice photo">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).toContain('src="https://example.com/photo.jpg"')
    })

    it('should remove pixel even when src is missing host signal', () => {
      const html = '<img src="https://cdn.example.com/img.jpg" width="1" height="1">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('cdn.example.com')
    })

    it('should remove tracker-host even when no width/height set', () => {
      const html = '<img src="https://stats.wordpress.com/b.gif">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).not.toContain('stats.wordpress.com')
    })

    it('should handle html with no images', () => {
      const html = '<p>No images</p>'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).toContain('<p>No images</p>')
    })

    it('should handle img with malformed src gracefully', () => {
      const html = '<img src="://broken">'
      const result = transformHtml(html, removeTrackingPixels(context))

      expect(result).toContain('://broken')
    })
  })

  describe('overrides', () => {
    it('should ignore default trackingHosts when override is provided', () => {
      const customContext: TransformContext = { trackingHosts: ['my-tracker.example'] }
      const html = '<img src="https://stats.wordpress.com/b.gif">'
      const result = transformHtml(html, removeTrackingPixels(customContext))

      expect(result).toContain('stats.wordpress.com')
    })

    it('should use the provided trackingHosts', () => {
      const customContext: TransformContext = { trackingHosts: ['my-tracker.example'] }
      const html = '<img src="https://my-tracker.example/p.gif">'
      const result = transformHtml(html, removeTrackingPixels(customContext))

      expect(result).not.toContain('my-tracker.example')
    })

    it('should ignore default trackingPathSegments when override is provided', () => {
      const customContext: TransformContext = { trackingPathSegments: ['ping'] }
      const html = '<img src="https://example.com/pixel.gif">'
      const result = transformHtml(html, removeTrackingPixels(customContext))

      expect(result).toContain('pixel.gif')
    })

    it('should use the provided trackingPathSegments', () => {
      const customContext: TransformContext = { trackingPathSegments: ['ping'] }
      const html = '<img src="https://example.com/ping.gif">'
      const result = transformHtml(html, removeTrackingPixels(customContext))

      expect(result).not.toContain('ping.gif')
    })

    it('should disable path-based detection when trackingPathSegments is empty', () => {
      const customContext: TransformContext = { trackingPathSegments: [] }
      const html = '<img src="https://example.com/pixel.gif">'
      const result = transformHtml(html, removeTrackingPixels(customContext))

      expect(result).toContain('pixel.gif')
    })

    it('should still apply size check when overrides are set', () => {
      const customContext: TransformContext = {
        trackingHosts: [],
        trackingPathSegments: [],
      }
      const html = '<img src="https://example.com/p.gif" width="1" height="1">'
      const result = transformHtml(html, removeTrackingPixels(customContext))

      expect(result).not.toContain('<img')
    })

    it('should still apply hidden-style check when overrides are set', () => {
      const customContext: TransformContext = {
        trackingHosts: [],
        trackingPathSegments: [],
      }
      const html = '<img src="https://example.com/p.gif" style="display:none">'
      const result = transformHtml(html, removeTrackingPixels(customContext))

      expect(result).not.toContain('<img')
    })

    it('should escape special regex characters in trackingPathSegments', () => {
      const customContext: TransformContext = { trackingPathSegments: ['p.x'] }
      const html = '<img src="https://example.com/pax.gif">'
      const result = transformHtml(html, removeTrackingPixels(customContext))

      expect(result).toContain('pax.gif')
    })
  })
})
