---
title: Widgets
---

# Widgets

Feed items carry rich content blocks that plain HTML cannot render on its own: a hosted video player, a podcast episode, a link-preview card. Feedsweep normalizes these into **placeholders**, framework-agnostic `<div>` elements that describe the content in `data-*` attributes and let your app render them however it wants.

Two placeholder families exist:

- **[Embeds](/widgets/embeds)** (`data-embed-*`) for content with a platform-hosted viewer: a video, a podcast player, any iframe.
- **[Cites](/widgets/cites)** (`data-cite-*`) for link-preview cards pointing at another page: bookmark cards, blog cards, forum link previews.

## Placeholder or Native Element

Not everything becomes a placeholder. The rule: a placeholder exists where your app must render chrome around the content, a player frame or a card layout. Where HTML can already express the content, feedsweep emits the native element instead.

A platform-hosted upload with a direct file URL becomes a real `<video>` or `<audio>` element with `controls`. Native elements flow through the rest of the pipeline like any other media: they get dimensioned, their URLs neutralized and proxied, and they deduplicate against [enclosures](/guides/enclosures). A placeholder is deliberately opaque, and later passes only touch its `data-*` URL fields.

Which path a piece of content takes is decided by the resolver's result shape. A result carrying a `tag` field mints that element; any other result becomes an embed placeholder. See [Embeds](/widgets/embeds) for the catalog of what each path covers.

## Anatomy of a Placeholder

Every placeholder is built the same way: an empty `<div>` with a `data-{type}-{key}` attribute for each extracted field.

```html
<div
  data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
  data-embed-provider="youtube"
  data-embed-id="dQw4w9WgXcQ"
  data-embed-url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
></div>
```

Three properties hold for every placeholder:

- **All fields are optional except the ones the placeholder cannot exist without** (an embed's `src`, a cite's `url` and `title`). Partial extraction beats dropping the content.
- **Empty and whitespace-only values are skipped**, so an attribute is either absent or meaningful.
- **A later pass that states a field means it.** An [enrichment pass](/guides/customization/enrichment) answers about this exact embed from the platform's own API, so what it returns replaces what a resolver read off the markup. Fields the enricher leaves out keep the resolver's value.

## The Element Stays Empty

A placeholder holds no children, so everything a renderer shows for it comes from the attributes. That is the whole point of the shape: the div carries no markup of feedsweep's choosing to undo, restyle, or work around, and a consumer renders the content as its own design says it should.

The cost is that a renderer has to do something with `data-embed-src` and `data-cite-url`. An empty div renders as nothing, so a consumer that ignores the attributes entirely shows nothing where the embed was. [Rendering](/output/rendering) covers the minimum: an anchor, a click-to-load facade, or a full card.

## Generated Wrappers

Placeholders are `<div>` elements, and feedsweep's own [`unwrapWrappers`](/transforms/structure) transform dissolves meaningless `<div>` wrappers. Placeholders survive because their `data-*` attributes mark them as generated. The full list of generated wrapper types is exported as `generatedWrapperTypes`:

```typescript
import { generatedWrapperTypes } from 'feedsweep'

// ['embed', 'cite', 'table', 'pre']
```

`table` and `pre` are not widgets. They are wrappers minted by [`wrapTablesForScroll`](/transforms/structure) and [`highlightCode`](/transforms/code), but they share the same marking, and the same guarantee that no feedsweep transform dissolves them.
