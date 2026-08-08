---
title: "Customization: Cite Resolvers"
---

# Customize Cite Resolvers

Cite resolvers are how `convertCiteCards` recognizes link-preview cards — the styled boxes platforms render around a cited URL — and normalizes them into [cite placeholders](/widgets/cites). The `citeResolvers` option accepts your own resolvers alongside or instead of the built-ins.

## Interface

```typescript
type CiteResolver = {
  selector: string
  extract: (element: Element) => CiteResolverResult | undefined | Promise<CiteResolverResult | undefined>
}
```

`convertCiteCards` matches each resolver's `selector` and calls `extract` on every hit. Returning `undefined` leaves the card's markup untouched — partial extraction is preferred over dropping a card, but a resolver that cannot find the URL and title has nothing to build a placeholder from.

## Result Fields

```typescript
type CiteResolverResult = {
  provider: string
  url: string
  title: string
  description?: string
  caption?: string
  author?: string
  publisher?: string
  date?: string
  icon?: string
  thumbnail?: string
  kind?: 'bookmark' | 'repost' | 'like' | 'reply' | 'read' | 'listen' | 'watch'
}
```

Three fields deserve care:

- **`description` vs `caption`** — `description` is the linked page's own preview text; `caption` is the embedding author's note about the link. Cards that show both carry both.
- **`date`** — whatever the card states, in whatever format it states it: an ISO timestamp where the source markup carries one, a site-formatted string (`2018.10.14`) where it does not. Skip it rather than guess when the card shows only a partial date.
- **`kind`** — the relationship the citation expresses toward the linked work. Leave it unset for a plain link preview; most cards do.

## Writing a Resolver

A resolver for a card markup shape your platform emits:

```typescript
import type { CiteResolver } from 'feedsweep'

const exampleResolver: CiteResolver = {
  selector: '.link-card',
  extract: (element) => {
    const anchor = element.querySelector('a[href]')
    const title = element.querySelector('.link-card-title')?.textContent?.trim()

    if (!anchor || !title) {
      return
    }

    return {
      provider: 'example',
      url: anchor.getAttribute('href') ?? '',
      title,
      description: element.querySelector('.link-card-excerpt')?.textContent?.trim(),
      thumbnail: element.querySelector('img')?.getAttribute('src') ?? undefined,
    }
  },
}
```

The same rules as widget resolvers apply: no network requests in `extract`, and no thrown exceptions — return `undefined` instead.

The URL you return is resolved against `baseUrl` and passed through `cleanUrlFn` before it lands on the placeholder, so resolvers can return it as found in the markup.

## parseDateFn

Cite cards state dates in their site's own display format. The `parseDateFn` option normalizes them into your preferred form before they are written to `data-cite-date`:

```typescript
const output = await transformContent(html, {
  parseHtmlFn: parseHtml,
  parseDateFn: (raw) => {
    const parsed = new Date(raw)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
  },
})
```

Returning `undefined` keeps the raw string verbatim, so an ambiguous or partial date stays displayed as the site wrote it.

## Extending the Defaults

Array options replace their default — they never merge. Spread `defaultCiteResolvers` to add to the built-ins:

```typescript
import { transformContent } from 'feedsweep'
import { defaultCiteResolvers } from 'feedsweep/defaults'

const output = await transformContent(html, {
  parseHtmlFn: parseHtml,
  citeResolvers: [exampleResolver, ...defaultCiteResolvers],
})
```

Resolver order matters only when selectors overlap: a resolver replaces the element it matches, so a later resolver never sees it. Keep the more specific selector first.
