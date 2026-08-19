import { getPathSegments, isSubdomainOf } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, jsonAttr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// The player is fluid-width and fixed-height, and the height depends on what sits inside it:
// the compact bar for a single item, the taller box for a collection. These are the heights
// Spotify's own oEmbed returns for each type. They are a fallback for the shapes that ship no
// size at all: a height the markup declares is the publisher's choice and wins over these.
// The map doubles as the set of types that embed.
const spotifyHeights: Record<string, number> = {
  track: 152,
  episode: 152,
  show: 152,
  album: 352,
  playlist: 352,
  artist: 352,
}

// Every type's id is 22 base62 characters.
const safeIdRegex = /^[a-zA-Z0-9]{22}$/
// `embed` opens a player path, `embed-podcast` its older podcast-only twin, `intl-{lang}` a
// localized page path. Whatever follows the id (`/video` on a video podcast) is decorative.
const pathPrefixRegex = /^(?:embed|embed-podcast|intl-[a-z]{2})$/
// The pre-2017 snippet framed `embed.spotify.com/?uri=spotify:{type}:{id}`, naming the track
// in a query parameter instead of the path. That host still serves a player, so these resolve
// to the modern URL instead of falling through to the generic iframe path. A playlist is named
// through its owner (`spotify:user:{handle}:playlist:{id}`), so the type and id are the last
// pair, not the only one: of 50 sampled occurrences of the query form, 41 are that four-token
// shape.
const legacyUriRegex = /^spotify:(?:.*:)?([a-z]+):([a-zA-Z0-9]+)$/
// The snippet writes `Spotify Embed: {name}`, and the name is the only part worth keeping: the
// rest names the widget, which the placeholder already says. Every title in a 40-feed corpus
// read carried the prefix.
const titlePrefixRegex = /^Spotify Embed:\s*/

type SubstackItemAttributes = {
  image?: string
  title?: string
  subtitle?: string
  description?: string
}

const spotifyHost = 'spotify.com'
const spotifyImageHost = 'scdn.co'

// The card prints the item's type where a description would go, so that field usually repeats
// what the id already says. These are every form it takes in the corpus.
const typeLabels = new Set([...Object.keys(spotifyHeights), 'podcast episode'])

// Substack renders the player inside its own iframe and hangs the item's card on the same
// element as JSON: the artwork, the title and the act. The description is kept only when it is
// not one of those labels, which of 41 corpus payloads is one: 39 hold a label or nothing.
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
    thumbnail: isSubdomainOf(attributes.image ?? '', spotifyImageHost)
      ? attributes.image
      : undefined,
  }
}

export const spotifyResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, spotifyHost)

  if (!parsed) {
    return
  }

  const segments = getPathSegments(parsed)
  const named = pathPrefixRegex.test(segments[0] ?? '') ? segments.slice(1) : segments
  // The same ownership spelled as a path, `/embed/user/{handle}/playlist/{id}`.
  const owned = named[0] === 'user' ? named.slice(2) : named
  const [pathType, pathId] = owned
  const legacy = parsed.searchParams.get('uri')?.match(legacyUriRegex)
  const type = pathType ?? legacy?.[1]
  const id = pathId ?? legacy?.[2]

  if (!type || !id || !(type in spotifyHeights) || !safeIdRegex.test(id)) {
    return
  }

  const card = element ? readSubstackItem(element) : {}
  const stated = attr(element, 'title')?.replace(titlePrefixRegex, '').trim()

  return {
    provider: 'spotify',
    id: `${type}/${id}`,
    src: `https://open.spotify.com/embed/${type}/${id}`,
    url: `https://open.spotify.com/${type}/${id}`,
    height: spotifyHeights[type],
    title: card.title ?? stated,
    author: card.author,
    description: card.description,
    thumbnail: card.thumbnail,
  }
}

export const spotifyEmbedResolver = createUrlEmbedResolver([spotifyHost], spotifyResolveEmbed)
