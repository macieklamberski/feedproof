import type { EmbedPlatformHandler } from '../types.js'

export const vimeoEmbedHandler: EmbedPlatformHandler = {
  selector: 'iframe[src]',
  extract: (element) => {
    const src = element.getAttribute('src') ?? ''

    try {
      const { hostname } = new URL(src)

      if (hostname === 'player.vimeo.com' || hostname.endsWith('.player.vimeo.com')) {
        return { provider: 'vimeo', src, autoload: true, type: 'iframe' }
      }
    } catch {}
  },
}
