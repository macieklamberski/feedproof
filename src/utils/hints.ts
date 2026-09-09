import { coerceNumber, isPlainObject } from 'trousse'

// A height a player reported, or nothing. A player says 0 before it has rendered and `null`
// for a post it could not load, and neither is a size to draw.
export const readPixels = (value: unknown): number | undefined => {
  const pixels = coerceNumber(value)

  return pixels !== undefined && pixels > 0 ? pixels : undefined
}

// player.js takes the message as a JSON string, not an object, and answers the same way.
// Several podcast players share it. The player drops a message whose origin differs from its
// `document.referrer`, so the frame has to be given one.
export const playerJsPlayRequest = JSON.stringify({
  context: 'player.js',
  version: '0.0.11',
  method: 'play',
})

export const isPlayerJsReady = (data: unknown): boolean => {
  if (typeof data !== 'string') {
    return false
  }

  try {
    const message: unknown = JSON.parse(data)

    return isPlainObject(message) && message.context === 'player.js' && message.event === 'ready'
  } catch {
    return false
  }
}
