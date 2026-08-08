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
| `options` | [`TransformContentOptions`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L191) | Configuration; only `parseHtmlFn` is required |

#### Options

Every array option fully replaces its default — see [Default Lists](/guides/customization/default-lists) for the spread idiom that extends one instead.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `parseHtmlFn` | [`ParseHtmlFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L189) | — | **Required.** Parses HTML into a `Document`. See [DOM Parsing](/guides/customization/dom-parsing) |
| `baseUrl` | `string` | — | The item's permalink; anchors relative URL resolution. See [URL Handling](/guides/customization/url-handling) |
| `sameSiteUrls` | `Array<string>` | — | Other URLs that stand for the item's own page (site page, feed URL). See [URL Handling](/guides/customization/url-handling) |
| `enclosures` | [`Array<Enclosure>`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L11) | — | Feed enclosures to inject into the content. See [Enclosures](/guides/enclosures) |
| `articleTitle` | `string` | — | The item's title, so a duplicated leading heading can be stripped |
| `widgetResolvers` | [`Array<WidgetResolver>`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L124) | [`defaultWidgetResolvers`](https://github.com/macieklamberski/feedsweep/blob/main/src/defaults.ts#L312) | Embed and media resolvers. See [Widget Resolvers](/guides/customization/widget-resolvers) |
| `citeResolvers` | [`Array<CiteResolver>`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L96) | [`defaultCiteResolvers`](https://github.com/macieklamberski/feedsweep/blob/main/src/defaults.ts#L333) | Link-preview card resolvers. See [Cite Resolvers](/guides/customization/cite-resolvers) |
| `mediaSrcAttributes` | `Array<string>` | [`defaultMediaSrcAttributes`](https://github.com/macieklamberski/feedsweep/blob/main/src/defaults.ts#L363) | Attributes that carry a media file URL on arbitrary elements |
| `lazySrcAttributes` | `Array<string>` | [`defaultLazySrcAttributes`](https://github.com/macieklamberski/feedsweep/blob/main/src/defaults.ts#L382) | Attributes lazy-loading plugins park a real `src` in |
| `lazySrcsetAttributes` | `Array<string>` | [`defaultLazySrcsetAttributes`](https://github.com/macieklamberski/feedsweep/blob/main/src/defaults.ts#L463) | Attributes lazy-loading plugins park a real `srcset` in |
| `lazyIframeAttributes` | `Array<string>` | [`defaultLazyIframeAttributes`](https://github.com/macieklamberski/feedsweep/blob/main/src/defaults.ts#L410) | Attributes lazy-loading and consent plugins park an iframe `src` in |
| `deferredIframeSources` | [`Array<DeferredIframeSource>`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L55) | [`defaultDeferredIframeSources`](https://github.com/macieklamberski/feedsweep/blob/main/src/defaults.ts#L456) | Div-parked iframe conventions to materialize |
| `trackingHosts` | `Array<string>` | [`defaultTrackingHosts`](https://github.com/macieklamberski/feedsweep/blob/main/src/defaults.ts#L481) | Hosts whose images are tracking pixels |
| `trackingPathSegments` | `Array<string>` | [`defaultTrackingPathSegments`](https://github.com/macieklamberski/feedsweep/blob/main/src/defaults.ts#L533) | URL path segments that mark a tracking pixel |
| `emojiImageHosts` | `Array<string>` | [`defaultEmojiImageHosts`](https://github.com/macieklamberski/feedsweep/blob/main/src/defaults.ts#L538) | Hosts serving platform emoji images |
| `avatarImageHosts` | `Array<string>` | [`defaultAvatarImageHosts`](https://github.com/macieklamberski/feedsweep/blob/main/src/defaults.ts#L554) | Hosts serving avatar images, excluded from enclosure injection |
| `nonContentSelectors` | `Array<string>` | [`defaultNonContentSelectors`](https://github.com/macieklamberski/feedsweep/blob/main/src/defaults.ts#L570) | Selectors for platform chrome to strip. See [Content Cleanup](/transforms/cleanup) |
| `preservedPreClasses` | `Array<string>` | [`defaultPreservedPreClasses`](https://github.com/macieklamberski/feedsweep/blob/main/src/defaults.ts#L565) | `<pre>` classes exempt from code-block merging |
| `resolveUrlFn` | [`ResolveUrlFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L25) | [`defaultResolveUrlFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/defaults.ts#L377) | Resolves a URL against a base URL |
| `cleanUrlFn` | [`CleanUrlFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L128) | — | Strips tracking params and unwraps redirect wrappers. See [URL Handling](/guides/customization/url-handling) |
| `assetProxyFn` | [`AssetProxyFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L140) | — | Rewrites asset URLs through your proxy; must be idempotent. See [URL Handling](/guides/customization/url-handling) |
| `isSafeUrlFn` | [`IsSafeUrlFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L136) | — | Consumer URL policy on top of the built-in scheme floor. See [Security](/guides/security) |
| `enrichEmbedFn` | [`EnrichEmbedFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L42) | — | Batch-fills embed placeholder metadata. See [Enrichment](/guides/customization/enrichment) |
| `enrichCiteFn` | [`EnrichCiteFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L92) | — | Batch-fills cite placeholder metadata. See [Enrichment](/guides/customization/enrichment) |
| `parseDateFn` | [`ParseDateFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L145) | — | Normalizes cite card dates; `undefined` keeps the raw string |
| `highlightFn` | [`HighlightFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L150) | [`defaultHighlightFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/defaults.ts#L380) | Code highlighter. See [Code Highlighting](/guides/customization/code-highlighting) |
| `stringTransforms` | [`Array<StringTransform>`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L187) | [`defaultStringTransforms`](https://github.com/macieklamberski/feedsweep/blob/main/src/defaults.ts#L131) | The pre-parse phase. See [Custom Transforms](/guides/customization/custom-transforms) |
| `domTransforms` | [`Array<DomTransform>`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L185) | [`defaultStandardDomTransforms`](https://github.com/macieklamberski/feedsweep/blob/main/src/defaults.ts#L139) | The DOM phase. Setting it also disables the `heuristics` flag |
| `heuristics` | `boolean` | `false` | Adds the [heuristic transforms](/transforms/heuristics) to the default pipeline |

> [!IMPORTANT]
> Caller-supplied functions must not throw. An exception from any hook rejects the `transformContent` promise. Expected failures should return `undefined` (or the input unchanged) instead.

#### Returns

`Promise<string>` — The transformed HTML: the serialized content of the document's `<body>`.

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
