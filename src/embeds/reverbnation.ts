import { getPathSegments } from 'trousse'
import type { EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const reverbnationHost = 'reverbnation.com'

// Every widget names what it plays as a kind and a number: `artist_1018382`, `Playlist_957851`,
// `Album_170738`, and the rarer `fan_` and `promoter_`. The kind is capitalised inconsistently by
// the site's own snippets, so it is taken as written and passed through as written.
const safeIdRegex = /^[A-Za-z]+_\d+$/

// The Flash players, all of them under `widgets/swf/{revision}/`. `pro_widget` is the common one
// at 49 occurrences, then `tuneWidget` 17, `widgetPlayer` 7, `press` 5, `widgetPlayerMini` 3,
// `blog_player` 2 and `widgetPlayerMicro` 1.
const flashPathRegex = /^\/+widgets\/swf\//

// The three parameters those players use to name their subject. They are the same id space as
// the html widget's path: all six Flash-era ids sampled from the corpus answer 200 there, against
// 404 for a fabricated one.
const flashIdParams = ['id', 'emailPlaylist', 'twID']

const composeSource = (id: string, search: string): string => {
  return `https://www.reverbnation.com/widget_code/html_widget/${id}${search}`
}

const readWidgetId = (url: URL): string | undefined => {
  const segments = getPathSegments(url)

  return segments[0] === 'widget_code' && segments[1] === 'html_widget' ? segments[2] : undefined
}

const readFlashId = (url: URL): string | undefined => {
  if (!flashPathRegex.test(url.pathname)) {
    return
  }

  for (const name of flashIdParams) {
    const id = url.searchParams.get(name)

    if (id) {
      return id
    }
  }
}

export const reverbnationResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, reverbnationHost)

  if (!parsed) {
    return
  }

  const widget = readWidgetId(parsed)
  const id = widget ?? readFlashId(parsed)

  if (!id || !safeIdRegex.test(id)) {
    return
  }

  return {
    provider: 'reverbnation',
    id,
    // The html widget's query selects which player is drawn and what it holds, so a frame that
    // already names one keeps its own. What changes is the scheme and the host: 37 of the 145
    // widget urls in the corpus are `http://` and the Flash ones sit on `cache.reverbnation.com`,
    // which serves swf files and nothing else.
    src: composeSource(id, widget ? parsed.search : ''),
  }
}

// No size. The widget reflows rather than scaling: at 1200 px wide it measured 500 tall and at
// 400 px wide 400 tall, which is neither a fixed height nor a constant ratio, and the corpus
// agrees that there is no one answer, with `widget_id=55` frames stating 150 (39), 520 (26),
// 265 (16), 500 (10) and 1000 (4). What the publisher declared is the only honest number here.
//
// No page url either. `reverbnation.com/{slug}` is the artist's page and the numeric id does not
// address it: `reverbnation.com/artist/1018382`, `/c/1018382` and
// `main/redirect_to_artist?artist_id=1018382` all 404. The widget page carries the slug, so that
// is an enrich-time read.
export const reverbnationEmbedResolver = createUrlEmbedResolver(
  [reverbnationHost],
  reverbnationResolveEmbed,
)
