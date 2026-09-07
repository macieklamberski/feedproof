import { parseUrl } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { attr, find, keepIfMatches, parsePixelSize, text, textNode } from '../utils/dom.js'
import * as styles from '../utils/styles.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createMarkupEmbedResolver, createUrlEmbedResolver } from '../utils/widgets.js'

const tiktokHost = 'tiktok.com'

// A handle is the same character set TikTok allows at signup.
const safeHandleRegex = /^[a-zA-Z0-9_.]{1,24}$/
const safeVideoIdRegex = /^\d+$/

// Every player url TikTok has issued frames the clip by its numeric id: `/embed/{id}` and
// `/embed/v2/{id}` from the oEmbed loader's eras, `/player/v1/{id}` from the current player.
// All three still serve (probed 2026-08-15; both embed paths answer 400 on a fabricated id).
const playerPathRegex = /^\/(?:embed(?:\/v2)?|player\/v1)\/(\d+)\/?$/

// A watch url names the clip's owner and the clip: `/@handle/video/{id}`. Sanitized copies
// sometimes keep only the `/video/{id}` half, so the handle is optional.
const watchPathRegex = /^(?:\/@([a-zA-Z0-9_.]{1,24}))?\/video\/(\d+)\/?$/

// The player is fluid in width and fixed in height, so it states a height and no shape. Loading
// `/embed/v2/{id}` at 500, 700 and 1000 pixels wide measured 738 every time (2026-08-20): the box
// does not follow its container, because the clip is letterboxed inside a frame whose header,
// caption, sound row and action rail are what set the height. TikTok's own oEmbed answers 739 for
// the same clip and a stored hydrated iframe in the corpus carries 758, the spread being how much
// room the caption takes.
//
// A ratio would be wrong here even though the clip is 9:16. That is the shape of the video, not of
// the frame around it: at 1000 wide, 9/16 asks for 1778 pixels where the player occupies 738.
const playerHeight = 738

type Clip = { handle?: string; videoId?: string }

const readWatchUrl = (url: string | undefined): Clip => {
  const parsed = parseUrlOnHosts(url, tiktokHost)

  if (!parsed) {
    return {}
  }

  const [, handle, videoId] = parsed.pathname.match(watchPathRegex) ?? []

  return { handle, videoId }
}

// A blockquote declares only `max-width` and `min-width`, never a height, so on its own a
// TikTok would reach the reader with no size and be drawn as a video-shaped box, wrong for a
// vertical clip on both axes. The player's fixed height is what the placeholder states instead.
// One shape carries a better number: where a CMS stored the page after `embed.js` ran, the
// hydrated iframe keeps the height it rendered at in its inline style. That is a measurement of
// this clip at this width, so it wins when it is there.
const clipSize = (element: Element): { width?: number; height: number } => {
  const { width, height } = hydratedSize(element)

  return height ? { width, height } : { height: playerHeight }
}

const hydratedSize = (element: Element): { width?: number; height?: number } => {
  // The stored iframe is matched by the same player paths the direct carrier resolver claims,
  // so a hydrated copy keeps its measurement whichever player url the CMS wrote.
  const frame = find(element, 'iframe[src]', (iframe) => {
    const parsed = parseUrlOnHosts(attr(iframe, 'src'), tiktokHost)

    return Boolean(parsed && playerPathRegex.test(parsed.pathname))
  })
  const height = parsePixelSize(styles.pixels(frame, 'height'))

  if (!height) {
    return {}
  }

  // The iframe is `width: 100%` inside the blockquote's own `max-width`, so that box is the
  // width the height was measured against.
  const width = parsePixelSize(styles.pixels(element, 'max-width'))

  return width ? { width, height } : {}
}

