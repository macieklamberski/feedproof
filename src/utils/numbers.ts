export const coerceNumber = (value: string | null): number | undefined => {
  if (value == null) {
    return
  }

  const parsed = Number(value)

  return Number.isNaN(parsed) ? undefined : parsed
}
