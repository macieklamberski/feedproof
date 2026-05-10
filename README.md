# Feedproof

[![codecov](https://codecov.io/gh/macieklamberski/feedproof/branch/main/graph/badge.svg)](https://codecov.io/gh/macieklamberski/feedproof)
[![npm version](https://img.shields.io/npm/v/feedproof.svg)](https://www.npmjs.com/package/feedproof)
[![license](https://img.shields.io/npm/l/feedproof.svg)](https://github.com/macieklamberski/feedproof/blob/main/LICENSE)


Improve and normalize HTML content inside feed entries. Fix feed-specific quirks so content displays in its best possible form.

Feedproof takes raw feed item HTML and runs it through a pipeline that genuinely improves the output: fixing lazy-loaded images so they actually render, resolving relative URLs to absolute, stripping tracking parameters and pixels for privacy, highlighting code blocks, normalizing broken markup from common feed quirks, auto-linking bare URLs, and converting embeds into framework-agnostic placeholders. It ships with sensible defaults and built-in platform support for YouTube, Vimeo, Spotify, and SoundCloud.

## Installation

```bash
npm install feedproof
```

## Quick Start

```typescript
import { transformContent } from 'feedproof'

const result = transformContent('<p>Check <img data-src="photo.jpg"> and visit /about</p>', {
  baseUrl: 'https://example.com/post/1',
})
```

## Transforms

Inventory of every transform exported from the package. Most are enabled by default; pass a custom `stringTransforms` / `domTransforms` array via `transformContent` options to override.

| Transform | Description |
| --- | --- |
| `stripOrphanedClosingTags` | Remove unmatched `</p>` / `</div>` close tags |
| `decodeDoubleEncodedTags` | Decode `&lt;tag&gt;` back to `<tag>` in mixed content |
| `unwrapWrappers` | Remove outer `<div>`, `<article>`, `<section>` wrappers |
| `paragraphizePlainText` | Wrap plain text in `<p>` tags |
| `stripEmptyTags` | Remove empty `<p>`, `<div>`, `<span>` and other tags |
| `stripComments` | Remove HTML `<!-- comments -->` |
| `fixLazyImages` | Move `data-src` / `data-original` to real `src` |
| `resolveRelativeUrls` | Convert relative URLs to absolute using base URL |
| `unwrapRedirectUrls` | Remove Google/Facebook/Outlook/etc. redirect wrappers |
| `stripTrackingParams` | Remove UTM and other tracking parameters |
| `removeTrackingPixels` | Strip 1×1 tracking pixel images |
| `stripInterBlockBreaks` | Remove `<br>` tags between block elements |
| `stripParagraphBoundaryBreaks` | Remove `<br>` tags adjacent to paragraph boundaries |
| `highlightCode` | Syntax-highlight `<code>` blocks with highlight.js |
| `mergeConsecutiveOneLinerPres` | Merge consecutive single-line `<pre>` tags |
| `replacePreLineBreaks` | Replace `<br>` with `\n` inside `<pre>` |
| `trimPreWhitespace` | Remove common leading indentation from `<pre>` |
| `linkifyUrls` | Wrap bare URLs in `<a>` tags |
| `replaceEmbedsWithPlaceholders` | Convert `<iframe>` to embed placeholders |
| `injectEnclosureEmbedPlaceholders` | Add audio/video enclosures to content |
| `simplifyFigures` | Unwrap `<figure>` when the figcaption is empty or redundant |

## Options

```typescript
import { fixLazyImages, resolveRelativeUrls, transformContent } from 'feedproof'

const result = transformContent(html, {
  // Base URL for resolving relative URLs.
  baseUrl: 'https://example.com/post/1',
  // Feed item enclosures (audio/video).
  enclosures: [{ url: 'https://example.com/audio.mp3', type: 'audio/mpeg' }],
  // Run a custom DOM transform pipeline (omit to use defaults).
  domTransforms: [fixLazyImages, resolveRelativeUrls],
})
```

The `stringTransforms`, `domTransforms`, and `finalStringTransforms` options each fully replace the corresponding default phase when provided. Every transform is also exported individually from `feedproof`, so you can compose any pipeline — list them explicitly to build from scratch, or spread `defaultDomTransforms` (etc.) from `feedproof/defaults` to extend or filter the defaults.
