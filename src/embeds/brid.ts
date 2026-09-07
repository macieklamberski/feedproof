import type { EmbedResolverResult } from '../types.js'
import { findConfigScript, formatRatio } from '../utils/dom.js'
import { createMarkupEmbedResolver } from '../utils/widgets.js'

// The config the inline script hands the loader, in one of its two spellings:
//
//   $bp("Brid_19464537", {"id":"26602","width":"540","height":"300","video":"755958"});
//   _bp.push({ "div": "Brid_1178…", "obj": {"id":"23442","title":"FEAR%20STREET","video":"820211",
//              "width":"16","height":"9"}});
//
// `id` is the player, `video` the video, and the title is percent-encoded. The fields are read
// from the text after the div's own id, so a script holding several configs yields the right one.
const containerIdRegex = /Brid_[\w-]+/g
const playerIdRegex = /"id"\s*:\s*"?(\d+)"?/
const videoIdRegex = /"video"\s*:\s*"?(\d+)"?/
const titleRegex = /"title"\s*:\s*"([^"]*)"/
const widthRegex = /"width"\s*:\s*"?(\d+)"?/
const heightRegex = /"height"\s*:\s*"?(\d+)"?/

const decodeTitle = (title: string): string => {
  try {
    return decodeURIComponent(title)
  } catch {
    return title
  }
}

// Brid spells a responsive player's shape as a width and height of `16` and `9`, in 95 of 453
// corpus configs; the other spellings are pixel boxes of 300 and more (540x300, 800x450). Two
// values under the ceiling below are a shape, not a box.
const ratioCeiling = 100

const readSize = (
  width: string | undefined,
  height: string | undefined,
): Pick<EmbedResolverResult, 'width' | 'height' | 'ratio'> => {
  const parsedWidth = Number(width)
  const parsedHeight = Number(height)

  if (!(parsedWidth > 0 && parsedHeight > 0)) {
    return {}
  }

  return parsedWidth < ratioCeiling && parsedHeight < ratioCeiling
    ? { ratio: formatRatio(parsedWidth, parsedHeight) }
    : { width: parsedWidth, height: parsedHeight }
}

// Brid.tv (now TargetVideo) embeds a player as an empty `<div class="brid" id="Brid_…">`, an
// inline script naming the player and the video, and the loader script. Nothing runs in a
// reader, so the div dies as an empty tag and the video is deleted outright: 193 census feeds
// carry the loader and none holds a Brid iframe. `services.brid.tv/services/iframe/video/{video}/
// {player}` is the page the loader's own code recognises as its iframe player, and it answers
// with the player for 16 of 20 corpus pairs and an error page for an invented video (checked
// 2026-09-06). A retired player id falls back to the partner's current one, a retired partner
// does not. The poster lives under a partner id the markup never names, so it is left to
// enrichment.
//
// The div's own `style="width: 16; height: 9;"` mirrors the config, ratio spelling included, so
// the size read here stands over the box the carrier appears to declare.
export const bridEmbedResolver = createMarkupEmbedResolver(
  'div.brid[id^="Brid_"]',
  (element) => {
    const script = findConfigScript(element)
    const text = script?.textContent ?? ''
    const config = text.slice(text.indexOf(element.id))
    const playerId = config.match(playerIdRegex)?.[1]
    const videoId = config.match(videoIdRegex)?.[1]

    if (!playerId || !videoId) {
      return
    }

    // One script often configures every container on the page, so it is dropped only once it
    // has nothing left to say. Removing it on the first container took the other containers'
    // configs with it and deleted their videos.
    if ((text.match(containerIdRegex)?.length ?? 0) < 2) {
      script?.remove()
    }

    const title = config.match(titleRegex)?.[1]

    return {
      provider: 'brid',
      id: `${videoId}/${playerId}`,
      src: `https://services.brid.tv/services/iframe/video/${videoId}/${playerId}`,
      ...(title && { title: decodeTitle(title) }),
      ...readSize(config.match(widthRegex)?.[1], config.match(heightRegex)?.[1]),
    }
  },
  { preferResolverSize: true },
)