// The clip a blockquote names. The player page is mintable from the video id, which is read
// from the sources in declaration order: the `data-video-id` attribute, the `cite`'s watch
// path, then a watch-page anchor in the body. Sanitizers empty or strip the attribute while
// leaving the cite or a caption link intact, so no single source is trusted alone. The `cite`
// becomes the placeholder url only when it still names a watch page: sanitized copies truncate
// it to the bare host, and that links nothing worth keeping.
const resolveClip = (element: Element): EmbedResolverResult | undefined => {
  const declared = attr(element, 'data-video-id')
  const cite = attr(element, 'cite')
  const cited = readWatchUrl(cite)

  let linked: Clip = {}

  for (const anchor of element.querySelectorAll('a[href]')) {
    const clip = readWatchUrl(attr(anchor, 'href'))

    if (clip.videoId) {
      linked = clip
      break
    }
  }

  const declaredId = keepIfMatches(declared, safeVideoIdRegex)
  const videoId = declaredId ?? cited.videoId ?? linked.videoId

  if (!videoId) {
    return
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

  // The placeholder id doubles as the enrichment key, and TikTok's oEmbed endpoint takes the
  // watch url, which needs the handle beside the video id. So the id is the watch page's own
  // path, `@handle/video/{id}`: prefixing `https://www.tiktok.com/` rebuilds the url, and the
  // account shape's `@handle` id is the same convention one level up. A clip whose markup
  // keeps no handle anywhere falls back to the bare video id, which still names the player
  // but cannot address the endpoint.
  const authorHandle = author?.slice(1)
  const handle = cited.handle ?? linked.handle ?? keepIfMatches(authorHandle, safeHandleRegex)

  return {
    provider: 'tiktok',
    id: handle ? `@${handle}/video/${videoId}` : videoId,
    src: `https://www.tiktok.com/embed/v2/${videoId}`,
    url: cited.videoId ? cite : undefined,
    description: text(caption),
    author,
    ...clipSize(element),
  }
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
    const parsed = parseUrlOnHosts(attr(anchor, 'href'), tiktokHost)

    if (parsed) {
      const handle = parsed.pathname.match(profilePathRegex)?.[1]

      if (handle) {
        return handle
      }
    }
  }
}

// The account a blockquote names, which is two shapes at once. The creator widget declares it
// outright, and the minimal authored shape has been stripped of every attribute by a CMS,
// leaving the profile anchor as the only thing it identifies. Both resolve to the profile
// viewer, mintable from the handle (verified live 2026-08-11: it renders the account, its bio
// and a strip of its clips).
const resolveAccount = (element: Element): EmbedResolverResult | undefined => {
  const handle = readHandle(element)

  if (!handle) {
    return
  }

  const cite = attr(element, 'cite')
  const isCitedProfile = Boolean(cite && parseUrlOnHosts(cite, tiktokHost))

  return {
    provider: 'tiktok',
    id: `@${handle}`,
    src: `https://www.tiktok.com/embed/@${handle}`,
    url: isCitedProfile ? cite : `https://www.tiktok.com/@${handle}`,
    author: `@${handle}`,
    description: textNode(element),
  }
}

// TikTok's oEmbed snippet is a `<blockquote class="tiktok-embed">` wrapping a section with
// the author's @handle anchor, the caption paragraph and a sound-line anchor, followed by
// an embed.js loader script that turns it into a player. The script never runs in a reader,
// so the blockquote renders as quoted caption text with bare hashtag links and no video.
//
// Every oEmbed shape TikTok issues is this blockquote, and the shapes differ only in what the
// markup still names. The clip is the more specific claim and is tried first. The account is
// what a blockquote naming no clip anywhere still identifies, so it is never a substitute for
// a clip but the only content left in the markup.
export const tiktokBlockquoteEmbedResolver = createMarkupEmbedResolver(
  'blockquote.tiktok-embed',
  (element) => resolveClip(element) ?? resolveAccount(element),
)

// The pasted player itself, with no blockquote around it. The src is kept as the publisher
// wrote it, query and all. A player url names no handle, so the id stays the bare video id:
// it still names the player, but the oEmbed endpoint, which takes the watch url, cannot be
// rebuilt from it.
//
// A carrier framing the watch page instead is the other half. The page refuses framing
// (`x-frame-options: SAMEORIGIN`, checked 2026-08-15), which is the reason to claim it rather
// than to skip it: unclaimed it becomes a placeholder pointing at a page that renders nothing,
// while the path already names the clip and the player is mintable from it. That is the url a
// wrapper writes when it stores what the author pasted. The handle rides in the same path, so
// the id is the composite the blockquote carrier builds, and the watch page becomes the
// placeholder's url.
//
// `preferResolverSize: true` because the pasted snippets state a landscape box (560x400 in the
// wild) on a player taller than it is wide, and a wrong size reserves worse space than none.
// It costs the one carrier that states an honest number, a stored hydrated iframe whose 758 is
// a real measurement, which lands on 738 instead. Telling that apart from a pasted box needs a
// heuristic worth less than the 20 pixels it recovers.
export const tiktokIframeEmbedResolver = createUrlEmbedResolver(
  [tiktokHost],
  (src) => {
    const parsed = parseUrl(src, 'https://example.com')
    const playerId = parsed?.pathname.match(playerPathRegex)?.[1]

    if (playerId) {
      return {
        provider: 'tiktok',
        id: playerId,
        src,
        height: playerHeight,
      }
    }

    const { handle, videoId } = readWatchUrl(src)

    if (!videoId) {
      return
    }

    return {
      provider: 'tiktok',
      id: handle ? `@${handle}/video/${videoId}` : videoId,
      src: `https://www.tiktok.com/embed/v2/${videoId}`,
      url: src,
      height: playerHeight,
    }
  },
  { preferResolverSize: true },
)
