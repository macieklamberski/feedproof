import { getPathSegments, parseUrl, trimObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { decodeSegment, isFileName, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'mixcloud'

const unsafeSegmentRegex = /[/?#\\]|\s|^\.+$/

const mixcloudHosts = ['mixcloud.com']

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

export const extractMixcloudShow = (link: string): string | undefined => {
  const parsed = parseUrl(link)
  const feed = parsed?.searchParams.get('feed')
  const source = feed ? parseUrl(feed, placeholderBaseUrl) : parsed

  if (!source || isFileName(source.pathname)) {
    return
  }

  return readShowPath(getPathSegments(source))
}

const displayOptions = ['mini', 'hide_cover', 'hide_artwork', 'light']

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

  return {
    provider,
    id: show,
    src: `https://www.mixcloud.com/widget/iframe/?${query}`,
    url: `https://www.mixcloud.com/${show}/`,
    height:
      options.includes('mini') && options.includes('hide_cover') ? miniPlayerHeight : playerHeight,
    ...trimObject({ title }, Boolean),
  }
}

// Mixcloud's widget iframe, its Flash player and a bare mixcloud.com/{user}/{slug} show url.
export const mixcloudEmbedResolver = createUrlEmbedResolver(mixcloudHosts, mixcloudResolveEmbed, {
  preferResolverSize: true,
})

export const mixcloudRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoplay: '1' },
}
