import type { EmbedResolver, EmbedResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'

// Brightcove's in-page embed is a bare `<video-js>` custom element that the loader script
// turns into a player, so a reader shows nothing at all: the element is empty and survives
// as an unknown tag. The player page is mintable from its attributes. The account id is
// usually on the element, but some plugins leave it only in the loader script's URL
// (`players.brightcove.net/{account}/…`), so that is the fallback. Brightcove has no public
// watch page, so the placeholder carries no `url` and anchors to the player src.
const accountScriptRegex = /players\.brightcove\.net\/(\d+)\//

export const brightcoveEmbedResolver: EmbedResolver = {
  selector: 'video-js[data-video-id]',
  extract: (element): EmbedResolverResult | undefined => {
    const videoId = attr(element, 'data-video-id')

    if (!videoId) {
      return
    }

    const loader = element.ownerDocument.querySelector('script[src*="players.brightcove.net"]')
    const account =
      attr(element, 'data-account') ?? attr(loader, 'src')?.match(accountScriptRegex)?.[1]

    if (!account) {
      return
    }

    const player = attr(element, 'data-player') ?? 'default'
    const embed = attr(element, 'data-embed') ?? 'default'

    return {
      provider: 'brightcove',
      id: videoId,
      src: `https://players.brightcove.net/${account}/${player}_${embed}/index.html?videoId=${videoId}`,
    }
  },
}
