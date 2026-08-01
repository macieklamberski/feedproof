import type { MediaResolver, MediaResolverResult } from '../types.js'
import { attr } from '../utils/dom.js'
import { audioFileRegex, videoFileRegex } from '../utils/urls.js'

// Weebly ships an uploaded video as a wrapper whose iframe is `src="about:blank"`, with the
// player built by JS that never runs in a reader. The file URL is not in the markup, but its
// two halves are: the upload directory in the poster `url()` inside the kept <style>, and
// the file name in the wrapper's `title="Video: …"`. Joined verbatim they fetch (verified
// 2026-08-01, 206 video/mp4 on a 2018 upload, no auth). The name must not be normalized:
// the `_NNN` size suffix is part of the stored file name, and stripping it 404s.
const titlePrefix = 'Video: '

// The poster is the one url() pointing into the site's uploads; the other url() in the same
// style block is the shared play-icon asset on Weebly's CDN.
const posterUrlRegex = /url\(\s*['"]?([^'")]*\/uploads\/[^'")]+)['"]?\s*\)/

const fileNameRegex = /^[^/\\]+$/

export const weeblyMediaResolver: MediaResolver = {
  selector: '.wsite-video-wrapper[title]',
  extract: (element): MediaResolverResult | undefined => {
    const title = attr(element, 'title')

    if (!title?.startsWith(titlePrefix)) {
      return
    }

    const fileName = title.slice(titlePrefix.length).trim()

    // The name is interpolated into a url, so anything path-shaped is dropped rather than
    // joined, and it has to name a media file.
    if (!fileNameRegex.test(fileName)) {
      return
    }

    const isVideo = videoFileRegex.test(fileName)

    if (!isVideo && !audioFileRegex.test(fileName)) {
      return
    }

    const styleText = element.querySelector('style')?.textContent ?? ''
    const posterUrl = styleText.match(posterUrlRegex)?.[1]

    if (!posterUrl) {
      return
    }

    // Weebly writes the poster protocol-relative (`//www.weebly.com/uploads/…`).
    const absolutePoster = posterUrl.startsWith('//') ? `https:${posterUrl}` : posterUrl
    const directory = absolutePoster.slice(0, absolutePoster.lastIndexOf('/') + 1)

    return {
      tag: isVideo ? 'video' : 'audio',
      src: `${directory}${fileName}`,
      poster: absolutePoster,
    }
  },
}
