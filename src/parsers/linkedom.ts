import { parseHTML } from 'linkedom'

// Linkedom hard-codes `lowerCaseAttributeNames: false` and the maintainer declined to expose
// a toggle (WebReflection/linkedom#235, won't fix). Normalize once at parse time so every
// transform reads attributes by canonical lowercase name. Per the HTML spec, the first
// occurrence of a duplicate (case-folded) name wins.
const normalizeAttributeCase = (document: Document): void => {
  for (const element of document.querySelectorAll('*')) {
    const original = Array.from(element.attributes).map((attribute) => ({
      name: attribute.name,
      value: attribute.value,
    }))
    const final = new Map<string, string>()
    let needsRewrite = false

    for (const { name, value } of original) {
      const lower = name.toLowerCase()

      if (lower !== name) {
        needsRewrite = true
      }

      if (final.has(lower)) {
        needsRewrite = true
        continue
      }

      final.set(lower, value)
    }

    if (!needsRewrite) {
      continue
    }

    for (const { name } of original) {
      element.removeAttribute(name)
    }

    for (const [name, value] of final) {
      element.setAttribute(name, value)
    }
  }
}

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

// linkedom intentionally skips entity escaping for HTML-document attribute values — its
// serializer only runs escape() in XML mode (interface/attr.js gates it behind the non-HTML
// MIME flag), so an HTML attribute emits `&` verbatim. A DOM value is already decoded, so a
// value containing `&copy;` (e.g. from a double-encoded `&amp;copy;` source) serializes
// unchanged and a spec parser then reads it back as `©`, silently corrupting it. A conforming-
// escaping fix is open but stalled upstream (WebReflection/linkedom#304). Text-node
// serialization is correct, and jsdom/browsers escape attributes per spec, so the fix is
// scoped to linkedom's `body.innerHTML` — the path transformContent reads. The escape runs
// around serialization and restores the DOM, so reading innerHTML is side-effect-free and
// repeatable.
const ampersandRegex = /&/g

const findInnerHtmlGetter = (node: object): (() => string) => {
  for (let proto = Object.getPrototypeOf(node); proto; proto = Object.getPrototypeOf(proto)) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'innerHTML')

    if (descriptor?.get) {
      return descriptor.get
    }
  }

  throw new Error('Linkedom body element exposes no innerHTML getter to wrap.')
}

const fixAttributeSerialization = (body: HTMLElement): void => {
  const getInnerHtml = findInnerHtmlGetter(body)

  Object.defineProperty(body, 'innerHTML', {
    configurable: true,
    get(): string {
      const restore: Array<[Element, string, string]> = []

      for (const element of body.querySelectorAll('*')) {
        for (const attribute of Array.from(element.attributes)) {
          if (attribute.value.includes('&')) {
            restore.push([element, attribute.name, attribute.value])
            element.setAttribute(attribute.name, attribute.value.replace(ampersandRegex, '&amp;'))
          }
        }
      }

      const serialized = getInnerHtml.call(this)

      for (const [element, name, value] of restore) {
        element.setAttribute(name, value)
      }

      return serialized
    },
  })
}

export const parseHtml = (html: string): Document => {
  const { document } = parseHTML(
    `<!doctype html><html><head></head><body>${expandSvgSelfClose(html)}</body></html>`,
  )

  normalizeAttributeCase(document)
  fixAttributeSerialization(document.body)

  return document
}
