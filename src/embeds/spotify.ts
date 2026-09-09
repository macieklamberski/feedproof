import { getPathSegments, toMap } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, jsonAttr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// The player is fluid-width and fixed-height: a compact bar for a single item, a taller box for
// a collection.
// oEmbed answers 351 for a show's /video frame, and the plain frame minted here is the 152 card.
const spotifyHeights = toMap({
  track: 152,
  episode: 152,
  show: 152,
  album: 352,
  playlist: 352,
  artist: 352,
})

// Base62 with no separator, since the id is written into the player path and the `type/id`
// key. The length is not checked: a wrong id fails the same whether it is minted or passed
// through, and a bound would refuse the next id space.
const safeIdRegex = /^[a-zA-Z0-9]+$/
// `embed` opens a player path, `embed-podcast` its older podcast-only twin, `intl-{lang}` a
// localized page path. Whatever follows the id (`/video` on a video podcast) is decorative.
const pathPrefixRegex = /^(?:embed|embed-podcast|intl-[a-z]{2})$/
// spotify:{type}:{id}, or the owned playlist form spotify:user:{handle}:playlist:{id}.
// The pre-2017 snippet framed `embed.spotify.com/?uri=spotify:{type}:{id}`, and that host still
// serves a player.
const legacyUriRegex = /^spotify:(?:.*:)?([a-z]+):([a-zA-Z0-9]+)$/
// The snippet writes the title as `Spotify Embed: {name}`.
const titlePrefixRegex = /^Spotify Embed:\s*/
// Substack writes `By {owner}` where a playlist card's act goes, and Spotify names that same
// account bare on its own player.
const ownerPrefixRegex = /^By /

type SubstackItemAttributes = {
  image?: string
  title?: string
  subtitle?: string
  description?: string
}

const spotifyHosts = ['spotify.com']
const spotifyImageHosts = ['scdn.co']

// Substack writes its own word for the type where a description would go, and a show card
// says `Podcast`.
const typeLabels = new Set(['album', 'episode', 'playlist', 'podcast', 'podcast episode'])
// The act under the title is the publisher Spotify's own show page prints: the show's own, and
// for an episode the publisher of the show it ran in.
const publisherTypes = new Set(['show', 'episode'])

// Substack renders the player inside its own iframe and hangs the item's card on the same
// element as JSON.
const readSubstackItem = (element: Element, type: string): Partial<EmbedResolverResult> => {
  const attributes = jsonAttr<SubstackItemAttributes>(element, 'data-attrs')

  if (!attributes) {
    return {}
  }

  const description = attributes.description?.trim()
  const isPublisherType = publisherTypes.has(type)
  const act =
    type === 'playlist' ? attributes.subtitle?.replace(ownerPrefixRegex, '') : attributes.subtitle

  return {
    title: attributes.title,
    author: isPublisherType ? undefined : act,
    publisher: isPublisherType ? attributes.subtitle : undefined,
    description:
      description && !typeLabels.has(description.toLowerCase()) ? description : undefined,
    thumbnail: parseUrlOnHosts(attributes.image, spotifyImageHosts) ? attributes.image : undefined,
  }
}

// The path both the carrier and the `uri` parameter spell the same way: an optional route prefix,
// then the ownership form, then the type and id.
const readPathPair = (url: URL | undefined): [string, string] | undefined => {
  if (!url) {
    return
  }

  const segments = getPathSegments(url)
  const named = pathPrefixRegex.test(segments[0] ?? '') ? segments.slice(1) : segments
  // The same ownership spelled as a path, `/embed/user/{handle}/playlist/{id}`.
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

  // The `uri` parameter also carries an open.spotify.com url, in every spelling the carrier's own
  // path has: the `intl-{lang}` prefix, an `/embed/` prefix and the `user/{handle}/playlist/{id}`
  // ownership form.
  const uri = parsed.searchParams.get('uri') ?? undefined
  const legacy = uri?.match(legacyUriRegex)
  // The type and id are taken as a pair from whichever source names both, never one from each:
  // a path stating a type and no id would otherwise take its id from the parameter and mint one
  // resource's id under another's type.
  const pair =
    readPathPair(parsed) ??
    (legacy ? [legacy[1], legacy[2]] : readPathPair(parseUrlOnHosts(uri, spotifyHosts)))
  const [type, id] = pair ?? []

  if (!type || !id || !spotifyHeights.has(type) || !safeIdRegex.test(id)) {
    return
  }

  const card = element ? readSubstackItem(element, type) : {}
  const stated = attr(element, 'title')?.replace(titlePrefixRegex, '').trim()

  return {
    provider: 'spotify',
    id: `${type}/${id}`,
    src: `https://open.spotify.com/embed/${type}/${id}`,
    url: `https://open.spotify.com/${type}/${id}`,
    height: spotifyHeights.get(type),
    // Some payloads carry an empty title string, and ?? would let it shadow the stated one.
    title: card.title?.trim() || stated,
    author: card.author,
    publisher: card.publisher,
    description: card.description,
    thumbnail: card.thumbnail,
  }
}

export const spotifyEmbedResolver = createUrlEmbedResolver(spotifyHosts, spotifyResolveEmbed)
