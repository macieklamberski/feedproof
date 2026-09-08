import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import {
  scribdFlashEmbedResolver,
  scribdFlashResolveEmbed,
  scribdIframeEmbedResolver,
  scribdResolveEmbed,
} from './scribd.js'

describeForEachParser('scribdIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, scribdIframeEmbedResolver)

  describe('the current share-panel iframe', () => {
    // The snippet states height="500" for every document. The ratio beside it is the one that
    // describes this document, so the placeholder carries the ratio instead.
    it('should prefer the stated ratio over the constant height', async () => {
      const value = html`
        <iframe
          class="scribd_iframe_embed"
          src="https://www.scribd.com/embeds/526446879/content"
          data-aspect-ratio="0.7729220222793488"
          scrolling="no"
          id="526446879"
          width="100%"
          height="500"
          frameborder="0"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'scribd',
        id: '526446879',
        src: 'https://www.scribd.com/embeds/526446879/content',
        url: 'https://www.scribd.com/document/526446879',
        ratio: '0.7729220222793488/1',
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep the declared height when the snippet states no ratio', async () => {
      const value = html`
        <iframe
          class="scribd_iframe_embed"
          src="https://www.scribd.com/embeds/526446879/content"
          width="100%"
          height="500"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'scribd',
        id: '526446879',
        src: 'https://www.scribd.com/embeds/526446879/content',
        url: 'https://www.scribd.com/document/526446879',
        height: 500,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should carry the document title the carrier states', async () => {
      const value = html`
        <iframe
          class="scribd_iframe_embed"
          title="Vermont Cynic Drug Issue 2026"
          src="https://www.scribd.com/embeds/526446879/content"
          width="100%"
          height="500"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'scribd',
        id: '526446879',
        src: 'https://www.scribd.com/embeds/526446879/content',
        url: 'https://www.scribd.com/document/526446879',
        title: 'Vermont Cynic Drug Issue 2026',
        height: 500,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should fall back to the declared height for a ratio that is not a number', async () => {
      const value = html`
        <iframe
          class="scribd_iframe_embed"
          src="https://www.scribd.com/embeds/526446879/content"
          data-aspect-ratio="portrait"
          height="500"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'scribd',
        id: '526446879',
        src: 'https://www.scribd.com/embeds/526446879/content',
        url: 'https://www.scribd.com/document/526446879',
        height: 500,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('the pre-2018 spelling', () => {
    it('should resolve a document named on the doc path', async () => {
      const value = '<iframe src="https://www.scribd.com/doc/108992419"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'scribd',
        id: '108992419',
        src: 'https://www.scribd.com/embeds/108992419/content',
        url: 'https://www.scribd.com/document/108992419',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  // Scribd's ids have been growing since 2008, and the length is not what names a document.
  describe('an id outside the lengths minted so far', () => {
    it('should resolve a document id longer than the ones in the wild', async () => {
      const value =
        '<iframe src="https://www.scribd.com/embeds/1089924191234567890/content"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'scribd',
        id: '1089924191234567890',
        src: 'https://www.scribd.com/embeds/1089924191234567890/content',
        url: 'https://www.scribd.com/document/1089924191234567890',
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined for the asset host, which serves no embed route', async () => {
      const value = html`
        <iframe src="https://html.scribdassets.com/doc/108992419"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a scribd url naming no document', async () => {
      const value = '<iframe src="https://www.scribd.com/explore"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a document id that is not numeric', async () => {
      const value = '<iframe src="https://www.scribd.com/document/my-document-slug"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for another host carrying the embeds path', async () => {
      const value = html`
        <iframe src="https://scribd.com.evil.test/embeds/526446879/content"></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('scribdFlashEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, scribdFlashEmbedResolver)

  // Flash has rendered nothing since 2020, so without this the placeholder points at the swf
  // itself. The repair is exact because the swf query names the document in the same id space
  // the modern route reads. The declared height carries over, since both generations of the
  // snippet state the same 500; the width is a percentage rather than a pixel count.
  describe('the iPaper viewer', () => {
    it('should repair the dead player to the modern document embed', async () => {
      const value = html`
        <object
          codetype="application/x-shockwave-flash"
          data="http://d1.scribdassets.com/ScribdViewer.swf?document_id=108992419&amp;access_key=key-13davbc"
          type="application/x-shockwave-flash"
          id="doc_349883993364249"
          height="500"
          width="100%"
        ></object>
      `
      const expected: EmbedResolverResult = {
        provider: 'scribd',
        id: '108992419',
        src: 'https://www.scribd.com/embeds/108992419/content',
        url: 'https://www.scribd.com/document/108992419',
        height: 500,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the same query off the embed half of the pair', async () => {
      const value = html`
        <embed
          type="application/x-shockwave-flash"
          src="http://d.scribd.com/ScribdViewer.swf?document_id=55715&amp;access_key=key-abc"
          width="100%"
          height="500"
        />
      `
      const expected: EmbedResolverResult = {
        provider: 'scribd',
        id: '55715',
        src: 'https://www.scribd.com/embeds/55715/content',
        url: 'https://www.scribd.com/document/55715',
        height: 500,
      }

      expect(await extract(value)).toEqual(expected)
    })

    // The earlier snippet leaves the swf url bare and names the document in the flashvars.
    it('should read the document off the flashvars when the swf query is bare', async () => {
      const value = html`
        <embed
          type="application/x-shockwave-flash"
          src="http://d1.scribdassets.com/ScribdViewer.swf"
          flashvars="document_id=41131710&amp;access_key=key-abc&amp;page=1&amp;viewMode=list"
          width="100%"
          height="600"
        />
      `
      const expected: EmbedResolverResult = {
        provider: 'scribd',
        id: '41131710',
        src: 'https://www.scribd.com/embeds/41131710/content',
        url: 'https://www.scribd.com/document/41131710',
        height: 600,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the document off a flashvars param whatever its case', async () => {
      const value = html`
        <object
          data="http://d1.scribdassets.com/ScribdViewer.swf"
          width="100%"
          height="600"
        >
          <param name="FlashVars" value="document_id=41131710&amp;access_key=key-abc" />
        </object>
      `
      const expected: EmbedResolverResult = {
        provider: 'scribd',
        id: '41131710',
        src: 'https://www.scribd.com/embeds/41131710/content',
        url: 'https://www.scribd.com/document/41131710',
        height: 600,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should return undefined when neither the swf query nor the flashvars name a document', async () => {
      const value = html`
        <object data="http://d1.scribdassets.com/ScribdViewer.swf?access_key=key-abc">
          <param name="flashvars" value="page=1&amp;viewMode=list" />
        </object>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for a document id outside the numeric shape', async () => {
      const value = html`
        <object data="http://d1.scribdassets.com/ScribdViewer.swf?document_id=../evil"></object>
      `

      expect(await extract(value)).toBeUndefined()
    })

    // The factory hands every carrier on a Scribd host to the Flash reader, including the
    // modern iframe's, so it has to refuse a url that is not the viewer. The document id sits
    // in the query here precisely so the path is the only thing that can reject it.
    it('should return undefined for a scribd url that is not the flash player', async () => {
      const value = html`
        <object
          data="https://www.scribd.com/embeds/526446879/content?document_id=108992419"
        ></object>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should return undefined for another host serving a viewer of the same name', async () => {
      const value = html`
        <object data="http://evil.test/ScribdViewer.swf?document_id=108992419"></object>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

describeForEachParser('scribdResolveEmbed', (parseHtml) => {
  const carrier = (): Element => {
    return parseHtml('<iframe></iframe>').querySelector('iframe') as Element
  }

  it('should ignore a url on another host', () => {
    const value = 'https://evil.test/embeds/526446879/content'

    expect(scribdResolveEmbed(value, carrier())).toBeUndefined()
  })

  it('should ignore a url that cannot be parsed', () => {
    const value = 'https://['

    expect(scribdResolveEmbed(value, carrier())).toBeUndefined()
  })
})

describe('scribdFlashResolveEmbed', () => {
  // The document id is present so the path is the only thing that can reject this: without it
  // the guard below would never be what returns undefined.
  it('should ignore a scribd url that is not the flash player', () => {
    const value = 'https://www.scribd.com/embeds/526446879/content?document_id=526446879'

    expect(scribdFlashResolveEmbed(value)).toBeUndefined()
  })

  it('should ignore a url that cannot be parsed', () => {
    const value = 'https://['

    expect(scribdFlashResolveEmbed(value)).toBeUndefined()
  })
})

// The enclosure probe offers every attachment a feed carries to these resolvers, and the asset
// host spells a document image as `img/document/{id}/…`, which the embed reader would take for a
// document url. Scoping it to the site's own host is what leaves the attachment as itself.
describeForEachParser('scribd through the pipeline', (parseHtml) => {
  const convert = (value: string, enclosures: Array<{ url: string; type: string }>) => {
    return transformContent(value, {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
      enclosures,
    })
  }

  it('should leave a document image enclosure an image', async () => {
    const enclosures = [
      {
        url: 'https://imgv2-1-f.scribdassets.com/img/document/108992419/149x198/abc/1234.jpg',
        type: 'image/jpeg',
      },
    ]

    const expected = html`
      <img data-enclosure="" src="https://imgv2-1-f.scribdassets.com/img/document/108992419/149x198/abc/1234.jpg">
      <p>Body</p>
    `

    expect(await convert('<p>Body</p>', enclosures)).toEqualHtml(expected)
  })

  it('should claim a document framed as an embed', async () => {
    const value = '<iframe src="https://www.scribd.com/doc/108992419"></iframe>'

    const expected = html`
      <div
        data-embed-url="https://www.scribd.com/document/108992419"
        data-embed-id="108992419"
        data-embed-provider="scribd"
        data-embed-src="https://www.scribd.com/embeds/108992419/content"
      ></div>
    `

    expect(await convert(value, [])).toEqualHtml(expected)
  })
})
