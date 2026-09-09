import { getPathSegments, toMap } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, jsonAttr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const spotifyHeights = toMap({
  track: 152,
  episode: 152,
  show: 152,
  album: 352,
  playlist: 352,
  artist: 352,
})

const safeIdRegex = /^[a-zA-Z0-9]+$/
const pathPrefixRegex = /^(?:embed|embed-podcast|intl-[a-z]{2})$/
// spotify:{type}:{id}, or the owned playlist form spotify:user:{handle}:playlist:{id}.
const legacyUriRegex = /^spotify:(?:.*:)?([a-z]+):([a-zA-Z0-9]+)$/
const titlePrefixRegex = /^Spotify Embed:\s*/

type SubstackItemAttributes = {
  image?: string
  title?: string
  subtitle?: string
  description?: string
}

const spotifyHosts = ['spotify.com']
const spotifyImageHosts = ['scdn.co']

const typeLabels = new Set([...spotifyHeights.keys(), 'podcast episode'])

const readSubstackItem = (element: Element): Partial<EmbedResolverResult> => {
  const attributes = jsonAttr<SubstackItemAttributes>(element, 'data-attrs')

  if (!attributes) {
    return {}
  }

  const description = attributes.description?.trim()

  return {
    title: attributes.title,
    author: attributes.subtitle,
    description:
      description && !typeLabels.has(description.toLowerCase()) ? description : undefined,
    thumbnail: parseUrlOnHosts(attributes.image, spotifyImageHosts) ? attributes.image : undefined,
  }
}

const readPathPair = (url: URL | undefined): [string, string] | undefined => {
  if (!url) {
    return
  }

  const segments = getPathSegments(url)
  const named = pathPrefixRegex.test(segments[0] ?? '') ? segments.slice(1) : segments
  const owned = named[0] === 'user' ? named.slice(2) : named

  return owned[0] && owned[1] ? [owned[0], owned[1]] : undefined
}

// Spotify's player iframe, in the modern path form and the pre-2017 embed.spotify.com/?uri= form.
export const spotifyResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, spotifyHosts)

  if (!parsed) {
    return
  }

  const uri = parsed.searchParams.get('uri') ?? undefined
  const legacy = uri?.match(legacyUriRegex)
  const pair =
    readPathPair(parsed) ??
    (legacy ? [legacy[1], legacy[2]] : readPathPair(parseUrlOnHosts(uri, spotifyHosts)))
  const [type, id] = pair ?? []

  if (!type || !id || !spotifyHeights.has(type) || !safeIdRegex.test(id)) {
    return
  }

  const card = element ? readSubstackItem(element) : {}
  const stated = attr(element, 'title')?.replace(titlePrefixRegex, '').trim()

  return {
    provider: 'spotify',
    id: `${type}/${id}`,
    src: `https://open.spotify.com/embed/${type}/${id}`,
    url: `https://open.spotify.com/${type}/${id}`,
    height: spotifyHeights.get(type),
    title: card.title?.trim() || stated,
    author: card.author,
    description: card.description,
    thumbnail: card.thumbnail,
  }
}

export const spotifyEmbedResolver = createUrlEmbedResolver(spotifyHosts, spotifyResolveEmbed)
