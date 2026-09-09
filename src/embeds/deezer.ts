import { getPathSegments, toMap } from 'trousse'
import type { EmbedRenderHint, EmbedResolverResult } from '../types.js'
import { parseUrlOnHosts } from '../utils/urls.js'
import { createUrlEmbedResolver } from '../utils/widgets.js'

const provider = 'deezer'

const deezerHosts = ['deezer.com']

// No artist: the widget answers 200 for one and renders nothing.
// The widget fills the box it is given at every width, so these are the heights publishers write.
const deezerHeights = toMap({
  track: 150,
  album: 300,
  playlist: 300,
  episode: 300,
  show: 300,
})

// The dead plugin player names a resource with a plural, and a podcast with the word `podcast`
// where the widget path says `show`. Verified live 2026-09-06: the plugin's `type=podcast&id=32049`
// is the widget's `/widget/dark/show/32049`, which plays StarTalk Radio.
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

// Every Deezer id is decimal, and the type is what tells two of them apart: 11969917 is a real
// playlist and a real track at once, and no album.
const safeIdRegex = /^\d+$/

// The widget's first segment is its theme. `auto` follows the reader's colour scheme, and an
// unknown one falls back to the theme Deezer's own share dialog writes.
const themes = new Set(['auto', 'dark', 'light'])

// A locale in front of the route is the site's own prefix, not part of the route.
const localeRegex = /^[a-z]{2}$/

// The Flash players, all three of which name a track through `idSong`, and the fourth which
// names a playlist through `path`. Same id spaces as today's: `idSong=293366` is still a track
// and `path=11969917` still a playlist.
const trackSwfRegex = /^(?:small-widget(?:-v2)?|singlePlayer)\.swf$/

type Resource = { type: string; id: string; theme: string }

const readResource = (url: URL): Resource | undefined => {
  const segments = getPathSegments(url)
  const route = localeRegex.test(segments[0] ?? '') ? segments.slice(1) : segments
  const theme = url.searchParams.get('layout') ?? ''
  const query = (name: string) => url.searchParams.get(name) ?? ''

  // The current widget, `widget.deezer.com/widget/{theme}/{type}/{id}`.
  if (route[0] === 'widget') {
    return { type: route[2] ?? '', id: route[3] ?? '', theme: route[1] ?? '' }
  }

  // The classic plugin player, `deezer.com/plugins/player?type={type}&id={id}`. It answers 200 and
  // renders Deezer's own "Page not found" for every id, real ones included.
  if (route[0] === 'plugins' && route[1] === 'player') {
    return { type: pluginTypes.get(query('type')) ?? '', id: query('id'), theme }
  }

  // `deezer.com/embedded/{player}.swf?idSong={id}` and its `swf/singlePlayer.swf` twin.
  if (trackSwfRegex.test(route[1] ?? '')) {
    return { type: 'track', id: query('idSong'), theme }
  }

  // `deezer.com/embedded/widget.swf?path={id}` and `deezer.com/embed/player?pid={id}`, the two
  // spellings of the Flash-era playlist player.
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
    // The type qualifies the id because the endpoint an enricher would call is
    // `api.deezer.com/{type}/{id}`, and the id alone does not say which one.
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
