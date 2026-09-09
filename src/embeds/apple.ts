import { getPathSegments, toMap } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { jsonAttr, keepIfMatches } from '../utils/dom.js'
import { isOnHosts, parseUrlOnHosts, pickUrlParams } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const appleHosts = ['music.apple.com', 'podcasts.apple.com']
const applePodcastsHosts = ['podcasts.apple.com']

const storefrontRegex = /^[a-z]{2}$/
// A numeric music id, a two-letter prefixed playlist or station id, or an `id`-prefixed podcast id.
const safeIdRegex = /^(?:id\d+|\d+|[a-z]{2}\.[a-z0-9-]+)$/i
const podcastIdPrefixRegex = /^id/

const trackIdRegex = /^\d+$/

const appleHeights = toMap({
  album: 450,
  artist: 450,
  playlist: 450,
  podcast: 450,
  station: 450,
  song: 175,
  'music-video': undefined,
})

export const appleResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, appleHosts)

  if (!parsed) {
    return
  }

  const segments = getPathSegments(parsed)
  const [kind, ...rest] = storefrontRegex.test(segments[0] ?? '') ? segments.slice(1) : segments
  const pathId = rest[rest.length - 1]

  if (!kind || !pathId || !appleHeights.has(kind) || !safeIdRegex.test(pathId)) {
    return
  }

  const isPodcast = isOnHosts(parsed, applePodcastsHosts)
  const host = isPodcast ? 'podcasts.apple.com' : 'music.apple.com'
  const trackId = keepIfMatches(parsed.searchParams.get('i'), trackIdRegex)
  const id = trackId ?? pathId.replace(podcastIdPrefixRegex, '')
  const query = trackId ? pickUrlParams(url, ['i']) : ''

  return {
    provider: isPodcast ? 'applepodcasts' : 'applemusic',
    id: `${kind}/${id}`,
    src: `https://embed.${host}${parsed.pathname}${query}`,
    url: `https://${host}${parsed.pathname}${query}`,
    height: appleHeights.get(trackId ? 'song' : kind),
  }
}

type SubstackPodcastAttributes = {
  isEpisode?: boolean
  imageUrl?: string
  title?: string
  podcastTitle?: string
  podcastByline?: string
  duration?: number
  releaseDate?: string
}

// An episode's `duration` is milliseconds and a show's is seconds.
const readDuration = (attributes: SubstackPodcastAttributes): number | undefined => {
  if (!attributes.duration) {
    return
  }

  return attributes.isEpisode ? Math.round(attributes.duration / 1000) : attributes.duration
}

const readSubstackPodcast = (element: Element): Partial<EmbedResolverResult> => {
  if (!element.closest('[data-component-name="ApplePodcastToDom"]')) {
    return {}
  }

  const attributes = jsonAttr<SubstackPodcastAttributes>(element, 'data-attrs')

  if (!attributes) {
    return {}
  }

  return {
    title: attributes.title || undefined,
    publisher: attributes.podcastTitle || undefined,
    author: attributes.podcastByline || undefined,
    thumbnail: attributes.imageUrl || undefined,
    date: attributes.releaseDate || undefined,
    duration: readDuration(attributes),
  }
}

// Apple's music and podcast player iframe. Substack wraps it in a card carrying JSON metadata.
export const appleEmbedResolver = createUrlEmbedResolver(appleHosts, (url, element) => {
  const result = appleResolveEmbed(url)

  return result && { ...result, ...readSubstackPodcast(element) }
})
