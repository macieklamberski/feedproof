import { getPathSegments } from 'trousse'
import type { EmbedResolver, EmbedResolverResult } from '../types.js'
import { attr, parseRatioDimensions } from '../utils/dom.js'
import { createIframeEmbedResolver } from '../utils/widgets.js'

// Ids are lowercase hex, in two lengths. 32 chars is the current dashless UUID; 24 is the
// legacy Mongo ObjectId Speaker Deck issued around 2011-2012, and those decks still play —
// every sampled one returns 200 on the player url. An earlier version of this comment claimed
// the corpus held only the 32-char form, which cost 36 feeds, 25 of them resolving to nothing
// (measured 2026-08-11).
const deckIdRegex = /^[0-9a-f]{24}(?:[0-9a-f]{8})?$/

// A few feeds put the slide inside the id attribute rather than beside it.
const slideSuffixRegex = /\?slide=(\d+)$/
const safeSlideRegex = /^\d+$/

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
export const speakerdeckScriptEmbedResolver: EmbedResolver = {
  selector: 'script.speakerdeck-embed[data-id]',
  extract: (element): EmbedResolverResult | undefined => {
    const raw = attr(element, 'data-id') ?? ''
    const inlineSlide = raw.match(slideSuffixRegex)?.[1]
    const deckId = raw.replace(slideSuffixRegex, '')

    if (!deckId || !deckIdRegex.test(deckId)) {
      return
    }

    // One feed can embed the same deck at several slides. Without the slide those collapse
    // into identical placeholders, and the player url honours `?slide=`.
    const slide = inlineSlide ?? attr(element, 'data-slide')
    const hasSlide = Boolean(slide && safeSlideRegex.test(slide))

    const result: EmbedResolverResult = {
      provider: 'speakerdeck',
      id: hasSlide ? `${deckId}/${slide}` : deckId,
      src: `https://speakerdeck.com/player/${deckId}${hasSlide ? `?slide=${slide}` : ''}`,
    }

    // The script carries the deck's aspect ratio as a bare decimal, e.g. `data-ratio="1.33"`.
    const dimensions =
      parseRatioDimensions(attr(element, 'data-ratio') ?? '') ??
      parseRatioDimensions(defaultDeckRatio)

    return { ...result, ...dimensions }
  },
}

// The player the script above builds at runtime, saved into the feed by a CMS that ran the
// script first. Same deck, same placeholder: only the carrier differs. A size on the element
// wins over the default ratio, so the fallback only applies to a size-less embed.
export const speakerdeckResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const segments = getPathSegments(url)
  const deckId = segments[0] === 'player' ? segments[1] : undefined

  if (!deckId || !deckIdRegex.test(deckId)) {
    return
  }

  return {
    provider: 'speakerdeck',
    id: deckId,
    src: `https://speakerdeck.com/player/${deckId}`,
    ...parseRatioDimensions(defaultDeckRatio),
  }
}

export const speakerdeckIframeEmbedResolver = createIframeEmbedResolver(
  ['speakerdeck.com'],
  speakerdeckResolveEmbed,
)
