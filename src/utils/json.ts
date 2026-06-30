// JSON shape + parseability predicates. Candidates to move to the shared toolbox
// package later (the same helpers live in other projects).
const jsonObjectStartRegex = /^\s*\{/
const jsonObjectEndRegex = /\}\s*$/
const jsonArrayStartRegex = /^\s*\[/
const jsonArrayEndRegex = /\]\s*$/

export const isJsonLike = (value: string): boolean => {
  if (value.length < 2) {
    return false
  }

  return (
    (jsonObjectStartRegex.test(value) && jsonObjectEndRegex.test(value)) ||
    (jsonArrayStartRegex.test(value) && jsonArrayEndRegex.test(value))
  )
}

export const isParseableJson = (value: string): boolean => {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}
