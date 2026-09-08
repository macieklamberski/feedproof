import {
  composeEmbedUrl as composeDailymotionUrl,
  extractDailymotionId,
} from '../../embeds/dailymotion.js'
import { readVideopressEmbedSrc } from '../../embeds/videopress.js'
import { composeEmbedUrl as composeVimeoUrl, extractVimeoId } from '../../embeds/vimeo.js'
import { composeEmbedUrl as composeYoutubeUrl, extractVideoId } from '../../embeds/youtube.js'
import type { DomTransform } from '../../types.js'
import { jsonAttr } from '../../utils/dom.js'
import { createIframe } from '../../utils/widgets.js'

// The Elementor video widget defers its player for the embed sources (YouTube, Vimeo,
// Dailymotion, VideoPress): the real URL lives only in the widget's `data-settings` JSON and
// the `.elementor-video` div is left empty for JS to fill at runtime. A reader runs no JS, so
// the video never appears. Each entry takes the parsed settings and returns the URL the
// matching platform's iframe player loads. The self-hosted source is the exception: it is
// rendered server-side as a real `<video>`, so it already works in a reader and is skipped.
const iframeSources: Record<string, (settings: Record<string, unknown>) => string | undefined> = {
  youtube: (settings) => {
    const url = settings.youtube_url
    const videoId = typeof url === 'string' ? extractVideoId(url) : undefined

    return videoId ? composeYoutubeUrl(videoId) : undefined
  },
  vimeo: (settings) => {
    const url = settings.vimeo_url
    const videoId = typeof url === 'string' ? extractVimeoId(url) : undefined

    return videoId ? composeVimeoUrl(videoId) : undefined
  },
  dailymotion: (settings) => {
    const url = settings.dailymotion_url
    const videoId = typeof url === 'string' ? extractDailymotionId(url) : undefined

    return videoId ? composeDailymotionUrl('video', videoId) : undefined
  },
  videopress: (settings) => {
    // The insert-url mode stores the pasted share link whole, so the guid comes back out of it
    // through the platform's own reader. The media-library mode is not in data-settings at all.
    const url = settings.videopress_url

    return typeof url === 'string' ? readVideopressEmbedSrc(url) : undefined
  },
}

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

    if (typeof videoType !== 'string') {
      continue
    }

    const source = iframeSources[videoType]?.(settings)

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
