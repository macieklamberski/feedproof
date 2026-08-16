import { parseHTML } from 'linkedom'
import { walkElements } from '../utils/dom.js'

// Linkedom hard-codes `lowerCaseAttributeNames: false` and the maintainer declined to expose
// a toggle (WebReflection/linkedom#235, won't fix). Normalize once at parse time so every
// transform reads attributes by canonical lowercase name. Per the HTML spec, the first
// occurrence of a duplicate (case-folded) name wins.
// An element only needs rewriting when one of its attribute names is not already lowercase. A
// duplicate name after folding means one of the pair was uppercase (two identical names can't
// coexist on an element), so this check catches that case too. Walking (see walkElements) and
// checking names allocates nothing for the near-total majority of elements, whose names are
// already lowercase.
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

// Known limitation (not worked around): because linkedom parses SVG in HTML mode (same
// root cause as the self-close issue below), it lowercases camelCase SVG element names:
// `<linearGradient>`/`<feGaussianBlur>`/`<clipPath>` serialize as `<lineargradient>` etc.,
// which browsers won't render as gradients/filters. There's no upstream issue or fix for
// this, and recasing on output would mean maintaining a list of every camelCase SVG element;
// inline SVG with gradients/filters is rare in feed bodies, so it's left as-is. Consumers
// that need it should parse with jsdom (case-preserving) instead of the bundled linkedom.
//
// Linkedom (#326) doesn't switch to XML mode for SVG subtrees when parsing
// HTML, so `<svg><title /><path…></svg>` is parsed as `<svg><title><path…/>
// </title></svg>`: the `<path>` becomes a CHILD of `<title>` because the
// self-close on a non-void HTML element is ignored. We pre-process the source
// to expand any `<tag />` inside `<svg>…</svg>` into `<tag></tag>` so the
// parser produces the structure SVG actually has.
const svgRegionRegex = /<svg\b[^>]*>[\s\S]*?<\/svg>/gi
const svgSelfCloseRegex = /<([a-z][a-z0-9-]*)((?:\s[^>]*)?)\s*\/>/gi

const expandSvgSelfClose = (html: string): string => {
  return html.replace(svgRegionRegex, (svgBlock) => {
    return svgBlock.replace(svgSelfCloseRegex, '<$1$2></$1>')
  })
}

export const parseHtml = (html: string): Document => {
  const { document } = parseHTML(
    `<!doctype html><html><head></head><body>${expandSvgSelfClose(html)}</body></html>`,
  )

  normalizeAttributeCase(document)

  return document
}
