---
title: "Customization: Enrichment"
---

# Customize Enrichment

Resolvers extract only what the markup carries. Enrichment fills in the rest, a thumbnail the card never named or a title only the platform's API knows, through two optional batch hooks that run after the placeholders exist. This is the one place in the pipeline where network calls belong; every resolver's `extract` stays pure.

## enrichEmbedFn

Called once per document with every embed placeholder that has both a provider and an id:

```typescript
type EnrichEmbedFn = (
  embeds: Array<{ provider: string; id: string }>,
) => MaybePromise<Array<Partial<EmbedResolverResult> | undefined>>
```

The answer is positional: one entry per embed sent, in the same order, the way `Promise.all` returns. An entry is whatever was found for that embed, or `undefined` for nothing, which leaves the placeholder as it was.

```typescript
const output = await transformContent(html, {
  parseHtmlFn: parseHtml,
  enrichEmbedFn: async (embeds) => {
    return Promise.all(
      embeds.map(async ({ provider, id }) => {
        const metadata = await fetchOEmbed(provider, id)

        return metadata && { title: metadata.title, thumbnail: metadata.thumbnail_url }
      }),
    )
  },
})
```

The single batched call is what lets an implementation deduplicate lookups, hit a cache, or fan out requests however it likes. Reassembling a batched response back into input order is the implementation's job, since only it knows how it batched.

The id is enough to rebuild the platform's endpoint on its own, which is why TikTok's carries the handle beside the video id.

## enrichCiteFn

The cite counterpart, with the same positional contract:

```typescript
type EnrichCiteFn = (
  cites: Array<{ provider: string; url: string }>,
) => MaybePromise<Array<Partial<CiteResolverResult> | undefined>>
```

Two placeholders citing one URL arrive as two entries and expect two answers. An implementation that fetches each URL once fills both slots from the one result.

The provider names the platform the card was scraped from, not the linked page, so two cards from different platforms pointing at one URL are the same cite. It stays in the payload because an implementation still dispatches on it.

A date returned by either hook passes through [`parseDateFn`](/reference/transform-content#options), the same way a resolver-extracted one does.

## What Enrichment Can and Cannot Do

- **It overwrites.** A field the hook returns replaces whatever the resolver read off the markup: the platform's own API answering about this exact embed beats a guess derived from a URL. Fields the hook leaves out keep the resolver's values.
- **Size moves as a unit.** An enriched width and height clear any ratio the resolver stated, and an enriched ratio clears its dimensions, so a placeholder never states a box nobody measured. See [Embeds](/widgets/embeds#size-dimensions-or-ratio).
- **It cannot add fields outside the schema.** The returned metadata is mapped through the same closed field set as resolver results, so passing a whole API payload through is safe: unknown keys are dropped, and no value can become an attribute name.
- **Its URLs are prepared like a resolver's.** A relative URL in the payload is resolved against `baseUrl`, the canonical `url` is cleaned through your [`cleanUrlFn`](/guides/customization/url-handling#cleanurlfn), and a `date` goes through `parseDateFn`. So a hook returns what its API gave it and nothing more.
- **A URL that cannot resolve is dropped where the field can afford it.** An embed's `src` and `url` are dropped, since the placeholder still carries every other field. A thumbnail, an icon, an avatar or a cite's `url` is kept as it arrived, because refusing it removes the last trace of something.
- **It cannot escape the safety passes.** Enrichment runs before `neutralizeUnsafeUrls` and `proxyAssetUrls`, so enriched URLs are still checked against the scheme floor and rewritten by your [asset proxy](/guides/customization/url-handling#assetproxyfn).

## When to Skip It

Both hooks default to unset, and the enrichment transforms no-op without them. Placeholders remain fully renderable from markup-extracted metadata alone. Enrichment is for consumers that want richer previews and are willing to pay the round trips for them.
