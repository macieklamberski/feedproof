---
title: "Customization: Custom Transforms"
---

# Customize Transforms

The pipeline itself is an option. `stringTransforms` and `domTransforms` accept your own transform arrays, and the runners `applyStringTransforms` and `applyDomTransforms` are exported for composing pipelines outside `transformContent` entirely.

## The Transform Shape

A transform is a factory: it receives the assembled context once and returns the function that does the work. That lets a transform read its options up front and return a no-op when it has nothing to do.

```typescript
type DomTransform = (context: TransformContext) => (document: Document) => void | Promise<void>

type StringTransform = (context: TransformContext) => (html: string) => string | Promise<string>
```

`TransformContext` is what the caller passed plus everything feedsweep supplies itself: the resolver registries, the attribute and selector lists, the resolved URL and highlighter functions. The array and function fields are guaranteed present. See [Types](/reference/types).

## Writing a DOM Transform

DOM transforms mutate the document in place:

```typescript
import type { DomTransform } from 'feedsweep'

const stripFootnoteBacklinks: DomTransform = () => {
  return (document) => {
    for (const anchor of document.querySelectorAll('a[href^="#fnref"]')) {
      anchor.remove()
    }
  }
}
```

A transform that reads context does it in the outer function:

```typescript
const markExternalLinks: DomTransform = (context) => {
  return (document) => {
    for (const anchor of document.querySelectorAll('a[href^="http"]')) {
      const href = anchor.getAttribute('href') ?? ''

      if (context.baseUrl && !href.startsWith(context.baseUrl)) {
        anchor.setAttribute('data-external', '')
      }
    }
  }
}
```

Transforms must not throw: an exception rejects the whole `transformContent` promise. They should also be idempotent: running a transform twice over its own output must equal running it once, since content sometimes passes through a pipeline more than once.

## Splicing Into the Default Pipeline

`domTransforms` replaces the whole pipeline, so adding one transform means rebuilding the array around the defaults:

```typescript
import { transformContent } from 'feedsweep'
import { defaultStandardDomTransforms } from 'feedsweep/defaults'

const output = await transformContent(html, {
  parseHtmlFn: parseHtml,
  domTransforms: [...defaultStandardDomTransforms, stripFootnoteBacklinks],
})
```

Appending is the safe default. Position matters when your transform interacts with others. A transform that adds media wants to run before the dimensioning and proxying passes; one that inspects final structure wants to run last. The ordering constraints between the built-ins are documented as comments in `src/defaults.ts`, and inserting relative to a named transform is straightforward:

```typescript
import { defaultStandardDomTransforms } from 'feedsweep/defaults'
import { convertWidgets } from 'feedsweep'

const index = defaultStandardDomTransforms.indexOf(convertWidgets)
const domTransforms = [
  ...defaultStandardDomTransforms.slice(0, index),
  myEmbedNormalizer,
  ...defaultStandardDomTransforms.slice(index),
]
```

> [!NOTE]
> Passing `domTransforms` explicitly also bypasses the `heuristics` flag, so splice in `heuristicDomTransforms` yourself if you want them too.

## Running Pipelines Directly

The runners `transformContent` uses internally are exported. They take the inner functions (context already applied), run them in order, and (for the DOM runner) return `document.body.innerHTML`:

```typescript
import { applyDomTransforms, applyStringTransforms } from 'feedsweep'

const afterString = await applyStringTransforms(html, [myStringFix(context)])
const document = parseHtml(afterString)
const output = await applyDomTransforms(document, [
  stripFootnoteBacklinks(context),
  markExternalLinks(context),
])
```

This is the escape hatch for consumers with their own pipeline architecture: feedsweep's transforms become a toolbox rather than a framework. Note that you assemble the `context` yourself in that case, and every transform expects the full `TransformContext` shape.

## String Transforms

String transforms run before parsing, on the raw HTML text. Reach for one only when the fix must happen before a parser sees the markup: mis-encoded tags, CDATA wrappers, oversized inline data. Everything else is easier and safer as a DOM transform. See [String Transforms](/transforms/string) for the built-ins.
