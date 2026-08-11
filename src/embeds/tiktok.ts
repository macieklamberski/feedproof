import { coerceNumber, isHostOf, isSubdomainOf, parseUrl } from 'trousse'
import type { EmbedResolver, EmbedResolverResult } from '../types.js'
import { attr, find, text, textNode } from '../utils/dom.js'

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

// A profile url and nothing else: `/@handle`, with no video segment after it.
const profilePathRegex = /^\/@([a-zA-Z0-9_.]{1,24})\/?$/

// The account a blockquote names, from `data-unique-id` where the creator widget declares it,
// otherwise from the profile anchor. The half-encoded shape keeps no data attributes at all,
// so that anchor is the only place the account survives.
const readHandle = (element: Element): string | undefined => {
  const declared = attr(element, 'data-unique-id')

  if (declared && safeHandleRegex.test(declared)) {
    return declared
  }

  for (const anchor of element.querySelectorAll('a[href]')) {
    const parsed = parseUrl(attr(anchor, 'href') ?? '', 'https://example.com')

    if (parsed && isTiktokUrl(parsed)) {
      const handle = parsed.pathname.match(profilePathRegex)?.[1]

      if (handle) {
        return handle
      }
    }
  }
}

// A blockquote that names an account rather than a clip, which is two shapes at once. The
// creator widget declares it outright, and the minimal authored shape has been stripped of
// every attribute by a CMS, leaving the profile anchor as the only thing it identifies. Both
// resolve to the profile viewer, mintable from the handle (verified live 2026-08-11: it
// renders the account, its bio and a strip of its clips).
//
// Registered after the video resolver, which has already claimed anything naming a clip. What
// reaches here names no video anywhere, so the account is not a substitute for the clip, it is
// the only content the markup still identifies.
export const tiktokCreatorEmbedResolver: EmbedResolver = {
  selector: 'blockquote.tiktok-embed',
  extract: (element): EmbedResolverResult | undefined => {
    const handle = readHandle(element)

    if (!handle) {
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
      title: textNode(element),
    }
  },
}
