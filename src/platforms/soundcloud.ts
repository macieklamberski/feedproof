import type { EmbedPlatformHandler } from '../types.js'

export const soundcloudEmbedHandler: EmbedPlatformHandler = {
  selector: 'iframe[src]',
  extract: (element) => {
    const src = element.getAttribute('src') ?? ''

    try {
      const { hostname } = new URL(src)

      if (hostname === 'w.soundcloud.com' || hostname.endsWith('.w.soundcloud.com')) {
        return { provider: 'soundcloud', src, autoload: true, type: 'iframe' }
      }
    } catch {}
  },
}
