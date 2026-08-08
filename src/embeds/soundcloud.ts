import { isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { EmbedResolver, EmbedResolverResult } from '../types.js'
import { attr, text } from '../utils/dom.js'

// SoundCloud's embed is an iframe whose `url=` query names the track as an
// `api.soundcloud.com/tracks/{id}` reference, which is not human-clickable, so the iframe
// alone yields a placeholder with no canonical url. The human-facing URLs live beside it:
// the platform's "Copy embed" snippet ships a sibling div with two anchors, the artist page
// and the track page ("Artist · Track"). When that sibling is present its links become the
// placeholder's author and canonical url, and the div is removed so the reader does not see
// the placeholder and the same links twice. Gutenberg embeds instead carry the title on the
// iframe itself ("Track by Artist").
const referenceRegex = /api\.soundcloud\.com\/(tracks|playlists|users)\/(\d+)/

export const soundcloudEmbedResolver: EmbedResolver = {
  selector: 'iframe[src*="w.soundcloud.com/player"]',
  extract: (element): EmbedResolverResult | undefined => {
    const src = attr(element, 'src') ?? ''
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
