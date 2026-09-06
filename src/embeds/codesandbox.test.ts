import { describe, expect, it } from 'bun:test'
import { transformContent } from '../index.js'
import { describeForEachParser, html, resolverExtractor } from '../tests.js'
import type { EmbedResolverResult } from '../types.js'
import { codesandboxIframeEmbedResolver, codesandboxResolveEmbed } from './codesandbox.js'

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

describe('codesandboxResolveEmbed', () => {
  describe('happy paths', () => {
    it('should build the placeholder from an embed url', () => {
      const value = 'https://codesandbox.io/embed/83wzkj'
      const expected: EmbedResolverResult = {
        provider: 'codesandbox',
        id: '83wzkj',
        src: 'https://codesandbox.io/embed/83wzkj',
        url: 'https://codesandbox.io/s/83wzkj',
        height: 500,
      }

      expect(codesandboxResolveEmbed(value)).toEqual(expected)
    })

    it('should take the id from the hash behind a human-readable slug', () => {
      const value = 'https://codesandbox.io/embed/lazy-loading-composable-state-y722d'
      const expected: EmbedResolverResult = {
        provider: 'codesandbox',
        id: 'y722d',
        src: 'https://codesandbox.io/embed/lazy-loading-composable-state-y722d',
        url: 'https://codesandbox.io/s/lazy-loading-composable-state-y722d',
        height: 500,
      }

      expect(codesandboxResolveEmbed(value)).toEqual(expected)
    })

    it('should keep the query that chooses the pane and the file', () => {
      const value =
        'https://codesandbox.io/embed/column-layout-3ihtm?fontsize=14&hidenavigation=1&theme=light'
      const expected: EmbedResolverResult = {
        provider: 'codesandbox',
        id: '3ihtm',
        src: 'https://codesandbox.io/embed/column-layout-3ihtm?fontsize=14&hidenavigation=1&theme=light',
        url: 'https://codesandbox.io/s/column-layout-3ihtm',
        height: 500,
      }

      expect(codesandboxResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore the host root, which names no sandbox', () => {
      expect(codesandboxResolveEmbed('https://codesandbox.io/')).toBeUndefined()
    })

    it('should ignore the running preview a sandbox serves on its own subdomain', () => {
      expect(codesandboxResolveEmbed('https://k3201jy9jo.sse.codesandbox.io/')).toBeUndefined()
    })

    it('should ignore a foreign host carrying the same path', () => {
      const value = 'https://evil.test/codesandbox.io/embed/83wzkj'

      expect(codesandboxResolveEmbed(value)).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('should read a hash that is a bare word of legal length', () => {
      const value = 'https://codesandbox.io/embed/nihul'
      const expected: EmbedResolverResult = {
        provider: 'codesandbox',
        id: 'nihul',
        src: 'https://codesandbox.io/embed/nihul',
        url: 'https://codesandbox.io/s/nihul',
        height: 500,
      }

      expect(codesandboxResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('the eras of the sandbox id', () => {
    it('should read the mixed-case nine-character hash of the 2018 era', () => {
      const value = 'https://codesandbox.io/embed/NkB6R6O2L'
      const expected: EmbedResolverResult = {
        provider: 'codesandbox',
        id: 'NkB6R6O2L',
        src: 'https://codesandbox.io/embed/NkB6R6O2L',
        url: 'https://codesandbox.io/s/NkB6R6O2L',
        height: 500,
      }

      expect(codesandboxResolveEmbed(value)).toEqual(expected)
    })

    it('should read the ten-character hash written without a slug', () => {
      const value = 'https://codesandbox.io/embed/z2wnj3jznx'
      const expected: EmbedResolverResult = {
        provider: 'codesandbox',
        id: 'z2wnj3jznx',
        src: 'https://codesandbox.io/embed/z2wnj3jznx',
        url: 'https://codesandbox.io/s/z2wnj3jznx',
        height: 500,
      }

      expect(codesandboxResolveEmbed(value)).toEqual(expected)
    })

    it('should read the legacy user url, which CodeSandbox rewrites when it is framed', () => {
      const value = 'https://codesandbox.io/s/react-new-7yncj'
      const expected: EmbedResolverResult = {
        provider: 'codesandbox',
        id: '7yncj',
        src: 'https://codesandbox.io/s/react-new-7yncj',
        url: 'https://codesandbox.io/s/react-new-7yncj',
        height: 500,
      }

      expect(codesandboxResolveEmbed(value)).toEqual(expected)
    })

    it('should link a DevBox route to its own page rather than the sandbox route', () => {
      const value = 'https://codesandbox.io/p/devbox/optimistic-nova-544ck6?embed=1'
      const expected: EmbedResolverResult = {
        provider: 'codesandbox',
        id: '544ck6',
        src: 'https://codesandbox.io/p/devbox/optimistic-nova-544ck6?embed=1',
        url: 'https://codesandbox.io/p/devbox/optimistic-nova-544ck6',
        height: 500,
      }

      expect(codesandboxResolveEmbed(value)).toEqual(expected)
    })

    it('should link a DevBox sandbox route to its own page too', () => {
      const value = 'https://codesandbox.io/p/sandbox/wizardly-wildflower-nrhln8?embed=1'
      const expected: EmbedResolverResult = {
        provider: 'codesandbox',
        id: 'nrhln8',
        src: 'https://codesandbox.io/p/sandbox/wizardly-wildflower-nrhln8?embed=1',
        url: 'https://codesandbox.io/p/sandbox/wizardly-wildflower-nrhln8',
        height: 500,
      }

      expect(codesandboxResolveEmbed(value)).toEqual(expected)
    })
  })

  describe('shapes that name no sandbox', () => {
    it('should refuse a repository embed, whose route word passes the id test on length', () => {
      const value =
        'https://codesandbox.io/embed/github/crimx/observable-hooks/tree/master/examples/pomodoro-timer'

      expect(codesandboxResolveEmbed(value)).toBeUndefined()
    })

    it('should refuse a repository embed on the legacy user route', () => {
      const value = 'https://codesandbox.io/s/github/reduxjs/redux-essentials-example-app'

      expect(codesandboxResolveEmbed(value)).toBeUndefined()
    })

    it('should refuse the Define API, which carries a payload and no sandbox', () => {
      const value = 'https://codesandbox.io/api/v1/sandboxes/define?parameters=N4IgZglgNgpg'

      expect(codesandboxResolveEmbed(value)).toBeUndefined()
    })

    it('should refuse the starter-template route, which saves no sandbox', () => {
      expect(codesandboxResolveEmbed('https://codesandbox.io/embed/new')).toBeUndefined()
    })

    it('should refuse a named template, whose word is too short to be a hash', () => {
      expect(codesandboxResolveEmbed('https://codesandbox.io/embed/vue')).toBeUndefined()
    })
  })
})

describeForEachParser('codesandboxIframeEmbedResolver', (parseHtml) => {
  const extract = resolverExtractor(parseHtml, codesandboxIframeEmbedResolver)

  describe('happy paths', () => {
    it('should take the name out of the stated title', async () => {
      const value = html`
        <iframe
          src="https://codesandbox.io/embed/lazy-loading-composable-state-y722d?fontsize=14&amp;theme=dark"
          style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
          title="Lazy loading composable state"
          sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'codesandbox',
        id: 'y722d',
        src: 'https://codesandbox.io/embed/lazy-loading-composable-state-y722d?fontsize=14&theme=dark',
        url: 'https://codesandbox.io/s/lazy-loading-composable-state-y722d',
        title: 'Lazy loading composable state',
        height: 500,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should keep the height the publisher laid out over the share dialog default', async () => {
      const value = html`
        <iframe
          src="https://codesandbox.io/embed/83wzkj"
          width="100%"
          height="700"
        ></iframe>
      `
      const expected: EmbedResolverResult = {
        provider: 'codesandbox',
        id: '83wzkj',
        src: 'https://codesandbox.io/embed/83wzkj',
        url: 'https://codesandbox.io/s/83wzkj',
        height: 700,
      }

      expect(await extract(value)).toEqual(expected)
    })

    it('should state the share dialog height when the frame declares none', async () => {
      const value = '<iframe src="https://codesandbox.io/embed/83wzkj"></iframe>'
      const expected: EmbedResolverResult = {
        provider: 'codesandbox',
        id: '83wzkj',
        src: 'https://codesandbox.io/embed/83wzkj',
        url: 'https://codesandbox.io/s/83wzkj',
        height: 500,
      }

      expect(await extract(value)).toEqual(expected)
    })
  })

  describe('sad paths', () => {
    it('should ignore a foreign host carrying the same path', async () => {
      const value = '<iframe src="https://evil.test/codesandbox.io/embed/83wzkj"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })

    it('should ignore a lookalike host', async () => {
      const value = '<iframe src="https://codesandbox.io.evil.test/embed/83wzkj"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })

  describe('shapes that name no sandbox', () => {
    it('should leave a repository embed to the generic fallback', async () => {
      const value = html`
        <iframe
          src="https://codesandbox.io/embed/github/kamranayub/example-storyflow/tree/master/?fontsize=14"
          style="width:100%; height:500px;"
          title="storybook-testing-example"
        ></iframe>
      `

      expect(await extract(value)).toBeUndefined()
    })

    it('should leave a running preview on the sandbox subdomain alone', async () => {
      const value = '<iframe src="https://k3201jy9jo.sse.codesandbox.io/"></iframe>'

      expect(await extract(value)).toBeUndefined()
    })
  })
})

// The lazy attribute and the Embedly wrapper only name a sandbox after earlier passes have promoted
// or unwrapped them, so the assertion belongs at the end of the pipeline.
describeForEachParser('codesandbox shapes the pipeline repairs first', (parseHtml) => {
  const convert = (value: string): Promise<string> => {
    return transformContent(value, { parseHtmlFn: parseHtml, baseUrl: 'https://example.com/post' })
  }

  const placeholder = async (value: string): Promise<Record<string, string>> => {
    return readPlaceholder(await convert(value), parseHtml)
  }

  it('should resolve a frame whose url only arrives once the lazy attribute is promoted', async () => {
    const value = html`
      <iframe
        data-src="https://codesandbox.io/embed/x86xtf?codemirror=1&amp;theme=light"
        class="embedded-codesandbox lazy"
      ></iframe>
    `
    const expected: Record<string, string> = {
      src: 'https://codesandbox.io/embed/x86xtf?codemirror=1&theme=light',
      provider: 'codesandbox',
      id: 'x86xtf',
      url: 'https://codesandbox.io/s/x86xtf',
      height: '500',
    }

    expect(await placeholder(value)).toEqual(expected)
  })

  it('should resolve the sandbox Embedly proxies for Medium and Substack', async () => {
    const value = html`
      <iframe
        class="embedly-embed"
        src="https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fcodesandbox.io%2Fembed%2F9ii0rr&amp;url=https%3A%2F%2Fcodesandbox.io%2Fs%2F9ii0rr&amp;type=text%2Fhtml&amp;schema=codesandbox"
        width="600"
        height="400"
      ></iframe>
    `
    const expected: Record<string, string> = {
      src: 'https://codesandbox.io/embed/9ii0rr',
      provider: 'codesandbox',
      id: '9ii0rr',
      url: 'https://codesandbox.io/s/9ii0rr',
      height: '500',
    }

    expect(await placeholder(value)).toEqual(expected)
  })

  it('should not leave the Embedly wrapper behind', async () => {
    const value = html`
      <iframe
        class="embedly-embed"
        src="https://cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fcodesandbox.io%2Fembed%2F9ii0rr&amp;url=https%3A%2F%2Fcodesandbox.io%2Fs%2F9ii0rr&amp;type=text%2Fhtml&amp;schema=codesandbox"
        width="600"
        height="400"
      ></iframe>
    `

    expect(await convert(value)).not.toContain('cdn.embedly.com')
  })
})
