---
title: "Reference: Types"
---

# Types

Every type feedsweep exports, with a one-line description. All link into the source for the full shape.

## Core

| Type | Description |
|------|-------------|
| [`TransformContentOptions`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | The options object of [`transformContent`](/reference/transform-content) |
| [`TransformContext`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | What every transform receives: the caller's options plus the built-in registries and lists |
| [`ParseHtmlFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | `(html: string) => MaybePromise<Document>`: the one required option |
| [`DomTransform`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | `(context) => (document) => MaybePromise<void>`: a DOM-phase transform |
| [`StringTransform`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | `(context) => (html) => MaybePromise<string>`: a pre-parse transform |

## Widgets and Cites

| Type | Description |
|------|-------------|
| [`WidgetResolver`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | `EmbedResolver \| MediaResolver`: what the widget pass accepts |
| [`WidgetResolverResult`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | `EmbedResolverResult \| MediaResolverResult` |
| [`EmbedResolver`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | Selector plus `extract` returning embed metadata |
| [`EmbedResolverResult`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | The fields of an [embed placeholder](/widgets/embeds) |
| [`MediaResolver`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | Selector plus `extract` returning a native media element's fields |
| [`MediaResolverResult`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | `tag`, `src`, and optional `poster`/`width`/`height` for a minted `<video>`/`<audio>` |
| [`CiteResolver`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | Selector plus `extract` returning cite-card metadata |
| [`CiteResolverResult`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | The fields of a [cite placeholder](/widgets/cites) |
| [`EmbedRef`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | `{ provider, id }`, what an embed enricher is handed for one placeholder |
| [`CiteRef`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | `{ provider, url }`, the cite counterpart |
| [`CiteKind`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | `'bookmark' \| 'repost' \| 'like' \| 'reply' \| 'read' \| 'listen' \| 'watch'` |
| [`GeneratedWrapperType`](https://github.com/macieklamberski/feedsweep/blob/main/src/utils/dom.ts) | `'embed' \| 'cite' \| 'table' \| 'pre'`: the wrappers feedsweep mints |

## Enclosures

| Type | Description |
|------|-------------|
| [`Enclosure`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | A feed enclosure to inject: URL, media type, dimensions, thumbnails, player fields |

## Hooks

| Type | Description |
|------|-------------|
| [`ResolveUrlFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | Resolves a URL against a base URL |
| [`CleanUrlFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | `(url: string) => string`: tracking-param and redirect cleanup |
| [`AssetProxyFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | `(url, type) => string \| undefined`: rewrites an asset URL through your proxy |
| [`AssetType`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | `'image' \| 'video' \| 'audio'`: the role passed to `AssetProxyFn` |
| [`IsSafeUrlFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | `(url, role) => boolean`: consumer URL policy. See [Security](/guides/security) |
| [`UrlRole`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | `'media' \| 'link'`: the role passed to `IsSafeUrlFn` |
| [`EnrichEmbedFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | Batch metadata lookup for embed placeholders; the answer is positional |
| [`EnrichCiteFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | Batch metadata lookup for cite placeholders; the answer is positional |
| [`ParseDateFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | Normalizes a placeholder's display date; `undefined` keeps the raw string |
| [`HighlightFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts) | `(text, language) => MaybePromise<string \| undefined>`: code highlighter |
