---
title: "Output: Data Attributes"
---

# Data Attributes

Feedsweep communicates everything it learned about the content through `data-*` attributes. They are the contract a consuming renderer reads: stable names, plain string values, no markup conventions to parse. Media elements play natively, every attribute is inert on its own, and the two placeholder families are the only output that a renderer has to act on.

The families at a glance:

| Family | Purpose | Written by |
|--------|---------|------------|
| `data-embed-*` | A third-party embed, normalized into a placeholder | [convertWidgets](/widgets/embeds), [injectEnclosures](/guides/enclosures) |
| `data-cite-*` | A link-preview card, normalized into a placeholder | [convertCiteCards](/widgets/cites) |
| `data-pre-*` | Code block metadata | [highlightCode](/transforms/code) |
| `data-align` | Author-intended media alignment | [canonicalizeAlignment](/transforms/media) |
| `data-table` | Scroll wrapper around a wide table | [wrapTablesForScroll](/transforms/structure) |
| `data-emoji` | An inline emoji image or its text fallback | [unwrapEmojiImages](/transforms/media) |
| `data-timestamp` | A player timestamp in prose | [markTimestamps](/transforms/urls) |
| `data-enclosure` | Media injected from the feed's enclosures | [injectEnclosures](/guides/enclosures) |
| `data-proxied-*` | Original URL preserved before proxying | [proxyAssetUrls](/guides/customization/url-handling) |

## Embeds: `data-embed-*`

An embed placeholder is an empty `<div>`. All fields are optional except `data-embed-src`; a resolver writes what it could extract and skips the rest. See [Embeds](/widgets/embeds) for how placeholders are produced.

| Attribute | Value |
|-----------|-------|
| `data-embed-src` | The player URL a renderer can load in an iframe |
| `data-embed-provider` | Provider slug, e.g. `youtube`, `vimeo`, `soundcloud` |
| `data-embed-id` | The provider's ID for the content |
| `data-embed-url` | Canonical page URL of the content |
| `data-embed-thumbnail` | Poster image URL |
| `data-embed-width` | Intrinsic width in pixels |
| `data-embed-height` | Intrinsic height in pixels |
| `data-embed-ratio` | The player's shape as a CSS aspect ratio (`16/9`), where no dimension was measured |
| `data-embed-title` | Content title |
| `data-embed-description` | Content description |
| `data-embed-author` | Author or channel name |
| `data-embed-avatar` | Author avatar image URL |
| `data-embed-publisher` | The publication the content belongs to |
| `data-embed-date` | The content's date, as the source states it |
| `data-embed-duration` | Duration in seconds |

A placeholder carries either the two dimensions or the ratio, never both. See [Embeds](/widgets/embeds#size-dimensions-or-ratio).

```html
<div
  data-embed-src="https://www.youtube.com/embed/dQw4w9WgXcQ"
  data-embed-provider="youtube"
  data-embed-id="dQw4w9WgXcQ"
  data-embed-thumbnail="https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
  data-embed-width="560"
  data-embed-height="315"
></div>
```

## Cites: `data-cite-*`

A cite placeholder is an empty `<div>` too. See [Cites](/widgets/cites) for the resolver catalog.

| Attribute | Value |
|-----------|-------|
| `data-cite-provider` | Slug of the platform whose card markup was read |
| `data-cite-url` | The cited page's URL |
| `data-cite-title` | The cited page's title |
| `data-cite-description` | Excerpt or summary |
| `data-cite-caption` | Author-written caption accompanying the card |
| `data-cite-author` | The cited page's author |
| `data-cite-publisher` | Site or publication name |
| `data-cite-date` | Publication date, passed through [`parseDateFn`](/reference/transform-content#options) when set |
| `data-cite-kind` | Relation to the cited page: `bookmark`, `repost`, `like`, `reply`, `read`, `listen`, or `watch` |
| `data-cite-icon` | Site favicon URL |
| `data-cite-thumbnail` | Preview image URL |

```html
<div
  data-cite-provider="ghost"
  data-cite-url="https://example.com/post"
  data-cite-title="An Example Post"
  data-cite-description="What the post is about."
  data-cite-icon="https://example.com/favicon.ico"
></div>
```

## Code blocks: `data-pre-*`

Written on `<pre>` elements by [highlightCode](/transforms/code).

| Attribute | Value |
|-----------|-------|
| `data-pre-language` | Canonical language id, e.g. `typescript` |
| `data-pre-label` | Display name for a badge, e.g. `TypeScript` |
| `data-pre-numbered` | Valueless. The source markup carried line numbering |

```html
<pre data-pre-language="typescript" data-pre-label="TypeScript"><code>...</code></pre>
```

## Layout: `data-align` and `data-table`

`data-align` carries the alignment the author chose (`left`, `center`, or `right`) on the media element or its `<figure>`. The platform-specific class or style it was read from stays in place, so the attribute is a hook to style against, not a replacement for what the feed wrote. `data-table` is a valueless marker on the `<div>` wrapped around every top-level `<table>`, so wide tables can scroll instead of overflowing.

```html
<figure data-align="center"><img src="https://example.com/photo.jpg"></figure>

<div data-table><table>...</table></div>
```

## Inline: `data-emoji` and `data-timestamp`

`data-emoji` is valueless and marks two shapes: a custom emoji `<img>` that keeps its picture, and a `<span>` holding the text fallback of an emoji whose image renders nothing. Both are things a renderer may want to size like text and keep out of thumbnail selection.

`data-timestamp` wraps a line-leading `mm:ss` or `h:mm:ss` token in a `<span>` and carries its value in seconds, so a podcast reader can seek a player on click.

```html
<img src="https://example.com/emoji/party-parrot.gif" alt=":party_parrot:" data-emoji>

<span data-timestamp="754">12:34</span> The interview begins.
```

## Enclosures: `data-enclosure`

A valueless marker on every element [injectEnclosures](/guides/enclosures) adds: a native `<audio>`, `<video>`, `<img>`, or an embed placeholder. It tells injected media apart from media the item's own content carried, and stops a repeat run from injecting the same source twice.

```html
<audio controls src="https://example.com/episode.mp3" data-enclosure></audio>
```

## Proxied originals: `data-proxied-*`

When [`assetProxyFn`](/guides/customization/url-handling) rewrites an asset URL, the original value is preserved next to it. The name is derived from the rewritten attribute: a leading `data-` is dropped and colons become hyphens.

| Attribute | Original of |
|-----------|-------------|
| `data-proxied-src` | `src` on `<img>`, `<video>`, `<audio>`, `<source>`, `<track>` |
| `data-proxied-srcset` | `srcset` on `<img>` and `<source>` |
| `data-proxied-poster` | `poster` on `<video>` |
| `data-proxied-href` | `href` on SVG `<image>` |
| `data-proxied-xlink-href` | `xlink:href` on legacy SVG `<image>` |
| `data-proxied-embed-thumbnail` | `data-embed-thumbnail` |
| `data-proxied-embed-avatar` | `data-embed-avatar` |
| `data-proxied-cite-icon` | `data-cite-icon` |
| `data-proxied-cite-thumbnail` | `data-cite-thumbnail` |

```html
<img
  src="https://proxy.example.com/img/aHR0cHM6Ly9leGFtcGxlLmNvbS9waG90by5qcGc"
  data-proxied-src="https://example.com/photo.jpg"
>
```

> [!NOTE]
> Attribute values are plain strings. Every URL field in the returned HTML has passed the [unsafe-URL floor](/guides/security): placeholders are written first, neutralized after.
