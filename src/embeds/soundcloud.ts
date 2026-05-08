import { isHostOf, isSubdomainOf } from 'feedscout/utils'
import type { EmbedHandler } from '../types.js'

const soundcloudHosts = ['w.soundcloud.com']

export const soundcloudEmbedHandler: EmbedHandler = {
  selector: 'iframe[src]',
  extract: (element) => {
    const src = element.getAttribute('src') ?? ''

    if (isHostOf(src, soundcloudHosts) || isSubdomainOf(src, soundcloudHosts)) {
      return {
        provider: 'soundcloud',
        src,
        type: 'iframe',
      }
    }
  },
}
