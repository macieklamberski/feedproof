import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const megatvHosts = ['megatv.com']

const safeEmbedIdRegex = /^\d{6,12}$/

// The share dialog's embed id is the article's post id behind a `2020` prefix: 86 of the 91
// corpus embeds carry it, and every one probed plays the video of the post whose id follows
// the prefix. The five without it name posts under some other mapping, so no page is minted
// for those.
const prefixedPostIdRegex = /^2020(\d+)$/

// Mega TV's player is `megatv.com/embed/?p={id}`. Checked live 2026-09-06 with a browser user
// agent: the embed page answers 200 for any id and plays some other post's video for an unknown
// one, so it validates nothing, while `megatv.com/?p={post}` 301s to the article for a real
// post id and 404s for an invented one. The poster is a WordPress upload named after the
// article, not derivable from the id; the embed page carries it in `data-kwik_image` beside the
// title, with no key, so both stay with enrichment.
//
// The player is Video.js in fluid mode, measured 225 tall at 400 wide and 450 at 800, and the
// dialog boxes it at 560x315, which is what every corpus carrier states.
const megatvResolveEmbed = (link: string, element: Element): EmbedResolverResult | undefined => {
  const parsed = parseUrl(link, 'https://example.com')

  if (!parsed || getPathSegments(parsed).join('/') !== 'embed') {
    return
  }

  const id = parsed.searchParams.get('p')

  if (!id || !safeEmbedIdRegex.test(id)) {
    return
  }

  const post = id.match(prefixedPostIdRegex)?.[1]

  return {
    provider: 'megatv',
    id,
    src: `https://www.megatv.com/embed/?p=${id}`,
    url: post ? `https://www.megatv.com/?p=${post}` : undefined,
    title: attr(element, 'title'),
    ratio: '16/9',
  }
}

export const megatvEmbedResolver = createUrlEmbedResolver(megatvHosts, megatvResolveEmbed)
