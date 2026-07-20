import type { CiteResolver } from '../types.js'

// Cocoon, a widely used WordPress theme, renders link cards for both external links and
// same-site posts. The wrapping element is the anchor itself, so the URL comes
// from the matched element rather than a descendant, and the anchor's `title` attribute
// repeats the card title as a fallback. Internal (same-site) cards are treated like
// external ones: the author places them in the editor, unlike the related-posts widgets
// we strip, which themes append to every post automatically.
export const cocoonCiteResolver: CiteResolver = {
  selector: '.blogcard-wrap',
  extract: (element) => {
    const url = element.getAttribute('href') ?? undefined
    const cardTitle = element.querySelector('.blogcard-title')?.textContent?.trim()
    const title = cardTitle || element.getAttribute('title')?.trim()

    if (!url || !title) {
      return
    }

    // Both spellings of the snippet class ship in the wild: `blogcard-snippet` in 1,289
    // corpus feeds and the misspelled `blogcard-snipet` in another 40.
    const snippet = element.querySelector('.blogcard-snippet, .blogcard-snipet')

    return {
      provider: 'cocoon',
      url,
      title,
      description: snippet?.textContent ?? undefined,
      publisher: element.querySelector('.blogcard-domain')?.textContent ?? undefined,
      // A theme-formatted date such as "2018.10.14", not ISO. Passed through as-is for
      // the consumer to parse, since the format follows the site's date settings.
      date: element.querySelector('.blogcard-post-date')?.textContent ?? undefined,
      icon: element.querySelector('.blogcard-favicon-image')?.getAttribute('src') ?? undefined,
      thumbnail: element.querySelector('.blogcard-thumb-image')?.getAttribute('src') ?? undefined,
    }
  },
}
