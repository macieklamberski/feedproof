import { isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { EmbedResolver, EmbedResolverResult } from '../types.js'
import { attr, text } from '../utils/dom.js'
import { embedCarrierSelector, readCarrierUrl } from '../utils/widgets.js'

// SoundCloud's embed is an iframe whose `url=` query names the track as an
// `api.soundcloud.com/tracks/{id}` reference, which is not human-clickable, so the iframe
// alone yields a placeholder with no canonical url. The human-facing URLs live beside it:
// the platform's "Copy embed" snippet ships a sibling div with two anchors, the artist page
// and the track page ("Artist · Track"). When that sibling is present its links become the
// placeholder's author and canonical url, and the div is removed so the reader does not see
// the placeholder and the same links twice. Gutenberg embeds instead carry the title on the
// iframe itself ("Track by Artist").
const referenceRegex = /api\.soundcloud\.com\/(tracks|playlists|users)\/(\d+)/

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

export const soundcloudEmbedResolver: EmbedResolver = {
  // Any carrier, because the Flash player shipped the same `url=` reference on an `<embed>`
  // and an `<object>`: `player.soundcloud.com/player.swf?url=api.soundcloud.com/tracks/{id}`.
  // The host check below is what narrows it, so no player path is spelled in the selector.
  selector: embedCarrierSelector,
  extract: (element): EmbedResolverResult | undefined => {
    const src = readCarrierUrl(element)
    const parsed = parseUrl(src, 'https://example.com')

    if (
      !parsed ||
      (!isHostOf(parsed, 'soundcloud.com') && !isSubdomainOf(parsed, 'soundcloud.com'))
    ) {
      return
    }

    const reference = parsed.searchParams.get('url')?.match(referenceRegex)
    const result: EmbedResolverResult = { provider: 'soundcloud', src }

    if (reference) {
      result.id = `${reference[1]}/${reference[2]}`
    }

    // The visual player is one height whatever it holds, so it needs no reference to size it.
    const height =
      parsed.searchParams.get('visual') === 'true'
        ? visualPlayerHeight
        : classicPlayerHeights[reference?.[1] ?? '']

    if (height) {
      result.height = height
    }

    const title = attr(element, 'title')

    if (title) {
      result.title = title
    }

    const sibling = element.nextElementSibling
    const anchors = Array.from(sibling?.querySelectorAll('a[href*="soundcloud.com"]') ?? []).filter(
      (anchor) => !anchor.getAttribute('href')?.includes('api.soundcloud.com'),
    )

    // The snippet's shape is fixed: artist first, track second. Anything else is not the
    // share snippet, so the sibling stays untouched.
    if (anchors.length === 2) {
      result.author = text(anchors[0])
      result.title = text(anchors[1]) ?? result.title
      result.url = anchors[1].getAttribute('href') ?? undefined
      sibling?.remove()
    }

    return result
  },
}
