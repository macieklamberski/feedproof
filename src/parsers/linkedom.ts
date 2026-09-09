import { parseHTML } from 'linkedom'
import { walkElements } from '../utils/dom.js'

// https://github.com/WebReflection/linkedom/issues/235: attribute names stay cased, won't fix.
// Names are lowercased once here, so every transform reads them by lowercase name. The first of
// two names that fold to the same one wins, per the HTML spec.
const normalizeAttributeCase = (document: Document): void => {
  walkElements(document, (element) => {
    if (!element.hasAttributes()) {
      return
    }

    let needsRewrite = false

    for (const name of element.getAttributeNames()) {
      if (name.toLowerCase() !== name) {
        needsRewrite = true
        break
      }
    }

    if (!needsRewrite) {
      return
    }

    const original = Array.from(element.attributes).map((attribute) => ({
      name: attribute.name,
      value: attribute.value,
    }))
    const final = new Map<string, string>()

    for (const { name, value } of original) {
      const lower = name.toLowerCase()

      if (final.has(lower)) {
        continue
      }

      final.set(lower, value)
    }

    for (const { name } of original) {
      element.removeAttribute(name)
    }

    for (const [name, value] of final) {
      element.setAttribute(name, value)
    }
  })
}

// https://github.com/WebReflection/linkedom/issues/326: a self-closed tag in <svg> eats siblings.
// The parse stays in HTML mode inside <svg>, where `<title />` is an open tag and the `<path>`
// after it lands inside the title.
const svgRegionRegex = /<svg\b[^>]*>[\s\S]*?<\/svg>/gi
const svgSelfCloseRegex = /<([a-z][a-z0-9-]*)((?:\s[^>]*)?)\s*\/>/gi

const expandSvgSelfClose = (html: string): string => {
  return html.replace(svgRegionRegex, (svgBlock) => {
    return svgBlock.replace(svgSelfCloseRegex, '<$1$2></$1>')
  })
}

// The HTML-mode parse also lowercases `<linearGradient>` and `<clipPath>`, which a browser does
// not render as a gradient or a clip. jsdom keeps the case.
export const parseHtml = (html: string): Document => {
  const { document } = parseHTML(
    `<!doctype html><html><head></head><body>${expandSvgSelfClose(html)}</body></html>`,
  )

  normalizeAttributeCase(document)

  return document
}
