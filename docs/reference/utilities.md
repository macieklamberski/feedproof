---
title: "Reference: Utilities"
---

# Utilities

Helper functions exported beside [`transformContent`](/reference/transform-content), for composing custom pipelines and writing your own resolvers.

## Pipeline Runners

### `applyStringTransforms()`

Runs prepared string transforms over raw HTML and returns the result.

```typescript
import { applyStringTransforms, stripControlChars } from 'feedsweep'

const cleaned = await applyStringTransforms(html, [stripControlChars(context)])
```

### `applyDomTransforms()`

Runs prepared DOM transforms over a parsed document and returns the serialized `<body>`.

```typescript
import { applyDomTransforms, resolveMediaDimensions } from 'feedsweep'

const result = await applyDomTransforms(document, [resolveMediaDimensions(context)])
```

Both take transforms already bound to a context, so call each transform with a [`TransformContext`](/reference/types) first. `transformContent` does this wiring for you; reach for the runners only when composing a pipeline by hand. See [Custom Transforms](/guides/customization/custom-transforms).

## Placeholder Builders

The functions the built-in resolvers use to mint and update [placeholder elements](/widgets). Use them in custom resolvers and enrichers so your output matches the wire format.

| Function | Description |
|----------|-------------|
| `createPlaceholder(document, type, fields)` | Creates a `<div>` and writes each truthy field as `data-{type}-{key}` |
| `updatePlaceholder(element, type, fields)` | Writes fields onto an existing element |
| `createEmbedPlaceholder(document, metadata)` | Creates an embed placeholder; `src` is required |
| `updateEmbedPlaceholder(element, metadata)` | Writes `data-embed-*` attributes, moving the size as a unit |
| `createCitePlaceholder(document, metadata)` | Creates a cite placeholder |
| `updateCitePlaceholder(element, metadata)` | Writes `data-cite-*` attributes |
| `normalizeEmbedFields(metadata)` | Maps embed metadata to its `data-embed-*` field record, in write order |
| `normalizeCiteFields(metadata)` | Maps cite metadata to its `data-cite-*` field record, in write order |

A write states a value: these functions replace an attribute the element already carries, which is what lets [enrichment](/guides/customization/enrichment) correct a resolver's guess. Fields left out of the record are untouched. Empty and whitespace-only values are skipped, so an attribute is either absent or meaningful.

A placeholder is created empty and stays empty: everything a consumer renders comes from the attributes.

## Resolver Builders

The two shapes every built-in embed resolver is built from.

### `createUrlEmbedResolver()`

For a provider whose embeds are identified by URL. It matches every embed carrier (`iframe[src]`, `embed[src]`, `object[data]`), claims only the given hosts and their subdomains, and hands the URL and the element to your callback.

```typescript
import { createUrlEmbedResolver } from 'feedsweep'

const exampleResolver = createUrlEmbedResolver(['player.example.com'], (url) => {
  return { provider: 'example', src: url }
})
```

### `createMarkupEmbedResolver()`

For a provider recognized by its own markup rather than a URL: a blockquote its script upgrades, a widget div, an AMP element.

```typescript
import { createMarkupEmbedResolver } from 'feedsweep'

const exampleResolver = createMarkupEmbedResolver('div.example-embed[data-id]', (element) => {
  const id = element.getAttribute('data-id')

  return id ? { provider: 'example', id, src: `https://player.example.com/${id}` } : undefined
})
```

Both take an options object as a third argument, carrying one flag. By default the size the carrier declares wins over the one the resolver returns, because the publisher chose it for the player they embedded. `preferResolverSize: true` reverses that for a resolver that has measured the platform: Scribd states the same `height="500"` on every document it embeds and keeps the honest shape in `data-aspect-ratio`, so the number in the markup is not the better one there.

It prefers rather than replaces. Where the resolver states no size at all, the carrier's size is used whatever the flag says, so two refusals cannot cancel out and leave a placeholder with no size on it. See [Embeds](/widgets/embeds#size-dimensions-or-ratio).

> [!NOTE]
> The resolver registries themselves are [built in and not configurable](/guides/built-in). These builders are exported because the placeholder wire format is public, not as an extension point for `transformContent`.

## Code and Text Helpers

| Function | Description |
|----------|-------------|
| `hljsHighlightFn` | The default [`HighlightFn`](/reference/types), backed by highlight.js |
| `detectLanguage(pre, code)` | Reads the language label from a code block's class and attribute conventions |
| `parseTimestampSeconds(timestamp)` | Parses `hh:mm:ss` / `mm:ss` text into seconds, or `undefined` |
| `parsePixelSize(value)` | Reads a pixel count from an attribute or style value, or `undefined` |

## Wrapper Recognition

### `generatedWrapperTypes`

The wrapper types feedsweep mints: `['embed', 'cite', 'table', 'pre']`. A custom transform that dissolves wrapper divs should leave elements carrying these `data-*` namespaces alone, which is what the built-in `unwrapWrappers` does.

```typescript
import { generatedWrapperTypes } from 'feedsweep'

// ['embed', 'cite', 'table', 'pre']
```
