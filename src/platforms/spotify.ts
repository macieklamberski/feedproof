import type { EmbedPlatformHandler } from '../types.js'

export const spotifyEmbedHandler: EmbedPlatformHandler = {
  selector: 'iframe[src]',
  extract: (element) => {
    const src = element.getAttribute('src') ?? ''

    try {
      const { hostname } = new URL(src)

      if (hostname === 'open.spotify.com' || hostname.endsWith('.open.spotify.com')) {
        return { provider: 'spotify', src, autoload: true, type: 'iframe' }
      }
    } catch {}
  },
}
