import { getPathSegments, parseUrl } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, jsonAttr, text } from '../utils/dom.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

// SoundCloud's embed is an iframe whose `url=` query names the track as an
// `api.soundcloud.com/tracks/{id}` reference. Some feeds name the id twice in it, as a bare
// number under the path and again as a `soundcloud:tracks:{id}` URN in place of it. The colons
// arrive percent-encoded because the whole reference is itself a query value, so both spellings
// are accepted here. Roughly one SoundCloud feed in ten carries the URN form and nothing else,
// which without the second spelling leaves every embed in it with no id at all. The widget
// resolves an `api-v2` reference to the same track as an `api` one.
const referenceRegex =
  /api(?:-v2)?\.soundcloud\.com\/(tracks|playlists|users)\/(?:soundcloud(?::|%3A)\w+(?::|%3A))?(\d+)/i

// The widget is the only part of SoundCloud that can be framed: the site itself answers
// `x-frame-options: SAMEORIGIN`, so a carrier pointing straight at a track page shows nothing.
// The widget takes a page url in place of a reference, which is what makes the repair possible.
const widgetPlayerUrl = 'https://w.soundcloud.com/player/'

const composeWidgetUrl = (target: string, secretToken?: string): string => {
  const query: Record<string, string> = { url: target }

  if (secretToken) {
    query.secret_token = secretToken
  }

  return `${widgetPlayerUrl}?${new URLSearchParams(query)}`
}

// A page url names its kind by shape: one segment is the user, `sets` marks a playlist, and a
// second segment is otherwise the track. A few reserved words name a collection of the user's
// own rather than a track.
const userCollectionSegments = new Set(['favorites', 'spotlight', 'tracks', 'albums', 'reposts'])

// A direct media file, which SoundCloud serves from its podcast host. It is neither a player nor
// a page, so it must not be read as either: the reader can play the file itself.
const mediaFileRegex = /\.(?:aac|flac|m4a|m4v|mp3|mp4|ogg|opus|wav)$/i

// `feeds.soundcloud.com/stream/{trackId}-{slug}.mp3` is the episode audio, and it is named after
// the track it belongs to, so an enclosure carrying it still names a player.
const streamPathRegex = /^\/stream\/(\d+)-/

// SoundCloud keeps these first segments for its own sections, so none of them can be a
// permalink. Without the check `soundcloud.com/tags/{tag}` reads as a track and `/discover` as a
// user, and each mints a widget around a page that names no single item.
const sitePathSegments = new Set([
  'discover',
  'imprint',
  'pages',
  'search',
  'stream',
  'tags',
  'upload',
  'you',
])

const readPageKind = (segments: Array<string>): string | undefined => {
  // The audio file sits two segments deep, which would otherwise read as a user and a track.
  if (mediaFileRegex.test(segments[segments.length - 1] ?? '')) {
    return
  }

  if (sitePathSegments.has(segments[0] ?? '')) {
    return
  }

  if (segments.length === 1) {
    return 'users'
  }

  if (segments[1] === 'sets') {
    return 'playlists'
  }

  if (segments.length === 2) {
    return userCollectionSegments.has(segments[1]) ? 'users' : 'tracks'
  }
}

// A private item's share url carries its token as a path segment, which the widget refuses:
// there it is a `secret_token` parameter of its own.
const secretTokenRegex = /^s-[\w-]+$/

// None of these is a page. They share the site's domain, so a page read has to say so: `api`
// and `api-v2` serve the track references, and `player` served the Flash swf, whose own path
// would otherwise read as a user handle and mint `soundcloud.com/player.swf` as somebody's page.
const nonPageHostRegex = /^(?:api(?:-v2)?|player)\./

// `player.soundcloud.com` has no DNS record at all (2026-09-06), so a carrier still pointing at
// `player.swf` frames a host that cannot answer. It takes the same `url=` value the widget does,
// so what it names survives and moving that value onto the widget repairs the whole embed.
const flashPlayerHostRegex = /^player\./

// `on.soundcloud.com/{code}` is the share shortener, and the code is a short id rather than a
// permalink. Reading it as a path names `soundcloud.com/{code}`, which does not exist, so the
// short url is handed to the widget as it stands and nothing is inferred from its shape.
const shortLinkHostRegex = /^on\./

// The player is fluid-width and fixed-height. The classic one is a bar for a single track and
// a scrolling list for anything holding several, and `visual=true` swaps both for one big
// artwork box. These are the heights SoundCloud's own embed config carries per player, and
// they are a fallback for the iframes that ship no size: a height in the markup wins.
const visualPlayerHeight = 450
const classicPlayerHeights: Record<string, number | undefined> = {
  tracks: 166,
  playlists: 450,
  users: 450,
}

// Any carrier, because the Flash player shipped the same `url=` reference on an `<embed>` and an
// `<object>`: `player.soundcloud.com/player.swf?url=api.soundcloud.com/tracks/{id}`. The host
// check the factory applies is what narrows it, so no player path is spelled in a selector.
const soundcloudHosts = ['soundcloud.com']

// Substack renders a SoundCloud track as an iframe inside its own wrapper, and the wrapper
// carries the card as JSON: the track title, its description, the artwork and the artist. The
// `targetUrl` is the human-facing track page, which is the only place the Substack shape names
// it, since it ships none of the sibling anchors the platform's own snippet uses.
type SubstackTrackAttributes = {
  title?: string
  description?: string
  thumbnail_url?: string
  author_name?: string
  targetUrl?: string
}

