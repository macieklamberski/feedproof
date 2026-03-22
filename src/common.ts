import { parseHTML } from 'linkedom'

// Linkedom mis-types Node as `() => void` in facades.d.ts (WebReflection/linkedom#167).
export const Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 } as const

const base64SrcPattern = /((?:src|srcset|poster)=["'])data:[^"']*;base64,[^"']*(["'])/g

export const stripOversizedBase64Sources = (html: string, maxSize: number): string => {
  return html.replace(base64SrcPattern, (match, prefix, suffix) => {
    if (match.length < maxSize) {
      return match
    }

    return `${prefix}${suffix}`
  })
}

export const parseFragment = (html: string): Document => {
  const { document } = parseHTML(`<!doctype html><html><head></head><body>${html}</body></html>`)

  return document
}

export const transformHtml = (html: string, transform: (document: Document) => void): string => {
  const document = parseFragment(html)

  transform(document)

  return document.body.innerHTML
}

export const applyDomTransforms = (
  html: string,
  transforms: Array<(document: Document) => void>,
): string => {
  // Base64 images can be megabytes of text that bloat linkedom's DOM tree memory.
  // Strip oversized ones before DOM parsing to reduce memory usage.
  const stripped = stripOversizedBase64Sources(html, 50 * 1024)
  const document = parseFragment(stripped)

  for (const transform of transforms) {
    transform(document)
  }

  return document.body.innerHTML
}

export const applyStringTransforms = (
  html: string,
  transforms: Array<(html: string) => string>,
): string => {
  let output = html

  for (const transform of transforms) {
    output = transform(output)
  }

  return output
}

// Strips outermost matching wrapper tags, looping until stable.
export const unwrapOuterTag = (html: string, pattern: RegExp): string => {
  let result = html.trim()
  let match = pattern.exec(result)

  while (match) {
    result = match[3].trim()
    match = pattern.exec(result)
  }

  return result
}
