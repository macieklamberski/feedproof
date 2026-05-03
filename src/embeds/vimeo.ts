import { isHostOf, isSubdomainOf } from 'feedscout/utils'
import type { EmbedHandler } from '../types.js'

const vimeoHosts = ['player.vimeo.com']

export const vimeoEmbedHandler: EmbedHandler = {
  selector: 'iframe[src]',
  extract: (element) => {
    const src = element.getAttribute('src') ?? ''

    if (isHostOf(src, vimeoHosts) || isSubdomainOf(src, vimeoHosts)) {
      return { provider: 'vimeo', src, autoload: true, type: 'iframe' }
    }
  },
}
