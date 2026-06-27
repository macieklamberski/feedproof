import { isHostOf, isSubdomainOf } from 'feedscout/utils'
import type { EmbedResolver, EmbedResolverResult } from '../types.js'

const safeVideoIdRegex = /^\d+$/

const vimeoHosts = ['vimeo.com', 'player.vimeo.com']

export const extractVimeoId = (link: string): string | undefined => {
  try {
    const { pathname } = new URL(link)
    const segments = pathname.split('/').filter(Boolean)

    // player.vimeo.com/video/{id}; otherwise the first numeric segment, which covers
    // vimeo.com/{id}, /channels/{name}/{id}, and /groups/{name}/videos/{id}.
    const id =
      segments[0] === 'video'
        ? segments[1]
        : segments.find((segment) => safeVideoIdRegex.test(segment))

    if (id && safeVideoIdRegex.test(id)) {
      return id
    }
  } catch {}
}

export const vimeoResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const videoId = extractVimeoId(url)

  if (!videoId) {
    return
  }

  // Unlisted videos embed with a `?h={hash}` token; preserve it so the rebuilt embed
  // still loads (the player rejects those videos without it).
  let hash: string | null = null
  try {
    hash = new URL(url).searchParams.get('h')
  } catch {}

  return {
    provider: 'vimeo',
    id: videoId,
    src: `https://player.vimeo.com/video/${videoId}${hash ? `?h=${hash}` : ''}`,
    url: `https://vimeo.com/${videoId}`,
    // TODO: no thumbnail yet. Vimeo posters aren't derivable from the id (the URL
    // carries an opaque hash), so they need an oEmbed lookup
    // (https://vimeo.com/api/oembed.json?url=...) wired through enrichEmbedFn.
  }
}

export const vimeoEmbedResolver: EmbedResolver = {
  selector: 'iframe[src]',
  extract: (element) => {
    const src = element.getAttribute('src') ?? ''

    if (!isHostOf(src, vimeoHosts) && !isSubdomainOf(src, vimeoHosts)) {
      return
    }

    return vimeoResolveEmbed(src)
  },
}
