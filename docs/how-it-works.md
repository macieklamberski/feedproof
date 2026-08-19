---
title: How It Works
---

# How It Works

Feedsweep is a pure function over HTML. One call to [`transformContent`](/reference/transform-content) runs two phases and returns the transformed markup.

```
 raw item HTML
      │
      ▼
 string transforms ──── repair what must happen before parsing:
      │                 control chars, CDATA markers, oversized base64,
      │                 plain-text bodies paragraphized
      ▼
 parseHtmlFn ────────── your DOM parser (linkedom, jsdom, happy-dom, browser)
      │
      ▼
 DOM transforms ─────── 73 passes over the document, in a fixed order
      │
      ▼
 serialized <body>
```

## The Order Inside the DOM Phase

The DOM transforms run in a deliberate sequence. Three clusters matter for understanding the output:

1. **Recover first.** Facades and lazy-loading conventions are rebuilt into ordinary elements early: a `lite-youtube` element becomes a real `<iframe>`, a `data-src` becomes a `src`, a consent-gated embed gets its parked URL back. Everything downstream then treats them like any other media. See [Embed Recovery](/transforms/embeds).
2. **Read cards early, classify embeds late.** Link-preview cards are converted to [cite placeholders](/widgets/cites) before prose normalization can disturb their delicate markup. Iframes and players are classified into [embed placeholders](/widgets/embeds) near the end, after every rebuild has had a chance to produce one.
3. **Enforce invariants last.** URL safety, asset proxying, empty-tag removal, and table wrapping run at the end, so they cover everything earlier passes produced, placeholder attributes and injected enclosures included.

## Guarantees

- **No network requests.** Every transform works from the markup and the options alone. Anything that needs a round trip belongs in your [enrichment hooks](/guides/customization/enrichment).
- **No invented URLs.** Feedsweep promotes, resolves, and cleans URLs already present in the input. It never fabricates one that was not there.
- **Idempotent.** Running the pipeline on its own output produces the same result. Every transform is tested for this.
- **No exceptions from the pipeline.** Transforms do not throw on malformed input. Caller-supplied functions must honor the same contract: an exception from one of your hooks rejects the whole `transformContent` promise.
- **Deterministic.** Same input, same options, same output.

## What You Configure

The pipeline is an option, and so are the hooks around it: URL cleaning, asset proxying, safety policy, code highlighting, enrichment. `stringTransforms` and `domTransforms` replace their phase entirely when set, so extending the defaults means spreading them:

```typescript
import { transformContent } from 'feedsweep'
import { defaultStandardDomTransforms } from 'feedsweep/defaults'

const html = await transformContent(item.content, {
  parseHtmlFn: parseHtml,
  domTransforms: [...defaultStandardDomTransforms, myTransform],
})
```

What feedsweep knows about the feed landscape is not configurable: the platforms it recognizes, the hosts it treats as trackers, the selectors it strips as chrome, the attributes lazy loaders park a URL in. Each entry was measured against a corpus of real feeds, and a list a caller can replace is a list that drifts from that measurement. See [What's Built In](/guides/built-in).

## What Stays Out of Scope

Feedsweep is not a sanitizer and not a content extractor. It does not enforce tag allowlists, so keep an HTML sanitizer in your pipeline ([Security](/guides/security)), and it assumes the input is already an extracted feed item, not a full web page with navigation to strip.
