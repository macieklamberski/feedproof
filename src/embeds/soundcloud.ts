import { getPathSegments, parseUrl, trimObject } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { attr, jsonAttr, text } from '../utils/dom.js'
import { isFileName, parseUrlOnHosts, placeholderBaseUrl } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'soundcloud'

// api.soundcloud.com/{kind}/{id}, the id optionally spelled as the URN soundcloud:{kind}:{id}.
// The colons arrive percent-encoded because the whole reference is itself a query value. The
// widget resolves an `api-v2` reference to the same track as an `api` one.
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

// spotlight and groups answer 410, but the platform still holds them and no track takes the slug.
// These second segments are the user's own tabs, and each answers with the profile.
const userCollectionSegments = new Set([
  'albums',
  'comments',
  'favorites',
  'followers',
  'following',
  'groups',
  'likes',
  'popular-tracks',
  'reposts',
  'spotlight',
  'tracks',
])

// `feeds.soundcloud.com/stream/{trackId}-{slug}.mp3` is the episode audio, and it is named after
// the track it belongs to, so an enclosure carrying it still names a player.
const streamPathRegex = /^\/stream\/(\d+)-/

// SoundCloud keeps these first segments for its own sections, so none of them can be a permalink:
// `soundcloud.com/tags/{tag}` names no track. A word that reads like a section is not one either,
// since `soundcloud.com/library` is somebody's account.
const sitePathSegments = new Set([
  'charts',
  'discover',
  'feed',
  'imprint',
  'messages',
  'notifications',
  'pages',
  'people',
  'search',
  'settings',
  'signin',
  'stations',
  'stream',
  'tags',
  'upload',
  'you',
])

// A page url names its kind by shape: one segment is the user, `sets` marks a playlist, and a
// second segment is otherwise the track.
const readPageKind = (segments: Array<string>): string | undefined => {
  // A permalink admits letters, digits, dashes and underscores and no dot at all, so a last
  // segment naming a file of any kind is a file.
  if (isFileName(segments[segments.length - 1] ?? '')) {
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

// Any other subdomain is not a page: w.soundcloud.com/player would parse as a user named player.
// `api` and `api-v2` carry the track references, `player` served the Flash swf, and `w` is the
// widget.
const pageHostRegex = /^(?:www\.|m\.)?soundcloud\.com$/

// `player.soundcloud.com` has no DNS record at all (2026-09-06), so a carrier still pointing at
// `player.swf` frames a host that cannot answer. It takes the same `url=` value the widget does,
// so what it names survives and moving that value onto the widget repairs the whole embed.
const flashPlayerHostRegex = /^player\./

// `on.soundcloud.com/{code}` is the share shortener, and `soundcloud.com/{code}` does not exist.
const shortLinkHostRegex = /^on\./

// The classic player is a bar for a single track and a scrolling list for anything holding
// several, and `visual=true` swaps both for one big artwork box. These are the heights
// SoundCloud's own embed config carries per player.
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

type SubstackTrackAttributes = {
  title?: string
  description?: string
  thumbnail_url?: string
  author_name?: string
  targetUrl?: string
}

// Substack renders a track as an iframe inside its own wrapper, whose `data-attrs` JSON carries
// the title, the description, the artwork, the artist and the track page as `targetUrl`.
const readSubstackTrack = (element: Element): Partial<EmbedResolverResult> | undefined => {
  const wrapper = element.closest('[data-component-name="SoundcloudToDOM"]')
  const attributes = jsonAttr<SubstackTrackAttributes>(wrapper, 'data-attrs')

  if (!attributes) {
    return
  }

  // A blank field would ride through Object.assign and erase the title the iframe stated.
  return trimObject(
    {
      title: attributes.title,
      description: attributes.description,
      thumbnail: attributes.thumbnail_url,
      author: attributes.author_name,
      url: attributes.targetUrl,
    },
    Boolean,
  )
}

// SoundCloud's widget iframe, the dead Flash player and a framed track page answering SAMEORIGIN.
export const soundcloudResolveEmbed = (
  src: string,
  element: Element,
): EmbedResolverResult | undefined => {
  // The factory has already matched the host, which means the url parsed, so there is no
  // unparseable case left to guard here.
  const parsed = parseUrl(src, placeholderBaseUrl)
  const params = parsed?.searchParams
  const inner = params?.get('url')
  const reference = inner?.match(referenceRegex)
  const streamTrackId = parsed?.pathname.match(streamPathRegex)?.[1]
  const result: EmbedResolverResult = { provider, src }

  if (reference) {
    result.id = `${reference[1]}/${reference[2]}`
  } else if (streamTrackId) {
    // A track page is addressed by handle and slug, and the id does not yield either:
    // `soundcloud.com/tracks/{id}` redirects to a genre chart.
    result.id = `tracks/${streamTrackId}`
    result.src = composeWidgetUrl(`https://api.soundcloud.com/tracks/${streamTrackId}`)
  }

  // What the carrier names when it holds no reference: the page itself, either inside the
  // widget's `url=` or as the whole src. A page states its kind in the path, which is enough to
  // size the player and to give the placeholder a url a reader can follow.
  const page =
    reference || streamTrackId ? undefined : parseUrlOnHosts(inner ?? src, soundcloudHosts)
  const shortLink = page && shortLinkHostRegex.test(page.hostname) ? page : undefined
  const pageSegments = page && pageHostRegex.test(page.hostname) ? getPathSegments(page) : []
  const secretToken = pageSegments.find((segment) => secretTokenRegex.test(segment))
  const permalink = pageSegments.filter((segment) => segment !== secretToken)
  const pageKind = readPageKind(permalink)

  if (pageKind) {
    result.url = `https://soundcloud.com/${permalink.join('/')}`

    if (!inner) {
      result.src = composeWidgetUrl(result.url, secretToken)
    }
  } else if (shortLink && !inner) {
    result.src = composeWidgetUrl(shortLink.href)
  }

  if (flashPlayerHostRegex.test(parsed?.hostname ?? '')) {
    if (!inner) {
      return
    }

    result.src = composeWidgetUrl(inner)
  }

  if (!result.id && !pageKind && isFileName(parsed?.pathname ?? '')) {
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

  // Both anchors are permalinks, so they are matched on the page hosts: a substring of the href
  // takes `evil.test/soundcloud.com/b` for the track page, and two of those write the author,
  // the title and the url before the block is deleted.
  const sibling = element.nextElementSibling
  const anchors = Array.from(sibling?.querySelectorAll('a[href]') ?? []).filter((anchor) => {
    const page = parseUrlOnHosts(attr(anchor, 'href'), soundcloudHosts)

    return page && pageHostRegex.test(page.hostname)
  })

  // The Copy embed snippet ships a sibling div with two anchors, artist page and track page.
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
  provider,
  autoplayParams: { auto_play: 'true' },
}
