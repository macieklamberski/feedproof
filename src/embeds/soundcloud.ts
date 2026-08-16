import { parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, jsonAttr, text } from '../utils/dom.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// SoundCloud's embed is an iframe whose `url=` query names the track as an
// `api.soundcloud.com/tracks/{id}` reference. Some feeds name the id twice in it, as a bare
// number under the path and again as a `soundcloud:tracks:{id}` URN in place of it. The colons
// arrive percent-encoded because the whole reference is itself a query value, so both spellings
// are accepted here. Roughly one SoundCloud feed in ten carries the URN form and nothing else,
// which without the second spelling leaves every embed in it with no id at all.
const referenceRegex =
  /api\.soundcloud\.com\/(tracks|playlists|users)\/(?:soundcloud(?::|%3A)\w+(?::|%3A))?(\d+)/i

// The player is fluid-width and fixed-height. The classic one is a bar for a single track and
// a scrolling list for anything holding several, and `visual=true` swaps both for one big
// artwork box. These are the heights SoundCloud's own embed config carries per player, and
// they are a fallback for the iframes that ship no size: a height in the markup wins.
const visualPlayerHeight = 450
const classicPlayerHeights: Record<string, number | undefined> = {
  tracks: 166,
  playlists: 450,
  users: 450,
}

// Any carrier, because the Flash player shipped the same `url=` reference on an `<embed>` and an
// `<object>`: `player.soundcloud.com/player.swf?url=api.soundcloud.com/tracks/{id}`. The host
// check the factory applies is what narrows it, so no player path is spelled in a selector.
const soundcloudHosts = ['soundcloud.com']

// Substack renders a SoundCloud track as an iframe inside its own wrapper, and the wrapper
// carries the card as JSON: the track title, its description, the artwork and the artist. The
// `targetUrl` is the human-facing track page, which is the only place the Substack shape names
// it, since it ships none of the sibling anchors the platform's own snippet uses.
type SubstackTrackAttributes = {
  title?: string
  description?: string
  thumbnail_url?: string
  author_name?: string
  targetUrl?: string
}

const readSubstackTrack = (element: Element): Partial<EmbedResolverResult> => {
  const wrapper = element.closest('[data-component-name="SoundcloudToDOM"]')
  const attributes = jsonAttr<SubstackTrackAttributes>(wrapper, 'data-attrs')

  if (!attributes) {
    return {}
  }

  return {
    title: attributes.title || undefined,
    description: attributes.description || undefined,
    thumbnail: attributes.thumbnail_url || undefined,
    author: attributes.author_name || undefined,
    url: attributes.targetUrl || undefined,
  }
}

// The reference the iframe names the track by is not human-clickable, so the iframe alone yields
// a placeholder with no canonical url. The human-facing URLs live beside it: the platform's
// "Copy embed" snippet ships a sibling div with two anchors, the artist page and the track page
// ("Artist · Track"). When that sibling is present its links become the placeholder's author and
// canonical url, and the div is removed so the reader does not see the placeholder and the same
// links twice. Gutenberg embeds instead carry the title on the iframe itself ("Track by Artist").
export const soundcloudResolveEmbed = (
  src: string,
  element: Element,
): EmbedResolverResult | undefined => {
  // The factory has already matched the host, which means the url parsed, so there is no
  // unparseable case left to guard here.
  const params = parseUrl(src, 'https://example.com')?.searchParams
  const reference = params?.get('url')?.match(referenceRegex)
  const result: EmbedResolverResult = { provider: 'soundcloud', src }

  if (reference) {
    result.id = `${reference[1]}/${reference[2]}`
  }

  // The visual player is one height whatever it holds, so it needs no reference to size it.
  const height =
    params?.get('visual') === 'true'
      ? visualPlayerHeight
      : classicPlayerHeights[reference?.[1] ?? '']

  if (height) {
    result.height = height
  }

  const title = attr(element, 'title')

  if (title) {
    result.title = title
  }

  Object.assign(result, readSubstackTrack(element))

  const sibling = element.nextElementSibling
  const anchors = Array.from(sibling?.querySelectorAll('a[href*="soundcloud.com"]') ?? []).filter(
    (anchor) => !anchor.getAttribute('href')?.includes('api.soundcloud.com'),
  )

  // The snippet's shape is fixed: artist first, track second. Anything else is not the
  // share snippet, so the sibling stays untouched.
  if (anchors.length === 2) {
    result.author = text(anchors[0])
    result.title = text(anchors[1]) ?? result.title
    result.url = attr(anchors[1], 'href')
    sibling?.remove()
  }

  return result
}

export const soundcloudEmbedResolver = createUrlEmbedResolver(
  soundcloudHosts,
  soundcloudResolveEmbed,
)
