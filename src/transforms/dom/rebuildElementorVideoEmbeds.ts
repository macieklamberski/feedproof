import { toMap } from 'trousse'
import { readDailymotionEmbedSrc } from '../../embeds/dailymotion.js'
import { readVideopressEmbedSrc } from '../../embeds/videopress.js'
import { readVimeoEmbedSrc } from '../../embeds/vimeo.js'
import { readYoutubeEmbedSrc } from '../../embeds/youtube.js'
import type { DomTransform } from '../../types.js'
import { jsonAttr } from '../../utils/dom.js'
import { createIframe } from '../../utils/widgets.js'

// The Elementor video widget defers its player for the embed sources: the real url lives only in
// the widget's `data-settings` JSON and the `.elementor-video` div is left empty for JS to fill
// at runtime, so in a reader the video never appears. The self-hosted source is missing here
// because it is rendered server-side as a real `<video>` and already works.
const iframeSources = toMap({
  youtube: readYoutubeEmbedSrc,
  vimeo: readVimeoEmbedSrc,
  dailymotion: readDailymotionEmbedSrc,
  videopress: readVideopressEmbedSrc,
})

// Rebuilds a real <iframe> from an Elementor video widget that defers a YouTube, Vimeo,
// Dailymotion, or VideoPress embed, so the later convertWidgets turns it into a placeholder
// (YouTube and Dailymotion gain a thumbnail; Vimeo and VideoPress stay posterless). Malformed
// `data-settings` or an unrecoverable id skips the widget instead of throwing.
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

    // The settings are consumed so a repeat run doesn't match the rebuilt widget and
    // stack a second iframe next to the first.
    widget.removeAttribute('data-settings')
  }
}
