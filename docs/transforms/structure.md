---
title: "Transforms: Text and Structure"
---

# Text and Structure

Prose in feeds arrives as `<br>`-separated runs, bare inline text, fake-indented paragraphs, fragmented lists, and layers of presentational wrappers. These transforms rebuild proper block structure so the reader styles paragraphs, headings, lists, and tables instead of guessing at them.

### decodeDoubleEncodedTags

Decodes HTML that a buggy feed generator entity-escaped, so it shipped as visible text instead of markup. Only a whole escaped fragment is decoded; an escaped tag embedded in prose is ambiguous and stays text. Escaped `<pre>`/`<code>` samples decode into real code blocks with their contents re-escaped, so a tutorial's tags show as text.

**Before**

```html
<p>&lt;p&gt;It was a good year.&lt;/p&gt;</p>
```

**After**

```html
<p>It was a good year.</p>
```

### convertBreaksToParagraphs

Splits text separated by double `<br>` into real paragraphs. Newsletter platforms and older editors emit whole articles as one block with `<br><br>` between thoughts, which defeats paragraph spacing and text-flow styling.

**Before**

```html
<div>First thought.<br><br>Second thought.</div>
```

**After**

```html
<div><p>First thought.</p><p>Second thought.</p></div>
```

### wrapBareInlineInParagraphs

Wraps runs of bare inline content sitting directly in a block container into `<p>`. Standalone media at a run's edge stays outside the paragraph, so images keep their own block styling instead of being glued to the text.

**Before**

```html
<div>Some text <b>with bold</b><img src="https://example.com/photo.jpg"></div>
```

**After**

```html
<div><p>Some text <b>with bold</b></p><img src="https://example.com/photo.jpg"></div>
```

### stripLeadingIndentation

Strips a leading whitespace run from a block when it contains a non-collapsing space. Some feeds fake indentation with `&nbsp;&nbsp;&nbsp;` at the start of paragraphs, which renders as a ragged left edge. Ordinary leading whitespace collapses in the browser anyway and is left alone.

**Before**

```html
<p>&nbsp;&nbsp;&nbsp;Lorem ipsum dolor.</p>
```

**After**

```html
<p>Lorem ipsum dolor.</p>
```

### stripInterBlockBreaks

Removes `<br>` sitting between block elements, where it stacks extra empty lines on top of the blocks' own margins. A `<br>` after an emoji-sized image is kept: there it is a break the author meant.

**Before**

```html
<p>First.</p><br><p>Second.</p>
```

**After**

```html
<p>First.</p><p>Second.</p>
```

### stripBoundaryBreaks

Removes `<br>` at the very start or end of a block element, where it pads the block with a blank line. Structural cells (`td`, `th`, `dt`, `dd`) are exempt, so an intentionally empty table cell is not emptied further and deleted.

**Before**

```html
<p><br>Lorem ipsum.<br></p>
```

**After**

```html
<p>Lorem ipsum.</p>
```

### stripMarkdownEscapeBackslashes

Removes a Markdown escape backslash leaked at the very start of a paragraph. A `\` mid-text or before a `<br>` is left alone, since there it is overwhelmingly real content: Windows paths, shell line continuations, LaTeX.

**Before**

```html
<p>\ Let's say you have a plan.</p>
```

**After**

```html
<p> Let's say you have a plan.</p>
```

### stripDuplicateTitleHeading

Removes the content's first heading when it repeats the item title. Requires the `articleTitle` option; without it the transform does nothing. Readers render the title themselves, so the duplicated heading shows the same text twice.

**Before** (with `articleTitle: 'A Good Year'`)

```html
<h1>A Good Year</h1><p>It was.</p>
```

**After**

```html
<p>It was.</p>
```

### demoteHeadings

Shifts every heading down one level (`h1`→`h2`, …, `h5`→`h6`) when the content contains an `<h1>`. The reader's page already has an `<h1>`, the item title, so a body-level `<h1>` breaks the document outline. Bodies that already start at `<h2>` are left alone.

**Before**

```html
<h1>Section</h1><h2>Subsection</h2>
```

**After**

```html
<h2>Section</h2><h3>Subsection</h3>
```

### unwrapHeadingBold

Unwraps a `<b>`/`<strong>` that spans a heading's entire content. Headings are already bold; the extra wrapper only interferes with heading styling.

**Before**

```html
<h2><strong>Setup</strong></h2>
```

**After**

```html
<h2>Setup</h2>
```

### unwrapDoublyNestedLists

Dissolves a list whose only item wraps another list of the same kind, a double-nesting some editors emit that renders as one over-indented list.

**Before**

```html
<ul><li><ul><li>Item</li></ul></li></ul>
```

**After**

```html
<ul><li>Item</li></ul>
```

### mergeFragmentedLists

Merges runs of consecutive sibling lists that share tag and attributes into one list. Some feeds emit each list item as its own one-item `<ul>`, which renders with a gap between every item.

**Before**

```html
<ul><li>First</li></ul>
<ul><li>Second</li></ul>
```

**After**

```html
<ul><li>First</li><li>Second</li></ul>
```

### wrapTablesForScroll

Wraps every top-level `<table>` in `<div data-table>` so a wide table can scroll horizontally inside the wrapper instead of stretching the page. Tables nested inside another table are skipped.

**Before**

```html
<table><tr><td>Cell</td></tr></table>
```

**After**

```html
<div data-table><table><tr><td>Cell</td></tr></table></div>
```

### stripEmptyTags

Removes elements with no text and no meaningful children: empty spans, `<div>&nbsp;</div>` spacers, husks left by earlier transforms. Media elements, void elements, and structural cells survive: an empty `<td>` keeps its column aligned, an `<img>` carries its content in `src`.

**Before**

```html
<p>Text</p><p></p><div>&nbsp;</div>
```

**After**

```html
<p>Text</p>
```

### unwrapWrappers

Dissolves purely presentational containers (`div`, `article`, `section`, `main`, `header`, `footer`), hoisting their children in place. Feedsweep's own generated wrappers (`data-embed-*`, `data-cite-*`, `data-table`, `data-pre`) are preserved, as are containers whose `id` is the target of an in-page link, since unwrapping those would break the link.

Two `<figure>` shapes go the same way: one holding nothing but a placeholder, which is the platform's own embed wrapper and has already had everything it stated read into the placeholder, and one reduced to a single text-only link. A figure with a caption, an image, or a second element beside its content is the author's grouping and stays. The pass repeats until nothing more dissolves, since a wrapper only becomes a sole child once the wrapper inside it is gone.

**Before**

```html
<div class="post-body"><p>Lorem ipsum.</p></div>
```

**After**

```html
<p>Lorem ipsum.</p>
```

### stripDuplicateRules

Collapses a run of consecutive `<hr>` into the first one. Runs arrive both authored (an editor emits the separator twice) and manufactured (the block between two rules was stripped earlier in the pipeline). It runs near the end of the pipeline, once every in-between block that will disappear has disappeared.

**Before**

```html
<p>Part one.</p><hr><hr><p>Part two.</p>
```

**After**

```html
<p>Part one.</p><hr><p>Part two.</p>
```

### fixSubstackMentions

Rebuilds a Substack inline @-mention, an empty `<span class="mention-wrap">` whose person lives only in a JSON attribute, into a visible profile link, so the name stops vanishing mid-sentence.

**Before**

```html
<p>Thanks to <span class="mention-wrap" data-attrs='{"name":"Jane Doe","id":123,"url":null}'></span> for the tip.</p>
```

**After**

```html
<p>Thanks to <a href="https://substack.com/profile/123">@Jane Doe</a> for the tip.</p>
```
