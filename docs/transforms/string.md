---
title: "Transforms: String Transforms"
---

# String Transforms

String transforms run on the raw HTML text, before any DOM exists. They handle problems that must be fixed before parsing, or that only exist before parsing.

### stripControlChars

Removes control characters and Unicode noncharacters from the text: C0 controls (except tab, LF, and CR), DEL and the C1 range, and the code points Unicode reserves for internal use. These characters truncate DOM text nodes, trigger terminal escapes, or break clipboard handling downstream. Legitimate whitespace is preserved.

### stripOversizedBase64Sources

Drops a base64 `data:` payload from `src`, `srcset`, or `poster` when the attribute exceeds 50 KB. Inline base64 images can be megabytes of text that bloat DOM memory; the attribute stays, the payload goes.

**Before**

```html
<img src="data:image/png;base64,[3 MB of text]">
```

**After**

```html
<img src="">
```

### unwrapCdataComments

Unwraps `<!--[CDATA[…]]-->` blocks. WordPress and similar CMSes serialize CDATA sections as HTML comments; without unwrapping, comment stripping would erase the article body.

**Before**

```html
<!--[CDATA[<p>The whole article body.</p>]]-->
```

**After**

```html
<p>The whole article body.</p>
```

### unwrapCdataMarkers

Unwraps a value that is one whole literal `<![CDATA[…]]>` block, the result of a feed entity-escaping the CDATA markers themselves. Only fires when a single block spans the entire value, so a bare `<![CDATA[` in the middle of content (an XML tutorial, for example) survives verbatim.

**Before**

```html
<![CDATA[<p>The whole article body.</p>]]>
```

**After**

```html
<p>The whole article body.</p>
```

### paragraphizePlainText

Turns tag-less plain text into HTML: double newlines split paragraphs, single newlines become `<br />`. Content containing any tag passes through untouched, since the HTML-aware paragraph work belongs to the DOM transforms.

**Before**

```html
First paragraph.

Second paragraph,
with a line break.
```

**After**

```html
<p>First paragraph.</p>
<p>Second paragraph,<br />
with a line break.</p>
```
