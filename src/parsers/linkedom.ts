import { parseHTML } from 'linkedom'
import { normalizeAttributeCase } from '../common.js'

// Linkedom (#326) doesn't switch to XML mode for SVG subtrees when parsing
// HTML, so `<svg><title /><path…></svg>` is parsed as `<svg><title><path…/>
// </title></svg>` — the `<path>` becomes a CHILD of `<title>` because the
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
