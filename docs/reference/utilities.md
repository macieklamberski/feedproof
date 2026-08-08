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

Both take transforms already bound to a context — call each transform with a [`TransformContext`](/reference/types) first. `transformContent` does this wiring for you; reach for the runners only when composing a pipeline by hand. See [Custom Transforms](/guides/customization/custom-transforms).

## Placeholder Builders

The functions the built-in resolvers use to mint and update [placeholder elements](/widgets). Use them in custom resolvers and enrichers so your output matches the wire format.

| Function | Description |
|----------|-------------|
| `createPlaceholder(document, type, fields)` | Creates a `<div>` and writes each truthy field as `data-{type}-{key}` |
| `updatePlaceholder(element, type, fields)` | Writes fields onto an existing element, skipping attributes already present |
| `createEmbedPlaceholder(document, metadata)` | Creates an embed placeholder with its fallback `<a>` child; `src` is required |
| `updateEmbedPlaceholder(element, metadata)` | Fills missing `data-embed-*` attributes from metadata |
| `createCitePlaceholder(document, metadata)` | Creates a cite placeholder with its titled `<a>` child |
| `updateCitePlaceholder(element, metadata)` | Fills missing `data-cite-*` attributes from metadata |
| `normalizeEmbedFields(metadata)` | Maps embed metadata to its `data-embed-*` field record, in write order |
| `normalizeCiteFields(metadata)` | Maps cite metadata to its `data-cite-*` field record, in write order |

Attributes are write-once: none of these functions overwrite a value already on the element, so a resolver's own extraction always survives [enrichment](/guides/customization/enrichment).

### `createIframeEmbedResolver()`

Builds an [`EmbedResolver`](/reference/types) for a provider whose embeds are ordinary iframes: it matches `iframe[src]`, claims only the given hosts (and their subdomains), and delegates to your `resolveEmbed`.

```typescript
import { createIframeEmbedResolver } from 'feedsweep'

const exampleResolver = createIframeEmbedResolver(['player.example.com'], (url) => {
  return { provider: 'example', src: url }
})
```

See [Widget Resolvers](/guides/customization/widget-resolvers).

## Provider Helpers

The building blocks of the built-in embed resolvers, exported for reuse in custom ones.

| Function | Description |
|----------|-------------|
| `extractVideoId(link)` | YouTube video id from any watch, share, shorts, live, or embed URL |
| `composeThumbnailUrl(videoId)` | The YouTube thumbnail URL for a video id |
| `youtubeResolveEmbed(url)` | Full embed metadata from a YouTube URL |
| `extractVimeoId(link)` / `vimeoResolveEmbed(url)` | The same pair for Vimeo |
| `extractDailymotionId(link)` / `dailymotionResolveEmbed(url)` | The same pair for Dailymotion |
| `extractJwplayerId(link)` / `jwplayerResolveEmbed(url)` | The same pair for JW Player |
| `buzzsproutResolveEmbed(url)` | Embed metadata from a Buzzsprout player URL |

Each `*ResolveEmbed` returns an [`EmbedResolverResult`](/reference/types) or `undefined` when the URL is not recognized.

## Code and Text Helpers

| Function | Description |
|----------|-------------|
| `hljsHighlightFn` | The default [`HighlightFn`](/reference/types), backed by highlight.js |
| `detectLanguage(pre, code)` | Reads the language label from a code block's class and attribute conventions |
| `parseTimestampSeconds(timestamp)` | Parses `hh:mm:ss` / `mm:ss` text into seconds, or `undefined` |

## Wrapper Recognition

### `generatedWrapperTypes`

The wrapper types feedsweep mints: `['embed', 'cite', 'table', 'pre']`. A custom transform that dissolves wrapper divs should leave elements carrying these `data-*` namespaces alone — the built-in `unwrapWrappers` does exactly that.

```typescript
import { generatedWrapperTypes } from 'feedsweep'

// ['embed', 'cite', 'table', 'pre']
```
