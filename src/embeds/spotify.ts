import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, jsonAttr } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// The player is fluid-width and fixed-height, and the height depends on what sits inside it:
// the compact bar for a single item, the taller box for a collection. They are a fallback for the
// shapes that ship no size at all: a height the markup declares is the publisher's choice and wins
// over these. The map doubles as the set of types that embed.
//
// These are the heights of the plain `/embed/{type}/{id}` frame, which is the only frame this
// resolver mints. Spotify's oEmbed sizes the variant rather than the type, so asking it about a
// video podcast answers 624x351 for a `/video` frame it appends itself, while the same show's
// plain frame is the 152 audio card. Sampling shows through oEmbed therefore reads as a per-type
// difference that does not exist: ten of twelve real shows answer 152, and the two that do not
// are video podcasts answering about a different url.
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
// The same parameter also carries an ordinary open.spotify.com url rather than a `spotify:` uri.
// Its type and id sit in the path, and every spelling the carrier's own path has, the parameter
// has too: the `intl-{lang}` prefix, an `/embed/` prefix and the `user/{handle}/playlist/{id}`
// ownership form. So it is read by the same path reader rather than a second pattern that would
// support a narrower set of urls than the carrier one line above it.
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
    thumbnail: parseUrlOnHosts(attributes.image, spotifyImageHost) ? attributes.image : undefined,
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

export const spotifyResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, spotifyHost)

  if (!parsed) {
    return
  }

  const uri = parsed.searchParams.get('uri') ?? undefined
  const legacy = uri?.match(legacyUriRegex)
  // The type and id are taken as a pair from whichever source names both, never one from each:
  // a path stating a type and no id would otherwise take its id from the parameter and mint one
  // resource's id under another's type.
  const pair =
    readPathPair(parsed) ??
    (legacy ? [legacy[1], legacy[2]] : readPathPair(parseUrlOnHosts(uri, spotifyHost)))
  const [type, id] = pair ?? []

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
    // Some payloads carry the title key with an empty string, so a blank card title falls
    // through to the stated one instead of shadowing it.
    title: card.title?.trim() || stated,
    author: card.author,
    description: card.description,
    thumbnail: card.thumbnail,
  }
}

export const spotifyEmbedResolver = createUrlEmbedResolver([spotifyHost], spotifyResolveEmbed)
