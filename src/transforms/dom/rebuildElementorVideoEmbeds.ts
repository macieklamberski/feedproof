import { toMap } from 'trousse'
import { readDailymotionEmbedSrc } from '../../embeds/dailymotion.js'
import { readVideopressEmbedSrc } from '../../embeds/videopress.js'
import { readVimeoEmbedSrc } from '../../embeds/vimeo.js'
import { readYoutubeEmbedSrc } from '../../embeds/youtube.js'
import type { DomTransform } from '../../types.js'
import { jsonAttr } from '../../utils/dom.js'
import { createIframe } from '../../utils/widgets.js'

const iframeSources = toMap({
  youtube: readYoutubeEmbedSrc,
  vimeo: readVimeoEmbedSrc,
  dailymotion: readDailymotionEmbedSrc,
  videopress: readVideopressEmbedSrc,
})

// Elementor's video widget ships an empty player div with the url only in a settings JSON.
// A self-hosted source ships server-side as a real <video>, so only the embed sources are read.
export const rebuildElementorVideoEmbeds: DomTransform = () => (document) => {
  for (const widget of document.querySelectorAll('.elementor-widget-video[data-settings]')) {
    // The attribute reads back as decoded JSON, since the parser unescapes the entities.
    const settings = jsonAttr<Record<string, unknown>>(widget, 'data-settings')

    if (!settings) {
      continue
    }

    const videoType = settings.video_type

    if (typeof videoType !== 'string' || !iframeSources.has(videoType)) {
      continue
    }

    // Elementor names the url after the source that owns it, `{video_type}_url`, and the type is
    // one of the four above by the time it is read.
    const link = settings[`${videoType}_url`]
    const source = typeof link === 'string' ? iframeSources.get(videoType)?.(link) : undefined

    if (!source) {
      continue
    }

    const iframe = createIframe(document, source)

    // Replace the empty `.elementor-video` player div if present. Otherwise fall back to
    // the widget container so the rebuilt player still lands in the right place.
    const target =
      widget.querySelector('.elementor-video') ??
      widget.querySelector('.elementor-widget-container')

    if (target) {
      target.replaceWith(iframe)
    } else {
      widget.appendChild(iframe)
    }

    // Left in place, the settings match again on a repeat run and stack a second iframe.
    widget.removeAttribute('data-settings')
  }
}
