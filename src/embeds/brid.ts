import type { EmbedResolverResult } from '../types.js'
import { findConfigScript, formatRatio } from '../utils/dom.js'
import { createMarkupEmbedResolver } from '../utils/widgets.js'

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

const readEmbedSize = (config: string): Pick<EmbedResolverResult, 'width' | 'height' | 'ratio'> => {
  return readSize(config.match(widthRegex)?.[1], config.match(heightRegex)?.[1])
}

// Brid.tv embeds a player as an empty div plus an inline config script no reader runs.
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

    if ((text.match(containerIdRegex)?.length ?? 0) < 2) {
      script?.remove()
    }

    const title = config.match(titleRegex)?.[1]

    return {
      provider: 'brid',
      id: `${playerId}/${videoId}`,
      src: `https://services.brid.tv/services/iframe/video/${videoId}/${playerId}`,
      // Gated before decoding: decodeURIComponent(undefined) is the string "undefined".
      ...(title && { title: decodeTitle(title) }),
      ...readEmbedSize(config),
    }
  },
  { preferResolverSize: true },
)
