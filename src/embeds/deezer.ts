import { getPathSegments, toMap } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'deezer'

const deezerHosts = ['deezer.com']

// No artist: the widget answers 200 for one and renders nothing.
const deezerHeights = toMap({
  track: 150,
  album: 300,
  playlist: 300,
  episode: 300,
  show: 300,
})

const pluginTypes = toMap({
  album: 'album',
  episode: 'episode',
  episodes: 'episode',
  playlist: 'playlist',
  podcast: 'show',
  show: 'show',
  track: 'track',
  tracks: 'track',
})

const safeIdRegex = /^\d+$/

const themes = new Set(['auto', 'dark', 'light'])

const localeRegex = /^[a-z]{2}$/

const trackSwfRegex = /^(?:small-widget(?:-v2)?|singlePlayer)\.swf$/

type Resource = { type: string; id: string; theme: string }

const readResource = (url: URL): Resource | undefined => {
  const segments = getPathSegments(url)
  const route = localeRegex.test(segments[0] ?? '') ? segments.slice(1) : segments
  const theme = url.searchParams.get('layout') ?? ''
  const query = (name: string) => url.searchParams.get(name) ?? ''

  if (route[0] === 'widget') {
    return { type: route[2] ?? '', id: route[3] ?? '', theme: route[1] ?? '' }
  }

  if (route[0] === 'plugins' && route[1] === 'player') {
    return { type: pluginTypes.get(query('type')) ?? '', id: query('id'), theme }
  }

  if (trackSwfRegex.test(route[1] ?? '')) {
    return { type: 'track', id: query('idSong'), theme }
  }

  if (route[1] === 'widget.swf' || (route[0] === 'embed' && route[1] === 'player')) {
    return { type: 'playlist', id: query('path') || query('pid'), theme }
  }
}

export const deezerResolveEmbed = (url: string): EmbedResolverResult | undefined => {
  const parsed = parseUrlOnHosts(url, deezerHosts)
  const resource = parsed && readResource(parsed)

  if (!resource || !deezerHeights.has(resource.type) || !safeIdRegex.test(resource.id)) {
    return
  }

  const { type, id } = resource
  const theme = themes.has(resource.theme) ? resource.theme : 'dark'

  return {
    provider,
    id: `${type}/${id}`,
    src: `https://widget.deezer.com/widget/${theme}/${type}/${id}`,
    url: `https://www.deezer.com/${type}/${id}`,
    height: deezerHeights.get(type),
  }
}

// Deezer's widget iframe, plus the plugin player and the Flash swfs, which play nothing today.
export const deezerEmbedResolver = createUrlEmbedResolver(deezerHosts, deezerResolveEmbed)

// The widget tests `autoplay === "1"`, so `autoplay=true` matches nothing.
export const deezerRenderHint: EmbedRenderHint = {
  provider,
  autoplayParams: { autoplay: '1' },
}
