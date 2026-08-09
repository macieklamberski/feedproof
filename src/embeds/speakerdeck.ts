import type { EmbedResolver, EmbedResolverResult } from '../types.js'
import { attr, parseRatioDimensions } from '../utils/dom.js'

// Every corpus id is 32 lowercase hex chars (a dashless UUID); anything else is dropped
// rather than interpolated into the player URL.
const deckIdRegex = /^[0-9a-f]{32}$/

// What a deck is when its own script does not say. Speaker Deck's snippet always carries the
// ratio, so this is for the feeds that strip the attribute, and 16:9 is what decks mostly are:
// of 11 sampled off Speaker Deck's own listings, 8 render 640x360 and the rest are 4:3 or
// wider (2026-08-09). Stated here rather than left to the consumer's default, so the
// placeholder describes the deck whatever a reader assumes about a size-less embed.
const defaultDeckRatio = '16/9'

// Speakerdeck ships a deck as a bare `<script class="speakerdeck-embed" data-id="{id}"
// src="//speakerdeck.com/assets/embed.js">` that builds the player iframe at runtime, so a
// reader shows nothing at all. The player page is mintable from the id alone (verified
// live, 200). The deck's public page needs the author and slug, which the script does not
// carry, so the placeholder has no `url`.
export const speakerdeckEmbedResolver: EmbedResolver = {
  selector: 'script.speakerdeck-embed[data-id]',
  extract: (element): EmbedResolverResult | undefined => {
    const deckId = attr(element, 'data-id')

    if (!deckId || !deckIdRegex.test(deckId)) {
      return
    }

    const result: EmbedResolverResult = {
      provider: 'speakerdeck',
      id: deckId,
      src: `https://speakerdeck.com/player/${deckId}`,
    }

    // The script carries the deck's aspect ratio as a bare decimal, e.g. `data-ratio="1.33"`.
    const dimensions =
      parseRatioDimensions(attr(element, 'data-ratio') ?? '') ??
      parseRatioDimensions(defaultDeckRatio)

    return { ...result, ...dimensions }
  },
}
