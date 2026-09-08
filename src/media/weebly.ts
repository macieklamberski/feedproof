import type { MediaResolver, MediaResolverResult } from '../types.js'
import { imageFileRegex } from '../utils/urls.js'

// Weebly ships an uploaded video as a wrapper whose iframe is `src="about:blank"`, with the
// player built by JS that never runs in a reader. The file url is not written anywhere in the
// markup, but it does not need to be: Weebly stores the video and its poster side by side
// under the same name, so the poster `url()` in the kept <style> names `…/{name}.jpg` and the
// video is `…/{name}.mp4`. Verified live 2026-08-11: real posters answer 200.
//
// The file name cannot come from `title="Video: …"`: real wrappers do not carry it, and the
// live page omits that title too.
//
// Two different ids are in play and only one addresses the file. The
// `wsite-video-container-{id}` / `video-iframe-{id}` number is the *element* id, which Weebly
// passes to `apps/generateVideo.php?elementid={id}&user={site}` to get the player JS. As a
// file name in the upload directory it 404s. The upload path carries its own, different id,
// `/uploads/b/{user}-{pathId}/{name}`, reachable only through the poster url.
const posterUrlRegex = /url\(\s*['"]?([^'")]*\/uploads\/[^'")]+)['"]?\s*\)/

// A wrapper already holding a real player is a third-party embed sitting in Weebly's video
// block, not an upload facade. Replacing it would destroy whatever resolved it.
const resolvedSelector = '[data-embed-src], video, audio'
const liveIframeSelector = 'iframe[src]:not([src="about:blank"])'

export const weeblyMediaResolver: MediaResolver = {
  kind: 'media',
  selector: '.wsite-video-wrapper',
  extract: (element): MediaResolverResult | undefined => {
    if (element.querySelector(resolvedSelector) || element.querySelector(liveIframeSelector)) {
      return
    }

    const styleText = element.querySelector('style')?.textContent ?? ''
    const posterUrl = styleText.match(posterUrlRegex)?.[1]

    if (!posterUrl || !imageFileRegex.test(posterUrl)) {
      return
    }

    // Weebly writes the poster protocol-relative (`//www.weebly.com/uploads/…`), and it travels
    // that way: convertWidgets gives both urls a scheme, so adding one here would only do the
    // same job earlier and in one resolver's own spelling.
    //
    // The stored name keeps its `_NNN` suffix, so only the extension changes between the two
    // files. The style block writes a cache-buster after it often enough that the extension is
    // not the end of the string (`…/clip_176.jpg?1600`), which is what the trailing group keeps.
    return {
      tag: 'video',
      src: posterUrl.replace(imageFileRegex, '.mp4$2'),
      poster: posterUrl,
    }
  },
}
