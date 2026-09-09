import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, parseRatio } from '../utils/dom.js'
import { composeQuery, placeholderBaseUrl } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

// Ids are lowercase hex in two lengths: 32 for the current dashless UUID and 24 for the Mongo
// ObjectId issued around 2011-2012, and those decks still play. `/player/` serves decks and
// nothing else.
const deckIdRegex = /^[0-9a-f]+$/

// A few feeds fold the slide number into the id attribute itself.
const slideSuffixRegex = /\?slide=(\d+)$/
const safeSlideRegex = /^\d+$/

// Speaker Deck's snippet always carries the ratio, and 16:9 is what decks mostly are.
const defaultDeckRatio = '16/9'

// The deck's title, which the player url does not carry. Speaker Deck's snippet writes the
// four-character string `null` when the deck has no title, so that spelling is treated as
// absent.
const readTitle = (element: Element): string | undefined => {
  const title = attr(element, 'title')

  // Speaker Deck's snippet writes the string "null" for a deck with no title.
  return title !== 'null' ? title : undefined
}

// One feed can embed the same deck at several slides. Without the slide those collapse into
// identical placeholders, and the player url honours `?slide=`.
// The public page needs the author and slug, which neither carrier names, so there is no `url`.
const composeEmbed = (
  deckId: string,
  { slide, title }: { slide?: string; title?: string },
): EmbedResolverResult => {
  const safeSlide = slide && safeSlideRegex.test(slide) ? slide : undefined
  const query = composeQuery(safeSlide ? { slide: safeSlide } : undefined)

  return {
    provider: 'speakerdeck',
    id: safeSlide ? `${deckId}/${safeSlide}` : deckId,
    src: `https://speakerdeck.com/player/${deckId}${query}`,
    title,
  }
}

// Speaker Deck ships a deck as a bare <script data-id> whose embed.js builds the player at runtime.
export const speakerdeckScriptEmbedResolver = createMarkupEmbedResolver(
  'script.speakerdeck-embed[data-id]',
  (element) => {
    const raw = attr(element, 'data-id') ?? ''
    const inlineSlide = raw.match(slideSuffixRegex)?.[1]
    const deckId = raw.replace(slideSuffixRegex, '')

    if (!deckId || !deckIdRegex.test(deckId)) {
      return
    }

    const slide = inlineSlide ?? attr(element, 'data-slide') ?? undefined
    const result = composeEmbed(deckId, { slide })

    // The script carries the deck's aspect ratio as a bare decimal, e.g. `data-ratio="1.33"`.
    const ratio = parseRatio(attr(element, 'data-ratio') ?? '') ?? defaultDeckRatio

    return { ...result, ratio }
  },
)

// The player iframe that script builds, saved into the feed by a CMS that ran the script first.
export const speakerdeckResolveEmbed = (
  url: string,
  element?: Element,
): EmbedResolverResult | undefined => {
  const segments = getPathSegments(url)
  const deckId = segments[0] === 'player' ? segments[1] : undefined

  if (!deckId || !deckIdRegex.test(deckId)) {
    return
  }

  const slide = parseUrl(url, placeholderBaseUrl)?.searchParams.get('slide') ?? undefined

  return {
    ...composeEmbed(deckId, { slide, title: element ? readTitle(element) : undefined }),
    ratio: defaultDeckRatio,
  }
}

export const speakerdeckIframeEmbedResolver = createUrlEmbedResolver(
  ['speakerdeck.com'],
  speakerdeckResolveEmbed,
)
