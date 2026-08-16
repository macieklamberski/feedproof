import type { MediaResolver, MediaResolverResult } from '../types.js'

// Weebly ships an uploaded video as a wrapper whose iframe is `src="about:blank"`, with the
// player built by JS that never runs in a reader. The file url is not written anywhere in the
// markup, but it does not need to be: Weebly stores the video and its poster side by side
// under the same name, so the poster `url()` in the kept <style> names `…/{name}.jpg` and the
// video is `…/{name}.mp4`. Verified live 2026-08-11 against 12 posters sampled from the
// corpus, all 200.
//
// The file name cannot come from `title="Video: …"`: 0 of 40 corpus feeds carry both, and the
// live page omits that title too.
//
// Two different ids are in play and only one addresses the file. The
// `wsite-video-container-{id}` / `video-iframe-{id}` number is the *element* id, which Weebly
// passes to `apps/generateVideo.php?elementid={id}&user={site}` to get the player JS; as a
// file name in the upload directory it 404s. The upload path carries its own, different id,
// `/uploads/b/{user}-{pathId}/{name}`, reachable only through the poster url.
const posterUrlRegex = /url\(\s*['"]?([^'")]*\/uploads\/[^'")]+)['"]?\s*\)/

// The stored name keeps its `_NNN` suffix; only the extension changes between the two files.
const extensionRegex = /\.[a-z0-9]+$/i

// A wrapper already holding a real player is a third-party embed sitting in Weebly's video
// block, not an upload facade. Replacing it would destroy whatever resolved it.
const resolvedSelector = '[data-embed-src], video, audio'
const liveIframeSelector = 'iframe[src]:not([src="about:blank"])'

export const weeblyMediaResolver: MediaResolver = {
  selector: '.wsite-video-wrapper',
  extract: (element): MediaResolverResult | undefined => {
    if (element.querySelector(resolvedSelector) || element.querySelector(liveIframeSelector)) {
      return
    }

    const styleText = element.querySelector('style')?.textContent ?? ''
    const posterUrl = styleText.match(posterUrlRegex)?.[1]

    if (!posterUrl || !extensionRegex.test(posterUrl)) {
      return
    }

    // Weebly writes the poster protocol-relative (`//www.weebly.com/uploads/…`).
    const poster = posterUrl.startsWith('//') ? `https:${posterUrl}` : posterUrl

    return {
      tag: 'video',
      src: poster.replace(extensionRegex, '.mp4'),
      poster,
    }
  },
}
