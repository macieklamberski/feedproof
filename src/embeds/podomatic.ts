import { getPathSegments, toMap } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const podomaticHost = 'podomatic.com'

const safeIdRegex = /^\d+$/

// The html5 player's three styles, each measured in Chrome at 1200, 500 and 320 pixels wide:
// the height is the same at every width, so this is a fixed height on a fluid width and never a
// ratio. Publishers agree on the default, 166 of 233 html5 frames state 208.
const defaultHtml5Height = 208
const html5Heights = toMap({
  normal: defaultHtml5Height,
  small: 97,
  square: 504,
})

// The current player, measured at 203 wide and 216 narrow because the episode title wraps. 205 is
// what Podomatic's own snippet writes on all 11 frames in the corpus, and it sits between the two.
const currentHeight = 205

// episode and podcast are the two kinds PodOmatic answers, and anything else under embed/html5
// answers 404.
const html5KindRegex = /^[a-z]+$/

type Player = { kind: string; id: string; src: string; height: number }

const readPlayer = (url: URL): Player | undefined => {
  const segments = getPathSegments(url)

  if (segments[0] !== 'embed') {
    return
  }

  // `embed/html5/{episode|podcast}/{id}`, with an optional `style` selecting one of three
  // player shapes. The style is kept because it is what chose the height.
  if (segments[1] === 'html5' && html5KindRegex.test(segments[2] ?? '')) {
    const style = url.searchParams.get('style') ?? ''
    const named = html5Heights.has(style) ? style : 'normal'
    const query = named === 'normal' ? '' : `?style=${named}`
    const kind = segments[2] as string
    const id = segments[3] ?? ''

    return {
      kind,
      id,
      src: `https://www.podomatic.com/embed/html5/${kind}/${id}${query}`,
      height: html5Heights.get(named) ?? defaultHtml5Height,
    }
  }

  // embed/v2/podcast/{podcast}?episode_id={episode}&theme={theme} is the snippet Podomatic hands
  // out today, and its episode_id is the id the html5 route takes in its path.
  if (segments[1] === 'v2' && segments[2] === 'podcast') {
    const podcast = segments[3] ?? ''

    // The podcast segment is written into the src whichever id travels, and ..%2F.. never folds.
    if (!safeIdRegex.test(podcast)) {
      return
    }

    const episode = url.searchParams.get('episode_id') ?? ''
    const theme = url.searchParams.get('theme')
    const named = safeIdRegex.test(episode) ? `?episode_id=${episode}` : ''
    // The theme comes back decoded, so unencoded it could smuggle a second parameter.
    const themed = theme && named ? `&theme=${encodeURIComponent(theme)}` : ''

    return {
      kind: named ? 'episode' : 'podcast',
      id: named ? episode : podcast,
      src: `https://www.podomatic.com/embed/v2/podcast/${podcast}${named}${themed}`,
      height: currentHeight,
    }
  }
}

export const podomaticResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, podomaticHost)
  const player = parsed && readPlayer(parsed)

  if (!player || !safeIdRegex.test(player.id)) {
    return
  }

  return {
    provider: 'podomatic',
    // Qualified by kind because the two id spaces share one grammar, and because the endpoint an
    // enricher would call differs: `embed/html5/episode/{id}` and `embed/html5/podcast/{id}` each
    // answer with the canonical page, the feed url and the title of what they hold.
    id: `${player.kind}/${player.id}`,
    src: player.src,
    height: player.height,
  }
}

// PodOmatic's html5 player iframe, pasted with a 504 by 208 box the fluid player never keeps.
export const podomaticEmbedResolver = createUrlEmbedResolver(
  [podomaticHost],
  podomaticResolveEmbed,
  { preferResolverSize: true },
)
