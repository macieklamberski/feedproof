import type { CiteResolver } from '../types.js'

// Ameba (ameblo.jp) renders a pasted link as an "ogpCard": an anchor built from the linked
// page's Open Graph data, with each field in its own heavily inline-styled span. The `og`
// in the class names refers to Open Graph, but the markup is Ameba's own — the card is
// frozen into the post at publish time rather than fetched from the linked page.
//
// Note the icon: `img.ogpCard_icon` is a generic grey link glyph from Ameba's own asset
// host (editor_link.svg), not the linked site's favicon, so it is deliberately not mapped.
export const amebaCiteResolver: CiteResolver = {
  selector: '.ogpCard_wrap',
  extract: (element) => {
    const link = element.querySelector('a.ogpCard_link')
    const url = link?.getAttribute('href') ?? undefined
    const title = element.querySelector('.ogpCard_title')?.textContent?.trim()

    if (!url || !title) {
      return
    }

    return {
      provider: 'ameba',
      url,
      title,
      description: element.querySelector('.ogpCard_description')?.textContent ?? undefined,
      publisher: element.querySelector('.ogpCard_urlText')?.textContent ?? undefined,
      thumbnail: element.querySelector('img.ogpCard_image')?.getAttribute('src') ?? undefined,
    }
  },
}
