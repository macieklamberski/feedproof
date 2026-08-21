---
title: "Widgets: Cites"
---

# Cites

A cite is a link-preview card: a block in the source markup that presents another page with its title, description, and preview image. Blog platforms, WordPress themes, and forums each render these with their own markup; the `convertCiteCards` transform normalizes all of them into one `data-cite-*` placeholder.

Cites are read early in the pipeline, before prose normalization runs. A card's markup is delicate, and passes like link auto-detection or paragraph rewrapping would disturb it.

## Fields

Attributes are written in this order, and only when a value is present:

| Field | Description |
|-------|-------------|
| `data-cite-provider` | The markup dialect the card was read from (`ghost`, `discourse`, …) |
| `data-cite-description` | The linked page's description |
| `data-cite-caption` | Author-written caption accompanying the card |
| `data-cite-author` | The linked page's author |
| `data-cite-publisher` | The linked site's name |
| `data-cite-date` | The linked page's date |
| `data-cite-kind` | The kind of reference, where the markup states one |
| `data-cite-url` | The linked page, always present |
| `data-cite-title` | The linked page's title, always present |
| `data-cite-icon` | The linked site's favicon URL |
| `data-cite-thumbnail` | Preview image URL |

The placeholder is an empty `<div>`: a renderer builds the card from these attributes. See [Rendering](/output/rendering).

Card URLs pass through your [`cleanUrlFn`](/guides/customization/url-handling) even when they never sat in an anchor's `href`, and `data-cite-date` passes through your [`parseDateFn`](/reference/transform-content#options) so all cards carry dates in a format you chose. Without the hook the raw date string is kept.

### Description and Caption

Two fields carry text about the link, and they are not interchangeable. `data-cite-description` is the linked page's own preview text, the excerpt the platform scraped from it. `data-cite-caption` is the embedding author's note about the link, a Ghost bookmark's figcaption for instance. A card that shows both carries both, and most carry neither.

### Date

`data-cite-date` is whatever the card states, in whatever format it states it: an ISO timestamp where the source markup carries one, a site-formatted string like `2018.10.14` where it does not, since a card renders the blog's own date setting. So the value is displayable but not reliably parseable, which is what `parseDateFn` is for. A card showing only a partial date is skipped instead of guessed at: dev.to's "Jul 14" carries no year to recover.

### Kind

`data-cite-kind` is one of `bookmark`, `repost`, `like`, `reply`, `read`, `listen`, `watch`. It is set only where the source markup names the relationship, today only microformats markup, where the `h-cite` sits in a response property like `u-bookmark-of` or `p-in-reply-to`. Cards that are just "a preview of a link" carry no `kind`.

## Example

```html
<!-- Input: a Ghost bookmark card -->
<figure class="kg-card kg-bookmark-card">
  <a class="kg-bookmark-container" href="https://example.com/article">
    <div class="kg-bookmark-content">
      <div class="kg-bookmark-title">An Article Worth Reading</div>
      <div class="kg-bookmark-description">Why this topic matters more than you think.</div>
      <div class="kg-bookmark-metadata">
        <img class="kg-bookmark-icon" src="https://example.com/favicon.ico" alt="">
        <span class="kg-bookmark-author">Example Blog</span>
      </div>
    </div>
    <div class="kg-bookmark-thumbnail">
      <img src="https://example.com/cover.jpg" alt="">
    </div>
  </a>
</figure>

<!-- Output -->
<div
  data-cite-provider="ghost"
  data-cite-description="Why this topic matters more than you think."
  data-cite-publisher="Example Blog"
  data-cite-url="https://example.com/article"
  data-cite-title="An Article Worth Reading"
  data-cite-icon="https://example.com/favicon.ico"
  data-cite-thumbnail="https://example.com/cover.jpg"
></div>
```

## Built-in Resolvers

25 resolvers ship by default, each reading one platform's card markup.

### Blog Platforms

| Platform | Matches |
|----------|---------|
| Ghost | `.kg-bookmark-card` bookmark cards |
| Substack | Embedded own-post cards, cross-publication digest embeds, and the `substack-post-embed` snippet |
| Medium | Mixtape embeds (both the figure and bare-anchor forms) |
| Tumblr | NPF link blocks |
| note.com | External-article embed figures |
| dev.to | Link tags, embedded post cards, and the legacy embedded-link form |
| Paragraph | Embedly-based link cards |
| Ameba | OGP cards |
| Tistory | Open Graph source cards |
| Hatena | Embed-card iframes |

### WordPress Theme Blog Cards

Popular themes (widely used on Japanese-language blogs) render internal and external link previews as "blog cards", each with its own markup: Cocoon (`.blogcard-wrap`), Swell (`.p-blogCard`), TCD (`.cardlink`), Affinger (`.st-cardbox`), Pz-LinkCard (`.lkc-card`), and the generic `.blog-card` shape several themes share.

### Forums

| Platform | Matches |
|----------|---------|
| Discourse | Onebox link previews (`aside.onebox`) |
| XenForo | Unfurled-link blocks |
| NodeBB | Link previews |

Discourse's social-post oneboxes (a quoted tweet, for example) are deliberately not converted. A quoted post is not a link preview, and flattening it to a titled link would lose the post itself.

### Generic

| Source | Matches |
|--------|---------|
| Microformats | `.h-cite` markup; response properties set `data-cite-kind` |
| Embedly | `blockquote.embedly-card` embeds |

## How Resolvers Run

The pass works like the [widget pass](/widgets/embeds#how-resolvers-run), with one difference that matters. A cite resolver replaces the card it matches, so a later resolver never sees it, and the card's markup is gone whether or not the placeholder ended up carrying much. That is why a resolver returning nothing is the normal outcome: a card it cannot read a URL and a title from is left as the publisher wrote it, which still renders as a card, while a half-read placeholder would render as a link to nowhere.

Nothing here touches the network either. A URL a resolver returns is resolved against `baseUrl` and cleaned through your `cleanUrlFn` before it lands on the placeholder, so a resolver returns the URL as it found it in the markup. Fields the card cannot state at all are what [enrichment](/guides/customization/enrichment) is for.

A platform not listed here belongs in the library: [open an issue or a pull request](https://github.com/macieklamberski/feedsweep/issues).
