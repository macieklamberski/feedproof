import { getPathSegments, toMap } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const podomaticHost = 'podomatic.com'

const safeIdRegex = /^\d+$/

const defaultHtml5Height = 208
const html5Heights = toMap({
  normal: defaultHtml5Height,
  small: 97,
  square: 504,
})

const currentHeight = 205

const html5KindRegex = /^[a-z]+$/

type Player = { kind: string; id: string; src: string; height: number }

const readPlayer = (url: URL): Player | undefined => {
  const segments = getPathSegments(url)

  if (segments[0] !== 'embed') {
    return
  }

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

  if (segments[1] === 'v2' && segments[2] === 'podcast') {
    const podcast = segments[3] ?? ''

    if (!safeIdRegex.test(podcast)) {
      return
    }

    const episode = url.searchParams.get('episode_id') ?? ''
    const theme = url.searchParams.get('theme')
    const named = safeIdRegex.test(episode) ? `?episode_id=${episode}` : ''
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
