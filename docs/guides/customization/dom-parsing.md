---
title: "Customization: DOM Parsing"
---

# Customize DOM Parsing

Feedsweep is parser-agnostic: it never bundles a DOM implementation. The `parseHtmlFn` option, the only required one, tells `transformContent` how to turn the pre-processed HTML string into a `Document` the DOM transforms then operate on.

```typescript
type ParseHtmlFn = (html: string) => Document | Promise<Document>
```

Any spec-compliant DOM works: linkedom, jsdom, happy-dom, or the browser's own `DOMParser`.

## linkedom

The lightest option, and the one feedsweep ships a helper for. Install `linkedom` (an optional peer dependency) and import `parseHtml` from the `feedsweep/linkedom` subpath:

```typescript
import { transformContent } from 'feedsweep'
import { parseHtml } from 'feedsweep/linkedom'

const output = await transformContent(html, { parseHtmlFn: parseHtml })
```

The helper is not a plain `parseHTML` call. It bakes in two adjustments:

- **Attribute names are lowercased at parse time.** linkedom preserves attribute case ([linkedom#235](https://github.com/WebReflection/linkedom/issues/235)), so `<img SRC="…">` would be invisible to a transform reading `src`. The helper folds every attribute name to lowercase once, first occurrence winning, so all transforms read attributes by their canonical name.
- **Self-closed SVG tags are expanded.** linkedom parses SVG subtrees in HTML mode ([linkedom#326](https://github.com/WebReflection/linkedom/issues/326)), where a self-close on a non-void element is ignored and following siblings become children. The helper expands `<path … />` into `<path …></path>` inside `<svg>` blocks before parsing.

> [!WARNING]
> One linkedom limitation is not worked around: camelCase SVG element names are lowercased, so `<linearGradient>` serializes as `<lineargradient>` and browsers won't render the gradient or filter. If your feeds carry inline SVG that must survive verbatim, parse with jsdom instead.

## jsdom

Heavier, but fully case-preserving, camelCase SVG elements included:

```typescript
import { transformContent } from 'feedsweep'
import { JSDOM } from 'jsdom'

const output = await transformContent(html, {
  parseHtmlFn: (html) => new JSDOM(html).window.document,
})
```

The feedsweep test suite runs the whole pipeline against both linkedom and jsdom, so either is a first-class choice.

## happy-dom

```typescript
import { transformContent } from 'feedsweep'
import { Window } from 'happy-dom'

const output = await transformContent(html, {
  parseHtmlFn: (html) => {
    const window = new Window()
    window.document.body.innerHTML = html
    return window.document
  },
})
```

## Browser

In a browser there is nothing to install:

```typescript
import { transformContent } from 'feedsweep'

const output = await transformContent(html, {
  parseHtmlFn: (html) => new DOMParser().parseFromString(html, 'text/html'),
})
```

## Which One?

- **linkedom.** Fastest and smallest; the right default for servers processing many items.
- **jsdom.** When inline SVG fidelity matters, or you already have jsdom loaded.
- **Browser `DOMParser`.** When transforming client-side.

Whatever the parser, `transformContent` returns `document.body.innerHTML` after the last transform, so the parser choice never changes the output contract.
