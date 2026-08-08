---
title: "Customization: Widget Resolvers"
---

# Customize Widget Resolvers

Widget resolvers are how `convertWidgets` recognizes rich-content blocks — hosted players, platform-native video and audio — and normalizes them into [embed placeholders](/widgets/embeds) or real media elements. The `widgetResolvers` option accepts your own resolvers alongside or instead of the built-ins.

## Interface

A resolver pairs a CSS selector with an extraction function:

```typescript
type EmbedResolver = {
  selector: string
  extract: (element: Element) => EmbedResolverResult | undefined | Promise<EmbedResolverResult | undefined>
}

type MediaResolver = {
  selector: string
  extract: (element: Element) => MediaResolverResult | undefined | Promise<MediaResolverResult | undefined>
}

type WidgetResolver = EmbedResolver | MediaResolver
```

`convertWidgets` runs each resolver's `selector` over the document and calls `extract` on every match. Returning `undefined` defers: the element is left alone for later resolvers (or the generic iframe handling) to claim.

## Placeholder or Native Element

The result shape decides what the matched element becomes:

- An `EmbedResolverResult` (no `tag` field) becomes a `<div data-embed-*>` placeholder with a fallback link — content that lives in a platform-hosted viewer the reader must render chrome for.
- A `MediaResolverResult` (a `tag: 'video' | 'audio'` field) becomes a real `<video>` or `<audio>` element — the platform's own uploaded media, which HTML can already express. The minted element then flows through the later media passes like any other: dimensioned, neutralized, proxied.

```typescript
type MediaResolverResult = {
  tag: 'video' | 'audio'
  src: string
  poster?: string
  width?: number
  height?: number
}
```

For the embed result fields, see [Embeds](/widgets/embeds#fields).

## Writing a Resolver

An embed resolver for a fictional video host:

```typescript
import type { EmbedResolver } from 'feedsweep'

const exampleResolver: EmbedResolver = {
  selector: 'iframe[src]',
  extract: (element) => {
    const src = element.getAttribute('src') ?? ''
    const match = src.match(/exampletube\.com\/embed\/(\w+)/)

    if (!match) {
      return
    }

    return {
      provider: 'exampletube',
      id: match[1],
      src,
      url: `https://exampletube.com/watch/${match[1]}`,
      thumbnail: `https://exampletube.com/thumbs/${match[1]}.jpg`,
    }
  },
}
```

Two rules keep resolvers predictable:

- **`extract` never makes network requests.** It reads the element and derives metadata from it — an id, a URL-composable thumbnail. Anything that needs a round trip belongs in [enrichment](/guides/customization/enrichment).
- **`extract` never throws.** An exception rejects the whole `transformContent` promise. Return `undefined` for anything the resolver cannot handle.

## createIframeEmbedResolver

Video providers that differ only in which hosts they claim and how an id is read out of the `src` can use the bundled builder:

```typescript
import { createIframeEmbedResolver } from 'feedsweep'

const exampleResolver = createIframeEmbedResolver(['exampletube.com'], (src) => {
  const id = src.match(/\/embed\/(\w+)/)?.[1]

  if (!id) {
    return
  }

  return { provider: 'exampletube', id, src }
})
```

It matches `iframe[src]`, checks the host (subdomains included), and hands the `src` to your callback.

## Ordering

Resolvers run in array order, and a resolver that returns a result claims its element — later resolvers never see it. Keep more specific resolvers before more general ones. Unclaimed iframes still fall through to the generic embed handling, so a resolver's job is only to add provider knowledge (an id, a thumbnail, a canonical page URL) that the generic tier cannot derive.

## Extending the Defaults

Array options replace their default — they never merge. To add a resolver while keeping the built-ins, spread `defaultWidgetResolvers`:

```typescript
import { transformContent } from 'feedsweep'
import { defaultWidgetResolvers } from 'feedsweep/defaults'

const output = await transformContent(html, {
  parseHtmlFn: parseHtml,
  widgetResolvers: [exampleResolver, ...defaultWidgetResolvers],
})
```

Passing `widgetResolvers: []` disables provider recognition entirely; iframes then get only the generic treatment.
