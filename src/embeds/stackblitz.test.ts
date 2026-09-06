import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { stackblitzIframeEmbedResolver, stackblitzResolveEmbed } from './stackblitz.js'

// Every `data-embed-*` field the placeholder carries, for the shapes that only resolve once the
// pipeline has repaired them and so cannot be asserted on the resolver alone.
const readPlaceholder = (
  result: string,
  parseHtml: (value: string) => Document,
): Record<string, string> => {
  const element = parseHtml(result).querySelector('[data-embed-src]')
  const fields: Record<string, string> = {}

  for (const name of element?.getAttributeNames() ?? []) {
    const value = element?.getAttribute(name)

    if (name.startsWith('data-embed-') && value) {
      fields[name.replace('data-embed-', '')] = value
    }
  }

  return fields
}

describe('stackblitzResolveEmbed', () => {
  describe('happy paths', () => {
    it('should build the placeholder from a project url', () => {
      const value = 'https://stackblitz.com/edit/angular-ivy-snow'
      const expected: EmbedResolverResult = {
        provider: 'stackblitz',
        id: 'angular-ivy-snow',
        src: 'https://stackblitz.com/edit/angular-ivy-snow',
        url: 'https://stackblitz.com/edit/angular-ivy-snow',
        height: 500,
      }

      expect(stackblitzResolveEmbed(value)).toEqual(expected)
    })

    it('should keep the query that chooses the open file and the pane', () => {
      const value =
        'https://stackblitz.com/edit/angular-ivy-snow?embed=1&file=src%2Fmain.ts&view=preview'
      const expected: EmbedResolverResult = {
        provider: 'stackblitz',
        id: 'angular-ivy-snow',
        src: 'https://stackblitz.com/edit/angular-ivy-snow?embed=1&file=src%2Fmain.ts&view=preview',
        url: 'https://stackblitz.com/edit/angular-ivy-snow',
        height: 500,
      }

      expect(stackblitzResolveEmbed(value)).toEqual(expected)
    })

    it('should read a slug ending in the hash a generated project carries', () => {
      const value = 'https://stackblitz.com/edit/vitejs-vite-jfnozz?embed=1&file=index.html'
      const expected: EmbedResolverResult = {
        provider: 'stackblitz',
        id: 'vitejs-vite-jfnozz',
        src: 'https://stackblitz.com/edit/vitejs-vite-jfnozz?embed=1&file=index.html',
        url: 'https://stackblitz.com/edit/vitejs-vite-jfnozz',
        height: 500,
      }

      expect(stackblitzResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore the host root, which names no project', () => {
      expect(stackblitzResolveEmbed('https://stackblitz.com/')).toBeUndefined()
    })

    it('should ignore an author page', () => {
      expect(stackblitzResolveEmbed('https://stackblitz.com/@trungvose')).toBeUndefined()
    })

    it('should ignore a foreign host carrying the same path', () => {
      const value = 'https://evil.test/stackblitz.com/edit/angular-ivy-snow'

      expect(stackblitzResolveEmbed(value)).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('should ignore the edit route with no slug behind it', () => {
      expect(stackblitzResolveEmbed('https://stackblitz.com/edit')).toBeUndefined()
    })
  })

  describe('the retired preview route', () => {
    it('should mint the dead run url onto the edit route that still serves the project', () => {
      const value = 'https://stackblitz.com/run/angular-ivy-snow'
      const expected: EmbedResolverResult = {
        provider: 'stackblitz',
        id: 'angular-ivy-snow',
        src: 'https://stackblitz.com/edit/angular-ivy-snow',
        url: 'https://stackblitz.com/edit/angular-ivy-snow',
        height: 500,
      }

      expect(stackblitzResolveEmbed(value)).toEqual(expected)
    })

    it('should carry the publisher layout across the repair', () => {
      const value = 'https://stackblitz.com/run/angular-ivy-snow?embed=1&view=preview'
      const expected: EmbedResolverResult = {
        provider: 'stackblitz',
        id: 'angular-ivy-snow',
        src: 'https://stackblitz.com/edit/angular-ivy-snow?embed=1&view=preview',
        url: 'https://stackblitz.com/edit/angular-ivy-snow',
        height: 500,
      }

      expect(stackblitzResolveEmbed(value)).toEqual(expected)
    })

    it('should ignore the bare run route, which redirects to the home page', () => {
      expect(stackblitzResolveEmbed('https://stackblitz.com/run?embed=1')).toBeUndefined()
    })
  })

  describe('shapes that name no project', () => {
    it('should refuse a repository embed, which the oEmbed endpoint cannot look up', () => {
      const value = 'https://stackblitz.com/github/okikio/astro-form-data/main?embed=1'

      expect(stackblitzResolveEmbed(value)).toBeUndefined()
    })

    it('should refuse the fork-on-load repository route', () => {
      const value = 'https://stackblitz.com/fork/github/vuejs/core?embed=1'

      expect(stackblitzResolveEmbed(value)).toBeUndefined()
    })

    // A slug carries dots, so a filename passes the slug test. The enclosure probe reads this same
    // url shape, so a media file on the host would otherwise take the place of a playable element.
    it.each([
      'https://stackblitz.com/edit/angular-ivy-snow.mp3',
      'https://stackblitz.com/edit/angular-ivy-snow.mp4',
      'https://stackblitz.com/edit/angular-ivy-snow.pdf',
      'https://stackblitz.com/edit/angular-ivy-snow.jpg',
    ])('should refuse the file name %s', (value) => {
      expect(stackblitzResolveEmbed(value)).toBeUndefined()
    })
  })
})

describeForEachParser('stackblitzIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, stackblitzIframeEmbedResolver)

  describe('happy paths', () => {
    it('should take the name out of the stated title', async () => {
      const value = html`
        <iframe
          src="https://stackblitz.com/edit/angular-ivy-snow?embed=1&amp;file=src%2Fmain.tsx"
          width="100%"
          height="500"
          title="Angular Ivy Snow"
          allow="cross-origin-isolated"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'stackblitz',
        id: 'angular-ivy-snow',
        src: 'https://stackblitz.com/edit/angular-ivy-snow?embed=1&file=src%2Fmain.tsx',
        url: 'https://stackblitz.com/edit/angular-ivy-snow',
        title: 'Angular Ivy Snow',
        height: 500,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep the height the publisher laid out over the share dialog default', async () => {
      const value = html`
        <iframe
          class="iframe-full-w"
          src="https://stackblitz.com/edit/angular-editable-textbox?view=preview"
          height="423"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'stackblitz',
        id: 'angular-editable-textbox',
        src: 'https://stackblitz.com/edit/angular-editable-textbox?view=preview',
        url: 'https://stackblitz.com/edit/angular-editable-textbox',
        height: 423,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should read the project out of an embed element', async () => {
      const value = html`
        <embed
          src="https://stackblitz.com/edit/vitejs-vite-v6ih3h?embed=1&amp;file=index.html"
        />
      `
      const expected: EmbedResolverResult = {
        provider: 'stackblitz',
        id: 'vitejs-vite-v6ih3h',
        src: 'https://stackblitz.com/edit/vitejs-vite-v6ih3h?embed=1&file=index.html',
        url: 'https://stackblitz.com/edit/vitejs-vite-v6ih3h',
        height: 500,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', async () => {
      const value = '<iframe src="https://evil.test/stackblitz.com/edit/angular-ivy-snow"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a lookalike host', async () => {
      const value = '<iframe src="https://stackblitz.com.evil.test/edit/angular-ivy-snow"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a running preview served on the projects host', async () => {
      const value = '<iframe src="https://native-elements.stackblitz.io/"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('shapes that name no project', () => {
    it('should leave a repository embed to the generic fallback', async () => {
      const value = html`
        <iframe
          class="w-full"
          src="https://stackblitz.com/github/okikio/astro-form-data/main?embed=1"
          height="600"
        ></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })
  })
})

// The Embedly wrapper only names the project after an earlier pass has decoded its query, so the
// assertion belongs at the end of the pipeline.
describeForEachParser('stackblitz shapes the pipeline repairs first', (parseHtml) => {
  const convert = (value: string): Promise<string> => {
    return transformContent(value, { parseHtmlFn: parseHtml, baseUrl: 'https://example.com/post' })
  }

  const placeholder = async (value: string): Promise<Record<string, string>> => {
    return readPlaceholder(await convert(value), parseHtml)
  }

  it('should resolve the project Embedly proxies for Medium and Substack', async () => {
    const value = html`
      <iframe
        class="embedly-embed"
        src="https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fstackblitz.com%2Fedit%2Fangular-ivy-snow%3Fembed%3D1&amp;url=https%3A%2F%2Fstackblitz.com%2Fedit%2Fangular-ivy-snow&amp;type=text%2Fhtml&amp;schema=stackblitz"
        width="600"
        height="400"
      ></iframe>
    `
    const expected: Record<string, string> = {
      src: 'https://stackblitz.com/edit/angular-ivy-snow?embed=1',
      provider: 'stackblitz',
      id: 'angular-ivy-snow',
      url: 'https://stackblitz.com/edit/angular-ivy-snow',
      height: '500',
    }

    expect(await placeholder(value)).toEqual(expected)
  })

  it('should not leave the Embedly wrapper behind', async () => {
    const value = html`
      <iframe
        class="embedly-embed"
        src="https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fstackblitz.com%2Fedit%2Fangular-ivy-snow%3Fembed%3D1&amp;url=https%3A%2F%2Fstackblitz.com%2Fedit%2Fangular-ivy-snow&amp;type=text%2Fhtml&amp;schema=stackblitz"
        width="600"
        height="400"
      ></iframe>
    `

    expect(await convert(value)).not.toContain('cdn.embedly.com')
  })

  // injectEnclosures offers every attachment a feed carries to this resolver, and only this path
  // reaches the case where claiming one would cost a reader the audio.
  it('should leave an audio enclosure on the projects host playable', async () => {
    const enclosures = [
      { url: 'https://stackblitz.com/edit/angular-ivy-snow.mp3', type: 'audio/mpeg' },
    ]
    const expected = html`
      <audio data-enclosure="" controls src="https://stackblitz.com/edit/angular-ivy-snow.mp3"></audio>
      <p>Body</p>
    `

    const result = await transformContent('<p>Body</p>', {
      parseHtmlFn: parseHtml,
      baseUrl: 'https://example.com/post',
      enclosures,
    })

    expect(result).toEqualHtml(expected)
  })
})
