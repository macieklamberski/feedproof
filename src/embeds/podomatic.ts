import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const podomaticHost = 'podomatic.com'

// Every id here is decimal, and an episode id and a podcast id look identical, which is why the
// kind travels with the id.
const safeIdRegex = /^\d+$/

// The html5 player's three styles, each measured in Chrome at 1200, 500 and 320 pixels wide:
// the height is the same at every width, so this is a fixed height on a fluid width and never a
// ratio. The corpus agrees on the default, 162 of its 251 html5 frames state 208.
const html5Heights: Record<string, number> = {
  normal: 208,
  small: 97,
  square: 504,
}

// The current player, measured at 203 wide and 216 narrow because the episode title wraps. 205 is
// what Podomatic's own snippet writes on all 11 frames in the corpus, and it sits between the two.
const currentHeight = 205

// The two things an html5 frame can name, and the only kinds the resolver mints an id for.
const html5Kinds = new Set(['episode', 'podcast'])

type Player = { kind: string; id: string; src: string; height: number }

const readPlayer = (url: URL): Player | undefined => {
  const segments = getPathSegments(url)

  if (segments[0] !== 'embed') {
    return
  }

  // `embed/html5/{episode|podcast}/{id}`, with an optional `style` selecting one of three
  // player shapes. The style is kept because it is what chose the height.
  if (segments[1] === 'html5' && html5Kinds.has(segments[2] ?? '')) {
    const style = url.searchParams.get('style') ?? ''
    const named = style in html5Heights ? style : 'normal'
    const query = named === 'normal' ? '' : `?style=${named}`
    const kind = segments[2] as string
    const id = segments[3] ?? ''

    return {
      kind,
      id,
      src: `https://www.podomatic.com/embed/html5/${kind}/${id}${query}`,
      height: html5Heights[named] as number,
    }
  }

  // `embed/v2/podcast/{podcast}?episode_id={episode}&theme={theme}`, the snippet Podomatic hands
  // out today. It names a podcast in the path and picks an episode out of it with a parameter,
  // and that episode id is the same one the html5 route takes in its path: `episode_id=11083318`
  // and `embed/html5/episode/11083318` are the same recording, checked live 2026-09-06 through
  // the canonical link each player page carries.
  if (segments[1] === 'v2' && segments[2] === 'podcast') {
    const podcast = segments[3] ?? ''
    const episode = url.searchParams.get('episode_id') ?? ''
    const theme = url.searchParams.get('theme')
    const named = safeIdRegex.test(episode) ? `?episode_id=${episode}` : ''
    // Encoded, because `searchParams` hands the value back decoded: a feed writing
    // `theme=dark%26autoplay%3Dtrue` would otherwise mint a second parameter of its own choosing.
    const themed = theme && named ? `&theme=${encodeURIComponent(theme)}` : ''

    return {
      kind: named ? 'episode' : 'podcast',
      id: named ? episode : podcast,
      src: `https://www.podomatic.com/embed/v2/podcast/${podcast}${named}${themed}`,
      height: currentHeight,
    }
  }
}

export const podomaticResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, podomaticHost)
  const player = parsed && readPlayer(parsed)

  if (!player || !safeIdRegex.test(player.id)) {
    return
  }

  return {
    provider: 'podomatic',
    // Qualified by kind because the two id spaces share one grammar, and because the endpoint an
    // enricher would call differs: `embed/html5/episode/{id}` and `embed/html5/podcast/{id}` each
    // answer with the canonical page, the feed url and the title of what they hold.
    id: `${player.kind}/${player.id}`,
    src: player.src,
    height: player.height,
  }
}

// The size is preferred over the carrier's because 171 of the 251 html5 frames in the corpus
// state `width="0" height="0"`: Podomatic's own snippet writes zeros and sizes the frame from a
// stylesheet the feed never carries, so the declared box says nothing about the player.
export const podomaticEmbedResolver = createUrlEmbedResolver(
  [podomaticHost],
  podomaticResolveEmbed,
  { preferResolverSize: true },
)

// Two carriers are deliberately left to the generic fallback.
//
// `www.podomatic.com/embed/frame/multi/0?json_url={account}.podomatic.com/embed/multi/0?…` (272
// occurrences over 4 feeds) answers 404 today, and the json_url it wraps now serves JSON rather
// than a player. The account slug inside it addresses no live frame: `embed/html5/podcast/{slug}`
// answers 200 with the empty player shell, since that route takes the numeric podcast id, and
// only a fetch of `www.podomatic.com/podcasts/{slug}` would turn the slug into that number.
//
// The Flash players, `{account}.podomatic.com/swf/joeplayer_v{n}.swf` over 65 feeds, name their
// episode as `jsonLocation={account}.podomatic.com/entry/embed_params/{timestamp}` in flashvars.
// That timestamp is the episode's canonical page (`podcasts/{account}/episodes/{timestamp}` 200,
// a fabricated timestamp 404), but the html5 player takes the numeric id and nothing derives one
// from the other offline.
