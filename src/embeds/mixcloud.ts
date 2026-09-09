import { getPathSegments, parseUrl, trimObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { decodeSegment, isFileName, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'mixcloud'

// A slug holds whatever script the publisher titled the show in, Japanese, Greek and accented Latin
// among them.
const unsafeSegmentRegex = /[/?#\\]|\s|^\.+$/

const mixcloudHosts = ['mixcloud.com']

// An account's sections sit where a show slug does, and the widget answers {user}/uploads with the
// same empty shell as a fabricated slug.
const sectionSlugs = new Set([
  'activity',
  'community',
  'dashboard',
  'favorites',
  'followers',
  'following',
  'listens',
  'playlists',
  'reposts',
  'select',
  'stream',
  'subscribe',
  'tracks',
  'uploads',
])

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
  // Decoded before the check, because a separator arrives disguised as often as it arrives
  // plain: `..%2Fetc` is one.
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

export const extractMixcloudShow = (link: string): string | undefined => {
  const parsed = parseUrl(link)
  // The feed parameter holds a path in the newer embeds and a whole url in the Flash
  // mixcloudLoader.swf one.
  const feed = parsed?.searchParams.get('feed')
  const source = feed ? parseUrl(feed, placeholderBaseUrl) : parsed

  // Mixcloud serves the show audio and the artwork from subdomains of mixcloud.com.
  // A file path has a show's two segments, so a claimed enclosure would lose its element.
  if (!source || isFileName(source.pathname)) {
    return
  }

  return readShowPath(getPathSegments(source))
}

// The widget's display options, in the order they are written back. Each is a flag the
// publisher set to `1`, and together they pick which player the widget draws, so they ride
// through into the minted url and the stated height describes that player.
const displayOptions = ['mini', 'hide_cover', 'hide_artwork', 'light']

// The player is fluid in width and fixed in height: the bar draws 160 whatever the frame allows,
// and mini=1 with the cover hidden 60.
const miniPlayerHeight = 60
const playerHeight = 160

export const mixcloudResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const show = extractMixcloudShow(url)

  if (!show) {
    return
  }

  const params = parseUrl(url)?.searchParams
  const options = displayOptions.filter((option) => params?.get(option) === '1')
  const query = new URLSearchParams({ feed: `/${show}/` })

  for (const option of options) {
    query.set(option, '1')
  }

  const title = attr(element, 'title')
  const [author] = show.split('/')

  return {
    provider,
    id: show,
    // The www url 301s to player-widget.mixcloud.com, a host one redirect away from changing.
    src: `https://www.mixcloud.com/widget/iframe/?${query}`,
    url: `https://www.mixcloud.com/${show}/`,
    // With the cover on, the artwork fills the frame, so only the coverless mini form is 60.
    author,
    height:
      options.includes('mini') && options.includes('hide_cover') ? miniPlayerHeight : playerHeight,
    ...trimObject({ title }, Boolean),
  }
}

// Mixcloud's widget iframe, its Flash player and a bare mixcloud.com/{user}/{slug} show url.
export const mixcloudEmbedResolver = createUrlEmbedResolver(mixcloudHosts, mixcloudResolveEmbed, {
  // Carriers state the heights of earlier players, so the measured one outranks them.
  preferResolverSize: true,
})

export const mixcloudRenderHint: EmbedRenderHint = {
  provider,
  // The widget switches autoplay off on a mobile user agent. The www url redirects, so an iframe
  // allow="autoplay" has to grant any origin or the widget sits at 00:00.
  autoplayParams: { autoplay: '1' },
}
