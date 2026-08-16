import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// A show is `{user}/{slug}`. Mixcloud keeps whatever script the publisher titled it in, so the
// segments hold Japanese, Greek and accented Latin about as often as ascii: 57 of 2,243 carriers
// in a 200-feed corpus read, spread across 24 accounts. What a segment may not hold is anything
// that would end the path early or climb out of it, because the show is also written into a url
// without escaping.
const unsafeSegmentRegex = /[/?#\\]|\s|^\.+$/

// Segments arrive percent-encoded, and both the check and the value need them decoded: the
// check because a separator arrives disguised as often as plain (`..%2Fetc` is one), and the
// value because the widget url encodes it again on the way out. A malformed escape decodes to
// nothing usable, so it is refused rather than guessed at.
const decodeSegment = (segment: string): string | undefined => {
  try {
    return decodeURIComponent(segment)
  } catch {}
}

const mixcloudHosts = ['mixcloud.com']

// Every Mixcloud carrier names the show in one `feed` parameter, so one read covers all three
// forms found in the corpus: the widget iframe (`mixcloud.com/widget/iframe/?feed=`), the same
// widget on its own host (`player-widget.mixcloud.com/…`), and the legacy Flash player
// (`mixcloud.com/media/swf/player/mixcloudLoader.swf?feed=`). The value is a path in the newer
// embeds and a whole url in the older ones, which is why only its path is read.
export const extractMixcloudShow = (link: string): string | undefined => {
  const feed = parseUrl(link)?.searchParams.get('feed')

  if (!feed) {
    return
  }

  const segments = getPathSegments(feed.startsWith('http') ? feed : `https://example.com${feed}`)

  // Exactly a user and a slug: a deeper path is a section of the site rather than a show, and
  // the value goes into a url, so anything else is left to the generic placeholder.
  const decoded = segments.map(decodeSegment)

  if (
    decoded.length !== 2 ||
    decoded.some((segment) => !segment || unsafeSegmentRegex.test(segment))
  ) {
    return
  }

  return `${decoded[0]}/${decoded[1]}`
}

// No thumbnail: the artwork url is only available through Mixcloud's API, and nothing in the
// embed carries it.
//
// No height either. It is not a property of the show but of the embed's display options:
// sampled from the corpus, `mini=1` is 60, `hide_cover=1` is 120 (sometimes 180) and the
// artwork player is 400 or 480, and every sampled iframe carries its own `height`, which the
// widget pass prefers over anything a resolver supplies.
//
// The `www` widget url is what publishers write and what Mixcloud documents; it 301s to
// `player-widget.mixcloud.com`, so it is kept rather than pre-resolved to a host that is one
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
