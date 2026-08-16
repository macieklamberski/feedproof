import type { MediaResolver, MediaResolverResult } from '../types.js'
import { jsonAttr } from '../utils/dom.js'

// Substack uploads reach a feed as an empty div naming the file by a UUID, with no url in
// the markup and none on the rendered page either: the web player fetches it after load.
// The id resolves anonymously through one endpoint, which redirects to a signed mp4 or mp3
// (measured 2026-07-31 across three publications, and it answers a Range request from a
// foreign origin, so a reader's own <video> can seek it).
//
// The `/video/upload/` path serves audio too, so both components share it. `api.substack.com`
// resolves an id belonging to any publication, so nothing here needs the post's own host.
//
// The endpoint must go in the element as-is. Following the redirect and storing what it
// points at yields a url carrying an expiring signature, which stops working. This one is
// stable and redirects at play time.
const composeSourceUrl = (mediaUploadId: string): string => {
  return `https://api.substack.com/api/v1/video/upload/${mediaUploadId}/src`
}

type MediaAttrs = {
  mediaUploadId?: string
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const substackMediaResolver: MediaResolver = {
  selector: '.native-video-embed, .native-audio-embed',
  extract: (element): MediaResolverResult | undefined => {
    const attrs = jsonAttr<MediaAttrs>(element, 'data-attrs')
    const mediaUploadId = attrs?.mediaUploadId

    // The id goes straight into a url, so anything that is not the shape Substack emits is
    // dropped rather than interpolated.
    if (!mediaUploadId || !uuidRegex.test(mediaUploadId)) {
      return
    }

    return {
      tag: element.classList.contains('native-audio-embed') ? 'audio' : 'video',
      src: composeSourceUrl(mediaUploadId),
    }
  },
}
