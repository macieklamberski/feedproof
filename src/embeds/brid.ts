import type { EmbedResolverResult } from '../types.js'
import { findConfigScript, formatRatio } from '../utils/dom.js'
import { decodeOrKeep } from '../utils/urls.js'
import { createMarkupEmbedResolver } from '../utils/widgets.js'

// The inline script's config comes in two spellings, `$bp("Brid_{n}", {...})` and
// `_bp.push({"div": "Brid_{n}", "obj": {...}})`. `id` is the player, `video` the video, and the
// title is percent-encoded.
const containerIdRegex = /Brid_[\w-]+/g
const playerIdRegex = /"id"\s*:\s*"?(\d+)"?/
const videoIdRegex = /"video"\s*:\s*"?(\d+)"?/
const titleRegex = /"title"\s*:\s*"([^"]*)"/
const widthRegex = /"width"\s*:\s*"?(\d+)"?/
const heightRegex = /"height"\s*:\s*"?(\d+)"?/

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

// The config where it names a size, whole from whichever spoke: a config width beside a style
// height is a box nobody wrote. Where the config names none the div's own `style="width: 16;
// height: 9;"` says the same thing, and the carrier tier reads that shape for every platform.
const readEmbedSize = (config: string): Pick<EmbedResolverResult, 'width' | 'height' | 'ratio'> => {
  return readSize(config.match(widthRegex)?.[1], config.match(heightRegex)?.[1])
}

// Brid.tv embeds a player as an empty div plus an inline config script no reader runs.
// The poster lives under a partner id the markup never names.
export const bridEmbedResolver = createMarkupEmbedResolver(
  'div.brid[id^="Brid_"]',
  (element) => {
    const script = findConfigScript(element)
    const text = script?.textContent ?? ''
    // Read after the div's own id, so a script holding several configs yields the right one.
    const config = text.slice(text.indexOf(element.id))
    const playerId = config.match(playerIdRegex)?.[1]
    const videoId = config.match(videoIdRegex)?.[1]

    if (!playerId || !videoId) {
      return
    }

    // Removed only once it has nothing left to say: one script often configures every container.
    if ((text.match(containerIdRegex)?.length ?? 0) < 2) {
      script?.remove()
    }

    const title = config.match(titleRegex)?.[1]

    return {
      provider: 'brid',
      // The player scopes the video the way a partner scopes a Kaltura entry, so it leads the
      // id, which is the order every other two-part id in the tree uses. The minted url keeps
      // Brid's own `/video/{video}/{player}` order, which is the platform's, not ours.
      id: `${playerId}/${videoId}`,
      // The url keeps Brid's own video-then-player order, the reverse of the id.
      // It is the page the loader's own code opens as its iframe player. A retired player id falls
      // back to the partner's current one, and a retired partner does not.
      src: `https://services.brid.tv/services/iframe/video/${videoId}/${playerId}`,
      title: decodeOrKeep(title),
      ...readEmbedSize(config),
    }
  },
  { preferResolverSize: true },
)
