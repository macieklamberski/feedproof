import { extractDailymotionId } from '../../embeds/dailymotion.js'
import { extractVimeoId } from '../../embeds/vimeo.js'
import { composeEmbedUrl, extractVideoId } from '../../embeds/youtube.js'
import type { DomTransform } from '../../types.js'
import { jsonAttr } from '../../utils/dom.js'

// The Elementor video widget defers its player for the embed sources (YouTube, Vimeo,
// Dailymotion, VideoPress): the real URL lives only in the widget's `data-settings` JSON and
// the `.elementor-video` div is left empty for JS to fill at runtime. A reader runs no JS, so
// the video never appears. Each entry takes the parsed settings and returns the URL the
// matching platform's iframe player loads. The self-hosted source is the exception — it is
// rendered server-side as a real `<video>`, so it already works in a reader and is skipped.
const iframeSources: Record<string, (settings: Record<string, unknown>) => string | undefined> = {
  youtube: (settings) => {
    const url = settings.youtube_url
    const videoId = typeof url === 'string' ? extractVideoId(url) : undefined

    return videoId ? composeEmbedUrl(videoId) : undefined
  },
  vimeo: (settings) => {
    const url = settings.vimeo_url
    const videoId = typeof url === 'string' ? extractVimeoId(url) : undefined

    return videoId ? `https://player.vimeo.com/video/${videoId}` : undefined
  },
  dailymotion: (settings) => {
    const url = settings.dailymotion_url
    const videoId = typeof url === 'string' ? extractDailymotionId(url) : undefined

    return videoId ? `https://www.dailymotion.com/embed/video/${videoId}` : undefined
  },
  videopress: (settings) => {
    // The insert-URL mode (videopress.com/v/{guid}) is the embeddable iframe src as-is, so
    // it is used directly and stays a posterless raw iframe (there is no VideoPress
    // resolver). The media-library mode resolves server-side and isn't in data-settings.
    const url = settings.videopress_url

    return typeof url === 'string' && url ? url : undefined
  },
}

// Rebuilds a real <iframe> from an Elementor video widget that defers a YouTube, Vimeo,
// Dailymotion, or VideoPress embed, so the later replaceEmbedsWithPlaceholders turns it into
// a placeholder (YouTube and Dailymotion gain a thumbnail; Vimeo and VideoPress stay
// posterless). Malformed
// `data-settings` or an unrecoverable id skips the widget rather than throwing.
export const rebuildElementorVideoEmbeds: DomTransform = () => (document) => {
  for (const widget of document.querySelectorAll('.elementor-widget-video[data-settings]')) {
    // The attribute reads back as decoded JSON, since the parser unescapes the entities.
    const settings = jsonAttr<Record<string, unknown>>(widget, 'data-settings')

    if (!settings) {
      continue
    }

    const videoType = settings.video_type

    if (typeof videoType !== 'string') {
      continue
    }

    const source = iframeSources[videoType]?.(settings)

    if (!source) {
      continue
    }

    const iframe = document.createElement('iframe')
    iframe.setAttribute('src', source)

    // Replace the empty `.elementor-video` player div if present; otherwise fall back to
    // the widget container so the rebuilt player still lands in the right place.
    const target =
      widget.querySelector('.elementor-video') ??
      widget.querySelector('.elementor-widget-container')

    if (target) {
      target.replaceWith(iframe)
    } else {
      widget.appendChild(iframe)
    }
  }
}
