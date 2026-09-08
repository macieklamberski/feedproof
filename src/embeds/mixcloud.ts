import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'mixcloud'

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

// An account's own sections sit exactly where a show slug does, so `{user}/uploads` mints a
// player for a listing page, and the widget answers it with the same 10,589-byte empty shell it
// answers a fabricated slug with. Mixcloud reserves the words, so nothing about a section's shape
// separates it from a slug and the set is the whole discrimination. Enumerated 2026-09-07 by
// probing each against a fabricated slug on the same account.
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

// The widget's display options, in the order they are written back. Each is a flag the
// publisher set to `1`, and together they pick which player the widget draws, so they ride
// through into the minted url and the stated height describes that player.
const displayOptions = ['mini', 'hide_cover', 'hide_artwork', 'light']

// The player is fluid-width and fixed-height, measured 2026-09-04 at 330 and 660 wide on two
// shows: with the cover hidden the standard bar draws 160 whatever the frame allows, and
// `mini=1` beside it draws 60. With the cover left on the artwork fills any height the frame
// has, `mini` or not, and at 60 the logo lands on the title, so that form takes the bar's full
// height. The heights carriers state belong to earlier players, 180 to 208 on 44 of 46 sampled
// iframes, and Mixcloud's own oEmbed still answers 120, so the measured number stands over
// what a carrier states.
const miniPlayerHeight = 60
const playerHeight = 160

// No thumbnail: the artwork url is only available through Mixcloud's API, and nothing in the
// embed carries it.
//
// The `www` widget url is what publishers write and what Mixcloud documents. It 301s to
// `player-widget.mixcloud.com`, so it is kept instead of pre-resolved to a host that is one
// redirect away from changing.
export const mixcloudResolveEmbed = (url: string): EmbedResolverResult | undefined => {
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

  return {
    provider,
    id: show,
    src: `https://www.mixcloud.com/widget/iframe/?${query}`,
    url: `https://www.mixcloud.com/${show}/`,
    height:
      options.includes('mini') && options.includes('hide_cover') ? miniPlayerHeight : playerHeight,
  }
}

export const mixcloudEmbedResolver = createUrlEmbedResolver(mixcloudHosts, mixcloudResolveEmbed, {
  preferResolverSize: true,
})

// Starts playback on the click that loads the widget. The widget switches it off on a mobile
// user agent and hides the cover whenever it is on. The documented `www` url redirects to
// `player-widget.mixcloud.com`, and an iframe's `allow="autoplay"` covers only the origin in its
// `src`, so a reader has to grant autoplay to any origin (`autoplay *`) or the redirect loses it
// and the widget sits at 00:00.
export const mixcloudRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoplay: '1' },
}
