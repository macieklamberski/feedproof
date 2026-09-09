import { composeEmbedUrl as composeVimeoUrl } from '../../embeds/vimeo.js'
import { composeEmbedUrl as composeYoutubeUrl, youtubeEmbedParams } from '../../embeds/youtube.js'
import type { DomTransform } from '../../types.js'
import { pickQueryParams } from '../../utils/urls.js'
import { createIframe } from '../../utils/widgets.js'

// `start` carries a whole-second offset. Guard it so only digits reach the URL and a
// crafted value can't inject extra query params.
const startSecondsPattern = /^\d+$/

type EmbedSource = {
  params: ReadonlyArray<string>
  compose: (id: string, params: Record<string, string>) => string
}

const embedSources: Record<string, EmbedSource> = {
  'lite-youtube': {
    params: youtubeEmbedParams,
    compose: (id, params) => composeYoutubeUrl(id, params),
  },
  // Vimeo's player takes the offset as a #t= fragment and reads nothing else.
  'lite-vimeo': {
    params: ['start'],
    compose: (id, params) => composeVimeoUrl(id, undefined, params.start),
  },
}

// lite-youtube and lite-vimeo are web components that only build their iframe with JS on click.
export const rebuildLiteVideoEmbeds: DomTransform = () => (document) => {
  for (const element of document.querySelectorAll('lite-youtube[videoid], lite-vimeo[videoid]')) {
    const source = embedSources[element.localName]
    const videoId = element.getAttribute('videoid')

    if (!source || !videoId) {
      continue
    }

    // The options arrive either as the dedicated `start` attribute or inside `params`, and a
    // component may state both. The attribute is the more specific of the two, so it wins.
    const params = pickQueryParams(element.getAttribute('params') ?? '', source.params)
    const start = element.getAttribute('start')

    if (start && startSecondsPattern.test(start)) {
      params.start = start
    }

    const iframe = createIframe(document, source.compose(videoId, params))

    const videoTitle = element.getAttribute('videotitle')
    if (videoTitle) {
      iframe.setAttribute('title', videoTitle)
    }

    element.replaceWith(iframe)
  }
}
