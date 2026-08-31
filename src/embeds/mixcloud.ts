import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// A show is `{user}/{slug}`. Mixcloud keeps whatever script the publisher titled it in, so the
// segments hold Japanese, Greek and accented Latin as well as ascii. What a segment may not
// hold is anything that would end the path early or climb out of it, because the show is also
// written into a url without escaping.
const unsafeSegmentRegex = /[/?#\\]|\s|^\.+$/

// Segments arrive percent-encoded, and both the check and the value need them decoded: the
// check because a separator arrives disguised as often as plain (`..%2Fetc` is one), and the
// value because the widget url encodes it again on the way out. A malformed escape decodes to
// nothing usable, so it is refused.
const decodeSegment = (segment: string): string | undefined => {
  try {
    return decodeURIComponent(segment)
  } catch {}
}

const mixcloudHosts = ['mixcloud.com']

// A user's listing pages sit where a show slug does, so `{user}/uploads` reads as a show and
// mints a player for a list. `playlists` names a collection rather than one show.
const sectionSlugs = new Set(['favorites', 'listens', 'playlists', 'stream', 'uploads'])

// First segments that are the site, not a user: `genres/{x}` is a listing served at exactly
// the show shape, `categories/{x}` and `tag/{x}` redirect into it, and the widget's own url is
// two segments, so a carrier missing its `feed` parameter would read as the user `widget`.
const siteSegments = new Set([
  'categories',
  'discover',
  'genres',
  'live',
  'media',
  'search',
  'tag',
  'upload',
  'widget',
])

// Exactly a user and a slug: a deeper path is a section of the site, not a show, and the value
// goes back into a url, so anything else is left to the generic placeholder.
const readShowPath = (segments: Array<string>): string | undefined => {
  const [user, slug] = segments.map(decodeSegment)

  if (segments.length !== 2 || !user || !slug) {
    return
  }

  if (unsafeSegmentRegex.test(user) || unsafeSegmentRegex.test(slug)) {
    return
  }

  if (siteSegments.has(user.toLowerCase()) || sectionSlugs.has(slug.toLowerCase())) {
    return
  }

  return `${user}/${slug}`
}

// An embed names the show in one `feed` parameter, which covers all three carrier forms: the
// widget iframe (`mixcloud.com/widget/iframe/?feed=`), the same widget on its own host
// (`player-widget.mixcloud.com/…`), and the legacy Flash player
// (`mixcloud.com/media/swf/player/mixcloudLoader.swf?feed=`). The value is a path in the newer
// embeds and a whole url in the older ones, which is why only its path is read.
//
// With no such parameter the path is the show itself: `mixcloud.com/{user}/{slug}/` is the page
// a person copies from the address bar, and it resolved to nothing while the widget spelling of
// the same show became a player.
export const extractMixcloudShow = (link: string): string | undefined => {
  const parsed = parseUrl(link)
  const feed = parsed?.searchParams.get('feed')
  const source = feed ? parseUrl(feed, 'https://example.com') : parsed

  return source ? readShowPath(getPathSegments(source)) : undefined
}

// No thumbnail: the artwork url is only available through Mixcloud's API, and nothing in the
// embed carries it.
//
// No height either. It is not a property of the show but of the embed's display options:
// `mini=1` is 60, `hide_cover=1` is 120 (sometimes 180) and the artwork player is 400 or 480,
// and iframes carry their own `height`, which the widget pass prefers over anything a resolver
// supplies.
//
// The `www` widget url is what publishers write and what Mixcloud documents. It 301s to
// `player-widget.mixcloud.com`, so it is kept instead of pre-resolved to a host that is one
// redirect away from changing.
export const mixcloudResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const show = extractMixcloudShow(url)

  if (!show) {
    return
  }

  return {
    provider: 'mixcloud',
    id: show,
    src: `https://www.mixcloud.com/widget/iframe/?feed=${encodeURIComponent(`/${show}/`)}`,
    url: `https://www.mixcloud.com/${show}/`,
  }
}

export const mixcloudEmbedResolver = createUrlEmbedResolver(mixcloudHosts, mixcloudResolveEmbed)
