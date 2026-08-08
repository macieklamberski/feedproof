import { isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { EmbedResolver, EmbedResolverResult } from '../types.js'
import { attr, find, text } from '../utils/dom.js'

// TikTok's oEmbed snippet is a `<blockquote class="tiktok-embed">` wrapping a section with
// the author's @handle anchor, the caption paragraph and a sound-line anchor, followed by
// an embed.js loader script that turns it into a player. The script never runs in a reader,
// so the blockquote renders as quoted caption text with bare hashtag links and no video.
// The player page is mintable from `data-video-id` alone. The `cite` normally names the
// watch page, but sanitized copies truncate it to the bare host, so it becomes the
// placeholder url only when it still names a video. The creator-profile variant of the same
// blockquote carries `data-unique-id` instead of a video id and mints no player, so the
// selector leaves it alone.
const tiktokHost = 'tiktok.com'

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

    if (
      cite &&
      parsedCite &&
      (isHostOf(parsedCite, tiktokHost) || isSubdomainOf(parsedCite, tiktokHost)) &&
      parsedCite.pathname.includes('/video/')
    ) {
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
    }
  },
}
