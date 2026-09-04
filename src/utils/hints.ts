import { coerceNumber } from 'trousse'

// A height a player reported, or nothing. A player says 0 before it has rendered and `null`
// for a post it could not load, and neither is a size to draw.
export const readPixels = (value: unknown): number | undefined => {
  const pixels = coerceNumber(value)

  return pixels !== undefined && pixels > 0 ? pixels : undefined
}
