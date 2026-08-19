---
title: Quick Start
---

# Quick Start

Basic installation and common usage patterns.

## Installation

Feedsweep runs in Node, Bun, and modern browsers as an ES module.

Install the package using your preferred package manager:

::: code-group

```bash [npm]
npm install feedsweep linkedom
```

```bash [yarn]
yarn add feedsweep linkedom
```

```bash [pnpm]
pnpm add feedsweep linkedom
```

```bash [bun]
bun add feedsweep linkedom
```

:::

`linkedom` is an optional peer dependency. You only need it for the bundled `parseHtml` helper; see [DOM Parsing](/guides/customization/dom-parsing) for jsdom, happy-dom, and browser-native alternatives.

## Basic Usage

Pass the feed item's HTML and a DOM parser. Everything else has defaults.

```typescript
import { transformContent } from 'feedsweep'
import { parseHtml } from 'feedsweep/linkedom'

const html = await transformContent(item.content, {
  parseHtmlFn: parseHtml,
  baseUrl: item.url,
})
```

`baseUrl` is the item's permalink. It anchors relative URL resolution, so pass it whenever you have it.

## With Enclosures

Feeds often carry an episode's audio or video beside the HTML rather than inside it. Pass the enclosures and feedsweep injects them as playable elements:

```typescript
import { transformContent } from 'feedsweep'
import { parseHtml } from 'feedsweep/linkedom'

const html = await transformContent(item.content, {
  parseHtmlFn: parseHtml,
  baseUrl: item.url,
  enclosures: [{ url: 'https://example.com/episode.mp3', type: 'audio/mpeg' }],
})

// html now begins with:
// <audio src="https://example.com/episode.mp3" controls preload="none" data-enclosure></audio>
```

See [Enclosures](/guides/enclosures) for the full guide.

## Next Steps

- **[How It Works](/how-it-works).** The pipeline, its phases, and its guarantees.
- **[Transforms](/transforms).** The complete catalog of the 81 transforms.
- **[Widgets](/widgets).** How embeds and link cards become `data-*` placeholders.
- **[transformContent](/reference/transform-content).** Every option in one table.
