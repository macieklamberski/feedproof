---
title: "Reference: transformContent"
---

# transformContent

The main function. Takes a feed item's HTML, runs the transform pipeline, and returns the transformed HTML.

### `transformContent()`

Runs the string transforms on the raw HTML, parses it with your `parseHtmlFn`, runs the DOM transforms, and returns the serialized `<body>`.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `html` | `string` | The feed item's HTML content |
| `options` | [`TransformContentOptions`](/reference/types) | Configuration; only `parseHtmlFn` is required |

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `parseHtmlFn` | `ParseHtmlFn` | none | **Required.** Parses HTML into a `Document`. See [DOM Parsing](/guides/customization/dom-parsing) |
| `baseUrl` | `string` | none | The item's permalink; anchors relative URL resolution. See [URL Handling](/guides/customization/url-handling) |
| `sameSiteUrls` | `Array<string>` | none | Other URLs that stand for the item's own page (site page, feed URL). See [URL Handling](/guides/customization/url-handling) |
| `enclosures` | `Array<Enclosure>` | none | Feed enclosures to inject into the content. See [Enclosures](/guides/enclosures) |
| `articleTitle` | `string` | none | The item's title, so a duplicated leading heading can be stripped |
| `resolveUrlFn` | `ResolveUrlFn` | `defaultResolveUrlFn` | Resolves a URL against a base URL |
| `cleanUrlFn` | `CleanUrlFn` | none | Strips tracking params and unwraps redirect wrappers. See [URL Handling](/guides/customization/url-handling) |
| `assetProxyFn` | `AssetProxyFn` | none | Rewrites asset URLs through your proxy; must be idempotent. See [URL Handling](/guides/customization/url-handling) |
| `isSafeUrlFn` | `IsSafeUrlFn` | none | Consumer URL policy on top of the built-in scheme floor. See [Security](/guides/security) |
| `enrichEmbedFn` | `EnrichEmbedFn` | none | Batch-fills embed placeholder metadata. See [Enrichment](/guides/customization/enrichment) |
| `enrichCiteFn` | `EnrichCiteFn` | none | Batch-fills cite placeholder metadata. See [Enrichment](/guides/customization/enrichment) |
| `parseDateFn` | `ParseDateFn` | none | Normalizes placeholder dates; returning `undefined` keeps the raw string |
| `highlightFn` | `HighlightFn` | `defaultHighlightFn` | Code highlighter. See [Code Highlighting](/guides/customization/code-highlighting) |
| `stringTransforms` | `Array<StringTransform>` | `defaultStringTransforms` | The pre-parse phase. See [Custom Transforms](/guides/customization/custom-transforms) |
| `domTransforms` | `Array<DomTransform>` | `defaultStandardDomTransforms` | The DOM phase. Setting it also disables the `heuristics` flag |
| `heuristics` | `boolean` | `false` | Adds the [heuristic transforms](/transforms/heuristics) to the default pipeline |

Every type above is exported from the package; see [Types](/reference/types).

The `stringTransforms` and `domTransforms` arrays replace their phase entirely, and nothing is merged. Everything else feedsweep knows, the resolver registries, the lazy-attribute lists, the tracking hosts, the non-content selectors, is [built in and not configurable](/guides/built-in).

> [!IMPORTANT]
> Caller-supplied functions must not throw. An exception from any hook rejects the `transformContent` promise. Expected failures should return `undefined` (or the input unchanged) instead.

#### Returns

`Promise<string>`, the transformed HTML: the serialized content of the document's `<body>`.

#### Example

```typescript
import { transformContent } from 'feedsweep'
import { parseHtml } from 'feedsweep/linkedom'

const html = await transformContent('<p><img data-src="/photo.jpg" src=""></p>', {
  parseHtmlFn: parseHtml,
  baseUrl: 'https://example.com/post',
})

// '<p><img src="https://example.com/photo.jpg"></p>'
```
