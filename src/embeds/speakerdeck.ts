import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, parseRatio } from '../utils/dom.js'
import { placeholderBaseUrl } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const deckIdRegex = /^[0-9a-f]+$/

const slideSuffixRegex = /\?slide=(\d+)$/
const safeSlideRegex = /^\d+$/

const defaultDeckRatio = '16/9'

const readTitle = (element: Element): string | undefined => {
  const title = attr(element, 'title')

  // Speaker Deck's snippet writes the string "null" for a deck with no title.
  return title !== 'null' ? title : undefined
}

const composeEmbed = (
  deckId: string,
  { slide, title }: { slide?: string; title?: string },
): EmbedResolverResult => {
  const hasSlide = Boolean(slide && safeSlideRegex.test(slide))

  return {
    provider: 'speakerdeck',
    id: hasSlide ? `${deckId}/${slide}` : deckId,
    src: `https://speakerdeck.com/player/${deckId}${hasSlide ? `?slide=${slide}` : ''}`,
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
