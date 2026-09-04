// A message a player frame posted is whatever the platform chose to send: a JSON object, a
// string, a bare number. These narrow it without asserting a shape it may not have.
export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

// A height a player reported, or nothing. A player says 0 before it has rendered and `null`
// for a post it could not load, and neither is a size to draw.
export const readPixels = (value: unknown): number | undefined => {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
}
