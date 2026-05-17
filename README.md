# Feedsweep

[![codecov](https://codecov.io/gh/macieklamberski/feedsweep/branch/main/graph/badge.svg)](https://codecov.io/gh/macieklamberski/feedsweep)
[![npm version](https://img.shields.io/npm/v/feedsweep.svg)](https://www.npmjs.com/package/feedsweep)
[![license](https://img.shields.io/npm/l/feedsweep.svg)](https://github.com/macieklamberski/feedsweep/blob/main/LICENSE)

Tidy up the HTML content in web feeds. Fix feed-specific quirks so content displays in its best possible form.

Feedsweep takes raw feed item HTML and runs it through a pipeline that genuinely improves the output: fixing lazy-loaded images so they actually render, resolving relative URLs to absolute, stripping tracking parameters and pixels for privacy, highlighting code blocks, normalizing broken markup from common feed quirks, auto-linking bare URLs, and converting embeds into framework-agnostic placeholders. It ships with sensible defaults and built-in support for YouTube and other popular platforms.

## Installation

```bash
npm install feedsweep
```

## Quick Start

```typescript
import { transformContent } from 'feedsweep'

const result = transformContent('<p>Check <img data-src="photo.jpg"> and visit /about</p>', {
  baseUrl: 'https://example.com/post/1',
})
```

## Transforms

Inventory of every transform exported from the package. Most are enabled by default; pass a custom `stringTransforms` / `domTransforms` array via `transformContent` options to override.

| Transform | Description |
| --- | --- |
| `decodeDoubleEncodedTags` | Decode `&lt;tag&gt;` back to `<tag>` in mixed content |
| `stripOrphanedClosingTags` | Remove unmatched `</p>` / `</div>` close tags |
| `stripDeadAnchors` | Unwrap `<a>` with empty, `#`, or `javascript:` href |
| `fixLazyImages` | Move `data-src` / `data-original` to real `src` |
| `mergeConsecutiveOneLinerPres` | Merge consecutive single-line `<pre>` tags |
| `replacePreLineBreaks` | Replace `<br>` with `\n` inside `<pre>` |
| `stripInterBlockBreaks` | Remove `<br>` tags between block elements |
| `stripParagraphBoundaryBreaks` | Remove `<br>` tags adjacent to paragraph boundaries |
| `simplifyFigures` | Unwrap `<figure>` when the figcaption is empty or redundant |
| `unwrapRedirectUrls` | Remove Google/Bing/Facebook/etc. redirect wrappers |
| `removeTrackingPixels` | Strip 1×1 tracking pixel images |
| `stripTrackingParams` | Remove UTM and other tracking parameters |
| `injectEnclosures` | Inject feed enclosures into content as native `<audio>`/`<video>` or iframe placeholders |
| `replaceEmbedsWithPlaceholders` | Convert `<iframe>` to embed placeholders |
| `proxyAssetUrls` | Rewrite image, video, and audio URLs through a caller-supplied proxy |
| `resolveRelativeUrls` | Convert relative URLs to absolute using base URL |
| `unwrapWrappers` | Remove outer `<div>`, `<article>`, `<section>` wrappers |
| `paragraphizePlainText` | Wrap plain text in `<p>` tags |
| `linkifyUrls` | Wrap bare URLs in `<a>` tags |
| `trimPreWhitespace` | Remove common leading indentation from `<pre>` |
| `highlightCode` | Syntax-highlight `<code>` blocks with highlight.js |
| `stripEmptyTags` | Remove empty `<p>`, `<div>`, `<span>` and other tags |
| `stripComments` | Remove HTML `<!-- comments -->` |

## Options

```typescript
import { fixLazyImages, resolveRelativeUrls, transformContent } from 'feedsweep'

const result = transformContent(html, {
  // Base URL for resolving relative URLs.
  baseUrl: 'https://example.com/post/1',
  // Feed item enclosures (audio/video).
  enclosures: [{ url: 'https://example.com/audio.mp3', type: 'audio/mpeg' }],
  // Route image/video/audio URLs through a proxy. Return `undefined` to leave a URL untouched.
  assetProxyFn: (url, type) => `https://proxy.example.com/?type=${type}&url=${encodeURIComponent(url)}`,
  // Run a custom DOM transform pipeline (omit to use defaults).
  domTransforms: [fixLazyImages, resolveRelativeUrls],
})
```

The `stringTransforms`, `domTransforms`, and `finalStringTransforms` options each fully replace the corresponding default phase when provided. Every transform is also exported individually from `feedsweep`, so you can compose any pipeline — list them explicitly to build from scratch, or spread `defaultDomTransforms` (etc.) from `feedsweep/defaults` to extend or filter the defaults.