const readSubstackTrack = (element: Element): Partial<EmbedResolverResult> => {
  const wrapper = element.closest('[data-component-name="SoundcloudToDOM"]')
  const attributes = jsonAttr<SubstackTrackAttributes>(wrapper, 'data-attrs')

  if (!attributes) {
    return {}
  }

  // Absent fields stay absent: an explicit undefined would ride through Object.assign in the
  // caller and erase what the iframe itself stated, most often its title.
  return {
    ...(attributes.title && { title: attributes.title }),
    ...(attributes.description && { description: attributes.description }),
    ...(attributes.thumbnail_url && { thumbnail: attributes.thumbnail_url }),
    ...(attributes.author_name && { author: attributes.author_name }),
    ...(attributes.targetUrl && { url: attributes.targetUrl }),
  }
}

// The reference the iframe names the track by is not human-clickable, so the iframe alone yields
// a placeholder with no canonical url. The human-facing URLs live beside it: the platform's
// "Copy embed" snippet ships a sibling div with two anchors, the artist page and the track page
// ("Artist · Track"). When that sibling is present its links become the placeholder's author and
// canonical url, and the div is removed so the reader does not see the placeholder and the same
// links twice. Gutenberg embeds instead carry the title on the iframe itself ("Track by Artist").
export const soundcloudResolveEmbed = (
  src: string,
  element: Element,
): EmbedResolverResult | undefined => {
  // The factory has already matched the host, which means the url parsed, so there is no
  // unparseable case left to guard here.
  const parsed = parseUrl(src, 'https://example.com')
  const params = parsed?.searchParams
  const inner = params?.get('url')
  const reference = inner?.match(referenceRegex)
  const streamTrackId = parsed?.pathname.match(streamPathRegex)?.[1]
  const result: EmbedResolverResult = { provider: 'soundcloud', src }

  if (reference) {
    result.id = `${reference[1]}/${reference[2]}`
  } else if (streamTrackId) {
    // The episode file names its track, so the placeholder gets the player instead of an
    // iframe pointing at audio.
    //
    // No canonical url comes with it. A track page is addressed by handle and slug, and the id
    // does not yield either: `soundcloud.com/tracks/{id}` redirects to a genre chart, and the
    // file name concatenates the two halves without a separator that says where one ends. So
    // the page is left to enrichment, which the id addresses.
    result.id = `tracks/${streamTrackId}`
    result.src = composeWidgetUrl(`https://api.soundcloud.com/tracks/${streamTrackId}`)
  }

  // What the carrier names when it holds no reference: the page itself, either inside the
  // widget's `url=` or as the whole src. A page states its kind in the path, which is enough to
  // size the player and to give the placeholder a url a reader can follow.
  const page =
    reference || streamTrackId ? undefined : parseUrlOnHosts(inner ?? src, soundcloudHosts)
  const shortLink = page && shortLinkHostRegex.test(page.hostname) ? page : undefined
  const pageSegments =
    page && !shortLink && !nonPageHostRegex.test(page.hostname) ? getPathSegments(page) : []
  const secretToken = pageSegments.find((segment) => secretTokenRegex.test(segment))
  const permalink = pageSegments.filter((segment) => segment !== secretToken)
  const pageKind = readPageKind(permalink)

  if (pageKind) {
    result.url = `https://soundcloud.com/${permalink.join('/')}`

    // A carrier that is the page rather than the widget renders nothing at all, so the widget
    // is built around the page url it named.
    if (!inner) {
      result.src = composeWidgetUrl(result.url, secretToken)
    }
  } else if (shortLink && !inner) {
    // The shortener answers a redirect rather than a page, so it cannot be framed either. What
    // the code names is unknown until it is followed, so the placeholder gets the player and no
    // canonical url of its own.
    result.src = composeWidgetUrl(shortLink.href)
  }

  // The Flash carrier's own url cannot load, so whatever the reads above made of it, the
  // placeholder points at the widget instead. The value moves across as the feed wrote it,
  // reference or page url alike, private tracks included: their `secret_token` rides inside it.
  // A swf carrying no `url=` names nothing that could be moved, so it is left alone.
  if (flashPlayerHostRegex.test(parsed?.hostname ?? '')) {
    if (!inner) {
      return
    }

    result.src = composeWidgetUrl(inner)
  }

  // Nothing here names a track and the url is the audio itself, so the enclosure stays a file
  // the reader can play rather than becoming a frame pointing at one.
  if (!result.id && !pageKind && mediaFileRegex.test(parsed?.pathname ?? '')) {
    return
  }

  // The visual player is one height whatever it holds, so it needs no reference to size it.
  const height =
    params?.get('visual') === 'true'
      ? visualPlayerHeight
      : classicPlayerHeights[reference?.[1] ?? (streamTrackId && 'tracks') ?? pageKind ?? '']

  if (height) {
    result.height = height
  }

  const title = attr(element, 'title')

  if (title) {
    result.title = title
  }

  Object.assign(result, readSubstackTrack(element))

  const sibling = element.nextElementSibling
  const anchors = Array.from(sibling?.querySelectorAll('a[href*="soundcloud.com"]') ?? []).filter(
    (anchor) => !anchor.getAttribute('href')?.includes('api.soundcloud.com'),
  )

  // The snippet's shape is fixed: artist first, track second. Anything else is not the
  // share snippet, so the sibling stays untouched.
  if (anchors.length === 2) {
    result.author = text(anchors[0])
    result.title = text(anchors[1]) ?? result.title
    result.url = attr(anchors[1], 'href')
    sibling?.remove()
  }

  return result
}

export const soundcloudEmbedResolver = createUrlEmbedResolver(
  soundcloudHosts,
  soundcloudResolveEmbed,
)

// Starts playback on the click that loads the widget.
export const soundcloudRenderHint: EmbedRenderHint = {
  provider: 'soundcloud',
  autoplayParams: { auto_play: 'true' },
}
