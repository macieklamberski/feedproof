import { coerceNumber, isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { EmbedResolver, EmbedResolverResult } from '../types.js'
import { attr, find, text } from '../utils/dom.js'

// TikTok's oEmbed snippet is a `<blockquote class="tiktok-embed">` wrapping a section with
// the author's @handle anchor, the caption paragraph and a sound-line anchor, followed by
// an embed.js loader script that turns it into a player. The script never runs in a reader,
// so the blockquote renders as quoted caption text with bare hashtag links and no video.
// The player page is mintable from `data-video-id` alone. The `cite` normally names the
// watch page, but sanitized copies truncate it to the bare host, so it becomes the
// placeholder url only when it still names a video.
const tiktokHost = 'tiktok.com'

const isTiktokUrl = (url: URL): boolean => {
  return isHostOf(url, tiktokHost) || isSubdomainOf(url, tiktokHost)
}

// A handle is the same character set TikTok allows at signup.
const safeHandleRegex = /^[a-zA-Z0-9_.]{1,24}$/

// A blockquote declares only `max-width` and `min-width`, never a height, so a TikTok normally
// reaches the reader with no size and is drawn as a video-shaped box, which is wrong for a
// vertical clip on both axes. One shape does carry a real one: where a CMS stored the page
// after `embed.js` ran, the hydrated iframe keeps the height it rendered at in its inline
// style. That is a measurement of this clip at this width, so it is taken when it is there.
const styleHeightRegex = /(?:^|;)\s*height\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*px/i
const styleMaxWidthRegex = /(?:^|;)\s*max-width\s*:\s*([0-9]+(?:\.[0-9]+)?)\s*px/i

const hydratedSize = (element: Element): { width?: number; height?: number } => {
  const frame = find(element, 'iframe[src*="/embed/v2/"]')
  const height = coerceNumber(attr(frame, 'style')?.match(styleHeightRegex)?.[1])

  if (!height) {
    return {}
  }

  // The iframe is `width: 100%` inside the blockquote's own `max-width`, so that box is the
  // width the height was measured against.
  const width = coerceNumber(attr(element, 'style')?.match(styleMaxWidthRegex)?.[1])

  return width ? { width, height } : {}
}

export const tiktokEmbedResolver: EmbedResolver = {
  selector: 'blockquote.tiktok-embed[data-video-id]',
  extract: (element): EmbedResolverResult | undefined => {
    const videoId = attr(element, 'data-video-id')

    if (!videoId) {
      return
    }

    let url: string | undefined
    const cite = attr(element, 'cite')
    const parsedCite = parseUrl(cite ?? '', 'https://example.com')

    if (cite && parsedCite && isTiktokUrl(parsedCite) && parsedCite.pathname.includes('/video/')) {
      url = cite
    }

    // By the time convertWidgets runs, wrapBareInlineInParagraphs has wrapped the section's
    // bare author and sound anchors into paragraphs of their own, so neither the author nor
    // the caption sits where the source markup puts it. Both reads therefore key on content
    // instead of position: the author is the first anchor whose text is an @handle, and the
    // caption is the first paragraph that is not the author line or the "♬" sound line.
    const author = text(
      find(element, 'section a', (anchor) => text(anchor)?.startsWith('@') === true),
    )
    const caption = find(element, 'section p', (paragraph) => {
      const value = text(paragraph)

      return Boolean(value && value !== author && !value.startsWith('♬'))
    })

    return {
      provider: 'tiktok',
      id: videoId,
      src: `https://www.tiktok.com/embed/v2/${videoId}`,
      url,
      title: text(caption),
      author,
      ...hydratedSize(element),
    }
  },
}

// The same blockquote naming a creator instead of a clip: the handle sits in `data-unique-id`,
// `data-embed-type="creator"` says which widget it is, and there is no `data-video-id` at all,
// so a selector keyed on one misses these. The profile viewer is mintable from the handle
// (verified live 2026-08-11, 200), and `cite` is already the canonical profile url.
export const tiktokCreatorEmbedResolver: EmbedResolver = {
  selector: 'blockquote.tiktok-embed[data-unique-id]',
  extract: (element): EmbedResolverResult | undefined => {
    const handle = attr(element, 'data-unique-id')

    if (!handle || !safeHandleRegex.test(handle)) {
      return
    }

    const cite = attr(element, 'cite')
    const parsedCite = parseUrl(cite ?? '', 'https://example.com')
    const isCitedProfile = Boolean(cite && parsedCite && isTiktokUrl(parsedCite))

    return {
      provider: 'tiktok',
      id: `@${handle}`,
      src: `https://www.tiktok.com/embed/@${handle}`,
      url: isCitedProfile ? cite : `https://www.tiktok.com/@${handle}`,
      author: `@${handle}`,
    }
  },
}
