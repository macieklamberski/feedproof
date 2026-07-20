import { getPathSegments, isHostOf, isSubdomainOf } from 'trousse'
import type { EmbedResolver, EmbedResolverResult } from '../types.js'
import { pickUrlParams } from '../utils/urls.js'

const safeVideoIdRegex = /^\d+$/

const vimeoHosts = ['vimeo.com', 'player.vimeo.com']

export const extractVimeoId = (link: string): string | undefined => {
  const segments = getPathSegments(link)

  // player.vimeo.com/video/{id}; otherwise the first numeric segment, which covers
  // vimeo.com/{id}, /channels/{name}/{id}, and /groups/{name}/videos/{id}.
  const id =
    segments[0] === 'video'
      ? segments[1]
      : segments.find((segment) => safeVideoIdRegex.test(segment))

  if (id && safeVideoIdRegex.test(id)) {
    return id
  }
}

// Unlisted videos embed with a `?h={hash}` token; the player rejects them without it. `t`
// is the start offset, in Vimeo's `{n}s` form.
const vimeoEmbedParams = ['h', 't']

export const vimeoResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const videoId = extractVimeoId(url)

  if (!videoId) {
    return
  }

  return {
    provider: 'vimeo',
    id: videoId,
    src: `https://player.vimeo.com/video/${videoId}${pickUrlParams(url, vimeoEmbedParams)}`,
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
