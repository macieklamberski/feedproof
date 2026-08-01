import { vimeoResolveEmbed } from '../../embeds/vimeo.js'
import { youtubeResolveEmbed } from '../../embeds/youtube.js'
import type { DomTransform } from '../../types.js'

// The "Lazy Load for Videos" WordPress plugin rewrites a YouTube/Vimeo embed into a
// `.preview-lazyload` facade: a container div wrapping an `<a>` that holds the watch URL
// (in `data-video-uri`, or the visible `href`) and only builds the real iframe with JS on
// click. A reader runs no JS, so the video never appears. Reusing the embed resolvers maps
// the recovered watch URL to the platform's embed URL — keeping that format in one place and
// preserving Vimeo's unlisted `?h=` hash that a hand-built URL would drop.
const resolveEmbedSource = [youtubeResolveEmbed, vimeoResolveEmbed]

// Rebuilds a plain <iframe> from a "Lazy Load for Videos" facade so the later
// convertWidgets turns it into a placeholder (YouTube gains a thumbnail; Vimeo
// stays posterless). Recovers the URL from `data-video-uri`, falling back to `href`, and
// carries `data-video-title` over as the iframe title.
export const rebuildLazyLoadForVideos: DomTransform = () => (document) => {
  for (const anchor of document.querySelectorAll('a.preview-lazyload')) {
    const url = anchor.getAttribute('data-video-uri') ?? anchor.getAttribute('href')

    if (!url) {
      continue
    }

    let source: string | undefined
    for (const resolveEmbed of resolveEmbedSource) {
      source = resolveEmbed(url)?.src
      if (source) {
        break
      }
    }

    if (!source) {
      continue
    }

    const facade = anchor.closest('.container-lazyload') ?? anchor
    const iframe = document.createElement('iframe')
    iframe.setAttribute('src', source)

    const videoTitle = anchor.getAttribute('data-video-title')
    if (videoTitle) {
      iframe.setAttribute('title', videoTitle)
    }

    facade.replaceWith(iframe)
  }
}
