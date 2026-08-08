---
title: "Reference: Types"
---

# Types

Every type feedsweep exports, with a one-line description. All link into the source for the full shape.

## Core

| Type | Description |
|------|-------------|
| [`TransformContentOptions`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L191) | The options object of [`transformContent`](/reference/transform-content) |
| [`TransformContext`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L152) | The resolved context every transform receives: options with defaults filled in |
| [`ParseHtmlFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L189) | `(html: string) => MaybePromise<Document>` — the one required option |
| [`DomTransform`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L185) | `(context) => (document) => MaybePromise<void>` — a DOM-phase transform |
| [`StringTransform`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L187) | `(context) => (html) => MaybePromise<string>` — a pre-parse transform |

## Widgets and Cites

| Type | Description |
|------|-------------|
| [`WidgetResolver`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L124) | `EmbedResolver \| MediaResolver` — what the widget pass accepts |
| [`WidgetResolverResult`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L126) | `EmbedResolverResult \| MediaResolverResult` |
| [`EmbedResolver`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L46) | Selector plus `extract` returning embed metadata |
| [`EmbedResolverResult`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L27) | The fields of an [embed placeholder](/widgets/embeds) |
| [`MediaResolver`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L114) | Selector plus `extract` returning a native media element's fields |
| [`MediaResolverResult`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L106) | `tag`, `src`, and optional `poster`/`width`/`height` for a minted `<video>`/`<audio>` |
| [`CiteResolver`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L96) | Selector plus `extract` returning cite-card metadata |
| [`CiteResolverResult`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L65) | The fields of a [cite placeholder](/widgets/cites) |
| [`CiteKind`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L63) | `'bookmark' \| 'repost' \| 'like' \| 'reply' \| 'read' \| 'listen' \| 'watch'` |
| [`GeneratedWrapperType`](https://github.com/macieklamberski/feedsweep/blob/main/src/utils/dom.ts#L259) | `'embed' \| 'cite' \| 'table' \| 'pre'` — the wrappers feedsweep mints |

## Enclosures

| Type | Description |
|------|-------------|
| [`Enclosure`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L11) | A feed enclosure to inject: URL, media type, dimensions, thumbnails, player fields |

## Hooks

| Type | Description |
|------|-------------|
| [`ResolveUrlFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L25) | Resolves a URL against a base URL |
| [`CleanUrlFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L128) | `(url: string) => string` — tracking-param and redirect cleanup |
| [`AssetProxyFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L140) | `(url, type) => string \| undefined` — rewrites an asset URL through your proxy |
| [`AssetType`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L138) | `'image' \| 'video' \| 'audio'` — the role passed to `AssetProxyFn` |
| [`IsSafeUrlFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L136) | `(url, role) => boolean` — consumer URL policy. See [Security](/guides/security) |
| [`UrlRole`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L132) | `'media' \| 'link'` — the role passed to `IsSafeUrlFn` |
| [`EnrichEmbedFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L42) | Batch metadata lookup for embed placeholders, keyed `provider:id` |
| [`EnrichCiteFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L92) | Batch metadata lookup for cite placeholders, keyed by URL |
| [`ParseDateFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L145) | Normalizes a cite card's display date; `undefined` keeps the raw string |
| [`HighlightFn`](https://github.com/macieklamberski/feedsweep/blob/main/src/types.ts#L150) | `(text, language) => MaybePromise<string \| undefined>` — code highlighter |
