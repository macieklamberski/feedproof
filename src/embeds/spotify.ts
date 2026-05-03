import { isHostOf, isSubdomainOf } from 'feedscout/utils'
import type { EmbedHandler } from '../types.js'

const spotifyHosts = ['open.spotify.com']

export const spotifyEmbedHandler: EmbedHandler = {
  selector: 'iframe[src]',
  extract: (element) => {
    const src = element.getAttribute('src') ?? ''

    if (isHostOf(src, spotifyHosts) || isSubdomainOf(src, spotifyHosts)) {
      return { provider: 'spotify', src, autoload: true, type: 'iframe' }
    }
  },
}
