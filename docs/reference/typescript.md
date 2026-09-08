---
title: "Reference: Working with TypeScript"
---

# Working with TypeScript

Feedsweep is written in TypeScript and exports complete type definitions. The package is ESM-only.

## Type Imports

Import types alongside functions:

```typescript
import type { TransformContentOptions, WidgetResolver, Enclosure } from 'feedsweep'

import { transformContent } from 'feedsweep'
```

## Export Paths

The package has three entry points:

```typescript
// The main API: transformContent, every transform, the placeholder helpers, all types.
import { transformContent } from 'feedsweep'

// The default pipelines and the built-in lists, for composing a pipeline of your own.
import { defaultStandardDomTransforms } from 'feedsweep/defaults'

// The bundled linkedom parser (requires the optional linkedom peer dependency).
import { parseHtml } from 'feedsweep/linkedom'
```

## Typing Custom Options

Annotate hooks with their exported types to keep signatures in sync:

```typescript
import type { AssetProxyFn, IsSafeUrlFn } from 'feedsweep'

const assetProxyFn: AssetProxyFn = (url, type) => {
  return `https://proxy.example.com/${type}?url=${encodeURIComponent(url)}`
}

const isSafeUrlFn: IsSafeUrlFn = (url, role) => {
  return new URL(url).protocol === 'https:'
}
```

## Typing Custom Transforms

A transform is a curried function: it takes the context once and returns the per-document (or per-string) worker:

```typescript
import type { DomTransform } from 'feedsweep'

const markExternalLinks: DomTransform = (context) => {
  return (document) => {
    for (const anchor of document.querySelectorAll('a[href^="http"]')) {
      anchor.setAttribute('data-external', '')
    }
  }
}
```

See [Custom Transforms](/guides/customization/custom-transforms) for where to splice it into the pipeline.
