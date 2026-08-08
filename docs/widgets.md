---
title: Widgets
---

# Widgets

Feed items carry rich content blocks that plain HTML cannot render on its own: a hosted video player, a podcast episode, a link-preview card. Feedsweep normalizes these into **placeholders** — framework-agnostic `<div>` elements that describe the content in `data-*` attributes and let your app render them however it wants.

Two placeholder families exist:

- **[Embeds](/widgets/embeds)** (`data-embed-*`) — content with a platform-hosted viewer: a video, a podcast player, any iframe.
- **[Cites](/widgets/cites)** (`data-cite-*`) — link-preview cards pointing at another page: bookmark cards, blog cards, forum link previews.

## Placeholder or Native Element

Not everything becomes a placeholder. The rule: a placeholder exists where your app must render chrome around the content — a player frame, a card layout. Where HTML can already express the content, feedsweep emits the native element instead.

A platform-hosted upload with a direct file URL becomes a real `<video>` or `<audio>` element with `controls`. Native elements flow through the rest of the pipeline like any other media: they get dimensioned, their URLs neutralized and proxied, and they deduplicate against [enclosures](/guides/enclosures). A placeholder is deliberately opaque — later passes only touch its `data-*` URL fields.

Which path a piece of content takes is decided by the resolver's result shape. A result carrying a `tag` field mints that element; any other result becomes an embed placeholder. See [Widget Resolvers](/guides/customization/widget-resolvers) for the contract.

## Anatomy of a Placeholder

Every placeholder is built the same way: a `<div>` with `data-{type}-{key}` attributes for each extracted field, and fallback content inside.

```html
<div
  data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
  data-embed-provider="youtube"
  data-embed-id="dQw4w9WgXcQ"
  data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
>
  <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">https://www.youtube.com/watch?v=dQw4w9WgXcQ</a>
</div>
```

Three properties hold for every placeholder:

- **All fields are optional except the ones the placeholder cannot exist without** (an embed's `src`, a cite's `url` and `title`). Partial extraction beats dropping the content.
- **Empty and whitespace-only values are skipped**, so an attribute is either absent or meaningful.
- **An attribute is written once and never overwritten.** An [enrichment pass](/guides/customization/enrichment) can only fill fields the resolver left empty — the resolver's own values always survive.

## Graceful Fallback

The child content is the degradation story. A consumer that knows nothing about `data-embed-*` still renders a working link: an embed placeholder contains an `<a>` to the content's page (or player), a cite placeholder contains an `<a>` carrying the card's title. Rendering the placeholder yourself means replacing that child — see [Rendering](/output/rendering).

## Generated Wrappers

Placeholders are `<div>` elements, and feedsweep's own [`unwrapWrappers`](/transforms/structure) transform dissolves meaningless `<div>` wrappers. Placeholders survive because their `data-*` attributes mark them as generated. The full list of generated wrapper types is exported as `generatedWrapperTypes`:

```typescript
import { generatedWrapperTypes } from 'feedsweep'

// ['embed', 'cite', 'table', 'pre']
```

`table` and `pre` are not widgets — they are wrappers minted by [`wrapTablesForScroll`](/transforms/structure) and [`highlightCode`](/transforms/code) — but they share the same marking, and the same guarantee that no feedsweep transform dissolves them.
