import type { CiteResolver } from '../types.js'

// Discourse forums expand a pasted link into a "onebox" card. The engine that built the
// card varies (a generic one covers 979 of the 1,118 corpus feeds, the rest are per-site
// engines like github or wikipedia), and each engine renders its own body markup, so this
// keys on the wrapper and the fields the generic shape shares rather than on the engine
// subclass. The canonical URL sits on the wrapper, so no inner anchor is needed.
export const discourseCiteResolver: CiteResolver = {
  selector: 'aside.onebox[data-onebox-src]',
  extract: (element) => {
    const url = element.getAttribute('data-onebox-src') ?? undefined
    const body = element.querySelector('.onebox-body')
    // Engines differ on the heading level they use for the title.
    const title = body?.querySelector('h3, h4')?.textContent?.trim()

    if (!url || !title) {
      return
    }

    return {
      provider: 'discourse',
      url,
      title,
      description: body?.querySelector('p')?.textContent ?? undefined,
      publisher: element.querySelector('header.source a')?.textContent ?? undefined,
      icon: element.querySelector('img.site-icon')?.getAttribute('src') ?? undefined,
      thumbnail: element.querySelector('.aspect-image img')?.getAttribute('src') ?? undefined,
    }
  },
}
